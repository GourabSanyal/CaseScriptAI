import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createServer } from '../create-server.js';
import { SECURITY_HEADERS } from '../http/security-headers.js';

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

describe('security headers', () => {
  it('includes security headers on /health and /', async () => {
    const server = createServer();
    await withServer(server, async (base) => {
      for (const path of ['/health', '/']) {
        const res = await fetch(`${base}${path}`);
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
          assert.equal(res.headers.get(key.toLowerCase()), value, path);
        }
      }
    });
  });
});
