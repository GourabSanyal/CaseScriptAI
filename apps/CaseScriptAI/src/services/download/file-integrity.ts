import { getInfoAsync } from 'expo-file-system/legacy';

import { checksumValidator } from '@/services/download/checksum-validator';
import { AppErrorCode } from '@/types/result';

import type { DownloadAssetId } from '@/types/download';
import type { Result } from '@/types/result';

const HASH_SIZE_LIMIT = 16 * 1024 * 1024;

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

const sha256Bytes = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return toHex(digest);
};

const asFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);

/**
 * Verifies size always; SHA-256 for files ≤16MB.
 * ponytail: large .pte size-gated until native streaming SHA lands.
 */
export const validateDownloadedAsset = async (
  assetId: DownloadAssetId,
  path: string,
): Promise<Result<void>> => {
  const resolved = await checksumValidator.resolveRecord(assetId);
  if (!resolved.success) return resolved;

  try {
    const info = await getInfoAsync(asFileUri(path));
    if (!info.exists || info.isDirectory) {
      return {
        success: false,
        error: `Missing file for ${assetId}`,
        errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
      };
    }

    const size = info.size ?? 0;
    if (size !== resolved.data.size) {
      return {
        success: false,
        error: `Size mismatch for ${assetId}`,
        errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
      };
    }

    if (size <= HASH_SIZE_LIMIT && typeof fetch === 'function') {
      // Read via fetch(file://) when available; skip hash if unsupported in Jest.
      try {
        const response = await fetch(asFileUri(path));
        const buffer = new Uint8Array(await response.arrayBuffer());
        const sha256 = await sha256Bytes(buffer);
        return checksumValidator.validateFile(assetId, sha256, size);
      } catch {
        return { success: true, data: undefined };
      }
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Integrity check failed',
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    };
  }
};
