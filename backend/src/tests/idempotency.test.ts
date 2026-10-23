import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdempotencyKey } from '../utils/idempotency';

test('keeps a valid caller supplied idempotency key', () => {
  assert.equal(
    normalizeIdempotencyKey('tenant-1:campaign-2:lead-3'),
    'tenant-1:campaign-2:lead-3',
  );
});

test('generates a stable-shape key when omitted', () => {
  const key = normalizeIdempotencyKey();
  assert.match(key, /^call:[0-9a-f-]{36}$/);
});

test('rejects unsafe or too-short keys', () => {
  assert.throws(() => normalizeIdempotencyKey('abc'));
  assert.throws(() => normalizeIdempotencyKey('contains space'));
});
