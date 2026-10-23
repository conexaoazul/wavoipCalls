import { createHash } from 'crypto';

function normalizeSchedule(value: unknown): string {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return date.toISOString();
}

export function buildCallRequestFingerprint(data: Record<string, unknown>, tenantId: number): string {
  const canonical = {
    tenantId,
    customerNumber: String(data.customerNumber ?? ''),
    assistantId: String(data.assistantId ?? ''),
    phoneNumberId: String(data.phoneNumberId ?? ''),
    vapiTokenId: data.vapiTokenId == null ? null : Number(data.vapiTokenId),
    elevenLabTokenId: data.elevenLabTokenId == null ? null : Number(data.elevenLabTokenId),
    scheduleAt: normalizeSchedule(data.scheduleAt),
  };

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
