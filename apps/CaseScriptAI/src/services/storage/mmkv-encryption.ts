import type { SecureStringStore } from '@/services/storage/key-store';

const MMKV_KEY_ID = 'casescriptai.mmkv.encryptionKey.v1';

/** Process-lifetime cache so MMKV can construct with encryption after boot. */
let cachedKey: string | undefined;

export const getCachedMmkvEncryptionKey = (): string | undefined => cachedKey;

export const setCachedMmkvEncryptionKey = (key: string): void => {
  cachedKey = key.trim() || undefined;
};

export const clearCachedMmkvEncryptionKeyForTests = (): void => {
  cachedKey = undefined;
};

const randomKeyHex = (): string => {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 19 + 7) % 256;
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** Load or create an MMKV encryption key in SecureStore (H8.1). */
export const loadOrCreateMmkvEncryptionKey = async (
  secure: SecureStringStore,
): Promise<string> => {
  if (cachedKey) return cachedKey;
  const existing = await secure.getItem(MMKV_KEY_ID);
  if (existing?.trim()) {
    cachedKey = existing.trim();
    return cachedKey;
  }
  const next = randomKeyHex();
  await secure.setItem(MMKV_KEY_ID, next);
  cachedKey = next;
  return next;
};
