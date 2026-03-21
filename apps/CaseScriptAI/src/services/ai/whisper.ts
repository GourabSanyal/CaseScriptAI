import { Directory, File, Paths } from "expo-file-system";
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

    const whisperDir = new Directory(modelsDir, "whisper");
    if (!whisperDir.exists) {
      await whisperDir.create({ intermediates: true, idempotent: true });
    }

    const destFile = new File(whisperDir, "ggml-tiny.bin");
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

    // Verify it exists in the new API
    if (!destFile.exists) {
       throw new Error("File missing after download");
    }

    return { success: true, data: destFile.uri };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("[Whisper Service] Download Error:", err);
    return { success: false, error: message };
  }
};