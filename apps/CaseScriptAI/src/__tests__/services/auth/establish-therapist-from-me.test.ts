import { establishTherapistFromMe } from '@/services/auth/establish-therapist-from-me';

describe('establishTherapistFromMe', () => {
  it('builds therapist session from /me role', async () => {
    const result = await establishTherapistFromMe({
      token: 'clerk-jwt',
      user: { fullName: 'Ada Lovelace' },
      apiBaseUrl: 'http://api.test',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            id: 'user-row-1',
            email: 'ada@clinic.com',
            role: 'therapist',
          }),
          { status: 200 },
        ),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('therapist');
      expect(result.data.userId).toBe('user-row-1');
      expect(result.data.displayName).toBe('Ada Lovelace');
    }
  });

  it('returns auth_invalid on 401 so caller can sign out', async () => {
    const result = await establishTherapistFromMe({
      token: 'expired',
      user: { fullName: 'Ada' },
      apiBaseUrl: 'http://api.test',
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false, error: 'auth_invalid' }), {
          status: 401,
        }),
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('auth_invalid');
  });
});
