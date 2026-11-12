import { create } from 'zustand';

import {
  createDemoApiClient,
  type DemoApiClient,
  type PublicDemoSession,
} from '@/services/demo-api/demo-api-client';
import { wakeDemoApi } from '@/services/api/wake-demo-api';
import type { Result } from '@/types/result';

export type DemoNotePhase =
  | 'idle'
  | 'waking'
  | 'starting'
  | 'running'
  | 'ready'
  | 'failed';

type DemoNoteState = {
  phase: DemoNotePhase;
  session: PublicDemoSession | null;
  error: string | null;
  generate: (client?: DemoApiClient) => Promise<Result<PublicDemoSession>>;
  reset: () => void;
};

const stepLabel = (status: string): string => {
  if (status === 'queued') return 'Queued…';
  if (status === 'stt_running') return 'Transcribing…';
  if (status === 'llm_running') return 'Writing note…';
  if (status === 'pdf_running') return 'Building PDF…';
  if (status === 'ready') return 'Ready.';
  return status;
};

export const demoStepLabel = stepLabel;

export const useDemoNoteStore = create<DemoNoteState>((set) => ({
  phase: 'idle',
  session: null,
  error: null,

  reset: () => set({ phase: 'idle', session: null, error: null }),

  generate: async (client = createDemoApiClient()) => {
    set({ phase: 'waking', error: null, session: null });
    const wake = await wakeDemoApi({ baseUrl: client.baseUrl });
    if (!wake.success) {
      set({ phase: 'failed', error: wake.error });
      return wake;
    }

    set({ phase: 'starting' });
    const started = await client.startDemo();
    if (!started.success) {
      set({ phase: 'failed', error: started.error });
      return started;
    }

    set({
      phase: 'running',
      session: {
        id: started.data.id,
        status: started.data.status,
        error: null,
        pdfUrl: null,
      },
    });

    const ready = await client.pollUntilReady(started.data.id, (session) => {
      set({ phase: 'running', session });
    });

    if (!ready.success) {
      set({ phase: 'failed', error: ready.error });
      return ready;
    }

    set({ phase: 'ready', session: ready.data, error: null });
    return ready;
  },
}));
