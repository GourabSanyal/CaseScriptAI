import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPool } from '../db/client.js';
import { loadEnvFile } from '../db/env.js';
import { runMigrations } from '../db/migrate.js';
import { createUserRepository } from '../db/user-repository.js';

loadEnvFile();

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe('user repository (integration)', { skip: !hasDatabaseUrl }, () => {
  it('upserts by clerk_user_id and bumps last_seen_at', async () => {
    await runMigrations();
    const pool = createPool();
    const repo = createUserRepository(pool);

    try {
      const first = await repo.upsertByClerkId({
        clerkUserId: 'user_h5a_test_1',
        email: 'ada@clinic.com',
      });
      assert.equal(first.role, 'therapist');
      assert.equal(first.email, 'ada@clinic.com');
      assert.equal(first.clerkUserId, 'user_h5a_test_1');

      await new Promise((r) => setTimeout(r, 20));

      const second = await repo.upsertByClerkId({
        clerkUserId: 'user_h5a_test_1',
        email: 'ada@clinic.com',
      });
      assert.equal(second.id, first.id);
      assert.ok(second.lastSeenAt.getTime() >= first.lastSeenAt.getTime());
    } finally {
      await pool.query(`DELETE FROM users WHERE clerk_user_id = $1`, [
        'user_h5a_test_1',
      ]);
      await pool.end();
    }
  });

  it('never takes role from the client — default therapist on insert', async () => {
    await runMigrations();
    const pool = createPool();
    const repo = createUserRepository(pool);

    try {
      const user = await repo.upsertByClerkId({
        clerkUserId: 'user_h5a_test_2',
        email: null,
      });
      assert.equal(user.role, 'therapist');
    } finally {
      await pool.query(`DELETE FROM users WHERE clerk_user_id = $1`, [
        'user_h5a_test_2',
      ]);
      await pool.end();
    }
  });
});
