import { LlmService } from '@/services/ai/llm-service';
import { MemoryManager } from '@/services/ai/memory-manager';
import { PipelineOrchestrator } from '@/services/ai/pipeline-orchestrator';
import { TranscriptQueue } from '@/services/ai/transcript-queue';
import { WhisperService } from '@/services/ai/whisper-service';
import { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';
import { createProcessingQueueStore } from '@/stores/processing-queue-store';
import { AppErrorCode } from '@/types/result';

import type { ProcessingQueueItem } from '@/types/processing-queue';
import type { PipelineProgressEvent } from '@/types/pipeline';

const soapBody = `
Subjective: patient reports headache for two days without fever or photophobia noted.
Objective: BP 120/80, alert, no focal neuro deficits on exam today.
Assessment: Tension-type headache, likely stress related, low concern for migraine.
Plan: hydration, OTC analgesic, follow up if worsens or new neurological signs.
`.trim();

const memoryPersistence = (initial: ProcessingQueueItem[] = []) => {
  let saved = [...initial];
  return {
    load: () => [...saved],
    save: (items: readonly ProcessingQueueItem[]) => {
      saved = items.map((item) => ({ ...item }));
    },
  };
};

const audioPersistence = () => {
  const data = new Map();
  return {
    load: async (sessionId: string) => data.get(sessionId) ?? null,
    save: async (sessionId: string, chunks: readonly unknown[]) => {
      data.set(sessionId, chunks);
    },
    remove: async (sessionId: string) => {
      data.delete(sessionId);
    },
  };
};

const transcriptPersistence = () => {
  const data = new Map();
  return {
    load: async (sessionId: string) => data.get(sessionId) ?? null,
    save: async (sessionId: string, segments: readonly unknown[]) => {
      data.set(sessionId, segments);
    },
    remove: async (sessionId: string) => {
      data.delete(sessionId);
    },
  };
};

describe('PipelineOrchestrator', () => {
  it('claims one session, runs whisper then llm, completes queue', async () => {
    const events: PipelineProgressEvent[] = [];
    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
    });
    await queueStore.getState().enqueue('s1');

    const memory = new MemoryManager();
    const audioQueue = new AudioChunkQueue('s1', audioPersistence());
    await audioQueue.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://a.wav',
    });

    const whisper = new WhisperService({
      memory,
      runtime: {
        load: async () => ({ success: true, data: undefined }),
        transcribe: async () => ({ success: true, data: 'hello transcript content' }),
        unload: async () => ({ success: true, data: undefined }),
      },
      deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
    });
    const llm = new LlmService({
      memory,
      runtime: {
        isReady: async () => ({ success: true, data: undefined }),
        generate: async () => ({ success: true, data: soapBody }),
        interrupt: async () => ({ success: true, data: undefined }),
        unload: async () => ({ success: true, data: undefined }),
      },
    });

    const saved: string[] = [];
    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper,
      llm,
      soap: {
        save: async (sessionId, note) => {
          saved.push(`${sessionId}:${note.slice(0, 12)}`);
          return { success: true, data: undefined };
        },
      },
      sessions: {
        createAudioQueue: () => audioQueue,
        createTranscriptQueue: (sessionId) =>
          new TranscriptQueue(sessionId, transcriptPersistence()),
      },
      onProgress: (event) => events.push(event),
      now: (() => {
        let t = 0;
        return () => {
          t += 60_000;
          return t;
        };
      })(),
    });

    const result = await orchestrator.runUntilIdle();
    expect(result).toEqual({ success: true, data: 1 });
    expect(queueStore.getState().items).toEqual([]);
    expect(saved[0]).toMatch(/^s1:/);
    expect(events.map((e) => e.phase)).toEqual(
      expect.arrayContaining(['whisper', 'llm', 'complete']),
    );
  });

  it('on whisper failure calls queue.fail (retry-once path)', async () => {
    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
    });
    await queueStore.getState().enqueue('s1');
    const memory = new MemoryManager();

    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper: new WhisperService({
        memory,
        runtime: {
          load: async () => ({ success: false, error: 'load failed' }),
          transcribe: async () => ({ success: true, data: 'x' }),
          unload: async () => ({ success: true, data: undefined }),
        },
        deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
      }),
      llm: new LlmService({
        memory,
        runtime: {
          isReady: async () => ({ success: true, data: undefined }),
          generate: async () => ({ success: true, data: soapBody }),
          interrupt: async () => ({ success: true, data: undefined }),
          unload: async () => ({ success: true, data: undefined }),
        },
      }),
      soap: { save: async () => ({ success: true, data: undefined }) },
      sessions: {
        createAudioQueue: (sessionId) => new AudioChunkQueue(sessionId, audioPersistence()),
        createTranscriptQueue: (sessionId) =>
          new TranscriptQueue(sessionId, transcriptPersistence()),
      },
    });

    const step = await orchestrator.tick();
    expect(step.success).toBe(false);
    expect(queueStore.getState().items[0]).toMatchObject({
      sessionId: 's1',
      status: 'queued',
      retryCount: 1,
    });
  });

  it('stop prevents further ticks until resume', async () => {
    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
    });
    await queueStore.getState().enqueue('s1');
    const memory = new MemoryManager();
    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper: new WhisperService({
        memory,
        runtime: {
          load: async () => ({ success: true, data: undefined }),
          transcribe: async () => ({ success: true, data: 'x' }),
          unload: async () => ({ success: true, data: undefined }),
        },
        deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
      }),
      llm: new LlmService({
        memory,
        runtime: {
          isReady: async () => ({ success: true, data: undefined }),
          generate: async () => ({ success: true, data: soapBody }),
          interrupt: async () => ({ success: true, data: undefined }),
          unload: async () => ({ success: true, data: undefined }),
        },
      }),
      soap: { save: async () => ({ success: true, data: undefined }) },
      sessions: {
        createAudioQueue: (id) => new AudioChunkQueue(id, audioPersistence()),
        createTranscriptQueue: (id) => new TranscriptQueue(id, transcriptPersistence()),
      },
    });

    orchestrator.stop();
    expect(await orchestrator.tick()).toEqual({ success: true, data: null });
    expect(queueStore.getState().items[0].status).toBe('queued');
    orchestrator.resume();
  });

  it('LLM OOM fails queue with retry-once (auto-heal handoff)', async () => {
    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
    });
    await queueStore.getState().enqueue('s1');
    const memory = new MemoryManager();
    const audioQueue = new AudioChunkQueue('s1', audioPersistence());
    await audioQueue.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://a.wav',
    });

    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper: new WhisperService({
        memory,
        runtime: {
          load: async () => ({ success: true, data: undefined }),
          transcribe: async () => ({ success: true, data: 'transcript words for soap' }),
          unload: async () => ({ success: true, data: undefined }),
        },
        deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
      }),
      llm: new LlmService({
        memory,
        runtime: {
          isReady: async () => ({ success: true, data: undefined }),
          generate: async () => ({ success: false, error: 'native OOM while generating' }),
          interrupt: async () => ({ success: true, data: undefined }),
          unload: async () => ({ success: true, data: undefined }),
        },
      }),
      soap: { save: async () => ({ success: true, data: undefined }) },
      sessions: {
        createAudioQueue: () => audioQueue,
        createTranscriptQueue: (id) => new TranscriptQueue(id, transcriptPersistence()),
      },
    });

    const step = await orchestrator.tick();
    expect(step.success).toBe(false);
    if (!step.success) {
      expect(step.errorCode).toBe(AppErrorCode.MODEL_OOM);
    }
    expect(queueStore.getState().items[0]).toMatchObject({
      status: 'queued',
      retryCount: 1,
      failureReason: 'native OOM while generating',
    });
  });
});
