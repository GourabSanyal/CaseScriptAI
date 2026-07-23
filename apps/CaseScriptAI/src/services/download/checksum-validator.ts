import { FALLBACK_CHECKSUMS } from '@/constants/fallback-checksums';
import { fetchHuggingFaceChecksumManifest } from '@/services/download/checksum-manifest';
import { appStorage } from '@/services/storage/mmkv';
import { AppErrorCode } from '@/types/result';

import type {
  CachedChecksum,
  ChecksumCacheStore,
  ChecksumManifest,
  ChecksumRecord,
  ChecksumValidatorDependencies,
  DownloadAssetId,
} from '@/types/download';
import type { Result } from '@/types/result';

export const CHECKSUM_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const cacheKey = (assetId: string) => `checksum:${assetId}`;

const isUsableRecord = (record: ChecksumRecord | undefined): record is ChecksumRecord =>
  Boolean(record && record.sha256.trim().length > 0 && Number.isFinite(record.size) && record.size >= 0);

const defaultCache: ChecksumCacheStore = {
  getString: (key) => appStorage.getString(key) ?? null,
  set: (key, value) => {
    appStorage.set(key, value);
  },
  delete: (key) => {
    appStorage.delete(key);
  },
};

const readCache = (
  cache: ChecksumCacheStore,
  assetId: DownloadAssetId,
  now: number,
): ChecksumRecord | null => {
  const raw = cache.getString(cacheKey(assetId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedChecksum;
    if (!isUsableRecord(parsed.record)) return null;
    if (now - parsed.cachedAt > CHECKSUM_CACHE_TTL_MS) {
      cache.delete(cacheKey(assetId));
      return null;
    }
    return parsed.record;
  } catch {
    cache.delete(cacheKey(assetId));
    return null;
  }
};

export const createChecksumValidator = (
  dependencies: ChecksumValidatorDependencies = {
    fetchManifest: fetchHuggingFaceChecksumManifest,
    cache: defaultCache,
    fallback: FALLBACK_CHECKSUMS,
    now: Date.now,
  },
) => {
  const resolveRecord = async (assetId: DownloadAssetId): Promise<Result<ChecksumRecord>> => {
    const worker = await dependencies.fetchManifest();
    if (worker.success) {
      const fromWorker = worker.data[assetId];
      if (isUsableRecord(fromWorker)) {
        dependencies.cache.set(
          cacheKey(assetId),
          JSON.stringify({ record: fromWorker, cachedAt: dependencies.now() }),
        );
        return { success: true, data: fromWorker };
      }
    }

    const cached = readCache(dependencies.cache, assetId, dependencies.now());
    if (cached) return { success: true, data: cached };

    const fallback = dependencies.fallback[assetId];
    if (isUsableRecord(fallback)) return { success: true, data: fallback };

    return {
      success: false,
      error: `Checksum unverifiable for ${assetId}`,
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    };
  };

  const validateFile = async (
    assetId: DownloadAssetId,
    sha256: string,
    size: number,
  ): Promise<Result<void>> => {
    const resolved = await resolveRecord(assetId);
    if (!resolved.success) return resolved;

    if (sha256.toLowerCase() !== resolved.data.sha256.toLowerCase()) {
      return {
        success: false,
        error: `Checksum mismatch for ${assetId}`,
        errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
      };
    }

    if (size !== resolved.data.size) {
      return {
        success: false,
        error: `Size mismatch for ${assetId}`,
        errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
      };
    }

    return { success: true, data: undefined };
  };

  return { resolveRecord, validateFile };
};

export const checksumValidator = createChecksumValidator();
