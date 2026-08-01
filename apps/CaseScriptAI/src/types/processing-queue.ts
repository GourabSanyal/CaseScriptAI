import type { Result } from '@/types/result';
import type { StateStorage } from 'zustand/middleware';

export type ProcessingQueueStatus = 'queued' | 'processing' | 'failed';

export type ProcessingQueueItem = {
  sessionId: string;
  status: ProcessingQueueStatus;
  enqueuedAt: number;
  retryCount: 0 | 1;
  failureReason?: string;
};

export type ProcessingQueuePersistence = {
  load: () => ProcessingQueueItem[];
  save: (items: readonly ProcessingQueueItem[]) => void;
};

export type PendingBadge = {
  pendingCount: number;
  estimatedMinutes: number;
};

export type ProcessingQueueStore = {
  items: ProcessingQueueItem[];
  hasHydrated: boolean;
  enqueue: (sessionId: string) => Promise<Result<void>>;
  claimNext: () => Result<ProcessingQueueItem | null>;
  complete: (sessionId: string) => Result<void>;
  fail: (sessionId: string, reason: string) => Result<void>;
  requeue: (sessionId: string) => Result<void>;
  cancel: (sessionId: string) => Promise<Result<void>>;
  pendingBadge: () => PendingBadge;
  pendingCount: () => number;
  recordDrainSample: (durationMs: number) => void;
};

export type ProcessingQueueStoreDeps = {
  persistence: ProcessingQueuePersistence;
  onCancel?: (sessionId: string) => Promise<Result<void>>;
  now?: () => number;
  stateStorage?: StateStorage;
};
