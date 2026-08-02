import { File } from 'expo-file-system';

import { pickAudioFile } from '@/services/audio/audio-picker';
import { convertToWav } from '@/services/audio/audio-processor';
import { appStorage } from '@/services/storage/mmkv';
import { useProcessingQueueStore } from '@/stores/recording-runtime';

import type { AudioChunkRef } from '@/services/audio/audio-chunk-queue';
import type { Result } from '@/types/result';

const audioKey = (sessionId: string) => `pipeline-audio-chunks:${sessionId}`;

/**
 * Temporary import path for device testing (POC FFmpeg).
 * ponytail: not formal 2.7 — swap for native decoder when §12 lands.
 */
export const importAudioToProcessingQueue = async (): Promise<Result<string>> => {
  const picked = await pickAudioFile();
  if (!picked) return { success: false, error: 'No file selected' };

  const wav = await convertToWav(picked.uri);
  if (!wav.success) return wav;

  const sessionId = `import-${Date.now()}`;
  const chunk: AudioChunkRef = {
    id: `${sessionId}-0`,
    sessionId,
    sequence: 0,
    path: wav.data,
  };
  appStorage.set(audioKey(sessionId), JSON.stringify([chunk]));

  const enqueued = await useProcessingQueueStore.getState().enqueue(sessionId);
  if (!enqueued.success) return enqueued;

  // Best-effort: keep WAV on disk for Whisper; picker cache may still exist.
  try {
    const pickedFile = new File(picked.uri);
    if (pickedFile.exists && picked.uri !== wav.data) pickedFile.delete();
  } catch {
    // ignore
  }

  return { success: true, data: sessionId };
};
