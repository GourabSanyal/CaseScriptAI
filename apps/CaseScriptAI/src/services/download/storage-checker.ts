import { Paths } from 'expo-file-system';

import { AppErrorCode } from '@/types/result';

import type { AvailableDiskBytes, StorageCheck } from '@/types/download';
import type { Result } from '@/types/result';

export const STORAGE_BUFFER_RATIO = 1.2;

export const checkStorageAvailable = (
  requiredBytes: number,
  availableDiskBytes: AvailableDiskBytes = () => Paths.availableDiskSpace,
): Result<StorageCheck> => {
  if (!Number.isFinite(requiredBytes) || requiredBytes < 0) {
    return { success: false, error: 'Required download size is invalid' };
  }

  const availableBytes = availableDiskBytes();
  if (!Number.isFinite(availableBytes) || availableBytes < 0) {
    return {
      success: false,
      error: 'Available disk space could not be determined',
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    };
  }

  const bufferedBytes = Math.ceil(requiredBytes * STORAGE_BUFFER_RATIO);
  if (availableBytes < bufferedBytes) {
    return {
      success: false,
      error: `Need ${bufferedBytes} bytes free (asset + 20% buffer); only ${availableBytes} available`,
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    };
  }

  return { success: true, data: { requiredBytes, bufferedBytes, availableBytes } };
};
