import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

test('platform admin sees every organization and its audit trail; others cannot', async () => {
  const db = new PGlite();
  const boss = '00000000-0000-0000-0000-0000000000d1';
  const founder = '00000000-0000-0000-0000-0000000000b1';
  const staff = '00000000-0000-0000-0000-0000000000c1';
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{r:any}>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const signin = async (id:string) => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
    await db.exec(readFileSync('supabase/LIVE_SETUP.sql','utf8'));
    await db.exec(readFileSync('supabase/LIVE_SETUP.sql','utf8'));
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'tusharbali855@gmail.com',now(),'{}'),($2,'founder@example.com',now(),'{\"intent\":\"org\"}'),($3,'staff@example.com',now(),'{\"intent\":\"join\"}')",[boss,founder,staff]);

    await signin(founder);
    assert.equal(await rpc('optical_is_platform_admin'),false);
    await assert.rejects(rpc('optical_platform_overview'),/Management access/);
    await assert.rejects(rpc('optical_platform_logs'),/Management access/);
    await rpc('optical_user_sync',['Founder','founder','1']);
    const made = await rpc('optical_org_create',['Vision Hub',{},{name:'Main'},[]]);
    await signin(staff);
    await rpc('optical_user_sync',['Staff','staff','2']);
    await rpc('optical_join_request',[founder,'shop-1']);
    await signin(founder);
    await rpc('optical_join_review',[founder,staff,true]);
    await rpc('optical_member_set_role',[founder,'staff@example.com','Cashier']);
    const d = await rpc('optical_team_load',[founder]);
    await rpc('optical_team_save',[founder,d.version,JSON.stringify(d.data)]);

    await signin(boss);
    assert.equal(await rpc('optical_is_platform_admin'),true);
    const o = await rpc('optical_platform_overview');
    assert.equal(o.orgs.length,1);
    assert.equal(o.orgs[0].name,'Vision Hub');assert.equal(o.orgs[0].ownerEmail,'founder@example.com');
    assert.equal(o.orgs[0].joinCode,made.joinCode);
    assert.deepEqual(o.orgs[0].members.map((m:any)=>[m.email,m.role]),[['staff@example.com','Cashier']]);
    assert.equal(o.users.length,3);
    const logs = await rpc('optical_platform_logs',[100,null]);
    const actions = logs.map((l:any)=>l.action);
    for (const a of ['signed_up','user_first_seen','organization_created','join_requested','join_approved','member_assigned','role_changed','data_saved']) assert.ok(actions.includes(a),'missing '+a+' in '+actions);
    assert.ok(logs[0].id>logs[logs.length-1].id,'newest first');
    // Ordinary members still cannot read management data.
    await signin(staff);
    await assert.rejects(rpc('optical_platform_overview'),/Management access/);
  } finally { await db.close(); }
});
