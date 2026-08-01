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

  const [readiness, setReadiness] = useState<ModelReadiness | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const previous = Appearance.getColorScheme();
    Appearance.setColorScheme('light');
    return () => Appearance.setColorScheme(previous);
  }, []);

  useEffect(() => {
    if (!selection) void assessAndSelect();
  }, [assessAndSelect, selection]);

  const tier = selection?.tier ?? 'lite';
  const busy = ['checking-storage', 'downloading', 'verifying'].includes(machine.status);
  const checking = readiness === null;
  // Continue only when Whisper + LLM files are actually on disk (not store phase alone).
  const complete = readiness?.ready === true;

  const refreshReadiness = useCallback(async () => {
    const result = await modelManager.checkAllModelsReady(tier);
    if (result.success) setReadiness(result.data);
  }, [tier]);

  useEffect(() => {
    void refreshReadiness();
  }, [refreshReadiness, machine.status]);

  // ponytail: no 2s poll while downloading — progress UI is enough; avoids extra FS work under memory pressure.

  const incompleteMessage =
    machine.status === 'complete' && readiness && !readiness.ready
      ? `Download marked complete but files missing: ${[...readiness.missing, ...readiness.corrupt].join(', ') || 'unknown'}`
      : null;

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
      percent={progress}
      phaseLabel={phaseLabel}
      modelStatuses={buildModelStatusRows(tier, readiness)}
      error={error ?? incompleteMessage ?? deleteError}
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
        if (machine.status === 'failed' || incompleteMessage) {
          void retry(tier);
          return;
        }
        void startDownload(tier);
      }}
    />
  );
}
