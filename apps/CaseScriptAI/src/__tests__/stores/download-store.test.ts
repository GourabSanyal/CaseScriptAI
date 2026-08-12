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

import { createDownloadStore } from '@/stores/download-store';
import { AppErrorCode } from '@/types/result';

import type { StateStorage } from 'zustand/middleware';

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

describe('download-store', () => {
  it('runs STT then LLM then warmup to complete', async () => {
    const store = createDownloadStore({
      downloadAsset: async () => ({ success: true, data: '/tmp/file' }),
      warmup: async () => ({ success: true, data: undefined }),
      downgradeAfterWarmupFailure: () => ({ success: false, error: 'no' }),
      stateStorage: memoryStorage(),
    });

    const result = await store.getState().startDownload('lite');
    expect(result.success).toBe(true);
    expect(store.getState()).toMatchObject({
      machine: { status: 'complete' },
      progress: 1,
      phaseLabel: 'Complete',
    });
  });

  it('auto-heals OOM by downgrading tier and re-downloading LLM', async () => {
    let warmupCalls = 0;
    const store = createDownloadStore({
      downloadAsset: async () => ({ success: true, data: '/tmp/file' }),
      warmup: async (tier) => {
        warmupCalls += 1;
        if (warmupCalls === 1) {
          return { success: false, error: 'oom', errorCode: AppErrorCode.MODEL_OOM };
        }
        expect(tier).toBe('lite');
        return { success: true, data: undefined };
      },
      downgradeAfterWarmupFailure: () => ({ success: true, data: { tier: 'lite' } }),
      stateStorage: memoryStorage(),
    });

    expect(await store.getState().startDownload('standard')).toEqual({
      success: true,
      data: undefined,
    });
    expect(warmupCalls).toBe(2);
  });

  it('records network failures on the download state machine', async () => {
    const store = createDownloadStore({
      downloadAsset: async () => ({
        success: false,
        error: 'offline',
        errorCode: AppErrorCode.DOWNLOAD_NETWORK,
      }),
      warmup: async () => ({ success: true, data: undefined }),
      downgradeAfterWarmupFailure: () => ({ success: false, error: 'no' }),
      stateStorage: memoryStorage(),
    });

    const result = await store.getState().startDownload('lite');
    expect(result).toMatchObject({ errorCode: AppErrorCode.DOWNLOAD_NETWORK });
    expect(store.getState().machine.status).toBe('failed');
  });

  it('does not mark complete when disk verifyReady fails', async () => {
    const store = createDownloadStore({
      downloadAsset: async () => ({ success: true, data: '/tmp/file' }),
      warmup: async () => ({ success: true, data: undefined }),
      downgradeAfterWarmupFailure: () => ({ success: false, error: 'no' }),
      verifyReady: async () => ({
        success: false,
        error: 'Missing models',
        errorCode: AppErrorCode.MODEL_MISSING,
      }),
      stateStorage: memoryStorage(),
    });

    const result = await store.getState().startDownload('lite');
    expect(result).toMatchObject({ errorCode: AppErrorCode.MODEL_MISSING });
    expect(store.getState().machine.status).toBe('failed');
  });

  it('markComplete syncs a stale idle machine when files are already on disk', () => {
    const store = createDownloadStore({
      downloadAsset: async () => ({ success: true, data: '/tmp/file' }),
      warmup: async () => ({ success: true, data: undefined }),
      downgradeAfterWarmupFailure: () => ({ success: false, error: 'no' }),
      stateStorage: memoryStorage(),
    });
    store.getState().markComplete();
    expect(store.getState()).toMatchObject({
      machine: { status: 'complete' },
      progress: 1,
      error: null,
    });
  });
});
