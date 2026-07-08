import { Directory, File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { checkModelExists, MODEL_PATHS, WHISPER_MIN_BYTES } from "./model-utils";
import type { Result } from "@/types/result";

export type DownloadProgressCallback = (progress: number) => void;

/** POC default: ggml Whisper base from ggerganov/whisper.cpp. Prod should use owned CDN. */
export const DEFAULT_WHISPER_DOWNLOAD_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin";

const MAX_DOWNLOAD_RETRIES = 3;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getWhisperDestFile = (): File => {
  const modelsDir = new Directory(Paths.document, "models");
  const whisperDir = new Directory(modelsDir, MODEL_PATHS.whisper.dir);
  return new File(whisperDir, MODEL_PATHS.whisper.file);
};

const ensureWhisperDirs = async (): Promise<void> => {
  const modelsDir = new Directory(Paths.document, "models");
  if (!modelsDir.exists) {
    await modelsDir.create({ intermediates: true, idempotent: true });
  }

  const whisperDir = new Directory(modelsDir, MODEL_PATHS.whisper.dir);
  if (!whisperDir.exists) {
    await whisperDir.create({ intermediates: true, idempotent: true });
  }
};

const cleanupInvalidFile = async (): Promise<void> => {
  try {
    const destFile = getWhisperDestFile();
    if (destFile.exists) {
      await destFile.delete();
      console.log("[Whisper Download] Cleaned up invalid model file");
    }
  } catch (cleanupErr) {
    console.error("[Whisper Download] Failed to clean up invalid file:", cleanupErr);
  }
};

const downloadOnce = async (
  url: string,
  onProgress?: DownloadProgressCallback,
): Promise<Result<string>> => {
  await ensureWhisperDirs();
  const destFile = getWhisperDestFile();
  const destPath = destFile.uri;

  // Restart-from-zero for small assets (ARCHITECTURE.md); drop partials first.
  if (destFile.exists) {
    await destFile.delete();
  }

  const downloadResumable = FileSystemLegacy.createDownloadResumable(
    url,
    destPath,
    {},
    (downloadProgress) => {
      if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        onProgress(progress);
      }
    },
  );

  const result = await downloadResumable.downloadAsync();

  if (!result?.uri) {
    throw new Error("Download finished with no destination uri");
  }

  const fileSize = destFile.size ?? 0;
  console.log("[Whisper Download] Downloaded file size:", fileSize, "bytes");

  if (fileSize < WHISPER_MIN_BYTES) {
    throw new Error(
      `Downloaded file too small (${fileSize} bytes). Expected ~142MB for ggml-base.bin.`,
    );
  }

  if (!destFile.exists) {
    throw new Error("File missing after download");
  }

  return { success: true, data: destFile.uri };
};

export const downloadWhisper = async (
  onProgress?: DownloadProgressCallback,
): Promise<Result<string>> => {
  const url =
    process.env.EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK?.trim() ||
    DEFAULT_WHISPER_DOWNLOAD_URL;

  if (!url) {
    return {
      success: false,
      error:
        "Missing Whisper download link. Set EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK.",
    };
  }

  let lastError = "Download failed";

  for (let attempt = 0; attempt <= MAX_DOWNLOAD_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.warn(
          `[Whisper Download] Retry ${attempt}/${MAX_DOWNLOAD_RETRIES}...`,
        );
        await sleep(500 * attempt);
        onProgress?.(0);
      }

      return await downloadOnce(url, onProgress);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Download failed";
      console.error("[Whisper Download] Error:", lastError);
      await cleanupInvalidFile();
    }
  }

  return {
    success: false,
    error: `${lastError}. Keep the app open on Wi-Fi and tap Retry.`,
  };
};

export const checkWhisperExists = (): boolean => checkModelExists("whisper");
