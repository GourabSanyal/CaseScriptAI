import { useEffect, useRef, useState } from 'react';

import type { RecordingState } from '@/types/recording';

/** Elapsed session timer — freezes while paused; resets when idle/queued. */
export const useSessionElapsed = (machine: RecordingState): number => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const frozenRef = useRef(0);

  useEffect(() => {
    if (machine.status === 'idle' || machine.status === 'queued' || machine.status === 'failed') {
      startedAtRef.current = null;
      frozenRef.current = 0;
      setElapsedMs(0);
      return;
    }

    if (machine.status === 'orphaned' || machine.status === 'requesting-permission') {
      return;
    }

    if (machine.status === 'paused' || machine.status === 'stopping') {
      if (startedAtRef.current != null) {
        frozenRef.current = Date.now() - startedAtRef.current;
        startedAtRef.current = null;
        setElapsedMs(frozenRef.current);
      }
      return;
    }

    if (machine.status === 'recording') {
      if (startedAtRef.current == null) {
        startedAtRef.current = Date.now() - frozenRef.current;
      }
      const id = setInterval(() => {
        if (startedAtRef.current == null) return;
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);
      return () => clearInterval(id);
    }
  }, [machine.status]);

  return elapsedMs;
};
