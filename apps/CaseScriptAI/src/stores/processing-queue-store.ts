import { create } from 'zustand';

import type {
  PendingBadge,
  ProcessingQueueItem,
  ProcessingQueueStore,
  ProcessingQueueStoreDeps,
} from '@/types/processing-queue';
import type { Result } from '@/types/result';

const normalizeItem = (item: ProcessingQueueItem): ProcessingQueueItem => ({
  ...item,
  status: item.status === 'processing' ? 'queued' : item.status,
});

const isValidItem = (item: unknown): item is ProcessingQueueItem => {
  if (!item || typeof item !== 'object') return false;
  const row = item as ProcessingQueueItem;
  return (
    typeof row.sessionId === 'string' &&
    row.sessionId.trim().length > 0 &&
    (row.status === 'queued' || row.status === 'processing' || row.status === 'failed') &&
    typeof row.enqueuedAt === 'number' &&
    (row.retryCount === 0 || row.retryCount === 1)
  );
};

export const createProcessingQueueStore = ({
  persistence,
  onCancel,
  now = Date.now,
}: ProcessingQueueStoreDeps) => {
  let drainSamplesMs: number[] = [];

  const raw = persistence.load().filter(isValidItem);
  const loaded = raw.map(normalizeItem);
  if (raw.some((item, i) => item.status !== loaded[i].status)) {
    persistence.save(loaded);
  }

  const commit = (
    set: (partial: Partial<ProcessingQueueStore>) => void,
    items: ProcessingQueueItem[],
  ): void => {
    persistence.save(items);
    set({ items });
  };

  const findIndex = (items: ProcessingQueueItem[], sessionId: string): number =>
    items.findIndex((item) => item.sessionId === sessionId);

  const badgeFrom = (items: ProcessingQueueItem[]): PendingBadge => {
    const pendingCount = items.filter(
      (item) => item.status === 'queued' || item.status === 'processing',
    ).length;
    if (pendingCount === 0 || drainSamplesMs.length === 0) {
      return { pendingCount, estimatedMinutes: 0 };
    }
    const avgMs =
      drainSamplesMs.reduce((sum, ms) => sum + ms, 0) / drainSamplesMs.length;
    return {
      pendingCount,
      estimatedMinutes: Math.max(1, Math.round((avgMs * pendingCount) / 60_000)),
    };
  };

  return create<ProcessingQueueStore>((set, get) => ({
    items: loaded,
    hasHydrated: true,
    enqueue: async (sessionId) => {
      const id = sessionId.trim();
      if (!id) return { success: false, error: 'sessionId is required' };
      const { items } = get();
      if (items.some((item) => item.sessionId === id)) {
        return { success: true, data: undefined };
      }
      commit(set, [
        ...items,
        { sessionId: id, status: 'queued', enqueuedAt: now(), retryCount: 0 },
      ]);
      return { success: true, data: undefined };
    },
    claimNext: () => {
      const { items } = get();
      if (items.some((item) => item.status === 'processing')) {
        return { success: true, data: null };
      }
      const index = items.findIndex((item) => item.status === 'queued');
      if (index < 0) return { success: true, data: null };
      const claimed: ProcessingQueueItem = { ...items[index], status: 'processing' };
      const next = [...items];
      next[index] = claimed;
      commit(set, next);
      return { success: true, data: claimed };
    },
    complete: (sessionId) => {
      const { items } = get();
      if (findIndex(items, sessionId) < 0) {
        return { success: false, error: 'Session not in queue' };
      }
      commit(
        set,
        items.filter((item) => item.sessionId !== sessionId),
      );
      return { success: true, data: undefined };
    },
    fail: (sessionId, reason) => {
      const { items } = get();
      const index = findIndex(items, sessionId);
      if (index < 0) return { success: false, error: 'Session not in queue' };
      const current = items[index];
      const nextItem: ProcessingQueueItem =
        current.retryCount === 0
          ? { ...current, status: 'queued', retryCount: 1, failureReason: reason }
          : {
              ...current,
              status: 'failed',
              retryCount: 1,
              failureReason: reason,
            };
      const next = [...items];
      next[index] = nextItem;
      commit(set, next);
      return { success: true, data: undefined };
    },
    requeue: (sessionId) => {
      const { items } = get();
      const index = findIndex(items, sessionId);
      if (index < 0) return { success: false, error: 'Session not in queue' };
      if (items[index].status !== 'failed') {
        return { success: false, error: 'Only failed sessions can be requeued' };
      }
      const next = [...items];
      next[index] = {
        ...items[index],
        status: 'queued',
        retryCount: 0,
        failureReason: undefined,
      };
      commit(set, next);
      return { success: true, data: undefined };
    },
    cancel: async (sessionId) => {
      const { items } = get();
      if (findIndex(items, sessionId) < 0) {
        return { success: false, error: 'Session not in queue' };
      }
      if (onCancel) {
        const cancelled = await onCancel(sessionId);
        if (!cancelled.success) return cancelled;
      }
      commit(
        set,
        items.filter((item) => item.sessionId !== sessionId),
      );
      return { success: true, data: undefined };
    },
    pendingBadge: () => badgeFrom(get().items),
    pendingCount: () => badgeFrom(get().items).pendingCount,
    recordDrainSample: (durationMs) => {
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;
      drainSamplesMs = [...drainSamplesMs.slice(-9), durationMs];
    },
  }));
};
