import type { LLMTier } from '@/types/device';
import type { AppErrorCode, Result } from '@/types/result';
import type { StateStorage } from 'zustand/middleware';

export type ChecksumRecord = {
  sha256: string;
  size: number;
  version: string;
};
export type ChecksumManifest = Record<string, ChecksumRecord>;
export type CachedChecksum = { record: ChecksumRecord; cachedAt: number };
export type ChecksumCacheStore = {
  getString: (key: string) => string | null;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};
export type ChecksumValidatorDependencies = {
  fetchManifest: () => Promise<Result<ChecksumManifest>>;
  cache: ChecksumCacheStore;
  fallback: ChecksumManifest;
  now: () => number;
};

export type DownloadAssetId =
  | 'whisper-tiny.model'
  | 'whisper-tiny.tokenizer'
  | 'qwen3-0.6b-quantized.model'
  | 'qwen3-0.6b-quantized.tokenizer'
  | 'qwen3-0.6b-quantized.tokenizer-config'
  | 'qwen3-1.7b-quantized.model'
  | 'qwen3-1.7b-quantized.tokenizer'
  | 'qwen3-1.7b-quantized.tokenizer-config'
  | 'qwen3-4b-quantized.model'
  | 'qwen3-4b-quantized.tokenizer'
  | 'qwen3-4b-quantized.tokenizer-config';
export type DownloadResumeMode = 'range' | 'restart';
export type DownloadAsset = {
  id: DownloadAssetId;
  url: string;
  resumeMode: DownloadResumeMode;
  expectedSizeBytes?: number;
};
export type AssetDownloadState = {
  assetId: DownloadAssetId;
  bytesWritten: number;
  attempt: number;
  updatedAt: number;
};

export type StorageCheck = {
  requiredBytes: number;
  bufferedBytes: number;
  availableBytes: number;
};
export type AvailableDiskBytes = () => number;

export type DownloadRequest = {
  url: string;
  offset: number;
  resumeMode: DownloadResumeMode;
  expectedSizeBytes?: number;
  onProgress?: (bytesWritten: number) => void;
};
export type DownloadTransport = {
  headAcceptsRanges: (url: string) => Promise<boolean>;
  download: (request: DownloadRequest) => Promise<Result<string>>;
};
export type DownloadPersistence = {
  load: (assetId: DownloadAssetId) => Promise<AssetDownloadState | null>;
  save: (state: AssetDownloadState) => Promise<void>;
  clear: (assetId: DownloadAssetId) => Promise<void>;
};
export type ResumableDownloadDependencies = {
  checkStorage: (requiredBytes: number) => Promise<Result<void>>;
  validateChecksum: (assetId: DownloadAssetId, path: string) => Promise<Result<void>>;
  isOnline: () => boolean;
  isActive: () => boolean;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  persistence: DownloadPersistence;
  transport: DownloadTransport;
};

export type DownloadActivePhase = 'downloading' | 'verifying';
export type PauseReason = 'network' | 'background' | 'user' | 'interrupted';
export type DownloadState =
  | { status: 'idle' }
  | { status: 'checking-storage'; attempt: number }
  | { status: 'downloading'; progress: number; attempt: number }
  | { status: 'paused'; progress: number; attempt: number; phase: DownloadActivePhase; reason: PauseReason }
  | { status: 'verifying'; progress: number; attempt: number }
  | { status: 'complete' }
  | { status: 'failed'; error: string; errorCode?: AppErrorCode; progress: number; attempt: number }
  | { status: 'cancelled' };
export type DownloadEvent =
  | { type: 'START' }
  | { type: 'STORAGE_OK' }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'PAUSE'; reason: Exclude<PauseReason, 'interrupted'> }
  | { type: 'RESUME' }
  | { type: 'DOWNLOADED' }
  | { type: 'VERIFY_PROGRESS'; progress: number }
  | { type: 'VERIFIED' }
  | { type: 'RETRY' }
  | { type: 'FAIL'; error: string; errorCode?: AppErrorCode }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

export type ModelDownloadResult = { ready: true; paths: string[] };
export type AssetDownloader = (
  asset: DownloadAsset,
  onProgress?: (progress: number) => void,
) => Promise<Result<string>>;
export type DownloadProgressSnapshot = {
  machine: DownloadState;
  progress: number;
  phaseLabel: string;
  error: string | null;
};
export type ModelWarmup = (tier: LLMTier) => Promise<Result<void>>;
export type ModelDowngrade = () => Result<{ tier: LLMTier }>;
export type DownloadStore = {
  machine: DownloadState;
  progress: number;
  phaseLabel: string;
  error: string | null;
  hasHydrated: boolean;
  startDownload: (tier: LLMTier) => Promise<Result<void>>;
  retry: (tier: LLMTier) => Promise<Result<void>>;
  reset: () => void;
};
export type DownloadStoreDeps = {
  downloadAsset: AssetDownloader;
  warmup: ModelWarmup;
  downgradeAfterWarmupFailure: ModelDowngrade;
  stateStorage?: StateStorage;
};
export type ModelReadiness = {
  ready: boolean;
  missing: DownloadAssetId[];
  corrupt: DownloadAssetId[];
};
export type ModelManagerDependencies = {
  fileExists: (asset: DownloadAsset) => Promise<boolean>;
  validateChecksum: (asset: DownloadAsset) => Promise<Result<void>>;
};
