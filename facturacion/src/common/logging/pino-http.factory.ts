import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

type RequestWithUser = Request & {
  id?: string;
  user?: { id?: number; role?: string };
};

export function createPinoHttpOptions(config: ConfigService) {
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const isProd = nodeEnv === 'production';
  const level = (config.get<string>('LOG_LEVEL') ??
    (isProd ? 'info' : 'debug')) as
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace'
    | 'silent';

  return {
    level,
    genReqId: (req: RequestWithUser, res: Response) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && incoming.trim().length > 0) {
        res.setHeader('x-request-id', incoming);
        return incoming;
      }

      const id =
        typeof req.id === 'string' && req.id.trim().length > 0
          ? req.id
          : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customProps: (req: RequestWithUser) => ({
      requestId: req.id,
      userId: req.user?.id,
      userRole: req.user?.role,
    }),
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.set-cookie',
      ],
      remove: true,
    },
    autoLogging: {
      ignore: (req: Request) => req.url?.startsWith('/api/v1/health'),
    },
    transport: !isProd
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  };
}
