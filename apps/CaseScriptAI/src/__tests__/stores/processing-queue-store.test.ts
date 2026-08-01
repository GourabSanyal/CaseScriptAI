import { createProcessingQueueStore } from '@/stores/processing-queue-store';

import type { ProcessingQueueItem, ProcessingQueuePersistence } from '@/types/processing-queue';
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

const memoryPersistence = (
  initial: ProcessingQueueItem[] = [],
): ProcessingQueuePersistence & { saved: ProcessingQueueItem[] } => {
  let saved = [...initial];
  return {
    get saved() {
      return saved;
    },
    load: () => [...saved],
    save: (items) => {
      saved = items.map((item) => ({ ...item }));
    },
  };
};

describe('processing-queue-store', () => {
  it('enqueue appends queued item; blank sessionId fails', async () => {
    const persistence = memoryPersistence();
    const store = createProcessingQueueStore({
      persistence,
      now: () => 1000,
      stateStorage: memoryStorage(),
    });

    const blank = await store.getState().enqueue('  ');
    expect(blank.success).toBe(false);

    const ok = await store.getState().enqueue('s1');
    expect(ok).toEqual({ success: true, data: undefined });
    expect(store.getState().items).toEqual([
      {
        sessionId: 's1',
        status: 'queued',
        enqueuedAt: 1000,
        retryCount: 0,
      },
    ]);
  });

  it('enqueue is idempotent', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    await store.getState().enqueue('s1');
    expect(store.getState().items).toHaveLength(1);
  });

  it('persists and restores via injected persistence', async () => {
    const persistence = memoryPersistence();
    const store = createProcessingQueueStore({
      persistence,
      now: () => 42,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    expect(persistence.saved).toEqual([
      { sessionId: 's1', status: 'queued', enqueuedAt: 42, retryCount: 0 },
    ]);

    const restored = createProcessingQueueStore({
      persistence,
      now: () => 99,
      stateStorage: memoryStorage(),
    });
    expect(restored.getState().items).toEqual(persistence.saved);
  });

  it('normalizes mid-processing to queued on restore', () => {
    const persistence = memoryPersistence([
      {
        sessionId: 's1',
        status: 'processing',
        enqueuedAt: 10,
        retryCount: 0,
      },
    ]);
    const store = createProcessingQueueStore({
      persistence,
      stateStorage: memoryStorage(),
    });
    expect(store.getState().items[0]).toMatchObject({
      sessionId: 's1',
      status: 'queued',
    });
  });

  it('claimNext promotes first queued; blocks second claim while processing', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    await store.getState().enqueue('s2');

    const first = store.getState().claimNext();
    expect(first.success && first.data?.sessionId).toBe('s1');
    expect(store.getState().items[0].status).toBe('processing');

    const second = store.getState().claimNext();
    expect(second).toEqual({ success: true, data: null });
  });

  it('complete removes item and drops pending badge count', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    store.getState().claimNext();
    const done = store.getState().complete('s1');
    expect(done.success).toBe(true);
    expect(store.getState().items).toEqual([]);
    expect(store.getState().pendingBadge()).toEqual({
      pendingCount: 0,
      estimatedMinutes: 0,
    });
  });

  it('fail retries once then marks failed', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    store.getState().claimNext();

    const retry = store.getState().fail('s1', 'oom');
    expect(retry.success).toBe(true);
    expect(store.getState().items[0]).toMatchObject({
      status: 'queued',
      retryCount: 1,
    });

    store.getState().claimNext();
    const failed = store.getState().fail('s1', 'oom');
    expect(failed.success).toBe(true);
    expect(store.getState().items[0]).toMatchObject({
      status: 'failed',
      retryCount: 1,
      failureReason: 'oom',
    });
  });

  it('requeue from failed resets retryCount', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    store.getState().claimNext();
    store.getState().fail('s1', 'x');
    store.getState().claimNext();
    store.getState().fail('s1', 'x');

    const rq = store.getState().requeue('s1');
    expect(rq.success).toBe(true);
    expect(store.getState().items[0]).toMatchObject({
      status: 'queued',
      retryCount: 0,
    });
  });

  it('cancel removes item and calls onCancel', async () => {
    const onCancel = jest.fn(async () => ({ success: true as const, data: undefined }));
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      onCancel,
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    const cancelled = await store.getState().cancel('s1');
    expect(cancelled.success).toBe(true);
    expect(store.getState().items).toEqual([]);
    expect(onCancel).toHaveBeenCalledWith('s1');
  });

  it('pendingBadge counts queued+processing and uses drain samples', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('s1');
    await store.getState().enqueue('s2');
    expect(store.getState().pendingBadge()).toEqual({
      pendingCount: 2,
      estimatedMinutes: 0,
    });

    store.getState().recordDrainSample(120_000);
    expect(store.getState().pendingBadge().estimatedMinutes).toBe(4);
  });

  it('satisfies ProcessingEnqueuePort shape', async () => {
    const store = createProcessingQueueStore({
      persistence: memoryPersistence(),
      now: () => 1,
      stateStorage: memoryStorage(),
    });
    const port = {
      enqueue: store.getState().enqueue,
      pendingCount: store.getState().pendingCount,
    };
    await port.enqueue('s1');
    expect(port.pendingCount()).toBe(1);
  });

  it('persistence payload has only queue metadata (no PHI fields)', async () => {
    const persistence = memoryPersistence();
    const store = createProcessingQueueStore({
      persistence,
      now: () => 5,
      stateStorage: memoryStorage(),
    });
    await store.getState().enqueue('session-abc');
    const keys = Object.keys(persistence.saved[0]).sort();
    expect(keys).toEqual(['enqueuedAt', 'retryCount', 'sessionId', 'status']);
  });
});
