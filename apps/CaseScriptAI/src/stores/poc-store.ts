import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage/mmkv";

import type { PocStore, PipelineResult } from "@/types/poc";

export const usePocStore = create<PocStore>()(
  persist(
    (set, get) => ({
      audios: [],
      hasHydrated: false,
      pipelineResult: null,
      addAudio: (entry) => set({ audios: [...get().audios, entry] }),
      removeAudio: (uri) =>
        set({ audios: get().audios.filter((a) => a.uri !== uri) }),
      clearAudios: () => set({ audios: [], pipelineResult: null }),
      setPipelineResult: (result) => set({ pipelineResult: result }),
      clearPipelineResult: () => set({ pipelineResult: null }),
    }),
    {
      name: "poc-storage",
      storage: createJSONStorage(() => zustandMMKVStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
