import { useAuth, useUser } from '@clerk/expo';
import { useEffect } from 'react';

import { shouldClearTherapistOnClerkSignOut } from '@/services/auth/clerk-session-sync';
import { establishTherapistFromMe } from '@/services/auth/establish-therapist-from-me';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Keeps Zustand therapist session aligned with Clerk + server `/me` after cold start.
 * Patient demo sessions are left alone.
 */
export function ClerkSessionBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const session = useAuthStore((s) => s.session);
  const establishSession = useAuthStore((s) => s.establishSession);
  const signOutLocal = useAuthStore((s) => s.signOut);
  const setLastError = useAuthStore((s) => s.setLastError);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      if (shouldClearTherapistOnClerkSignOut(session)) {
        signOutLocal();
      }
      return;
    }

    let cancelled = false;
    const sync = async () => {
      const token = await getToken();
      if (cancelled || !token || !user) return;
      if (
        session?.token === token &&
        session.role === 'therapist' &&
        session.userId
      ) {
        return;
      }

      const established = await establishTherapistFromMe({
        token,
        user,
        getToken,
      });
      if (cancelled) return;

      if (!established.success) {
        if (
          established.error === 'auth_invalid' ||
          established.error === 'auth_missing'
        ) {
          signOutLocal();
          setLastError(established.error);
        }
        // Network blip: keep Clerk session; user can retry from login.
        return;
      }

      establishSession(established.data);
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [
    establishSession,
    getToken,
    isLoaded,
    isSignedIn,
    session,
    setLastError,
    signOutLocal,
    user,
  ]);

  return null;
}
