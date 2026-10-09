import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

test('organizations are private, joined by code, and leave the classic store untouched', async () => {
  const db = new PGlite();
  const classic = '00000000-0000-0000-0000-0000000000a1';
  const founder = '00000000-0000-0000-0000-0000000000b1';
  const staff = '00000000-0000-0000-0000-0000000000c1';
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{r:any}>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const signin = async (id:string) => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
    await db.exec(readFileSync('supabase/LIVE_SETUP.sql','utf8'));
    await db.query('insert into auth.users values($1,$2,now()),($3,$4,now()),($5,$6,now())',[classic,'classic@example.com',founder,'founder@example.com',staff,'staff@example.com']);

    // The existing store is created the old way and lists its shops to joiners as before.
    await signin(classic);
    await rpc('optical_team_create',['Jiya','{}']);
    let c = await rpc('optical_team_load',[classic]);
    c.data.JIYA_OPTICALS_ERP_V2_shops=[{id:'s1',name:'Jiya Main'}];
    await rpc('optical_team_save',[classic,c.version,JSON.stringify(c.data)]);
    assert.equal(await rpc('optical_org_code',[classic]),null);

    // A new organization is created with its first shop, without touching the classic store.
    await signin(founder);
    const made = await rpc('optical_org_create',['Vision Hub',{name:'x',gstin:'G1'},{name:'Vision Hub Main',city:'Pune'},[{id:'t1'}]]);
    assert.match(made.joinCode,/^[A-Z2-9]{8}$/);
    await assert.rejects(rpc('optical_org_create',['Again',{},{name:'Again shop'},[]]),/already have/);
    const org = await rpc('optical_team_load',[founder]);
    assert.equal(org.user.role,'Admin');
    assert.equal(org.data.JIYA_OPTICALS_ERP_V2_shops.length,1);
    assert.equal(org.data.JIYA_OPTICALS_ERP_V2_shops[0].name,'Vision Hub Main');
    assert.equal(org.data.JIYA_OPTICALS_ERP_V2_profile.name,'Vision Hub');
    assert.equal(org.data.JIYA_OPTICALS_ERP_V2_products.length,0);
    assert.equal(await rpc('optical_org_code',[founder]),made.joinCode);

    // Classic joiners never see the new organization; the classic store is still listed.
    await signin(staff);
    const open = await rpc('optical_join_options');
    assert.deepEqual(open.map((o:any)=>o.name),['Jiya']);
    assert.deepEqual(await rpc('optical_join_org',['']),[]);
    await assert.rejects(rpc('optical_join_org',['ZZZZZZZZ']),/No organization/);
    await assert.rejects(rpc('optical_org_code',[founder]),/Admin access/);

    // Joining by code (typed loosely) → request → admin approval → access to only that shop.
    const found = await rpc('optical_join_org',[` ${made.joinCode.slice(0,4).toLowerCase()}-${made.joinCode.slice(4)} `]);
    assert.equal(found.length,1);assert.equal(found[0].name,'Vision Hub');
    await rpc('optical_join_request',[founder,'shop-1']);
    assert.equal((await rpc('optical_join_org',['']))[0].request.status,'pending');
    await signin(founder);
    const pending = await rpc('optical_join_pending',[founder]);
    assert.equal(pending.length,1);
    await rpc('optical_join_review',[founder,staff,true]);
    await signin(staff);
    assert.equal((await rpc('optical_team_list')).length,1);
    const joined = await rpc('optical_team_load',[founder]);
    assert.equal(joined.data.JIYA_OPTICALS_ERP_V2_shops.length,1);
    // And the classic store stays closed to them.
    await assert.rejects(rpc('optical_team_load',[classic]),/access removed/);
  } finally { await db.close(); }
});
