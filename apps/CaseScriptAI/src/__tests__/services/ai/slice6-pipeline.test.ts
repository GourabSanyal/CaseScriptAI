import { LlmService } from '@/services/ai/llm-service';
import { MemoryManager } from '@/services/ai/memory-manager';
import { createPipelineBackgroundController } from '@/services/ai/pipeline-background';
import { PipelineOrchestrator } from '@/services/ai/pipeline-orchestrator';
import { TranscriptQueue } from '@/services/ai/transcript-queue';
import { WhisperService } from '@/services/ai/whisper-service';
import { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';
import { createProcessingQueueStore } from '@/stores/processing-queue-store';

import type { ProcessingQueueItem } from '@/types/processing-queue';

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

const mapPersistence = <T>() => {
  const data = new Map<string, T[]>();
  return {
    load: async (sessionId: string) => data.get(sessionId) ?? null,
    save: async (sessionId: string, rows: readonly T[]) => {
      data.set(sessionId, [...rows]);
    },
    remove: async (sessionId: string) => {
      data.delete(sessionId);
    },
  };
};

describe('Slice 6 pipeline integration', () => {
  it('runs whisper then llm then SOAP and never co-resides locks', async () => {
    const memory = new MemoryManager();
    const locks: Array<string | null> = [];
    const audioPersist = mapPersistence();
    const transcriptPersist = mapPersistence();
    const audioQueue = new AudioChunkQueue('s1', audioPersist);
    await audioQueue.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://a.wav',
    });

    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
    });
    await queueStore.getState().enqueue('s1');

    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper: new WhisperService({
        memory,
        runtime: {
          load: async () => {
            locks.push(memory.modelLoadLock);
            return { success: true, data: undefined };
          },
          transcribe: async () => ({ success: true, data: 'hello transcript content' }),
          unload: async () => ({ success: true, data: undefined }),
        },
        deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
      }),
      llm: new LlmService({
        memory,
        runtime: {
          isReady: async () => {
            locks.push(memory.modelLoadLock);
            return { success: true, data: undefined };
          },
          generate: async () => ({ success: true, data: soapBody }),
          interrupt: async () => ({ success: true, data: undefined }),
          unload: async () => ({ success: true, data: undefined }),
        },
      }),
      soap: { save: async () => ({ success: true, data: undefined }) },
      sessions: {
        createAudioQueue: () => audioQueue,
        createTranscriptQueue: (id) => new TranscriptQueue(id, transcriptPersist),
      },
    });

    const result = await orchestrator.runUntilIdle();
    expect(result).toEqual({ success: true, data: 1 });
    expect(queueStore.getState().items).toEqual([]);
    expect(locks).toEqual(['whisper', 'llm']);
    expect(memory.modelLoadLock).toBeNull();
  });

  it('resumes after crash: skips transcribed chunk, finishes SOAP', async () => {
    const memory = new MemoryManager();
    const audioPersist = mapPersistence();
    const transcriptPersist = mapPersistence();

    const seedAudio = new AudioChunkQueue('s1', audioPersist);
    await seedAudio.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://a.wav',
    });
    await seedAudio.enqueue({
      id: 'c1',
      sessionId: 's1',
      sequence: 1,
      path: 'file://b.wav',
    });
    const seedTranscript = new TranscriptQueue('s1', transcriptPersist);
    await seedTranscript.append({ chunkId: 'c0', sequence: 0, text: 'first chunk already done' });

    const transcribed: string[] = [];
    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence([
        { sessionId: 's1', status: 'processing', enqueuedAt: 1, retryCount: 0 },
      ]),
      now: () => 1,
    });
    expect(queueStore.getState().items[0].status).toBe('queued');

    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper: new WhisperService({
        memory,
        runtime: {
          load: async () => ({ success: true, data: undefined }),
          transcribe: async (path) => {
            transcribed.push(path);
            return { success: true, data: 'second chunk text' };
          },
          unload: async () => ({ success: true, data: undefined }),
        },
        deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
      }),
      llm: new LlmService({
        memory,
        runtime: {
          isReady: async () => ({ success: true, data: undefined }),
          generate: async (prompt) => {
            expect(prompt).toContain('first chunk already done');
            expect(prompt).toContain('second chunk text');
            return { success: true, data: soapBody };
          },
          interrupt: async () => ({ success: true, data: undefined }),
          unload: async () => ({ success: true, data: undefined }),
        },
      }),
      soap: { save: async () => ({ success: true, data: undefined }) },
      sessions: {
        createAudioQueue: (id) => new AudioChunkQueue(id, audioPersist),
        createTranscriptQueue: (id) => new TranscriptQueue(id, transcriptPersist),
      },
    });

    const result = await orchestrator.runUntilIdle();
    expect(result).toEqual({ success: true, data: 1 });
    expect(transcribed).toEqual(['file://b.wav']);
    expect(queueStore.getState().items).toEqual([]);
  });

  it('foreground AppState re-drains a queued session', async () => {
    const memory = new MemoryManager();
    const audioQueue = new AudioChunkQueue('s1', mapPersistence());
    await audioQueue.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://a.wav',
    });
    const queueStore = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
    });
    await queueStore.getState().enqueue('s1');

    const orchestrator = new PipelineOrchestrator({
      queue: queueStore.getState(),
      whisper: new WhisperService({
        memory,
        runtime: {
          load: async () => ({ success: true, data: undefined }),
          transcribe: async () => ({ success: true, data: 'hello transcript content' }),
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
        createAudioQueue: () => audioQueue,
        createTranscriptQueue: (id) => new TranscriptQueue(id, mapPersistence()),
      },
    });

    let listener: ((status: string) => void) | null = null;
    let draining: Promise<unknown> = Promise.resolve();
    const controller = createPipelineBackgroundController({
      onForeground: () => {
        draining = orchestrator.runUntilIdle();
      },
      subscribe: (fn) => {
        listener = fn;
        return () => {
          listener = null;
        };
      },
    });

    listener?.('background');
    expect(queueStore.getState().items).toHaveLength(1);
    listener?.('active');
    await draining;
    expect(queueStore.getState().items).toEqual([]);
    controller.stop();
  });
});
