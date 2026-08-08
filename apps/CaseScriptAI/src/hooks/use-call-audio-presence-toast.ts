import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  dismissCallAudioToast,
  syncCallAudioToast,
} from '@/services/device/call-audio-presence';

const POLL_MS = 2_500;

/**
 * Keeps the call/audio toast in sync while the app is foregrounded.
 * Mount once near the root layout.
 */
export function useCallAudioPresenceToast(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      syncCallAudioToast();
      timer = setInterval(() => {
        syncCallAudioToast();
      }, POLL_MS);
    };

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') start();
      else {
        stop();
        dismissCallAudioToast();
      }
    };

    start();
    const sub = AppState.addEventListener('change', onAppState);
    return () => {
      stop();
      sub.remove();
    };
  }, []);
}
