import * as DocumentPicker from 'expo-document-picker';

export const pickAudioFile = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['audio/*', 'audio/mpeg', 'video/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'],
            copyToCacheDirectory: true
        })
        if (result.canceled) {
            return null;
        }
        return result.assets?.[0];
    } catch {
        return null;
    }
}
