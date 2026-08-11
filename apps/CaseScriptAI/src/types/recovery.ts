import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';
import type { ToastInput } from '@/types/toast';

export type RedownloadReason = 'corrupt' | 'missing';

export type RecoveryAction =
  | { kind: 'none' }
  | { kind: 'oom-heal' }
  | { kind: 'redownload'; reason: RedownloadReason }
  | { kind: 'retry-when-online' }
  | { kind: 'session-recover' }
  | { kind: 'toast'; message: string; variant: 'error' | 'warning' | 'info' };

export type OomHealResult = {
  healed: boolean;
  tier: LLMTier | null;
};

export type SessionRecoverySnapshot = {
  orphanedRecording: boolean;
  failedCount: number;
  queuedCount: number;
  recordingBusy: boolean;
};

export type ErrorHandlerDeps = {
  healOom: () => Result<OomHealResult>;
  requestRedownload: () => void;
  toast: (input: ToastInput) => void;
};

export type AppRecoveryDeps = {
  subscribeAppState: (listener: (status: string) => void) => () => void;
  subscribeOnline: (listener: (online: boolean) => void) => () => void;
  isOnline: () => boolean;
  isPipelineRunning: () => boolean;
  clearStaleLock: (pipelineRunning: boolean) => boolean;
  checkModelsReady: () => Promise<Result<{ ready: boolean }>>;
  requestRedownload: () => void;
  shouldRetryDownload: () => boolean;
  retryDownload: () => void;
  snapshotSessions: () => SessionRecoverySnapshot;
  toast: (input: ToastInput) => void;
};
