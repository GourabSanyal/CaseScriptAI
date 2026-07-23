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

import { createModelManager } from '@/services/ai/model-manager';
import { AppErrorCode } from '@/types/result';

describe('ModelManager', () => {
  it('reports ready when every required asset exists and checksums', async () => {
    const manager = createModelManager({
      fileExists: async () => true,
      validateChecksum: async () => ({ success: true, data: undefined }),
    });

    expect(await manager.checkAllModelsReady('lite')).toEqual({
      success: true,
      data: { ready: true, missing: [], corrupt: [] },
    });
  });

  it('lists missing and corrupt assets separately', async () => {
    const manager = createModelManager({
      fileExists: async (asset) => !asset.id.includes('tokenizer-config'),
      validateChecksum: async (asset) =>
        asset.id.endsWith('.model')
          ? {
              success: false,
              error: 'bad',
              errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
            }
          : { success: true, data: undefined },
    });

    const result = await manager.checkAllModelsReady('lite');
    expect(result.success && result.data).toEqual({
      ready: false,
      missing: ['qwen3-0.6b-quantized.tokenizer-config'],
      corrupt: ['whisper-tiny.model', 'qwen3-0.6b-quantized.model'],
    });
  });

  it('integrity watcher emits readiness and can be cancelled', async () => {
    const manager = createModelManager({
      fileExists: async () => true,
      validateChecksum: async () => ({ success: true, data: undefined }),
    });

    const seen: boolean[] = [];
    await new Promise<void>((resolve) => {
      const stop = manager.integrityWatcher('lite', (readiness) => {
        seen.push(readiness.ready);
        stop();
        resolve();
      });
    });
    expect(seen).toEqual([true]);
  });
});
