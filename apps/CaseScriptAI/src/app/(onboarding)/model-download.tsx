import { router } from 'expo-router';
import { useEffect } from 'react';

import { ModelDownloadView } from '@/components/model-download/model-download-view';
import { useDownloadStore } from '@/services/download/download-runtime';
import { useDeviceStore } from '@/stores/device-store';

export default function ModelDownloadScreen() {
  const selection = useDeviceStore((state) => state.selection);
  const assessAndSelect = useDeviceStore((state) => state.assessAndSelect);

  const progress = useDownloadStore((state) => state.progress);
  const phaseLabel = useDownloadStore((state) => state.phaseLabel);
  const error = useDownloadStore((state) => state.error);
  const machine = useDownloadStore((state) => state.machine);
  const startDownload = useDownloadStore((state) => state.startDownload);
  const retry = useDownloadStore((state) => state.retry);

  useEffect(() => {
    if (!selection) void assessAndSelect();
  }, [assessAndSelect, selection]);

  const tier = selection?.tier ?? 'lite';
  const busy = ['checking-storage', 'downloading', 'verifying'].includes(machine.status);
  const complete = machine.status === 'complete';

  return (
    <ModelDownloadView
      percent={progress}
      phaseLabel={phaseLabel}
      tierLabel={selection ? `${selection.tier} (${selection.modelId})` : undefined}
      error={error}
      busy={busy}
      complete={complete}
      onPrimaryPress={() => {
        if (complete) {
          router.replace('/(app)/record');
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
