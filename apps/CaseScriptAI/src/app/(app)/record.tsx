import { useState } from 'react';
import { router } from 'expo-router';

import { HomeRecordView } from '@/components/home/home-record-view';
import { useSessionElapsed } from '@/hooks/use-session-elapsed';
import { importAudioToProcessingQueue } from '@/services/audio/import-audio-to-queue';
import { usePipelineStore } from '@/stores/pipeline-runtime';
import { useRecordingStore } from '@/stores/recording-runtime';

export default function RecordScreen() {
  const machine = useRecordingStore((state) => state.machine);
  const pendingCount = useRecordingStore((state) => state.pendingCount);
  const error = useRecordingStore((state) => state.error);
  const start = useRecordingStore((state) => state.start);
  const pause = useRecordingStore((state) => state.pause);
  const resume = useRecordingStore((state) => state.resume);
  const stop = useRecordingStore((state) => state.stop);
  const recoverOrphan = useRecordingStore((state) => state.recoverOrphan);
  const refreshPendingCount = useRecordingStore((state) => state.refreshPendingCount);
  const startDrain = usePipelineStore((state) => state.startDrain);
  const elapsedMs = useSessionElapsed(machine);
  const [importError, setImportError] = useState<string | null>(null);

  const onImportAudio = async () => {
    setImportError(null);
    const result = await importAudioToProcessingQueue();
    if (!result.success) {
      setImportError(result.error);
      return;
    }
    refreshPendingCount();
    router.push('/processing');
    void startDrain();
  };

  return (
    <HomeRecordView
      machine={machine}
      error={importError ?? error}
      elapsedMs={elapsedMs}
      pendingCount={pendingCount}
      onStart={() => void start()}
      onPause={() => void pause()}
      onResume={() => void resume()}
      onStop={() => void stop()}
      onRecover={(action) => void recoverOrphan(action)}
      onImportAudio={() => void onImportAudio()}
    />
  );
}
