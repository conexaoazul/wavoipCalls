import test from 'node:test';
import assert from 'node:assert/strict';
import { maskPhone, redactSensitive, toCredentialView } from '../utils/security';

test('redactSensitive removes nested secrets', () => {
  const input = {
    token: 'top-secret',
    nested: {
      api_key: 'another-secret',
      safe: 'ok',
      authorization: 'Bearer abc',
    },
  };

  const result = redactSensitive(input) as any;
  assert.equal(result.token, '[REDACTED]');
  assert.equal(result.nested.api_key, '[REDACTED]');
  assert.equal(result.nested.authorization, '[REDACTED]');
  assert.equal(result.nested.safe, 'ok');
});

test('credential view never serializes token', () => {
  const result = toCredentialView({
    id: 7,
    tenantId: 2,
    name: 'LAB',
    token: 'secret-value',
  }) as any;

  assert.equal(result.id, 7);
  assert.equal(result.name, 'LAB');
  assert.equal(result.hasToken, true);
  assert.equal('token' in result, false);
});

test('phone masking preserves only final digits', () => {
  const masked = maskPhone('+55 51 99999-1234');
  assert.equal(masked.endsWith('1234'), true);
  assert.equal(masked.includes('99999'), false);
});
