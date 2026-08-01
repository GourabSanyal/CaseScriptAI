import type { Result } from '@/types/result';

export type PipelinePhase =
  | 'idle'
  | 'whisper'
  | 'llm'
  | 'complete'
  | 'failed';

export type PipelineProgressEvent = {
  sessionId: string;
  phase: PipelinePhase;
  /** 0–1 overall session progress */
  progress: number;
  detail?: string;
};

export type PipelineSessionResult = {
  sessionId: string;
  transcript: string;
  soapNote: string;
  durationMs: number;
};

export type WhisperRuntimePort = {
  load: () => Promise<Result<void>>;
  transcribe: (audioPath: string) => Promise<Result<string>>;
  unload: () => Promise<Result<void>>;
};

export type LlmRuntimePort = {
  isReady: () => Promise<Result<void>>;
  generate: (prompt: string) => Promise<Result<string>>;
  interrupt: () => Promise<Result<void>>;
  unload: () => Promise<Result<void>>;
};

export type SoapPersistPort = {
  save: (sessionId: string, soapNote: string) => Promise<Result<void>>;
};

export type ChunkDeletePort = {
  deletePath: (path: string) => Promise<Result<void>>;
};
