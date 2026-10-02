import type { DbPool } from './client.js';
import {
  assertTransition,
  isSessionStatus,
  type SessionStatus,
} from '../domain/session-status.js';

export type DemoSession = {
  id: string;
  status: SessionStatus;
  transcript: string | null;
  noteJson: unknown | null;
  pdfPath: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionPatch = {
  transcript?: string | null;
  noteJson?: unknown | null;
  pdfPath?: string | null;
  error?: string | null;
};

type SessionRow = {
  id: string;
  status: string;
  transcript: string | null;
  note_json: unknown | null;
  pdf_path: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

const mapRow = (row: SessionRow): DemoSession => {
  if (!isSessionStatus(row.status)) {
    throw new Error(`invalid_session_status:${row.status}`);
  }
  return {
    id: row.id,
    status: row.status,
    transcript: row.transcript,
    noteJson: row.note_json,
    pdfPath: row.pdf_path,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const createSessionRepository = (pool: DbPool) => {
  const createSession = async (): Promise<DemoSession> => {
    const result = await pool.query<SessionRow>(
      `INSERT INTO demo_sessions (status)
       VALUES ('queued')
       RETURNING id, status, transcript, note_json, pdf_path, error, created_at, updated_at`,
    );
    return mapRow(result.rows[0]);
  };

  const getById = async (id: string): Promise<DemoSession | null> => {
    const result = await pool.query<SessionRow>(
      `SELECT id, status, transcript, note_json, pdf_path, error, created_at, updated_at
       FROM demo_sessions WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  };

  const updateStatus = async (
    id: string,
    next: SessionStatus,
    patch: SessionPatch = {},
  ): Promise<DemoSession> => {
    const current = await getById(id);
    if (!current) {
      throw new Error(`session_not_found:${id}`);
    }
    assertTransition(current.status, next);

    const result = await pool.query<SessionRow>(
      `UPDATE demo_sessions SET
         status = $2,
         transcript = COALESCE($3, transcript),
         note_json = COALESCE($4::jsonb, note_json),
         pdf_path = COALESCE($5, pdf_path),
         error = COALESCE($6, error),
         updated_at = now()
       WHERE id = $1
       RETURNING id, status, transcript, note_json, pdf_path, error, created_at, updated_at`,
      [
        id,
        next,
        patch.transcript === undefined ? null : patch.transcript,
        patch.noteJson === undefined ? null : JSON.stringify(patch.noteJson),
        patch.pdfPath === undefined ? null : patch.pdfPath,
        patch.error === undefined ? null : patch.error,
      ],
    );
    return mapRow(result.rows[0]);
  };

  return { createSession, getById, updateStatus };
};

export type SessionRepository = ReturnType<typeof createSessionRepository>;
