import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMemoryRepo,
  withSessionDefaults,
} from './helpers/memory-session-repo.js';
import { runDemoPipeline } from '../pipeline/run-demo-pipeline.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { SttProvider } from '../providers/stt-provider.js';

const queued = (id: string) =>
  withSessionDefaults({ id, status: 'queued' });

const validNoteJson = JSON.stringify({
  subjective: 'Reports lighter sleep and work stress.',
  objective: 'Engaged; affect congruent.',
  assessment: 'Situational stress with sleep disruption.',
  plan: 'Breathing three evenings; phone-free hour.',
});

describe('runDemoPipeline', () => {
  it('runs stt → llm → pdf with mocks to ready', async () => {
    const id = '77777777-7777-7777-7777-777777777777';
    const repo = createMemoryRepo(queued(id));
    const stt: SttProvider = {
      transcribeFile: async () => 'Client discussed sleep and stress.',
    };
    const llm: LlmProvider = {
      complete: async () => validNoteJson,
    };

    const result = await runDemoPipeline({
      repo,
      stt,
      llm,
      sessionId: id,
      audioPath: '/tmp/fixture.wav',
    });
    assert.equal(result.status, 'ready');
    assert.ok(result.pdfBytes);
    assert.equal(result.pdfBytes!.subarray(0, 5).toString('utf8'), '%PDF-');
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
    const id = '77777777-7777-7777-7777-777777777779';
    const repo = createMemoryRepo(queued(id));
    const stt: SttProvider = {
      transcribeFile: async () => 'Client discussed sleep and stress.',
    };
    const llm: LlmProvider = {
      complete: async () => 'not-valid-json',
    };

    const result = await runDemoPipeline({
      repo,
      stt,
      llm,
      sessionId: id,
      audioPath: '/tmp/fixture.wav',
    });
    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'llm_invalid_json');
    assert.equal(result.pdfBytes, null);
  });
});
