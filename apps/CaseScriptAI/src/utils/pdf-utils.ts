import * as Sharing from 'expo-sharing';

export const savePDF = async (pdfPath: string) => {
  await Sharing.shareAsync(pdfPath, {
    mimeType: 'application/pdf',
    dialogTitle: 'Save SOAP Note'
  });
};
