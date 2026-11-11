import {
  clearCachedMmkvEncryptionKeyForTests,
  getCachedMmkvEncryptionKey,
  loadOrCreateMmkvEncryptionKey,
} from '@/services/storage/mmkv-encryption';
import { createMemorySecureStore } from '@/services/storage/key-store';

describe('mmkv encryption key', () => {
  beforeEach(() => {
    clearCachedMmkvEncryptionKeyForTests();
  });

  it('creates once and reuses the SecureStore value', async () => {
    const secure = createMemorySecureStore();
    const first = await loadOrCreateMmkvEncryptionKey(secure);
    expect(first.length).toBeGreaterThan(8);
    expect(getCachedMmkvEncryptionKey()).toBe(first);

    clearCachedMmkvEncryptionKeyForTests();
    const second = await loadOrCreateMmkvEncryptionKey(secure);
    expect(second).toBe(first);
  });
});
