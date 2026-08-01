import {
  createStreamingDownloadTransport,
  STREAM_APPEND_CHUNK_BYTES,
  type StreamingDownloadFs,
} from '@/services/download/streaming-download-transport';
import { localPathForUrl } from '@/services/download/executorch-resource';
import { AppErrorCode } from '@/types/result';

describe('streaming download transport', () => {
  const url = 'https://huggingface.co/example/qwen3-0.6b-quantized.pte';
  const destPath = localPathForUrl(url);
  const destUri = destPath.startsWith('file://') ? destPath : `file://${destPath}`;
  const partUri = `${destUri}.part`;

  const createFs = (overrides: Partial<StreamingDownloadFs> = {}) => {
    const sizes = new Map<string, number>();
    const streams: Array<{ fileUri: string; headers?: Record<string, string> }> = [];
    const appends: Array<{ dest: string; source: string }> = [];

    const fs: StreamingDownloadFs = {
      ensureDir: async () => undefined,
      fileSize: async (fileUri) => sizes.get(fileUri) ?? 0,
      deleteIfExists: async (fileUri) => {
        sizes.delete(fileUri);
      },
      streamToFile: async ({ fileUri, headers, onBytesWritten }) => {
        streams.push({ fileUri, headers });
        const bytes = headers?.Range ? 200 : 500;
        sizes.set(fileUri, (sizes.get(fileUri) ?? 0) + bytes);
        onBytesWritten(bytes);
        return { success: true, data: undefined };
      },
      appendFileChunked: async (dest, source, chunk) => {
        expect(chunk).toBe(STREAM_APPEND_CHUNK_BYTES);
        appends.push({ dest, source });
        sizes.set(dest, (sizes.get(dest) ?? 0) + (sizes.get(source) ?? 0));
        return { success: true, data: undefined };
      },
      ...overrides,
    };

    return { fs, sizes, streams, appends };
  };

  it('streams a fresh download to the ExecuTorch cache path', async () => {
    const { fs, streams } = createFs();
    const transport = createStreamingDownloadTransport(fs);
    const result = await transport.download({
      url,
      offset: 0,
      resumeMode: 'restart',
    });

    expect(result).toEqual({ success: true, data: destPath.replace(/^file:\/\//, '') });
    expect(streams[0]).toEqual({ fileUri: destUri, headers: undefined });
  });

  it('Range-resumes via .part then disk append', async () => {
    const { fs, sizes, streams, appends } = createFs();
    sizes.set(destUri, 300);

    const transport = createStreamingDownloadTransport(fs);
    const result = await transport.download({
      url,
      offset: 300,
      resumeMode: 'range',
    });

    expect(result.success).toBe(true);
    expect(streams[0]).toMatchObject({
      fileUri: partUri,
      headers: { Range: 'bytes=300-' },
    });
    expect(appends).toEqual([{ dest: destUri, source: partUri }]);
  });

  it('surfaces stream failures', async () => {
    const { fs } = createFs({
      streamToFile: async () => ({
        success: false,
        error: 'network down',
        errorCode: AppErrorCode.DOWNLOAD_NETWORK,
      }),
    });
    const transport = createStreamingDownloadTransport(fs);
    await expect(
      transport.download({ url, offset: 0, resumeMode: 'restart' }),
    ).resolves.toMatchObject({ success: false, error: 'network down' });
  });
});
