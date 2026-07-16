import {
  AudioChunkQueue,
  type AudioChunkPersistence,
  type AudioChunkRef,
} from '@/services/audio/audio-chunk-queue';

const createPersistence = () => {
  const data = new Map<string, readonly AudioChunkRef[]>();
  const persistence: AudioChunkPersistence = {
    load: async (sessionId) => data.get(sessionId) ?? null,
    save: async (sessionId, chunks) => {
      data.set(sessionId, structuredClone(chunks));
    },
    remove: async (sessionId) => {
      data.delete(sessionId);
    },
  };
  return { data, persistence };
};

const chunk = (sequence: number, sessionId = 'session-1'): AudioChunkRef => ({
  id: `chunk-${sequence}`,
  sessionId,
  sequence,
  path: `/audio/${sequence}.wav`,
});

describe('AudioChunkQueue', () => {
  it('orders path records and returns a non-destructive batch', async () => {
    const { persistence } = createPersistence();
    const queue = new AudioChunkQueue('session-1', persistence);
    await queue.enqueue(chunk(2));
    await queue.enqueue(chunk(0));
    await queue.enqueue(chunk(1));

    expect(queue.nextBatch().map(({ sequence }) => sequence)).toEqual([0, 1, 2]);
    expect(queue.nextBatch()).toHaveLength(3);
  });

  it('caps in-memory batches at 50 while retaining the backlog', async () => {
    const { persistence } = createPersistence();
    const queue = new AudioChunkQueue('session-1', persistence);

    for (let index = 0; index < 55; index += 1) {
      await queue.enqueue(chunk(index));
    }

    expect(queue.nextBatch(100)).toHaveLength(50);
    await queue.acknowledge('chunk-0');
    expect(queue.nextBatch(100)).toHaveLength(50);
  });

  it('persists acknowledgements and restores unacknowledged chunks', async () => {
    const { persistence } = createPersistence();
    const queue = new AudioChunkQueue('session-1', persistence);
    await queue.enqueue(chunk(0));
    await queue.enqueue(chunk(1));
    await queue.acknowledge('chunk-0');

    const restored = new AudioChunkQueue('session-1', persistence);
    expect(await restored.restore()).toEqual({ success: true, data: 1 });
    expect(restored.nextBatch()).toEqual([chunk(1)]);
  });

  it('is idempotent by chunk id and isolates sessions', async () => {
    const { persistence } = createPersistence();
    const first = new AudioChunkQueue('session-1', persistence);
    const second = new AudioChunkQueue('session-2', persistence);

    await first.enqueue(chunk(0));
    await first.enqueue(chunk(0));
    await second.enqueue(chunk(0, 'session-2'));

    expect(first.nextBatch()).toHaveLength(1);
    expect(second.nextBatch()).toHaveLength(1);
  });

  it('rejects invalid metadata and preserves memory on save failure', async () => {
    const persistence: AudioChunkPersistence = {
      load: async () => null,
      save: async () => {
        throw new Error('disk failed');
      },
      remove: async () => undefined,
    };
    const queue = new AudioChunkQueue('session-1', persistence);

    expect((await queue.enqueue({ ...chunk(0), path: '' })).success).toBe(false);
    expect(await queue.enqueue(chunk(0))).toEqual({ success: false, error: 'disk failed' });
    expect(queue.nextBatch()).toEqual([]);
  });
});
