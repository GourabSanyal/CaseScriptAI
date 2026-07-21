import { checkStorageAvailable } from '@/services/download/storage-checker';
import { AppErrorCode } from '@/types/result';

describe('StorageChecker', () => {
  it('allows download when free disk covers asset size plus 20% buffer', () => {
    const requiredBytes = 1_000;
    const result = checkStorageAvailable(requiredBytes, () => 1_200);

    expect(result).toEqual({
      success: true,
      data: { requiredBytes, bufferedBytes: 1_200, availableBytes: 1_200 },
    });
  });

  it('fails with DOWNLOAD_STORAGE when free disk is below buffered requirement', () => {
    const result = checkStorageAvailable(1_000, () => 1_199);

    expect(result).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    });
  });

  it('rejects non-finite or negative required sizes and available disk', () => {
    expect(checkStorageAvailable(Number.NaN, () => 10_000).success).toBe(false);
    expect(checkStorageAvailable(-1, () => 10_000).success).toBe(false);
    expect(checkStorageAvailable(100, () => Number.NaN)).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    });
  });
});
