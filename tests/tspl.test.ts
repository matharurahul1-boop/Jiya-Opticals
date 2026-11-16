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
  assert.match(out, /BARCODE \d+,\d+,"128",\d+,1,0,3,3,"FR00001-001"/);
  assert.match(out, /BARCODE \d+,\d+,"128",\d+,1,0,3,3,"FR00001-002"/);
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

test('with a 33 mm tail gap the barcode gets thick 3-dot bars below the text, inside the label with a clear margin', () => {
  const long = { ...label, model: 'Armani Sunglasses', code: 'SG00001-005' };
  const out = buildTspl({ ...opts, leftMargin: 33, labels: [long] });
  const brand = out.match(/TEXT (\d+),(\d+),"3",0,1,1,"RAY-BAN"/)!;
  const bar = out.match(/BARCODE (\d+),(\d+),"128",(\d+),1,0,(\d),\d,"SG00001-005"/)!;
  const mrp = out.match(/TEXT (\d+),(\d+),"3",0,1,1,"MRP\. 9890"/)!;
  assert.equal(Number(brand[1]), 33 * 8);
  assert.equal(bar[4], '3');
  assert.ok(Number(bar[1]) >= 33 * 8, 'the tail stays empty');
  const barWidth = ((11 + 2) * 11 + 13) * 3;
  assert.ok(Number(bar[1]) + barWidth <= 100 * 8 - 5 * 8, 'barcode keeps 5 mm free at the right edge');
  assert.ok(Number(brand[2]) + 24 <= Number(bar[2]), 'text sits above the barcode, not beside it');
  assert.ok(Number(bar[2]) + Number(bar[3]) <= 15 * 8, 'barcode fits in the 15 mm height');
  assert.ok(Number(mrp[1]) + 9 * 16 <= 100 * 8 - 5 * 8, 'MRP ends 5 mm before the right edge');
});

test('the model and the MRP never overlap on the top row, and the model is cut to fit', () => {
  const long = { ...label, model: 'Armani Sunglasses Extra Long Name', code: 'SG00001-005' };
  const out = buildTspl({ ...opts, leftMargin: 33, labels: [long] });
  const model = out.match(/TEXT (\d+),\d+,"2",0,1,1,"(Armani[^"]*)"/)!;
  const mrp = out.match(/TEXT (\d+),\d+,"3",0,1,1,"MRP\./)!;
  assert.ok(Number(model[1]) + model[2].length * 12 <= Number(mrp[1]) - 2 * 8, 'model ends 2 mm before the MRP');
});
