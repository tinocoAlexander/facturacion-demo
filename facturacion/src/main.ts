import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { timingSafeEqual } from 'crypto';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const isProduction = nodeEnv === 'production';

  // Headers de seguridad HTTP (XSS, clickjacking, etc.)
  app.use(helmet());

  // Prefijo global — todos tus endpoints serán /api/v1/...
  app.setGlobalPrefix('api/v1');

  // CORS — ajusta los origins según tu frontend
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.CORS_ORIGIN || []
        : true,
    credentials: true,
  });

  const swaggerEnabledRaw = configService.get('SWAGGER_ENABLED');
  const swaggerEnabled =
    swaggerEnabledRaw === true ||
    swaggerEnabledRaw === 'true' ||
    (!isProduction && swaggerEnabledRaw !== false && swaggerEnabledRaw !== 'false');

  let mountSwagger = swaggerEnabled;

  if (swaggerEnabled && isProduction) {
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

      const basicAuth = (req: any, res: any, next: any) => {
        const header = req.headers?.authorization as string | undefined;
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
          u.length === swaggerUser.length &&
          timingSafeEqual(Buffer.from(u), Buffer.from(swaggerUser));
        const pOk =
          p.length === swaggerPass.length &&
          timingSafeEqual(Buffer.from(p), Buffer.from(swaggerPass));

        if (!uOk || !pOk) {
          res.setHeader('WWW-Authenticate', 'Basic');
          return res.status(401).send('Unauthorized');
        }

        return next();
      };

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`App running on http://localhost:${port}/api/v1`);
  if (mountSwagger) {
    console.log(`Swagger docs on http://localhost:${port}/api/v1/docs`);
  }
}
bootstrap();
