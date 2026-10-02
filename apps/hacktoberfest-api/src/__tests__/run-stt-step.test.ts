import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import {
  assertTransition,
  type SessionStatus,
} from '../domain/session-status.js';
import { runSttStep } from '../pipeline/run-stt-step.js';
import type { SttProvider } from '../providers/stt-provider.js';

const createMemoryRepo = (initial: DemoSession): SessionRepository => {
  let session = { ...initial };
  return {
    createSession: async () => session,
    getById: async (id) => (id === session.id ? { ...session } : null),
    updateStatus: async (id, next, patch = {}) => {
      if (id !== session.id) throw new Error(`session_not_found:${id}`);
      assertTransition(session.status, next);
      session = {
        ...session,
        status: next,
        transcript:
          patch.transcript === undefined ? session.transcript : patch.transcript,
        noteJson: patch.noteJson === undefined ? session.noteJson : patch.noteJson,
        pdfPath: patch.pdfPath === undefined ? session.pdfPath : patch.pdfPath,
        error: patch.error === undefined ? session.error : patch.error,
        updatedAt: new Date(),
      };
      return { ...session };
    },
  };
};

const queuedSession = (): DemoSession => ({
  id: '11111111-1111-1111-1111-111111111111',
  status: 'queued' as SessionStatus,
  transcript: null,
  noteJson: null,
  pdfPath: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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
});
