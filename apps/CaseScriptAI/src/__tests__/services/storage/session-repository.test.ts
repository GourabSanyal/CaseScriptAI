import {
  createMemorySessionRepository,
  createSqliteSessionRepository,
  migrateAppSchema,
  SESSION_SCHEMA_SQL,
} from '@/services/storage/session-repository';
import { createMemorySqlExecutor } from '@/services/storage/memory-sql';

import type { Session } from '@/types/session';

const sample = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  status: 'complete',
  createdAt: 1_000,
  updatedAt: 2_000,
  completedAt: 2_000,
  patientName: 'Ada Lovelace',
  patientId: 'P-1',
  ...overrides,
});

describe('SessionRepository (memory)', () => {
  it('upserts, gets, lists, and searches by patient', async () => {
    const repo = createMemorySessionRepository();
    await repo.upsert(sample());
    await repo.upsert(
      sample({ id: 's2', createdAt: 3_000, patientName: 'Grace Hopper', patientId: 'P-2' }),
    );

    const one = await repo.getById('s1');
    expect(one.success && one.data?.patientName).toBe('Ada Lovelace');

    const listed = await repo.list({ patientQuery: 'hopper' });
    expect(listed.success && listed.data.map((s) => s.id)).toEqual(['s2']);

    const byDate = await repo.list({ fromMs: 2_500 });
    expect(byDate.success && byDate.data.map((s) => s.id)).toEqual(['s2']);
  });

  it('rejects empty id', async () => {
    const repo = createMemorySessionRepository();
    const result = await repo.upsert(sample({ id: '  ' }));
    expect(result.success).toBe(false);
  });
});

describe('SessionRepository (sqlite via memory executor)', () => {
  it('migrates schema and persists sessions', async () => {
    const db = createMemorySqlExecutor();
    const migrated = await migrateAppSchema(db);
    expect(migrated.success).toBe(true);
    expect(SESSION_SCHEMA_SQL).toContain('idx_sessions_created_at');

    const repo = createSqliteSessionRepository(db);
    await repo.upsert(sample({ soapPath: '/soap.enc', soapIv: 'iv', soapTag: 'tag' }));
    const got = await repo.getById('s1');
    expect(got).toEqual({
      success: true,
      data: expect.objectContaining({
        id: 's1',
        soapPath: '/soap.enc',
        patientName: 'Ada Lovelace',
      }),
    });

    await repo.remove('s1');
    const missing = await repo.getById('s1');
    expect(missing).toEqual({ success: true, data: null });
  });
});
