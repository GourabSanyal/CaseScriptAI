import { AudioRecorderService } from '@/services/audio/audio-recorder-service';
import { ForegroundSessionService } from '@/services/audio/foreground-session-service';
import { createWavChunkWriter } from '@/services/audio/wav-chunk-writer';
import { appStorage } from '@/services/storage/mmkv';
import { createProcessingQueueStore } from '@/stores/processing-queue-store';
import { createRecordingStore } from '@/stores/recording-store';
import { AppErrorCode } from '@/types/result';

import type { ProcessingQueueItem } from '@/types/processing-queue';
import type { AudioCapturePort } from '@/types/recording';
import type { Result } from '@/types/result';

const PENDING_KEY = 'processing-queue-items';
const CHECKPOINT_KEY = 'recording-checkpoint';

/** Native PCM mic adapter is gated on POC_remove_ffmpeg device results (ARCHITECTURE §12). */
export const pendingNativeCapture: AudioCapturePort = {
  requestPermission: async () => ({
    success: false,
    error: 'Native mic capture adapter is pending device POC confirmation',
    errorCode: AppErrorCode.AUDIO_PERMISSION,
  }),
  start: async () => ({
    success: false,
    error: 'Native mic capture adapter is pending device POC confirmation',
  }),
  pause: async () => ({ success: true, data: undefined }),
  resume: async () => ({ success: true, data: undefined }),
  stop: async () => ({ success: true, data: undefined }),
};

// ponytail: in-memory atomic writer until expo-file-system adapter is wired with capture.
const memoryFiles = new Map<string, Uint8Array>();
const writeAtomic = async (finalPath: string, bytes: Uint8Array): Promise<Result<void>> => {
  memoryFiles.set(finalPath, bytes);
  return { success: true, data: undefined };
};

const chunkWriter = createWavChunkWriter(
  writeAtomic,
  (sessionId, sequence) => `recording://${sessionId}/${sequence}.wav`,
);

const loadQueueItems = (): ProcessingQueueItem[] => {
  const raw = appStorage.getString(PENDING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProcessingQueueItem[]) : [];
  } catch {
    return [];
  }
};

export const useProcessingQueueStore = createProcessingQueueStore({
  persistence: {
    load: loadQueueItems,
    save: (items) => appStorage.set(PENDING_KEY, JSON.stringify(items)),
  },
});

const chunkQueueBySession = new Map<string, { id: string; sequence: number; path: string }[]>();

export const audioRecorderService = new AudioRecorderService({
  capture: pendingNativeCapture,
  writeChunk: chunkWriter.writeChunk,
  enqueueChunk: async (chunk) => {
    const list = chunkQueueBySession.get(chunk.sessionId) ?? [];
    list.push({ id: chunk.id, sequence: chunk.sequence, path: chunk.path });
    chunkQueueBySession.set(chunk.sessionId, list);
    return { success: true, data: undefined };
  },
  clock: {
    now: Date.now,
    every: (ms, tick) => {
      const id = setInterval(tick, ms);
      return () => clearInterval(id);
    },
  },
});

export const foregroundSessionService = new ForegroundSessionService({
  // ponytail: real iOS bg-audio / Android mic FG notification lands with native capture.
  startNotification: async () => ({ success: true, data: undefined }),
  stopNotification: async () => ({ success: true, data: undefined }),
  saveCheckpoint: async (input) => {
    appStorage.set(CHECKPOINT_KEY, JSON.stringify(input));
    return { success: true, data: undefined };
  },
  loadCheckpoint: async () => {
    const raw = appStorage.getString(CHECKPOINT_KEY);
    if (!raw) return { success: true, data: null };
    try {
      return { success: true, data: JSON.parse(raw) };
    } catch {
      return { success: false, error: 'Corrupt recording checkpoint' };
    }
  },
  clearCheckpoint: async () => {
    appStorage.delete(CHECKPOINT_KEY);
    return { success: true, data: undefined };
  },
  clock: {
    now: Date.now,
    every: (ms, tick) => {
      const id = setInterval(tick, ms);
      return () => clearInterval(id);
    },
  },
});

export const useRecordingStore = createRecordingStore({
  recorder: audioRecorderService,
  foreground: foregroundSessionService,
  enqueueSession: {
    enqueue: (sessionId) => useProcessingQueueStore.getState().enqueue(sessionId),
    pendingCount: () => useProcessingQueueStore.getState().pendingCount(),
  },
  createSessionId: () => `session-${Date.now()}`,
});
