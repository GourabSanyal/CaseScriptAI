import { localPathForUrl } from '@/services/download/executorch-resource';
import { AppErrorCode } from '@/types/result';

import type { DownloadRequest, DownloadTransport } from '@/types/download';
import type { Result } from '@/types/result';

/** Bounded disk→disk append so Range resume never loads the remainder into JS. */
export const STREAM_APPEND_CHUNK_BYTES = 1024 * 1024;

export type StreamingDownloadFs = {
  ensureDir: (dirUri: string) => Promise<void>;
  fileSize: (fileUri: string) => Promise<number>;
  deleteIfExists: (fileUri: string) => Promise<void>;
  /** Native stream to disk (createDownloadResumable) — must not buffer the body in JS. */
  streamToFile: (args: {
    url: string;
    fileUri: string;
    headers?: Record<string, string>;
    onBytesWritten: (bytesWritten: number) => void;
  }) => Promise<Result<void>>;
  appendFileChunked: (
    destUri: string,
    sourceUri: string,
    chunkBytes: number,
  ) => Promise<Result<void>>;
};

const asFileUri = (path: string): string =>
  path.startsWith('file://') ? path : `file://${path}`;

const stripFileUri = (uri: string): string =>
  uri.startsWith('file://') ? uri.slice('file://'.length) : uri;

const parentDir = (fileUri: string): string => {
  const normalized = asFileUri(fileUri);
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(0, idx + 1) : normalized;
};

/** Native disk stream into ExecuTorch cache path (no JS Range body buffers). */
export const createStreamingDownloadTransport = (
  fs: StreamingDownloadFs,
): Pick<DownloadTransport, 'download'> => ({
  download: async (request: DownloadRequest): Promise<Result<string>> => {
    const destPath = localPathForUrl(request.url);
    const destUri = asFileUri(destPath);
    const partUri = `${destUri}.part`;

    try {
      await fs.ensureDir(parentDir(destUri));
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create model cache directory',
        errorCode: AppErrorCode.DOWNLOAD_STORAGE,
      };
    }

    const useRange = request.resumeMode === 'range' && request.offset > 0;

    if (!useRange) {
      await fs.deleteIfExists(destUri);
      await fs.deleteIfExists(partUri);
      const streamed = await fs.streamToFile({
        url: request.url,
        fileUri: destUri,
        onBytesWritten: (n) => request.onProgress?.(n),
      });
      if (!streamed.success) return streamed;
      return { success: true, data: stripFileUri(destUri) };
    }

    const existingSize = await fs.fileSize(destUri);
    if (existingSize !== request.offset) {
      await fs.deleteIfExists(destUri);
      await fs.deleteIfExists(partUri);
      const restarted = await fs.streamToFile({
        url: request.url,
        fileUri: destUri,
        onBytesWritten: (n) => request.onProgress?.(n),
      });
      if (!restarted.success) return restarted;
      return { success: true, data: stripFileUri(destUri) };
    }

    await fs.deleteIfExists(partUri);
    const ranged = await fs.streamToFile({
      url: request.url,
      fileUri: partUri,
      headers: { Range: `bytes=${request.offset}-` },
      onBytesWritten: (n) => request.onProgress?.(request.offset + n),
    });
    if (!ranged.success) {
      await fs.deleteIfExists(partUri);
      return ranged;
    }

    const appended = await fs.appendFileChunked(destUri, partUri, STREAM_APPEND_CHUNK_BYTES);
    await fs.deleteIfExists(partUri);
    if (!appended.success) return appended;

    request.onProgress?.(await fs.fileSize(destUri));
    return { success: true, data: stripFileUri(destUri) };
  },
});
