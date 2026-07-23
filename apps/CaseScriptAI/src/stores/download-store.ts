import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { normalizeRestoredDownloadState } from '@/services/download/download-state-machine';
import { runModelDownload } from '@/services/download/run-model-download';
import { appZustandMMKVStorage } from '@/services/storage/mmkv';

import type { DownloadStore, DownloadStoreDeps } from '@/types/download';

export const createDownloadStore = ({
  downloadAsset,
  warmup,
  downgradeAfterWarmupFailure,
  stateStorage = appZustandMMKVStorage,
}: DownloadStoreDeps) =>
  create<DownloadStore>()(
    persist(
      (set, get) => ({
        machine: { status: 'idle' },
        progress: 0,
        phaseLabel: 'Idle',
        error: null,
        hasHydrated: false,
        reset: () =>
          set({ machine: { status: 'idle' }, progress: 0, phaseLabel: 'Idle', error: null }),
        retry: (tier) => get().startDownload(tier),
        startDownload: (tier) =>
          runModelDownload({
            tier,
            machine: get().machine,
            downloadAsset,
            warmup,
            downgradeAfterWarmupFailure,
            onUpdate: (snapshot) => set(snapshot),
          }),
      }),
      {
        name: 'download-progress',
        storage: createJSONStorage(() => stateStorage),
        partialize: ({ machine, progress, phaseLabel, error }) => ({
          machine,
          progress,
          phaseLabel,
          error,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          state.machine = normalizeRestoredDownloadState(state.machine);
          state.hasHydrated = true;
        },
      },
    ),
  );
