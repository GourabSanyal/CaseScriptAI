import {
  buildTherapistSession,
  displayNameFromClerkUser,
} from '@/services/auth/build-therapist-session';

describe('buildTherapistSession', () => {
  it('always assigns therapist role', () => {
    const session = buildTherapistSession({
      displayName: 'Ada',
      token: 'tok',
    });
    expect(session.role).toBe('therapist');
    expect(session.displayName).toBe('Ada');
    expect(session.token).toBe('tok');
  });

  it('falls back display name from Clerk fields', () => {
    expect(
      displayNameFromClerkUser({
        fullName: null,
        firstName: null,
        primaryEmailAddress: { emailAddress: 'ada@clinic.com' },
      }),
    ).toBe('ada@clinic.com');
  });
});
