import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createServer } from '../create-server.js';
import type { DemoSession } from '../db/session-repository.js';

async function request(
  server: http.Server,
  path: string,
): Promise<{ status: number; headers: Headers; body: ArrayBuffer }> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  const body = await response.arrayBuffer();

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  return { status: response.status, headers: response.headers, body };
}

describe('GET /sessions/:id/pdf', () => {
  const sessionId = '44444444-4444-4444-4444-444444444444';
  const readySession: DemoSession = {
    id: sessionId,
    status: 'ready',
    transcript: null,
    noteJson: { subjective: 'a', objective: 'b', assessment: 'c', plan: 'd' },
    pdfPath: '/tmp/demo.pdf',
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('returns PDF bytes for a ready session (demo: no auth)', async () => {
    const pdfBytes = Buffer.from('%PDF-1.4 demo');
    const server = createServer({
      getSessionById: async (id) => (id === sessionId ? readySession : null),
      readPdfBytes: async () => pdfBytes,
    });

    const { status, headers, body } = await request(
      server,
      `/sessions/${sessionId}/pdf`,
    );

    assert.equal(status, 200);
    assert.equal(headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(body).toString('utf8'), '%PDF-1.4 demo');
  });

  it('returns 404 when session is not ready', async () => {
    const server = createServer({
      getSessionById: async () => ({ ...readySession, status: 'pdf_running' }),
      readPdfBytes: async () => null,
    });

    const { status, body } = await request(server, `/sessions/${sessionId}/pdf`);
    assert.equal(status, 404);
    assert.deepEqual(JSON.parse(Buffer.from(body).toString('utf8')), {
      ok: false,
      error: 'pdf_not_ready',
    });
  });
});
