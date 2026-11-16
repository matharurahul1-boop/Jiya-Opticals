import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaleChunkError } from '../src/lib/staleReload';

test('missing lazy-loaded files are recognised in each browser\'s wording', () => {
  assert.equal(isStaleChunkError(new TypeError('Importing a module script failed.')), true);
  assert.equal(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js')), true);
  assert.equal(isStaleChunkError(new Error('error loading dynamically imported module')), true);
  assert.equal(isStaleChunkError(new Error('Permission denied')), false);
  assert.equal(isStaleChunkError(new Error('Requested device not found')), false);
});
