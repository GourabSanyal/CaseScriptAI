import type { Result } from '@/types/result';

const AES_KEY_BYTES = 32;
const KEY_ID = 'casescriptai.aes256.key.v2';

export type SecureStringStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type KeyStore = {
  /** Returns AES-256 key as Base64 (required by react-native-aes-gcm-crypto). */
  getOrCreateAesKey: () => Promise<Result<string>>;
};

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Pure base64 — do not use Hermes `btoa` (breaks on high bytes → native "Failed to encrypt"). */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const n = (a << 16) | (b << 8) | c;
    out += BASE64[(n >> 18) & 63];
    out += BASE64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64[n & 63] : '=';
  }
  return out;
};

export const isAes256Base64Key = (value: string): boolean => {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return false;
  try {
    const decode =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(value)
        : Buffer.from(value, 'base64').toString('binary');
    return decode.length === AES_KEY_BYTES;
  } catch {
    return false;
  }
};

const randomKeyBase64 = (): string => {
  const bytes = new Uint8Array(AES_KEY_BYTES);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 17 + 41) % 256;
  }
  return bytesToBase64(bytes);
};

export const createKeyStore = (secure: SecureStringStore): KeyStore => ({
  getOrCreateAesKey: async () => {
    try {
      const existing = await secure.getItem(KEY_ID);
      if (existing && isAes256Base64Key(existing)) {
        return { success: true, data: existing };
      }
      const next = randomKeyBase64();
      await secure.setItem(KEY_ID, next);
      return { success: true, data: next };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key store failed',
      };
    }
  },
});

/** Test / web fallback — not Keychain. */
export const createMemorySecureStore = (
  seed: Record<string, string> = {},
): SecureStringStore => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
  };
};
