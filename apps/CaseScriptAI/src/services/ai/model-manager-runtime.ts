import { createChecksumValidator } from '@/services/download/checksum-validator';
import { createModelManager } from '@/services/ai/model-manager';
import { llmDownloadAssets, whisperDownloadAssets } from '@/services/download/model-assets';

import type { DownloadAsset } from '@/types/download';
import type { LLMTier } from '@/types/device';

const checksum = createChecksumValidator();

/**
 * Default ModelManager wiring. Local ExecuTorch cache existence is refined when
 * ResourceFetcher path helpers are composed on native builds.
 */
export const modelManager = createModelManager({
  fileExists: async (_asset: DownloadAsset) => false,
  validateChecksum: async (assetId) => {
    const resolved = await checksum.resolveRecord(assetId);
    return resolved.success ? { success: true, data: undefined } : resolved;
  },
});

export const requiredDownloadAssets = (tier: LLMTier): DownloadAsset[] => {
  const whisper = whisperDownloadAssets();
  const llm = llmDownloadAssets(tier);
  return [...(whisper.success ? whisper.data : []), ...(llm.success ? llm.data : [])];
};
