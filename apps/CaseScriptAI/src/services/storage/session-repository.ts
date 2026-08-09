import type { Result } from '@/types/result';
import type { Session, SessionRepository, SessionSearchFilter } from '@/types/session';

const matches = (session: Session, filter?: SessionSearchFilter): boolean => {
  if (!filter) return true;
  if (filter.status && session.status !== filter.status) return false;
  if (filter.fromMs != null && session.createdAt < filter.fromMs) return false;
  if (filter.toMs != null && session.createdAt > filter.toMs) return false;
  if (filter.patientQuery) {
    const q = filter.patientQuery.trim().toLowerCase();
    if (!q) return true;
    const name = session.patientName?.toLowerCase() ?? '';
    const pid = session.patientId?.toLowerCase() ?? '';
    if (!name.includes(q) && !pid.includes(q)) return false;
  }
  return true;
};

/** In-memory SessionRepository for unit tests (and web). */
export const createMemorySessionRepository = (
  seed: Session[] = [],
): SessionRepository => {
  const byId = new Map<string, Session>(seed.map((s) => [s.id, { ...s }]));

  return {
    upsert: async (session) => {
      if (!session.id.trim()) {
        return { success: false, error: 'session id is required' };
      }
      byId.set(session.id, { ...session });
      return { success: true, data: undefined };
    },
    getById: async (id) => {
      const row = byId.get(id);
      return { success: true, data: row ? { ...row } : null };
    },
    list: async (filter) => {
      const rows = [...byId.values()]
        .filter((s) => matches(s, filter))
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((s) => ({ ...s }));
      return { success: true, data: rows };
    },
    remove: async (id) => {
      byId.delete(id);
      return { success: true, data: undefined };
    },
  };
};

export type SqlScalar = string | number | null;
export type SqlQueryResult = { rows: Record<string, SqlScalar>[]; rowsAffected: number };
export type SqlExecutor = {
  execute: (sql: string, params?: SqlScalar[]) => Promise<SqlQueryResult>;
};

export const SESSION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  patient_name TEXT,
  patient_id TEXT,
  notes TEXT,
  soap_path TEXT,
  soap_iv TEXT,
  soap_tag TEXT,
  transcript_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_name ON sessions(patient_name);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE TABLE IF NOT EXISTS processing_queue (
  session_id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  enqueued_at INTEGER NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT
);
CREATE TABLE IF NOT EXISTS audio_chunks (
  session_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  path TEXT NOT NULL,
  PRIMARY KEY (session_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_audio_chunks_session ON audio_chunks(session_id);
`.trim();

export const migrateAppSchema = async (db: SqlExecutor): Promise<Result<void>> => {
  try {
    for (const stmt of SESSION_SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await db.execute(stmt);
    }
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Schema migrate failed',
    };
  }
};

const rowToSession = (row: Record<string, SqlScalar>): Session => ({
  id: String(row.id),
  status: row.status as Session['status'],
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
  completedAt: row.completed_at == null ? undefined : Number(row.completed_at),
  durationMs: row.duration_ms == null ? undefined : Number(row.duration_ms),
  patientName: row.patient_name == null ? undefined : String(row.patient_name),
  patientId: row.patient_id == null ? undefined : String(row.patient_id),
  notes: row.notes == null ? undefined : String(row.notes),
  soapPath: row.soap_path == null ? undefined : String(row.soap_path),
  soapIv: row.soap_iv == null ? undefined : String(row.soap_iv),
  soapTag: row.soap_tag == null ? undefined : String(row.soap_tag),
  transcriptPath: row.transcript_path == null ? undefined : String(row.transcript_path),
});

export const createSqliteSessionRepository = (db: SqlExecutor): SessionRepository => ({
  upsert: async (session) => {
    if (!session.id.trim()) return { success: false, error: 'session id is required' };
    try {
      await db.execute(
        `INSERT INTO sessions (
          id, status, created_at, updated_at, completed_at, duration_ms,
          patient_name, patient_id, notes, soap_path, soap_iv, soap_tag, transcript_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status=excluded.status,
          updated_at=excluded.updated_at,
          completed_at=excluded.completed_at,
          duration_ms=excluded.duration_ms,
          patient_name=excluded.patient_name,
          patient_id=excluded.patient_id,
          notes=excluded.notes,
          soap_path=excluded.soap_path,
          soap_iv=excluded.soap_iv,
          soap_tag=excluded.soap_tag,
          transcript_path=excluded.transcript_path`,
        [
          session.id,
          session.status,
          session.createdAt,
          session.updatedAt,
          session.completedAt ?? null,
          session.durationMs ?? null,
          session.patientName ?? null,
          session.patientId ?? null,
          session.notes ?? null,
          session.soapPath ?? null,
          session.soapIv ?? null,
          session.soapTag ?? null,
          session.transcriptPath ?? null,
        ],
      );
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session upsert failed',
      };
    }
  },
  getById: async (id) => {
    try {
      const result = await db.execute(`SELECT * FROM sessions WHERE id = ? LIMIT 1`, [id]);
      const row = result.rows[0];
      return { success: true, data: row ? rowToSession(row) : null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session get failed',
      };
    }
  },
  list: async (filter) => {
    try {
      const result = await db.execute(`SELECT * FROM sessions ORDER BY created_at DESC`);
      const rows = result.rows
        .map(rowToSession)
        .filter((s) => matches(s, filter));
      return { success: true, data: rows };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session list failed',
      };
    }
  },
  remove: async (id) => {
    try {
      await db.execute(`DELETE FROM sessions WHERE id = ?`, [id]);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session delete failed',
      };
    }
  },
});
