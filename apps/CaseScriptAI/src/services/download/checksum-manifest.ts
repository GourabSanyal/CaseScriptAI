import { FALLBACK_CHECKSUMS } from '@/constants/fallback-checksums';

import type { ChecksumManifest, ChecksumRecord, DownloadAssetId } from '@/types/download';
import type { Result } from '@/types/result';

type HfEntry = { path?: string; size?: number; oid?: string; lfs?: { oid?: string; size?: number } };

const HF_TREES = [
  'https://huggingface.co/api/models/software-mansion/react-native-executorch-whisper-tiny/tree/v0.8.0?recursive=1',
  'https://huggingface.co/api/models/software-mansion/react-native-executorch-qwen-3/tree/v0.8.0?recursive=1',
] as const;

const PATH_TO_ASSET: Record<string, DownloadAssetId[]> = {
  'xnnpack/whisper_tiny_xnnpack.pte': ['whisper-tiny.model'],
  'tokenizer.json': ['whisper-tiny.tokenizer'], // disambiguated by repo below
  'qwen-3-0.6B/quantized/qwen3_0_6b_8da4w.pte': ['qwen3-0.6b-quantized.model'],
  'qwen-3-1.7B/quantized/qwen3_1_7b_8da4w.pte': ['qwen3-1.7b-quantized.model'],
  'qwen-3-4B/quantized/qwen3_4b_8da4w.pte': ['qwen3-4b-quantized.model'],
  'tokenizer_config.json': [
    'qwen3-0.6b-quantized.tokenizer-config',
    'qwen3-1.7b-quantized.tokenizer-config',
    'qwen3-4b-quantized.tokenizer-config',
  ],
};

const recordFrom = (entry: HfEntry): ChecksumRecord | null => {
  const sha256 = entry.lfs?.oid;
  const size = entry.lfs?.size ?? entry.size;
  if (!sha256 || !Number.isFinite(size) || (size ?? 0) < 0) return null;
  return { sha256, size: size as number, version: 'v0.8.0' };
};

/** Worker: refresh checksums from HuggingFace when online. Falls back to shipped manifest on failure. */
export const fetchHuggingFaceChecksumManifest = async (): Promise<Result<ChecksumManifest>> => {
  try {
    const manifest: ChecksumManifest = { ...FALLBACK_CHECKSUMS };

    for (const url of HF_TREES) {
      const response = await fetch(url);
      if (!response.ok) continue;
      const entries = (await response.json()) as HfEntry[];
      const isWhisper = url.includes('whisper-tiny');

      for (const entry of entries) {
        if (!entry.path) continue;
        if (entry.path === 'tokenizer.json') {
          const ids: DownloadAssetId[] = isWhisper
            ? ['whisper-tiny.tokenizer']
            : [
                'qwen3-0.6b-quantized.tokenizer',
                'qwen3-1.7b-quantized.tokenizer',
                'qwen3-4b-quantized.tokenizer',
              ];
          // non-LFS tokenizers keep shipped sha256; LFS ones update
          const rec = recordFrom(entry);
          if (rec) for (const id of ids) manifest[id] = rec;
          continue;
        }

        const ids = PATH_TO_ASSET[entry.path];
        if (!ids) continue;
        const rec = recordFrom(entry);
        if (rec) for (const id of ids) manifest[id] = rec;
      }
    }

    return { success: true, data: manifest };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checksum worker failed',
    };
  }
};
