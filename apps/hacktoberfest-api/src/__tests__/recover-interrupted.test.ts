import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DbPool } from '../db/client.js';
import { recoverInterruptedSessions } from '../pipeline/recover-interrupted.js';

describe('recoverInterruptedSessions', () => {
  it('marks queued and *_running as failed interrupted_restart', async () => {
    const calls: unknown[] = [];
    const pool = {
      query: async (sql: string) => {
        calls.push(sql);
        return {
          rows: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }],
        };
      },
    } as unknown as DbPool;

    const result = await recoverInterruptedSessions(pool);
    assert.deepEqual(result.recoveredIds, [
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ]);
    assert.match(String(calls[0]), /interrupted_restart/);
    assert.match(String(calls[0]), /stt_running/);
  });
});
