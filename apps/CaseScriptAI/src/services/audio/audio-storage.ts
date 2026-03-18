import { Directory, File, Paths } from "expo-file-system";
import type { Result } from "@/types/result";

export const ensureCaseDirectory = async (caseId: string): Promise<void> => {
  const casesUri = new Directory(Paths.document, "cases").uri;
  const casesInfo = Paths.info(casesUri);
  if (casesInfo.exists && casesInfo.isDirectory === false) {
    new File(casesUri).delete();
  }

  const casesDir = new Directory(Paths.document, "cases");
  if (!casesDir.exists) {
    casesDir.create({ intermediates: true, idempotent: true });
  }

  const caseUri = new Directory(casesDir, caseId).uri;
  const caseInfo = Paths.info(caseUri);
  if (caseInfo.exists && caseInfo.isDirectory === false) {
    new File(caseUri).delete();
  }

  const caseDir = new Directory(casesDir, caseId);
  if (!caseDir.exists) {
    caseDir.create({ intermediates: true, idempotent: true });
  }
};

export const copyToDocuments = async (
  sourceUri: string,
  caseId?: string,
): Promise<Result<string>> => {
  try {
    const extension = sourceUri.split(".").pop() || "m4a";
    const fileName = `audio_${Date.now()}.${extension}`;

    let destPath: string;
    if (caseId) {
      await ensureCaseDirectory(caseId);
      destPath = `${Paths.document.uri}cases/${caseId}/${fileName}`;
    } else {
      destPath = `${Paths.document.uri}${fileName}`;
    }

    const src = new File(sourceUri);
    const dest = new File(destPath);
    await src.copy(dest);

    return { success: true, data: fileName };
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
