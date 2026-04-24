import { Module, Global, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { MigrationRunner } from './migration.runner';
import { DATABASE_POOL } from './database.constants';

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
          max: 20, 
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        
        pool.on('error', (err) => {
          console.error('Pool error:', err.message);
        });
        
        return pool;
      },
    },
    MigrationRunner,
  ],
  exports: [DATABASE_POOL, MigrationRunner],
})
export class DatabaseModule {}