import { deleteModelGroup } from '@/services/download/delete-model-assets';
import { AppErrorCode } from '@/types/result';

import type { DownloadAssetId } from '@/types/download';

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
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(deletedUrls).toEqual([
      'https://example.com/whisper.pte',
      'https://example.com/whisper-tok.json',
    ]);
    expect(cleared).toEqual(['whisper-tiny.model', 'whisper-tiny.tokenizer']);
  });

  it('deletes current-tier LLM assets only', async () => {
    const deletedUrls: string[] = [];

    const result = await deleteModelGroup('llm', 'lite', {
      deleteCachedUrl: async (url) => {
        deletedUrls.push(url);
        return { success: true, data: undefined };
      },
      clearPersistence: () => undefined,
    });

    expect(result.success).toBe(true);
    expect(deletedUrls).toEqual([
      'https://example.com/lite.pte',
      'https://example.com/lite-tok.json',
      'https://example.com/lite-tok-config.json',
    ]);
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
