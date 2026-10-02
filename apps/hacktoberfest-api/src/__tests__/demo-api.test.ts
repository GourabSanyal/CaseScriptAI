import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createServer } from '../create-server.js';
import type { DemoSession } from '../db/session-repository.js';

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

describe('demo API routes', () => {
  const sessionId = '66666666-6666-6666-6666-666666666666';

  it('POST /sessions/demo returns 202 and starts the demo once', async () => {
    let starts = 0;
    const server = createServer({
      startDemoSession: async () => {
        starts += 1;
        return { id: sessionId, status: 'queued' };
      },
    });

    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/demo`, { method: 'POST' });
      const body = await res.json();
      assert.equal(res.status, 202);
      assert.deepEqual(body, { id: sessionId, status: 'queued' });
      assert.equal(starts, 1);
    });
  });

  it('GET /sessions/:id returns public status only', async () => {
    const session: DemoSession = {
      id: sessionId,
      status: 'stt_running',
      transcript: 'should-not-leak',
      noteJson: { subjective: 'nope' },
      pdfPath: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const server = createServer({
      publicBaseUrl: 'http://example.test',
      getSessionById: async () => session,
    });

    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/${sessionId}`);
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.deepEqual(body, {
        id: sessionId,
        status: 'stt_running',
        error: null,
        pdfUrl: null,
      });
      assert.equal(JSON.stringify(body).includes('should-not-leak'), false);
    });
  });

  it('GET / serves the demo HTML', async () => {
    const server = createServer();
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/`);
      const html = await res.text();
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /text\/html/);
      assert.match(html, /Use sample session/);
    });
  });
});
