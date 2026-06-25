import { Alert, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Directory, File, Paths } from "expo-file-system";

export const showPdf = async (pdfUri: string): Promise<void> => {
  const uri = pdfUri.startsWith("file://") ? pdfUri : `file://${pdfUri}`;
  await Print.printAsync({ uri });
};

export const savePdfToLocal = async (sourceUri: string): Promise<string> => {
  const reportsDir = new Directory(Paths.document, "cases", "poc", "reports");
  if (!reportsDir.exists) {
    reportsDir.create({ intermediates: true, idempotent: true });
  }

  const fileName = `soap-note-${Date.now()}.pdf`;
  const destPath = `${reportsDir.uri}/${fileName}`;
  const sourceFile = new File(sourceUri);

  if (!sourceFile.exists) {
    throw new Error("PDF file not found");
  }

  await sourceFile.copy(new File(destPath));

  if (Platform.OS === "android") {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destPath, {
        mimeType: "application/pdf",
        dialogTitle: "Save PDF to device",
        UTI: "com.adobe.pdf",
      });
    }
  }

  Alert.alert("PDF saved", `Saved to app storage:\n${destPath}`);
  return destPath;
};
