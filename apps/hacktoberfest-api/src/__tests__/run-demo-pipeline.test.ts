import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import { assertTransition, type SessionStatus } from '../domain/session-status.js';
import { runDemoPipeline } from '../pipeline/run-demo-pipeline.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { SttProvider } from '../providers/stt-provider.js';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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

const queued = (id: string): DemoSession => ({
  id,
  status: 'queued' as SessionStatus,
  transcript: null,
  noteJson: null,
  pdfPath: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const validNoteJson = JSON.stringify({
  subjective: 'Reports lighter sleep and work stress.',
  objective: 'Engaged; affect congruent.',
  assessment: 'Situational stress with sleep disruption.',
  plan: 'Breathing three evenings; phone-free hour.',
});

describe('runDemoPipeline', () => {
  it('runs stt → llm → pdf with mocks to ready', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'demo-'));
    const id = '77777777-7777-7777-7777-777777777777';
    const repo = createMemoryRepo(queued(id));
    const stt: SttProvider = {
      transcribeFile: async () => 'Client discussed sleep and stress.',
    };
    const llm: LlmProvider = {
      complete: async () => validNoteJson,
    };

    try {
      const result = await runDemoPipeline({
        repo,
        stt,
        llm,
        sessionId: id,
        audioPath: '/tmp/fixture.wav',
        pdfDir: dir,
      });
      assert.equal(result.status, 'ready');
      assert.ok(result.pdfPath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('stops after STT failure and does not call LLM', async () => {
    const id = '77777777-7777-7777-7777-777777777778';
    const repo = createMemoryRepo(queued(id));
    let llmCalls = 0;
    const stt: SttProvider = {
      transcribeFile: async () => {
        throw new Error('stt_http_503');
      },
    };
    const llm: LlmProvider = {
      complete: async () => {
        llmCalls += 1;
        return validNoteJson;
      },
    };

    const result = await runDemoPipeline({
      repo,
      stt,
      llm,
      sessionId: id,
      audioPath: '/tmp/fixture.wav',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'stt_http_503');
    assert.equal(llmCalls, 0);
  });

  it('stops after LLM failure and does not write a PDF', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'demo-'));
    const id = '77777777-7777-7777-7777-777777777779';
    const repo = createMemoryRepo(queued(id));
    const stt: SttProvider = {
      transcribeFile: async () => 'Client discussed sleep and stress.',
    };
    const llm: LlmProvider = {
      complete: async () => 'not-valid-json',
    };

    try {
      const result = await runDemoPipeline({
        repo,
        stt,
        llm,
        sessionId: id,
        audioPath: '/tmp/fixture.wav',
        pdfDir: dir,
      });
      assert.equal(result.status, 'failed');
      assert.equal(result.error, 'llm_invalid_json');
      assert.equal(result.pdfPath, null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
