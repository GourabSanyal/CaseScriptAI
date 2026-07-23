import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';

import { AppErrorCode } from '@/types/result';

import type { Result } from '@/types/result';

const RNE_DIR = `${documentDirectory ?? ''}react-native-executorch/`;

export const filenameFromUrl = (url: string): string => {
  const clean = url.replace(/^https?:\/\//, '').split('#')[0] ?? url;
  return clean.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const localPathForUrl = (url: string): string => `${RNE_DIR}${filenameFromUrl(url)}`;

export const executorchFileExists = async (url: string): Promise<boolean> => {
  try {
    const info = await getInfoAsync(localPathForUrl(url));
    return Boolean(info.exists && !info.isDirectory && (info.size ?? 0) > 0);
  } catch {
    return false;
  }
};

/** Downloads via Expo ResourceFetcher (ExecuTorch cache). Reports bytes via expectedSize. */
export const fetchExecutorchResource = async (
  url: string,
  expectedSizeBytes: number,
  onBytes?: (bytesWritten: number) => void,
): Promise<Result<string>> => {
  try {
    const paths = await ExpoResourceFetcher.fetch((progress) => {
      if (!onBytes) return;
      const size = expectedSizeBytes > 0 ? expectedSizeBytes : 1;
      onBytes(Math.round(Math.min(1, progress) * size));
    }, url);

    if (!paths || paths.length === 0) {
      return {
        success: false,
        error: 'Download interrupted',
        errorCode: AppErrorCode.DOWNLOAD_NETWORK,
      };
    }

    return { success: true, data: paths[0] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ExecuTorch fetch failed',
      errorCode: AppErrorCode.DOWNLOAD_NETWORK,
    };
  }
};
