import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMemoryRepo,
  withSessionDefaults,
} from './helpers/memory-session-repo.js';
import { runSttStep } from '../pipeline/run-stt-step.js';
import type { SttProvider } from '../providers/stt-provider.js';

const queuedSession = () =>
  withSessionDefaults({
    id: '11111111-1111-1111-1111-111111111111',
    status: 'queued',
  });

describe('runSttStep', () => {
  it('marks stt_running then stores transcript and advances to llm_running', async () => {
    const repo = createMemoryRepo(queuedSession());
    const stt: SttProvider = {
      transcribeFile: async () => 'synthetic demo transcript',
    };

    const result = await runSttStep({
      repo,
      stt,
      sessionId: '11111111-1111-1111-1111-111111111111',
      audioPath: '/tmp/fixture.wav',
    });

    assert.equal(result.status, 'llm_running');
    assert.equal(result.transcript, 'synthetic demo transcript');
    assert.equal(result.error, null);
  });

  it('marks failed with sanitized error when STT throws', async () => {
    const repo = createMemoryRepo(queuedSession());
    const stt: SttProvider = {
      transcribeFile: async () => {
        throw new Error('/secret/path/audio.wav exploded');
      },
    };

    const result = await runSttStep({
      repo,
      stt,
      sessionId: '11111111-1111-1111-1111-111111111111',
      audioPath: '/secret/path/audio.wav',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'stt_failed');
    assert.equal(result.transcript, null);
  });

  it('marks failed with stt_empty_transcript when provider returns whitespace', async () => {
    const repo = createMemoryRepo(queuedSession());
    const stt: SttProvider = {
      transcribeFile: async () => '   ',
    };

    const result = await runSttStep({
      repo,
      stt,
      sessionId: '11111111-1111-1111-1111-111111111111',
      audioPath: '/tmp/fixture.wav',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'stt_empty_transcript');
    assert.equal(result.transcript, null);
  });

  it('preserves stt_* error codes from the provider', async () => {
    const repo = createMemoryRepo(queuedSession());
    const stt: SttProvider = {
      transcribeFile: async () => {
        throw new Error('stt_http_429');
      },
    };

    const result = await runSttStep({
      repo,
      stt,
      sessionId: '11111111-1111-1111-1111-111111111111',
      audioPath: '/tmp/fixture.wav',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'stt_http_429');
  });
});
