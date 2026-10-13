import { useAuth, useUser } from '@clerk/expo';
import { useEffect } from 'react';

import {
  buildTherapistSession,
  displayNameFromClerkUser,
} from '@/services/auth/build-therapist-session';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Keeps Zustand therapist session aligned with Clerk after cold start / token refresh.
 * Patient demo sessions are left alone. Roles still come from the API once H5A ships.
 */
export function ClerkSessionBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const session = useAuthStore((s) => s.session);
  const establishSession = useAuthStore((s) => s.establishSession);
  const signOutLocal = useAuthStore((s) => s.signOut);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      if (session?.role === 'therapist' && !session.token.startsWith('demo-')) {
        signOutLocal();
      }
      return;
    }

    let cancelled = false;
    const sync = async () => {
      const token = await getToken();
      if (cancelled || !token || !user) return;
      if (session?.token === token && session.role === 'therapist') return;
      establishSession(
        buildTherapistSession({
          displayName: displayNameFromClerkUser(user),
          token,
        }),
      );
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
    session?.role,
    session?.token,
    signOutLocal,
    user,
  ]);

  return null;
}
