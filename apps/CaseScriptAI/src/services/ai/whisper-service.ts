import type { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';
import type { TranscriptQueue } from '@/services/ai/transcript-queue';
import type { MemoryManager } from '@/services/ai/memory-manager';
import type { ChunkDeletePort, WhisperRuntimePort } from '@/types/pipeline';
import type { Result } from '@/types/result';

export type WhisperServiceDeps = {
  memory: MemoryManager;
  runtime: WhisperRuntimePort;
  deleteChunk: ChunkDeletePort;
};

export type WhisperProgress = {
  completed: number;
};

/** Whisper stage: lock → per-chunk path transcription → disk-partial transcript → unload+GC. */
export class WhisperService {
  constructor(private readonly deps: WhisperServiceDeps) {}

  processSession = async (input: {
    audioQueue: AudioChunkQueue;
    transcriptQueue: TranscriptQueue;
    onProgress?: (progress: WhisperProgress) => void;
  }): Promise<Result<string>> => {
    const lock = this.deps.memory.acquireLock('whisper');
    if (!lock.success) return lock;

    let completed = 0;
    try {
      const loaded = await this.deps.runtime.load();
      if (!loaded.success) return loaded;

      for (;;) {
        const batch = input.audioQueue.nextBatch();
        if (batch.length === 0) break;

        for (const chunk of batch) {
          if (!input.transcriptQueue.hasChunk(chunk.id)) {
            const transcribed = await this.deps.runtime.transcribe(chunk.path);
            if (!transcribed.success) return transcribed;

            const appended = await input.transcriptQueue.append({
              chunkId: chunk.id,
              sequence: chunk.sequence,
              text: transcribed.data,
            });
            if (!appended.success) return appended;

            await this.deps.deleteChunk.deletePath(chunk.path);
          }

          await input.audioQueue.acknowledge(chunk.id);
          completed += 1;
          input.onProgress?.({ completed });
        }
      }

      return { success: true, data: input.transcriptQueue.toText() };
    } finally {
      await this.deps.runtime.unload();
      this.deps.memory.releaseLock('whisper');
      this.deps.memory.forceGC();
    }
  };
}
