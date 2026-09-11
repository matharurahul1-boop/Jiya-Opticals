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
begin;

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

notify pgrst, 'reload schema';
commit;
