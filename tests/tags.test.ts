import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTagCode, resolveTagBase } from '../src/lib/tags';
import { findScannedProduct, scannedUnitCode } from '../src/lib/barcodes';
import type { Product } from '../src/types';

const row = (o: Partial<Product>) => ({ id: 'a', catalogId: 'cat-a', shopId: 's1', barcode: 'JIYA-FRAMES-ARMANI-2232-C1', name: 'Frame', category: 'Frames', stockQty: 1, ...o } as Product);

test('short barcodes print as they are', () => {
  assert.deepEqual(resolveTagBase(row({ barcode: '890180663928' }), []), { base: '890180663928' });
});

test('a long SKU gets a short, unique tag code per category', () => {
  const frame = row({});
  assert.deepEqual(resolveTagBase(frame, [frame]), { base: 'FR00001', assign: 'FR00001' });
  const other = row({ id: 'b', catalogId: 'cat-b', barcode: 'JIYA-FRAMES-RAYBAN-RB3025-C1', tagCode: 'FR00007' });
  assert.equal(nextTagCode([frame, other], 'Frames'), 'FR00008');
  assert.equal(nextTagCode([frame, other], 'Sunglasses'), 'SG00001');
  assert.deepEqual(resolveTagBase(frame, [frame, other]), { base: 'FR00008', assign: 'FR00008' });
});

test('an assigned code is reused, and materials with tags already printed keep their old base', () => {
  const assigned = row({ tagCode: 'FR00003' });
  assert.deepEqual(resolveTagBase(assigned, [assigned]), { base: 'FR00003' });
  const printed = row({ nextSerial: 6 });
  assert.deepEqual(resolveTagBase(printed, [printed], true), { base: 'JIYA-FRAMES-ARMANI-2232-C1' }, 'a reprint of old tags keeps the old text');
});

test('scanning a short tag code finds the material and the exact piece', () => {
  const rows = [row({ tagCode: 'FR00003', id: 'a1', shopId: 's1' }), row({ tagCode: 'FR00003', id: 'a2', shopId: 's2' })];
  assert.equal(findScannedProduct(rows, 'FR00003-013')?.catalogId, 'cat-a');
  assert.equal(scannedUnitCode(rows, 'FR00003-013'), 'FR00003-013');
  assert.equal(scannedUnitCode(rows, 'FR00003'), undefined);
  assert.equal(findScannedProduct(rows, 'JIYA-FRAMES-ARMANI-2232-C1-013')?.catalogId, 'cat-a');
});

test('colours of one model each get their own tag code, and every piece scans to the right colour', () => {
  const sku = (colour: string) => `JIYA-FRAMES-RAY-BAN-RB-7249-I-8198-${colour}`;
  let products = ['BROWN', 'GRAY', 'BLACK'].map((c, i) => row({ id: `p${i}`, catalogId: `cat-${i}`, barcode: sku(c), color: c, modelNo: 'RB 7249 I 8198' }));
  const bases: string[] = [];
  for (const p of products.map((x) => x.id)) {
    const current = products.find((x) => x.id === p)!;
    const { base, assign } = resolveTagBase(current, products);
    if (assign) products = products.map((x) => (x.id === p ? { ...x, tagCode: assign } : x));
    bases.push(base);
  }
  assert.deepEqual(bases, ['FR00001', 'FR00002', 'FR00003']);
  assert.equal(findScannedProduct(products, 'FR00002-001')?.color, 'GRAY');
  assert.equal(findScannedProduct(products, 'FR00003-004')?.color, 'BLACK');
});

test('colours that share one short barcode (older data) are given separate codes instead of an ambiguous tag', () => {
  const shared = '890180663928';
  let products = [row({ id: 'a', catalogId: 'cat-a', barcode: shared, color: 'BROWN' }), row({ id: 'b', catalogId: 'cat-b', barcode: shared, color: 'GRAY' })];
  assert.equal(findScannedProduct(products, `${shared}-001`), undefined, 'the shared code cannot tell the colours apart');
  const first = resolveTagBase(products[0], products);
  assert.deepEqual(first, { base: 'FR00001', assign: 'FR00001' });
  products = products.map((x) => (x.id === 'a' ? { ...x, tagCode: 'FR00001' } : x));
  const second = resolveTagBase(products[1], products);
  assert.deepEqual(second, { base: 'FR00002', assign: 'FR00002' });
  products = products.map((x) => (x.id === 'b' ? { ...x, tagCode: 'FR00002' } : x));
  assert.equal(findScannedProduct(products, 'FR00001-001')?.color, 'BROWN');
  assert.equal(findScannedProduct(products, 'FR00002-001')?.color, 'GRAY');
});

test('two materials holding the same tag code are separated the next time one of them is printed', () => {
  const a = row({ id: 'a', catalogId: 'cat-a', tagCode: 'FR00003', color: 'BROWN' });
  const b = row({ id: 'b', catalogId: 'cat-b', barcode: 'JIYA-FRAMES-OTHER-1-GRAY', tagCode: 'FR00003', color: 'GRAY' });
  assert.deepEqual(resolveTagBase(a, [a, b]), { base: 'FR00004', assign: 'FR00004' });
  const a2 = { ...a, tagCode: 'FR00004' };
  assert.deepEqual(resolveTagBase(b, [a2, b]), { base: 'FR00003' }, 'once the first is moved, the other keeps its code');
});

test('a material printed before the short codes gets a short code for its new tags, and old stickers still scan', () => {
  const old = row({ id: 'ck', catalogId: 'cat-ck', barcode: 'JIYA-SUNGLASSES-CALVIN-KLEIN-CK21-C1', nextSerial: 4, category: 'Sunglasses', color: 'BLACK' });
  const fresh = resolveTagBase(old, [old]);
  assert.deepEqual(fresh, { base: 'SG00001', assign: 'SG00001' });
  const migrated = { ...old, tagCode: 'SG00001', nextSerial: 6 };
  assert.equal(findScannedProduct([migrated], 'SG00001-004')?.color, 'BLACK');
  assert.equal(findScannedProduct([migrated], 'JIYA-SUNGLASSES-CALVIN-KLEIN-CK21-C1-002')?.color, 'BLACK', 'a sticker printed earlier still finds the material');
  assert.equal(scannedUnitCode([migrated], 'JIYA-SUNGLASSES-CALVIN-KLEIN-CK21-C1-002'), 'JIYA-SUNGLASSES-CALVIN-KLEIN-CK21-C1-002');
});
