import { Module, Global, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { MigrationRunner } from './migration.runner';
import { DATABASE_POOL } from './database.constants';
import { DatabaseShutdown } from './database.shutdown';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('DB_PASSWORD');
        const pool = new Pool({
          user: configService.get<string>('DB_USER'),
          host: configService.get<string>('DB_HOST', 'localhost'),
          database: configService.get<string>('DB_NAME'),
          password: configService.get<string>('DB_PASSWORD'),
          port: configService.get<number>('DB_PORT', 5432),
          max: configService.get<number>('DB_POOL_MAX') ?? 20,
          idleTimeoutMillis:
            configService.get<number>('DB_POOL_IDLE_TIMEOUT_MS') ?? 30000,
          connectionTimeoutMillis:
            configService.get<number>('DB_POOL_CONNECTION_TIMEOUT_MS') ?? 2000,
        });

        pool.on('error', (err) => {
          console.error('Pool error:', err.message);
        });

        return pool;
      },
    },
    MigrationRunner,
    DatabaseShutdown,
  ],
  exports: [DATABASE_POOL, MigrationRunner],
})
export class DatabaseModule {}
