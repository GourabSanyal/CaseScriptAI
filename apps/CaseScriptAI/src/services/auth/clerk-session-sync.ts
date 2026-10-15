import type { AuthSession } from '@/types/auth';

/** Clear local therapist only when Clerk session ended (not demo/patient). */
export const shouldClearTherapistOnClerkSignOut = (
  session: AuthSession | null,
): boolean =>
  Boolean(
    session &&
      session.role === 'therapist' &&
      !session.token.startsWith('demo-'),
  );
