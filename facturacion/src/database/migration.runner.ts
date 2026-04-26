import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectPool } from './database.constants';
import { Pool } from 'pg';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { runSqlMigrations } from './run-sql-migrations';

@Injectable()
export class MigrationRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationRunner.name);
  private readonly migrationsDir = path.join(__dirname, 'migrations');

  constructor(
    @InjectPool() private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const isProduction = nodeEnv === 'production';
    const autoRunRaw: unknown = this.config.get('MIGRATIONS_AUTO_RUN');

    const autoRun =
      autoRunRaw === true ||
      autoRunRaw === 'true' ||
      (!isProduction && autoRunRaw !== false && autoRunRaw !== 'false');

    if (!autoRun) {
      this.logger.log(
        'Migrations auto-run disabled (set MIGRATIONS_AUTO_RUN=true to enable).',
      );
      return;
    }

    await this.run();
  }

  private async run(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await runSqlMigrations({
        client,
        migrationsDir: this.migrationsDir,
        log: (msg) => this.logger.log(msg),
        debug: (msg) => this.logger.debug(msg),
      });
    } catch (error) {
      this.logger.error('Migration failed', (error as Error).message);
      throw error;
    } finally {
      client.release();
    }
  }
}
