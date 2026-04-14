export type DownloadProgressCallback = (progress: number) => void;

// Qwen 2.5 1.5B is built-in to react-native-executorch, no download needed
export const downloadPhi = async (
  onProgress?: DownloadProgressCallback,
): Promise<{ success: boolean; data?: string; error?: string }> => {
  console.log("[LLM] Qwen model is built-in to react-native-executorch, no download required");
  if (onProgress) onProgress(1); // Signal 100% complete immediately
  return { success: true, data: "built-in" };
};

// Qwen model is built-in to react-native-executorch, no file check needed
export const checkPhiExists = (): boolean => true;