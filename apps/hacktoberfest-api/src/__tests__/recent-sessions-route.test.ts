import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createServer } from '../create-server.js';
import type { DemoSession } from '../db/session-repository.js';
import { withSessionDefaults } from './helpers/memory-session-repo.js';

async function withServer(
  server: http.Server,
  run: (base: string) => Promise<void>,
): Promise<void> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('GET /sessions/recent', () => {
  const newer = withSessionDefaults({
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    status: 'ready',
    createdAt: new Date('2026-11-19T12:00:00Z'),
  });
  const older = withSessionDefaults({
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    status: 'failed',
    error: 'stt_failed',
    transcript: 'SECRET',
    noteJson: { subjective: 'SECRET' },
    createdAt: new Date('2026-11-19T11:00:00Z'),
  });

  it('returns the newest public sessions without PHI fields', async () => {
    const server = createServer({
      publicBaseUrl: 'http://demo.test',
      listRecentSessions: async (limit) => {
        assert.equal(limit, 5);
        return [newer, older] as DemoSession[];
      },
    });

    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/recent`);
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.deepEqual(body, {
        sessions: [
          {
            id: newer.id,
            status: 'ready',
            error: null,
            pdfUrl: `http://demo.test/sessions/${newer.id}/pdf`,
          },
          {
            id: older.id,
            status: 'failed',
            error: 'stt_failed',
            pdfUrl: null,
          },
        ],
      });
      assert.equal(JSON.stringify(body).includes('SECRET'), false);
    });
  });

  it('returns 503 when listRecentSessions is unavailable', async () => {
    const server = createServer();
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/recent`);
      const body = await res.json();
      assert.equal(res.status, 503);
      assert.deepEqual(body, { ok: false, error: 'sessions_unavailable' });
    });
  });
});
