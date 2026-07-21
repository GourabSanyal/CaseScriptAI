import {
  downloadLlmAssets,
  downloadSttAssets,
  type AssetDownloader,
} from '@/services/download/executorch-model-download';
import { AppErrorCode } from '@/types/result';

import type { DownloadAsset } from '@/types/download';

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

describe('ExecuTorch model downloads', () => {
  it('downloads Whisper assets sequentially with progress and readiness', async () => {
    const calls: DownloadAsset['id'][] = [];
    const downloadAsset: AssetDownloader = async (asset, onProgress) => {
      calls.push(asset.id);
      onProgress?.(0.5);
      onProgress?.(1);
      return { success: true, data: `/tmp/${asset.id}` };
    };

    const progress: number[] = [];
    const result = await downloadSttAssets(downloadAsset, (value) => progress.push(value));

    expect(result).toEqual({
      success: true,
      data: { ready: true, paths: ['/tmp/whisper-tiny.model', '/tmp/whisper-tiny.tokenizer'] },
    });
    expect(calls).toEqual(['whisper-tiny.model', 'whisper-tiny.tokenizer']);
    expect(progress.at(-1)).toBe(1);
  });

  it('downloads LLM tier assets with Range mode on the .pte file', async () => {
    const modes: DownloadAsset['resumeMode'][] = [];
    const downloadAsset: AssetDownloader = async (asset) => {
      modes.push(asset.resumeMode);
      return { success: true, data: `/tmp/${asset.id}` };
    };

    const result = await downloadLlmAssets('lite', downloadAsset);
    expect(result.success).toBe(true);
    expect(modes).toEqual(['range', 'restart', 'restart']);
  });

  it('stops on first asset failure and surfaces the error', async () => {
    const downloadAsset: AssetDownloader = async (asset) => {
      if (asset.id.endsWith('.tokenizer')) {
        return {
          success: false,
          error: 'network',
          errorCode: AppErrorCode.DOWNLOAD_NETWORK,
        };
      }
      return { success: true, data: `/tmp/${asset.id}` };
    };

    expect(await downloadSttAssets(downloadAsset)).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_NETWORK,
    });
  });
});
