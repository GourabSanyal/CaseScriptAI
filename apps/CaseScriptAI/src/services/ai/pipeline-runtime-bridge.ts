import type { LlmRuntimePort, WhisperRuntimePort } from '@/types/pipeline';
import type { Result } from '@/types/result';

type Ports = {
  whisper: WhisperRuntimePort;
  llm: LlmRuntimePort;
};

const notBound = (name: string): Result<never> => ({
  success: false,
  error: `${name} runtime not bound`,
});

let ports: Ports | null = null;
let ready = false;

/** Registers ExecuTorch-backed ports from a React tree (hooks must own load/unload). */
export const bindPipelinePorts = (next: Ports): void => {
  ports = next;
};

export const setPipelineRuntimesReady = (value: boolean): void => {
  ready = value;
};

export const arePipelineRuntimesReady = (): boolean => ready && ports !== null;

export const whisperRuntimeBridge: WhisperRuntimePort = {
  load: () => ports?.whisper.load() ?? Promise.resolve(notBound('Whisper')),
  transcribe: (path) =>
    ports?.whisper.transcribe(path) ?? Promise.resolve(notBound('Whisper')),
  unload: () => ports?.whisper.unload() ?? Promise.resolve({ success: true, data: undefined }),
};

export const llmRuntimeBridge: LlmRuntimePort = {
  isReady: () => ports?.llm.isReady() ?? Promise.resolve(notBound('LLM')),
  generate: (prompt) =>
    ports?.llm.generate(prompt) ?? Promise.resolve(notBound('LLM')),
  interrupt: () => ports?.llm.interrupt() ?? Promise.resolve({ success: true, data: undefined }),
  unload: () => ports?.llm.unload() ?? Promise.resolve({ success: true, data: undefined }),
};
