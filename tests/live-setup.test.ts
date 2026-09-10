import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

test('complete live SQL installs twice and every required schema check passes', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-0000-0000-000000000001';
  const member = '00000000-0000-0000-0000-000000000002';
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{r:any}>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const signin = async (id:string) => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
    // Exercise upgrade from the original owner-only setup too.
    await db.exec(readFileSync('supabase/setup.sql','utf8'));
    const full = readFileSync('supabase/LIVE_SETUP.sql','utf8');
    await db.exec(full);await db.exec(full);
    const audit = await db.query<{status:string}>(readFileSync('supabase/VERIFY_LIVE.sql','utf8'));
    assert.equal(audit.rows.length,30);
    assert.deepEqual(audit.rows.filter(r=>r.status!=='PASS'),[]);
    await db.query('insert into auth.users values($1,$2,now()),($3,$4,now())',[owner,'admin@example.com',member,'member@example.com']);
    await signin(owner);
    await rpc('optical_user_sync',['Owner','owner','123']);
    const updated=await rpc('optical_user_sync',['Changed Owner','owner2','456']);
    assert.equal(updated.phone,'456');
    await rpc('optical_team_create',['Store','{}']);
    let data=await rpc('optical_team_load',[owner]);
    assert.equal(data.user.name,'Changed Owner');
    data.data.JIYA_OPTICALS_ERP_V2_shops=[{id:'a'},{id:'b'}];
    data.data.JIYA_OPTICALS_ERP_V2_products=[{id:'frame-a',catalogId:'shared-frame',shopId:'a',name:'Shared frame',barcode:'0001',stockQty:10,salePrice:200}];
    await rpc('optical_team_save',[owner,data.version,JSON.stringify(data.data)]);
    data=await rpc('optical_team_load',[owner]);
    assert.equal(data.data.JIYA_OPTICALS_ERP_V2_products.length,2);
    assert.equal(data.data.JIYA_OPTICALS_ERP_V2_products.find((p:any)=>p.shopId==='b').stockQty,0);
    await assert.rejects(rpc('optical_team_save',[owner,data.version-1,JSON.stringify(data.data)]),(error:any)=>error.code==='PT409');
    await rpc('optical_team_assign',[owner,'member@example.com',['a'],false]);
    await rpc('optical_member_set_role',[owner,'member@example.com','Cashier']);
    await assert.rejects(rpc('optical_member_set_role',[owner,'member@example.com','Admin']),/Unknown role/);
    const directory=await rpc('optical_team_users',[owner]);
    assert.equal(directory.length,2);
    await signin(member);
    await rpc('optical_user_sync',['Member','member','']);
    data=await rpc('optical_team_load',[owner]);
    assert.equal(data.user.role,'Cashier');assert.equal(data.user.name,'Member');
    assert.equal(data.data.JIYA_OPTICALS_ERP_V2_products.length,1);
    const tampered=structuredClone(data.data);tampered.JIYA_OPTICALS_ERP_V2_products[0].name='Member changed global name';
    await assert.rejects(rpc('optical_team_save',[owner,data.version,JSON.stringify(tampered)]),/Only admin/);
    await assert.rejects(rpc('optical_team_users',[owner]),/Admin access/);
  }finally{await db.close();}
});
