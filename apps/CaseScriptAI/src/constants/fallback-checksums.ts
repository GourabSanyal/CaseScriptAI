import type { ChecksumManifest } from '@/types/download';

/** Hardcoded offline fallbacks (ExecuTorch resolve/v0.8.0 HuggingFace LFS sha256 + sizes). */
export const FALLBACK_CHECKSUMS: ChecksumManifest = {
  'whisper-tiny.model': {
    sha256: '272cb572c2d54e2ef22bdb9e6d807e923bc8cd1827f43ff16d7dafcc62727762',
    size: 232_615_296,
    version: 'v0.8.0',
  },
  'whisper-tiny.tokenizer': {
    sha256: '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566',
    size: 2_480_466,
    version: 'v0.8.0',
  },
  'qwen3-0.6b-quantized.model': {
    sha256: '7f8ece3b8d24789be7742d25c312d415574e1efc3c4535ace83a564f3fb27aa0',
    size: 505_686_400,
    version: 'v0.8.0',
  },
  'qwen3-0.6b-quantized.tokenizer': {
    sha256: 'aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4',
    size: 11_422_654,
    version: 'v0.8.0',
  },
  'qwen3-0.6b-quantized.tokenizer-config': {
    sha256: '5a7303fcb1a27ede63134a2cbd61d5282c247ca6d769ce4746d4ffa124aedd63',
    size: 9_675,
    version: 'v0.8.0',
  },
  'qwen3-1.7b-quantized.model': {
    sha256: '72890e735c1333552b6f0ea0db90bec60d403090f00295cb5ebc94264320022a',
    size: 1_303_738_496,
    version: 'v0.8.0',
  },
  'qwen3-1.7b-quantized.tokenizer': {
    sha256: 'aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4',
    size: 11_422_654,
    version: 'v0.8.0',
  },
  'qwen3-1.7b-quantized.tokenizer-config': {
    sha256: '5a7303fcb1a27ede63134a2cbd61d5282c247ca6d769ce4746d4ffa124aedd63',
    size: 9_675,
    version: 'v0.8.0',
  },
  'qwen3-4b-quantized.model': {
    sha256: 'f1791924165658e12f3179764139219c3f9aefdf44674472be7902e54220850a',
    size: 2_681_646_976,
    version: 'v0.8.0',
  },
  'qwen3-4b-quantized.tokenizer': {
    sha256: 'aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4',
    size: 11_422_654,
    version: 'v0.8.0',
  },
  'qwen3-4b-quantized.tokenizer-config': {
    sha256: '5a7303fcb1a27ede63134a2cbd61d5282c247ca6d769ce4746d4ffa124aedd63',
    size: 9_675,
    version: 'v0.8.0',
  },
};
