import {
  AudioModule,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { File } from 'expo-file-system';

import { convertToWav } from '@/services/audio/audio-processor';
import { pcmPayloadFromWavBytes } from '@/services/audio/wav-pcm';
import {
  CALL_AUDIO_TOAST_MESSAGE,
  isAudioSessionBusyMessage,
} from '@/services/device/call-audio-copy';
import { AppErrorCode, type Result } from '@/types/result';

import type { AudioCapturePort } from '@/types/recording';

type ExpoRecorder = InstanceType<typeof AudioModule.AudioRecorder>;

const SEGMENT_MS = 30_000;

const mapStartError = (error: unknown): Result<void> => {
  const message = error instanceof Error ? error.message : 'Failed to start mic';
  if (isAudioSessionBusyMessage(message)) {
    return {
      success: false,
      error: CALL_AUDIO_TOAST_MESSAGE,
      errorCode: AppErrorCode.AUDIO_SESSION_BUSY,
    };
  }
  return { success: false, error: message };
};

/**
 * Foreground mic → PCM for AudioRecorderService.
 * ponytail: file segments via expo-audio + FFmpeg→WAV; no FG notification (2.2 later).
 */
export const createExpoAudioCapture = (
  segmentMs = SEGMENT_MS,
): AudioCapturePort => {
  let recorder: ExpoRecorder | null = null;
  let onPcm: ((pcm: Uint8Array) => void | Promise<void>) | null = null;
  let rotateTimer: ReturnType<typeof setInterval> | null = null;
  let paused = false;
  let rotating = false;

  const clearTimer = () => {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = null;
  };

  const makeRecorder = () =>
    new AudioModule.AudioRecorder({
      ...RecordingPresets.HIGH_QUALITY,
      numberOfChannels: 1,
      sampleRate: 16_000,
    });

  const emitUri = async (uri: string | null): Promise<Result<void>> => {
    if (!uri || !onPcm) return { success: true, data: undefined };
    const wav = await convertToWav(uri);
    if (!wav.success) return wav;
    try {
      const wavFile = new File(wav.data);
      const bytes = await wavFile.bytes();
      const pcm = pcmPayloadFromWavBytes(bytes);
      if (pcm.byteLength > 0) await onPcm(pcm);
      // Drop temp decode artifacts so RAM/disk don't stack across rotates
      if (wavFile.exists) wavFile.delete();
      if (uri !== wav.data) {
        const src = new File(uri);
        if (src.exists) src.delete();
      }
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read WAV',
      };
    }
  };

  const beginSegment = async (): Promise<Result<void>> => {
    try {
      recorder = makeRecorder();
      await recorder.prepareToRecordAsync();
      recorder.record();
      return { success: true, data: undefined };
    } catch (error) {
      return mapStartError(error);
    }
  };

  const rotate = async (): Promise<void> => {
    if (!recorder || paused || rotating) return;
    rotating = true;
    try {
      await recorder.stop();
      await emitUri(recorder.uri);
      await beginSegment();
    } finally {
      rotating = false;
    }
  };

  return {
    requestPermission: async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          return {
            success: false,
            error: 'Microphone permission denied',
            errorCode: AppErrorCode.AUDIO_PERMISSION,
          };
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Permission failed',
          errorCode: AppErrorCode.AUDIO_PERMISSION,
        };
      }
    },
    start: async (cb) => {
      onPcm = cb;
      paused = false;
      const started = await beginSegment();
      if (!started.success) return started;
      clearTimer();
      rotateTimer = setInterval(() => {
        void rotate();
      }, segmentMs);
      return { success: true, data: undefined };
    },
    pause: async () => {
      if (!recorder) return { success: false, error: 'Not recording' };
      paused = true;
      clearTimer();
      try {
        recorder.pause();
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Pause failed',
        };
      }
    },
    resume: async () => {
      if (!recorder) return { success: false, error: 'Not recording' };
      paused = false;
      try {
        recorder.record();
        clearTimer();
        rotateTimer = setInterval(() => {
          void rotate();
        }, segmentMs);
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Resume failed',
        };
      }
    },
    stop: async () => {
      clearTimer();
      paused = false;
      if (!recorder) {
        onPcm = null;
        return { success: true, data: undefined };
      }
      try {
        await recorder.stop();
        await emitUri(recorder.uri);
        recorder = null;
        onPcm = null;
        return { success: true, data: undefined };
      } catch (error) {
        recorder = null;
        onPcm = null;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Stop failed',
        };
      }
    },
  };
};
