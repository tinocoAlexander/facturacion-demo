import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function createBasicAuthMiddleware(username: string, password: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic');
      return res.status(401).send('Unauthorized');
    }

    const raw = header.slice('Basic '.length);
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    const sep = decoded.indexOf(':');
    const u = sep >= 0 ? decoded.slice(0, sep) : '';
    const p = sep >= 0 ? decoded.slice(sep + 1) : '';

    const uOk =
      u.length === username.length &&
      timingSafeEqual(Buffer.from(u), Buffer.from(username));
    const pOk =
      p.length === password.length &&
      timingSafeEqual(Buffer.from(p), Buffer.from(password));

    if (!uOk || !pOk) {
      res.setHeader('WWW-Authenticate', 'Basic');
      return res.status(401).send('Unauthorized');
    }

    return next();
  };
}
