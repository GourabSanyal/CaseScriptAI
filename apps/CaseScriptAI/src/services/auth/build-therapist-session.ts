import type { AuthSession, UserRole } from '@/types/auth';

type BuildTherapistSessionInput = {
  displayName: string;
  token: string;
  /** Must come from `GET /me` (DB), never from the client form. */
  role: UserRole;
  userId?: string;
};

/** Therapist session after Clerk + `/me`. Role is server-sourced. */
export const buildTherapistSession = (
  input: BuildTherapistSessionInput,
): AuthSession => ({
  role: input.role,
  displayName: input.displayName.trim() || 'Therapist',
  token: input.token,
  userId: input.userId,
  createdAt: Date.now(),
});

export const displayNameFromClerkUser = (user: {
  fullName?: string | null;
  firstName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
}): string =>
  user.fullName?.trim() ||
  user.firstName?.trim() ||
  user.primaryEmailAddress?.emailAddress ||
  'Therapist';
