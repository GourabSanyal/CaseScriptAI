import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { createResumableDownloadManager } from '@/services/download/resumable-download-manager';
import { fetchExecutorchResource } from '@/services/download/executorch-resource';
import { validateDownloadedAsset } from '@/services/download/file-integrity';
import { checkStorageAvailable } from '@/services/download/storage-checker';
import { appStorage } from '@/services/storage/mmkv';
import { createDownloadStore } from '@/stores/download-store';
import { useDeviceStore } from '@/stores/device-store';

import type { AssetDownloadState, DownloadAssetId } from '@/types/download';
import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';

const persistenceKey = (assetId: DownloadAssetId) => `download-asset:${assetId}`;

let online = true;
NetInfo.fetch().then((state) => {
  online = Boolean(state.isConnected && state.isInternetReachable !== false);
});
NetInfo.addEventListener((state) => {
  online = Boolean(state.isConnected && state.isInternetReachable !== false);
});

const downloadManager = createResumableDownloadManager({
  checkStorage: async (requiredBytes) => {
    const result = checkStorageAvailable(requiredBytes);
    return result.success
      ? { success: true, data: undefined }
      : { success: false, error: result.error, errorCode: result.errorCode };
  },
  validateChecksum: (assetId, path) => validateDownloadedAsset(assetId, path),
  isOnline: () => online,
  isActive: () => AppState.currentState === 'active',
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: Date.now,
  persistence: {
    load: async (assetId) => {
      const raw = appStorage.getString(persistenceKey(assetId));
      if (!raw) return null;
      try {
        return JSON.parse(raw) as AssetDownloadState;
      } catch {
        return null;
      }
    },
    save: async (state) => {
      appStorage.set(persistenceKey(state.assetId), JSON.stringify(state));
    },
    clear: async (assetId) => {
      appStorage.delete(persistenceKey(assetId));
    },
  },
  transport: {
    headAcceptsRanges: async (url) => {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        const value = response.headers.get('accept-ranges');
        return Boolean(value && value.toLowerCase().includes('bytes'));
      } catch {
        return false;
      }
    },
    download: async ({ url, expectedSizeBytes = 0, onProgress }) =>
      fetchExecutorchResource(url, expectedSizeBytes, onProgress),
  },
});

// ponytail: no-op warmup until LLMService (Slice 3).
const warmupLlmTier = async (_tier: LLMTier): Promise<Result<void>> => ({
  success: true,
  data: undefined,
});

export const useDownloadStore = createDownloadStore({
  downloadAsset: (asset, onProgress) => downloadManager.downloadAsset(asset, onProgress),
  warmup: warmupLlmTier,
  downgradeAfterWarmupFailure: () => useDeviceStore.getState().downgradeAfterWarmupFailure(),
});
