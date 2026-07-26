import type { RecordingEvent, RecordingState } from '@/types/recording';
import { AppErrorCode, type Result } from '@/types/result';

const success = (state: RecordingState): Result<RecordingState> => ({
  success: true,
  data: state,
});

const withSession = (
  state: RecordingState,
): Extract<
  RecordingState,
  | { status: 'requesting-permission' }
  | { status: 'recording' }
  | { status: 'paused' }
  | { status: 'stopping' }
  | { status: 'queued' }
  | { status: 'orphaned' }
> | null => {
  if (
    state.status === 'requesting-permission' ||
    state.status === 'recording' ||
    state.status === 'paused' ||
    state.status === 'stopping' ||
    state.status === 'queued' ||
    state.status === 'orphaned'
  ) {
    return state;
  }
  return null;
};

export const transitionRecordingState = (
  state: RecordingState,
  event: RecordingEvent,
): Result<RecordingState> => {
  if (event.type === 'RESET') return success({ status: 'idle' });

  if (
    event.type === 'FAIL' &&
    ['requesting-permission', 'recording', 'paused', 'stopping', 'queued'].includes(state.status)
  ) {
    const active = withSession(state);
    return success({
      status: 'failed',
      error: event.error,
      errorCode: event.errorCode,
      sessionId: active?.sessionId,
      chunkCount: active && 'chunkCount' in active ? active.chunkCount : undefined,
    });
  }

  switch (state.status) {
    case 'idle':
      if (event.type === 'START' && event.sessionId.trim().length > 0) {
        return success({ status: 'requesting-permission', sessionId: event.sessionId });
      }
      if (event.type === 'DETECT_ORPHAN' && event.sessionId.trim().length > 0 && event.chunkCount >= 0) {
        return success({
          status: 'orphaned',
          sessionId: event.sessionId,
          chunkCount: event.chunkCount,
        });
      }
      break;
    case 'requesting-permission':
      if (event.type === 'PERMISSION_GRANTED') {
        return success({ status: 'recording', sessionId: state.sessionId, chunkCount: 0 });
      }
      if (event.type === 'PERMISSION_DENIED') {
        return success({
          status: 'failed',
          error: event.error,
          errorCode: AppErrorCode.AUDIO_PERMISSION,
          sessionId: state.sessionId,
        });
      }
      break;
    case 'recording':
      if (event.type === 'CHUNK') {
        return success({ ...state, chunkCount: state.chunkCount + 1 });
      }
      if (event.type === 'PAUSE') {
        return success({ status: 'paused', sessionId: state.sessionId, chunkCount: state.chunkCount });
      }
      if (event.type === 'STOP') {
        return success({
          status: 'stopping',
          sessionId: state.sessionId,
          chunkCount: state.chunkCount,
        });
      }
      break;
    case 'paused':
      if (event.type === 'RESUME') {
        return success({
          status: 'recording',
          sessionId: state.sessionId,
          chunkCount: state.chunkCount,
        });
      }
      if (event.type === 'STOP') {
        return success({
          status: 'stopping',
          sessionId: state.sessionId,
          chunkCount: state.chunkCount,
        });
      }
      break;
    case 'stopping':
      if (event.type === 'CHUNK') {
        return success({ ...state, chunkCount: state.chunkCount + 1 });
      }
      if (event.type === 'STOPPED') {
        return success({
          status: 'queued',
          sessionId: state.sessionId,
          chunkCount: event.chunkCount ?? state.chunkCount,
        });
      }
      break;
    case 'orphaned':
      if (event.type === 'RESUME_ORPHAN') {
        return success({
          status: 'recording',
          sessionId: state.sessionId,
          chunkCount: state.chunkCount,
        });
      }
      if (event.type === 'DISCARD_ORPHAN') {
        return success({ status: 'idle' });
      }
      break;
    case 'queued':
    case 'failed':
      if (event.type === 'START' && event.sessionId.trim().length > 0) {
        return success({ status: 'requesting-permission', sessionId: event.sessionId });
      }
      break;
  }

  return {
    success: false,
    error: `Invalid recording transition: ${state.status} + ${event.type}`,
  };
};

export const normalizeRestoredRecordingState = (state: RecordingState): RecordingState => {
  if (state.status === 'recording' || state.status === 'paused' || state.status === 'stopping') {
    return {
      status: 'orphaned',
      sessionId: state.sessionId,
      chunkCount: state.chunkCount,
    };
  }
  if (state.status === 'requesting-permission') {
    return { status: 'idle' };
  }
  return state;
};
