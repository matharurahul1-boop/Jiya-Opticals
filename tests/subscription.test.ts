import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

test('organizations get a 15-day trial, lock when it ends, and management can renew; the original store never locks', async () => {
  const db = new PGlite();
  const boss = '00000000-0000-0000-0000-0000000000d1';
  const classic = '00000000-0000-0000-0000-0000000000a1';
  const founder = '00000000-0000-0000-0000-0000000000b1';
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{r:any}>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const signin = async (id:string) => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
  const asDba = async (sql: string, args: unknown[] = []) => { await db.exec('reset role'); return db.query(sql, args); };
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
    await db.exec(readFileSync('supabase/LIVE_SETUP.sql','utf8'));
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'tusharbali855@gmail.com',now()),($2,'classic@example.com',now()),($3,'founder@example.com',now())",[boss,classic,founder]);

    await signin(classic);
    await rpc('optical_team_create',['Jiya','{}']);
    await signin(founder);
    const made = await rpc('optical_org_create',['Vision Hub',{},{name:'Main'},[]]);
    const days = (new Date(made.expiresAt).getTime()-Date.now())/864e5;
    assert.ok(days>14.9&&days<15.1,'15-day trial, got '+days);
    let load = await rpc('optical_team_load',[founder]);
    assert.equal((await rpc('optical_org_status',[founder])).trial,true);

    // Day 16: the trial has run out.
    await asDba("update public.optical_workspaces set subscription_expires_at = now() - interval '1 hour' where owner_id=$1",[founder]);
    await signin(founder);
    await assert.rejects(rpc('optical_team_load',[founder]),/SUBSCRIPTION_ENDED/);
    await assert.rejects(rpc('optical_team_save',[founder,load.version,JSON.stringify(load.data)]),/SUBSCRIPTION_ENDED/);
    // The original store has no subscription and is untouched.
    await signin(classic);
    await rpc('optical_team_load',[classic]);
    assert.equal(await rpc('optical_org_status',[classic]),null);

    // Only management can renew.
    await signin(founder);
    await assert.rejects(rpc('optical_platform_set_subscription',[founder,true,new Date(Date.now()+30*864e5).toISOString()]),/Management access/);
    await signin(boss);
    await assert.rejects(rpc('optical_platform_set_subscription',[classic,true,null]),/no subscription/);
    const ov = await rpc('optical_platform_overview');
    const row = ov.orgs.find((o:any)=>o.ownerId===founder);
    assert.equal(row.subscriptionActive,true);assert.ok(new Date(row.subscriptionExpiresAt)<new Date());

    // Payment received: new renewal date → access returns, and it is now a paid subscription.
    const renewed = await rpc('optical_platform_set_subscription',[founder,true,new Date(Date.now()+30*864e5).toISOString()]);
    assert.equal(renewed.trial,false);
    await signin(founder);
    load = await rpc('optical_team_load',[founder]);
    await rpc('optical_team_save',[founder,load.version,JSON.stringify(load.data)]);

    // Switched off by management: blocked even before the date; switched on again: back in.
    await signin(boss);
    await rpc('optical_platform_set_subscription',[founder,false,null]);
    await signin(founder);
    await assert.rejects(rpc('optical_team_load',[founder]),/SUBSCRIPTION_ENDED/);
    await signin(boss);
    await rpc('optical_platform_set_subscription',[founder,true,null]);
    await signin(founder);
    await rpc('optical_team_load',[founder]);

    await signin(boss);
    const actions = (await rpc('optical_platform_logs',[100,null])).map((l:any)=>l.action);
    assert.ok(actions.includes('subscription_changed'));
  } finally { await db.close(); }
});
