import { MemoryManager } from '@/services/ai/memory-manager';
import { TranscriptQueue } from '@/services/ai/transcript-queue';
import { WhisperService } from '@/services/ai/whisper-service';
import { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';

const audioPersistence = () => {
  const data = new Map<string, Parameters<AudioChunkQueue['enqueue']>[0][]>();
  return {
    load: async (sessionId: string) => data.get(sessionId) ?? null,
    save: async (sessionId: string, chunks: readonly Parameters<AudioChunkQueue['enqueue']>[0][]) => {
      data.set(sessionId, chunks.map((c) => ({ ...c })));
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

describe('WhisperService', () => {
  it('transcribes chunk paths, persists segments, deletes wav, releases lock', async () => {
    const memory = new MemoryManager();
    const deleted: string[] = [];
    const runtime = {
      load: jest.fn(async () => ({ success: true as const, data: undefined })),
      transcribe: jest.fn(async (path: string) => ({
        success: true as const,
        data: `text-for-${path}`,
      })),
      unload: jest.fn(async () => ({ success: true as const, data: undefined })),
    };
    const service = new WhisperService({
      memory,
      runtime,
      deleteChunk: {
        deletePath: async (path) => {
          deleted.push(path);
          return { success: true, data: undefined };
        },
      },
    });

    const audioQueue = new AudioChunkQueue('s1', audioPersistence());
    await audioQueue.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://chunk-0.wav',
    });
    await audioQueue.enqueue({
      id: 'c1',
      sessionId: 's1',
      sequence: 1,
      path: 'file://chunk-1.wav',
    });
    const transcriptQueue = new TranscriptQueue('s1', transcriptPersistence());

    const result = await service.processSession({ audioQueue, transcriptQueue });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('text-for-file://chunk-0.wav');
      expect(result.data).toContain('text-for-file://chunk-1.wav');
    }
    expect(deleted).toEqual(['file://chunk-0.wav', 'file://chunk-1.wav']);
    expect(audioQueue.nextBatch()).toEqual([]);
    expect(runtime.unload).toHaveBeenCalled();
    expect(memory.modelLoadLock).toBeNull();
  });

  it('skips already-transcribed chunks (disk-partial resume)', async () => {
    const memory = new MemoryManager();
    const runtime = {
      load: async () => ({ success: true as const, data: undefined }),
      transcribe: jest.fn(async () => ({ success: true as const, data: 'new' })),
      unload: async () => ({ success: true as const, data: undefined }),
    };
    const service = new WhisperService({
      memory,
      runtime,
      deleteChunk: {
        deletePath: async () => ({ success: true, data: undefined }),
      },
    });

    const audioQueue = new AudioChunkQueue('s1', audioPersistence());
    await audioQueue.enqueue({
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://a.wav',
    });
    const transcriptQueue = new TranscriptQueue('s1', transcriptPersistence());
    await transcriptQueue.append({ chunkId: 'c0', sequence: 0, text: 'existing' });

    const result = await service.processSession({ audioQueue, transcriptQueue });
    expect(result.success).toBe(true);
    expect(runtime.transcribe).not.toHaveBeenCalled();
    expect(transcriptQueue.toText()).toBe('existing');
  });

  it('refuses when whisper lock unavailable', async () => {
    const memory = new MemoryManager();
    memory.acquireLock('llm');
    const service = new WhisperService({
      memory,
      runtime: {
        load: async () => ({ success: true, data: undefined }),
        transcribe: async () => ({ success: true, data: 'x' }),
        unload: async () => ({ success: true, data: undefined }),
      },
      deleteChunk: { deletePath: async () => ({ success: true, data: undefined }) },
    });
    const audioQueue = new AudioChunkQueue('s1', audioPersistence());
    const transcriptQueue = new TranscriptQueue('s1', transcriptPersistence());
    const result = await service.processSession({ audioQueue, transcriptQueue });
    expect(result.success).toBe(false);
  });
});
