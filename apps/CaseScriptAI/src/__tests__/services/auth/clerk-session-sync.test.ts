import { shouldClearTherapistOnClerkSignOut } from '@/services/auth/clerk-session-sync';

describe('shouldClearTherapistOnClerkSignOut', () => {
  it('clears Clerk-backed therapist when signed out', () => {
    expect(
      shouldClearTherapistOnClerkSignOut({
        role: 'therapist',
        displayName: 'Ada',
        token: 'clerk-jwt',
        createdAt: 1,
      }),
    ).toBe(true);
  });

  it('keeps demo therapist and patient sessions', () => {
    expect(
      shouldClearTherapistOnClerkSignOut({
        role: 'therapist',
        displayName: 'Demo',
        token: 'demo-therapist-x',
        createdAt: 1,
      }),
    ).toBe(false);
    expect(
      shouldClearTherapistOnClerkSignOut({
        role: 'patient',
        displayName: 'Pat',
        token: 'demo-patient-x',
        createdAt: 1,
      }),
    ).toBe(false);
  });
});
