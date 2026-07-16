jest.mock('react-native-executorch', () => ({
  WHISPER_TINY: { modelName: 'whisper-tiny' },
  QWEN3_0_6B_QUANTIZED: { modelName: 'qwen3-0.6b-quantized' },
  QWEN3_1_7B_QUANTIZED: { modelName: 'qwen3-1.7b-quantized' },
  QWEN3_4B_QUANTIZED: { modelName: 'qwen3-4b-quantized' },
}));

import { LLM_MODELS, WHISPER_MODEL } from '@/constants/models';

describe('model constants', () => {
  it('uses the POC-validated Whisper Tiny model', () => {
    expect(WHISPER_MODEL.modelName).toBe('whisper-tiny');
  });

  it('maps tiers to pinned Qwen3 quantized models', () => {
    expect(LLM_MODELS.lite.modelName).toBe('qwen3-0.6b-quantized');
    expect(LLM_MODELS.standard.modelName).toBe('qwen3-1.7b-quantized');
    expect(LLM_MODELS.pro.modelName).toBe('qwen3-4b-quantized');
  });
});
