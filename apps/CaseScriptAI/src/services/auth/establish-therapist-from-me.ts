import {
  createApiClient,
  resolveDemoApiBaseUrl,
} from '@/services/api/api-client';
import {
  buildTherapistSession,
  displayNameFromClerkUser,
} from '@/services/auth/build-therapist-session';
import type { AuthSession } from '@/types/auth';
import type { Result } from '@/types/result';

type ClerkUserLike = {
  fullName?: string | null;
  firstName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
};

type EstablishInput = {
  token: string;
  user: ClerkUserLike;
  getToken?: () => Promise<string | null>;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

/**
 * After Google SSO: call `GET /me` so role/userId come from Postgres.
 */
export const establishTherapistFromMe = async (
  input: EstablishInput,
): Promise<Result<AuthSession>> => {
  const client = createApiClient({
    baseUrl: input.apiBaseUrl ?? resolveDemoApiBaseUrl(),
    getToken: input.getToken ?? (async () => input.token),
    fetchImpl: input.fetchImpl,
  });

  const me = await client.getMe();
  if (!me.success) {
    return me;
  }

  if (me.data.role !== 'therapist') {
    return { success: false, error: 'auth_invalid' };
  }

  return {
    success: true,
    data: buildTherapistSession({
      displayName:
        displayNameFromClerkUser(input.user) ||
        me.data.email ||
        'Therapist',
      token: input.token,
      role: me.data.role,
      userId: me.data.id,
    }),
  };
};
