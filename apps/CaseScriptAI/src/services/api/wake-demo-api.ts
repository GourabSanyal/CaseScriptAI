import { resolveDemoApiBaseUrl } from '@/services/api/api-client';
import type { Result } from '@/types/result';

export type WakeDemoApiResult = {
  /** True when the first successful /health took longer than the cold-start threshold. */
  wasColdStart: boolean;
  elapsedMs: number;
};

const COLD_START_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 90_000;
const RETRY_GAP_MS = 2_000;

type WakeOpts = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Hit GET /health until ok or timeout — wakes a sleeping Render free instance.
 */
export const wakeDemoApi = async (
  opts: WakeOpts = {},
): Promise<Result<WakeDemoApiResult>> => {
  const base = (opts.baseUrl ?? resolveDemoApiBaseUrl()).replace(/\/$/, '');
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? defaultSleep;
  const started = now();

  while (now() - started < timeoutMs) {
    try {
      const res = await fetchImpl(`${base}/health`);
      if (res.ok) {
        const elapsedMs = now() - started;
        return {
          success: true,
          data: {
            wasColdStart: elapsedMs >= COLD_START_MS,
            elapsedMs,
          },
        };
      }
    } catch {
      // Retry — cold start / network blip.
    }
    await sleep(RETRY_GAP_MS);
  }

  return {
    success: false,
    error: "Can't reach server. Check your connection or try again.",
  };
};
