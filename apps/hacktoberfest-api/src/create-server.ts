import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DemoSession } from './db/session-repository.js';

export type ServerDeps = {
  /** Demo: open access — no authz. */
  getSessionById?: (id: string) => Promise<DemoSession | null>;
  readPdfBytes?: (session: DemoSession) => Promise<Buffer | null>;
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

const SESSION_PDF_PATH =
  /^\/sessions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/pdf$/i;

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

export function createServer(deps: ServerDeps = {}): http.Server {
  return http.createServer((req, res) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    const pdfMatch = url.pathname.match(SESSION_PDF_PATH);
    if (method === 'GET' && pdfMatch) {
      void handleSessionPdf(res, pdfMatch[1], deps).catch(() => {
        sendJson(res, 500, { ok: false, error: 'pdf_failed' });
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not_found' });
  });
}
