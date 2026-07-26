import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  normalizeRestoredRecordingState,
  transitionRecordingState,
} from '@/services/audio/recording-state-machine';
import { appZustandMMKVStorage } from '@/services/storage/mmkv';
import { AppErrorCode } from '@/types/result';

import type { RecordingEvent, RecordingState, RecordingStore, RecordingStoreDeps } from '@/types/recording';
import type { Result } from '@/types/result';

const apply = (state: RecordingState, event: RecordingEvent): Result<RecordingState> =>
  transitionRecordingState(state, event);

const failEvent = (
  error: string,
  errorCode?: AppErrorCode,
): RecordingEvent =>
  errorCode === AppErrorCode.AUDIO_PERMISSION
    ? { type: 'PERMISSION_DENIED', error }
    : { type: 'FAIL', error, errorCode };

export const createRecordingStore = ({
  recorder,
  foreground,
  enqueueSession,
  createSessionId,
  stateStorage = appZustandMMKVStorage,
}: RecordingStoreDeps) =>
  create<RecordingStore>()(
    persist(
      (set, get) => ({
        machine: { status: 'idle' as const },
        pendingCount: 0,
        error: null,
        hasHydrated: false,
        refreshPendingCount: () => set({ pendingCount: enqueueSession.pendingCount() }),
        reset: () => set({ machine: { status: 'idle' }, error: null }),
        start: async () => {
          const sessionId = createSessionId();
          const started = apply(get().machine, { type: 'START', sessionId });
          if (!started.success) return started;
          set({ machine: started.data, error: null });

          const recording = await recorder.start(sessionId);
          if (!recording.success) {
            const next = apply(get().machine, failEvent(recording.error, recording.errorCode));
            if (next.success) set({ machine: next.data, error: recording.error });
            return recording;
          }

          const granted = apply(get().machine, { type: 'PERMISSION_GRANTED' });
          if (!granted.success) return granted;
          set({ machine: granted.data });

          const fg = await foreground.begin(sessionId, 0);
          if (!fg.success) {
            await recorder.stop();
            const failed = apply(get().machine, { type: 'FAIL', error: fg.error });
            if (failed.success) set({ machine: failed.data, error: fg.error });
            return fg;
          }
          return { success: true, data: sessionId };
        },
        pause: async () => {
          const paused = apply(get().machine, { type: 'PAUSE' });
          if (!paused.success) return paused;
          const result = await recorder.pause();
          if (!result.success) return result;
          set({ machine: paused.data });
          return { success: true, data: undefined };
        },
        resume: async () => {
          const resumed = apply(get().machine, { type: 'RESUME' });
          if (!resumed.success) return resumed;
          const result = await recorder.resume();
          if (!result.success) return result;
          set({ machine: resumed.data });
          return { success: true, data: undefined };
        },
        stop: async () => {
          const stopping = apply(get().machine, { type: 'STOP' });
          if (!stopping.success) return stopping;
          set({ machine: stopping.data });

          const stopped = await recorder.stop();
          if (!stopped.success) {
            const failed = apply(get().machine, {
              type: 'FAIL',
              error: stopped.error,
              errorCode: stopped.errorCode,
            });
            if (failed.success) set({ machine: failed.data, error: stopped.error });
            return stopped;
          }

          await foreground.end();
          const queued = apply(get().machine, {
            type: 'STOPPED',
            chunkCount: stopped.data.chunkCount,
          });
          if (!queued.success) return queued;

          const enqueued = await enqueueSession.enqueue(stopped.data.sessionId);
          if (!enqueued.success) {
            const failed = apply(queued.data, { type: 'FAIL', error: enqueued.error });
            if (failed.success) set({ machine: failed.data, error: enqueued.error });
            return enqueued;
          }

          set({
            machine: queued.data,
            pendingCount: enqueueSession.pendingCount(),
            error: null,
          });
          return { success: true, data: undefined };
        },
        recoverOrphan: async (action) => {
          const event: RecordingEvent =
            action === 'resume' ? { type: 'RESUME_ORPHAN' } : { type: 'DISCARD_ORPHAN' };
          const next = apply(get().machine, event);
          if (!next.success) return next;

          if (action === 'discard') {
            await foreground.end();
            set({ machine: next.data, error: null });
            return { success: true, data: undefined };
          }

          if (next.data.status !== 'recording') {
            return { success: false, error: 'Missing orphan session' };
          }
          const { sessionId, chunkCount } = next.data;
          const recording = await recorder.start(sessionId);
          if (!recording.success) return recording;
          const fg = await foreground.begin(sessionId, chunkCount);
          if (!fg.success) return fg;
          set({ machine: next.data, error: null });
          return { success: true, data: undefined };
        },
      }),
      {
        name: 'recording-session',
        storage: createJSONStorage(() => stateStorage),
        partialize: ({ machine, error }) => ({ machine, error }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          state.machine = normalizeRestoredRecordingState(state.machine);
          state.pendingCount = enqueueSession.pendingCount();
          state.hasHydrated = true;
        },
      },
    ),
  );
