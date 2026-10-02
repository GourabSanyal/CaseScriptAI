import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import { assertTransition, type SessionStatus } from '../domain/session-status.js';
import { runLlmStep } from '../pipeline/run-llm-step.js';
import type { LlmProvider } from '../providers/llm-provider.js';

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

const llmSession = (): DemoSession => ({
  id: '22222222-2222-2222-2222-222222222222',
  status: 'llm_running' as SessionStatus,
  transcript: 'Client discussed sleep and work stress.',
  noteJson: null,
  pdfPath: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const validNote = JSON.stringify({
  subjective: 'Sleep lighter; work stress.',
  objective: 'Engaged, affect congruent.',
  assessment: 'Situational stress with sleep disruption.',
  plan: 'Breathing practice three evenings per week.',
});

describe('runLlmStep', () => {
  it('persists validated note_json and advances to pdf_running', async () => {
    const repo = createMemoryRepo(llmSession());
    const llm: LlmProvider = { complete: async () => validNote };

    const result = await runLlmStep({
      repo,
      llm,
      sessionId: '22222222-2222-2222-2222-222222222222',
    });

    assert.equal(result.status, 'pdf_running');
    assert.deepEqual(result.noteJson, JSON.parse(validNote));
  });

  it('retries once when first response is invalid JSON', async () => {
    const repo = createMemoryRepo(llmSession());
    let calls = 0;
    const llm: LlmProvider = {
      complete: async () => {
        calls += 1;
        return calls === 1 ? 'not json' : validNote;
      },
    };

    const result = await runLlmStep({
      repo,
      llm,
      sessionId: '22222222-2222-2222-2222-222222222222',
    });

    assert.equal(calls, 2);
    assert.equal(result.status, 'pdf_running');
  });

  it('marks failed when retry still invalid', async () => {
    const repo = createMemoryRepo(llmSession());
    const llm: LlmProvider = { complete: async () => 'still broken' };

    const result = await runLlmStep({
      repo,
      llm,
      sessionId: '22222222-2222-2222-2222-222222222222',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'llm_invalid_json');
  });
});
