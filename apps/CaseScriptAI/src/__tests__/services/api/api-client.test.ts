import { createApiClient } from '@/services/api/api-client';

describe('api-client getMe', () => {
  it('returns MeResponse on 200', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: async () => 'tok',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            id: 'u1',
            email: 'ada@clinic.com',
            role: 'therapist',
          }),
          { status: 200 },
        ),
    });
    const result = await client.getMe();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('therapist');
      expect(result.data.id).toBe('u1');
    }
  });

  it('maps 401 to auth error and signs caller should clear session', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: async () => 'tok',
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false, error: 'auth_invalid' }), {
          status: 401,
        }),
    });
    const result = await client.getMe();
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('auth_invalid');
  });

  it('fails when token is missing', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      getToken: async () => null,
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });
    const result = await client.getMe();
    expect(result.success).toBe(false);
  });
});
