import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Server } from 'http';

export function configureServerTimeouts(
  app: INestApplication,
  config: ConfigService,
) {
  const server = app.getHttpServer() as Server & {
    requestTimeout?: number;
    headersTimeout?: number;
    keepAliveTimeout?: number;
    setTimeout: (msecs: number) => void;
  };

  const requestTimeoutMs =
    config.get<number>('SERVER_REQUEST_TIMEOUT_MS') ?? 30_000;
  const headersTimeoutMs =
    config.get<number>('SERVER_HEADERS_TIMEOUT_MS') ?? 35_000;
  const keepAliveTimeoutMs =
    config.get<number>('SERVER_KEEP_ALIVE_TIMEOUT_MS') ?? 5_000;

  if (typeof server.setTimeout === 'function') {
    server.setTimeout(requestTimeoutMs);
  }

  if (typeof server.headersTimeout === 'number') {
    server.headersTimeout = headersTimeoutMs;
  }

  if (typeof server.keepAliveTimeout === 'number') {
    server.keepAliveTimeout = keepAliveTimeoutMs;
  }

  // Node >=18 también expone requestTimeout property
  if (typeof server.requestTimeout === 'number') {
    server.requestTimeout = requestTimeoutMs;
  }
}
