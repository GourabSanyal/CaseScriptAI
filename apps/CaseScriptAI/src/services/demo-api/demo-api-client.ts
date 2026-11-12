import {
  isPollTimedOut,
  NETWORK_FAIL_LIMIT,
  nextPollDelayMs,
  POLL_MAX_WAIT_MS,
} from '@/services/demo-api/poll-schedule';
import { resolveDemoApiBaseUrl } from '@/services/api/api-client';
import type { Result } from '@/types/result';

export type PublicDemoSession = {
  id: string;
  status: string;
  error: string | null;
  pdfUrl: string | null;
};

export type DemoApiClientDeps = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  demoAccessKey?: string;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const authHeaders = (demoAccessKey?: string): HeadersInit => {
  const key = demoAccessKey?.trim() || process.env.EXPO_PUBLIC_DEMO_ACCESS_KEY?.trim();
  return key ? { 'x-demo-key': key } : {};
};

export const createDemoApiClient = (deps: DemoApiClientDeps = {}) => {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = (deps.baseUrl ?? resolveDemoApiBaseUrl()).replace(/\/$/, '');
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? Date.now;
  const headers = authHeaders(deps.demoAccessKey);

  const startDemo = async (): Promise<Result<{ id: string; status: string }>> => {
    try {
      const res = await fetchImpl(`${base}/sessions/demo`, {
        method: 'POST',
        headers,
      });
      const body = (await res.json().catch(() => null)) as
        | { id?: string; status?: string; error?: string }
        | null;
      if (!res.ok) {
        return {
          success: false,
          error: body?.error ?? `start_failed_${res.status}`,
        };
      }
      if (!body?.id || !body.status) {
        return { success: false, error: 'start_failed' };
      }
      return { success: true, data: { id: body.id, status: body.status } };
    } catch {
      return { success: false, error: 'network' };
    }
  };

  const getSession = async (id: string): Promise<Result<PublicDemoSession>> => {
    try {
      const res = await fetchImpl(`${base}/sessions/${id}`);
      const body = (await res.json().catch(() => null)) as
        | PublicDemoSession
        | { error?: string }
        | null;
      if (!res.ok) {
        return {
          success: false,
          error:
            body && 'error' in body && typeof body.error === 'string'
              ? body.error
              : 'status_failed',
        };
      }
      if (!body || !('id' in body) || !('status' in body)) {
        return { success: false, error: 'status_failed' };
      }
      return {
        success: true,
        data: {
          id: body.id,
          status: body.status,
          error: body.error ?? null,
          pdfUrl: body.pdfUrl ?? null,
        },
      };
    } catch {
      return { success: false, error: 'network' };
    }
  };

  const pollUntilReady = async (
    id: string,
    onTick?: (session: PublicDemoSession) => void,
  ): Promise<Result<PublicDemoSession>> => {
    const started = now();
    let completed = 0;
    let networkFails = 0;

    while (!isPollTimedOut(now() - started, POLL_MAX_WAIT_MS)) {
      const result = await getSession(id);
      if (!result.success) {
        if (result.error === 'network') {
          networkFails += 1;
          if (networkFails >= NETWORK_FAIL_LIMIT) {
            return { success: false, error: 'network' };
          }
        } else {
          return result;
        }
      } else {
        networkFails = 0;
        onTick?.(result.data);
        if (result.data.status === 'failed') {
          return {
            success: false,
            error: result.data.error ?? 'failed',
          };
        }
        if (result.data.status === 'ready' && result.data.pdfUrl) {
          return result;
        }
      }
      await sleep(nextPollDelayMs(completed));
      completed += 1;
    }
    return { success: false, error: 'poll_timeout' };
  };

  return { startDemo, getSession, pollUntilReady, baseUrl: base };
};

export type DemoApiClient = ReturnType<typeof createDemoApiClient>;
