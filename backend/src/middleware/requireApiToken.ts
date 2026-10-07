import { NextFunction, Request, Response } from 'express';
import UserService from '../services/UserService';

export default async function requireApiToken(req: Request, res: Response, next: NextFunction) {
  const header = String(req.headers.authorization || '');
  const [scheme, token] = header.split(' ', 2);

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await UserService.verifyToken(token);
  if (!result.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
