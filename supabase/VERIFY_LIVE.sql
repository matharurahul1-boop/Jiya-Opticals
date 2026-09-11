-- Read-only audit. All rows should say PASS after LIVE_SETUP.sql.
-- This validates schema/grants, not email delivery, printer hardware or Drishti source mapping.
with expected(table_name,column_name,data_type) as (values
 ('optical_join_requests','owner_id','uuid'),('optical_join_requests','user_id','uuid'),('optical_join_requests','shop_id','text'),('optical_join_requests','status','text'),('optical_join_requests','created_at','timestamp with time zone'),
 ('optical_workspaces','owner_id','uuid'),('optical_workspaces','data','jsonb'),('optical_workspaces','version','integer'),
 ('optical_team_members','owner_id','uuid'),('optical_team_members','email','text'),('optical_team_members','shop_ids','ARRAY'),
 ('optical_user_directory','id','uuid'),('optical_user_directory','email','text'),('optical_user_directory','full_name','text'),
 ('optical_user_directory','username','text'),('optical_user_directory','phone','text'),
 ('optical_user_directory','created_at','timestamp with time zone'),('optical_user_directory','updated_at','timestamp with time zone'),
 ('optical_member_role','owner_id','uuid'),('optical_member_role','email','text'),('optical_member_role','role','text')
), signatures(name) as (values
 ('public.optical_join_options()'),('public.optical_join_request(uuid,text)'),('public.optical_join_pending(uuid)'),('public.optical_join_review(uuid,uuid,boolean)'),
 ('public.optical_team_list()'),('public.optical_team_create(text,jsonb)'),('public.optical_team_load(uuid)'),
 ('public.optical_team_save(uuid,integer,jsonb)'),('public.optical_team_members(uuid)'),('public.optical_team_assign(uuid,text,text[],boolean)'),
 ('public.optical_user_sync(text,text,text)'),('public.optical_team_users(uuid)'),('public.optical_member_set_role(uuid,text,text)'),
 ('public.optical_drishti_import(uuid,text,text,jsonb)')
), tables(name) as (values ('optical_join_requests'),('optical_workspaces'),('optical_team_members'),('optical_user_directory'),('optical_member_role'))
select 'column' as check_type, e.table_name||'.'||e.column_name as object_name,
 case when c.column_name is null then 'MISSING' when c.data_type<>e.data_type then 'TYPE MISMATCH' else 'PASS' end as status
from expected e left join information_schema.columns c on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
union all
select 'RPC + grants',name,case when to_regprocedure(name) is null then 'MISSING'
 when not has_function_privilege('authenticated',to_regprocedure(name),'EXECUTE') then 'AUTH GRANT MISSING'
 when has_function_privilege('anon',to_regprocedure(name),'EXECUTE') then 'ANON ACCESS MUST BE REVOKED'
 else 'PASS' end from signatures
union all
select 'RLS + no raw browser access',t.name,case when c.oid is null then 'MISSING'
 when not c.relrowsecurity then 'RLS DISABLED'
 when has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') then 'RAW ACCESS MUST BE REVOKED'
 else 'PASS' end from tables t left join pg_class c on c.oid=to_regclass('public.'||t.name)
order by check_type,object_name;
