import * as FileSystem from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
import type { Result } from "@/types/result";

export const ensureCaseDirectory = async (caseId: string): Promise<void> => {
  const path = `${Paths.document.uri}cases/${caseId}`;

  const info = await FileSystem.getInfoAsync(path);
  
  if (!info.exists) {
    console.log(`[Storage] Creating directory via legacy API: ${path}`);
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  } else {
    console.log(`[Storage] Directory exists: ${path}`);
  }
};

export const copyAudioToCase = async (
  sourceUri: string,
  fileName: string,
  caseId: string,
): Promise<Result<string>> => {
  try {
    // For legacy API, use filesystem paths (no file:// scheme)
    const srcPath = sourceUri.replace("file://", "");
    const destPath = resolveAudioUri(fileName, caseId).replace("file://", "");


    await ensureCaseDirectory(caseId);
    
    console.log(`[Storage] Source exists check. Path: ${srcPath}`);
    const srcInfo = await FileSystem.getInfoAsync(srcPath);

    if (!srcInfo.exists) {
        return { success: false, error: `Source file does not exist (Legacy API check): ${sourceUri}` };
    }

    console.log(`[Storage] Destination state check. Path: ${destPath}`);
    const destInfo = await FileSystem.getInfoAsync(destPath);

    if (destInfo.exists) {
        console.log(`[Storage] Overwriting existing file at: ${destPath}`);
    }

    console.log(`[Storage] Copying (Legacy API): ${srcPath} -> ${destPath}`);
    await FileSystem.copyAsync({
        from: srcPath,
        to: destPath
    });
    
    // Final verification
    const verifyInfo = await FileSystem.getInfoAsync(destPath);

    if (verifyInfo.exists) {
        console.log(`[Storage] Copy verified. Size: ${verifyInfo.size} bytes`);
        return { success: true, data: fileName };
    } else {
        return { success: false, error: "Copy succeeded but file not found on verification" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Copy failed";

    console.error(`[Storage] Copy error (Legacy API): ${message}`);
    return { success: false, error: message };
  }
};

export const copyToDocuments = async (
  sourceUri: string,
  caseId?: string,
): Promise<Result<string>> => {
  try {
    const extension = sourceUri.split(".").pop() || "m4a";
    const fileName = `audio_${Date.now()}.${extension}`;
    return copyAudioToCase(sourceUri, fileName, caseId || "general");
  } catch (err) {
    const error = err instanceof Error ? err.message : "Copy failed";
    return { success: false, error };
  }
};

export const resolveAudioUri = (fileName: string, caseId?: string): string => {
  if (fileName.startsWith("file://")) return fileName;
  const base = Paths.document.uri.endsWith("/")
    ? Paths.document.uri.slice(0, -1)
    : Paths.document.uri;

  if (caseId) {
    return `${base}/cases/${caseId}/${fileName}`;
  }
  return `${base}/${fileName}`;
};

export const deleteAudioFile = async (uri: string): Promise<void> => {
  const file = new File(uri);
  if (file.exists) {
    await file.delete();
  }
};
