import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

/** First X-Forwarded-For hop, else socket remoteAddress. */
export const extractClientIp = (req: IncomingMessage): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || 'unknown';
  }
  return req.socket.remoteAddress ?? 'unknown';
};

/** Hash only — never store raw IP. */
export const hashClientIp = (ip: string, salt: string): string =>
  createHash('sha256').update(`${salt}${ip}`).digest('hex');
