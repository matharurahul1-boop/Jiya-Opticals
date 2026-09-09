-- Run this entire script in Supabase SQL Editor. Existing workspace data is preserved.
-- The 21-table schema is optional and remains separate from this versioned ERP storage.
begin;
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
  );
  return result;
end $$;

create or replace function optical_private.team_create(business_name text, profile jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare d jsonb := '{}'; k text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
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
    if not found then raise exception 'Store access removed or email not confirmed' using errcode='42501'; end if;
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
    if not found then raise exception 'Store access removed' using errcode='42501'; end if;
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
notify pgrst, 'reload schema';
commit;
