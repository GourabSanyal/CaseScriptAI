import { useState } from 'react';
import { router } from 'expo-router';

import { HomeRecordView } from '@/components/home/home-record-view';
import { useSessionElapsed } from '@/hooks/use-session-elapsed';
import { importAudioToProcessingQueue } from '@/services/audio/import-audio-to-queue';
import {
  CALL_AUDIO_TOAST_MESSAGE,
  isAudioSessionBusyMessage,
} from '@/services/device/call-audio-copy';
import {
  guardRecordingAgainstCallAudio,
  notifyRecordingStartFailure,
} from '@/services/device/call-audio-presence';
import { usePipelineStore } from '@/stores/pipeline-runtime';
import { useRecordingStore } from '@/stores/recording-runtime';
import { AppErrorCode } from '@/types/result';

const isCallBusyUi = (message: string | null, code?: AppErrorCode): boolean => {
  if (!message) return false;
  return (
    code === AppErrorCode.AUDIO_SESSION_BUSY ||
    message === CALL_AUDIO_TOAST_MESSAGE ||
    isAudioSessionBusyMessage(message)
  );
};

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

  const onStart = async () => {
    setImportError(null);
    const guard = guardRecordingAgainstCallAudio();
    if (!guard.success) return;
    const result = await start();
    if (!result.success) {
      notifyRecordingStartFailure(result.error, result.errorCode);
    }
  };

  const rawError = importError ?? error;
  // Call conflicts use the global toast — hide the raw / duplicate inline dump.
  const displayError = isCallBusyUi(rawError) ? null : rawError;

  return (
    <HomeRecordView
      machine={machine}
      error={displayError}
      elapsedMs={elapsedMs}
      pendingCount={pendingCount}
      onStart={() => void onStart()}
      onPause={() => void pause()}
      onResume={() => void resume()}
      onStop={() => {
        void (async () => {
          const result = await stop();
          if (result.success) void startDrain();
        })();
      }}
      onRecover={(action) => void recoverOrphan(action)}
      onImportAudio={() => void onImportAudio()}
    />
  );
}
