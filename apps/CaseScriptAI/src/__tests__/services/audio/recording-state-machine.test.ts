import {
  normalizeRestoredRecordingState,
  transitionRecordingState,
} from '@/services/audio/recording-state-machine';
import { AppErrorCode } from '@/types/result';

import type { RecordingEvent, RecordingState } from '@/types/recording';

const transition = (state: RecordingState, event: RecordingEvent): RecordingState => {
  const result = transitionRecordingState(state, event);
  if (!result.success) throw new Error(result.error);
  return result.data;
};

describe('RecordingStateMachine', () => {
  it('runs idle → permission → recording → stop → queued', () => {
    let state: RecordingState = { status: 'idle' };
    state = transition(state, { type: 'START', sessionId: 's1' });
    expect(state).toEqual({ status: 'requesting-permission', sessionId: 's1' });
    state = transition(state, { type: 'PERMISSION_GRANTED' });
    expect(state).toEqual({ status: 'recording', sessionId: 's1', chunkCount: 0 });
    state = transition(state, { type: 'CHUNK' });
    state = transition(state, { type: 'STOP' });
    expect(state.status).toBe('stopping');
    state = transition(state, { type: 'STOPPED' });
    expect(state).toEqual({ status: 'queued', sessionId: 's1', chunkCount: 1 });
  });

  it('prefers STOPPED chunkCount from the recorder flush', () => {
    const stopping: RecordingState = { status: 'stopping', sessionId: 's1', chunkCount: 0 };
    expect(transition(stopping, { type: 'STOPPED', chunkCount: 5 })).toEqual({
      status: 'queued',
      sessionId: 's1',
      chunkCount: 5,
    });
  });

  it('pauses and resumes without losing chunk count', () => {
    const recording: RecordingState = { status: 'recording', sessionId: 's1', chunkCount: 3 };
    const paused = transition(recording, { type: 'PAUSE' });
    expect(paused).toEqual({ status: 'paused', sessionId: 's1', chunkCount: 3 });
    expect(transition(paused, { type: 'RESUME' })).toEqual(recording);
  });

  it('maps permission denial to AUDIO_PERMISSION failure', () => {
    const state = transition(
      { status: 'requesting-permission', sessionId: 's1' },
      { type: 'PERMISSION_DENIED', error: 'denied' },
    );
    expect(state).toEqual({
      status: 'failed',
      error: 'denied',
      errorCode: AppErrorCode.AUDIO_PERMISSION,
      sessionId: 's1',
    });
  });

  it('normalizes interrupted recording to orphaned and supports resume/discard', () => {
    const restored: RecordingState = { status: 'recording', sessionId: 's1', chunkCount: 2 };
    const orphaned = normalizeRestoredRecordingState(restored);
    expect(orphaned).toEqual({ status: 'orphaned', sessionId: 's1', chunkCount: 2 });
    expect(transition(orphaned, { type: 'RESUME_ORPHAN' })).toEqual({
      status: 'recording',
      sessionId: 's1',
      chunkCount: 2,
    });
    expect(transition(orphaned, { type: 'DISCARD_ORPHAN' })).toEqual({ status: 'idle' });
  });

  it('allows START from queued so the next patient is never blocked', () => {
    const queued: RecordingState = { status: 'queued', sessionId: 's1', chunkCount: 4 };
    expect(transition(queued, { type: 'START', sessionId: 's2' })).toEqual({
      status: 'requesting-permission',
      sessionId: 's2',
    });
  });

  it('rejects invalid transitions and empty session ids', () => {
    expect(transitionRecordingState({ status: 'idle' }, { type: 'PAUSE' }).success).toBe(false);
    expect(
      transitionRecordingState({ status: 'idle' }, { type: 'START', sessionId: '  ' }).success,
    ).toBe(false);
    expect(transition({ status: 'idle' }, { type: 'RESET' })).toEqual({ status: 'idle' });
  });
});
