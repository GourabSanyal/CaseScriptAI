import { FALLBACK_CHECKSUMS } from '@/constants/fallback-checksums';
import { LLM_MODELS, WHISPER_MODEL } from '@/constants/models';

import type { DownloadAsset, DownloadAssetId } from '@/types/download';
import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';

const asUrl = (source: unknown): string | null =>
  typeof source === 'string' && source.trim().length > 0 ? source : null;

const withSize = (id: DownloadAssetId, url: string, resumeMode: DownloadAsset['resumeMode']): DownloadAsset => ({
  id,
  url,
  resumeMode,
  expectedSizeBytes: FALLBACK_CHECKSUMS[id]?.size,
});

export const whisperDownloadAssets = (): Result<DownloadAsset[]> => {
  const modelUrl = asUrl(WHISPER_MODEL.modelSource);
  const tokenizerUrl = asUrl(WHISPER_MODEL.tokenizerSource);
  if (!modelUrl || !tokenizerUrl) {
    return { success: false, error: 'Whisper model URLs are missing' };
  }

  return {
    success: true,
    data: [
      withSize('whisper-tiny.model', modelUrl, 'restart'),
      withSize('whisper-tiny.tokenizer', tokenizerUrl, 'restart'),
    ],
  };
};

export const llmDownloadAssets = (tier: LLMTier): Result<DownloadAsset[]> => {
  const model = LLM_MODELS[tier];
  const modelUrl = asUrl(model.modelSource);
  const tokenizerUrl = asUrl(model.tokenizerSource);
  const tokenizerConfigUrl = asUrl(model.tokenizerConfigSource);
  if (!modelUrl || !tokenizerUrl || !tokenizerConfigUrl) {
    return { success: false, error: `LLM URLs missing for tier ${tier}` };
  }

  const prefix = model.modelName as
    | 'qwen3-0.6b-quantized'
    | 'qwen3-1.7b-quantized'
    | 'qwen3-4b-quantized';

  return {
    success: true,
    data: [
      withSize(`${prefix}.model` as DownloadAssetId, modelUrl, 'range'),
      withSize(`${prefix}.tokenizer` as DownloadAssetId, tokenizerUrl, 'restart'),
      withSize(`${prefix}.tokenizer-config` as DownloadAssetId, tokenizerConfigUrl, 'restart'),
    ],
  };
};
