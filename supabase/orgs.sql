-- ============================================================================
-- orgs.sql  (multi-organization support)
-- Part of LIVE_SETUP.sql. Safe to re-run. Existing workspaces are untouched:
-- a workspace with no join_code is a "classic" store and behaves exactly as before.
--
-- A new organization is a normal optical_workspaces row (owner = the person who
-- registered it) plus a private join_code. Staff find the organization only by
-- that code, then wait for the admin's approval.
-- ============================================================================
begin;

alter table public.optical_workspaces add column if not exists join_code text;
create unique index if not exists optical_workspaces_join_code_idx
  on public.optical_workspaces(join_code) where join_code is not null;

create or replace function optical_private.new_join_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; code text; i int;
begin
  loop
    code := '';
    for i in 1..8 loop code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); end loop;
    exit when not exists(select 1 from public.optical_workspaces where join_code = code);
  end loop;
  return code;
end $$;

-- Creates the caller's own organization with its first shop. One per account.
create or replace function optical_private.org_create(org_name text, profile jsonb, first_shop jsonb, templates jsonb default '[]') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d jsonb := '{}'; k text; code text; shop jsonb;
begin
  if optical_private.session_email() is null then raise exception 'Confirmed sign-in required' using errcode='42501'; end if;
  if exists(select 1 from public.optical_workspaces where owner_id = auth.uid()) then
    raise exception 'You already have an organization' using errcode='42501';
  end if;
  if length(trim(coalesce(org_name,''))) < 2 then raise exception 'Enter the organization name'; end if;
  if jsonb_typeof(profile) is distinct from 'object' or jsonb_typeof(first_shop) is distinct from 'object' then raise exception 'Invalid setup details'; end if;
  if length(trim(coalesce(first_shop->>'name',''))) < 2 then raise exception 'Enter the first shop name'; end if;
  if jsonb_typeof(templates) is distinct from 'array' then templates := '[]'; end if;
  foreach k in array array['shops','users','products','customers','invoices','suppliers','doctors','staff','expenses','purchases','wa_templates','followups','payments'] loop
    d := jsonb_set(d, array['JIYA_OPTICALS_ERP_V2_'||k], '[]');
  end loop;
  shop := jsonb_build_object('id','shop-1','name',trim(first_shop->>'name'),'code','SHOP-1',
    'tagline',coalesce(first_shop->>'tagline',''),'address',coalesce(first_shop->>'address',''),
    'city',coalesce(first_shop->>'city',''),'phone',coalesce(first_shop->>'phone',''),
    'gstin',coalesce(first_shop->>'gstin',''),'isMain',true);
  d := jsonb_set(d, '{JIYA_OPTICALS_ERP_V2_shops}', jsonb_build_array(shop));
  d := jsonb_set(d, '{JIYA_OPTICALS_ERP_V2_wa_templates}', templates);
  d := jsonb_set(d, '{JIYA_OPTICALS_ERP_V2_profile}', profile || jsonb_build_object('name', trim(org_name)));
  code := optical_private.new_join_code();
  insert into public.optical_workspaces(owner_id, data, join_code) values(auth.uid(), d, code);
  return jsonb_build_object('ownerId', auth.uid(), 'joinCode', code);
end $$;

-- The organization's join code, for its admins only (null for classic stores).
create or replace function optical_private.org_code(team_owner uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not optical_private.is_store_admin(team_owner) then raise exception 'Admin access required' using errcode='42501'; end if;
  return (select join_code from public.optical_workspaces where owner_id = team_owner);
end $$;

create or replace function public.optical_org_create(org_name text, profile jsonb, first_shop jsonb, templates jsonb default '[]') returns jsonb
language sql security invoker set search_path = '' as $$ select optical_private.org_create(org_name, profile, first_shop, templates) $$;
create or replace function public.optical_org_code(team_owner uuid) returns text
language sql security invoker set search_path = '' as $$ select optical_private.org_code(team_owner) $$;

revoke all on function optical_private.new_join_code(), optical_private.org_create(text,jsonb,jsonb,jsonb), optical_private.org_code(uuid) from public, anon;
grant execute on function optical_private.new_join_code(), optical_private.org_create(text,jsonb,jsonb,jsonb), optical_private.org_code(uuid) to authenticated;
revoke all on function public.optical_org_create(text,jsonb,jsonb,jsonb), public.optical_org_code(uuid) from public, anon;
grant execute on function public.optical_org_create(text,jsonb,jsonb,jsonb), public.optical_org_code(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
