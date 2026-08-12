import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Appearance } from 'react-native';

import { ModelDownloadView } from '@/components/model-download/model-download-view';
import { modelManager } from '@/services/ai/model-manager-runtime';
import { buildModelStatusRows } from '@/services/ai/model-status-rows';
import {
  deleteModelGroup,
  type ModelGroupId,
} from '@/services/download/delete-model-assets';
import { useDownloadStore } from '@/stores/download-runtime';
import { useBootStore } from '@/stores/boot-store';
import { useDeviceStore } from '@/stores/device-store';

import type { ModelReadiness } from '@/types/download';

export default function ModelDownloadScreen() {
  const selection = useDeviceStore((state) => state.selection);
  const assessAndSelect = useDeviceStore((state) => state.assessAndSelect);

  const progress = useDownloadStore((state) => state.progress);
  const phaseLabel = useDownloadStore((state) => state.phaseLabel);
  const error = useDownloadStore((state) => state.error);
  const machine = useDownloadStore((state) => state.machine);
  const startDownload = useDownloadStore((state) => state.startDownload);
  const retry = useDownloadStore((state) => state.retry);
  const reset = useDownloadStore((state) => state.reset);
  const markComplete = useDownloadStore((state) => state.markComplete);
  const hasHydrated = useDownloadStore((state) => state.hasHydrated);

  const [readiness, setReadiness] = useState<ModelReadiness | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // Download UI is designed for light; force light while mounted.
    Appearance.setColorScheme('light');
    return () => {
      // Restore OS preference so main app dark/light toggle works again.
      Appearance.setColorScheme(null);
    };
  }, []);

  useEffect(() => {
    if (!selection) void assessAndSelect();
  }, [assessAndSelect, selection]);

  const tier = selection?.tier ?? 'lite';
  const checking = readiness === null;
  // Disk is source of truth — MMKV can be idle/0% after a kill while files are already there.
  const complete = readiness?.ready === true;
  const busy =
    !complete &&
    ['checking-storage', 'downloading', 'verifying', 'paused'].includes(machine.status);

  const refreshReadiness = useCallback(async () => {
    const result = await modelManager.checkAllModelsReady(tier);
    if (result.success) setReadiness(result.data);
  }, [tier]);

  useEffect(() => {
    void refreshReadiness();
  }, [refreshReadiness, machine.status]);

  useEffect(() => {
    if (!hasHydrated || !readiness) return;
    if (readiness.ready) {
      if (machine.status !== 'complete') markComplete();
      return;
    }
    if (machine.status === 'paused') void startDownload(tier);
  }, [hasHydrated, markComplete, machine.status, readiness, startDownload, tier]);

  // Stale MMKV `complete` + empty disk → reset; ring % must not outrank disk readiness.
  useEffect(() => {
    if (machine.status === 'complete' && readiness && !readiness.ready) {
      reset();
    }
  }, [machine.status, readiness, reset]);

  // ponytail: no 2s poll while downloading — progress UI is enough; avoids extra FS work under memory pressure.

  const handleDeleteModel = useCallback(
    async (group: ModelGroupId) => {
      if (busy) return;
      setDeleteError(null);
      const result = await deleteModelGroup(group, tier);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      reset();
      await refreshReadiness();
    },
    [busy, refreshReadiness, reset, tier],
  );

  return (
    <ModelDownloadView
      percent={complete ? 1 : progress}
      phaseLabel={phaseLabel}
      modelStatuses={buildModelStatusRows(tier, readiness)}
      error={error ?? deleteError}
      busy={busy}
      checking={checking}
      complete={complete}
      onDeleteModel={(id) => {
        void handleDeleteModel(id);
      }}
      onPrimaryPress={() => {
        if (checking) return;
        setDeleteError(null);
        if (complete) {
          void (async () => {
            const { initializeExecutorch } = await import('@/services/ai/llm-inference');
            const init = await initializeExecutorch();
            if (!init.success) {
              setDeleteError(init.error);
              return;
            }
            useBootStore.getState().setDestination('app');
            router.replace('/record');
          })();
          return;
        }
        if (machine.status === 'failed') {
          void retry(tier);
          return;
        }
        void startDownload(tier);
      }}
    />
  );
}
