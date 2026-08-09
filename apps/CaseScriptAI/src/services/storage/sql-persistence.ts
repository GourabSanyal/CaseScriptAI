import type { AudioChunkPersistence } from '@/services/audio/audio-chunk-queue';
import type { SqlExecutor } from '@/services/storage/session-repository';
import type { ProcessingQueueItem } from '@/types/processing-queue';

export const createSqliteAudioChunkPersistence = (db: SqlExecutor): AudioChunkPersistence => ({
  load: async (sessionId) => {
    const result = await db.execute(
      `SELECT chunk_id, session_id, sequence, path FROM audio_chunks WHERE session_id = ? ORDER BY sequence ASC`,
      [sessionId],
    );
    return result.rows.map((row) => ({
      id: String(row.chunk_id),
      sessionId: String(row.session_id),
      sequence: Number(row.sequence),
      path: String(row.path),
    }));
  },
  save: async (sessionId, chunks) => {
    await db.execute(`DELETE FROM audio_chunks WHERE session_id = ?`, [sessionId]);
    for (const chunk of chunks) {
      await db.execute(
        `INSERT INTO audio_chunks (session_id, chunk_id, sequence, path) VALUES (?, ?, ?, ?)`,
        [sessionId, chunk.id, chunk.sequence, chunk.path],
      );
    }
  },
  remove: async (sessionId) => {
    await db.execute(`DELETE FROM audio_chunks WHERE session_id = ?`, [sessionId]);
  },
});

/** Async SQL queue port — hydrate before createProcessingQueueStore. */
export const loadProcessingQueueFromSql = async (
  db: SqlExecutor,
): Promise<ProcessingQueueItem[]> => {
  const result = await db.execute(
    `SELECT session_id, status, enqueued_at, retry_count, failure_reason FROM processing_queue ORDER BY enqueued_at ASC`,
  );
  return result.rows.map((row) => ({
    sessionId: String(row.session_id),
    status: row.status as ProcessingQueueItem['status'],
    enqueuedAt: Number(row.enqueued_at),
    retryCount: (Number(row.retry_count) === 1 ? 1 : 0) as 0 | 1,
    failureReason: row.failure_reason == null ? undefined : String(row.failure_reason),
  }));
};

export const saveProcessingQueueToSql = async (
  db: SqlExecutor,
  items: ProcessingQueueItem[],
): Promise<void> => {
  await db.execute(`DELETE FROM processing_queue`);
  for (const item of items) {
    await db.execute(
      `INSERT INTO processing_queue (session_id, status, enqueued_at, retry_count, failure_reason) VALUES (?, ?, ?, ?, ?)`,
      [
        item.sessionId,
        item.status,
        item.enqueuedAt,
        item.retryCount,
        item.failureReason ?? null,
      ],
    );
  }
};
