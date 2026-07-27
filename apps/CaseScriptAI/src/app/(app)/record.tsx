import { HomeRecordView } from '@/components/home/home-record-view';
import { useSessionElapsed } from '@/hooks/use-session-elapsed';
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
  const elapsedMs = useSessionElapsed(machine);

  return (
    <HomeRecordView
      machine={machine}
      error={error}
      elapsedMs={elapsedMs}
      pendingCount={pendingCount}
      onStart={() => void start()}
      onPause={() => void pause()}
      onResume={() => void resume()}
      onStop={() => void stop()}
      onRecover={(action) => void recoverOrphan(action)}
    />
  );
}
