import type { PipelinePhase, PipelineProgressEvent } from '@/types/pipeline';
import type { Result } from '@/types/result';

export type PipelineStoreState = {
  sessionId: string | null;
  phase: PipelinePhase;
  progress: number;
  detail: string | null;
  error: string | null;
  isActive: boolean;
};

export type PipelineStore = PipelineStoreState & {
  applyEvent: (event: PipelineProgressEvent) => void;
  reset: () => void;
  startDrain: () => Promise<Result<number>>;
};

export type PipelineStoreDeps = {
  runUntilIdle: () => Promise<Result<number>>;
};
