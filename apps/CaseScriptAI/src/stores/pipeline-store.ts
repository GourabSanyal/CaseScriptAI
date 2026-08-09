import { create } from 'zustand';

import type { PipelineStore, PipelineStoreDeps } from '@/types/pipeline-store';

const idle: Pick<
  PipelineStore,
  'sessionId' | 'phase' | 'progress' | 'detail' | 'error' | 'isActive'
> = {
  sessionId: null,
  phase: 'idle',
  progress: 0,
  detail: null,
  error: null,
  isActive: false,
};

export const createPipelineStore = ({ runUntilIdle }: PipelineStoreDeps) =>
  create<PipelineStore>((set, get) => ({
    ...idle,
    applyEvent: (event) => {
      set({
        sessionId: event.sessionId,
        phase: event.phase,
        progress: event.progress,
        detail: event.detail ?? null,
        error: event.phase === 'failed' ? (event.detail ?? 'Pipeline failed') : null,
        isActive: event.phase === 'whisper' || event.phase === 'llm',
      });
    },
    reset: () => set({ ...idle }),
    startDrain: async () => {
      if (get().isActive) {
        return { success: false, error: 'Pipeline already running' };
      }
      set({
        isActive: true,
        error: null,
        phase: 'idle',
        progress: 0,
        detail: null,
        sessionId: null,
      });
      const result = await runUntilIdle();
      if (!result.success) {
        set({ isActive: false, phase: 'failed', error: result.error });
        return result;
      }
      if (result.data === 0 && get().phase === 'idle') {
        set({ isActive: false, error: 'Nothing queued to process' });
        return result;
      }
      set({ isActive: false });
      return result;
    },
  }));
