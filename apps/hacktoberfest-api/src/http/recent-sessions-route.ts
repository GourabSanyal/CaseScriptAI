import type { ServerResponse } from 'node:http';
import type { DemoSession } from '../db/session-repository.js';
import { toPublicSession } from './session-view.js';

export type RecentSessionsDeps = {
  listRecentSessions?: (limit: number) => Promise<DemoSession[]>;
  publicBaseUrl?: string;
  sendJson: (res: ServerResponse, status: number, body: unknown) => void;
};

/** H9.2 — newest demo sessions for the public page (no PHI fields). */
export const handleGetRecentSessions = async (
  res: ServerResponse,
  deps: RecentSessionsDeps,
  limit = 5,
): Promise<void> => {
  if (!deps.listRecentSessions) {
    deps.sendJson(res, 503, { ok: false, error: 'sessions_unavailable' });
    return;
  }
  const base = deps.publicBaseUrl ?? 'http://localhost';
  const rows = await deps.listRecentSessions(limit);
  deps.sendJson(res, 200, {
    sessions: rows.map((session) => toPublicSession(session, base)),
  });
};
