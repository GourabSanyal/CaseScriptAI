import { File, Paths } from 'expo-file-system';

import { AudioRecorderService } from '@/services/audio/audio-recorder-service';
import { createExpoAudioCapture } from '@/services/audio/expo-audio-capture';
import { ForegroundSessionService } from '@/services/audio/foreground-session-service';
import { createWavChunkWriter } from '@/services/audio/wav-chunk-writer';
import { appStorage } from '@/services/storage/mmkv';
import { createProcessingQueueStore } from '@/stores/processing-queue-store';
import { createRecordingStore } from '@/stores/recording-store';

import type { AudioChunkRef } from '@/services/audio/audio-chunk-queue';
import type { ProcessingQueueItem } from '@/types/processing-queue';
import type { Result } from '@/types/result';

const PENDING_KEY = 'processing-queue-items';
const CHECKPOINT_KEY = 'recording-checkpoint';
const audioChunksKey = (sessionId: string) => `pipeline-audio-chunks:${sessionId}`;

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

const readChunks = (sessionId: string): AudioChunkRef[] => {
  const raw = appStorage.getString(audioChunksKey(sessionId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AudioChunkRef[]) : [];
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

const writeAtomic = async (finalPath: string, bytes: Uint8Array): Promise<Result<void>> => {
  try {
    const file = new File(finalPath);
    file.create({ intermediates: true, overwrite: true });
    file.write(bytes);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write chunk',
    };
  }
};

const chunkWriter = createWavChunkWriter(
  writeAtomic,
  (sessionId, sequence) =>
    new File(Paths.document, 'recordings', sessionId, `${sequence}.wav`).uri,
);

export const audioRecorderService = new AudioRecorderService({
  capture: createExpoAudioCapture(),
  writeChunk: chunkWriter.writeChunk,
  enqueueChunk: async (chunk) => {
    const next = [...readChunks(chunk.sessionId), chunk];
    appStorage.set(audioChunksKey(chunk.sessionId), JSON.stringify(next));
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
  // ponytail: FG notification deferred (2.2) — foreground mic only for now
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
