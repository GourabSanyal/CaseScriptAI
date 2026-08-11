import { MemoryManager } from '@/services/ai/memory-manager';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager();
  });

  it('allows exactly one model owner', () => {
    expect(manager.modelLoadLock).toBeNull();
    expect(manager.acquireLock('whisper').success).toBe(true);
    expect(manager.modelLoadLock).toBe('whisper');
    expect(manager.acquireLock('llm').success).toBe(false);
    expect(manager.acquireLock('whisper').success).toBe(false);
  });

  it('rejects wrong-owner release without clearing the lock', () => {
    manager.acquireLock('whisper');

    expect(manager.releaseLock('llm').success).toBe(false);
    expect(manager.modelLoadLock).toBe('whisper');
  });

  it('allows the next model after the owner releases', () => {
    manager.acquireLock('whisper');

    expect(manager.releaseLock('whisper').success).toBe(true);
    expect(manager.acquireLock('llm').success).toBe(true);
    expect(manager.canLoadModel('whisper')).toBe(false);
  });

  it('fails repeated release safely', () => {
    expect(manager.releaseLock('llm').success).toBe(false);
    expect(manager.modelLoadLock).toBeNull();
  });

  it('clears a stale lock only when the pipeline is idle', () => {
    manager.acquireLock('whisper');
    expect(manager.clearStaleLock(true)).toBe(false);
    expect(manager.modelLoadLock).toBe('whisper');
    expect(manager.clearStaleLock(false)).toBe(true);
    expect(manager.modelLoadLock).toBeNull();
  });

  it('runs optional garbage collection without requiring it', () => {
    const globalWithGc = globalThis as typeof globalThis & { gc?: jest.Mock };
    const previous = globalWithGc.gc;
    globalWithGc.gc = jest.fn();

    manager.forceGC();

    expect(globalWithGc.gc).toHaveBeenCalledTimes(1);
    globalWithGc.gc = previous;
  });
});
