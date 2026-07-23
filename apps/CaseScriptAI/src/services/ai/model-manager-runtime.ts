import { createModelManager } from '@/services/ai/model-manager';
import { executorchFileExists, localPathForUrl } from '@/services/download/executorch-resource';
import { validateDownloadedAsset } from '@/services/download/file-integrity';

export const modelManager = createModelManager({
  fileExists: async (asset) => executorchFileExists(asset.url),
  validateChecksum: async (asset) =>
    validateDownloadedAsset(asset.id, localPathForUrl(asset.url)),
});
