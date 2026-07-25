import { createPendingSessionQueue } from '@/services/audio/pending-session-queue';
import { createRecordingStore } from '@/stores/recording-store';
import { AppErrorCode } from '@/types/result';

import type { StateStorage } from 'zustand/middleware';

const memoryStorage = (): StateStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
};

describe('pending-session-queue', () => {
  it('dedupes session ids and reports pending count', async () => {
    let saved: string[] = [];
    const queue = createPendingSessionQueue({
      load: () => saved,
      save: (ids) => {
        saved = [...ids];
      },
    });
    await queue.enqueue('s1');
    await queue.enqueue('s1');
    await queue.enqueue('s2');
    expect(queue.pendingCount()).toBe(2);
    expect(saved).toEqual(['s1', 's2']);
  });
});

describe('recording-store', () => {
  it('starts, stops, enqueues, and keeps START available after queue', async () => {
    const recorder = {
      start: jest.fn(async () => ({ success: true as const, data: undefined })),
      pause: jest.fn(async () => ({ success: true as const, data: undefined })),
      resume: jest.fn(async () => ({ success: true as const, data: undefined })),
      stop: jest.fn(async () => ({
        success: true as const,
        data: { sessionId: 'sess-1', chunkCount: 2 },
      })),
    };
    const foreground = {
      begin: jest.fn(async () => ({ success: true as const, data: undefined })),
      end: jest.fn(async () => ({ success: true as const, data: undefined })),
      updateChunkCount: jest.fn(),
    };
    let pending: string[] = [];
    const store = createRecordingStore({
      recorder,
      foreground,
      enqueueSession: createPendingSessionQueue({
        load: () => pending,
        save: (ids) => {
          pending = [...ids];
        },
      }),
      createSessionId: () => 'sess-1',
      stateStorage: memoryStorage(),
    });

    const started = await store.getState().start();
    expect(started).toEqual({ success: true, data: 'sess-1' });
    expect(store.getState().machine.status).toBe('recording');

    const stopped = await store.getState().stop();
    expect(stopped.success).toBe(true);
    expect(store.getState()).toMatchObject({
      machine: { status: 'queued', sessionId: 'sess-1', chunkCount: 2 },
      pendingCount: 1,
    });

    const again = await store.getState().start();
    expect(again.success).toBe(true);
    expect(store.getState().machine.status).toBe('recording');
  });

  it('maps mic denial to failed AUDIO_PERMISSION', async () => {
    const store = createRecordingStore({
      recorder: {
        start: async () => ({
          success: false,
          error: 'denied',
          errorCode: AppErrorCode.AUDIO_PERMISSION,
        }),
        pause: async () => ({ success: true, data: undefined }),
        resume: async () => ({ success: true, data: undefined }),
        stop: async () => ({ success: true, data: { sessionId: 'x', chunkCount: 0 } }),
      },
      foreground: {
        begin: async () => ({ success: true, data: undefined }),
        end: async () => ({ success: true, data: undefined }),
        updateChunkCount: () => undefined,
      },
      enqueueSession: { enqueue: async () => ({ success: true, data: undefined }), pendingCount: () => 0 },
      createSessionId: () => 's1',
      stateStorage: memoryStorage(),
    });

    const result = await store.getState().start();
    expect(result.success).toBe(false);
    expect(store.getState().machine).toMatchObject({
      status: 'failed',
      errorCode: AppErrorCode.AUDIO_PERMISSION,
    });
  });

  it('discards an orphaned session back to idle', async () => {
    const foreground = {
      begin: async () => ({ success: true as const, data: undefined }),
      end: jest.fn(async () => ({ success: true as const, data: undefined })),
      updateChunkCount: () => undefined,
    };
    const store = createRecordingStore({
      recorder: {
        start: async () => ({ success: true, data: undefined }),
        pause: async () => ({ success: true, data: undefined }),
        resume: async () => ({ success: true, data: undefined }),
        stop: async () => ({ success: true, data: { sessionId: 'orphan', chunkCount: 4 } }),
      },
      foreground,
      enqueueSession: {
        enqueue: async () => ({ success: true, data: undefined }),
        pendingCount: () => 0,
      },
      createSessionId: () => 'next',
      stateStorage: memoryStorage(),
    });

    store.setState({
      machine: { status: 'orphaned', sessionId: 'orphan', chunkCount: 4 },
    });
    await store.getState().recoverOrphan('discard');
    expect(store.getState().machine).toEqual({ status: 'idle' });
    expect(foreground.end).toHaveBeenCalled();
  });
});
