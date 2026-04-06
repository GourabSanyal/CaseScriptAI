import { Directory, File, Paths } from "expo-file-system";
import { checkModelExists, MODEL_PATHS } from "./model-utils";
import * as FileSystemLegacy from 'expo-file-system/legacy';

export type DownloadProgressCallback = (progress: number) => void;

export const downloadWhisper = async (
  onProgress?: DownloadProgressCallback,
): Promise<{ success: boolean; data?: string; error?: string }> => {
  try {
    const url = process.env.EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK;

    if (!url) {
      return { success: false, error: "Missing Whisper download link" };
    }

    const modelsDir = new Directory(Paths.document, "models");
    if (!modelsDir.exists) {
      await modelsDir.create({ intermediates: true, idempotent: true });
    }

    const whisperDir = new Directory(modelsDir, MODEL_PATHS.whisper.dir);
    if (!whisperDir.exists) {
      await whisperDir.create({ intermediates: true, idempotent: true });
    }

    const destFile = new File(whisperDir, MODEL_PATHS.whisper.file);
    const destPath = destFile.uri;
    
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
      }
    );

    const result = await downloadResumable.downloadAsync();
    
    if (!result || !result.uri) {
      throw new Error("Download finished with no destination uri");
    }

    // Validate file size for Whisper
    const fileSize = destFile.size;
    console.log("[Whisper Download] Downloaded file size:", fileSize, "bytes");
    
    if (fileSize < 67108864) { // Less than 64MB = error response or incomplete
      throw new Error(`Downloaded file too small (${fileSize} bytes). Expected ~140MB. Check download URL or authentication.`);
    }

    // Verify it exists in the new API
    if (!destFile.exists) {
       throw new Error("File missing after download");
    }

    return { success: true, data: destFile.uri };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("[Whisper Download] Download Error:", err);
    
    // Clean up invalid file on error to prevent false "download successful" on next load
    try {
      const modelsDir = new Directory(Paths.document, "models");
      const whisperDir = new Directory(modelsDir, MODEL_PATHS.whisper.dir);
      const destFile = new File(whisperDir, MODEL_PATHS.whisper.file);
      if (destFile.exists) {
        await destFile.delete();
        console.log("[Whisper Download] Cleaned up invalid model file");
      }
    } catch (cleanupErr) {
      console.error("[Whisper Download] Failed to clean up invalid file:", cleanupErr);
    }
    
    return { success: false, error: message };
  }
};

export const checkWhisperExists = (): boolean => checkModelExists('whisper');