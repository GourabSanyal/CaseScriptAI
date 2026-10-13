import type { AuthSession } from '@/types/auth';

type BuildTherapistSessionInput = {
  displayName: string;
  token: string;
};

/** Local therapist session until H5A `GET /me` is the role source. */
export const buildTherapistSession = (
  input: BuildTherapistSessionInput,
): AuthSession => ({
  role: 'therapist',
  displayName: input.displayName.trim() || 'Therapist',
  token: input.token,
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
