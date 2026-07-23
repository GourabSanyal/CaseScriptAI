import { llmDownloadAssets, whisperDownloadAssets } from '@/services/download/model-assets';

import type { AssetDownloader, DownloadAsset, ModelDownloadResult } from '@/types/download';
import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';

const downloadSequential = async (
  assets: DownloadAsset[],
  downloadAsset: AssetDownloader,
  onProgress?: (progress: number) => void,
): Promise<Result<ModelDownloadResult>> => {
  const paths: string[] = [];

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    const result = await downloadAsset(asset, (assetProgress) => {
      if (!onProgress) return;
      onProgress((index + assetProgress) / assets.length);
    });
    if (!result.success) return result;
    paths.push(result.data);
  }

  onProgress?.(1);
  return { success: true, data: { ready: true, paths } };
};

export const downloadSttAssets = (
  downloadAsset: AssetDownloader,
  onProgress?: (progress: number) => void,
): Promise<Result<ModelDownloadResult>> => {
  const assets = whisperDownloadAssets();
  if (!assets.success) return Promise.resolve(assets);
  return downloadSequential(assets.data, downloadAsset, onProgress);
};

export const downloadLlmAssets = (
  tier: LLMTier,
  downloadAsset: AssetDownloader,
  onProgress?: (progress: number) => void,
): Promise<Result<ModelDownloadResult>> => {
  const assets = llmDownloadAssets(tier);
  if (!assets.success) return Promise.resolve(assets);
  return downloadSequential(assets.data, downloadAsset, onProgress);
};
