import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';

import { AppErrorCode } from '@/types/result';

import type { Result } from '@/types/result';

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
