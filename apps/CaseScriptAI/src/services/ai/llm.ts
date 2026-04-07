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
      console.error("[Phi Download] Missing LLM download link");
      return { success: false, error: "Missing LLM download link" };
    }

    console.log("[Phi Download] Starting download from:", url);

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
    
    console.log("[Phi Download] Destination path:", destPath);
    console.log("[Phi Download] File exists before download:", destFile.exists);
    
    const downloadResumable = FileSystemLegacy.createDownloadResumable(
      url,
      destPath,
      {},
      (downloadProgress) => {
        console.log("[Phi Download] Progress:", {
          written: downloadProgress.totalBytesWritten,
          expected: downloadProgress.totalBytesExpectedToWrite,
        });
        if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
          const progress = 
            downloadProgress.totalBytesWritten / 
            downloadProgress.totalBytesExpectedToWrite;
          onProgress(progress);
        }
      }
    );

    console.log("[Phi Download] Starting download...");
    const result = await downloadResumable.downloadAsync();
    
    console.log("[Phi Download] Result:", result);
    
    // Check for authentication errors (401, 403) or small files that indicate error responses
    if (result.status === 401 || result.status === 403) {
      throw new Error(`Authentication required: ${result.status}. Check HuggingFace model URL and access permissions.`);
    }
    
    if (!result || !result.uri) {
      throw new Error("Download finished with no destination uri");
    }

    console.log("[Phi Download] File exists after download:", destFile.exists);
    
    // Validate file size - a real model should be much larger than a few KB
    // Phi-4-mini should be ~250MB, so if it's less than 1MB, it's likely an error response
    const fileInfo = destFile.size;
    console.log("[Phi Download] Downloaded file size:", fileInfo, "bytes");
    
    if (fileInfo < 1048576) { // Less than 1MB = error response or incomplete
      throw new Error(`Downloaded file too small (${fileInfo} bytes). Expected ~250MB. Check download URL or authentication.`);
    }

    if (!destFile.exists) {
       throw new Error("File missing after download");
    }

    console.log("[Phi Download] Download successful!");
    return { success: true, data: destFile.uri };

  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    console.error("[Phi Download] Download Error:", err);
    
    // Clean up invalid file on error to prevent false "download successful" on next load
    try {
      const modelsDir = new Directory(Paths.document, "models");
      const llmDir = new Directory(modelsDir, MODEL_PATHS.phi.dir);
      const destFile = new File(llmDir, MODEL_PATHS.phi.file);
      if (destFile.exists) {
        await destFile.delete();
        console.log("[Phi Download] Cleaned up invalid model file");
      }
    } catch (cleanupErr) {
      console.error("[Phi Download] Failed to clean up invalid file:", cleanupErr);
    }
    
    return { success: false, error: message };
  }
};

export const checkPhiExists = (): boolean => checkModelExists('phi');