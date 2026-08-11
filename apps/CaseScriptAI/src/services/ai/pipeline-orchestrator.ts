import type { LlmService } from '@/services/ai/llm-service';
import type { WhisperService } from '@/services/ai/whisper-service';
import type { AudioChunkQueue } from '@/services/audio/audio-chunk-queue';
import type { TranscriptQueue } from '@/services/ai/transcript-queue';
import type {
  PipelineProgressEvent,
  PipelineSessionResult,
  SoapPersistPort,
} from '@/types/pipeline';
import { AppErrorCode } from '@/types/result';

import type { ProcessingQueueStore } from '@/types/processing-queue';
import type { Result } from '@/types/result';

export type PipelineQueuePort = Pick<
  ProcessingQueueStore,
  'claimNext' | 'complete' | 'fail' | 'recordDrainSample'
>;

export type PipelineSessionFactories = {
  createAudioQueue: (sessionId: string) => AudioChunkQueue;
  createTranscriptQueue: (sessionId: string) => TranscriptQueue;
};

export type PipelineOrchestratorDeps = {
  queue: PipelineQueuePort;
  whisper: WhisperService;
  llm: LlmService;
  soap: SoapPersistPort;
  sessions: PipelineSessionFactories;
  onProgress?: (event: PipelineProgressEvent) => void;
  now?: () => number;
};

/**
 * Drains processing-queue one session at a time: Whisper → LLM → persist SOAP.
 * Does not load models itself — services own MemoryManager locks.
 */
export class PipelineOrchestrator {
  private running = false;
  private stopped = false;

  constructor(private readonly deps: PipelineOrchestratorDeps) {}

  stop = (): void => {
    this.stopped = true;
  };

  resume = (): void => {
    this.stopped = false;
  };

  isRunning = (): boolean => this.running;

  /** Process at most one claimed session. Safe to call from a poll/AppState loop. */
  tick = async (): Promise<Result<PipelineSessionResult | null>> => {
    if (this.running || this.stopped) {
      return { success: true, data: null };
    }

    const claimed = this.deps.queue.claimNext();
    if (!claimed.success) return claimed;
    if (!claimed.data) return { success: true, data: null };

    const sessionId = claimed.data.sessionId;
    this.running = true;
    const startedAt = (this.deps.now ?? Date.now)();

    try {
      this.emit(sessionId, 'whisper', 0.05);

      const audioQueue = this.deps.sessions.createAudioQueue(sessionId);
      const transcriptQueue = this.deps.sessions.createTranscriptQueue(sessionId);
      await audioQueue.restore();
      await transcriptQueue.restore();

      const transcript = await this.deps.whisper.processSession({
        audioQueue,
        transcriptQueue,
        onProgress: ({ completed }) => {
          this.emit(sessionId, 'whisper', Math.min(0.55, 0.1 + completed * 0.05));
        },
      });
      if (!transcript.success) {
        this.deps.queue.fail(sessionId, transcript.error);
        this.emit(sessionId, 'failed', 0, transcript.error);
        return transcript;
      }

      this.emit(sessionId, 'llm', 0.6);
      const soap = await this.deps.llm.generateSoap(transcript.data);
      if (!soap.success) {
        this.deps.queue.fail(sessionId, soap.error);
        this.emit(sessionId, 'failed', 0.6, soap.error);
        return soap;
      }

      const saved = await this.deps.soap.save(sessionId, soap.data);
      if (!saved.success) {
        this.deps.queue.fail(sessionId, saved.error);
        this.emit(sessionId, 'failed', 0.9, saved.error);
        return saved;
      }

      const durationMs = (this.deps.now ?? Date.now)() - startedAt;
      this.deps.queue.recordDrainSample(durationMs);
      this.deps.queue.complete(sessionId);
      this.emit(sessionId, 'complete', 1);

      return {
        success: true,
        data: {
          sessionId,
          transcript: transcript.data,
          soapNote: soap.data,
          durationMs,
        },
      };
    } finally {
      this.running = false;
    }
  };

  /** Drain until empty. Session failures retry-once via the queue; OOM aborts so heal can run. */
  runUntilIdle = async (): Promise<Result<number>> => {
    let processed = 0;
    for (;;) {
      const step = await this.tick();
      if (!step.success) {
        if (step.errorCode === AppErrorCode.MODEL_OOM) return step;
        continue;
      }
      if (!step.data) return { success: true, data: processed };
      processed += 1;
    }
  };

  private emit = (
    sessionId: string,
    phase: PipelineProgressEvent['phase'],
    progress: number,
    detail?: string,
  ): void => {
    this.deps.onProgress?.({ sessionId, phase, progress, detail });
  };
}
