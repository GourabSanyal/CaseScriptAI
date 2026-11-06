import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createServer } from '../create-server.js';
import type { DemoSession } from '../db/session-repository.js';
import { toPublicNote } from '../http/note-route.js';

const sessionId = '77777777-7777-7777-7777-777777777777';

const note = {
  subjective: 'Client reports better sleep this week.',
  objective: 'Affect brighter than last session.',
  assessment: 'Anxiety symptoms easing with routine.',
  plan: 'Continue weekly check-ins and sleep log.',
};

const session = (over: Partial<DemoSession> = {}): DemoSession => ({
  id: sessionId,
  status: 'ready',
  transcript: 'SECRET_TRANSCRIPT',
  noteJson: note,
  pdfPath: null,
  pdfBytes: null,
  clientIpHash: null,
  attempt: 1,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

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

describe('toPublicNote', () => {
  it('returns SOAP sections and drops extra fields', () => {
    const view = toPublicNote({ ...note, transcript: 'nope' });
    assert.deepEqual(view, note);
  });

  it('returns null when the stored note is missing or invalid', () => {
    assert.equal(toPublicNote(null), null);
    assert.equal(toPublicNote({ subjective: 'x' }), null);
  });
});

describe('GET /sessions/:id/note', () => {
  it('returns the synthetic note without the transcript', async () => {
    const server = createServer({
      getSessionById: async () => session(),
    });
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/${sessionId}/note`);
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.deepEqual(body, note);
      assert.equal(JSON.stringify(body).includes('SECRET_TRANSCRIPT'), false);
    });
  });

  it('returns 404 note_not_ready when the note is missing', async () => {
    const server = createServer({
      getSessionById: async () => session({ noteJson: null, status: 'llm_running' }),
    });
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/${sessionId}/note`);
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { ok: false, error: 'note_not_ready' });
    });
  });

  it('returns 404 when the session is missing', async () => {
    const server = createServer({
      getSessionById: async () => null,
    });
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/${sessionId}/note`);
      assert.equal(res.status, 404);
      assert.deepEqual(await res.json(), { ok: false, error: 'session_not_found' });
    });
  });

  it('returns 503 when session lookup is unavailable', async () => {
    const server = createServer();
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/sessions/${sessionId}/note`);
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), {
        ok: false,
        error: 'sessions_unavailable',
      });
    });
  });
});
