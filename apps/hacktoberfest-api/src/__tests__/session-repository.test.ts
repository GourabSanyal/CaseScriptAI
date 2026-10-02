import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPool } from '../db/client.js';
import { loadEnvFile } from '../db/env.js';
import { runMigrations } from '../db/migrate.js';
import { createSessionRepository } from '../db/session-repository.js';

loadEnvFile();

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe('session repository (integration)', { skip: !hasDatabaseUrl }, () => {
  it('creates, updates status along happy path, and loads by id', async () => {
    await runMigrations();
    const pool = createPool();
    const repo = createSessionRepository(pool);

    try {
      const created = await repo.createSession();
      assert.equal(created.status, 'queued');

      const loaded = await repo.getById(created.id);
      assert.ok(loaded);
      assert.equal(loaded.id, created.id);

      const afterStt = await repo.updateStatus(created.id, 'stt_running', {
        transcript: 'synthetic demo transcript',
      });
      assert.equal(afterStt.status, 'stt_running');
      assert.equal(afterStt.transcript, 'synthetic demo transcript');

      await repo.updateStatus(created.id, 'llm_running', {
        noteJson: { summary: 'demo' },
      });
      await repo.updateStatus(created.id, 'pdf_running');
      const ready = await repo.updateStatus(created.id, 'ready', {
        pdfPath: '/tmp/demo.pdf',
      });
      assert.equal(ready.status, 'ready');
      assert.equal(ready.pdfPath, '/tmp/demo.pdf');
      assert.deepEqual(ready.noteJson, { summary: 'demo' });

      await assert.rejects(
        () => repo.updateStatus(created.id, 'failed'),
        /invalid_status_transition/,
      );
    } finally {
      await pool.end();
    }
  });
});
