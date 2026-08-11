import { MemoryManager } from '@/services/ai/memory-manager';
import {
  createAppRecoveryController,
  inspectSessionRecovery,
} from '@/services/recovery/app-recovery';
import { handleAppError } from '@/services/recovery/global-error-handler';
import { healOom } from '@/services/recovery/oom-heal';
import { AppErrorCode } from '@/types/result';

import type { ErrorHandlerDeps } from '@/types/recovery';
import type { LLMTier, TierSelection } from '@/types/device';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('Slice 5 regression', () => {
  it('OOM mid-pipeline heals after lock release, never co-resides models', () => {
    const memory = new MemoryManager();
    expect(memory.acquireLock('llm').success).toBe(true);
    // generate still owns the lock — heal must not run against a loaded model
    expect(memory.modelLoadLock).toBe('llm');
    memory.releaseLock('llm');
    memory.forceGC();

    let persisted: LLMTier | null = null;
    const heal = healOom('standard', (selection: TierSelection) => {
      persisted = selection.tier;
    });
    expect(heal).toEqual({ success: true, data: { healed: true, tier: 'lite' } });
    expect(persisted).toBe('lite');
    expect(memory.modelLoadLock).toBeNull();
    expect(memory.acquireLock('whisper').success).toBe(true);
    expect(memory.acquireLock('llm').success).toBe(false);
  });

  it('corrupt + network + orphan compose without auto-resume', async () => {
    const toasts: string[] = [];
    const ports: ErrorHandlerDeps & { redownloads: number } = {
      redownloads: 0,
      healOom: () => ({ success: true, data: { healed: false, tier: 'lite' } }),
      requestRedownload: () => {
        ports.redownloads += 1;
      },
      toast: ({ message }) => {
        toasts.push(message);
      },
    };

    handleAppError(
      { success: false, error: 'checksum', errorCode: AppErrorCode.MODEL_CORRUPT },
      ports,
    );
    handleAppError(
      { success: false, error: 'offline', errorCode: AppErrorCode.DOWNLOAD_NETWORK },
      ports,
    );
    expect(ports.redownloads).toBe(1);

    const snap = inspectSessionRecovery({
      recordingStatus: 'orphaned',
      queueStatuses: ['failed'],
    });
    expect(snap.orphanedRecording).toBe(true);
    expect(snap.recordingBusy).toBe(true);

    let retries = 0;
    let net: ((online: boolean) => void) | null = null;
    const controller = createAppRecoveryController({
      subscribeAppState: () => () => undefined,
      subscribeOnline: (fn) => {
        net = fn;
        return () => {
          net = null;
        };
      },
      isOnline: () => false,
      isPipelineRunning: () => false,
      clearStaleLock: () => false,
      checkModelsReady: async () => ({ success: true, data: { ready: true } }),
      requestRedownload: () => undefined,
      shouldRetryDownload: () => retries === 0,
      retryDownload: () => {
        retries += 1;
      },
      snapshotSessions: () => snap,
      toast: ({ message }) => {
        toasts.push(message);
      },
    });
    await flush();
    expect(toasts).toContain('Some sessions need attention.');
    net?.(true);
    expect(retries).toBe(1);
    controller.stop();
  });
});
