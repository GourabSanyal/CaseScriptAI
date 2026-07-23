import { llmDownloadAssets, whisperDownloadAssets } from '@/services/download/model-assets';

import type {
  DownloadAsset,
  DownloadAssetId,
  ModelManagerDependencies,
  ModelReadiness,
} from '@/types/download';
import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';
import { AppErrorCode } from '@/types/result';

export const createModelManager = (deps: ModelManagerDependencies) => {
  const requiredAssets = (tier: LLMTier): DownloadAsset[] => {
    const whisper = whisperDownloadAssets();
    const llm = llmDownloadAssets(tier);
    return [...(whisper.success ? whisper.data : []), ...(llm.success ? llm.data : [])];
  };

  const checkAllModelsReady = async (tier: LLMTier): Promise<Result<ModelReadiness>> => {
    const missing: DownloadAssetId[] = [];
    const corrupt: DownloadAssetId[] = [];

    for (const asset of requiredAssets(tier)) {
      const exists = await deps.fileExists(asset);
      if (!exists) {
        missing.push(asset.id);
        continue;
      }

      const checksum = await deps.validateChecksum(asset);
      if (!checksum.success) {
        corrupt.push(asset.id);
      }
    }

    return {
      success: true,
      data: {
        ready: missing.length === 0 && corrupt.length === 0,
        missing,
        corrupt,
      },
    };
  };

  const integrityWatcher = (
    tier: LLMTier,
    onChange: (readiness: ModelReadiness) => void,
  ): (() => void) => {
    let cancelled = false;
    const tick = async () => {
      const result = await checkAllModelsReady(tier);
      if (!cancelled && result.success) onChange(result.data);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  };

  return { checkAllModelsReady, integrityWatcher, requiredAssets };
};

export const missingOrCorruptToError = (readiness: ModelReadiness): Result<void> => {
  if (readiness.ready) return { success: true, data: undefined };
  if (readiness.missing.length > 0) {
    return {
      success: false,
      error: `Missing models: ${readiness.missing.join(', ')}`,
      errorCode: AppErrorCode.MODEL_MISSING,
    };
  }
  return {
    success: false,
    error: `Corrupt models: ${readiness.corrupt.join(', ')}`,
    errorCode: AppErrorCode.MODEL_CORRUPT,
  };
};
