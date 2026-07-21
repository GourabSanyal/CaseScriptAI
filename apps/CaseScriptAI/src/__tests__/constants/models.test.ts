jest.mock('react-native-executorch', () => ({
  WHISPER_TINY: {
    modelName: 'whisper-tiny',
    modelSource: 'https://example.com/whisper.pte',
    tokenizerSource: 'https://example.com/whisper-tok.json',
  },
  QWEN3_0_6B_QUANTIZED: {
    modelName: 'qwen3-0.6b-quantized',
    modelSource: 'https://example.com/0.6b.pte',
    tokenizerSource: 'https://example.com/tok.json',
    tokenizerConfigSource: 'https://example.com/tok-config.json',
  },
  QWEN3_1_7B_QUANTIZED: {
    modelName: 'qwen3-1.7b-quantized',
    modelSource: 'https://example.com/1.7b.pte',
    tokenizerSource: 'https://example.com/tok.json',
    tokenizerConfigSource: 'https://example.com/tok-config.json',
  },
  QWEN3_4B_QUANTIZED: {
    modelName: 'qwen3-4b-quantized',
    modelSource: 'https://example.com/4b.pte',
    tokenizerSource: 'https://example.com/tok.json',
    tokenizerConfigSource: 'https://example.com/tok-config.json',
  },
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
