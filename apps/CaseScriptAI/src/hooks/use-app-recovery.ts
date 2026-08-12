import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';

import { memoryManager } from '@/services/ai/memory-manager';
import { modelManager } from '@/services/ai/model-manager-runtime';
import {
  createAppRecoveryController,
  inspectSessionRecovery,
} from '@/services/recovery/app-recovery';
import { useBootStore } from '@/stores/boot-store';
import { useDeviceStore } from '@/stores/device-store';
import { useDownloadStore } from '@/stores/download-runtime';
import { pipelineOrchestrator } from '@/stores/pipeline-runtime';
import { errorHandlerDeps } from '@/stores/recovery-runtime';
import { useProcessingQueueStore, useRecordingStore } from '@/stores/recording-runtime';
import { AppErrorCode } from '@/types/result';

const isOnlineState = (connected: boolean | null, reachable: boolean | null): boolean =>
  Boolean(connected && reachable !== false);

/** Mount once in root chrome. Services stay RN-free; this hook is the adapter. */
export const useAppRecovery = (navigationReady: boolean): void => {
  const router = useRouter();
  const destination = useBootStore((state) => state.destination);
  const sawApp = useRef(destination === 'app');
  if (destination === 'app') sawApp.current = true;

  // Boot uses index Redirect. REPLACE only after (app) was mounted — Slot is gone during splash.
  useEffect(() => {
    if (!navigationReady || destination !== 'download' || !sawApp.current) return;
    router.replace('/(onboarding)/model-download');
  }, [destination, navigationReady, router]);

  useEffect(() => {
    let online = true;
    const unsubNetInfo = NetInfo.addEventListener((state) => {
      online = isOnlineState(state.isConnected, state.isInternetReachable);
    });

    const { toast } = errorHandlerDeps();
    const controller = createAppRecoveryController({
      subscribeAppState: (listener) => {
        const sub = AppState.addEventListener('change', listener);
        return () => sub.remove();
      },
      subscribeOnline: (listener) =>
        NetInfo.addEventListener((state) => {
          listener(isOnlineState(state.isConnected, state.isInternetReachable));
        }),
      isOnline: () => online,
      isPipelineRunning: () => pipelineOrchestrator.isRunning(),
      clearStaleLock: (running) => memoryManager.clearStaleLock(running),
      checkModelsReady: async () => {
        const tier = useDeviceStore.getState().selection?.tier;
        // ponytail: first readiness gate stays in root layout until a tier is committed
        if (!tier) return { success: true, data: { ready: true } };
        const readiness = await modelManager.checkAllModelsReady(tier);
        if (!readiness.success) return readiness;
        return { success: true, data: { ready: readiness.data.ready } };
      },
      requestRedownload: () => useBootStore.getState().setDestination('download'),
      shouldRetryDownload: () => {
        if (useBootStore.getState().destination !== 'download') return false;
        const machine = useDownloadStore.getState().machine;
        return machine.status === 'failed' && machine.errorCode === AppErrorCode.DOWNLOAD_NETWORK;
      },
      retryDownload: () => {
        const tier = useDeviceStore.getState().selection?.tier ?? 'lite';
        void useDownloadStore.getState().retry(tier);
      },
      snapshotSessions: () =>
        inspectSessionRecovery({
          recordingStatus: useRecordingStore.getState().machine.status,
          queueStatuses: useProcessingQueueStore.getState().items.map((item) => item.status),
        }),
      toast,
    });

    return () => {
      controller.stop();
      unsubNetInfo();
    };
  }, []);
};
