import {
  isDownloadInFlight,
  normalizeRestoredDownloadState,
  resolveLaunchDestination,
  transitionDownloadState,
} from '@/services/download/download-state-machine';
import { AppErrorCode } from '@/types/result';

import type { DownloadEvent, DownloadState } from '@/types/download';

const transition = (state: DownloadState, event: DownloadEvent): DownloadState => {
  const result = transitionDownloadState(state, event);
  if (!result.success) throw new Error(result.error);
  return result.data;
};

describe('DownloadStateMachine', () => {
  it('requires verification before completion', () => {
    let state: DownloadState = { status: 'idle' };
    state = transition(state, { type: 'START' });
    state = transition(state, { type: 'STORAGE_OK' });
    state = transition(state, { type: 'PROGRESS', progress: 1 });
    state = transition(state, { type: 'DOWNLOADED' });
    expect(state.status).toBe('verifying');
    state = transition(state, { type: 'VERIFY_PROGRESS', progress: 1 });
    state = transition(state, { type: 'VERIFIED' });
    expect(state).toEqual({ status: 'complete' });
  });

  it('pauses and resumes the active phase without losing progress', () => {
    const downloading: DownloadState = { status: 'downloading', progress: 0.4, attempt: 1 };
    const paused = transition(downloading, { type: 'PAUSE', reason: 'network' });
    expect(paused).toMatchObject({ status: 'paused', progress: 0.4, phase: 'downloading' });
    expect(transition(paused, { type: 'RESUME' })).toEqual(downloading);
  });

  it('rejects invalid or regressing progress', () => {
    const state: DownloadState = { status: 'downloading', progress: 0.5, attempt: 1 };

    expect(transitionDownloadState(state, { type: 'PROGRESS', progress: -1 }).success).toBe(false);
    expect(transitionDownloadState(state, { type: 'PROGRESS', progress: 0.4 }).success).toBe(false);
    expect(transitionDownloadState(state, { type: 'PROGRESS', progress: Number.NaN }).success).toBe(false);
  });

  it('preserves typed failures and increments attempts on retry', () => {
    const checking: DownloadState = { status: 'checking-storage', attempt: 1 };
    const failed = transition(checking, {
      type: 'FAIL',
      error: 'no space',
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    });
    expect(failed).toMatchObject({ status: 'failed', attempt: 1 });
    expect(transition(failed, { type: 'RETRY' })).toEqual({
      status: 'checking-storage',
      attempt: 2,
    });
  });

  it('keeps interrupted downloads on the download screen even if files look present', () => {
    const paused = normalizeRestoredDownloadState({
      status: 'verifying',
      progress: 0.9,
      attempt: 1,
    });
    expect(isDownloadInFlight(paused)).toBe(true);
    expect(resolveLaunchDestination(true, paused)).toBe('download');
    expect(resolveLaunchDestination(true, { status: 'complete' })).toBe('app');
    expect(resolveLaunchDestination(false, { status: 'idle' })).toBe('download');
  });

  it('normalizes an interrupted active download to paused', () => {
    const restored: DownloadState = { status: 'downloading', progress: 0.7, attempt: 2 };
    expect(normalizeRestoredDownloadState(restored)).toEqual({
      status: 'paused',
      phase: 'downloading',
      reason: 'interrupted',
      progress: 0.7,
      attempt: 2,
    });
  });

  it('supports cancellation only while active and completion is terminal', () => {
    expect(
      transition({ status: 'verifying', progress: 0.5, attempt: 1 }, { type: 'CANCEL' }),
    ).toEqual({ status: 'cancelled' });
    expect(transitionDownloadState({ status: 'complete' }, { type: 'START' }).success).toBe(false);
    expect(transition({ status: 'complete' }, { type: 'RESET' })).toEqual({ status: 'idle' });
  });
});
