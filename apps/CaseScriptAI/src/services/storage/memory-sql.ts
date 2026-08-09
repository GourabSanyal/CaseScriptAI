import type { SqlExecutor, SqlQueryResult, SqlScalar } from '@/services/storage/session-repository';

type Row = Record<string, SqlScalar>;

/**
 * Minimal in-memory SQL stand-in for SessionRepository tests.
 * Supports the subset of statements SessionRepository + migrate use.
 */
export const createMemorySqlExecutor = (): SqlExecutor & {
  tables: Record<string, Row[]>;
} => {
  const tables: Record<string, Row[]> = {
    sessions: [],
    processing_queue: [],
    audio_chunks: [],
  };

  const execute = async (sql: string, params: SqlScalar[] = []): Promise<SqlQueryResult> => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const upper = normalized.toUpperCase();

    if (upper.startsWith('CREATE TABLE') || upper.startsWith('CREATE INDEX')) {
      return { rows: [], rowsAffected: 0 };
    }

    if (upper.startsWith('INSERT INTO SESSIONS')) {
      const row: Row = {
        id: params[0],
        status: params[1],
        created_at: params[2],
        updated_at: params[3],
        completed_at: params[4],
        duration_ms: params[5],
        patient_name: params[6],
        patient_id: params[7],
        notes: params[8],
        soap_path: params[9],
        soap_iv: params[10],
        soap_tag: params[11],
        transcript_path: params[12],
      };
      const idx = tables.sessions.findIndex((r) => r.id === row.id);
      if (idx >= 0 && upper.includes('ON CONFLICT')) {
        tables.sessions[idx] = row;
      } else if (idx < 0) {
        tables.sessions.push(row);
      } else {
        tables.sessions[idx] = row;
      }
      return { rows: [], rowsAffected: 1 };
    }

    if (upper.startsWith('SELECT * FROM SESSIONS WHERE ID')) {
      const row = tables.sessions.find((r) => r.id === params[0]);
      return { rows: row ? [row] : [], rowsAffected: 0 };
    }

    if (upper.startsWith('SELECT * FROM SESSIONS')) {
      const rows = [...tables.sessions].sort(
        (a, b) => Number(b.created_at) - Number(a.created_at),
      );
      return { rows, rowsAffected: 0 };
    }

    if (upper.startsWith('DELETE FROM SESSIONS')) {
      const before = tables.sessions.length;
      tables.sessions = tables.sessions.filter((r) => r.id !== params[0]);
      return { rows: [], rowsAffected: before - tables.sessions.length };
    }

    if (upper.startsWith('DELETE FROM AUDIO_CHUNKS')) {
      const before = tables.audio_chunks.length;
      tables.audio_chunks = tables.audio_chunks.filter((r) => r.session_id !== params[0]);
      return { rows: [], rowsAffected: before - tables.audio_chunks.length };
    }

    if (upper.startsWith('INSERT INTO AUDIO_CHUNKS')) {
      tables.audio_chunks.push({
        session_id: params[0],
        chunk_id: params[1],
        sequence: params[2],
        path: params[3],
      });
      return { rows: [], rowsAffected: 1 };
    }

    if (upper.startsWith('SELECT') && upper.includes('FROM AUDIO_CHUNKS')) {
      const rows = tables.audio_chunks
        .filter((r) => r.session_id === params[0])
        .sort((a, b) => Number(a.sequence) - Number(b.sequence));
      return { rows, rowsAffected: 0 };
    }

    if (upper.startsWith('DELETE FROM PROCESSING_QUEUE')) {
      const n = tables.processing_queue.length;
      tables.processing_queue = [];
      return { rows: [], rowsAffected: n };
    }

    if (upper.startsWith('INSERT INTO PROCESSING_QUEUE')) {
      tables.processing_queue.push({
        session_id: params[0],
        status: params[1],
        enqueued_at: params[2],
        retry_count: params[3],
        failure_reason: params[4],
      });
      return { rows: [], rowsAffected: 1 };
    }

    if (upper.startsWith('SELECT') && upper.includes('FROM PROCESSING_QUEUE')) {
      return { rows: [...tables.processing_queue], rowsAffected: 0 };
    }

    throw new Error(`Unsupported SQL in memory executor: ${normalized.slice(0, 80)}`);
  };

  return { execute, tables };
};
