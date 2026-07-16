import { AppErrorCode } from '@/types/result';

import type { Result } from '@/types/result';

describe('Result', () => {
  it('narrows success and failure values', () => {
    const read = (result: Result<number>): number | string =>
      result.success ? result.data : result.error;

    expect(read({ success: true, data: 7 })).toBe(7);
    expect(read({ success: false, error: 'failed' })).toBe('failed');
  });

  it('keeps error-code values stable for persistence', () => {
    expect(AppErrorCode).toEqual({
      MODEL_OOM: 'MODEL_OOM',
      MODEL_CORRUPT: 'MODEL_CORRUPT',
      MODEL_MISSING: 'MODEL_MISSING',
      DOWNLOAD_NETWORK: 'DOWNLOAD_NETWORK',
      DOWNLOAD_STORAGE: 'DOWNLOAD_STORAGE',
      DOWNLOAD_CHECKSUM: 'DOWNLOAD_CHECKSUM',
      AUDIO_PERMISSION: 'AUDIO_PERMISSION',
      AUDIO_BUFFER_OVERFLOW: 'AUDIO_BUFFER_OVERFLOW',
      LLM_GENERATION_FAILED: 'LLM_GENERATION_FAILED',
      SESSION_ORPHANED: 'SESSION_ORPHANED',
    });
  });

  it('supports void successes and optional typed failures', () => {
    const success: Result<void> = { success: true, data: undefined };
    const failure: Result<void> = {
      success: false,
      error: 'out of memory',
      errorCode: AppErrorCode.MODEL_OOM,
    };

    expect(success.success).toBe(true);
    expect(failure).toMatchObject({ errorCode: AppErrorCode.MODEL_OOM });
  });
});
