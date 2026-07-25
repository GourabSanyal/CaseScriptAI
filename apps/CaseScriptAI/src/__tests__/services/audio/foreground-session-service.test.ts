import { ForegroundSessionService } from '@/services/audio/foreground-session-service';

describe('ForegroundSessionService', () => {
  it('starts notification, checkpoints on an interval, and clears on end', async () => {
    const checkpoints: { sessionId: string; chunkCount: number }[] = [];
    const ticks: Array<() => void> = [];
    let notification = false;

    const service = new ForegroundSessionService({
      startNotification: async () => {
        notification = true;
        return { success: true, data: undefined };
      },
      stopNotification: async () => {
        notification = false;
        return { success: true, data: undefined };
      },
      saveCheckpoint: async (input) => {
        checkpoints.push({ sessionId: input.sessionId, chunkCount: input.chunkCount });
        return { success: true, data: undefined };
      },
      loadCheckpoint: async () => ({ success: true, data: null }),
      clearCheckpoint: async () => {
        checkpoints.length = 0;
        return { success: true, data: undefined };
      },
      clock: {
        now: () => 1000,
        every: (_ms, cb) => {
          ticks.push(cb);
          return () => undefined;
        },
      },
      checkpointIntervalMs: 100,
    });

    expect(await service.begin('s1', 2)).toEqual({ success: true, data: undefined });
    expect(notification).toBe(true);
    expect(checkpoints).toEqual([{ sessionId: 's1', chunkCount: 2 }]);

    service.updateChunkCount(5);
    ticks[0]?.();
    expect(checkpoints.at(-1)).toEqual({ sessionId: 's1', chunkCount: 5 });

    expect(await service.end()).toEqual({ success: true, data: undefined });
    expect(notification).toBe(false);
    expect(checkpoints).toHaveLength(0);
  });

  it('restores an orphan checkpoint for relaunch recovery', async () => {
    const service = new ForegroundSessionService({
      startNotification: async () => ({ success: true, data: undefined }),
      stopNotification: async () => ({ success: true, data: undefined }),
      saveCheckpoint: async () => ({ success: true, data: undefined }),
      loadCheckpoint: async () => ({
        success: true,
        data: { sessionId: 'orphan', chunkCount: 3, updatedAt: 1 },
      }),
      clearCheckpoint: async () => ({ success: true, data: undefined }),
      clock: { now: () => 0, every: () => () => undefined },
    });

    expect(await service.restoreOrphan()).toEqual({
      success: true,
      data: { sessionId: 'orphan', chunkCount: 3 },
    });
  });
});
