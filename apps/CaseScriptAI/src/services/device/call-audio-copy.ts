/**
 * Maps native / Expo audio failures to a stable app error when the mic
 * session cannot activate (typically an active cellular, FaceTime, or VoIP call).
 */
export const isAudioSessionBusyMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes('session activation failed') ||
    lower.includes('preparetorecordasync') ||
    lower.includes('failed to configure audio session') ||
    (lower.includes('audio session') && lower.includes('fail'))
  );
};

export const CALL_AUDIO_TOAST_ID = 'active-call-audio';

export const CALL_AUDIO_TOAST_TITLE = 'Call in progress';

export const CALL_AUDIO_TOAST_MESSAGE =
  'A phone, video, or VoIP call is using the microphone. End the call, then tap START.';
