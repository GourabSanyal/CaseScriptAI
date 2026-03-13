import AesGcmCrypto from "react-native-aes-gcm-crypto";
import type { Result } from "@/types/result";

// placeholder key - will be moved to Keychain in future
const KEY = "01234567890123456789012345678901"; // 32 bytes for AES-256

export type EncryptionResult = {
  path: string;
  iv: string;
  tag: string;
};

export const encryptFile = async (
  inputPath: string,
  outputPath: string,
): Promise<Result<EncryptionResult>> => {
  try {
    const formattedInput = inputPath.replace("file://", "");
    const formattedOutput = outputPath.replace("file://", "");
    console.log(`[Crypto] Formatted Input Path: ${formattedInput}`);
    console.log(`[Crypto] Formatted Output Path: ${formattedOutput}`);

    // Signature: encryptFile(inputFilePath, outputFilePath, key)
    const { iv, tag } = await AesGcmCrypto.encryptFile(
      formattedInput,
      formattedOutput,
      KEY,
    );
    console.log(`[Crypto] Encrypted. IV: ${iv}, Tag: ${tag}`);
    return { success: true, data: { path: outputPath, iv, tag } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Encryption failed";
    console.error(`[Crypto] Encryption error: ${message}`);
    return { success: false, error: message };
  }
};

export const decryptFile = async (
  inputPath: string,
  outputPath: string,
  iv: string,
  tag: string,
): Promise<Result<string>> => {
  try {
    const formattedInput = inputPath.replace("file://", "");
    const formattedOutput = outputPath.replace("file://", "");
    console.log(`[Crypto] Formatted Input Path: ${formattedInput}`);
    console.log(`[Crypto] Formatted Output Path: ${formattedOutput}`);

    // Signature: decryptFile(inputFilePath, outputFilePath, key, iv, tag)
    await AesGcmCrypto.decryptFile(
      formattedInput,
      formattedOutput,
      KEY,
      iv,
      tag,
    );
    console.log(`[Crypto] Decrypted to: ${outputPath}`);
    return { success: true, data: outputPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decryption failed";
    console.error(`[Crypto] Decryption error: ${message}`);
    return { success: false, error: message };
  }
};
