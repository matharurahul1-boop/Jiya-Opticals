-- COMPLETE ACTIVE APP SCHEMA. Paste the entire file in Supabase SQL Editor.
-- Includes team access, user directory/profile/roles, and Drishti sync RPCs.
-- Existing data is preserved. All changes commit together or roll back together.
-- Do not run older setup scripts afterwards: they may replace these permissions/functions.
begin;

-- ===== team-access.sql =====
-- Run this entire script in Supabase SQL Editor. Existing workspace data is preserved.
-- The 21-table schema is optional and remains separate from this versioned ERP storage.

grant usage on schema public to authenticated;
create table if not exists public.optical_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 1 check (version > 0)
);
alter table public.optical_workspaces enable row level security;
-- All application access goes through checked RPCs, never an unrestricted JSON read.
revoke all on public.optical_workspaces from anon, authenticated;
create schema if not exists optical_private;
revoke all on schema optical_private from public;
grant usage on schema optical_private to authenticated;

create table if not exists public.optical_team_members (
  owner_id uuid not null references public.optical_workspaces(owner_id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  shop_ids text[] not null default '{}',
  primary key(owner_id, email)
);
alter table public.optical_team_members enable row level security;
revoke all on public.optical_team_members from anon, authenticated;
create index if not exists optical_team_email_idx on public.optical_team_members(email);

create or replace function optical_private.session_email() returns text
language plpgsql security definer set search_path = '' as $$
declare result text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select lower(email) into result from auth.users where id=auth.uid() and email_confirmed_at is not null;
  return result;
end $$;

create or replace function optical_private.team_list() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('ownerId', w.owner_id,
    'name', coalesce(w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name','Optical store'),
    'role', case when w.owner_id=auth.uid() then 'Admin' else 'Shop Manager' end)), '[]') into result
  from public.optical_workspaces w where w.owner_id=auth.uid() or exists (
    select 1 from public.optical_team_members m where m.owner_id=w.owner_id and m.email=optical_private.session_email()
  )
  -- "Open access" store: any confirmed sign-in joins it with every shop, no per-person setup.
  or (coalesce(w.data #>> '{JIYA_OPTICALS_ERP_V2_profile,openAccess}','') = 'true' and optical_private.session_email() is not null);
  return result;
end $$;

create or replace function optical_private.team_create(business_name text, profile jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare d jsonb := '{}'; k text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  -- One store per deployment. Extra sign-ins join the existing store, they do not start their own.
  if exists(select 1 from public.optical_workspaces) then
    raise exception 'This store is already set up. Ask the owner to add you under Team & Access.' using errcode='42501';
  end if;
  if length(trim(business_name)) < 2 or jsonb_typeof(profile) is distinct from 'object' then raise exception 'Enter a business name'; end if;
  foreach k in array array['shops','users','products','customers','invoices','suppliers','doctors','staff','expenses','purchases','wa_templates','followups','payments'] loop
    d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_'||k], '[]');
  end loop;
  d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_profile'], profile || jsonb_build_object('name',trim(business_name)));
  insert into public.optical_workspaces(owner_id,data) values(auth.uid(),d);
  return auth.uid();
end $$;

create or replace function optical_private.team_load(team_owner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.optical_workspaces; allowed text[]; d jsonb := '{}'; k text; rows jsonb; actor_email text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  actor_email := optical_private.session_email();
  select * into w from public.optical_workspaces where owner_id=team_owner;
  if not found then raise exception 'Store not found' using errcode='42501'; end if;
  if team_owner=auth.uid() then d := w.data;
  else
    select m.shop_ids into allowed from public.optical_team_members m where m.owner_id=team_owner and m.email=actor_email;
    if not found then
      -- Open-access store: any confirmed sign-in works every shop until the admin assigns specific shops.
      if actor_email is null or coalesce(w.data #>> '{JIYA_OPTICALS_ERP_V2_profile,openAccess}','') <> 'true' then
        raise exception 'Store access removed or email not confirmed' using errcode='42501';
      end if;
      select coalesce(array_agg(e->>'id'), '{}') into allowed from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) e;
    end if;
    foreach k in array array['products','customers','invoices','expenses','purchases','followups','payments'] loop
      select coalesce(jsonb_agg(case when k='customers' then
        jsonb_set(e, '{prescriptions}', (select coalesce(jsonb_agg(rx),'[]') from jsonb_array_elements(coalesce(e->'prescriptions','[]')) rx
          where coalesce(rx->>'shopId',e->>'shopId')=e->>'shopId'))
        when k='invoices' and e->'prescription' is not null and coalesce(e->'prescription'->>'shopId',e->>'shopId') is distinct from e->>'shopId' then e-'prescription'
        else e end), '[]') into rows from jsonb_array_elements(coalesce(w.data->('JIYA_OPTICALS_ERP_V2_'||k),'[]')) e
        where e->>'shopId'=any(allowed);
      d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_'||k], rows);
    end loop;
    select coalesce(jsonb_agg(e), '[]') into rows from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) e where e->>'id'=any(allowed);
    d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_shops'], rows);
    d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_profile'], coalesce(w.data->'JIYA_OPTICALS_ERP_V2_profile','{}'));
    d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_wa_templates'], coalesce(w.data->'JIYA_OPTICALS_ERP_V2_wa_templates','[]'));
    foreach k in array array['users','suppliers','doctors','staff'] loop
      d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_'||k], '[]');
    end loop;
  end if;
  return jsonb_build_object('data', d, 'version', w.version, 'ownerId', team_owner,
    'user',jsonb_build_object('id',auth.uid(),'name',coalesce(actor_email,'Store owner'),'username',coalesce(actor_email,''),
      'role',case when team_owner=auth.uid() then 'Admin' else 'Shop Manager' end,'shopId','all','phone',''));
end $$;

-- Common material identity, separate stock rows. Never duplicate physical quantity.
create or replace function optical_private.expand_catalog(payload jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb:=coalesce(payload->'JIYA_OPTICALS_ERP_V2_products','[]'); source jsonb; shop jsonb; new_row jsonb;
begin
  for source in select distinct on(p->>'catalogId') p from jsonb_array_elements(result) p
    where coalesce(p->>'catalogId','')<>'' order by p->>'catalogId',p->>'id'
  loop
    for shop in select s from jsonb_array_elements(coalesce(payload->'JIYA_OPTICALS_ERP_V2_shops','[]')) s loop
      if not exists(select 1 from jsonb_array_elements(result) p where p->>'catalogId'=source->>'catalogId' and p->>'shopId'=shop->>'id') then
        new_row := (source - array['drishtiSourceId','drishtiItemId','drishtiHash','drishtiStockQty','drishtiSyncedAt']) || jsonb_build_object(
          'id','stock:'||(source->>'catalogId')||':'||(shop->>'id'),'shopId',shop->>'id','stockQty',0,'location','');
        result:=result||jsonb_build_array(new_row);
      end if;
    end loop;
  end loop;
  return jsonb_set(payload,'{JIYA_OPTICALS_ERP_V2_products}',result);
end $$;
revoke all on function optical_private.expand_catalog(jsonb) from public,anon,authenticated;

create or replace function optical_private.team_save(team_owner uuid, expected_version integer, payload jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare w public.optical_workspaces; allowed text[]; d jsonb; k text; incoming jsonb; preserved jsonb; all_shops text[];
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if jsonb_typeof(payload) is distinct from 'object' then raise exception 'Invalid store data'; end if;
  select * into w from public.optical_workspaces where owner_id=team_owner for update;
  if not found then raise exception 'Store not found' using errcode='42501'; end if;
  if team_owner<>auth.uid() then
    select m.shop_ids into allowed from public.optical_team_members m where m.owner_id=team_owner and m.email=optical_private.session_email();
    if not found then
      if optical_private.session_email() is null or coalesce(w.data #>> '{JIYA_OPTICALS_ERP_V2_profile,openAccess}','') <> 'true' then
        raise exception 'Store access removed' using errcode='42501';
      end if;
      select coalesce(array_agg(e->>'id'), '{}') into allowed from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) e;
    end if;
  end if;
  -- errcode PT409 (not 40001): PostgREST auto-retries serialization_failure (40001) until upstream timeout, so a version conflict must use a non-retryable SQLSTATE.
  if w.version<>expected_version then raise exception 'Store changed in another session. Download unsaved data, then reload.' using errcode='PT409'; end if;
  d := w.data;
  if team_owner=auth.uid() then
    foreach k in array array['shops','users','products','customers','invoices','suppliers','doctors','staff','expenses','purchases','wa_templates','followups','payments'] loop
      if jsonb_typeof(payload->('JIYA_OPTICALS_ERP_V2_'||k)) is distinct from 'array' then raise exception 'Invalid data array: %',k; end if;
    end loop;
    if jsonb_typeof(payload->'JIYA_OPTICALS_ERP_V2_profile') is distinct from 'object' then raise exception 'Invalid profile'; end if;
    d := payload;
  else
    -- Only merge assigned-shop records; admin globals and all other shops remain intact.
    foreach k in array array['products','customers','invoices','expenses','purchases','followups','payments'] loop
      incoming := payload->('JIYA_OPTICALS_ERP_V2_'||k);
      if jsonb_typeof(incoming) is distinct from 'array' then raise exception 'Invalid data array: %',k; end if;
      if k='products' and exists(
        select 1 from jsonb_array_elements(incoming) a left join jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_products','[]')) b on a->>'id'=b->>'id'
        where b is null or (a - array['stockQty','purchasePrice','location','minStockAlert','supplierId']) is distinct from (b - array['stockQty','purchasePrice','location','minStockAlert','supplierId'])
      ) then raise exception 'Only admin may edit shared material details' using errcode='42501'; end if;
      if exists(select 1 from jsonb_array_elements(incoming) e where not coalesce(e->>'shopId'=any(allowed),false) or coalesce(e->>'id','')='') then
        raise exception 'Record outside assigned shops' using errcode='42501';
      end if;
      if k='customers' and exists(select 1 from jsonb_array_elements(incoming) e, jsonb_array_elements(coalesce(e->'prescriptions','[]')) rx
        where coalesce(rx->>'shopId',e->>'shopId') is distinct from e->>'shopId' or rx->>'customerId' is distinct from e->>'id') then
        raise exception 'Prescription must belong to the same customer and shop' using errcode='42501';
      end if;
      if k='customers' then
        select coalesce(jsonb_agg(jsonb_set(e,'{prescriptions}', coalesce(e->'prescriptions','[]') ||
          (select coalesce(jsonb_agg(rx),'[]') from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_customers','[]')) old,
            jsonb_array_elements(coalesce(old->'prescriptions','[]')) rx
            where old->>'id'=e->>'id' and coalesce(rx->>'shopId',old->>'shopId') is distinct from e->>'shopId'))),'[]') into incoming
          from jsonb_array_elements(incoming) e;
      end if;
      select coalesce(jsonb_agg(e), '[]') into preserved from jsonb_array_elements(coalesce(w.data->('JIYA_OPTICALS_ERP_V2_'||k),'[]')) e
        where not coalesce(e->>'shopId'=any(allowed),false);
      if exists(select 1 from jsonb_array_elements(incoming) a join jsonb_array_elements(preserved) b on a->>'id'=b->>'id') then
        raise exception 'Record ID belongs to another shop' using errcode='42501';
      end if;
      d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_'||k], preserved || incoming);
    end loop;
  end if;
  -- New records must belong to an existing shop; unchanged legacy unassigned rows may remain admin-only.
  select coalesce(array_agg(e->>'id'),'{}') into all_shops from jsonb_array_elements(d->'JIYA_OPTICALS_ERP_V2_shops') e;
  if exists(select 1 from jsonb_array_elements(d->'JIYA_OPTICALS_ERP_V2_shops') e group by e->>'id' having count(*)>1) then raise exception 'Duplicate shop ID'; end if;
  foreach k in array array['products','customers','invoices','expenses','purchases','followups','payments'] loop
    incoming := coalesce(d->('JIYA_OPTICALS_ERP_V2_'||k),'[]');
    if exists(select 1 from jsonb_array_elements(incoming) e where not coalesce(e->>'shopId'=any(all_shops),false)
      and not exists(select 1 from jsonb_array_elements(coalesce(w.data->('JIYA_OPTICALS_ERP_V2_'||k),'[]')) old where old=e)) then
      raise exception 'Choose an existing shop for every record';
    end if;
    if exists(select 1 from jsonb_array_elements(incoming) e group by e->>'id' having count(*)>1) then raise exception 'Duplicate record ID'; end if;
  end loop;
  -- Keep historical data attached: a shop with records or assignments cannot be removed.
  if exists(select 1 from public.optical_team_members m, unnest(m.shop_ids) sid where m.owner_id=team_owner and not(sid=any(all_shops))) then raise exception 'Remove team assignments before deleting a shop'; end if;
  if team_owner=auth.uid() then d:=optical_private.expand_catalog(d); end if;
  update public.optical_workspaces set data=d, version=version+1 where owner_id=team_owner;
  return w.version+1;
end $$;

create or replace function optical_private.team_members(team_owner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or auth.uid()<>team_owner then raise exception 'Admin access required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('email',m.email,'shopIds',m.shop_ids,
    'registered',exists(select 1 from auth.users u where lower(u.email)=m.email and u.email_confirmed_at is not null))), '[]') into result
  from public.optical_team_members m where owner_id=team_owner;
  return result;
end $$;

create or replace function optical_private.team_assign(team_owner uuid, member_email text, assigned_shops text[], remove_member boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare d jsonb; normalized text := lower(trim(member_email));
begin
  if auth.uid() is null or auth.uid()<>team_owner then raise exception 'Admin access required' using errcode='42501'; end if;
  select data into d from public.optical_workspaces where owner_id=team_owner for update;
  if not found then raise exception 'Store not found'; end if;
  if remove_member then delete from public.optical_team_members where owner_id=team_owner and email=normalized;
  else
    if normalized is null or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email'; end if;
    if normalized=optical_private.session_email() then raise exception 'Admin already has access to all shops'; end if;
    if assigned_shops is null or cardinality(assigned_shops)=0 then raise exception 'Select at least one shop'; end if;
    if exists(select 1 from unnest(assigned_shops) sid where sid is null or not exists(select 1 from jsonb_array_elements(d->'JIYA_OPTICALS_ERP_V2_shops') e where e->>'id'=sid)) then raise exception 'Unknown shop'; end if;
    insert into public.optical_team_members(owner_id,email,shop_ids) values(team_owner,normalized,assigned_shops)
      on conflict(owner_id,email) do update set shop_ids=excluded.shop_ids;
  end if;
  -- Invalidate already loaded sessions, including when access is narrowed.
  update public.optical_workspaces set version=version+1 where owner_id=team_owner;
end $$;

create or replace function public.optical_team_list() returns jsonb language sql security invoker set search_path='' as $$ select optical_private.team_list() $$;
create or replace function public.optical_team_create(business_name text, profile jsonb) returns uuid language sql security invoker set search_path='' as $$ select optical_private.team_create(business_name,profile) $$;
create or replace function public.optical_team_load(team_owner uuid) returns jsonb language sql security invoker set search_path='' as $$ select optical_private.team_load(team_owner) $$;
create or replace function public.optical_team_save(team_owner uuid, expected_version integer, payload jsonb) returns integer language sql security invoker set search_path='' as $$ select optical_private.team_save(team_owner,expected_version,payload) $$;
create or replace function public.optical_team_members(team_owner uuid) returns jsonb language sql security invoker set search_path='' as $$ select optical_private.team_members(team_owner) $$;
create or replace function public.optical_team_assign(team_owner uuid, member_email text, assigned_shops text[], remove_member boolean default false) returns void language sql security invoker set search_path='' as $$ select optical_private.team_assign(team_owner,member_email,assigned_shops,remove_member) $$;

revoke all on all functions in schema optical_private from public, anon;
grant execute on all functions in schema optical_private to authenticated;
revoke all on function public.optical_team_list(), public.optical_team_create(text,jsonb), public.optical_team_load(uuid), public.optical_team_save(uuid,integer,jsonb), public.optical_team_members(uuid), public.optical_team_assign(uuid,text,text[],boolean) from public, anon;
grant execute on function public.optical_team_list(), public.optical_team_create(text,jsonb), public.optical_team_load(uuid), public.optical_team_save(uuid,integer,jsonb), public.optical_team_members(uuid), public.optical_team_assign(uuid,text,text[],boolean) to authenticated;


-- ===== users-directory.sql =====
-- ============================================================================
-- users-directory.sql
-- Run this whole script in the Supabase SQL Editor AFTER team-access.sql.
-- Safe to re-run. Existing data is preserved.
--
-- What it adds:
--   * public.optical_user_directory  - one row per person who signs in
--     (captured automatically on every sign-in via optical_user_sync).
--   * public.optical_member_role     - the role an admin assigns a member
--     for their business (email stays fixed - it is the identity).
--   * RPCs: optical_user_sync, optical_team_users, optical_member_set_role
--
-- The "Team & Access" and "Masters -> Users" screens read optical_team_users.
-- ============================================================================

grant usage on schema public to authenticated;

-- --------------------------------------------------------------------------
-- 1. Directory of everyone who has signed in
-- --------------------------------------------------------------------------
create table if not exists public.optical_user_directory (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  username   text not null default '',
  phone      text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.optical_user_directory enable row level security;
revoke all on public.optical_user_directory from anon, authenticated;
create index if not exists optical_user_directory_email_idx
  on public.optical_user_directory (lower(email));

-- --------------------------------------------------------------------------
-- 2. Per-business role override for a member
--    (shop assignment stays in optical_team_members.shop_ids)
-- --------------------------------------------------------------------------
create table if not exists public.optical_member_role (
  owner_id uuid not null references public.optical_workspaces(owner_id) on delete cascade,
  email    text not null check (email = lower(trim(email))),
  role     text not null default 'Shop Manager'
           check (role in ('Admin','Shop Manager','Optometrist','Cashier','Lab Technician')),
  primary key (owner_id, email)
);
alter table public.optical_member_role enable row level security;
revoke all on public.optical_member_role from anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. optical_user_sync - upsert the caller's own directory row.
--    Called by the app right after sign-in and whenever the user edits
--    their own details. Email always comes from auth, never the client.
-- --------------------------------------------------------------------------
create or replace function optical_private.user_sync(display_name text, uname text, phone text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mail text; row public.optical_user_directory;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select lower(email) into mail from auth.users where id = auth.uid();
  if mail is null then raise exception 'No email on this account' using errcode = '42501'; end if;

  insert into public.optical_user_directory (id, email, full_name, username, phone)
  values (
    auth.uid(),
    mail,
    coalesce(nullif(trim(display_name), ''), split_part(mail, '@', 1)),
    coalesce(nullif(trim(uname), ''), split_part(mail, '@', 1)),
    coalesce(trim(user_sync.phone), '')
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = case when nullif(trim(display_name), '') is not null then excluded.full_name else public.optical_user_directory.full_name end,
    username   = case when nullif(trim(uname), '')       is not null then excluded.username  else public.optical_user_directory.username  end,
    phone      = case when user_sync.phone is not null then excluded.phone else public.optical_user_directory.phone end,
    updated_at = now()
  returning * into row;

  return to_jsonb(row);
end $$;

-- --------------------------------------------------------------------------
-- 4. optical_team_users - the admin's member list, enriched with directory
--    info + assigned role + assigned shops. Admin-only.
-- --------------------------------------------------------------------------
create or replace function optical_private.team_users(team_owner uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; owner_mail text;
begin
  if auth.uid() is null or auth.uid() <> team_owner then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  select lower(email) into owner_mail from auth.users where id = team_owner;

  with people as (
    -- the business owner
    select owner_mail as email, 'Admin'::text as role, array['all']::text[] as shop_ids, true as is_admin
    union all
    -- assigned team members
    select m.email,
           coalesce(r.role, 'Shop Manager'),
           m.shop_ids,
           false
    from public.optical_team_members m
    left join public.optical_member_role r
      on r.owner_id = m.owner_id and r.email = m.email
    where m.owner_id = team_owner
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'email',      p.email,
    'fullName',   coalesce(d.full_name, ''),
    'username',   coalesce(d.username, ''),
    'phone',      coalesce(d.phone, ''),
    'role',       p.role,
    'shopIds',    p.shop_ids,
    'isAdmin',    p.is_admin,
    'registered', exists (
                    select 1 from auth.users u
                    where lower(u.email) = p.email and u.email_confirmed_at is not null
                  ),
    'lastSeen',   d.updated_at
  ) order by p.is_admin desc, p.email), '[]')
  into result
  from people p
  left join public.optical_user_directory d on lower(d.email) = p.email;

  return result;
end $$;

-- --------------------------------------------------------------------------
-- 5. optical_member_set_role - admin sets a member's role. Admin-only.
--    Email and the owner's own role cannot be changed here.
-- --------------------------------------------------------------------------
create or replace function optical_private.member_set_role(team_owner uuid, member_email text, new_role text)
returns void
language plpgsql security definer set search_path = '' as $$
declare normalized text := lower(trim(member_email));
begin
  if auth.uid() is null or auth.uid() <> team_owner then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if new_role is null or new_role not in ('Shop Manager','Optometrist','Cashier','Lab Technician') then
    raise exception 'Unknown role';
  end if;
  if not exists (select 1 from public.optical_team_members where owner_id = team_owner and email = normalized) then
    raise exception 'Assign the member a shop first';
  end if;

  insert into public.optical_member_role (owner_id, email, role)
  values (team_owner, normalized, new_role)
  on conflict (owner_id, email) do update set role = excluded.role;

  -- Refresh already-loaded sessions so the new role takes effect.
  update public.optical_workspaces set version = version + 1 where owner_id = team_owner;
end $$;

-- --------------------------------------------------------------------------
-- 6. Public wrappers + grants
-- --------------------------------------------------------------------------
create or replace function public.optical_user_sync(display_name text, uname text, phone text)
  returns jsonb language sql security invoker set search_path = ''
  as $$ select optical_private.user_sync(display_name, uname, phone) $$;

create or replace function public.optical_team_users(team_owner uuid)
  returns jsonb language sql security invoker set search_path = ''
  as $$ select optical_private.team_users(team_owner) $$;

create or replace function public.optical_member_set_role(team_owner uuid, member_email text, new_role text)
  returns void language sql security invoker set search_path = ''
  as $$ select optical_private.member_set_role(team_owner, member_email, new_role) $$;

-- Return the saved profile after refresh. Only the real owner is an Admin;
-- member role labels never widen the shop scope granted by team_load.
create or replace function optical_private.team_load_with_profile(team_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; person public.optical_user_directory; label text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  result := optical_private.team_load(team_owner);
  select * into person from public.optical_user_directory where id=auth.uid();
  if found then
    result := jsonb_set(result,'{user}',result->'user' || jsonb_build_object('name',person.full_name,'username',person.username,'email',person.email,'phone',person.phone));
  end if;
  if team_owner<>auth.uid() then
    select r.role into label from public.optical_member_role r where r.owner_id=team_owner and r.email=optical_private.session_email();
    result := jsonb_set(result,'{user,role}',to_jsonb(case when label in ('Shop Manager','Optometrist','Cashier','Lab Technician') then label else 'Shop Manager' end));
  end if;
  return result;
end $$;
create or replace function public.optical_team_load(team_owner uuid) returns jsonb
language sql security invoker set search_path='' as $$ select optical_private.team_load_with_profile(team_owner) $$;
revoke all on function optical_private.team_load_with_profile(uuid) from public, anon;
grant execute on function optical_private.team_load_with_profile(uuid) to authenticated;

revoke all on function
  optical_private.user_sync(text,text,text),
  optical_private.team_users(uuid),
  optical_private.member_set_role(uuid,text,text)
  from public, anon;
grant execute on function
  optical_private.user_sync(text,text,text),
  optical_private.team_users(uuid),
  optical_private.member_set_role(uuid,text,text)
  to authenticated;

revoke all on function
  public.optical_user_sync(text,text,text),
  public.optical_team_users(uuid),
  public.optical_member_set_role(uuid,text,text)
  from public, anon;
grant execute on function
  public.optical_user_sync(text,text,text),
  public.optical_team_users(uuid),
  public.optical_member_set_role(uuid,text,text)
  to authenticated;



-- ===== drishti-sync.sql =====
-- Run AFTER team-access.sql. Sign the connector in as the business owner: it edits the shared catalogue.
-- Catalog-only upserts: preserve existing ERP stock; new items receive initial source quantity.

create or replace function optical_private.drishti_import(team_owner uuid, target_shop text, source_id text, items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare w public.optical_workspaces; products jsonb; item jsonb; existing jsonb; fresh jsonb;
  item_key text; code text; qr text; hash text; row_id text; added integer:=0; updated integer:=0; skipped integer:=0;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if source_id is null or length(trim(source_id)) not between 1 and 80 then raise exception 'Invalid source ID'; end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>500 then raise exception 'Send at most 500 items per batch'; end if;
  select * into w from public.optical_workspaces where owner_id=team_owner for update;
  if not found then raise exception 'Store not found' using errcode='42501'; end if;
  if team_owner<>auth.uid() then raise exception 'Business owner login required for shared catalogue sync' using errcode='42501'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) s where s->>'id'=target_shop) then raise exception 'Shop not found'; end if;
  if exists(select 1 from jsonb_array_elements(items) e group by e->>'externalId' having count(*)>1) then raise exception 'Duplicate source item ID in batch'; end if;
  products := coalesce(w.data->'JIYA_OPTICALS_ERP_V2_products','[]');
  for item in select value from jsonb_array_elements(items) loop
    item_key := item->>'externalId'; code := item->>'barcode'; qr := nullif(item->>'qrCode','');
    if jsonb_typeof(item->'externalId') is distinct from 'string' or coalesce(length(item_key),0) not between 1 and 200
      or jsonb_typeof(item->'barcode') is distinct from 'string' or coalesce(length(code),0) not between 1 and 2048
      or code<>trim(code) or coalesce(length(trim(item->>'name')),0) not between 1 and 300
      or (qr is not null and (jsonb_typeof(item->'qrCode')<>'string' or length(qr)>2048 or qr<>trim(qr))) then
      raise exception 'Source ID, original code and item name are required (codes must be text)';
    end if;
    if coalesce(item->>'category','') not in ('Spectacle Frame','Sunglasses','Ophthalmic Lens','Contact Lens','Lens Solution','Optical Accessory','Reading Glasses','Equipment / Battery') then raise exception 'Unknown product category'; end if;
    if exists(select 1 from unnest(array['purchasePrice','mrp','salePrice','gstRate','stockQty','minStockAlert']) field
      where jsonb_typeof(item->field) is distinct from 'number') then raise exception 'Prices, tax and stock must be numbers'; end if;
    if (item->>'purchasePrice')::numeric<0 or (item->>'mrp')::numeric<0 or (item->>'salePrice')::numeric<0
      or (item->>'gstRate')::numeric not between 0 and 100 or (item->>'stockQty')::numeric<0
      or (item->>'stockQty')::numeric<>trunc((item->>'stockQty')::numeric) or (item->>'minStockAlert')::numeric<0
      or (item->>'minStockAlert')::numeric<>trunc((item->>'minStockAlert')::numeric) then raise exception 'Invalid price, GST or stock quantity'; end if;
    if coalesce(item->>'frameType','N/A') not in ('Full Rim','Half Rim','Rimless','Supra','N/A') then raise exception 'Unknown frame type'; end if;
    if (select count(*) from jsonb_array_elements(products) p where p->>'shopId'=target_shop and p->>'drishtiSourceId'=source_id and p->>'drishtiItemId'=item_key)>1 then raise exception 'Duplicate existing Drishti mapping; resolve it before syncing'; end if;
    select p into existing from jsonb_array_elements(products) p where p->>'shopId'=target_shop and p->>'drishtiSourceId'=source_id and p->>'drishtiItemId'=item_key;
    row_id := coalesce(existing->>'id',gen_random_uuid()::text);
    if existing is not null and (existing->>'barcode' is distinct from code or nullif(existing->>'qrCode','') is distinct from qr) then
      raise exception 'Source code changed for item %. Existing stickers are protected; review the mapping manually.',item_key;
    end if;
    if exists(select 1 from jsonb_array_elements(products) p where p->>'shopId'=target_shop and p->>'id'<>row_id
      and (p->>'barcode'=code or p->>'qrCode'=code or (qr is not null and (p->>'barcode'=qr or p->>'qrCode'=qr)))) then
      raise exception 'Barcode/QR already belongs to another item in this shop';
    end if;
    hash := md5(item::text);
    if existing->>'drishtiHash'=hash then skipped:=skipped+1; continue; end if;
    fresh := coalesce(existing,'{}') || jsonb_build_object(
      'id',row_id,'catalogId',coalesce(existing->>'catalogId','catalog-'||row_id),'shopId',target_shop,'barcode',code,'qrCode',qr,'name',item->>'name','category',item->>'category',
      'brand',coalesce(item->>'brand',''),'modelNo',coalesce(item->>'modelNo',''),'color',coalesce(item->>'color',''),
      'frameType',coalesce(item->>'frameType','N/A'),'size',coalesce(item->>'size',''),'hsnCode',coalesce(item->>'hsnCode',''),
      'purchasePrice',item->'purchasePrice','mrp',item->'mrp','salePrice',item->'salePrice','gstRate',item->'gstRate',
      'stockQty',coalesce(existing->'stockQty',item->'stockQty'),'minStockAlert',item->'minStockAlert','location',coalesce(item->>'location',''),
      'drishtiSourceId',source_id,'drishtiItemId',item_key,'drishtiHash',hash,'drishtiStockQty',item->'stockQty','drishtiSyncedAt',clock_timestamp());
    if existing is null then products:=products || jsonb_build_array(fresh); added:=added+1;
    else select coalesce(jsonb_agg(case when p->>'id'=row_id then fresh else p end),'[]') into products from jsonb_array_elements(products) p; updated:=updated+1;
    end if;
    -- Refresh common details on linked branches while retaining their quantity and cost.
    select coalesce(jsonb_agg(case when p->>'catalogId'=fresh->>'catalogId' and p->>'id'<>row_id then p ||
      (fresh - array['id','shopId','stockQty','purchasePrice','minStockAlert','location','supplierId','drishtiSourceId','drishtiItemId','drishtiHash','drishtiStockQty','drishtiSyncedAt']) else p end),'[]') into products from jsonb_array_elements(products) p;
  end loop;
  if added+updated>0 then
    update public.optical_workspaces set data=optical_private.expand_catalog(jsonb_set(data,'{JIYA_OPTICALS_ERP_V2_products}',products)),version=version+1 where owner_id=team_owner;
  end if;
  return jsonb_build_object('added',added,'updated',updated,'unchanged',skipped,'version',w.version+case when added+updated>0 then 1 else 0 end);
end $$;
create or replace function public.optical_drishti_import(team_owner uuid, target_shop text, source_id text, items jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select optical_private.drishti_import(team_owner,target_shop,source_id,items) $$;
revoke all on function optical_private.drishti_import(uuid,text,text,jsonb), public.optical_drishti_import(uuid,text,text,jsonb) from public, anon;
grant execute on function optical_private.drishti_import(uuid,text,text,jsonb), public.optical_drishti_import(uuid,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
