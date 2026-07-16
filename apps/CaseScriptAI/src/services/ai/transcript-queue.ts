import type { Result } from '@/types/result';

export type TranscriptSegment = {
  chunkId: string;
  sequence: number;
  text: string;
};

export type TranscriptPersistence = {
  load: (sessionId: string) => Promise<readonly TranscriptSegment[] | null>;
  save: (sessionId: string, segments: readonly TranscriptSegment[]) => Promise<void>;
  remove: (sessionId: string) => Promise<void>;
};

export class TranscriptQueue {
  private segments: TranscriptSegment[] = [];

  constructor(
    private readonly sessionId: string,
    private readonly persistence: TranscriptPersistence,
  ) {}

  restore = async (): Promise<Result<number>> => {
    try {
      const restored = (await this.persistence.load(this.sessionId)) ?? [];
      if (!restored.every(this.isValidSegment)) {
        return { success: false, error: 'Stored transcript queue is invalid' };
      }
      this.segments = this.order(restored);
      return { success: true, data: this.segments.length };
    } catch (error) {
      return { success: false, error: this.message(error) };
    }
  };

  append = async (segment: TranscriptSegment): Promise<Result<void>> => {
    if (!this.isValidSegment(segment)) {
      return { success: false, error: 'Transcript segment is invalid' };
    }
    if (this.hasChunk(segment.chunkId)) {
      return { success: true, data: undefined };
    }

    return this.commit(this.order([...this.segments, segment]));
  };

  hasChunk = (chunkId: string): boolean =>
    this.segments.some((segment) => segment.chunkId === chunkId);

  toText = (): string => this.segments.map(({ text }) => text.trim()).join(' ');

  clear = async (): Promise<Result<void>> => {
    try {
      await this.persistence.remove(this.sessionId);
      this.segments = [];
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: this.message(error) };
    }
  };

  private commit = async (next: TranscriptSegment[]): Promise<Result<void>> => {
    try {
      await this.persistence.save(this.sessionId, next);
      this.segments = next;
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: this.message(error) };
    }
  };

  private order = (segments: readonly TranscriptSegment[]): TranscriptSegment[] =>
    [...segments].sort((a, b) => a.sequence - b.sequence);

  private isValidSegment = (segment: TranscriptSegment): boolean =>
    segment.chunkId.trim().length > 0 &&
    segment.text.trim().length > 0 &&
    Number.isInteger(segment.sequence) &&
    segment.sequence >= 0;

  private message = (error: unknown): string =>
    error instanceof Error ? error.message : 'Transcript persistence failed';
}
