import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(process.cwd(), '.env'),
      isGlobal: true,
      validationSchema: envValidationSchema,
      // Si alguna variable de .env falta o es inválida, la app no arranca
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') ?? 60_000,
          limit: config.get<number>('THROTTLE_LIMIT') ?? 60,
        },
      ],
    }),
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
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
      }),
    },
    // Rate limiting global para todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
