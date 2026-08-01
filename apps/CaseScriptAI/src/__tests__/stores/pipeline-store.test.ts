import { createPipelineStore } from '@/stores/pipeline-store';

describe('pipeline-store', () => {
  it('applies progress events for UI', () => {
    const store = createPipelineStore({
      runUntilIdle: async () => ({ success: true, data: 0 }),
    });
    store.getState().applyEvent({
      sessionId: 's1',
      phase: 'whisper',
      progress: 0.2,
    });
    expect(store.getState()).toMatchObject({
      sessionId: 's1',
      phase: 'whisper',
      progress: 0.2,
      isActive: true,
    });
  });

  it('startDrain runs orchestrator and marks complete', async () => {
    const store = createPipelineStore({
      runUntilIdle: async () => {
        store.getState().applyEvent({
          sessionId: 's1',
          phase: 'complete',
          progress: 1,
        });
        return { success: true, data: 1 };
      },
    });
    const result = await store.getState().startDrain();
    expect(result).toEqual({ success: true, data: 1 });
    expect(store.getState().phase).toBe('complete');
    expect(store.getState().isActive).toBe(false);
  });

  it('records failure from runUntilIdle', async () => {
    const store = createPipelineStore({
      runUntilIdle: async () => ({ success: false, error: 'boom' }),
    });
    const result = await store.getState().startDrain();
    expect(result.success).toBe(false);
    expect(store.getState()).toMatchObject({
      phase: 'failed',
      error: 'boom',
      isActive: false,
    });
  });
});
