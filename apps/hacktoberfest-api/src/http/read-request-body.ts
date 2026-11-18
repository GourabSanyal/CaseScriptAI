import type { IncomingMessage } from 'node:http';

/** Buffer the request body up to `maxBytes` (inclusive). */
export const readRequestBody = async (
  req: IncomingMessage,
  maxBytes: number,
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: 'audio_too_large' }> => {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      req.resume();
      return { ok: false, error: 'audio_too_large' };
    }
    chunks.push(buf);
  }

  return { ok: true, bytes: Buffer.concat(chunks, total) };
};
