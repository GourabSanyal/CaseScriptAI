import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export type DemoAccessResult = 'ok' | 'demo_key_required';

/**
 * Optional gate for POST /sessions/demo (H6.9).
 * When `expected` is unset/empty, the endpoint stays open (public contest demo).
 */
export const checkDemoAccessKey = (
  provided: string | null | undefined,
  expected: string | undefined,
): DemoAccessResult => {
  const want = expected?.trim();
  if (!want) return 'ok';

  const got = provided?.trim() ?? '';
  if (!got) return 'demo_key_required';

  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length) return 'demo_key_required';
  return timingSafeEqual(a, b) ? 'ok' : 'demo_key_required';
};

export const extractDemoAccessKey = (
  req: IncomingMessage,
  searchParams: URLSearchParams,
): string | undefined => {
  const headerRaw = req.headers['x-demo-key'];
  const fromHeader = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (fromHeader?.trim()) return fromHeader.trim();

  const fromQuery =
    searchParams.get('demoKey')?.trim() || searchParams.get('key')?.trim();
  return fromQuery || undefined;
};
