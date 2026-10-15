import { Platform } from 'react-native';

import type { Result } from '@/types/result';
import type { UserRole } from '@/types/auth';

export type MeResponse = {
  id: string;
  email: string | null;
  role: UserRole;
};

export type ApiClientDeps = {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
};

const defaultBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_DEMO_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  // Android emulator loopback; iOS simulator / others use localhost.
  if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
};

export const resolveDemoApiBaseUrl = defaultBaseUrl;

export const createApiClient = (deps: ApiClientDeps) => {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = deps.baseUrl.replace(/\/$/, '');

  const getMe = async (): Promise<Result<MeResponse>> => {
    const token = await deps.getToken();
    if (!token) {
      return { success: false, error: 'Not signed in.' };
    }

    try {
      const res = await fetchImpl(`${base}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => null)) as
        | MeResponse
        | { ok?: false; error?: string }
        | null;

      if (res.status === 401) {
        const code =
          body && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'auth_invalid';
        return { success: false, error: code };
      }

      if (!res.ok || !body || !('id' in body) || !('role' in body)) {
        return { success: false, error: "Can't reach server. Try again." };
      }

      if (body.role !== 'therapist' && body.role !== 'patient') {
        return { success: false, error: 'auth_invalid' };
      }

      return {
        success: true,
        data: {
          id: body.id,
          email: body.email ?? null,
          role: body.role,
        },
      };
    } catch {
      return { success: false, error: "Can't reach server. Try again." };
    }
  };

  return { getMe };
};

export type ApiClient = ReturnType<typeof createApiClient>;
