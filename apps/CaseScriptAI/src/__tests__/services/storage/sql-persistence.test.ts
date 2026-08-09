import {
  createSqliteAudioChunkPersistence,
  loadProcessingQueueFromSql,
  saveProcessingQueueToSql,
} from '@/services/storage/sql-persistence';
import { createMemorySqlExecutor } from '@/services/storage/memory-sql';
import { migrateAppSchema } from '@/services/storage/session-repository';

describe('sql persistence adapters', () => {
  it('round-trips audio chunks and processing queue rows', async () => {
    const db = createMemorySqlExecutor();
    await migrateAppSchema(db);

    const chunks = createSqliteAudioChunkPersistence(db);
    await chunks.save('s1', [
      { id: 'c1', sessionId: 's1', sequence: 1, path: '/a.wav' },
      { id: 'c2', sessionId: 's1', sequence: 2, path: '/b.wav' },
    ]);
    const loaded = await chunks.load('s1');
    expect(loaded).toEqual([
      { id: 'c1', sessionId: 's1', sequence: 1, path: '/a.wav' },
      { id: 'c2', sessionId: 's1', sequence: 2, path: '/b.wav' },
    ]);

    await saveProcessingQueueToSql(db, [
      {
        sessionId: 's1',
        status: 'queued',
        enqueuedAt: 10,
        retryCount: 0,
      },
    ]);
    const queue = await loadProcessingQueueFromSql(db);
    expect(queue).toEqual([
      { sessionId: 's1', status: 'queued', enqueuedAt: 10, retryCount: 0, failureReason: undefined },
    ]);
  });
});
