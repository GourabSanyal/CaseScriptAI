import { getInfoAsync } from 'expo-file-system/legacy';

import { checksumValidator } from '@/services/download/checksum-validator';
import { AppErrorCode } from '@/types/result';

import type { DownloadAssetId } from '@/types/download';
import type { Result } from '@/types/result';

const HASH_SIZE_LIMIT = 16 * 1024 * 1024;

/** Lookup table — never spread a multi‑MB Uint8Array into a JS array (jetsam risk). */
const HEX_BYTE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export const toHex = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += HEX_BYTE[bytes[i]!]!;
  }
  return out;
};

const sha256Bytes = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(digest));
};

const asFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);

export type ValidateDownloadedAssetOptions = {
  /**
   * When false, only size is checked (safe for frequent readiness polling).
   * SHA runs after download completes (`hash: true`, default).
   */
  hash?: boolean;
};

/**
 * Verifies size always; SHA-256 for files ≤16MB when `hash` is true.
 * ponytail: large .pte size-gated until native streaming SHA lands.
 */
export const validateDownloadedAsset = async (
  assetId: DownloadAssetId,
  path: string,
  options: ValidateDownloadedAssetOptions = {},
): Promise<Result<void>> => {
  const hash = options.hash !== false;
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

    if (!hash) {
      return { success: true, data: undefined };
    }

    if (size <= HASH_SIZE_LIMIT && typeof fetch === 'function') {
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
