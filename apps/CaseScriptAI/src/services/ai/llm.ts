import { Directory, File, Paths } from "expo-file-system";
import { checkModelExists, MODEL_PATHS } from "./model-utils";
import * as FileSystemLegacy from 'expo-file-system/legacy';

export type DownloadProgressCallback = (progress: number) => void;

export const downloadPhi = async (
  onProgress?: DownloadProgressCallback,
): Promise<{ success: boolean; data?: string; error?: string }> => {
  try {
    const url = process.env.EXPO_PUBLIC_LLM_DOWNLOAD_LINK;

    if (!url) {
      return { success: false, error: "Missing LLM download link" };
    }

    const modelsDir = new Directory(Paths.document, "models");
    if (!modelsDir.exists) {
      await modelsDir.create({ intermediates: true, idempotent: true });
    }

    const llmDir = new Directory(modelsDir, MODEL_PATHS.phi.dir);
    if (!llmDir.exists) {
      await llmDir.create({ intermediates: true, idempotent: true });
    }

    const destFile = new File(llmDir, MODEL_PATHS.phi.file);
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

    if (!destFile.exists) {
       throw new Error("File missing after download");
    }

    return { success: true, data: destFile.uri };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("[LLM Service] Download Error:", err);
    return { success: false, error: message };
  }
};

export const checkPhiExists = (): boolean => checkModelExists('phi');