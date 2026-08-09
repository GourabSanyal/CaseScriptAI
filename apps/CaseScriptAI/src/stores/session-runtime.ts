import { open } from '@op-engineering/op-sqlite';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { setCryptoKeyProvider } from '@/services/audio/crypto-service';
import { createKeyStore, createMemorySecureStore } from '@/services/storage/key-store';
import {
  createMemorySessionRepository,
  createSqliteSessionRepository,
  migrateAppSchema,
  type SqlExecutor,
  type SqlScalar,
} from '@/services/storage/session-repository';
import { createSessionStore } from '@/stores/session-store';

import type { Result } from '@/types/result';
import type { SessionRepository } from '@/types/session';

type RepoHolder = { current: SessionRepository };

const holder: RepoHolder = { current: createMemorySessionRepository() };

/** Stable proxy so stores can bind before native DB finishes opening. */
export const sessionRepository: SessionRepository = {
  upsert: (session) => holder.current.upsert(session),
  getById: (id) => holder.current.getById(id),
  list: (filter) => holder.current.list(filter),
  remove: (id) => holder.current.remove(id),
};

export const bindSessionRepository = (repo: SessionRepository): void => {
  holder.current = repo;
};

export const useSessionStore = createSessionStore({
  repository: sessionRepository,
});

const secureStoreFromExpo = async (): Promise<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}> => {
  // Avoid importing expo-secure-store until the native module is in the binary
  // (JS dep alone → "Cannot find native module 'ExpoSecureStore'").
  if (!requireOptionalNativeModule('ExpoSecureStore')) {
    return createMemorySecureStore();
  }
  const SecureStore = await import('expo-secure-store');
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  };
};

/**
 * Boot storage: Keychain AES key + SQLCipher sessions DB.
 * Safe to call once from root layout; falls back to memory repo on failure.
 */
export const initAppStorage = async (): Promise<Result<void>> => {
  try {
    const secure = await secureStoreFromExpo();
    const keys = createKeyStore(secure);
    setCryptoKeyProvider(() => keys.getOrCreateAesKey());

    const key = await keys.getOrCreateAesKey();
    if (!key.success) return key;

    const db = open({
      name: 'casescriptai.db',
      // SQLCipher passphrase ≠ AES key material; keep separate from Base64 AES key.
      encryptionKey: `csai:${key.data}`,
    });
    const executor: SqlExecutor = {
      execute: async (sql, params) => {
        // op-sqlite Scalar[] is wider than our SqlScalar[]; cast at the boundary.
        const result = await db.execute(sql, params as never);
        return {
          rows: (result.rows ?? []) as Record<string, SqlScalar>[],
          rowsAffected: result.rowsAffected ?? 0,
        };
      },
    };
    const migrated = await migrateAppSchema(executor);
    if (!migrated.success) return migrated;

    bindSessionRepository(createSqliteSessionRepository(executor));
    await useSessionStore.getState().hydrate();
    return { success: true, data: undefined };
  } catch (error) {
    // ponytail: keep memory repo so UI still works if SQLCipher native build missing
    setCryptoKeyProvider(() =>
      createKeyStore(createMemorySecureStore()).getOrCreateAesKey(),
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Storage init failed',
    };
  }
};
