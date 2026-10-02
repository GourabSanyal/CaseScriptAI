import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertTransition,
  canTransition,
  type SessionStatus,
} from '../domain/session-status.js';

describe('session status machine', () => {
  const happyPath: SessionStatus[] = [
    'queued',
    'stt_running',
    'llm_running',
    'pdf_running',
    'ready',
  ];

  it('allows the happy-path forward transitions', () => {
    for (let i = 0; i < happyPath.length - 1; i += 1) {
      assert.equal(canTransition(happyPath[i], happyPath[i + 1]), true);
    }
  });

  it('allows failed from any non-terminal status', () => {
    for (const from of ['queued', 'stt_running', 'llm_running', 'pdf_running'] as const) {
      assert.equal(canTransition(from, 'failed'), true);
    }
  });

  it('rejects skips, reverse, and moves from terminal states', () => {
    assert.equal(canTransition('queued', 'llm_running'), false);
    assert.equal(canTransition('stt_running', 'queued'), false);
    assert.equal(canTransition('ready', 'failed'), false);
    assert.equal(canTransition('failed', 'queued'), false);
    assert.throws(() => assertTransition('ready', 'pdf_running'), /invalid_status_transition/);
  });
});
