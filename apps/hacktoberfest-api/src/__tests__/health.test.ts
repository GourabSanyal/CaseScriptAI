import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { describe, it } from 'node:test';
import { FIXTURE_AUDIO_PATH } from '../config.js';
import { createServer } from '../create-server.js';

async function request(
  server: http.Server,
  method: string,
  path: string,
): Promise<{ status: number; body: unknown }> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
  });
  const body = await response.json();

  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  return { status: response.status, body };
}

describe('GET /health', () => {
  it('returns 200 and { ok: true }', async () => {
    const server = createServer();
    const { status, body } = await request(server, 'GET', '/health');
    assert.equal(status, 200);
    assert.deepEqual(body, { ok: true });
  });

  it('returns 404 for unknown paths', async () => {
    const server = createServer();
    const { status, body } = await request(server, 'GET', '/nope');
    assert.equal(status, 404);
    assert.deepEqual(body, { ok: false, error: 'not_found' });
  });
});

describe('fixture audio', () => {
  it('sample-session.wav exists on disk', () => {
    assert.equal(existsSync(FIXTURE_AUDIO_PATH), true);
  });
});
