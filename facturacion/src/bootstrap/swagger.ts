import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createBasicAuthMiddleware } from './basic-auth';

export function configureSwagger(
  app: INestApplication,
  configService: ConfigService,
  isProduction: boolean,
  enabled: boolean,
): boolean {
  let mountSwagger = enabled;

  if (enabled && isProduction) {
    const swaggerUser = configService.get<string>('SWAGGER_BASIC_USER');
    const swaggerPass = configService.get<string>('SWAGGER_BASIC_PASSWORD');

    // En producción, si Swagger está activo, exigir credenciales; si faltan, no montarlo.
    if (!swaggerUser || !swaggerPass) {
      console.warn(
        'Swagger is enabled in production but SWAGGER_BASIC_USER/PASSWORD are missing. Swagger will not be mounted.',
      );
      mountSwagger = false;
    } else {
      const prefix = 'api/v1';
      const docsPath = `/${prefix}/docs`;
      const docsJsonPath = `/${prefix}/docs-json`;
      const basicAuth = createBasicAuthMiddleware(swaggerUser, swaggerPass);

      app.use(docsPath, basicAuth);
      app.use(docsJsonPath, basicAuth);
    }
  }

  if (mountSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Facturación API')
      .setDescription('API Backend para autenticación y gestión de usuarios')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'bearer',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: true,
      swaggerOptions: { persistAuthorization: true },
    });
  }

  return mountSwagger;
}
