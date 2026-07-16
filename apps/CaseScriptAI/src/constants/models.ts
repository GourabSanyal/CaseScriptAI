import {
  QWEN3_0_6B_QUANTIZED,
  QWEN3_1_7B_QUANTIZED,
  QWEN3_4B_QUANTIZED,
  WHISPER_TINY,
} from 'react-native-executorch';

import type { LLMTier } from '@/types/device';

export const WHISPER_MODEL = WHISPER_TINY;

export const LLM_MODELS = {
  lite: QWEN3_0_6B_QUANTIZED,
  standard: QWEN3_1_7B_QUANTIZED,
  pro: QWEN3_4B_QUANTIZED,
} as const satisfies Record<LLMTier, object>;
