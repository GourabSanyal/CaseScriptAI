import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';

import type { Result } from '@/types/result';

const RNE_DIR = `${documentDirectory ?? ''}react-native-executorch/`;

const asFileUri = (path: string): string =>
  path.startsWith('file://') ? path : `file://${path}`;

export const filenameFromUrl = (url: string): string => {
  const clean = url.replace(/^https?:\/\//, '').split('#')[0] ?? url;
  return clean.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const localPathForUrl = (url: string): string => `${RNE_DIR}${filenameFromUrl(url)}`;

export const executorchCacheDirectoryUri = (): string => asFileUri(RNE_DIR);

export const executorchFileExists = async (url: string): Promise<boolean> => {
  try {
    const info = await getInfoAsync(asFileUri(localPathForUrl(url)));
    return Boolean(info.exists && !info.isDirectory && (info.size ?? 0) > 0);
  } catch {
    return false;
  }
};

/** Removes a cached ExecuTorch asset and any `.part` sibling (idempotent). */
export const deleteExecutorchCachedUrl = async (url: string): Promise<Result<void>> => {
  try {
    const path = localPathForUrl(url);
    const targets = [path, `${path}.part`];
    for (const target of targets) {
      const uri = asFileUri(target);
      const info = await getInfoAsync(uri);
      if (info.exists) {
        await deleteAsync(uri, { idempotent: true });
      }
    }
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete model file',
    };
  }
};

/** True for Lite/Standard/Pro Qwen cache filenames (URL-sanitized or plain). */
export const isExecutorchLlmCacheFilename = (filename: string): boolean =>
  /qwen3/i.test(filename);

/**
 * Deletes every matching file in the ExecuTorch cache dir (including `.part`).
 * Catches Standard/Pro leftovers whose URLs/paths differ from the active tier list.
 */
export const purgeExecutorchCacheByPredicate = async (
  predicate: (filename: string) => boolean,
): Promise<Result<string[]>> => {
  const deleted: string[] = [];
  try {
    const dirUri = executorchCacheDirectoryUri();
    const info = await getInfoAsync(dirUri);
    if (!info.exists) {
      return { success: true, data: deleted };
    }

    const names = await readDirectoryAsync(dirUri);
    for (const name of names) {
      if (!predicate(name)) continue;
      const fileUri = `${dirUri.endsWith('/') ? dirUri : `${dirUri}/`}${name}`;
      await deleteAsync(fileUri, { idempotent: true });
      deleted.push(name);
    }
    return { success: true, data: deleted };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purge model cache',
    };
  }
};
