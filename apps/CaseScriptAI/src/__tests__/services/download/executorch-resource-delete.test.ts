import {
  deleteExecutorchCachedUrl,
  isExecutorchLlmCacheFilename,
  localPathForUrl,
  purgeExecutorchCacheByPredicate,
} from '@/services/download/executorch-resource';

const mockDeleteAsync = jest.fn(async () => undefined);
const mockGetInfoAsync = jest.fn(async (uri: string) => ({
  exists: true,
  isDirectory: uri.includes('react-native-executorch') && !uri.includes('model'),
  size: 10,
}));
const mockReadDirectoryAsync = jest.fn(async () => [
  'whisper-tiny.pte',
  'cdn_qwen3-0.6b-quantized.pte',
  'cdn_qwen3-1.7b-quantized.pte',
  'cdn_qwen3-4b-quantized.pte.part',
  'unrelated.json',
]);

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
}));

describe('executorch LLM cache purge', () => {
  beforeEach(() => {
    mockDeleteAsync.mockClear();
    mockGetInfoAsync.mockClear();
    mockReadDirectoryAsync.mockClear();
  });

  it('matches Lite/Standard/Pro qwen filenames including .part', () => {
    expect(isExecutorchLlmCacheFilename('cdn_qwen3-0.6b-quantized.pte')).toBe(true);
    expect(isExecutorchLlmCacheFilename('cdn_qwen3-1.7b-quantized.pte')).toBe(true);
    expect(isExecutorchLlmCacheFilename('cdn_qwen3-4b-quantized.pte.part')).toBe(true);
    expect(isExecutorchLlmCacheFilename('whisper-tiny.pte')).toBe(false);
  });

  it('purges Standard/Pro (and Lite) qwen files from the cache directory', async () => {
    const result = await purgeExecutorchCacheByPredicate(isExecutorchLlmCacheFilename);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        'cdn_qwen3-0.6b-quantized.pte',
        'cdn_qwen3-1.7b-quantized.pte',
        'cdn_qwen3-4b-quantized.pte.part',
      ]);
    }
    expect(mockDeleteAsync).toHaveBeenCalledTimes(3);
    expect(mockDeleteAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('whisper-tiny'),
      expect.anything(),
    );
  });

  it('deletes the cache file and its .part sibling when present', async () => {
    mockGetInfoAsync.mockImplementation(async (uri: string) => ({
      exists: uri.includes('present') || uri.endsWith('.part'),
      isDirectory: false,
      size: 10,
    }));

    const url = 'https://present.example.com/model.pte';
    const path = localPathForUrl(url);
    const result = await deleteExecutorchCachedUrl(url);
    const fileUri = path.startsWith('file://') ? path : `file://${path}`;

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockDeleteAsync).toHaveBeenCalledWith(fileUri, { idempotent: true });
    expect(mockDeleteAsync).toHaveBeenCalledWith(`${fileUri}.part`, { idempotent: true });
  });
});
