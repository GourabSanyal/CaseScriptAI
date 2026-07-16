import { transitionModelState, type ModelState } from '@/services/ai/model-state-machine';
import { AppErrorCode } from '@/types/result';

const transition = (state: ModelState, type: Parameters<typeof transitionModelState>[1]) => {
  const result = transitionModelState(state, type);
  if (!result.success) throw new Error(result.error);
  return result.data;
};

describe('ModelStateMachine', () => {
  it('tracks missing and verified disk assets', () => {
    let state: ModelState = { status: 'unknown' };
    state = transition(state, { type: 'CHECK' });
    state = transition(state, { type: 'MISSING' });
    expect(state.status).toBe('missing');
    state = transition(state, { type: 'VERIFIED' });
    expect(state.status).toBe('ready');
  });

  it('tracks corruption separately from runtime failure', () => {
    const checking = transition({ status: 'unknown' }, { type: 'CHECK' });
    const corrupt = transition(checking, { type: 'CORRUPT', error: 'bad checksum' });

    expect(corrupt).toEqual({ status: 'corrupt', error: 'bad checksum' });
    expect(transitionModelState(corrupt, { type: 'LOAD' }).success).toBe(false);
  });

  it('separates verified readiness from loaded memory state', () => {
    let state: ModelState = { status: 'ready' };
    state = transition(state, { type: 'LOAD' });
    expect(state.status).toBe('loading');
    state = transition(state, { type: 'LOADED' });
    expect(state.status).toBe('loaded');
    state = transition(state, { type: 'UNLOAD' });
    state = transition(state, { type: 'UNLOADED' });
    expect(state.status).toBe('ready');
  });

  it('preserves typed load and unload failures', () => {
    const loading = transition({ status: 'ready' }, { type: 'LOAD' });
    const loadFailure = transition(loading, {
      type: 'FAIL',
      error: 'oom',
      errorCode: AppErrorCode.MODEL_OOM,
    });
    expect(loadFailure).toMatchObject({ status: 'failed', errorCode: AppErrorCode.MODEL_OOM });

    const unloading: ModelState = { status: 'unloading' };
    expect(transition(unloading, { type: 'FAIL', error: 'delete failed' }).status).toBe('failed');
  });

  it('rejects illegal transitions without mutating input and resets any state', () => {
    const state: ModelState = { status: 'missing' };
    expect(transitionModelState(state, { type: 'LOAD' }).success).toBe(false);
    expect(state).toEqual({ status: 'missing' });
    expect(transition(state, { type: 'RESET' })).toEqual({ status: 'unknown' });
  });
});
