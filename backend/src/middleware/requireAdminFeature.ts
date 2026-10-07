import { NextFunction, Request, Response } from 'express';

export default function requireAdminFeature(_req: Request, res: Response, next: NextFunction) {
  if (process.env.CONTROL_PLANE_ADMIN_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}
