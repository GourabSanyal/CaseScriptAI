import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Clerk TokenCache backed by SecureStore (iOS Keychain / Android Keystore).
 * Web uses in-memory only — web is not a production auth target.
 */
const memory = new Map<string, string>();

export const clerkTokenCache = {
  getToken: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return memory.get(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  saveToken: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      memory.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};
