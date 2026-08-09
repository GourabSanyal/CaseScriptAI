import { createKeyStore, createMemorySecureStore } from '@/services/storage/key-store';

describe('key-store', () => {
  it('creates a stable AES key and reuses it', async () => {
    const secure = createMemorySecureStore();
    const store = createKeyStore(secure);
    const first = await store.getOrCreateAesKey();
    const second = await store.getOrCreateAesKey();
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.data.length).toBeGreaterThan(40);
      expect(second.data).toBe(first.data);
      // AES-256 key must be Base64 (react-native-aes-gcm-crypto contract).
      expect(Buffer.from(first.data, 'base64')).toHaveLength(32);
    }
  });
});
