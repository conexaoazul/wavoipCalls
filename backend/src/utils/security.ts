export const SENSITIVE_KEY_PATTERN = /(token|api[-_]?key|authorization|password|passwd|secret|cookie|credential)/i;

export function redactSensitive<T = unknown>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as T;
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSensitive(child);
    }
    return output as T;
  }

  return value;
}

export function toCredentialView(record: any) {
  if (!record) return null;
  const plain = typeof record.get === 'function'
    ? record.get({ plain: true })
    : { ...record };

  const { token, password, secret, apiKey, ...safe } = plain;
  return {
    ...safe,
    hasToken: Boolean(token || password || secret || apiKey),
  };
}

export function toCredentialList(records: any[]) {
  return records.map((record) => toCredentialView(record));
}

export function maskPhone(value?: string | null): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return `${'*'.repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}

export function sanitizeLogValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(redactSensitive(value));
  } catch {
    return '[UNSERIALIZABLE]';
  }
}
