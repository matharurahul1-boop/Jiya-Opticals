import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTspl } from '../src/lib/tspl';

const label = { brand: 'Ray-Ban', model: 'RB 3759I', detail: 'BLU   57-18', shop: 'Jiya Opticals', mrp: 9890, code: 'FR00001-001' };
const opts = { layout: 'strip' as const, width: 100, height: 15, gap: 3, leftMargin: 10, labels: [label, { ...label, code: 'FR00001-002' }] };

test('strip tags become one TSPL job per label with the right size, gap and barcode', () => {
  const out = buildTspl(opts);
  const lines = out.split('\r\n');
  assert.equal(lines[0], 'SIZE 100 mm,15 mm');
  assert.equal(lines[1], 'GAP 3 mm,0 mm');
  assert.equal(out.match(/^PRINT 1,1$/gm)?.length, 2);
  assert.equal(out.match(/^CLS$/gm)?.length, 2);
  assert.ok(out.includes('"RAY-BAN"'));
  assert.ok(out.includes('"RB 3759I"'));
  assert.ok(out.includes('"BLU 57-18"'));
  assert.ok(out.includes('"MRP. 9890"'));
  assert.match(out, /BARCODE \d+,\d+,"128",\d+,1,0,2,2,"FR00001-001"/);
  assert.match(out, /BARCODE \d+,\d+,"128",\d+,1,0,2,2,"FR00001-002"/);
});

test('text is plain ASCII, quotes are removed, and a very long code uses thinner bars', () => {
  const out = buildTspl({ ...opts, labels: [{ ...label, brand: 'Café "X"', model: 'M– 1', code: 'JIYA-FRAMES-ARMANI-2232-C1-001' }] });
  assert.ok(!/[^\x00-\x7e]/.test(out));
  assert.ok(!out.includes('""X""'));
  assert.match(out, /"128",\d+,1,0,1,1,"JIYA-FRAMES-ARMANI-2232-C1-001"/);
});

test('the standard layout also produces a complete job', () => {
  const out = buildTspl({ layout: 'standard', width: 50, height: 30, gap: 3, leftMargin: 0, labels: [label] });
  assert.ok(out.startsWith('SIZE 50 mm,30 mm'));
  assert.ok(out.includes('"MRP 9890"'));
  assert.equal(out.match(/^PRINT 1,1$/gm)?.length, 1);
});
