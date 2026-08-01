import {
  deleteExecutorchCachedUrl,
  isExecutorchLlmCacheFilename,
  purgeExecutorchCacheByPredicate,
} from '@/services/download/executorch-resource';
import { llmDownloadAssets, whisperDownloadAssets } from '@/services/download/model-assets';
import { appStorage } from '@/services/storage/mmkv';

import type { DownloadAsset, DownloadAssetId } from '@/types/download';
import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';

export type ModelGroupId = 'whisper' | 'llm';

const ALL_LLM_TIERS: LLMTier[] = ['lite', 'standard', 'pro'];

const persistenceKey = (assetId: DownloadAssetId) => `download-asset:${assetId}`;
const checksumKey = (assetId: DownloadAssetId) => `checksum:${assetId}`;

export type DeleteModelAssetsDeps = {
  deleteCachedUrl?: (url: string) => Promise<Result<void>>;
  clearPersistence?: (assetId: DownloadAssetId) => void;
  /** Extra sweep for orphaned Standard/Pro (etc.) cache filenames. */
  purgeLlmCacheResidues?: () => Promise<Result<string[]>>;
};

const assetsForGroup = (group: ModelGroupId, _tier: LLMTier): Result<DownloadAsset[]> => {
  if (group === 'whisper') return whisperDownloadAssets();

  // Always include Lite + Standard + Pro so deleting LLM never leaves another tier behind.
  const merged: DownloadAsset[] = [];
  const seen = new Set<DownloadAssetId>();
  for (const llmTier of ALL_LLM_TIERS) {
    const result = llmDownloadAssets(llmTier);
    if (!result.success) continue;
    for (const asset of result.data) {
      if (seen.has(asset.id)) continue;
      seen.add(asset.id);
      merged.push(asset);
    }
  }
  if (merged.length === 0) {
    return { success: false, error: 'LLM model URLs are missing for all tiers' };
  }
  return { success: true, data: merged };
};

/** Deletes Whisper or all LLM tier files from disk and clears download resume/checksum keys. */
export const deleteModelGroup = async (
  group: ModelGroupId,
  tier: LLMTier,
  deps: DeleteModelAssetsDeps = {},
): Promise<Result<void>> => {
  const assetsResult = assetsForGroup(group, tier);
  if (!assetsResult.success) return assetsResult;

  const deleteCachedUrl = deps.deleteCachedUrl ?? deleteExecutorchCachedUrl;
  const clearPersistence =
    deps.clearPersistence ??
    ((assetId: DownloadAssetId) => {
      appStorage.delete(persistenceKey(assetId));
      appStorage.delete(checksumKey(assetId));
    });
  const purgeLlmCacheResidues =
    deps.purgeLlmCacheResidues ??
    (() => purgeExecutorchCacheByPredicate(isExecutorchLlmCacheFilename));

  for (const asset of assetsResult.data) {
    const deleted = await deleteCachedUrl(asset.url);
    if (!deleted.success) return deleted;
    clearPersistence(asset.id);
  }

  if (group === 'llm') {
    const purged = await purgeLlmCacheResidues();
    if (!purged.success) return purged;
  }

  return { success: true, data: undefined };
};
