import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createPool } from '../db/client.js';
import { loadEnvFile, packageRoot } from '../db/env.js';
import { runMigrations } from '../db/migrate.js';

loadEnvFile();

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const migrationsDir = path.join(packageRoot, 'migrations');

describe('migrations (integration)', { skip: !hasDatabaseUrl }, () => {
  it('applies SQL files and is idempotent on a second run', async () => {
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    assert.ok(files.includes('001_demo_sessions.sql'));

    await runMigrations();
    const second = await runMigrations();
    assert.deepEqual(second, []);

    const pool = createPool();
    try {
      const rows = await pool.query<{ id: string }>(
        'SELECT id FROM schema_migrations ORDER BY id',
      );
      const ids = rows.rows.map((row) => row.id);
      for (const file of files) {
        assert.ok(ids.includes(file), `missing migration record: ${file}`);
      }

      const table = await pool.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_name = 'demo_sessions'`,
      );
      assert.equal(table.rowCount, 1);
    } finally {
      await pool.end();
    }
  });
});
