import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createBasicAuthMiddleware } from './basic-auth';

export function configureMetrics(
  app: INestApplication,
  configService: ConfigService,
  isProduction: boolean,
  enabled: boolean,
): boolean {
  let mountMetrics = enabled;

  if (enabled && isProduction) {
    const metricsUser = configService.get<string>('METRICS_BASIC_USER');
    const metricsPass = configService.get<string>('METRICS_BASIC_PASSWORD');

    // En producción, si metrics está activo, exigir credenciales; si faltan, no montarlo.
    if (!metricsUser || !metricsPass) {
      console.warn(
        'Metrics is enabled in production but METRICS_BASIC_USER/PASSWORD are missing. Metrics will not be mounted.',
      );
      mountMetrics = false;
    } else {
      const metricsPath = '/metrics';
      const basicAuth = createBasicAuthMiddleware(metricsUser, metricsPass);
      app.use(metricsPath, basicAuth);
    }
  }

  return mountMetrics;
}
