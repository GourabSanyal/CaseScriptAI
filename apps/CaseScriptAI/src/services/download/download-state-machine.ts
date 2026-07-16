import type { AppErrorCode, Result } from '@/types/result';

type ActivePhase = 'downloading' | 'verifying';
export type PauseReason = 'network' | 'background' | 'user' | 'interrupted';

export type DownloadState =
  | { status: 'idle' }
  | { status: 'checking-storage'; attempt: number }
  | { status: 'downloading'; progress: number; attempt: number }
  | {
      status: 'paused';
      progress: number;
      attempt: number;
      phase: ActivePhase;
      reason: PauseReason;
    }
  | { status: 'verifying'; progress: number; attempt: number }
  | { status: 'complete' }
  | {
      status: 'failed';
      error: string;
      errorCode?: AppErrorCode;
      progress: number;
      attempt: number;
    }
  | { status: 'cancelled' };

export type DownloadEvent =
  | { type: 'START' }
  | { type: 'STORAGE_OK' }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'PAUSE'; reason: Exclude<PauseReason, 'interrupted'> }
  | { type: 'RESUME' }
  | { type: 'DOWNLOADED' }
  | { type: 'VERIFY_PROGRESS'; progress: number }
  | { type: 'VERIFIED' }
  | { type: 'RETRY' }
  | { type: 'FAIL'; error: string; errorCode?: AppErrorCode }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

const success = (state: DownloadState): Result<DownloadState> => ({ success: true, data: state });
const isProgress = (value: number): boolean => Number.isFinite(value) && value >= 0 && value <= 1;

const activeProgress = (state: DownloadState): number =>
  'progress' in state ? state.progress : 0;

const activeAttempt = (state: DownloadState): number =>
  'attempt' in state ? state.attempt : 1;

export const transitionDownloadState = (
  state: DownloadState,
  event: DownloadEvent,
): Result<DownloadState> => {
  if (event.type === 'RESET') return success({ status: 'idle' });

  if (
    event.type === 'CANCEL' &&
    ['checking-storage', 'downloading', 'paused', 'verifying'].includes(state.status)
  ) {
    return success({ status: 'cancelled' });
  }

  if (
    event.type === 'FAIL' &&
    ['checking-storage', 'downloading', 'paused', 'verifying'].includes(state.status)
  ) {
    return success({
      status: 'failed',
      error: event.error,
      errorCode: event.errorCode,
      progress: activeProgress(state),
      attempt: activeAttempt(state),
    });
  }

  switch (state.status) {
    case 'idle':
      if (event.type === 'START') return success({ status: 'checking-storage', attempt: 1 });
      break;
    case 'checking-storage':
      if (event.type === 'STORAGE_OK') {
        return success({ status: 'downloading', progress: 0, attempt: state.attempt });
      }
      break;
    case 'downloading':
      if (event.type === 'PROGRESS' && isProgress(event.progress) && event.progress >= state.progress) {
        return success({ ...state, progress: event.progress });
      }
      if (event.type === 'PAUSE') return success({ ...state, status: 'paused', phase: 'downloading', reason: event.reason });
      if (event.type === 'DOWNLOADED') return success({ status: 'verifying', progress: 0, attempt: state.attempt });
      break;
    case 'verifying':
      if (event.type === 'VERIFY_PROGRESS' && isProgress(event.progress) && event.progress >= state.progress) {
        return success({ ...state, progress: event.progress });
      }
      if (event.type === 'PAUSE') return success({ ...state, status: 'paused', phase: 'verifying', reason: event.reason });
      if (event.type === 'VERIFIED') return success({ status: 'complete' });
      break;
    case 'paused':
      if (event.type === 'RESUME') {
        return success({ status: state.phase, progress: state.progress, attempt: state.attempt });
      }
      break;
    case 'failed':
      if (event.type === 'RETRY') {
        return success({ status: 'checking-storage', attempt: state.attempt + 1 });
      }
      break;
    case 'complete':
    case 'cancelled':
      break;
  }

  return { success: false, error: `Invalid download transition: ${state.status} + ${event.type}` };
};

export const normalizeRestoredDownloadState = (state: DownloadState): DownloadState => {
  if (state.status === 'downloading' || state.status === 'verifying') {
    return { ...state, status: 'paused', phase: state.status, reason: 'interrupted' };
  }
  return state;
};
