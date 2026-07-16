import type { Result } from '@/types/result';

const MAX_BATCH_SIZE = 50;

export type AudioChunkRef = {
  id: string;
  sessionId: string;
  sequence: number;
  path: string;
};

export type AudioChunkPersistence = {
  load: (sessionId: string) => Promise<readonly AudioChunkRef[] | null>;
  save: (sessionId: string, chunks: readonly AudioChunkRef[]) => Promise<void>;
  remove: (sessionId: string) => Promise<void>;
};

export class AudioChunkQueue {
  private chunks: AudioChunkRef[] = [];

  constructor(
    private readonly sessionId: string,
    private readonly persistence: AudioChunkPersistence,
  ) {}

  restore = async (): Promise<Result<number>> => {
    try {
      const restored = (await this.persistence.load(this.sessionId)) ?? [];
      if (!restored.every((chunk) => this.isValidChunk(chunk))) {
        return { success: false, error: 'Stored audio chunk queue is invalid' };
      }
      this.chunks = [...restored].sort((a, b) => a.sequence - b.sequence);
      return { success: true, data: this.chunks.length };
    } catch (error) {
      return { success: false, error: this.message(error) };
    }
  };

  enqueue = async (chunk: AudioChunkRef): Promise<Result<void>> => {
    if (!this.isValidChunk(chunk)) {
      return { success: false, error: 'Audio chunk metadata is invalid' };
    }
    if (this.chunks.some(({ id }) => id === chunk.id)) {
      return { success: true, data: undefined };
    }

    return this.commit([...this.chunks, chunk].sort((a, b) => a.sequence - b.sequence));
  };

  nextBatch = (limit = MAX_BATCH_SIZE): readonly AudioChunkRef[] => {
    const safeLimit = Math.min(MAX_BATCH_SIZE, Math.max(0, Math.floor(limit)));
    return this.chunks.slice(0, safeLimit);
  };

  acknowledge = async (chunkId: string): Promise<Result<void>> => {
    const remaining = this.chunks.filter(({ id }) => id !== chunkId);
    if (remaining.length === this.chunks.length) {
      return { success: true, data: undefined };
    }
    return this.commit(remaining);
  };

  clear = async (): Promise<Result<void>> => {
    try {
      await this.persistence.remove(this.sessionId);
      this.chunks = [];
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: this.message(error) };
    }
  };

  private commit = async (next: AudioChunkRef[]): Promise<Result<void>> => {
    try {
      await this.persistence.save(this.sessionId, next);
      this.chunks = next;
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: this.message(error) };
    }
  };

  private isValidChunk = (chunk: AudioChunkRef): boolean =>
    chunk.sessionId === this.sessionId &&
    chunk.id.trim().length > 0 &&
    chunk.path.trim().length > 0 &&
    Number.isInteger(chunk.sequence) &&
    chunk.sequence >= 0;

  private message = (error: unknown): string =>
    error instanceof Error ? error.message : 'Audio chunk persistence failed';
}
