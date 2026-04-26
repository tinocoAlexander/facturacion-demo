import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { MigrationRunner } from './migration.runner';
import { DATABASE_POOL } from './database.constants';
import { DatabaseShutdown } from './database.shutdown';
import { MetricsService } from '../metrics/metrics.service';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService, MetricsService],
      useFactory: (configService: ConfigService, metrics: MetricsService) => {
        const statementTimeoutMs =
          configService.get<number>('DB_STATEMENT_TIMEOUT_MS') ?? 15000;
        const pool = new Pool({
          user: configService.get<string>('DB_USER'),
          host: configService.get<string>('DB_HOST', 'localhost'),
          database: configService.get<string>('DB_NAME'),
          password: configService.get<string>('DB_PASSWORD'),
          port: configService.get<number>('DB_PORT', 5432),
          options: `-c statement_timeout=${statementTimeoutMs}`,
          max: configService.get<number>('DB_POOL_MAX') ?? 20,
          idleTimeoutMillis:
            configService.get<number>('DB_POOL_IDLE_TIMEOUT_MS') ?? 30000,
          connectionTimeoutMillis:
            configService.get<number>('DB_POOL_CONNECTION_TIMEOUT_MS') ?? 2000,
        });

        pool.on('error', (err) => {
          console.error('Pool error:', err.message);
        });

        // Actualizar métricas del pool cada 30 segundos
        setInterval(() => {
          metrics.setDbPoolMetrics({
            total: (pool as any).options?.max ?? 20,
            idle: pool.idleCount,
            waiting: pool.waitingCount,
          });
        }, 30000).unref();

        return pool;
      },
    },
    MigrationRunner,
    DatabaseShutdown,
  ],
  exports: [DATABASE_POOL, MigrationRunner],
})
export class DatabaseModule {}
