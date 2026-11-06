import type { ServerResponse } from 'node:http';
import type { DemoSession } from '../db/session-repository.js';
import { validateStructuredNote } from '../domain/structured-note.js';
import type { StructuredNote } from '../domain/structured-note.js';

export type NoteRouteDeps = {
  getSessionById?: (id: string) => Promise<DemoSession | null>;
  sendJson: (res: ServerResponse, status: number, body: unknown) => void;
};

/** SOAP sections only — never transcript. Invalid or missing note → null. */
export const toPublicNote = (noteJson: unknown): StructuredNote | null => {
  if (noteJson == null) return null;
  const raw = typeof noteJson === 'string' ? noteJson : JSON.stringify(noteJson);
  const result = validateStructuredNote(raw);
  return result.ok ? result.note : null;
};

export const handleGetNote = async (
  res: ServerResponse,
  sessionId: string,
  deps: NoteRouteDeps,
): Promise<void> => {
  if (!deps.getSessionById) {
    deps.sendJson(res, 503, { ok: false, error: 'sessions_unavailable' });
    return;
  }

  const session = await deps.getSessionById(sessionId);
  if (!session) {
    deps.sendJson(res, 404, { ok: false, error: 'session_not_found' });
    return;
  }

  const note = toPublicNote(session.noteJson);
  if (!note) {
    deps.sendJson(res, 404, { ok: false, error: 'note_not_ready' });
    return;
  }

  deps.sendJson(res, 200, note);
};
