import {
  TranscriptQueue,
  type TranscriptPersistence,
  type TranscriptSegment,
} from '@/services/ai/transcript-queue';

const createPersistence = () => {
  const data = new Map<string, readonly TranscriptSegment[]>();
  const persistence: TranscriptPersistence = {
    load: async (sessionId) => data.get(sessionId) ?? null,
    save: async (sessionId, segments) => {
      data.set(sessionId, segments.map((segment) => ({ ...segment })));
    },
    remove: async (sessionId) => {
      data.delete(sessionId);
    },
  };
  return { data, persistence };
};

const segment = (sequence: number): TranscriptSegment => ({
  chunkId: `chunk-${sequence}`,
  sequence,
  text: `segment ${sequence}`,
});

describe('TranscriptQueue', () => {
  it('orders segments and builds transcript text', async () => {
    const { persistence } = createPersistence();
    const queue = new TranscriptQueue('session-1', persistence);
    await queue.append(segment(2));
    await queue.append(segment(0));
    await queue.append(segment(1));

    expect(queue.toText()).toBe('segment 0 segment 1 segment 2');
  });

  it('deduplicates by chunk id and restores persisted segments', async () => {
    const { persistence } = createPersistence();
    const queue = new TranscriptQueue('session-1', persistence);
    await queue.append(segment(0));
    await queue.append({ ...segment(0), text: 'duplicate' });

    const restored = new TranscriptQueue('session-1', persistence);
    expect(await restored.restore()).toEqual({ success: true, data: 1 });
    expect(restored.hasChunk('chunk-0')).toBe(true);
    expect(restored.toText()).toBe('segment 0');
  });

  it('rejects invalid segments and preserves memory on save failure', async () => {
    const persistence: TranscriptPersistence = {
      load: async () => null,
      save: async () => {
        throw new Error('encryption failed');
      },
      remove: async () => undefined,
    };
    const queue = new TranscriptQueue('session-1', persistence);

    expect((await queue.append({ ...segment(0), text: '' })).success).toBe(false);
    expect(await queue.append(segment(0))).toEqual({
      success: false,
      error: 'encryption failed',
    });
    expect(queue.toText()).toBe('');
  });

  it('fails corrupt restores without replacing valid memory', async () => {
    const { data, persistence } = createPersistence();
    const queue = new TranscriptQueue('session-1', persistence);
    await queue.append(segment(0));
    data.set('session-1', [{ ...segment(1), chunkId: '' }]);

    expect((await queue.restore()).success).toBe(false);
    expect(queue.toText()).toBe('segment 0');
  });

  it('clears only its session', async () => {
    const { persistence } = createPersistence();
    const first = new TranscriptQueue('session-1', persistence);
    const second = new TranscriptQueue('session-2', persistence);
    await first.append(segment(0));
    await second.append(segment(0));

    await first.clear();
    expect(first.toText()).toBe('');
    expect(await second.restore()).toEqual({ success: true, data: 1 });
  });
});
