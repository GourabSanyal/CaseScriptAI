import { AppState } from 'react-native';

import { LlmService } from '@/services/ai/llm-service';
import { memoryManager } from '@/services/ai/memory-manager';
import { createPipelineBackgroundController } from '@/services/ai/pipeline-background';
import { PipelineOrchestrator } from '@/services/ai/pipeline-orchestrator';
import { TranscriptQueue } from '@/services/ai/transcript-queue';
import { WhisperService } from '@/services/ai/whisper-service';
import { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';
import { appStorage } from '@/services/storage/mmkv';
import { createPipelineStore } from '@/stores/pipeline-store';
import { useProcessingQueueStore } from '@/stores/recording-runtime';

import type { AudioChunkRef } from '@/services/audio/audio-chunk-queue';
import type { TranscriptSegment } from '@/services/ai/transcript-queue';
import type { Result } from '@/types/result';

const audioKey = (sessionId: string) => `pipeline-audio-chunks:${sessionId}`;
const transcriptKey = (sessionId: string) => `pipeline-transcript:${sessionId}`;
const soapKey = (sessionId: string) => `pipeline-soap:${sessionId}`;

const readJson = <T>(key: string): T | null => {
  const raw = appStorage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/** Flipped when ExecuTorch STT/LLM ports are bound in a React tree. */
let pipelineRuntimesReady = false;

export const setPipelineRuntimesReady = (ready: boolean): void => {
  pipelineRuntimesReady = ready;
};

export const arePipelineRuntimesReady = (): boolean => pipelineRuntimesReady;

/** Placeholder until ExecuTorch hooks are bound (drain gated so stubs cannot burn retries). */
const pendingWhisperRuntime = {
  load: async (): Promise<Result<void>> => ({
    success: false,
    error: 'Whisper runtime pending ExecuTorch hook binding',
  }),
  transcribe: async (): Promise<Result<string>> => ({
    success: false,
    error: 'Whisper runtime pending ExecuTorch hook binding',
  }),
  unload: async (): Promise<Result<void>> => ({ success: true, data: undefined }),
};

const pendingLlmRuntime = {
  isReady: async (): Promise<Result<void>> => ({
    success: false,
    error: 'LLM runtime pending ExecuTorch hook binding',
  }),
  generate: async (): Promise<Result<string>> => ({
    success: false,
    error: 'LLM runtime pending ExecuTorch hook binding',
  }),
  interrupt: async (): Promise<Result<void>> => ({ success: true, data: undefined }),
  unload: async (): Promise<Result<void>> => ({ success: true, data: undefined }),
};

export const whisperService = new WhisperService({
  memory: memoryManager,
  runtime: pendingWhisperRuntime,
  deleteChunk: {
    deletePath: async () => ({ success: true, data: undefined }),
  },
});

export const llmService = new LlmService({
  memory: memoryManager,
  runtime: pendingLlmRuntime,
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
  soap: {
    // ponytail: plaintext MMKV until Slice 4 AES-GCM file adapter
    save: async (sessionId, soapNote) => {
      appStorage.set(soapKey(sessionId), soapNote);
      return { success: true, data: undefined };
    },
  },
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
    if (!pipelineRuntimesReady) {
      return { success: false, error: 'Pipeline runtimes not ready' };
    }
    return pipelineOrchestrator.runUntilIdle();
  },
});

export const pipelineBackground = createPipelineBackgroundController({
  onForeground: () => {
    if (!pipelineRuntimesReady) return;
    void usePipelineStore.getState().startDrain();
  },
  subscribe: (listener) => {
    const sub = AppState.addEventListener('change', listener);
    return () => sub.remove();
  },
});
