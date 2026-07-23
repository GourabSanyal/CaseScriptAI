import { AppErrorCode } from '@/types/result';

import type { DownloadAsset, ResumableDownloadDependencies } from '@/types/download';
import type { Result } from '@/types/result';

export const DOWNLOAD_BACKOFF_MS = [2_000, 4_000, 8_000] as const;
export const DOWNLOAD_MAX_ATTEMPTS = DOWNLOAD_BACKOFF_MS.length + 1;

const waitUntilRunnable = async (deps: ResumableDownloadDependencies): Promise<void> => {
  while (!deps.isOnline() || !deps.isActive()) {
    await deps.sleep(100);
  }
};

export const createResumableDownloadManager = (deps: ResumableDownloadDependencies) => {
  const downloadAsset = async (
    asset: DownloadAsset,
    onProgress?: (progress: number) => void,
  ): Promise<Result<string>> => {
    const required = asset.expectedSizeBytes ?? 0;
    const storage = await deps.checkStorage(required);
    if (!storage.success) return storage;

    let lastError: Result<string> = {
      success: false,
      error: 'Download failed',
      errorCode: AppErrorCode.DOWNLOAD_NETWORK,
    };

    for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt += 1) {
      await waitUntilRunnable(deps);

      const prior = await deps.persistence.load(asset.id);
      let offset = 0;
      if (asset.resumeMode === 'range') {
        const acceptsRanges = await deps.transport.headAcceptsRanges(asset.url);
        offset = acceptsRanges ? (prior?.bytesWritten ?? 0) : 0;
      }

      const downloaded = await deps.transport.download({
        url: asset.url,
        offset,
        resumeMode: asset.resumeMode,
        expectedSizeBytes: asset.expectedSizeBytes,
        onProgress: (bytesWritten) => {
          void deps.persistence.save({
            assetId: asset.id,
            bytesWritten,
            attempt,
            updatedAt: deps.now(),
          });
          if (onProgress && asset.expectedSizeBytes && asset.expectedSizeBytes > 0) {
            onProgress(Math.min(1, bytesWritten / asset.expectedSizeBytes));
          }
        },
      });

      if (!downloaded.success) {
        lastError = downloaded;
        if (attempt < DOWNLOAD_MAX_ATTEMPTS) {
          await deps.sleep(DOWNLOAD_BACKOFF_MS[attempt - 1]);
        }
        continue;
      }

      const path = downloaded.data;
      const checksum = await deps.validateChecksum(asset.id, path);
      if (!checksum.success) {
        await deps.persistence.clear(asset.id);
        return checksum;
      }

      await deps.persistence.clear(asset.id);
      return { success: true, data: path };
    }

    return lastError;
  };

  return { downloadAsset };
};
