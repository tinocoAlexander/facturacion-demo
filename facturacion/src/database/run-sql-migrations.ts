import type { PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function runSqlMigrations(params: {
  client: PoolClient;
  migrationsDir: string;
  log: (msg: string) => void;
  debug?: (msg: string) => void;
}): Promise<void> {
  const { client, migrationsDir, log, debug } = params;

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL       PRIMARY KEY,
      name        VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP    WITH TIME ZONE DEFAULT NOW()
    )
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await client.query(
      'SELECT id FROM _migrations WHERE name = $1',
      [file],
    );

    if (rows.length > 0) {
      debug?.(`Skipping: ${file}`);
      continue;
    }

    log(`Running: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);

    log(`Done: ${file}`);
  }
}
