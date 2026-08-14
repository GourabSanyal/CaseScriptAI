import { MemoryManager } from '@/services/ai/memory-manager';
import { AudioChunkQueue, type AudioChunkRef } from '@/services/audio/audio-chunk-queue';
import { pcmBytesForDurationMs } from '@/services/audio/wav-pcm';

/** Device close-out (not Jest): Xcode Instruments Allocations / Android Profiler on a ~3GB phone. Record 30s → process → peak < 2GB; Home waveform must not hitch after STOP. */

describe('peak RAM invariants', () => {
  it('30s capture buffer is ~1MB PCM, not a JS model', () => {
    expect(pcmBytesForDurationMs(30_000)).toBe(960_000);
  });

  it('audio queue records are paths only', async () => {
    const persist = {
      load: async () => null,
      save: async () => undefined,
      remove: async () => undefined,
    };
    const queue = new AudioChunkQueue('s1', persist);
    const chunk: AudioChunkRef = {
      id: 'c0',
      sessionId: 's1',
      sequence: 0,
      path: 'file://chunk.wav',
    };
    await queue.enqueue(chunk);
    const [row] = queue.nextBatch();
    expect(Object.keys(row!).sort()).toEqual(['id', 'path', 'sequence', 'sessionId']);
    expect(row).not.toHaveProperty('pcm');
    expect(row).not.toHaveProperty('bytes');
  });

  it('Whisper and LLM cannot share the lock', () => {
    const memory = new MemoryManager();
    expect(memory.acquireLock('whisper').success).toBe(true);
    expect(memory.acquireLock('llm').success).toBe(false);
    memory.releaseLock('whisper');
    expect(memory.acquireLock('llm').success).toBe(true);
  });
});
