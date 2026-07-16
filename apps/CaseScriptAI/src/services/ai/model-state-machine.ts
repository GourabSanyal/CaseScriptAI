import type { AppErrorCode, Result } from '@/types/result';

export type ModelState =
  | { status: 'unknown' }
  | { status: 'checking' }
  | { status: 'missing' }
  | { status: 'corrupt'; error: string }
  | { status: 'ready' }
  | { status: 'loading' }
  | { status: 'loaded' }
  | { status: 'unloading' }
  | { status: 'failed'; error: string; errorCode?: AppErrorCode };

export type ModelEvent =
  | { type: 'CHECK' }
  | { type: 'MISSING' }
  | { type: 'CORRUPT'; error: string }
  | { type: 'VERIFIED' }
  | { type: 'LOAD' }
  | { type: 'LOADED' }
  | { type: 'UNLOAD' }
  | { type: 'UNLOADED' }
  | { type: 'FAIL'; error: string; errorCode?: AppErrorCode }
  | { type: 'RESET' };

const success = (state: ModelState): Result<ModelState> => ({ success: true, data: state });

export const transitionModelState = (
  state: ModelState,
  event: ModelEvent,
): Result<ModelState> => {
  if (event.type === 'RESET') {
    return success({ status: 'unknown' });
  }
  if (event.type === 'FAIL' && ['checking', 'loading', 'unloading'].includes(state.status)) {
    return success({ status: 'failed', error: event.error, errorCode: event.errorCode });
  }

  switch (state.status) {
    case 'unknown':
      if (event.type === 'CHECK') return success({ status: 'checking' });
      break;
    case 'checking':
      if (event.type === 'MISSING') return success({ status: 'missing' });
      if (event.type === 'CORRUPT') return success({ status: 'corrupt', error: event.error });
      if (event.type === 'VERIFIED') return success({ status: 'ready' });
      break;
    case 'missing':
    case 'corrupt':
      if (event.type === 'CHECK') return success({ status: 'checking' });
      if (event.type === 'VERIFIED') return success({ status: 'ready' });
      break;
    case 'ready':
      if (event.type === 'CHECK') return success({ status: 'checking' });
      if (event.type === 'LOAD') return success({ status: 'loading' });
      break;
    case 'loading':
      if (event.type === 'LOADED') return success({ status: 'loaded' });
      break;
    case 'loaded':
      if (event.type === 'UNLOAD') return success({ status: 'unloading' });
      break;
    case 'unloading':
      if (event.type === 'UNLOADED') return success({ status: 'ready' });
      break;
    case 'failed':
      if (event.type === 'CHECK') return success({ status: 'checking' });
      break;
  }

  return {
    success: false,
    error: `Invalid model transition: ${state.status} + ${event.type}`,
  };
};
