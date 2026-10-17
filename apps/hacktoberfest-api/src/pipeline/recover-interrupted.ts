import type { DbPool } from '../db/client.js';

export type RecoverInterruptedResult = {
  recoveredIds: string[];
};

/**
 * Render restarts mid-pipeline: mark unfinished sessions failed so clients can retry.
 * Does not touch ready / failed rows.
 */
export const recoverInterruptedSessions = async (
  pool: DbPool,
): Promise<RecoverInterruptedResult> => {
  const result = await pool.query<{ id: string }>(
    `UPDATE demo_sessions
     SET status = 'failed',
         error = 'interrupted_restart',
         updated_at = now()
     WHERE status IN ('queued', 'stt_running', 'llm_running', 'pdf_running')
     RETURNING id`,
  );
  return { recoveredIds: result.rows.map((row) => row.id) };
};
