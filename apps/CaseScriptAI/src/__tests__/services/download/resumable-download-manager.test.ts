import {
  DOWNLOAD_BACKOFF_MS,
  createResumableDownloadManager,
  type ResumableDownloadDependencies,
} from '@/services/download/resumable-download-manager';
import { AppErrorCode } from '@/types/result';

import type { AssetDownloadState, DownloadAsset } from '@/types/download';

const asset: DownloadAsset = {
  id: 'qwen3-0.6b-quantized.model',
  url: 'https://example.com/model.pte',
  resumeMode: 'range',
  expectedSizeBytes: 100,
};

const memoryPersistence = () => {
  const map = new Map<string, AssetDownloadState>();
  return {
    map,
    load: async (id: string) => map.get(id) ?? null,
    save: async (state: AssetDownloadState) => {
      map.set(state.assetId, state);
    },
    clear: async (id: string) => {
      map.delete(id);
    },
  };
};

const deps = (
  overrides: Partial<ResumableDownloadDependencies> = {},
): ResumableDownloadDependencies => {
  const persistence = memoryPersistence();
  return {
    checkStorage: async () => ({ success: true, data: undefined }),
    validateChecksum: async () => ({ success: true, data: undefined }),
    isOnline: () => true,
    isActive: () => true,
    sleep: async () => undefined,
    now: () => 1,
    persistence,
    transport: {
      headAcceptsRanges: async () => true,
      download: async () => ({ success: true, data: '/tmp/model.pte' }),
    },
    ...overrides,
  };
};

describe('ResumableDownloadManager', () => {
  it('checks storage, downloads, verifies checksum, and clears progress', async () => {
    const persistence = memoryPersistence();
    const download = jest.fn(async () => ({
      success: true as const,
      data: '/tmp/model.pte',
    }));
    const manager = createResumableDownloadManager(
      deps({
        persistence,
        transport: { headAcceptsRanges: async () => true, download },
      }),
    );

    const result = await manager.downloadAsset(asset);
    expect(result).toEqual({ success: true, data: '/tmp/model.pte' });
    expect(download).toHaveBeenCalledWith(
      expect.objectContaining({ url: asset.url, offset: 0, resumeMode: 'range' }),
    );
    expect(persistence.map.size).toBe(0);
  });

  it('Range-resumes LLM assets from persisted offset when Accept-Ranges is supported', async () => {
    const persistence = memoryPersistence();
    await persistence.save({
      assetId: asset.id,
      bytesWritten: 40,
      attempt: 1,
      updatedAt: 1,
    });
    const download = jest.fn(async () => ({
      success: true as const,
      data: '/tmp/model.pte',
    }));
    const manager = createResumableDownloadManager(
      deps({
        persistence,
        transport: { headAcceptsRanges: async () => true, download },
      }),
    );

    await manager.downloadAsset(asset);
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ offset: 40 }));
  });

  it('restarts small assets from zero even when progress exists', async () => {
    const small: DownloadAsset = { ...asset, id: 'whisper-tiny.tokenizer', resumeMode: 'restart' };
    const persistence = memoryPersistence();
    await persistence.save({
      assetId: small.id,
      bytesWritten: 40,
      attempt: 1,
      updatedAt: 1,
    });
    const download = jest.fn(async () => ({
      success: true as const,
      data: '/tmp/tok.json',
    }));
    const manager = createResumableDownloadManager(
      deps({
        persistence,
        transport: { headAcceptsRanges: async () => true, download },
      }),
    );

    await manager.downloadAsset(small);
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  it('restarts Range assets when server rejects Accept-Ranges', async () => {
    const persistence = memoryPersistence();
    await persistence.save({
      assetId: asset.id,
      bytesWritten: 40,
      attempt: 1,
      updatedAt: 1,
    });
    const download = jest.fn(async () => ({
      success: true as const,
      data: '/tmp/model.pte',
    }));
    const manager = createResumableDownloadManager(
      deps({
        persistence,
        transport: { headAcceptsRanges: async () => false, download },
      }),
    );

    await manager.downloadAsset(asset);
    expect(download).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  it('retries with exponential backoff then fails with DOWNLOAD_NETWORK', async () => {
    const sleeps: number[] = [];
    const manager = createResumableDownloadManager(
      deps({
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        transport: {
          headAcceptsRanges: async () => true,
          download: async () => ({
            success: false,
            error: 'offline',
            errorCode: AppErrorCode.DOWNLOAD_NETWORK,
          }),
        },
      }),
    );

    const result = await manager.downloadAsset(asset);
    expect(result).toMatchObject({ success: false, errorCode: AppErrorCode.DOWNLOAD_NETWORK });
    expect(sleeps).toEqual([...DOWNLOAD_BACKOFF_MS]);
  });

  it('pauses when offline or backgrounded and resumes when conditions clear', async () => {
    let online = false;
    let active = false;
    let polls = 0;
    const manager = createResumableDownloadManager(
      deps({
        isOnline: () => online,
        isActive: () => active,
        sleep: async () => {
          polls += 1;
          if (polls === 2) {
            online = true;
            active = true;
          }
        },
      }),
    );

    const result = await manager.downloadAsset(asset);
    expect(result.success).toBe(true);
    expect(polls).toBeGreaterThanOrEqual(2);
  });

  it('surfaces storage and checksum failures without retrying network backoff', async () => {
    const storageFail = createResumableDownloadManager(
      deps({
        checkStorage: async () => ({
          success: false,
          error: 'disk full',
          errorCode: AppErrorCode.DOWNLOAD_STORAGE,
        }),
      }),
    );
    const checksumFail = createResumableDownloadManager(
      deps({
        validateChecksum: async () => ({
          success: false,
          error: 'bad hash',
          errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
        }),
      }),
    );

    expect(await storageFail.downloadAsset(asset)).toMatchObject({
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    });
    expect(await checksumFail.downloadAsset(asset)).toMatchObject({
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    });
  });
});
