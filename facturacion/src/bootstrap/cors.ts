import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

function parseCorsOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function configureCors(
  app: INestApplication,
  config: ConfigService,
  isProduction: boolean,
) {
  // CORS — ajusta los origins según tu frontend
  const corsOrigins = parseCorsOrigins(config.get<string>('CORS_ORIGIN'));
  app.enableCors({
    origin: isProduction ? (corsOrigins.length ? corsOrigins : false) : true,
    credentials: true,
  });
}
