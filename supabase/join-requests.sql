begin;
-- Organizations (orgs.sql) are hidden from the open shop list; declared here too so this script also runs on its own.
alter table public.optical_workspaces add column if not exists join_code text;
create table if not exists public.optical_join_requests (
  owner_id uuid not null references public.optical_workspaces(owner_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key(owner_id,user_id)
);
alter table public.optical_join_requests enable row level security;
revoke all on public.optical_join_requests from public,anon,authenticated;

create or replace function optical_private.join_options() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if optical_private.session_email() is null then raise exception 'Confirmed sign-in required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('ownerId',w.owner_id,'name',w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name',
    'shops',(select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','name',s->>'name')),'[]') from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) s),
    'request',(select jsonb_build_object('shopId',r.shop_id,'status',r.status) from public.optical_join_requests r where r.owner_id=w.owner_id and r.user_id=auth.uid()))),'[]') from public.optical_workspaces w where w.join_code is null);
end $$;

create or replace function optical_private.join_request(team_owner uuid, requested_shop text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if optical_private.session_email() is null then raise exception 'Confirmed sign-in required' using errcode='42501'; end if;
  perform 1 from public.optical_workspaces where owner_id=team_owner for update;
  if not found then raise exception 'Store not found'; end if;
  if not exists(select 1 from public.optical_workspaces w, jsonb_array_elements(w.data->'JIYA_OPTICALS_ERP_V2_shops') s where w.owner_id=team_owner and s->>'id'=requested_shop) then raise exception 'Unknown shop'; end if;
  if team_owner=auth.uid() or exists(select 1 from public.optical_team_members where owner_id=team_owner and email=optical_private.session_email()) then raise exception 'Already a team member'; end if;
  insert into public.optical_join_requests(owner_id,user_id,shop_id) values(team_owner,auth.uid(),requested_shop)
  on conflict(owner_id,user_id) do update set shop_id=excluded.shop_id,status='pending',created_at=now(),reviewed_at=null
  where optical_join_requests.status <> 'pending';
end $$;

create or replace function optical_private.join_pending(team_owner uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or auth.uid()<>team_owner then raise exception 'Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('userId',r.user_id,'email',u.email,'shopId',r.shop_id,'createdAt',r.created_at) order by r.created_at),'[]') from public.optical_join_requests r join auth.users u on u.id=r.user_id where r.owner_id=team_owner and r.status='pending');
end $$;

create or replace function optical_private.join_review(team_owner uuid, applicant uuid, approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.optical_join_requests; applicant_email text;
begin
  if auth.uid() is null or auth.uid()<>team_owner then raise exception 'Admin access required' using errcode='42501'; end if;
  if approve is null then raise exception 'Choose approve or reject'; end if;
  perform 1 from public.optical_workspaces where owner_id=team_owner for update;
  select * into r from public.optical_join_requests where owner_id=team_owner and user_id=applicant for update;
  if not found or r.status<>'pending' then raise exception 'Request is no longer pending'; end if;
  if approve then
    select lower(email) into applicant_email from auth.users where id=applicant and email_confirmed_at is not null;
    if applicant_email is null then raise exception 'Applicant email is not confirmed'; end if;
    perform optical_private.team_assign(team_owner,applicant_email,array[r.shop_id],false);
  end if;
  update public.optical_join_requests set status=case when approve then 'approved' else 'rejected' end,reviewed_at=now() where owner_id=team_owner and user_id=applicant;
end $$;
create or replace function public.optical_join_options() returns jsonb language sql security invoker set search_path='' as $$select optical_private.join_options()$$;
create or replace function public.optical_join_request(team_owner uuid,requested_shop text) returns void language sql security invoker set search_path='' as $$select optical_private.join_request(team_owner,requested_shop)$$;
create or replace function public.optical_join_pending(team_owner uuid) returns jsonb language sql security invoker set search_path='' as $$select optical_private.join_pending(team_owner)$$;
create or replace function public.optical_join_review(team_owner uuid,applicant uuid,approve boolean) returns void language sql security invoker set search_path='' as $$select optical_private.join_review(team_owner,applicant,approve)$$;
revoke all on function optical_private.join_options(),optical_private.join_request(uuid,text),optical_private.join_pending(uuid),optical_private.join_review(uuid,uuid,boolean) from public,anon;
grant execute on function optical_private.join_options(),optical_private.join_request(uuid,text),optical_private.join_pending(uuid),optical_private.join_review(uuid,uuid,boolean) to authenticated;
revoke all on function public.optical_join_options(),public.optical_join_request(uuid,text),public.optical_join_pending(uuid),public.optical_join_review(uuid,uuid,boolean) from public,anon;
grant execute on function public.optical_join_options(),public.optical_join_request(uuid,text),public.optical_join_pending(uuid),public.optical_join_review(uuid,uuid,boolean) to authenticated;

-- Organizations are private: found only by their join code (or because this person already asked to join).
create or replace function optical_private.join_org(code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare wanted text := upper(regexp_replace(coalesce(code,''),'[^A-Za-z0-9]','','g'));
begin
  if optical_private.session_email() is null then raise exception 'Confirmed sign-in required' using errcode='42501'; end if;
  if wanted <> '' and not exists(select 1 from public.optical_workspaces where join_code=wanted) then raise exception 'No organization found for this code'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('ownerId',w.owner_id,'name',w.data->'JIYA_OPTICALS_ERP_V2_profile'->>'name',
    'shops',(select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','name',s->>'name')),'[]') from jsonb_array_elements(coalesce(w.data->'JIYA_OPTICALS_ERP_V2_shops','[]')) s),
    'request',(select jsonb_build_object('shopId',r.shop_id,'status',r.status) from public.optical_join_requests r where r.owner_id=w.owner_id and r.user_id=auth.uid()))),'[]')
    from public.optical_workspaces w
    where w.join_code is not null and (w.join_code=wanted or exists(select 1 from public.optical_join_requests r where r.owner_id=w.owner_id and r.user_id=auth.uid())));
end $$;
create or replace function public.optical_join_org(code text) returns jsonb language sql security invoker set search_path='' as $$select optical_private.join_org(code)$$;
revoke all on function optical_private.join_org(text),public.optical_join_org(text) from public,anon;
grant execute on function optical_private.join_org(text),public.optical_join_org(text) to authenticated;
notify pgrst,'reload schema';
commit;
