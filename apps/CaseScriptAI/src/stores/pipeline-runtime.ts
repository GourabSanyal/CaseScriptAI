import { AppState } from 'react-native';
import { File } from 'expo-file-system';

import { LlmService } from '@/services/ai/llm-service';
import { memoryManager } from '@/services/ai/memory-manager';
import { createPipelineBackgroundController } from '@/services/ai/pipeline-background';
import { PipelineOrchestrator } from '@/services/ai/pipeline-orchestrator';
import {
  arePipelineRuntimesReady,
  llmRuntimeBridge,
  whisperRuntimeBridge,
} from '@/services/ai/pipeline-runtime-bridge';
import { TranscriptQueue } from '@/services/ai/transcript-queue';
import { WhisperService } from '@/services/ai/whisper-service';
import { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';
import {
  createSoapPersistPort,
  purgeSessionArtifacts,
} from '@/services/storage/encrypted-soap';
import { appStorage } from '@/services/storage/mmkv';
import { createPipelineStore } from '@/stores/pipeline-store';
import { useProcessingQueueStore } from '@/stores/recording-runtime';
import { sessionRepository, useSessionStore } from '@/stores/session-runtime';

import type { AudioChunkRef } from '@/services/audio/audio-chunk-queue';
import type { TranscriptSegment } from '@/services/ai/transcript-queue';

const audioKey = (sessionId: string) => `pipeline-audio-chunks:${sessionId}`;
const transcriptKey = (sessionId: string) => `pipeline-transcript:${sessionId}`;

const readJson = <T>(key: string): T | null => {
  const raw = appStorage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export { arePipelineRuntimesReady, setPipelineRuntimesReady } from '@/services/ai/pipeline-runtime-bridge';

export const whisperService = new WhisperService({
  memory: memoryManager,
  runtime: whisperRuntimeBridge,
  deleteChunk: {
    deletePath: async (path) => {
      try {
        const file = new File(path);
        if (file.exists) file.delete();
        return { success: true, data: undefined };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Delete failed',
        };
      }
    },
  },
});

export const llmService = new LlmService({
  memory: memoryManager,
  runtime: llmRuntimeBridge,
});

const queuePort = {
  claimNext: () => useProcessingQueueStore.getState().claimNext(),
  complete: (sessionId: string) => useProcessingQueueStore.getState().complete(sessionId),
  fail: (sessionId: string, reason: string) =>
    useProcessingQueueStore.getState().fail(sessionId, reason),
  recordDrainSample: (durationMs: number) =>
    useProcessingQueueStore.getState().recordDrainSample(durationMs),
};

export const pipelineOrchestrator = new PipelineOrchestrator({
  queue: queuePort,
  whisper: whisperService,
  llm: llmService,
  soap: createSoapPersistPort({
    sessions: sessionRepository,
    purge: async (sessionId) => {
      const purged = await purgeSessionArtifacts(sessionId, {
        listChunkPaths: async (id) => {
          const chunks = readJson<AudioChunkRef[]>(audioKey(id)) ?? [];
          return chunks.map((c) => c.path);
        },
        deletePath: async (path) => {
          try {
            const file = new File(path);
            if (file.exists) file.delete();
            return { success: true, data: undefined };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Delete failed',
            };
          }
        },
      });
      if (purged.success) {
        void useSessionStore.getState().hydrate();
      }
      return purged;
    },
  }),
  sessions: {
    createAudioQueue: (sessionId) =>
      new AudioChunkQueue(sessionId, {
        load: async (id) => readJson<AudioChunkRef[]>(audioKey(id)),
        save: async (id, chunks) => appStorage.set(audioKey(id), JSON.stringify(chunks)),
        remove: async (id) => {
          appStorage.delete(audioKey(id));
        },
      }),
    createTranscriptQueue: (sessionId) =>
      new TranscriptQueue(sessionId, {
        load: async (id) => readJson<TranscriptSegment[]>(transcriptKey(id)),
        save: async (id, segments) =>
          appStorage.set(transcriptKey(id), JSON.stringify(segments)),
        remove: async (id) => {
          appStorage.delete(transcriptKey(id));
        },
      }),
  },
  onProgress: (event) => {
    usePipelineStore.getState().applyEvent(event);
  },
});

export const usePipelineStore = createPipelineStore({
  runUntilIdle: async () => {
    if (!arePipelineRuntimesReady()) {
      return { success: false, error: 'Pipeline runtimes not ready' };
    }
    return pipelineOrchestrator.runUntilIdle();
  },
});

export const pipelineBackground = createPipelineBackgroundController({
  onForeground: () => {
    if (!arePipelineRuntimesReady()) return;
    void usePipelineStore.getState().startDrain();
  },
  subscribe: (listener) => {
    const sub = AppState.addEventListener('change', listener);
    return () => sub.remove();
  },
});
