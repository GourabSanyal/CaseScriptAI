import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, it } from 'node:test';
import { extractClientIp, hashClientIp } from '../http/client-ip.js';

describe('client-ip', () => {
  it('uses first X-Forwarded-For hop', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      socket: { remoteAddress: '9.9.9.9' },
    } as unknown as IncomingMessage;
    assert.equal(extractClientIp(req), '1.2.3.4');
  });

  it('falls back to socket remoteAddress', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as IncomingMessage;
    assert.equal(extractClientIp(req), '127.0.0.1');
  });

  it('hashes with salt and never returns raw ip', () => {
    const hash = hashClientIp('1.2.3.4', 'salt');
    assert.equal(hash.includes('1.2.3.4'), false);
    assert.equal(hash.length, 64);
    assert.equal(hashClientIp('1.2.3.4', 'salt'), hash);
    assert.notEqual(hashClientIp('1.2.3.4', 'other'), hash);
  });
});
