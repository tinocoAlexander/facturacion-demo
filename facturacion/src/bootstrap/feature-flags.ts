import type { ConfigService } from '@nestjs/config';

export function isProductionEnv(config: ConfigService): boolean {
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  return nodeEnv === 'production';
}

/**
 * Flag semantics:
 * - In production: enabled only when explicitly true
 * - In non-production: enabled by default unless explicitly false
 */
export function isEnabled(
  config: ConfigService,
  key: string,
  isProduction: boolean,
): boolean {
  const raw = config.get(key);

  return (
    raw === true ||
    raw === 'true' ||
    (!isProduction && raw !== false && raw !== 'false')
  );
}
