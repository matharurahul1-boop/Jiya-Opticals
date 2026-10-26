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
  assert.deepEqual(resolveTagBase(printed, [printed]), { base: 'JIYA-FRAMES-ARMANI-2232-C1' });
});

test('scanning a short tag code finds the material and the exact piece', () => {
  const rows = [row({ tagCode: 'FR00003', id: 'a1', shopId: 's1' }), row({ tagCode: 'FR00003', id: 'a2', shopId: 's2' })];
  assert.equal(findScannedProduct(rows, 'FR00003-013')?.catalogId, 'cat-a');
  assert.equal(scannedUnitCode(rows, 'FR00003-013'), 'FR00003-013');
  assert.equal(scannedUnitCode(rows, 'FR00003'), undefined);
  assert.equal(findScannedProduct(rows, 'JIYA-FRAMES-ARMANI-2232-C1-013')?.catalogId, 'cat-a');
});
