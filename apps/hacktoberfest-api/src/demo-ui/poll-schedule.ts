/** Demo page poll cadence (H6U.4) — mirrored in `public/index.html`. */
export const POLL_MAX_WAIT_MS = 180_000;
export const WAKE_TIMEOUT_MS = 90_000;
export const WAKE_RETRY_GAP_MS = 2_000;
export const COLD_START_NOTICE_MS = 3_000;
/** Consecutive fetch failures before the UI stops and asks for Retry. */
export const NETWORK_FAIL_LIMIT = 3;

/**
 * Delay after poll `completedPolls` (0-based count of finished attempts).
 * 1s × 5, then 2s × 10, then 5s.
 */
export const nextPollDelayMs = (completedPolls: number): number => {
  if (completedPolls < 5) return 1_000;
  if (completedPolls < 15) return 2_000;
  return 5_000;
};

export const isPollTimedOut = (
  elapsedMs: number,
  maxMs: number = POLL_MAX_WAIT_MS,
): boolean => elapsedMs >= maxMs;
