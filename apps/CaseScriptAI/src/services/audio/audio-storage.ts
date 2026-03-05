import { File, Paths } from "expo-file-system";
import type { Result } from "@/types/result";

export const copyToDocuments = async (
  sourceUri: string,
): Promise<Result<string>> => {
  try {
    const extension = sourceUri.split(".").pop() || "m4a";
    const fileName = `audio_${Date.now()}.${extension}`;
    const src = new File(sourceUri);
    const dest = new File(Paths.document, fileName);
    await src.copy(dest);
    // returns filename only to avoid absolute path issues on iOS
    return { success: true, data: fileName };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Copy failed";
    return { success: false, error };
  }
};

export const resolveAudioUri = (fileName: string): string => {
  if (fileName.startsWith("file://")) return fileName;
  const base = Paths.document.uri.endsWith("/")
    ? Paths.document.uri.slice(0, -1)
    : Paths.document.uri;
  return `${base}/${fileName}`;
};

export const deleteAudioFile = async (uri: string): Promise<void> => {
  const file = new File(uri);
  if (file.exists) file.delete();
};
