import 'reflect-metadata';
import { Pool } from 'pg';
import * as path from 'path';
import { runSqlMigrations } from './run-sql-migrations';

async function main() {
  const migrationsDir = path.join(__dirname, 'migrations');

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST ?? 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT ?? 5432),
    max: Number(process.env.DB_POOL_MAX ?? 20),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 2000,
    ),
    options: `-c statement_timeout=${Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 15000)}`,
  });

  const client = await pool.connect();
  try {
    await runSqlMigrations({
      client,
      migrationsDir,
      log: (m) => console.log(m),
      debug: (m) => console.debug(m),
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
