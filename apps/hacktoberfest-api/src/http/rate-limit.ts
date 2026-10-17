export const RATE_LIMIT_PER_IP_HOUR = 3;
export const RATE_LIMIT_GLOBAL_DAY = 50;

export type RateLimitCounts = {
  perIpHour: number;
  globalDay: number;
};

export type RateLimitResult = 'ok' | 'rate_limited';

export const evaluateRateLimit = (counts: RateLimitCounts): RateLimitResult => {
  if (counts.perIpHour >= RATE_LIMIT_PER_IP_HOUR) return 'rate_limited';
  if (counts.globalDay >= RATE_LIMIT_GLOBAL_DAY) return 'rate_limited';
  return 'ok';
};

export type RateLimitStore = {
  countStartsByIpHash: (ipHash: string, since: Date) => Promise<number>;
  countStartsGlobal: (since: Date) => Promise<number>;
};

export const checkDemoRateLimit = async (
  store: RateLimitStore,
  ipHash: string,
  now = new Date(),
): Promise<RateLimitResult> => {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [perIpHour, globalDay] = await Promise.all([
    store.countStartsByIpHash(ipHash, hourAgo),
    store.countStartsGlobal(dayAgo),
  ]);
  return evaluateRateLimit({ perIpHour, globalDay });
};
