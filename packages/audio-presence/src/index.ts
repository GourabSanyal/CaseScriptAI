import { requireNativeModule, Platform } from 'expo-modules-core';

type AudioPresenceNative = {
  isOtherAudioActive: () => boolean;
};

const fallback: AudioPresenceNative = {
  isOtherAudioActive: () => false,
};

const nativeModule: AudioPresenceNative =
  Platform.OS === 'web'
    ? fallback
    : (() => {
        try {
          return requireNativeModule<AudioPresenceNative>('AudioPresence');
        } catch {
          return fallback;
        }
      })();

/** True when another app (call, FaceTime, VoIP, etc.) holds the audio session. */
export function isOtherAudioActive(): boolean {
  try {
    return Boolean(nativeModule.isOtherAudioActive());
  } catch {
    return false;
  }
}
