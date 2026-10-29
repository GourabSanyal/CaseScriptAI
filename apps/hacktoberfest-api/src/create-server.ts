import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VerifyClerkToken } from './auth/verify-clerk-token.js';
import type { DemoSession } from './db/session-repository.js';
import type { AppUser, UpsertUserInput } from './db/user-repository.js';
import { packageRoot } from './db/env.js';
import { extractClientIp, hashClientIp } from './http/client-ip.js';
import {
  checkDemoAccessKey,
  extractDemoAccessKey,
} from './http/demo-access-key.js';
import { handleGetMe } from './http/me-route.js';
import {
  checkDemoRateLimit,
  type RateLimitStore,
} from './http/rate-limit.js';
import { withSecurityHeaders } from './http/security-headers.js';
import { toPublicSession } from './http/session-view.js';
import type { DemoSessionStarter } from './pipeline/demo-session-starter.js';

export type ServerDeps = {
  getSessionById?: (id: string) => Promise<DemoSession | null>;
  readPdfBytes?: (session: DemoSession) => Promise<Buffer | null>;
  startDemoSession?: DemoSessionStarter;
  publicBaseUrl?: string;
  verifyClerkToken?: VerifyClerkToken;
  upsertUserByClerkId?: (input: UpsertUserInput) => Promise<AppUser>;
  ipHashSalt?: string;
  rateLimitStore?: RateLimitStore;
  tryAcquirePipeline?: () => boolean;
  demoAccessKey?: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(
    status,
    withSecurityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    }),
  );
  res.end(payload);
}

function sendPdf(res: ServerResponse, bytes: Buffer, sessionId: string): void {
  res.writeHead(
    200,
    withSecurityHeaders({
      'Content-Type': 'application/pdf',
      'Content-Length': bytes.length,
      'Content-Disposition': `attachment; filename="session-${sessionId}.pdf"`,
    }),
  );
  res.end(bytes);
}

const SESSION_ID =
  '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';
const SESSION_PDF_PATH = new RegExp(`^/sessions/${SESSION_ID}/pdf$`, 'i');
const SESSION_PATH = new RegExp(`^/sessions/${SESSION_ID}$`, 'i');

async function handleSessionPdf(
  res: ServerResponse,
  sessionId: string,
  deps: ServerDeps,
): Promise<void> {
  if (!deps.getSessionById || !deps.readPdfBytes) {
    sendJson(res, 503, { ok: false, error: 'pdf_unavailable' });
    return;
  }
  const session = await deps.getSessionById(sessionId);
  if (!session) {
    sendJson(res, 404, { ok: false, error: 'session_not_found' });
    return;
  }
  const bytes = await deps.readPdfBytes(session);
  if (!bytes) {
    sendJson(res, 404, { ok: false, error: 'pdf_not_ready' });
    return;
  }
  sendPdf(res, bytes, sessionId);
}

async function handleGetSession(
  res: ServerResponse,
  sessionId: string,
  deps: ServerDeps,
): Promise<void> {
  if (!deps.getSessionById) {
    sendJson(res, 503, { ok: false, error: 'sessions_unavailable' });
    return;
  }
  const session = await deps.getSessionById(sessionId);
  if (!session) {
    sendJson(res, 404, { ok: false, error: 'session_not_found' });
    return;
  }
  const base = deps.publicBaseUrl ?? 'http://localhost';
  sendJson(res, 200, toPublicSession(session, base));
}

async function handleDemoStart(
  req: IncomingMessage,
  res: ServerResponse,
  deps: ServerDeps,
  searchParams: URLSearchParams,
): Promise<void> {
  if (!deps.startDemoSession) {
    sendJson(res, 503, { ok: false, error: 'demo_unavailable' });
    return;
  }

  const access = checkDemoAccessKey(
    extractDemoAccessKey(req, searchParams),
    deps.demoAccessKey,
  );
  if (access === 'demo_key_required') {
    sendJson(res, 401, { ok: false, error: 'demo_key_required' });
    return;
  }

  const salt = deps.ipHashSalt ?? 'dev-ip-salt';
  const ipHash = hashClientIp(extractClientIp(req), salt);

  if (deps.rateLimitStore) {
    const limit = await checkDemoRateLimit(deps.rateLimitStore, ipHash);
    if (limit === 'rate_limited') {
      sendJson(res, 429, { ok: false, error: 'rate_limited' });
      return;
    }
  }

  if (deps.tryAcquirePipeline && !deps.tryAcquirePipeline()) {
    sendJson(res, 503, { ok: false, error: 'busy' });
    return;
  }

  const started = await deps.startDemoSession({ clientIpHash: ipHash });
  sendJson(res, 202, started);
}

async function handleDemoUi(res: ServerResponse): Promise<void> {
  const htmlPath = path.join(packageRoot, 'public', 'index.html');
  const html = await readFile(htmlPath);
  res.writeHead(
    200,
    withSecurityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.length,
    }),
  );
  res.end(html);
}

export function createServer(deps: ServerDeps = {}): http.Server {
  return http.createServer((req, res) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const fail = () => sendJson(res, 500, { ok: false, error: 'request_failed' });

    if (method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'GET' && url.pathname === '/me') {
      if (!deps.verifyClerkToken || !deps.upsertUserByClerkId) {
        sendJson(res, 503, { ok: false, error: 'auth_unavailable' });
        return;
      }
      void handleGetMe(req as IncomingMessage, res, {
        verifyClerkToken: deps.verifyClerkToken,
        upsertUserByClerkId: deps.upsertUserByClerkId,
        sendJson,
      }).catch(fail);
      return;
    }

    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/demo')) {
      void handleDemoUi(res).catch(fail);
      return;
    }

    if (method === 'POST' && url.pathname === '/sessions/demo') {
      void handleDemoStart(req, res, deps, url.searchParams).catch(fail);
      return;
    }

    const sessionMatch = url.pathname.match(SESSION_PATH);
    if (method === 'GET' && sessionMatch) {
      void handleGetSession(res, sessionMatch[1], deps).catch(fail);
      return;
    }

    const pdfMatch = url.pathname.match(SESSION_PDF_PATH);
    if (method === 'GET' && pdfMatch) {
      void handleSessionPdf(res, pdfMatch[1], deps).catch(fail);
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not_found' });
  });
}
