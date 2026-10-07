import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCallRequestFingerprint } from '../utils/callFingerprint';

const base = {
  customerNumber: '+5551999991234',
  assistantId: 'agent_lab',
  phoneNumberId: 'phone_lab',
  elevenLabTokenId: 4,
  scheduleAt: '2026-10-07T12:00:00.000Z',
};

test('same logical call request produces the same fingerprint', () => {
  assert.equal(
    buildCallRequestFingerprint(base, 1),
    buildCallRequestFingerprint({ ...base }, 1),
  );
});

test('changing a dispatch-relevant field changes the fingerprint', () => {
  assert.notEqual(
    buildCallRequestFingerprint(base, 1),
    buildCallRequestFingerprint({ ...base, customerNumber: '+5551999999999' }, 1),
  );
});

test('equivalent schedule representations normalize to the same fingerprint', () => {
  assert.equal(
    buildCallRequestFingerprint(base, 1),
    buildCallRequestFingerprint({ ...base, scheduleAt: '2026-10-07T09:00:00-03:00' }, 1),
  );
});
