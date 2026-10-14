import {
  buildTherapistSession,
  displayNameFromClerkUser,
} from '@/services/auth/build-therapist-session';

describe('buildTherapistSession', () => {
  it('uses server role and userId from /me', () => {
    const session = buildTherapistSession({
      displayName: 'Ada',
      token: 'tok',
      role: 'therapist',
      userId: 'uuid-1',
    });
    expect(session.role).toBe('therapist');
    expect(session.displayName).toBe('Ada');
    expect(session.token).toBe('tok');
    expect(session.userId).toBe('uuid-1');
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
