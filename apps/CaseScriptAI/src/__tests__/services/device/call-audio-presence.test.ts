import {
  CALL_AUDIO_TOAST_ID,
  CALL_AUDIO_TOAST_MESSAGE,
  isAudioSessionBusyMessage,
} from '@/services/device/call-audio-copy';
import {
  guardRecordingAgainstCallAudio,
  notifyRecordingStartFailure,
  setCallAudioPresencePort,
  syncCallAudioToast,
} from '@/services/device/call-audio-presence';
import { useToastStore } from '@/stores/toast-store';
import { AppErrorCode } from '@/types/result';

describe('call-audio-copy', () => {
  it('detects Expo session activation failures', () => {
    expect(
      isAudioSessionBusyMessage(
        "Calling the 'prepareToRecordAsync' function has failed -> Caused by: Audio recording error: Failed to configure audio session: Session activation failed",
      ),
    ).toBe(true);
    expect(isAudioSessionBusyMessage('Microphone permission denied')).toBe(false);
  });
});

describe('call-audio-presence', () => {
  beforeEach(() => {
    useToastStore.setState({ current: null });
    setCallAudioPresencePort(null);
  });

  it('guards START when other audio is active', () => {
    setCallAudioPresencePort({ isOtherAudioActive: () => true });
    const result = guardRecordingAgainstCallAudio();
    expect(result).toMatchObject({
      success: false,
      errorCode: AppErrorCode.AUDIO_SESSION_BUSY,
    });
    expect(useToastStore.getState().current?.id).toBe(CALL_AUDIO_TOAST_ID);
    expect(useToastStore.getState().current?.message).toBe(CALL_AUDIO_TOAST_MESSAGE);
  });

  it('allows START when audio is free', () => {
    setCallAudioPresencePort({ isOtherAudioActive: () => false });
    expect(guardRecordingAgainstCallAudio()).toEqual({ success: true, data: undefined });
    expect(useToastStore.getState().current).toBeNull();
  });

  it('shows toast for session-busy start failures without a probe hit', () => {
    notifyRecordingStartFailure(
      "Calling the 'prepareToRecordAsync' function has failed -> Session activation failed",
    );
    expect(useToastStore.getState().current?.id).toBe(CALL_AUDIO_TOAST_ID);
  });

  it('syncs toast on and off with presence', () => {
    setCallAudioPresencePort({ isOtherAudioActive: () => true });
    expect(syncCallAudioToast()).toBe(true);
    expect(useToastStore.getState().current?.id).toBe(CALL_AUDIO_TOAST_ID);

    setCallAudioPresencePort({ isOtherAudioActive: () => false });
    expect(syncCallAudioToast()).toBe(false);
    expect(useToastStore.getState().current).toBeNull();
  });
});
