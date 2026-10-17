import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { attachSigtermHandler, shutdownServer } from '../shutdown.js';

describe('shutdown', () => {
  it('closes the HTTP server', async () => {
    const server = http.createServer((_req, res) => {
      res.end('ok');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    await shutdownServer({ server });
    assert.equal(server.listening, false);
  });

  it('attachSigtermHandler invokes shutdown on signal', async () => {
    const server = http.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    let handler: (() => void) | undefined;
    const run = attachSigtermHandler(
      { server },
      (h) => {
        handler = h;
      },
    );
    assert.ok(handler);
    handler();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(server.listening, false);
    await run();
  });
});
