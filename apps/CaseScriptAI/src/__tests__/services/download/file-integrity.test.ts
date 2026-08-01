import { toHex, validateDownloadedAsset } from '@/services/download/file-integrity';
import { AppErrorCode } from '@/types/result';

jest.mock('@/services/download/checksum-validator', () => ({
  checksumValidator: {
    resolveRecord: jest.fn(async (assetId: string) => ({
      success: true,
      data: {
        sha256: 'a'.repeat(64),
        size: assetId.includes('tokenizer') ? 4 : 100,
        version: 'v0.8.0',
      },
    })),
    validateFile: jest.fn(async () => ({ success: true, data: undefined })),
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async (uri: string) => {
    if (uri.includes('missing')) {
      return { exists: false, isDirectory: false };
    }
    if (uri.includes('small')) {
      return { exists: true, isDirectory: false, size: 4 };
    }
    return { exists: true, isDirectory: false, size: 100 };
  }),
}));

describe('file-integrity', () => {
  it('toHex does not spread bytes into a giant array (stable for multi-MB buffers)', () => {
    const bytes = new Uint8Array([0, 15, 16, 255]);
    expect(toHex(bytes)).toBe('000f10ff');

    // Smoke: 256KB must stay linear — spreading this historically OOMed readiness polls.
    const large = new Uint8Array(256 * 1024);
    large[0] = 1;
    large[large.length - 1] = 2;
    const hex = toHex(large);
    expect(hex.startsWith('01')).toBe(true);
    expect(hex.endsWith('02')).toBe(true);
    expect(hex.length).toBe(large.length * 2);
  });

  it('size-only mode skips SHA work used during download readiness polling', async () => {
    const { checksumValidator } = jest.requireMock('@/services/download/checksum-validator') as {
      checksumValidator: { validateFile: jest.Mock };
    };
    checksumValidator.validateFile.mockClear();

    const result = await validateDownloadedAsset('whisper-tiny.model', '/tmp/model-ready', {
      hash: false,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(checksumValidator.validateFile).not.toHaveBeenCalled();
  });

  it('reports size mismatch without hashing', async () => {
    const { checksumValidator } = jest.requireMock('@/services/download/checksum-validator') as {
      checksumValidator: { validateFile: jest.Mock };
    };
    checksumValidator.validateFile.mockClear();

    // tokenizer expects size 4; default mock file size is 100
    const mismatch = await validateDownloadedAsset('whisper-tiny.tokenizer', '/tmp/model-path', {
      hash: false,
    });
    expect(mismatch).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    });
    expect(checksumValidator.validateFile).not.toHaveBeenCalled();
  });
});
