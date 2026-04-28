import { BadRequestException, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmpresasModule } from './empresas/empresas.module';
import { CsdsModule } from './csds/csds.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { TicketsModule } from './tickets/tickets.module';
import { envValidationSchema } from './config/env.validation';
import { AuditModule } from './audit/audit.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createPinoHttpOptions } from './common/logging/pino-http.factory';
import { MetricsModule } from './metrics/metrics.module';
import { RedisModule } from './redis/redis.module';
import { TasksModule } from './tasks/tasks.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import type { ValidationError } from 'class-validator';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(process.cwd(), '.env'),
      isGlobal: true,
      validationSchema: envValidationSchema,
      // Si alguna variable de .env falta o es inválida, la app no arranca
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          pinoHttp: {
            ...createPinoHttpOptions(config),
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') ?? 60_000,
          limit: config.get<number>('THROTTLE_LIMIT') ?? 60,
          skipIf: (ctx) => {
            const req = ctx
              .switchToHttp()
              .getRequest<import('express').Request>();
            const isLocal =
              req.ip === '::ffff:127.0.0.1' || req.ip === '127.0.0.1';
            return process.env.NODE_ENV === 'test' && isLocal;
          },
        },
      ],
    }),
    HealthModule,
    DatabaseModule,
    AuditModule,
    MetricsModule,
    RedisModule,
    TasksModule,
    EmpresasModule,
    AuthModule,
    UsersModule,
    CsdsModule,
    CatalogosModule,
    TicketsModule,
  ],
  providers: [
    // Validación global de DTOs — aplica a todos los controllers
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // elimina campos no declarados en el DTO
        forbidNonWhitelisted: true,
        transform: true, // convierte tipos automáticamente
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: (errors: ValidationError[]) => {
          const details = errors.map((e) => ({
            field: e.property,
            constraints: e.constraints ?? {},
          }));

          const payload = {
            statusCode: 400,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details,
          };

          return new BadRequestException(payload);
        },
      }),
    },
    // Rate limiting global para todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: import('@nestjs/common').MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
