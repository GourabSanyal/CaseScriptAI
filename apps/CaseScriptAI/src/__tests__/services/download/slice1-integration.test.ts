import {
  DOWNLOAD_BACKOFF_MS,
  createResumableDownloadManager,
} from '@/services/download/resumable-download-manager';
import { checkStorageAvailable } from '@/services/download/storage-checker';
import { createChecksumValidator } from '@/services/download/checksum-validator';
import { createModelManager } from '@/services/ai/model-manager';
import { createDownloadStore } from '@/stores/download-store';
import { AppErrorCode } from '@/types/result';

import type { AssetDownloadState, DownloadAsset } from '@/types/download';
import type { StateStorage } from 'zustand/middleware';

jest.mock('@/constants/models', () => ({
  WHISPER_MODEL: {
    modelName: 'whisper-tiny',
    modelSource: 'https://example.com/whisper.pte',
    tokenizerSource: 'https://example.com/whisper-tok.json',
  },
  LLM_MODELS: {
    lite: {
      modelName: 'qwen3-0.6b-quantized',
      modelSource: 'https://example.com/lite.pte',
      tokenizerSource: 'https://example.com/lite-tok.json',
      tokenizerConfigSource: 'https://example.com/lite-tok-config.json',
    },
    standard: {
      modelName: 'qwen3-1.7b-quantized',
      modelSource: 'https://example.com/std.pte',
      tokenizerSource: 'https://example.com/std-tok.json',
      tokenizerConfigSource: 'https://example.com/std-tok-config.json',
    },
    pro: {
      modelName: 'qwen3-4b-quantized',
      modelSource: 'https://example.com/pro.pte',
      tokenizerSource: 'https://example.com/pro-tok.json',
      tokenizerConfigSource: 'https://example.com/pro-tok-config.json',
    },
  },
}));

const memoryStorage = (): StateStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
};

describe('Slice 1 integration', () => {
  it('blocks download when storage check fails before transport runs', async () => {
    const download = jest.fn();
    const manager = createResumableDownloadManager({
      checkStorage: async (required) => {
        const result = checkStorageAvailable(required, () => 0);
        return result.success
          ? { success: true, data: undefined }
          : { success: false, error: result.error, errorCode: result.errorCode };
      },
      validateChecksum: async () => ({ success: true, data: undefined }),
      isOnline: () => true,
      isActive: () => true,
      sleep: async () => undefined,
      now: () => 1,
      persistence: {
        load: async () => null,
        save: async () => undefined,
        clear: async () => undefined,
      },
      transport: { headAcceptsRanges: async () => true, download },
    });

    const asset: DownloadAsset = {
      id: 'whisper-tiny.model',
      url: 'https://example.com/w.pte',
      resumeMode: 'restart',
      expectedSizeBytes: 100,
    };

    expect(await manager.downloadAsset(asset)).toMatchObject({
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    });
    expect(download).not.toHaveBeenCalled();
  });

  it('Range-resumes, checksum-validates, and completes store + readiness gate', async () => {
    const persistence = new Map<string, AssetDownloadState>();
    const files = new Map<string, string>();
    const validator = createChecksumValidator({
      fetchManifest: async () => ({
        success: true,
        data: {
          'whisper-tiny.model': { sha256: 'w', size: 10, version: '1' },
          'whisper-tiny.tokenizer': { sha256: 'wt', size: 10, version: '1' },
          'qwen3-0.6b-quantized.model': { sha256: 'm', size: 10, version: '1' },
          'qwen3-0.6b-quantized.tokenizer': { sha256: 't', size: 10, version: '1' },
          'qwen3-0.6b-quantized.tokenizer-config': { sha256: 'c', size: 10, version: '1' },
        },
      }),
      cache: {
        getString: () => null,
        set: () => undefined,
        delete: () => undefined,
      },
      fallback: {},
      now: () => 1,
    });

    const hashes: Record<string, string> = {
      'whisper-tiny.model': 'w',
      'whisper-tiny.tokenizer': 'wt',
      'qwen3-0.6b-quantized.model': 'm',
      'qwen3-0.6b-quantized.tokenizer': 't',
      'qwen3-0.6b-quantized.tokenizer-config': 'c',
    };

    const manager = createResumableDownloadManager({
      checkStorage: async () => ({ success: true, data: undefined }),
      validateChecksum: async (assetId, path) => {
        files.set(assetId, path);
        return validator.validateFile(assetId, hashes[assetId], 10);
      },
      isOnline: () => true,
      isActive: () => true,
      sleep: async () => undefined,
      now: () => 1,
      persistence: {
        load: async (id) => persistence.get(id) ?? null,
        save: async (state) => {
          persistence.set(state.assetId, state);
        },
        clear: async (id) => {
          persistence.delete(id);
        },
      },
      transport: {
        headAcceptsRanges: async () => true,
        download: async ({ url, offset, onProgress }) => {
          onProgress?.(offset + 10);
          return { success: true, data: `/tmp/${url.split('/').pop()}` };
        },
      },
    });

    persistence.set('qwen3-0.6b-quantized.model', {
      assetId: 'qwen3-0.6b-quantized.model',
      bytesWritten: 4,
      attempt: 1,
      updatedAt: 1,
    });

    const store = createDownloadStore({
      downloadAsset: (asset, onProgress) => manager.downloadAsset(asset, onProgress),
      warmup: async () => ({ success: true, data: undefined }),
      downgradeAfterWarmupFailure: () => ({ success: false, error: 'n/a' }),
      stateStorage: memoryStorage(),
    });

    expect(await store.getState().startDownload('lite')).toEqual({
      success: true,
      data: undefined,
    });
    expect(store.getState().machine.status).toBe('complete');

    const modelManager = createModelManager({
      fileExists: async (asset) => files.has(asset.id),
      validateChecksum: async (assetId) => validator.validateFile(assetId, hashes[assetId], 10),
    });
    expect(await modelManager.checkAllModelsReady('lite')).toEqual({
      success: true,
      data: { ready: true, missing: [], corrupt: [] },
    });
  });

  it('uses download backoff constants for network recovery contract', () => {
    expect(DOWNLOAD_BACKOFF_MS).toEqual([2_000, 4_000, 8_000]);
  });
});
