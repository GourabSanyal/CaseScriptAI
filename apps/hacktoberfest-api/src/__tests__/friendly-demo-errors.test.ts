import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { friendlyDemoError } from '../demo-ui/friendly-demo-errors.js';

describe('friendlyDemoError', () => {
  it('maps boot, network, and backend codes without PHI', () => {
    assert.match(friendlyDemoError('wake_timeout'), /connection/i);
    assert.match(friendlyDemoError('network'), /connection/i);
    assert.match(friendlyDemoError('poll_timeout'), /Timed out waiting/i);
    assert.match(friendlyDemoError('busy'), /busy/i);
    assert.match(friendlyDemoError('rate_limited'), /Too many demos/i);
    assert.match(friendlyDemoError('demo_unavailable'), /Demo isn't ready/i);
    assert.match(friendlyDemoError('interrupted_restart'), /restarted/i);
    assert.match(friendlyDemoError('llm_timeout'), /Retry/i);
    assert.match(friendlyDemoError('stt_timeout'), /Transcription/i);
    assert.match(friendlyDemoError('demo_key_required'), /locked/i);
  });

  it('never echoes transcript-like payload in the message', () => {
    const msg = friendlyDemoError('llm_failed');
    assert.equal(msg.includes('patient'), false);
    assert.equal(msg.includes('transcript'), false);
    assert.match(msg, /Failed \(llm_failed\)/);
  });
});
