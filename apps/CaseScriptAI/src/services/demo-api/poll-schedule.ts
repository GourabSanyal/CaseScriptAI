/** Same cadence as hacktoberfest-api demo UI (H6U.4 / H8.7). */
export const POLL_MAX_WAIT_MS = 180_000;
export const NETWORK_FAIL_LIMIT = 3;

export const nextPollDelayMs = (completedPolls: number): number => {
  if (completedPolls < 5) return 1_000;
  if (completedPolls < 15) return 2_000;
  return 5_000;
};

export const isPollTimedOut = (
  elapsedMs: number,
  maxMs: number = POLL_MAX_WAIT_MS,
): boolean => elapsedMs >= maxMs;
