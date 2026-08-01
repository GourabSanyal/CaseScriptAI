import { createModelManager } from '@/services/ai/model-manager';
import { executorchFileExists, localPathForUrl } from '@/services/download/executorch-resource';
import { validateDownloadedAsset } from '@/services/download/file-integrity';

export const modelManager = createModelManager({
  fileExists: async (asset) => executorchFileExists(asset.url),
  // Size-only during readiness polls — full SHA runs once after each asset download.
  validateChecksum: async (asset) =>
    validateDownloadedAsset(asset.id, localPathForUrl(asset.url), { hash: false }),
});
