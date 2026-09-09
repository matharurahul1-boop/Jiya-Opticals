import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { findScannedProduct } from '../src/lib/barcodes';
import type { Product } from '../src/types';
import QRCode from 'qrcode';
import { createRequire } from 'node:module';
const { RGBLuminanceSource, HybridBinarizer, BinaryBitmap, MultiFormatReader } = createRequire(import.meta.url)('@zxing/library');

test('barcode lookup preserves zeroes/case and rejects ambiguous matches', () => {
  const item = { id: 'one', barcode: '000123', qrCode: 'https://example.invalid/AbC' } as Product;
  assert.equal(findScannedProduct([item], '000123\r\n')?.id, 'one');
  assert.equal(findScannedProduct([item], item.qrCode!)?.id, 'one');
  assert.equal(findScannedProduct([item], '123'), undefined);
  assert.equal(findScannedProduct([item], 'https://example.invalid/abc'), undefined);
  assert.equal(findScannedProduct([item, { ...item, id: 'two' }], '000123'), undefined);
});

test('generated QR payload decodes unchanged with the actual scanner library', () => {
  for (const text of ['0000123456', 'https://example.invalid/frame/AbC001']) {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const scale = 8, margin = 4, size = (qr.modules.size + margin * 2) * scale;
    const pixels = new Uint8ClampedArray(size * size).fill(255);
    for (let y = 0; y < qr.modules.size; y++) for (let x = 0; x < qr.modules.size; x++) if (qr.modules.get(y, x)) {
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) pixels[((y + margin) * scale + dy) * size + (x + margin) * scale + dx] = 0;
    }
    const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, size, size)));
    assert.equal(new MultiFormatReader().decodeWithState(bitmap).getText(), text);
  }
});

test('Drishti sync is atomic, idempotent, shop-scoped and preserves ERP stock', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-0000-0000-000000000001', member = '00000000-0000-0000-0000-000000000002';
  const rpc = async (name: string, args: unknown[] = []) => (await db.query<{ r: any }>(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) r`, args)).rows[0].r;
  const signIn = async (id: string) => { await db.exec('reset role; set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
  const sourceItem = { externalId: 'D-1', barcode: '000123', qrCode: 'https://example.invalid/AbC', name: 'Frame', category: 'Spectacle Frame', purchasePrice: 100, mrp: 250, salePrice: 200, gstRate: 0, stockQty: 10, minStockAlert: 0 };
  const upload = (items: any[], shop = 'a') => rpc('optical_drishti_import', [owner, shop, 'drishti-main', JSON.stringify(items)]);
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth, public to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.query('insert into auth.users values($1,$2,now()),($3,$4,now())', [owner, 'admin@example.com', member, 'member@example.com']);
    await db.exec(readFileSync('supabase/team-access.sql', 'utf8'));
    const syncSql = readFileSync('supabase/drishti-sync.sql', 'utf8'); await db.exec(syncSql); await db.exec(syncSql);
    await signIn(owner);
    await rpc('optical_team_create', ['Store', '{}']);
    let store = await rpc('optical_team_load', [owner]);
    store.data.JIYA_OPTICALS_ERP_V2_shops = [{ id: 'a' }, { id: 'b' }];
    await rpc('optical_team_save', [owner, store.version, JSON.stringify(store.data)]);
    await rpc('optical_team_assign', [owner, 'member@example.com', ['a'], false]);
    await signIn(member);
    assert.equal((await upload([sourceItem])).added, 1);
    const repeated = await upload([sourceItem]); assert.equal(repeated.unchanged, 1);
    assert.equal((await upload([sourceItem])).version, repeated.version);
    await assert.rejects(upload([sourceItem], 'b'), /not assigned/);
    await assert.rejects(upload([{ ...sourceItem, externalId: 'D-2' }]), /already belongs/);
    await assert.rejects(upload([{ ...sourceItem, barcode: 'changed' }]), /Source code changed/);
    await assert.rejects(upload([sourceItem, sourceItem]), /Duplicate source/);
    await assert.rejects(upload([{ ...sourceItem, externalId: 'ok', barcode: 'new', qrCode: '' }, { ...sourceItem, externalId: 'bad', barcode: 'other', qrCode: '', salePrice: -1 }]), /Invalid price/);
    store = await rpc('optical_team_load', [owner]);
    assert.equal(store.data.JIYA_OPTICALS_ERP_V2_products.length, 1, 'failed batch must roll back first item');
    const originalId = store.data.JIYA_OPTICALS_ERP_V2_products[0].id;
    store.data.JIYA_OPTICALS_ERP_V2_products[0].stockQty = 8;
    await rpc('optical_team_save', [owner, store.version, JSON.stringify(store.data)]);
    assert.equal((await upload([{ ...sourceItem, salePrice: 220, stockQty: 99 }])).updated, 1);
    store = await rpc('optical_team_load', [owner]);
    const product = store.data.JIYA_OPTICALS_ERP_V2_products[0];
    assert.equal(product.id, originalId); assert.equal(product.barcode, '000123');
    assert.equal(product.stockQty, 8); assert.equal(product.drishtiStockQty, 99); assert.equal(product.salePrice, 220);
    await signIn(owner);
    await rpc('optical_team_assign', [owner, 'member@example.com', [], true]);
    await signIn(member);
    await assert.rejects(upload([sourceItem]), /not assigned/);
    await db.exec('reset role; set role anon');
    await assert.rejects(upload([sourceItem]), /permission denied/);
  } finally { await db.close(); }
});
