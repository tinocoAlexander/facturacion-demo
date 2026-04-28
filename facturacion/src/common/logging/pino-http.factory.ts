import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { IncomingMessage } from 'http';

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
    genReqId: (req: IncomingMessage) => {
      const r = req as unknown as RequestWithUser;
      // El RequestIdMiddleware ya validó y seteó req.id (UUID seguro)
      return r.id || randomUUID();
    },
    customProps: (req: IncomingMessage) => {
      const r = req as unknown as RequestWithUser;
      return {
        requestId: r.id,
        userId: r.user?.id,
        userRole: r.user?.role,
      };
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.set-cookie',
      ],
      remove: true,
    },
    autoLogging: {
      ignore: (req: IncomingMessage) => !!req.url?.startsWith('/api/v1/health'),
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
