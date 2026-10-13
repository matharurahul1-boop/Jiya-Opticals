-- ============================================================================
-- management.sql  (platform management + audit log)
-- Part of LIVE_SETUP.sql (must run after join-requests.sql). Safe to re-run.
--
-- * optical_platform_admins : people who can see every organization (read-only).
-- * optical_audit_log       : who did what, recorded automatically by triggers,
--                             so no existing function or screen had to change.
-- ============================================================================
begin;

alter table public.optical_workspaces add column if not exists created_at timestamptz not null default now();
alter table public.optical_workspaces add column if not exists updated_at timestamptz not null default now();

create table if not exists public.optical_platform_admins (email text primary key check (email = lower(trim(email))));
alter table public.optical_platform_admins enable row level security;
revoke all on public.optical_platform_admins from anon, authenticated;
insert into public.optical_platform_admins(email) values ('tusharbali855@gmail.com') on conflict do nothing;

create table if not exists public.optical_audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_email text,
  owner_id    uuid,
  org_name    text,
  action      text not null,
  detail      jsonb not null default '{}'
);
alter table public.optical_audit_log enable row level security;
revoke all on public.optical_audit_log from anon, authenticated;
create index if not exists optical_audit_log_at_idx on public.optical_audit_log(at desc);
create index if not exists optical_audit_log_owner_idx on public.optical_audit_log(owner_id, at desc);

-- Logging must never block the real action, so every failure is swallowed.
create or replace function optical_private.audit(p_owner uuid, p_action text, p_detail jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare who uuid := auth.uid(); mail text; oname text;
begin
  begin
    if who is not null then select lower(email) into mail from auth.users where id = who; end if;
    if p_owner is not null then select data->'JIYA_OPTICALS_ERP_V2_profile'->>'name' into oname from public.optical_workspaces where owner_id = p_owner; end if;
    insert into public.optical_audit_log(actor_id, actor_email, owner_id, org_name, action, detail) values (who, mail, p_owner, oname, p_action, coalesce(p_detail, '{}'));
  exception when others then null;
  end;
end $$;

create or replace function optical_private.trg_workspace() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n jsonb; last_at timestamptz;
begin
  begin
    if tg_op = 'INSERT' then
      perform optical_private.audit(new.owner_id, case when new.join_code is null then 'store_created' else 'organization_created' end,
        jsonb_build_object('name', new.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name'));
    elsif tg_op = 'DELETE' then
      perform optical_private.audit(old.owner_id, 'organization_deleted', jsonb_build_object('name', old.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name'));
    else
      new.updated_at := now();
      -- Saves happen every few seconds while working: log at most one 'data_saved' per 30 minutes.
      select max(at) into last_at from public.optical_audit_log where owner_id = new.owner_id and action = 'data_saved';
      if last_at is null or last_at < now() - interval '30 minutes' then
        n := jsonb_build_object('shops', jsonb_array_length(coalesce(new.data->'JIYA_OPTICALS_ERP_V2_shops','[]')),
          'customers', jsonb_array_length(coalesce(new.data->'JIYA_OPTICALS_ERP_V2_customers','[]')),
          'invoices', jsonb_array_length(coalesce(new.data->'JIYA_OPTICALS_ERP_V2_invoices','[]')),
          'products', jsonb_array_length(coalesce(new.data->'JIYA_OPTICALS_ERP_V2_products','[]')));
        perform optical_private.audit(new.owner_id, 'data_saved', n);
      end if;
    end if;
  exception when others then null;
  end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists optical_audit_workspace on public.optical_workspaces;
create trigger optical_audit_workspace before insert or update or delete on public.optical_workspaces
  for each row execute function optical_private.trg_workspace();

create or replace function optical_private.trg_join() returns trigger
language plpgsql security definer set search_path = '' as $$
declare mail text;
begin
  begin
    select lower(email) into mail from auth.users where id = new.user_id;
    if tg_op = 'INSERT' then
      perform optical_private.audit(new.owner_id, 'join_requested', jsonb_build_object('applicant', mail, 'shop', new.shop_id));
    elsif new.status is distinct from old.status then
      perform optical_private.audit(new.owner_id, case new.status when 'approved' then 'join_approved' when 'rejected' then 'join_rejected' else 'join_requested' end,
        jsonb_build_object('applicant', mail, 'shop', new.shop_id));
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists optical_audit_join on public.optical_join_requests;
create trigger optical_audit_join after insert or update on public.optical_join_requests
  for each row execute function optical_private.trg_join();

create or replace function optical_private.trg_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'INSERT' then perform optical_private.audit(new.owner_id, 'member_assigned', jsonb_build_object('member', new.email, 'shops', to_jsonb(new.shop_ids)));
    elsif tg_op = 'UPDATE' then
      if new.shop_ids is distinct from old.shop_ids then perform optical_private.audit(new.owner_id, 'member_shops_changed', jsonb_build_object('member', new.email, 'shops', to_jsonb(new.shop_ids))); end if;
    else perform optical_private.audit(old.owner_id, 'member_removed', jsonb_build_object('member', old.email));
    end if;
  exception when others then null;
  end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists optical_audit_member on public.optical_team_members;
create trigger optical_audit_member after insert or update or delete on public.optical_team_members
  for each row execute function optical_private.trg_member();

create or replace function optical_private.trg_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'INSERT' or new.role is distinct from old.role then
      perform optical_private.audit(new.owner_id, 'role_changed', jsonb_build_object('member', new.email, 'role', new.role));
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists optical_audit_role on public.optical_member_role;
create trigger optical_audit_role after insert or update on public.optical_member_role
  for each row execute function optical_private.trg_role();

-- A person visiting the app: one 'sign_in' entry per 30 minutes.
create or replace function optical_private.trg_directory() returns trigger
language plpgsql security definer set search_path = '' as $$
declare last_at timestamptz;
begin
  begin
    if tg_op = 'INSERT' then
      insert into public.optical_audit_log(actor_id, actor_email, action, detail) values (new.id, lower(new.email), 'user_first_seen', '{}');
    else
      select max(at) into last_at from public.optical_audit_log where actor_id = new.id and action = 'sign_in';
      if last_at is null or last_at < now() - interval '30 minutes' then
        insert into public.optical_audit_log(actor_id, actor_email, action, detail) values (new.id, lower(new.email), 'sign_in', '{}');
      end if;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists optical_audit_directory on public.optical_user_directory;
create trigger optical_audit_directory after insert or update on public.optical_user_directory
  for each row execute function optical_private.trg_directory();

-- New accounts. Guarded so that a logging problem can never block sign-up.
create or replace function optical_private.trg_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    insert into public.optical_audit_log(actor_id, actor_email, action, detail)
    values (new.id, lower(new.email), 'signed_up', jsonb_build_object('intent', new.raw_user_meta_data->>'intent'));
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists optical_audit_signup on auth.users;
create trigger optical_audit_signup after insert on auth.users
  for each row execute function optical_private.trg_signup();

-- --------------------------------------------------------------------------
-- Platform management RPCs (read-only)
-- --------------------------------------------------------------------------
create or replace function optical_private.is_platform_admin() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare mail text;
begin
  if auth.uid() is null then return false; end if;
  select lower(email) into mail from auth.users where id = auth.uid() and email_confirmed_at is not null;
  return mail is not null and exists(select 1 from public.optical_platform_admins where email = mail);
end $$;

create or replace function optical_private.platform_overview() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare orgs jsonb; people jsonb;
begin
  if not optical_private.is_platform_admin() then raise exception 'Management access required' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(o order by o->>'createdAt'), '[]') into orgs from (
    select jsonb_build_object(
      'ownerId', w.owner_id,
      'name', coalesce(w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name', 'Unnamed'),
      'ownerEmail', lower(u.email),
      'kind', case when w.join_code is null then 'classic' else 'organization' end,
      'joinCode', w.join_code,
      'createdAt', w.created_at, 'updatedAt', w.updated_at,
      'shops', (select coalesce(jsonb_agg(s->>'name'), '[]') from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) s),
      'customers', jsonb_array_length(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_customers','[]')),
      'invoices', jsonb_array_length(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_invoices','[]')),
      'products', jsonb_array_length(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_products','[]')),
      'sales', coalesce((select sum(case when e->>'netPayable' ~ '^-?[0-9.]+$' then (e->>'netPayable')::numeric else 0 end)
                 from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_invoices','[]')) e), 0),
      'pendingRequests', (select count(*) from public.optical_join_requests r where r.owner_id = w.owner_id and r.status = 'pending'),
      'members', (select coalesce(jsonb_agg(jsonb_build_object('email', m.email, 'role', coalesce(r.role,'Shop Manager'), 'shopIds', m.shop_ids)), '[]')
                  from public.optical_team_members m left join public.optical_member_role r on r.owner_id = m.owner_id and r.email = m.email
                  where m.owner_id = w.owner_id)
    ) o
    from public.optical_workspaces w left join auth.users u on u.id = w.owner_id
  ) q;
  select coalesce(jsonb_agg(p order by p->>'createdAt' desc), '[]') into people from (
    select jsonb_build_object(
      'id', u.id, 'email', lower(u.email),
      'fullName', coalesce(d.full_name, ''), 'phone', coalesce(d.phone, ''),
      'createdAt', u.created_at, 'lastSignIn', u.last_sign_in_at,
      'confirmed', u.email_confirmed_at is not null,
      'owns', (select coalesce(jsonb_agg(w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name'), '[]') from public.optical_workspaces w where w.owner_id = u.id),
      'memberOf', (select coalesce(jsonb_agg(w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name'), '[]') from public.optical_team_members m join public.optical_workspaces w on w.owner_id = m.owner_id where m.email = lower(u.email)),
      'pending', (select coalesce(jsonb_agg(w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name'), '[]') from public.optical_join_requests r join public.optical_workspaces w on w.owner_id = r.owner_id where r.user_id = u.id and r.status = 'pending')
    ) p
    from auth.users u left join public.optical_user_directory d on d.id = u.id
  ) q;
  return jsonb_build_object('orgs', orgs, 'users', people);
end $$;

create or replace function optical_private.platform_logs(max_rows integer default 200, before_id bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not optical_private.is_platform_admin() then raise exception 'Management access required' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'at', l.at, 'actor', l.actor_email, 'org', l.org_name, 'ownerId', l.owner_id, 'action', l.action, 'detail', l.detail) order by l.id desc), '[]')
    from (select * from public.optical_audit_log where before_id is null or id < before_id order by id desc limit least(greatest(coalesce(max_rows, 200), 1), 500)) l);
end $$;

create or replace function public.optical_is_platform_admin() returns boolean language sql security invoker set search_path = '' as $$ select optical_private.is_platform_admin() $$;
create or replace function public.optical_platform_overview() returns jsonb language sql security invoker set search_path = '' as $$ select optical_private.platform_overview() $$;
create or replace function public.optical_platform_logs(max_rows integer default 200, before_id bigint default null) returns jsonb language sql security invoker set search_path = '' as $$ select optical_private.platform_logs(max_rows, before_id) $$;

revoke all on function optical_private.audit(uuid,text,jsonb), optical_private.trg_workspace(), optical_private.trg_join(), optical_private.trg_member(), optical_private.trg_role(), optical_private.trg_directory(), optical_private.trg_signup() from public, anon, authenticated;
revoke all on function optical_private.is_platform_admin(), optical_private.platform_overview(), optical_private.platform_logs(integer,bigint) from public, anon;
grant execute on function optical_private.is_platform_admin(), optical_private.platform_overview(), optical_private.platform_logs(integer,bigint) to authenticated;
revoke all on function public.optical_is_platform_admin(), public.optical_platform_overview(), public.optical_platform_logs(integer,bigint) from public, anon;
grant execute on function public.optical_is_platform_admin(), public.optical_platform_overview(), public.optical_platform_logs(integer,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
