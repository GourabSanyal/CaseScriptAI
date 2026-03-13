import * as FileSystem from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
import type { Result } from "@/types/result";

export const ensureCaseDirectory = async (caseId: string): Promise<void> => {
  const path = `${Paths.document.uri}cases/${caseId}`;
  // #region agent log
  globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'B',location:'audio-storage.ts:7',message:'ensureCaseDirectory path',data:{caseId,path,docUri:Paths.document.uri,hasFetch:typeof globalThis.fetch === 'function'},timestamp:Date.now()})})?.catch(()=>{});
  // #endregion agent log
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

    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'A',location:'audio-storage.ts:26',message:'copyAudioToCase entry',data:{sourceUri,fileName,caseId,docUri:Paths.document.uri,cacheUri:Paths.cache.uri,srcPath,destPath,hasFetch:typeof globalThis.fetch === 'function'},timestamp:Date.now()})})?.catch(()=>{});
    // #endregion agent log
    await ensureCaseDirectory(caseId);
    
    console.log(`[Storage] Source exists check. Path: ${srcPath}`);
    const srcInfo = await FileSystem.getInfoAsync(srcPath);
    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'A',location:'audio-storage.ts:35',message:'srcInfo',data:{sourceUri,exists:srcInfo.exists,isDirectory:srcInfo.isDirectory,md5:srcInfo.md5 ?? null,size:srcInfo.size ?? null,modificationTime:srcInfo.modificationTime ?? null,uri:srcInfo.uri ?? null},timestamp:Date.now()})})?.catch(()=>{});
    // #endregion agent log
    if (!srcInfo.exists) {
        return { success: false, error: `Source file does not exist (Legacy API check): ${sourceUri}` };
    }

    console.log(`[Storage] Destination state check. Path: ${destPath}`);
    const destInfo = await FileSystem.getInfoAsync(destPath);
    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'C',location:'audio-storage.ts:43',message:'destInfo before copy',data:{destPath,exists:destInfo.exists,isDirectory:destInfo.isDirectory,md5:destInfo.md5 ?? null,size:destInfo.size ?? null,modificationTime:destInfo.modificationTime ?? null,uri:destInfo.uri ?? null},timestamp:Date.now()})})?.catch(()=>{});
    // #endregion agent log
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
    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'D',location:'audio-storage.ts:60',message:'verifyInfo after copy',data:{destPath,exists:verifyInfo.exists,isDirectory:verifyInfo.isDirectory,size:verifyInfo.size ?? null,uri:verifyInfo.uri ?? null},timestamp:Date.now()})})?.catch(()=>{});
    // #endregion agent log
    if (verifyInfo.exists) {
        console.log(`[Storage] Copy verified. Size: ${verifyInfo.size} bytes`);
        return { success: true, data: fileName };
    } else {
        return { success: false, error: "Copy succeeded but file not found on verification" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Copy failed";
    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'E',location:'audio-storage.ts:70',message:'copyAudioToCase error',data:{message,name:(err instanceof Error ? err.name : null),hasFetch:typeof globalThis.fetch === 'function'},timestamp:Date.now()})})?.catch(()=>{});
    // #endregion agent log
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
