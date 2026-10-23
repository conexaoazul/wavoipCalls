import { NextFunction, Request, Response } from 'express';

function configuredTenantId(): number {
  const raw = String(process.env.CONTROL_PLANE_TENANT_ID || '').trim();
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('CONTROL_PLANE_TENANT_ID must be a positive integer');
  }
  return value;
}

function extractTenantCandidates(req: Request): Array<{ source: string; value: unknown }> {
  const candidates: Array<{ source: string; value: unknown }> = [];

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'tenantId')) {
    candidates.push({ source: 'body', value: req.body.tenantId });
  }
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'tenantId')) {
    candidates.push({ source: 'query', value: req.query.tenantId });
  }
  if (req.params && Object.prototype.hasOwnProperty.call(req.params, 'tenantId')) {
    candidates.push({ source: 'params', value: req.params.tenantId });
  }

  return candidates;
}

export default function enforceTenantScope(req: Request, res: Response, next: NextFunction) {
  let allowedTenantId: number;
  try {
    allowedTenantId = configuredTenantId();
  } catch {
    return res.status(503).json({ error: 'Control-plane tenant scope is not configured' });
  }

  for (const candidate of extractTenantCandidates(req)) {
    const requestedTenantId = Number(candidate.value);
    if (!Number.isInteger(requestedTenantId) || requestedTenantId !== allowedTenantId) {
      return res.status(403).json({ error: 'Tenant scope denied' });
    }
  }

  next();
}

export { configuredTenantId };
