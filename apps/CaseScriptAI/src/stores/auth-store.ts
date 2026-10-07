import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import {
  continueAsTherapistDemo,
  joinAsPatientDemo,
  signInTherapistDemo,
} from '@/services/auth/demo-auth-service';
import { appZustandMMKVStorage } from '@/services/storage/mmkv';

import type { AuthSession, PatientJoinInput, TherapistLoginInput } from '@/types/auth';
import type { Result } from '@/types/result';

type AuthStore = {
  session: AuthSession | null;
  hasHydrated: boolean;
  lastError: string | null;
  signInTherapist: (input: TherapistLoginInput) => Result<AuthSession>;
  continueTherapistDemo: () => Result<AuthSession>;
  joinPatient: (input: PatientJoinInput) => Result<AuthSession>;
  signOut: () => void;
  clearError: () => void;
};

export const createAuthStore = (stateStorage: StateStorage = appZustandMMKVStorage) =>
  create<AuthStore>()(
    persist(
      (set) => ({
        session: null,
        hasHydrated: false,
        lastError: null,
        signInTherapist: (input) => {
          const result = signInTherapistDemo(input);
          if (!result.success) {
            set({ lastError: result.error });
            return result;
          }
          set({ session: result.data, lastError: null });
          return result;
        },
        continueTherapistDemo: () => {
          const result = continueAsTherapistDemo();
          if (!result.success) {
            set({ lastError: result.error });
            return result;
          }
          set({ session: result.data, lastError: null });
          return result;
        },
        joinPatient: (input) => {
          const result = joinAsPatientDemo(input);
          if (!result.success) {
            set({ lastError: result.error });
            return result;
          }
          set({ session: result.data, lastError: null });
          return result;
        },
        signOut: () => set({ session: null, lastError: null }),
        clearError: () => set({ lastError: null }),
      }),
      {
        name: 'auth-session-demo',
        storage: createJSONStorage(() => stateStorage),
        partialize: (state) => ({ session: state.session }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          state.lastError = null;
          state.hasHydrated = true;
        },
      },
    ),
  );

export const useAuthStore = createAuthStore();

useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.setState({ hasHydrated: true });
});
