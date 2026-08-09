import { createMemorySessionRepository } from '@/services/storage/session-repository';
import { createSessionStore } from '@/stores/session-store';

describe('session-store', () => {
  it('hydrates and updates patient fields', async () => {
    const repo = createMemorySessionRepository([
      {
        id: 's1',
        status: 'complete',
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    const store = createSessionStore({ repository: repo, now: () => 99 });
    await store.getState().hydrate();
    expect(store.getState().items).toHaveLength(1);

    const updated = await store.getState().updatePatient('s1', {
      patientName: 'Ada',
      patientId: 'P1',
    });
    expect(updated.success).toBe(true);
    expect(store.getState().items[0]).toMatchObject({
      patientName: 'Ada',
      patientId: 'P1',
      updatedAt: 99,
    });
  });
});
