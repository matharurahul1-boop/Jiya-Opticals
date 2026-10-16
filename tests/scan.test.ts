import test from 'node:test';
import assert from 'node:assert/strict';
import { findScannedProduct, scannedUnitCode } from '../src/lib/barcodes';
import type { Product } from '../src/types';

const row = (id: string, shopId: string, catalogId: string, barcode: string) => ({ id, shopId, catalogId, barcode, name: 'Frame', stockQty: 1 } as Product);

test('a material with a stock row in every shop still resolves from the all-shops list', () => {
  const rows = [row('a1', 's1', 'cat-a', 'JIYA-FRAMES-DAVID-JONES'), row('a2', 's2', 'cat-a', 'JIYA-FRAMES-DAVID-JONES'), row('b1', 's1', 'cat-b', '890180663928')];
  assert.equal(findScannedProduct(rows, 'JIYA-FRAMES-DAVID-JONES')?.catalogId, 'cat-a');
  assert.equal(findScannedProduct(rows, '890180663928-004')?.catalogId, 'cat-b');
  assert.equal(scannedUnitCode(rows, '890180663928-004'), '890180663928-004');
  assert.equal(scannedUnitCode(rows, 'JIYA-FRAMES-DAVID-JONES'), undefined);
});

test('two different materials sharing one barcode stay ambiguous', () => {
  const rows = [row('a1', 's1', 'cat-a', 'SAME'), row('b1', 's1', 'cat-b', 'SAME')];
  assert.equal(findScannedProduct(rows, 'SAME'), undefined);
});
