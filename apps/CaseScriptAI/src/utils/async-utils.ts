/**
 * Utility for polling a condition with exponential backoff.
 */
export const waitForCondition = async (
  conditionFn: () => boolean,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    onAttempt?: (attempt: number) => void;
  } = {}
): Promise<boolean> => {
  const {
    maxAttempts = 300,
    initialDelay = 100,
    maxDelay = 1000,
    onAttempt,
  } = options;

  let attempts = 0;
  let delay = initialDelay;

  while (!conditionFn() && attempts < maxAttempts) {
    if (onAttempt) onAttempt(attempts);
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, maxDelay);
    attempts++;
  }

  return conditionFn();
};
