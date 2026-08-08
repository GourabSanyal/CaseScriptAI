import { isOtherAudioActive as nativeIsOtherAudioActive } from 'audio-presence';

import {
  CALL_AUDIO_TOAST_ID,
  CALL_AUDIO_TOAST_MESSAGE,
  CALL_AUDIO_TOAST_TITLE,
  isAudioSessionBusyMessage,
} from '@/services/device/call-audio-copy';
import { dismissToast, showToast } from '@/stores/toast-store';
import { AppErrorCode, type Result } from '@/types/result';

export type CallAudioPresencePort = {
  isOtherAudioActive: () => boolean;
};

const defaultPort: CallAudioPresencePort = {
  isOtherAudioActive: () => nativeIsOtherAudioActive(),
};

let port: CallAudioPresencePort = defaultPort;

/** Test seam — swap the native probe without touching UI. */
export const setCallAudioPresencePort = (next: CallAudioPresencePort | null): void => {
  port = next ?? defaultPort;
};

export const isCallOrOtherAudioActive = (): boolean => {
  try {
    return port.isOtherAudioActive();
  } catch {
    return false;
  }
};

export const showCallAudioToast = (): void => {
  showToast({
    id: CALL_AUDIO_TOAST_ID,
    title: CALL_AUDIO_TOAST_TITLE,
    message: CALL_AUDIO_TOAST_MESSAGE,
    variant: 'warning',
    durationMs: 0,
  });
};

export const dismissCallAudioToast = (): void => {
  dismissToast(CALL_AUDIO_TOAST_ID);
};

/** Sync toast with current call/audio presence. Returns whether a call is active. */
export const syncCallAudioToast = (): boolean => {
  const active = isCallOrOtherAudioActive();
  if (active) showCallAudioToast();
  else dismissCallAudioToast();
  return active;
};

/**
 * Guard mic START: if another app holds audio, show toast and fail with AUDIO_SESSION_BUSY.
 */
export const guardRecordingAgainstCallAudio = (): Result<void> => {
  if (!isCallOrOtherAudioActive()) {
    return { success: true, data: undefined };
  }
  showCallAudioToast();
  return {
    success: false,
    error: CALL_AUDIO_TOAST_MESSAGE,
    errorCode: AppErrorCode.AUDIO_SESSION_BUSY,
  };
};

/**
 * After a failed START, upgrade session-activation dumps into the call toast
 * (covers cases where presence probe is unavailable before a native rebuild).
 */
export const notifyRecordingStartFailure = (error: string, errorCode?: AppErrorCode): void => {
  if (
    errorCode === AppErrorCode.AUDIO_SESSION_BUSY ||
    isAudioSessionBusyMessage(error)
  ) {
    showCallAudioToast();
  }
};
