import { MMKV } from 'react-native-mmkv';

import { getCachedMmkvEncryptionKey } from '@/services/storage/mmkv-encryption';

import type { StateStorage } from 'zustand/middleware';

export const storage = new MMKV({ id: 'poc-storage' });

let appStorageInstance: MMKV | null = null;

/**
 * Encrypted when `loadOrCreateMmkvEncryptionKey` has run (boot).
 * Call `resetAppStorageForTests` in Jest between suites if needed.
 */
export const getAppStorage = (): MMKV => {
  if (!appStorageInstance) {
    const encryptionKey = getCachedMmkvEncryptionKey();
    appStorageInstance = new MMKV({
      id: 'casescriptai-storage',
      ...(encryptionKey ? { encryptionKey } : {}),
    });
  }
  return appStorageInstance;
};

/** Reset singleton after setting a new encryption key (boot / tests). */
export const resetAppStorageInstance = (): void => {
  appStorageInstance = null;
};

/** Back-compat: same API as a direct MMKV instance. */
export const appStorage: MMKV = new Proxy({} as MMKV, {
  get(_target, prop, receiver) {
    const instance = getAppStorage();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const zustandMMKVStorage: StateStorage = {
  setItem: (name, value) => {
    storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    storage.delete(name);
  },
};

export const appZustandMMKVStorage: StateStorage = {
  setItem: (name, value) => {
    getAppStorage().set(name, value);
  },
  getItem: (name) => getAppStorage().getString(name) ?? null,
  removeItem: (name) => {
    getAppStorage().delete(name);
  },
};
