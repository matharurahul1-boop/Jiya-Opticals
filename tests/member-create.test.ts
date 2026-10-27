import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

test('a Shop Manager can create a new material; nothing shared can be changed and other roles cannot create', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-0000-0000-0000000000a1';
  const shivam = '00000000-0000-0000-0000-0000000000b1';
  const cashier = '00000000-0000-0000-0000-0000000000c1';
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{r:any}>(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const signin = async (id:string) => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
  const K = 'JIYA_OPTICALS_ERP_V2_';
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated;grant execute on function auth.uid() to authenticated;`);
    await db.exec(readFileSync('supabase/LIVE_SETUP.sql','utf8'));
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'owner@x.com',now()),($2,'shivam@x.com',now()),($3,'cashier@x.com',now())",[owner,shivam,cashier]);

    await signin(owner);
    await rpc('optical_team_create',['Store','{}']);
    let d = await rpc('optical_team_load',[owner]);
    d.data[K+'shops'] = [{id:'a',name:'Centre 1'},{id:'b',name:'Centre 2'}];
    d.data[K+'products'] = [{id:'old1',catalogId:'cat-old',shopId:'a',name:'Old frame',barcode:'OLD-1',stockQty:3,salePrice:100}];
    await rpc('optical_team_save',[owner,d.version,JSON.stringify(d.data)]);
    await rpc('optical_team_assign',[owner,'shivam@x.com',['a'],false]);
    await rpc('optical_team_assign',[owner,'cashier@x.com',['a'],false]);
    await rpc('optical_member_set_role',[owner,'cashier@x.com','Cashier']);

    // Shivam has no role override: he is a Shop Manager and can create a material.
    await signin(shivam);
    let m = await rpc('optical_team_load',[owner]);
    const fresh = { id:'new1', catalogId:'cat-new', shopId:'a', name:'New frame', barcode:'NEW-1', stockQty:5, salePrice:200 };
    m.data[K+'products'].push(fresh);
    await rpc('optical_team_save',[owner,m.version,JSON.stringify(m.data)]);
    await signin(owner);
    d = await rpc('optical_team_load',[owner]);
    const products = d.data[K+'products'];
    assert.ok(products.some((p:any)=>p.id==='new1'&&p.shopId==='a'&&p.stockQty===5),'new material saved');
    assert.ok(products.some((p:any)=>p.catalogId==='cat-new'&&p.shopId==='b'&&p.stockQty===0),'other shops get an empty stock row');

    // Existing shared details stay locked, even for the material he created.
    await signin(shivam);
    m = await rpc('optical_team_load',[owner]);
    const renamed = structuredClone(m.data); renamed[K+'products'].find((p:any)=>p.id==='new1').name='Renamed';
    await assert.rejects(rpc('optical_team_save',[owner,m.version,JSON.stringify(renamed)]),/Only admin/);
    // A new row may not reuse another material's identity, or have none.
    const clash = structuredClone(m.data); clash[K+'products'].push({id:'x1',catalogId:'cat-old',shopId:'a',name:'Clash',stockQty:1});
    await assert.rejects(rpc('optical_team_save',[owner,m.version,JSON.stringify(clash)]),/Only admin/);
    const noCatalog = structuredClone(m.data); noCatalog[K+'products'].push({id:'x2',shopId:'a',name:'No catalog',stockQty:1});
    await assert.rejects(rpc('optical_team_save',[owner,m.version,JSON.stringify(noCatalog)]),/Only admin/);
    // Stock changes on his own shop still work.
    const stock = structuredClone(m.data); stock[K+'products'].find((p:any)=>p.id==='new1').stockQty=4;
    await rpc('optical_team_save',[owner,m.version,JSON.stringify(stock)]);

    // A Cashier cannot create materials.
    await signin(cashier);
    m = await rpc('optical_team_load',[owner]);
    m.data[K+'products'].push({id:'c1',catalogId:'cat-cash',shopId:'a',name:'Cashier item',stockQty:1});
    await assert.rejects(rpc('optical_team_save',[owner,m.version,JSON.stringify(m.data)]),/Only admin/);
  } finally { await db.close(); }
});
