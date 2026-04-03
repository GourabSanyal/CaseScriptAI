import { Share, Platform, Linking } from 'react-native';

export const savePDF = async (pdfPath: string) => {
  if (Platform.OS === 'ios') {
    const fileUrl = `file://${pdfPath}`;
    await Share.share({
      url: fileUrl,
      title: 'Save SOAP Note'
    });
  } else {
    await Linking.openURL(`file://${pdfPath}`);
  }
};
