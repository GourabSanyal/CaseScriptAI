import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ModelDownloadView } from '@/components/model-download/model-download-view';
import { modelManager } from '@/services/ai/model-manager-runtime';
import { buildModelStatusRows } from '@/services/ai/model-status-rows';
import { useDownloadStore } from '@/stores/download-runtime';
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

  const [readiness, setReadiness] = useState<ModelReadiness | null>(null);

  useEffect(() => {
    if (!selection) void assessAndSelect();
  }, [assessAndSelect, selection]);

  const tier = selection?.tier ?? 'lite';
  const busy = ['checking-storage', 'downloading', 'verifying'].includes(machine.status);
  // Continue only when Whisper + LLM files are actually on disk (not store phase alone).
  const complete = readiness?.ready === true;

  const refreshReadiness = useCallback(async () => {
    const result = await modelManager.checkAllModelsReady(tier);
    if (result.success) setReadiness(result.data);
  }, [tier]);

  useEffect(() => {
    void refreshReadiness();
  }, [refreshReadiness, machine.status, progress]);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      void refreshReadiness();
    }, 2000);
    return () => clearInterval(id);
  }, [busy, refreshReadiness]);

  const incompleteMessage =
    machine.status === 'complete' && readiness && !readiness.ready
      ? `Download marked complete but files missing: ${[...readiness.missing, ...readiness.corrupt].join(', ') || 'unknown'}`
      : null;

  return (
    <ModelDownloadView
      percent={progress}
      phaseLabel={phaseLabel}
      tierLabel={selection ? `${selection.tier} (${selection.modelId})` : undefined}
      modelStatuses={buildModelStatusRows(tier, readiness)}
      error={error ?? incompleteMessage}
      busy={busy}
      complete={complete}
      onPrimaryPress={() => {
        if (complete) {
          router.replace('/(app)/record');
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
