import test from 'node:test';
import assert from 'node:assert/strict';
import { finalAmount } from '../src/lib/roundFigure';

test('exact rounds to the nearest rupee', () => {
  assert.equal(finalAmount(6700, 'exact'), 6700);
  assert.equal(finalAmount(6699.6, 'exact'), 6700);
  assert.equal(finalAmount(6699.4, 'exact'), 6699);
});

test('round figures go down to the chosen multiple', () => {
  assert.equal(finalAmount(6684.4, 10), 6680);
  assert.equal(finalAmount(6684.4, 50), 6650);
  assert.equal(finalAmount(6684.4, 100), 6600);
  assert.equal(finalAmount(6700, 100), 6700);
  assert.equal(finalAmount(40, 100), 0);
});

test('a typed final amount never exceeds the exact bill', () => {
  assert.equal(finalAmount(6684.4, 'custom', 6500), 6500);
  assert.equal(finalAmount(6684.4, 'custom', 9999), 6684);
  assert.equal(finalAmount(6684.4, 'custom', 0), 0);
});
