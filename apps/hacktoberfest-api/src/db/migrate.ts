import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPool } from './client.js';
import { packageRoot } from './env.js';

const migrationsDir = path.join(packageRoot, 'migrations');

export const runMigrations = async (): Promise<string[]> => {
  const pool = createPool();
  const applied: string[] = [];

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const exists = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE id = $1',
        [file],
      );
      if (exists.rowCount && exists.rowCount > 0) continue;

      const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }

  return applied;
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runMigrations()
    .then((applied) => {
      console.log(
        applied.length === 0
          ? 'migrations: already up to date'
          : `migrations applied: ${applied.join(', ')}`,
      );
    })
    .catch((err) => {
      console.error('migrations failed:', err instanceof Error ? err.message : 'unknown');
      process.exit(1);
    });
}
