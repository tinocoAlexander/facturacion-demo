import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { configureTrustProxy } from './bootstrap/trust-proxy';
import { configureSecurity } from './bootstrap/security';
import { configureGlobalPrefix } from './bootstrap/global-prefix';
import { configureCors } from './bootstrap/cors';
import { isEnabled, isProductionEnv } from './bootstrap/feature-flags';
import { configureMetrics } from './bootstrap/metrics';
import { configureSwagger } from './bootstrap/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Reemplaza el logger por defecto de Nest por Pino (JSON estructurado)
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const isProduction = isProductionEnv(configService);

  configureTrustProxy(app, configService);
  configureSecurity(app);
  configureGlobalPrefix(app);
  configureCors(app, configService, isProduction);

  const swaggerEnabled = isEnabled(configService, 'SWAGGER_ENABLED', isProduction);
  const metricsEnabled = isEnabled(configService, 'METRICS_ENABLED', isProduction);

  const mountMetrics = configureMetrics(
    app,
    configService,
    isProduction,
    metricsEnabled,
  );

  const mountSwagger = configureSwagger(
    app,
    configService,
    isProduction,
    swaggerEnabled,
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`App running on http://localhost:${port}/api/v1`);
  if (mountSwagger) {
    console.log(`Swagger docs on http://localhost:${port}/api/v1/docs`);
  }
  if (mountMetrics) {
    console.log(`Metrics on http://localhost:${port}/metrics`);
  }
}
bootstrap();
