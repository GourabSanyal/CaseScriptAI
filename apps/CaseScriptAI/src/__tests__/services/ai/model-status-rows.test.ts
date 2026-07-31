import { buildModelStatusRows } from '@/services/ai/model-status-rows';

jest.mock('@/constants/models', () => ({
  WHISPER_MODEL: {
    modelName: 'whisper-tiny',
    modelSource: 'https://example.com/whisper.pte',
    tokenizerSource: 'https://example.com/whisper-tok.json',
  },
  LLM_MODELS: {
    lite: {
      modelName: 'qwen3-0.6b-quantized',
      modelSource: 'https://example.com/lite.pte',
      tokenizerSource: 'https://example.com/lite-tok.json',
      tokenizerConfigSource: 'https://example.com/lite-tok-config.json',
    },
    standard: {
      modelName: 'qwen3-1.7b-quantized',
      modelSource: 'https://example.com/std.pte',
      tokenizerSource: 'https://example.com/std-tok.json',
      tokenizerConfigSource: 'https://example.com/std-tok-config.json',
    },
    pro: {
      modelName: 'qwen3-4b-quantized',
      modelSource: 'https://example.com/pro.pte',
      tokenizerSource: 'https://example.com/pro-tok.json',
      tokenizerConfigSource: 'https://example.com/pro-tok-config.json',
    },
  },
}));

jest.mock('@/constants/fallback-checksums', () => ({
  FALLBACK_CHECKSUMS: {
    'whisper-tiny.model': { size: 1_000_000, sha256: 'a' },
    'whisper-tiny.tokenizer': { size: 2_000, sha256: 'b' },
    'qwen3-0.6b-quantized.model': { size: 400_000_000, sha256: 'c' },
    'qwen3-0.6b-quantized.tokenizer': { size: 3_000, sha256: 'd' },
    'qwen3-0.6b-quantized.tokenizer-config': { size: 1_000, sha256: 'e' },
  },
}));

describe('buildModelStatusRows', () => {
  it('marks rows deletable once readiness is known', () => {
    const checking = buildModelStatusRows('lite', null);
    expect(checking.every((r) => r.canDelete === false)).toBe(true);

    const ready = buildModelStatusRows('lite', {
      ready: true,
      missing: [],
      corrupt: [],
    });
    expect(ready.every((r) => r.canDelete)).toBe(true);

    const missing = buildModelStatusRows('lite', {
      ready: false,
      missing: ['whisper-tiny.model', 'qwen3-0.6b-quantized.model'],
      corrupt: [],
    });
    expect(missing.every((r) => r.canDelete)).toBe(true);
  });
});
