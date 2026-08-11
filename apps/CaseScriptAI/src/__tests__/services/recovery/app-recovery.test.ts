import {
  createAppRecoveryController,
  inspectSessionRecovery,
} from '@/services/recovery/app-recovery';
import { MemoryManager } from '@/services/ai/memory-manager';

import type { AppRecoveryDeps } from '@/types/recovery';

const flush = () => new Promise((resolve) => setImmediate(resolve));

type Harness = {
  deps: AppRecoveryDeps;
  app: ((status: string) => void) | null;
  net: ((online: boolean) => void) | null;
  redownloads: number;
  retries: number;
  toasts: string[];
  staleClears: boolean[];
  recordingStatus: string;
  modelsReady: boolean;
  pipelineRunning: boolean;
  online: boolean;
  retryDownload: boolean;
};

const harness = (): Harness => {
  const h: Harness = {
    deps: {} as AppRecoveryDeps,
    app: null,
    net: null,
    redownloads: 0,
    retries: 0,
    toasts: [],
    staleClears: [],
    recordingStatus: 'idle',
    modelsReady: true,
    pipelineRunning: false,
    online: false,
    retryDownload: false,
  };

  h.deps = {
    subscribeAppState: (fn) => {
      h.app = fn;
      return () => {
        h.app = null;
      };
    },
    subscribeOnline: (fn) => {
      h.net = fn;
      return () => {
        h.net = null;
      };
    },
    isOnline: () => h.online,
    isPipelineRunning: () => h.pipelineRunning,
    clearStaleLock: (running) => {
      h.staleClears.push(running);
      return !running;
    },
    checkModelsReady: async () => ({ success: true, data: { ready: h.modelsReady } }),
    requestRedownload: () => {
      h.redownloads += 1;
    },
    shouldRetryDownload: () => h.retryDownload,
    retryDownload: () => {
      h.retries += 1;
      h.retryDownload = false;
    },
    snapshotSessions: () =>
      inspectSessionRecovery({
        recordingStatus: h.recordingStatus,
        queueStatuses: [],
      }),
    toast: ({ message }) => {
      h.toasts.push(message);
    },
  };

  return h;
};

describe('app-recovery', () => {
  it('inspects orphan vs queue without auto-resume', () => {
    expect(
      inspectSessionRecovery({
        recordingStatus: 'orphaned',
        queueStatuses: ['failed', 'queued', 'processing'],
      }),
    ).toEqual({
      orphanedRecording: true,
      failedCount: 1,
      queuedCount: 2,
      recordingBusy: true,
    });
  });

  it('toasts failed queue on launch and retries download when online', async () => {
    const h = harness();
    h.online = true;
    h.retryDownload = true;
    h.deps.snapshotSessions = () =>
      inspectSessionRecovery({
        recordingStatus: 'idle',
        queueStatuses: ['failed'],
      });

    const controller = createAppRecoveryController(h.deps);
    await flush();
    expect(h.toasts).toEqual(['Some sessions need attention.']);
    expect(h.retries).toBe(1);

    controller.stop();
  });

  it('toasts when models are not ready and does not flip boot destination', async () => {
    const h = harness();
    h.modelsReady = false;
    const controller = createAppRecoveryController(h.deps);
    await flush();
    expect(h.redownloads).toBe(0);
    expect(h.toasts).toContain('A model file is missing or damaged. Re-download required.');
    controller.stop();
  });

  it('does not toast model damage while recording', async () => {
    const h = harness();
    h.recordingStatus = 'recording';
    h.modelsReady = false;
    const controller = createAppRecoveryController(h.deps);
    await flush();
    expect(h.redownloads).toBe(0);
    expect(h.toasts).not.toContain(
      'A model file is missing or damaged. Re-download required.',
    );

    h.recordingStatus = 'idle';
    h.app?.('background');
    h.app?.('active');
    await flush();
    expect(h.redownloads).toBe(0);
    expect(h.toasts).toContain('A model file is missing or damaged. Re-download required.');

    controller.stop();
  });

  it('retries a network-failed download when connectivity returns', () => {
    const h = harness();
    h.retryDownload = true;
    const controller = createAppRecoveryController(h.deps);
    expect(h.retries).toBe(0);

    h.online = true;
    h.net?.(true);
    expect(h.retries).toBe(1);

    controller.stop();
  });

  it('clears a stale lock only when the pipeline is idle', () => {
    const memory = new MemoryManager();
    memory.acquireLock('llm');
    expect(memory.clearStaleLock(true)).toBe(false);
    expect(memory.modelLoadLock).toBe('llm');
    expect(memory.clearStaleLock(false)).toBe(true);
    expect(memory.modelLoadLock).toBeNull();
  });
});
