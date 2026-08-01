import {
  createDownloadResumable,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { File } from 'expo-file-system';

import {
  createStreamingDownloadTransport,
  type StreamingDownloadFs,
} from '@/services/download/streaming-download-transport';
import { AppErrorCode } from '@/types/result';

const asFileUri = (path: string): string =>
  path.startsWith('file://') ? path : `file://${path}`;

export const createExpoStreamingDownloadFs = (): StreamingDownloadFs => ({
  ensureDir: async (dirUri) => {
    await makeDirectoryAsync(dirUri, { intermediates: true });
  },
  fileSize: async (fileUri) => {
    try {
      const info = await getInfoAsync(asFileUri(fileUri));
      if (!info.exists || info.isDirectory) return 0;
      return info.size ?? 0;
    } catch {
      return 0;
    }
  },
  deleteIfExists: async (fileUri) => {
    await deleteAsync(asFileUri(fileUri), { idempotent: true });
  },
  // ponytail: native URLSession→disk; JS Range fetch was jetsamming / flaky
  streamToFile: async ({ url, fileUri, headers, onBytesWritten }) => {
    try {
      const downloadResumable = createDownloadResumable(
        url,
        asFileUri(fileUri),
        headers ? { headers } : {},
        (progress) => {
          onBytesWritten(progress.totalBytesWritten);
        },
      );
      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) {
        return {
          success: false,
          error: 'Download interrupted',
          errorCode: AppErrorCode.DOWNLOAD_NETWORK,
        };
      }
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Streaming download failed',
        errorCode: AppErrorCode.DOWNLOAD_NETWORK,
      };
    }
  },
  appendFileChunked: async (destUri, sourceUri, chunkBytes) => {
    try {
      const dest = new File(asFileUri(destUri));
      const source = new File(asFileUri(sourceUri));
      if (!dest.exists || !source.exists) {
        return {
          success: false,
          error: 'Cannot assemble model file — missing part',
          errorCode: AppErrorCode.DOWNLOAD_NETWORK,
        };
      }

      const destHandle = dest.open();
      const sourceHandle = source.open();
      try {
        destHandle.offset = destHandle.size ?? 0;
        sourceHandle.offset = 0;
        for (;;) {
          const chunk = sourceHandle.readBytes(chunkBytes);
          if (chunk.byteLength === 0) break;
          destHandle.writeBytes(chunk);
        }
      } finally {
        destHandle.close();
        sourceHandle.close();
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assemble model file',
        errorCode: AppErrorCode.DOWNLOAD_STORAGE,
      };
    }
  },
});

export const createExpoStreamingDownloadTransport = () =>
  createStreamingDownloadTransport(createExpoStreamingDownloadFs());
