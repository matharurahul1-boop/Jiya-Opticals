-- Run once in the Supabase SQL Editor before signing in.
create table if not exists public.optical_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version integer not null default 1 check (version > 0)
);
alter table public.optical_workspaces enable row level security;
revoke all on public.optical_workspaces from anon, authenticated;
grant select, insert, update on public.optical_workspaces to authenticated;
drop policy if exists workspace_read on public.optical_workspaces;
create policy workspace_read on public.optical_workspaces for select to authenticated
  using (owner_id = (select auth.uid()));
drop policy if exists workspace_create on public.optical_workspaces;
create policy workspace_create on public.optical_workspaces for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists workspace_update on public.optical_workspaces;
create policy workspace_update on public.optical_workspaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
