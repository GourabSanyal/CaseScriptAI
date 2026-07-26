import type { ForegroundSessionDependencies } from '@/types/recording';
import type { Result } from '@/types/result';

const DEFAULT_CHECKPOINT_MS = 30_000;

export class ForegroundSessionService {
  private sessionId: string | null = null;
  private chunkCount = 0;
  private cancelCheckpoint: (() => void) | null = null;

  constructor(private readonly deps: ForegroundSessionDependencies) {}

  begin = async (sessionId: string, chunkCount = 0): Promise<Result<void>> => {
    if (!sessionId.trim()) return { success: false, error: 'sessionId is required' };
    if (this.sessionId) return { success: false, error: 'Foreground session already active' };

    const notified = await this.deps.startNotification(sessionId);
    if (!notified.success) return notified;

    this.sessionId = sessionId;
    this.chunkCount = chunkCount;
    const saved = await this.checkpoint();
    if (!saved.success) {
      await this.deps.stopNotification();
      this.sessionId = null;
      return saved;
    }

    const interval = this.deps.checkpointIntervalMs ?? DEFAULT_CHECKPOINT_MS;
    this.cancelCheckpoint = this.deps.clock.every(interval, () => {
      void this.checkpoint();
    });
    return { success: true, data: undefined };
  };

  updateChunkCount = (chunkCount: number): void => {
    if (chunkCount >= 0) this.chunkCount = chunkCount;
  };

  end = async (): Promise<Result<void>> => {
    this.cancelCheckpoint?.();
    this.cancelCheckpoint = null;
    const stopped = await this.deps.stopNotification();
    const cleared = await this.deps.clearCheckpoint();
    this.sessionId = null;
    this.chunkCount = 0;
    if (!stopped.success) return stopped;
    return cleared;
  };

  restoreOrphan = async (): Promise<
    Result<{ sessionId: string; chunkCount: number } | null>
  > => {
    const loaded = await this.deps.loadCheckpoint();
    if (!loaded.success) return loaded;
    if (!loaded.data) return { success: true, data: null };
    return {
      success: true,
      data: {
        sessionId: loaded.data.sessionId,
        chunkCount: loaded.data.chunkCount,
      },
    };
  };

  private checkpoint = async (): Promise<Result<void>> => {
    if (!this.sessionId) return { success: true, data: undefined };
    return this.deps.saveCheckpoint({
      sessionId: this.sessionId,
      chunkCount: this.chunkCount,
      updatedAt: this.deps.clock.now(),
    });
  };
}
