import { useEffect, useRef, useState } from 'react';
import { useLLM, useSpeechToText } from 'react-native-executorch';
import { File } from 'expo-file-system';

import { LLM_MODELS, WHISPER_MODEL } from '@/constants/models';
import { initializeExecutorch } from '@/services/ai/llm-inference';
import {
  bindPipelinePorts,
  clearPipelinePorts,
  setPipelineRuntimesReady,
} from '@/services/ai/pipeline-runtime-bridge';
import { parseWavData } from '@/services/audio/wav-parser';
import { useDeviceStore } from '@/stores/device-store';
import { usePipelineStore } from '@/stores/pipeline-runtime';
import { useProcessingQueueStore } from '@/stores/recording-runtime';

import type { Result } from '@/types/result';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const waitReady = async (
  isReady: () => boolean,
  getError: () => { message?: string } | null | undefined,
): Promise<Result<void>> => {
  let delay = 100;
  for (let i = 0; i < 600; i++) {
    const err = getError();
    if (err) return { success: false, error: err.message ?? 'Model failed to load' };
    if (isReady()) return { success: true, data: undefined };
    await sleep(delay);
    delay = Math.min(delay * 1.5, 1000);
  }
  return { success: false, error: 'Model load timed out' };
};

/** Wait until preventLoad has dropped native readiness (soft unload is async). */
const waitUnloaded = async (isReady: () => boolean): Promise<void> => {
  for (let i = 0; i < 50; i++) {
    if (!isReady()) return;
    await sleep(100);
  }
  // ponytail: ExecuTorch has no hard unload API; ceiling is ~5s wait then proceed
};

/** Mount once under (app). Owns ExecuTorch hooks and plugs them into pipeline services. */
export const useBindPipelineRuntimes = (): void => {
  const persistedTier = useDeviceStore((s) => s.selection?.tier ?? 'lite');
  // Freeze the loaded LLM until (app) remounts — OOM heal must not swap models mid-session.
  const [tier] = useState(persistedTier);
  const [whisperOn, setWhisperOn] = useState(false);
  const [llmOn, setLlmOn] = useState(false);

  const whisper = useSpeechToText({
    model: WHISPER_MODEL,
    preventLoad: !whisperOn,
  });
  const llm = useLLM({
    model: LLM_MODELS[tier],
    preventLoad: !llmOn,
  });

  const whisperRef = useRef(whisper);
  const llmRef = useRef(llm);
  whisperRef.current = whisper;
  llmRef.current = llm;

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      await initializeExecutorch();
      if (cancelled) return;

      bindPipelinePorts({
        whisper: {
          load: async () => {
            setWhisperOn(true);
            await sleep(150);
            return waitReady(
              () => Boolean(whisperRef.current.isReady),
              () => whisperRef.current.error,
            );
          },
          transcribe: async (audioPath) => {
            try {
              const file = new File(audioPath);
              if (!file.exists) {
                return { success: false, error: 'Audio file missing' };
              }
              // ponytail: ExecuTorch STT needs Float32 in JS; release after call
              const samples = parseWavData(await file.bytes());
              const result = await whisperRef.current.transcribe(samples, { language: 'en' });
              const text = result?.text?.trim() ?? '';
              if (!text) return { success: false, error: 'Empty transcription' };
              return { success: true, data: text };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Transcription failed',
              };
            }
          },
          unload: async () => {
            setWhisperOn(false);
            await waitUnloaded(() => Boolean(whisperRef.current.isReady));
            return { success: true, data: undefined };
          },
        },
        llm: {
          isReady: async () => {
            setLlmOn(true);
            await sleep(150);
            return waitReady(
              () => Boolean(llmRef.current.isReady),
              () => llmRef.current.error,
            );
          },
          generate: async (prompt) => {
            try {
              const response = await llmRef.current.generate([
                { role: 'system', content: 'You are a medical documentation assistant.' },
                { role: 'user', content: prompt },
              ]);
              return { success: true, data: response || '' };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Generation failed',
              };
            }
          },
          interrupt: async () => {
            try {
              llmRef.current.interrupt();
              return { success: true, data: undefined };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Interrupt failed',
              };
            }
          },
          unload: async () => {
            setLlmOn(false);
            await waitUnloaded(() => Boolean(llmRef.current.isReady));
            return { success: true, data: undefined };
          },
        },
      });

      if (cancelled) return;
      setPipelineRuntimesReady(true);
      const hasWork = useProcessingQueueStore
        .getState()
        .items.some((item) => item.status === 'queued' || item.status === 'processing');
      if (hasWork) void usePipelineStore.getState().startDrain();
    };

    void boot();
    return () => {
      cancelled = true;
      clearPipelinePorts();
    };
  }, [tier]);
};
