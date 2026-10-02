import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DemoSession } from './db/session-repository.js';
import { packageRoot } from './db/env.js';
import { toPublicSession } from './http/session-view.js';
import type { DemoSessionStarter } from './pipeline/demo-session-starter.js';

export type ServerDeps = {
  /** Demo: open access — no authz. */
  getSessionById?: (id: string) => Promise<DemoSession | null>;
  readPdfBytes?: (session: DemoSession) => Promise<Buffer | null>;
  startDemoSession?: DemoSessionStarter;
  publicBaseUrl?: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendPdf(res: ServerResponse, bytes: Buffer, sessionId: string): void {
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Length': bytes.length,
    'Content-Disposition': `attachment; filename="session-${sessionId}.pdf"`,
  });
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
  res: ServerResponse,
  deps: ServerDeps,
): Promise<void> {
  if (!deps.startDemoSession) {
    sendJson(res, 503, { ok: false, error: 'demo_unavailable' });
    return;
  }
  const started = await deps.startDemoSession();
  sendJson(res, 202, started);
}

async function handleDemoUi(res: ServerResponse): Promise<void> {
  const htmlPath = path.join(packageRoot, 'public', 'index.html');
  const html = await readFile(htmlPath);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': html.length,
  });
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

    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/demo')) {
      void handleDemoUi(res).catch(fail);
      return;
    }

    if (method === 'POST' && url.pathname === '/sessions/demo') {
      void handleDemoStart(res, deps).catch(fail);
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
