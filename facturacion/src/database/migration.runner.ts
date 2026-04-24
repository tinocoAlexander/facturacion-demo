import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectPool } from './database.constants';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MigrationRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationRunner.name);
  private readonly migrationsDir = path.join(__dirname, 'migrations');

  constructor(@InjectPool() private readonly pool: Pool) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.run();
  }

  private async run(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id          SERIAL       PRIMARY KEY,
          name        VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP    WITH TIME ZONE DEFAULT NOW()
        )
      `);

      const files = fs
        .readdirSync(this.migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const { rows } = await client.query(
          'SELECT id FROM _migrations WHERE name = $1',
          [file],
        );

        if (rows.length > 0) {
          this.logger.debug(`Skipping: ${file}`);
          continue;
        }

        this.logger.log(`Running: ${file}`);
        const sql = fs.readFileSync(
          path.join(this.migrationsDir, file),
          'utf-8',
        );

        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);

        this.logger.log(`Done: ${file}`);
      }
    } catch (error) {
      this.logger.error('Migration failed', error.message);
      throw error;  
    } finally {
      client.release();
    }
  }
}