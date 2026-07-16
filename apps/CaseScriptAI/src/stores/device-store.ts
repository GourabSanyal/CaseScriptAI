import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { StateStorage } from 'zustand/middleware';

import {
  downgradeLLMTier,
  modelIdForTier,
  selectLLMTier,
} from '@/services/ai/llm-tier-selector';
import { assessDeviceCapability } from '@/services/device/device-capability-service';
import { appZustandMMKVStorage } from '@/services/storage/mmkv';

import type { DeviceCapability, TierSelection } from '@/types/device';
import type { Result } from '@/types/result';

type DeviceStore = {
  capability: DeviceCapability | null;
  selection: TierSelection | null;
  status: 'idle' | 'assessing' | 'ready' | 'failed';
  error: string | null;
  hasHydrated: boolean;
  assessAndSelect: () => Promise<Result<TierSelection>>;
  commitSelection: (selection: TierSelection) => void;
  downgradeAfterWarmupFailure: () => Result<TierSelection>;
  clearAssessment: () => void;
};

type AssessDevice = typeof assessDeviceCapability;

export const createDeviceStore = (
  assessDevice: AssessDevice = assessDeviceCapability,
  stateStorage: StateStorage = appZustandMMKVStorage,
) =>
  create<DeviceStore>()(
    persist(
      (set, get) => ({
        capability: null,
        selection: null,
        status: 'idle',
        error: null,
        hasHydrated: false,
        assessAndSelect: async () => {
          if (get().status === 'assessing') {
            return { success: false, error: 'Device assessment is already running' };
          }

          set({ status: 'assessing', error: null });
          const result = await assessDevice();
          if (!result.success) {
            set({ status: 'failed', error: result.error });
            return result;
          }

          const selection = selectLLMTier(result.data);
          set({ capability: result.data, selection, status: 'ready', error: null });
          return { success: true, data: selection };
        },
        commitSelection: (selection) => set({ selection, status: 'ready', error: null }),
        downgradeAfterWarmupFailure: () => {
          const current = get().selection;
          if (!current) return { success: false, error: 'No LLM tier has been selected' };

          const tier = downgradeLLMTier(current.tier);
          if (!tier) return { success: false, error: 'Lite tier cannot be downgraded' };

          const selection: TierSelection = {
            tier,
            modelId: modelIdForTier(tier),
            showLowMemoryNotice: current.showLowMemoryNotice,
            reason: 'compute-downgrade',
          };
          set({ selection, status: 'ready', error: null });
          return { success: true, data: selection };
        },
        clearAssessment: () =>
          set({ capability: null, selection: null, status: 'idle', error: null }),
      }),
      {
        name: 'device-capability',
        storage: createJSONStorage(() => stateStorage),
        partialize: ({ capability, selection }) => ({ capability, selection }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.status = state.capability && state.selection ? 'ready' : 'idle';
            state.hasHydrated = true;
          }
        },
      },
    ),
  );

export const useDeviceStore = createDeviceStore();
