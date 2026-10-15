import { useClerk, useSSO } from '@clerk/expo';
import * as AuthSession from 'expo-auth-session';
import { useState } from 'react';

import { establishTherapistFromMe } from '@/services/auth/establish-therapist-from-me';
import { useAuthStore } from '@/stores/auth-store';
import type { Result } from '@/types/result';

const redirectUrl = AuthSession.makeRedirectUri({
  scheme: 'casescriptai',
  path: 'sso-callback',
});

export const useTherapistGoogleSignIn = () => {
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  const establishSession = useAuthStore((s) => s.establishSession);
  const signOutLocal = useAuthStore((s) => s.signOut);
  const setLastError = useAuthStore((s) => s.setLastError);
  const clearError = useAuthStore((s) => s.clearError);
  const [isBusy, setIsBusy] = useState(false);

  const signInWithGoogle = async (): Promise<Result<void>> => {
    clearError();
    setIsBusy(true);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      if (authSessionResult && authSessionResult.type !== 'success') {
        return { success: true, data: undefined };
      }

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }

      const token = await clerk.session?.getToken();
      const user = clerk.user;
      if (!token || !user) {
        const error = "Google sign-in finished, but we couldn't start a session.";
        setLastError(error);
        return { success: false, error };
      }

      const established = await establishTherapistFromMe({
        token,
        user,
        getToken: async () => clerk.session?.getToken() ?? token,
      });

      if (!established.success) {
        if (
          established.error === 'auth_invalid' ||
          established.error === 'auth_missing'
        ) {
          try {
            await clerk.signOut();
          } catch {
            // Local clear below is enough if Clerk is already gone.
          }
          signOutLocal();
        }
        setLastError(established.error);
        return { success: false, error: established.error };
      }

      establishSession(established.data);
      return { success: true, data: undefined };
    } catch (err) {
      const error =
        err instanceof Error ? err.message : 'Google sign-in failed. Try again.';
      setLastError(error);
      return { success: false, error };
    } finally {
      setIsBusy(false);
    }
  };

  return { signInWithGoogle, isBusy };
};
