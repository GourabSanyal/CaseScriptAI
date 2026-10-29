import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, it } from 'node:test';
import {
  checkDemoAccessKey,
  extractDemoAccessKey,
} from '../http/demo-access-key.js';

describe('checkDemoAccessKey', () => {
  it('allows all requests when expected key is unset', () => {
    assert.equal(checkDemoAccessKey(undefined, undefined), 'ok');
    assert.equal(checkDemoAccessKey(undefined, ''), 'ok');
    assert.equal(checkDemoAccessKey(undefined, '   '), 'ok');
    assert.equal(checkDemoAccessKey('anything', undefined), 'ok');
  });

  it('requires a matching key when expected is set', () => {
    assert.equal(checkDemoAccessKey(undefined, 'secret'), 'demo_key_required');
    assert.equal(checkDemoAccessKey('', 'secret'), 'demo_key_required');
    assert.equal(checkDemoAccessKey('wrong', 'secret'), 'demo_key_required');
    assert.equal(checkDemoAccessKey('secre', 'secret'), 'demo_key_required');
    assert.equal(checkDemoAccessKey('secret!', 'secret'), 'demo_key_required');
    assert.equal(checkDemoAccessKey('secret', 'secret'), 'ok');
    assert.equal(checkDemoAccessKey('  secret  ', 'secret'), 'ok');
  });
});

describe('extractDemoAccessKey', () => {
  it('prefers x-demo-key header over query', () => {
    const req = {
      headers: { 'x-demo-key': 'from-header' },
    } as unknown as IncomingMessage;
    const params = new URLSearchParams('demoKey=from-query');
    assert.equal(extractDemoAccessKey(req, params), 'from-header');
  });

  it('falls back to demoKey then key query params', () => {
    const req = { headers: {} } as unknown as IncomingMessage;
    assert.equal(
      extractDemoAccessKey(req, new URLSearchParams('demoKey=a')),
      'a',
    );
    assert.equal(extractDemoAccessKey(req, new URLSearchParams('key=b')), 'b');
    assert.equal(extractDemoAccessKey(req, new URLSearchParams()), undefined);
  });
});
