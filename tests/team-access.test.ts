import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('team RPCs isolate shops, preserve other branches, and revoke access', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-0000-0000-000000000001';
  const member = '00000000-0000-0000-0000-000000000002';
  const outsider = '00000000-0000-0000-0000-000000000003';
  const unverified = '00000000-0000-0000-0000-000000000004';
  const key = (s: string) => `JIYA_OPTICALS_ERP_V2_${s}`;
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{ result: any }>(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`, args)).rows[0].result;
  const signIn = async (id: string) => { await db.exec('reset role; set role authenticated;'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth, public to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.query('insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now()),($7,$8,null)', [owner, 'admin@example.com', member, 'member@example.com', outsider, 'outsider@example.com', unverified, 'unverified@example.com']);
    const schema = readFileSync('supabase/team-access.sql', 'utf8');
    await db.exec(schema); await db.exec(schema);
    await signIn(owner);
    await rpc('optical_team_create', ['Test Store', JSON.stringify({ name: 'Test Store' })]);
    let loaded = await rpc('optical_team_load', [owner]);
    assert.equal(loaded.user.role, 'Admin');
    const payload = loaded.data;
    payload[key('shops')] = [{ id: 'a', name: 'Shop A' }, { id: 'b', name: 'Shop B' }];
    payload[key('customers')] = [{ id: 'ca', shopId: 'a', name: 'Client A' }, { id: 'cb', shopId: 'b', name: 'Private B' }];
    payload[key('invoices')] = [{ id: 'ia', shopId: 'a', netPayable: 100 }, { id: 'ib', shopId: 'b', netPayable: 200 }];
    await rpc('optical_team_save', [owner, loaded.version, JSON.stringify(payload)]);
    await rpc('optical_team_assign', [owner, 'MEMBER@example.com', ['a'], false]);
    await rpc('optical_team_assign', [owner, 'unverified@example.com', ['a'], false]);
    await signIn(member);
    assert.equal((await rpc('optical_team_list')).length, 1);
    loaded = await rpc('optical_team_load', [owner]);
    assert.equal(loaded.user.role, 'Shop Manager');
    assert.deepEqual(loaded.data[key('shops')].map((s: any) => s.id), ['a']);
    assert.equal(JSON.stringify(loaded).includes('Private B'), false);
    await assert.rejects(db.query('select * from public.optical_workspaces'), /permission denied/);
    await assert.rejects(db.query('select * from public.optical_team_members'), /permission denied/);
    await assert.rejects(rpc('optical_team_assign', [owner, 'outsider@example.com', ['b'], false]), /Admin access/);
    const attack = structuredClone(loaded.data);
    attack[key('customers')].push({ id: 'cb', shopId: 'b' });
    await assert.rejects(rpc('optical_team_save', [owner, loaded.version, JSON.stringify(attack)]), /outside assigned shops/);
    attack[key('customers')][1].shopId = 'a';
    await assert.rejects(rpc('optical_team_save', [owner, loaded.version, JSON.stringify(attack)]), /belongs to another shop/);
    loaded.data[key('customers')][0].name = 'Updated A';
    // Tampering with admin globals must not be persisted.
    loaded.data[key('shops')] = [{ id: 'stolen' }];
    const next = await rpc('optical_team_save', [owner, loaded.version, JSON.stringify(loaded.data)]);
    await assert.rejects(rpc('optical_team_save', [owner, loaded.version, JSON.stringify(loaded.data)]), /another session/);
    await signIn(owner);
    let admin = await rpc('optical_team_load', [owner]);
    assert.equal(admin.version, next);
    assert.equal(admin.data[key('customers')][0].name === 'Updated A' || admin.data[key('customers')][1].name === 'Updated A', true);
    assert.equal(admin.data[key('customers')].find((c: any) => c.id === 'cb').name, 'Private B');
    assert.equal(admin.data[key('shops')].length, 2);
    await rpc('optical_team_assign', [owner, 'member@example.com', ['a', 'b'], false]);
    await signIn(member);
    assert.equal((await rpc('optical_team_load', [owner])).data[key('shops')].length, 2);
    await signIn(unverified);
    assert.equal((await rpc('optical_team_list')).length, 0);
    await assert.rejects(rpc('optical_team_load', [owner]), /access removed|not confirmed/);
    await signIn(outsider);
    assert.equal((await rpc('optical_team_list')).length, 0);
    await assert.rejects(rpc('optical_team_load', [owner]), /access removed/);
    await signIn(owner);
    await rpc('optical_team_assign', [owner, 'member@example.com', [], true]);
    await signIn(member);
    await assert.rejects(rpc('optical_team_load', [owner]), /access removed/);
    await assert.rejects(rpc('optical_team_save', [owner, next, JSON.stringify(loaded.data)]), /access removed/);
    await db.exec('reset role; set role anon;');
    await assert.rejects(rpc('optical_team_list'), /permission denied/);
  } finally { await db.close(); }
});

test('open-access store lets any confirmed sign-in join every shop, and cannot be duplicated', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-0000-0000-000000000001';
  const staff = '00000000-0000-0000-0000-000000000002';
  const other = '00000000-0000-0000-0000-000000000003';
  const unverified = '00000000-0000-0000-0000-000000000004';
  const key = (s: string) => `JIYA_OPTICALS_ERP_V2_${s}`;
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{ result: any }>(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as result`, args)).rows[0].result;
  const signIn = async (id: string) => { await db.exec('reset role; set role authenticated;'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth, public to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.query('insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now()),($7,$8,null)', [owner, 'owner@example.com', staff, 'staff@example.com', other, 'other@example.com', unverified, 'later@example.com']);
    const schema = readFileSync('supabase/team-access.sql', 'utf8');
    await db.exec(schema);
    await signIn(owner);
    await rpc('optical_team_create', ['Jiya Opticals', JSON.stringify({ name: 'Jiya Opticals', openAccess: true })]);
    // A second store cannot be started once one exists.
    await signIn(staff);
    await assert.rejects(rpc('optical_team_create', ['Another', JSON.stringify({ name: 'Another' })]), /already set up/);
    await signIn(owner);
    let loaded = await rpc('optical_team_load', [owner]);
    loaded.data[key('shops')] = [{ id: 'a', name: 'Shop A' }, { id: 'b', name: 'Shop B' }];
    await rpc('optical_team_save', [owner, loaded.version, JSON.stringify(loaded.data)]);
    // Confirmed staff with no membership row: sees the store, gets every shop, can bill.
    await signIn(staff);
    assert.equal((await rpc('optical_team_list')).length, 1);
    let staffView = await rpc('optical_team_load', [owner]);
    assert.deepEqual(staffView.data[key('shops')].map((s: any) => s.id).sort(), ['a', 'b']);
    staffView.data[key('customers')] = [{ id: 'c1', shopId: 'b', name: 'Walk-in' }];
    await rpc('optical_team_save', [owner, staffView.version, JSON.stringify(staffView.data)]);
    await signIn(owner);
    assert.equal((await rpc('optical_team_load', [owner])).data[key('customers')][0].name, 'Walk-in');
    // Unconfirmed users are still excluded.
    await signIn(unverified);
    assert.equal((await rpc('optical_team_list')).length, 0);
    await assert.rejects(rpc('optical_team_load', [owner]), /access removed|not confirmed/);
    // Turning open access off restores per-person control.
    await signIn(owner);
    loaded = await rpc('optical_team_load', [owner]);
    loaded.data[key('profile')].openAccess = false;
    await rpc('optical_team_save', [owner, loaded.version, JSON.stringify(loaded.data)]);
    await signIn(other);
    assert.equal((await rpc('optical_team_list')).length, 0);
    await assert.rejects(rpc('optical_team_load', [owner]), /access removed/);
  } finally { await db.close(); }
});
