import AesGcmCrypto from 'react-native-aes-gcm-crypto';

import type { Result } from '@/types/result';

export type EncryptionResult = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export type CryptoKeyProvider = () => Promise<Result<string>>;

let keyProvider: CryptoKeyProvider | null = null;

/** Wire once at app boot (Keychain-backed). Tests inject via setCryptoKeyProvider. */
export const setCryptoKeyProvider = (provider: CryptoKeyProvider | null): void => {
  keyProvider = provider;
};

const resolveKey = async (): Promise<Result<string>> => {
  if (!keyProvider) {
    return { success: false, error: 'Crypto key provider not configured' };
  }
  const key = await keyProvider();
  if (!key.success) return key;
  // Native force-unwraps Data(base64Encoded:) — reject bad keys before the bridge.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(key.data) || key.data.length % 4 !== 0) {
    return { success: false, error: 'AES key must be Base64' };
  }
  return key;
};

export const encryptText = async (plainText: string): Promise<Result<EncryptionResult>> => {
  const key = await resolveKey();
  if (!key.success) return key;
  try {
    const { iv, tag, content } = await AesGcmCrypto.encrypt(plainText, false, key.data);
    return { success: true, data: { ciphertext: content, iv, tag } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Encryption failed',
    };
  }
};

export const decryptText = async (
  ciphertext: string,
  iv: string,
  tag: string,
): Promise<Result<string>> => {
  const key = await resolveKey();
  if (!key.success) return key;
  try {
    const plain = await AesGcmCrypto.decrypt(ciphertext, key.data, iv, tag, false);
    return { success: true, data: plain };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Decryption failed',
    };
  }
};

export const encryptFile = async (
  inputPath: string,
  outputPath: string,
): Promise<Result<{ path: string; iv: string; tag: string }>> => {
  const key = await resolveKey();
  if (!key.success) return key;
  try {
    const { iv, tag } = await AesGcmCrypto.encryptFile(
      inputPath.replace('file://', ''),
      outputPath.replace('file://', ''),
      key.data,
    );
    return { success: true, data: { path: outputPath, iv, tag } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Encryption failed',
    };
  }
};

export const decryptFile = async (
  inputPath: string,
  outputPath: string,
  iv: string,
  tag: string,
): Promise<Result<string>> => {
  const key = await resolveKey();
  if (!key.success) return key;
  try {
    await AesGcmCrypto.decryptFile(
      inputPath.replace('file://', ''),
      outputPath.replace('file://', ''),
      key.data,
      iv,
      tag,
    );
    return { success: true, data: outputPath };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Decryption failed',
    };
  }
};
