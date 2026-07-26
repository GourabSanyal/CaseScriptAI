import type { AppErrorCode, Result } from '@/types/result';
import type { StateStorage } from 'zustand/middleware';

export type RecordingState =
  | { status: 'idle' }
  | { status: 'requesting-permission'; sessionId: string }
  | { status: 'recording'; sessionId: string; chunkCount: number }
  | { status: 'paused'; sessionId: string; chunkCount: number }
  | { status: 'stopping'; sessionId: string; chunkCount: number }
  | { status: 'queued'; sessionId: string; chunkCount: number }
  | { status: 'orphaned'; sessionId: string; chunkCount: number }
  | {
      status: 'failed';
      error: string;
      errorCode?: AppErrorCode;
      sessionId?: string;
      chunkCount?: number;
    };

export type RecordingEvent =
  | { type: 'START'; sessionId: string }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED'; error: string }
  | { type: 'CHUNK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'STOPPED'; chunkCount?: number }
  | { type: 'DETECT_ORPHAN'; sessionId: string; chunkCount: number }
  | { type: 'RESUME_ORPHAN' }
  | { type: 'DISCARD_ORPHAN' }
  | { type: 'FAIL'; error: string; errorCode?: AppErrorCode }
  | { type: 'RESET' };

/** Raw PCM capture — never co-resident with model loads; adapter is POC-gated. */
export type AudioCapturePort = {
  requestPermission: () => Promise<Result<void>>;
  start: (onPcm: (pcm: Uint8Array) => void | Promise<void>) => Promise<Result<void>>;
  pause: () => Promise<Result<void>>;
  resume: () => Promise<Result<void>>;
  stop: () => Promise<Result<void>>;
};

export type ChunkFileWriter = {
  writeChunk: (input: {
    sessionId: string;
    sequence: number;
    pcm: Uint8Array;
  }) => Promise<Result<{ path: string; id: string }>>;
};

export type RecordingSessionClock = {
  now: () => number;
  /** Returns a cancel handle for the scheduled tick. */
  every: (ms: number, tick: () => void) => () => void;
};

export type AudioRecorderDependencies = {
  capture: AudioCapturePort;
  writeChunk: ChunkFileWriter['writeChunk'];
  enqueueChunk: (chunk: {
    id: string;
    sessionId: string;
    sequence: number;
    path: string;
  }) => Promise<Result<void>>;
  clock: RecordingSessionClock;
  chunkDurationMs?: number;
  onChunkWritten?: (chunkCount: number) => void;
};

export type ForegroundSessionDependencies = {
  startNotification: (sessionId: string) => Promise<Result<void>>;
  stopNotification: () => Promise<Result<void>>;
  saveCheckpoint: (input: {
    sessionId: string;
    chunkCount: number;
    updatedAt: number;
  }) => Promise<Result<void>>;
  loadCheckpoint: () => Promise<Result<{
    sessionId: string;
    chunkCount: number;
    updatedAt: number;
  } | null>>;
  clearCheckpoint: () => Promise<Result<void>>;
  clock: { now: () => number; every: (ms: number, tick: () => void) => () => void };
  checkpointIntervalMs?: number;
};

export type ProcessingEnqueuePort = {
  enqueue: (sessionId: string) => Promise<Result<void>>;
  pendingCount: () => number;
};

export type RecordingStore = {
  machine: RecordingState;
  pendingCount: number;
  error: string | null;
  hasHydrated: boolean;
  start: () => Promise<Result<string>>;
  pause: () => Promise<Result<void>>;
  resume: () => Promise<Result<void>>;
  stop: () => Promise<Result<void>>;
  recoverOrphan: (action: 'resume' | 'discard') => Promise<Result<void>>;
  refreshPendingCount: () => void;
  reset: () => void;
};

export type RecordingStoreDeps = {
  recorder: {
    start: (sessionId: string) => Promise<Result<void>>;
    pause: () => Promise<Result<void>>;
    resume: () => Promise<Result<void>>;
    stop: () => Promise<Result<{ sessionId: string; chunkCount: number }>>;
  };
  foreground: {
    begin: (sessionId: string, chunkCount: number) => Promise<Result<void>>;
    end: () => Promise<Result<void>>;
    updateChunkCount: (chunkCount: number) => void;
  };
  enqueueSession: ProcessingEnqueuePort;
  createSessionId: () => string;
  stateStorage?: StateStorage;
};
