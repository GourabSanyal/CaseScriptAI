import { concatBytes, pcmBytesForDurationMs } from '@/services/audio/wav-pcm';
import { AppErrorCode, type Result } from '@/types/result';

import type { AudioRecorderDependencies } from '@/types/recording';

const DEFAULT_CHUNK_MS = 30_000;

export class AudioRecorderService {
  private sessionId: string | null = null;
  private sequence = 0;
  private buffer: Uint8Array[] = [];
  private bufferedBytes = 0;
  private targetBytes: number;
  private cancelTick: (() => void) | null = null;
  private active = false;
  private paused = false;
  private flushChain: Promise<Result<void>> = Promise.resolve({ success: true, data: undefined });

  constructor(private readonly deps: AudioRecorderDependencies) {
    this.targetBytes = pcmBytesForDurationMs(deps.chunkDurationMs ?? DEFAULT_CHUNK_MS);
  }

  start = async (sessionId: string): Promise<Result<void>> => {
    if (this.active) return { success: false, error: 'Recording is already active' };
    if (!sessionId.trim()) return { success: false, error: 'sessionId is required' };

    const permission = await this.deps.capture.requestPermission();
    if (!permission.success) {
      return {
        success: false,
        error: permission.error,
        errorCode: permission.errorCode ?? AppErrorCode.AUDIO_PERMISSION,
      };
    }

    this.sessionId = sessionId;
    this.sequence = 0;
    this.buffer = [];
    this.bufferedBytes = 0;
    this.paused = false;

    const started = await this.deps.capture.start(async (pcm) => {
      if (!this.active || this.paused) return;
      this.buffer.push(pcm);
      this.bufferedBytes += pcm.byteLength;
      if (this.bufferedBytes >= this.targetBytes) {
        await this.enqueueFlush();
      }
    });
    if (!started.success) {
      this.resetLocal();
      return started;
    }

    this.active = true;
    const interval = this.deps.chunkDurationMs ?? DEFAULT_CHUNK_MS;
    this.cancelTick = this.deps.clock.every(interval, () => {
      if (this.active && !this.paused && this.bufferedBytes > 0) {
        void this.enqueueFlush();
      }
    });
    return { success: true, data: undefined };
  };

  pause = async (): Promise<Result<void>> => {
    if (!this.active || this.paused) {
      return { success: false, error: 'Recording is not running' };
    }
    const result = await this.deps.capture.pause();
    if (!result.success) return result;
    this.paused = true;
    return { success: true, data: undefined };
  };

  resume = async (): Promise<Result<void>> => {
    if (!this.active || !this.paused) {
      return { success: false, error: 'Recording is not paused' };
    }
    const result = await this.deps.capture.resume();
    if (!result.success) return result;
    this.paused = false;
    return { success: true, data: undefined };
  };

  stop = async (): Promise<Result<{ sessionId: string; chunkCount: number }>> => {
    if (!this.active || !this.sessionId) {
      return { success: false, error: 'Recording is not active' };
    }

    this.cancelTick?.();
    this.cancelTick = null;
    const stopped = await this.deps.capture.stop();
    if (!stopped.success) return stopped;

    if (this.bufferedBytes > 0) {
      const flushed = await this.enqueueFlush();
      if (!flushed.success) return flushed;
    } else {
      await this.flushChain;
    }

    const sessionId = this.sessionId;
    const chunkCount = this.sequence;
    this.resetLocal();
    return { success: true, data: { sessionId, chunkCount } };
  };

  private enqueueFlush = (): Promise<Result<void>> => {
    this.flushChain = this.flushChain.then((prior) => {
      if (!prior.success) return prior;
      return this.flushChunk();
    });
    return this.flushChain;
  };

  private flushChunk = async (): Promise<Result<void>> => {
    if (!this.sessionId || this.bufferedBytes === 0) {
      return { success: true, data: undefined };
    }

    const pcm = concatBytes(this.buffer);
    this.buffer = [];
    this.bufferedBytes = 0;
    const sequence = this.sequence;

    const written = await this.deps.writeChunk({
      sessionId: this.sessionId,
      sequence,
      pcm,
    });
    if (!written.success) {
      return {
        success: false,
        error: written.error,
        errorCode: written.errorCode ?? AppErrorCode.AUDIO_BUFFER_OVERFLOW,
      };
    }

    const enqueued = await this.deps.enqueueChunk({
      id: written.data.id,
      sessionId: this.sessionId,
      sequence,
      path: written.data.path,
    });
    if (!enqueued.success) return enqueued;

    this.sequence += 1;
    this.deps.onChunkWritten?.(this.sequence);
    return { success: true, data: undefined };
  };

  private resetLocal = (): void => {
    this.active = false;
    this.paused = false;
    this.sessionId = null;
    this.sequence = 0;
    this.buffer = [];
    this.bufferedBytes = 0;
    this.cancelTick?.();
    this.cancelTick = null;
  };
}
