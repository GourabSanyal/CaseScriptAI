import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extractMultipartAudio } from '../audio/parse-multipart-audio.js';
import {
  DEMO_AUDIO_MAX_BYTES,
  validateDemoAudio,
} from '../audio/validate-demo-audio.js';
import { extractClientIp, hashClientIp } from './client-ip.js';
import {
  checkDemoAccessKey,
  extractDemoAccessKey,
} from './demo-access-key.js';
import {
  checkDemoRateLimit,
  type RateLimitStore,
} from './rate-limit.js';
import { readRequestBody } from './read-request-body.js';
import type { DemoSessionStarter } from '../pipeline/demo-session-starter.js';

const DEMO_BODY_MAX_BYTES = DEMO_AUDIO_MAX_BYTES + 64 * 1024;

export type DemoStartRouteDeps = {
  startDemoSession?: DemoSessionStarter;
  demoAccessKey?: string;
  ipHashSalt?: string;
  rateLimitStore?: RateLimitStore;
  tryAcquirePipeline?: () => boolean;
  releasePipeline?: () => void;
  sendJson: (res: ServerResponse, status: number, body: unknown) => void;
};

export const handleDemoStart = async (
  req: IncomingMessage,
  res: ServerResponse,
  deps: DemoStartRouteDeps,
  searchParams: URLSearchParams,
): Promise<void> => {
  if (!deps.startDemoSession) {
    deps.sendJson(res, 503, { ok: false, error: 'demo_unavailable' });
    return;
  }

  const access = checkDemoAccessKey(
    extractDemoAccessKey(req, searchParams),
    deps.demoAccessKey,
  );
  if (access === 'demo_key_required') {
    deps.sendJson(res, 401, { ok: false, error: 'demo_key_required' });
    return;
  }

  const salt = deps.ipHashSalt ?? 'dev-ip-salt';
  const ipHash = hashClientIp(extractClientIp(req), salt);

  if (deps.rateLimitStore) {
    const limit = await checkDemoRateLimit(deps.rateLimitStore, ipHash);
    if (limit === 'rate_limited') {
      deps.sendJson(res, 429, { ok: false, error: 'rate_limited' });
      return;
    }
  }

  let uploadBytes: Buffer | undefined;
  let uploadFormat: 'wav' | 'mp3' | undefined;
  const contentType = req.headers['content-type'] ?? '';
  if (/multipart\/form-data/i.test(contentType)) {
    const body = await readRequestBody(req, DEMO_BODY_MAX_BYTES);
    if (!body.ok) {
      deps.sendJson(res, 413, { ok: false, error: body.error });
      return;
    }
    const fileBytes = extractMultipartAudio(body.bytes, contentType);
    if (!fileBytes) {
      deps.sendJson(res, 400, { ok: false, error: 'audio_missing' });
      return;
    }
    const validated = validateDemoAudio(fileBytes);
    if (!validated.ok) {
      const status = validated.error === 'audio_too_large' ? 413 : 400;
      deps.sendJson(res, status, { ok: false, error: validated.error });
      return;
    }
    uploadBytes = fileBytes;
    uploadFormat = validated.format;
  }

  if (deps.tryAcquirePipeline && !deps.tryAcquirePipeline()) {
    deps.sendJson(res, 503, { ok: false, error: 'busy' });
    return;
  }

  let audioPath: string | undefined;
  if (uploadBytes && uploadFormat) {
    try {
      const dir = await mkdtemp(path.join(tmpdir(), 'csai-demo-audio-'));
      audioPath = path.join(dir, `upload.${uploadFormat}`);
      await writeFile(audioPath, uploadBytes);
    } catch {
      deps.releasePipeline?.();
      deps.sendJson(res, 500, { ok: false, error: 'request_failed' });
      return;
    }
  }

  try {
    const started = await deps.startDemoSession({
      clientIpHash: ipHash,
      audioPath,
    });
    deps.sendJson(res, 202, started);
  } catch (err) {
    deps.releasePipeline?.();
    throw err;
  }
};
