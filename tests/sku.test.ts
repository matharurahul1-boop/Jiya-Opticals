import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlaceholderSku, skuPrefix, suggestSku } from '../src/lib/sku';
import { defaultHsn } from '../src/lib/gst';

const base = { prefix: 'JIYA', category: 'Frames', brand: 'Armani', modelNo: '2232', name: 'Armani Frame', color: 'C1' };

test('SKUs follow one style and stay unique', () => {
  assert.equal(skuPrefix('Jiya Opticals'), 'JIYA');
  assert.equal(suggestSku(base), 'JIYA-FRAMES-ARMANI-2232-C1');
  assert.equal(suggestSku({ ...base, color: 'C2' }), 'JIYA-FRAMES-ARMANI-2232-C2');
  assert.equal(suggestSku(base, ['JIYA-FRAMES-ARMANI-2232-C1']), 'JIYA-FRAMES-ARMANI-2232-C1-2');
  assert.equal(suggestSku({ ...base, modelNo: '', name: 'David Jones' }), 'JIYA-FRAMES-ARMANI-DAVID-JONES-C1');
});

test('contact lenses with different MRPs get different SKUs', () => {
  const cl = { prefix: 'JIYA', category: 'Contact Lens', brand: 'Bausch & Lomb', modelNo: 'SofLens 59', name: 'SofLens 59', color: '' };
  assert.equal(suggestSku({ ...cl, mrp: 1499 }), 'JIYA-CONTACT-LENS-BAUSCH-LOMB-SOFLENS-59-M1499');
  assert.equal(suggestSku({ ...cl, mrp: 1599 }), 'JIYA-CONTACT-LENS-BAUSCH-LOMB-SOFLENS-59-M1599');
  assert.equal(suggestSku(cl), 'JIYA-CONTACT-LENS-BAUSCH-LOMB-SOFLENS-59');
});

test('placeholder numeric codes are recognised; every category has an HSN', () => {
  assert.equal(isPlaceholderSku('890293837553'), true);
  assert.equal(isPlaceholderSku('890180663928-001'), false);
  assert.equal(isPlaceholderSku('JIYA-FRAMES-X'), false);
  for (const c of ['Frames', 'Sunglasses', 'Eyewear Lens', 'Contact Lens', 'Goggles Lens', 'MPS', 'Repair'] as const) assert.ok(defaultHsn(c).length >= 4, c);
});

test('lens variant key is short and readable', async () => {
  const { lensVariantKey, isLensCategory } = await import('../src/lib/lens');
  assert.equal(lensVariantKey('1.56', 'Blue Guard'), '156BG');
  assert.equal(lensVariantKey('1.60', 'Duravision Blue Guard'), '160DBG');
  assert.equal(lensVariantKey('', ''), '');
  assert.equal(isLensCategory('Eyewear Lens'), true);
  assert.equal(isLensCategory('Frames'), false);
});
