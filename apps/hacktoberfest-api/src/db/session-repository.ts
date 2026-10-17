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
  pdfBytes: Buffer | null;
  clientIpHash: string | null;
  attempt: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SessionPatch = {
  transcript?: string | null;
  noteJson?: unknown | null;
  pdfPath?: string | null;
  pdfBytes?: Buffer | null;
  error?: string | null;
};

export type CreateSessionInput = {
  clientIpHash?: string | null;
};

type SessionRow = {
  id: string;
  status: string;
  transcript: string | null;
  note_json: unknown | null;
  pdf_path: string | null;
  pdf_bytes: Buffer | null;
  client_ip_hash: string | null;
  attempt: number;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

const SELECT_COLS = `id, status, transcript, note_json, pdf_path, pdf_bytes,
  client_ip_hash, attempt, error, created_at, updated_at`;

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
    pdfBytes: row.pdf_bytes ?? null,
    clientIpHash: row.client_ip_hash,
    attempt: row.attempt ?? 1,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const createSessionRepository = (pool: DbPool) => {
  const createSession = async (
    input: CreateSessionInput = {},
  ): Promise<DemoSession> => {
    const result = await pool.query<SessionRow>(
      `INSERT INTO demo_sessions (status, client_ip_hash)
       VALUES ('queued', $1)
       RETURNING ${SELECT_COLS}`,
      [input.clientIpHash ?? null],
    );
    return mapRow(result.rows[0]);
  };

  const getById = async (id: string): Promise<DemoSession | null> => {
    const result = await pool.query<SessionRow>(
      `SELECT ${SELECT_COLS} FROM demo_sessions WHERE id = $1`,
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
         pdf_bytes = COALESCE($6, pdf_bytes),
         error = COALESCE($7, error),
         updated_at = now()
       WHERE id = $1
       RETURNING ${SELECT_COLS}`,
      [
        id,
        next,
        patch.transcript === undefined ? null : patch.transcript,
        patch.noteJson === undefined ? null : JSON.stringify(patch.noteJson),
        patch.pdfPath === undefined ? null : patch.pdfPath,
        patch.pdfBytes === undefined ? null : patch.pdfBytes,
        patch.error === undefined ? null : patch.error,
      ],
    );
    return mapRow(result.rows[0]);
  };

  const setPdfBytes = async (
    id: string,
    pdfBytes: Buffer,
  ): Promise<DemoSession> => {
    const result = await pool.query<SessionRow>(
      `UPDATE demo_sessions SET
         pdf_bytes = $2,
         pdf_path = NULL,
         updated_at = now()
       WHERE id = $1
       RETURNING ${SELECT_COLS}`,
      [id, pdfBytes],
    );
    if (!result.rows[0]) throw new Error(`session_not_found:${id}`);
    return mapRow(result.rows[0]);
  };

  const countStartsByIpHash = async (
    ipHash: string,
    since: Date,
  ): Promise<number> => {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM demo_sessions
       WHERE client_ip_hash = $1 AND created_at >= $2`,
      [ipHash, since],
    );
    return Number(result.rows[0]?.count ?? 0);
  };

  const countStartsGlobal = async (since: Date): Promise<number> => {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM demo_sessions
       WHERE created_at >= $1`,
      [since],
    );
    return Number(result.rows[0]?.count ?? 0);
  };

  return {
    createSession,
    getById,
    updateStatus,
    setPdfBytes,
    countStartsByIpHash,
    countStartsGlobal,
  };
};

export type SessionRepository = ReturnType<typeof createSessionRepository>;
