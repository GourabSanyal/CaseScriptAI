import {
  CHECKSUM_CACHE_TTL_MS,
  createChecksumValidator,
  type ChecksumCacheStore,
  type ChecksumValidatorDependencies,
} from '@/services/download/checksum-validator';
import { AppErrorCode } from '@/types/result';

import type { ChecksumManifest, ChecksumRecord } from '@/types/download';

const record = (overrides: Partial<ChecksumRecord> = {}): ChecksumRecord => ({
  sha256: 'abc123',
  size: 100,
  version: '1',
  ...overrides,
});

const memoryCache = (): ChecksumCacheStore & { entries: Map<string, string> } => {
  const entries = new Map<string, string>();
  return {
    entries,
    getString: (key) => entries.get(key) ?? null,
    set: (key, value) => {
      entries.set(key, value);
    },
    delete: (key) => {
      entries.delete(key);
    },
  };
};

const deps = (
  overrides: Partial<ChecksumValidatorDependencies> = {},
): ChecksumValidatorDependencies => ({
  fetchManifest: async () => ({ success: false, error: 'worker down' }),
  cache: memoryCache(),
  fallback: {},
  now: () => 1_000_000,
  ...overrides,
});

describe('ChecksumValidator', () => {
  it('prefers Worker manifest, then caches it in MMKV', async () => {
    const cache = memoryCache();
    const manifest: ChecksumManifest = { 'whisper-tiny.model': record() };
    const validator = createChecksumValidator(
      deps({
        fetchManifest: async () => ({ success: true, data: manifest }),
        cache,
      }),
    );

    const resolved = await validator.resolveRecord('whisper-tiny.model');
    expect(resolved).toEqual({ success: true, data: record() });
    expect(cache.entries.size).toBeGreaterThan(0);
  });

  it('uses MMKV cache within 30 days when Worker is unavailable', async () => {
    const cache = memoryCache();
    cache.set('checksum:whisper-tiny.model', JSON.stringify({
      record: record({ sha256: 'cached' }),
      cachedAt: 1_000_000 - CHECKSUM_CACHE_TTL_MS + 1,
    }));

    const validator = createChecksumValidator(
      deps({
        cache,
        now: () => 1_000_000,
      }),
    );

    expect(await validator.resolveRecord('whisper-tiny.model')).toEqual({
      success: true,
      data: record({ sha256: 'cached' }),
    });
  });

  it('falls back to hardcoded checksums when Worker and cache miss', async () => {
    const validator = createChecksumValidator(
      deps({
        fallback: { 'whisper-tiny.model': record({ sha256: 'fallback' }) },
      }),
    );

    expect(await validator.resolveRecord('whisper-tiny.model')).toEqual({
      success: true,
      data: record({ sha256: 'fallback' }),
    });
  });

  it('blocks when checksum is unverifiable', async () => {
    const validator = createChecksumValidator(deps({ fallback: {} }));
    const result = await validator.resolveRecord('whisper-tiny.model');

    expect(result).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    });
  });

  it('blocks empty fallback sha256 as unverifiable', async () => {
    const validator = createChecksumValidator(
      deps({
        fallback: { 'whisper-tiny.model': record({ sha256: '' }) },
      }),
    );

    expect(await validator.resolveRecord('whisper-tiny.model')).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    });
  });

  it('validates file hash and size against the resolved record', async () => {
    const validator = createChecksumValidator(
      deps({
        fallback: { 'whisper-tiny.model': record() },
      }),
    );

    expect(await validator.validateFile('whisper-tiny.model', 'abc123', 100)).toEqual({
      success: true,
      data: undefined,
    });
    expect(await validator.validateFile('whisper-tiny.model', 'wrong', 100)).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    });
    expect(await validator.validateFile('whisper-tiny.model', 'abc123', 99)).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_CHECKSUM,
    });
  });
});
