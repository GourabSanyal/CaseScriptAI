import { deleteModelGroup } from '@/services/download/delete-model-assets';
import { AppErrorCode } from '@/types/result';

import type { DownloadAssetId } from '@/types/download';
import type { LLMTier } from '@/types/device';

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

const ALL_LLM_URLS = [
  'https://example.com/lite.pte',
  'https://example.com/lite-tok.json',
  'https://example.com/lite-tok-config.json',
  'https://example.com/std.pte',
  'https://example.com/std-tok.json',
  'https://example.com/std-tok-config.json',
  'https://example.com/pro.pte',
  'https://example.com/pro-tok.json',
  'https://example.com/pro-tok-config.json',
];

const ALL_LLM_IDS: DownloadAssetId[] = [
  'qwen3-0.6b-quantized.model',
  'qwen3-0.6b-quantized.tokenizer',
  'qwen3-0.6b-quantized.tokenizer-config',
  'qwen3-1.7b-quantized.model',
  'qwen3-1.7b-quantized.tokenizer',
  'qwen3-1.7b-quantized.tokenizer-config',
  'qwen3-4b-quantized.model',
  'qwen3-4b-quantized.tokenizer',
  'qwen3-4b-quantized.tokenizer-config',
];

describe('deleteModelGroup', () => {
  it('deletes Whisper cache URLs and clears persistence keys', async () => {
    const deletedUrls: string[] = [];
    const cleared: DownloadAssetId[] = [];

    const result = await deleteModelGroup('whisper', 'lite', {
      deleteCachedUrl: async (url) => {
        deletedUrls.push(url);
        return { success: true, data: undefined };
      },
      clearPersistence: (assetId) => {
        cleared.push(assetId);
      },
      purgeLlmCacheResidues: async () => ({ success: true, data: [] }),
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(deletedUrls).toEqual([
      'https://example.com/whisper.pte',
      'https://example.com/whisper-tok.json',
    ]);
    expect(cleared).toEqual(['whisper-tiny.model', 'whisper-tiny.tokenizer']);
  });

  it.each(['lite', 'standard', 'pro'] as const)(
    'when active tier is %s, deletes Lite+Standard+Pro URLs/keys and sweeps residues',
    async (activeTier: LLMTier) => {
      const deletedUrls: string[] = [];
      const cleared: DownloadAssetId[] = [];
      const purge = jest.fn(async () => ({
        success: true as const,
        data: [
          'huggingface_co_..._qwen3-1.7b-quantized.pte',
          'huggingface_co_..._qwen3-4b-quantized.pte.part',
        ],
      }));

      const result = await deleteModelGroup('llm', activeTier, {
        deleteCachedUrl: async (url) => {
          deletedUrls.push(url);
          return { success: true, data: undefined };
        },
        clearPersistence: (assetId) => {
          cleared.push(assetId);
        },
        purgeLlmCacheResidues: purge,
      });

      expect(result.success).toBe(true);
      expect(deletedUrls).toEqual(ALL_LLM_URLS);
      expect(cleared).toEqual(ALL_LLM_IDS);
      expect(purge).toHaveBeenCalledTimes(1);
    },
  );

  it('does not run LLM cache sweep when deleting Whisper only', async () => {
    const purge = jest.fn(async () => ({ success: true as const, data: [] }));
    await deleteModelGroup('whisper', 'standard', {
      deleteCachedUrl: async () => ({ success: true, data: undefined }),
      clearPersistence: () => undefined,
      purgeLlmCacheResidues: purge,
    });
    expect(purge).not.toHaveBeenCalled();
  });

  it('stops on first file delete failure', async () => {
    const result = await deleteModelGroup('whisper', 'lite', {
      deleteCachedUrl: async () => ({
        success: false,
        error: 'disk',
        errorCode: AppErrorCode.MODEL_MISSING,
      }),
      clearPersistence: () => undefined,
    });

    expect(result).toMatchObject({ success: false, error: 'disk' });
  });
});
