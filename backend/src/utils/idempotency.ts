import { randomUUID } from 'crypto';

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function normalizeIdempotencyKey(value?: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return `call:${randomUUID()}`;
  if (!IDEMPOTENCY_PATTERN.test(raw)) {
    throw new Error('Idempotency-Key inválida: use 8-128 caracteres [A-Za-z0-9._:-]');
  }
  return raw;
}
