import {
  downgradeLLMTier,
  modelIdForTier,
  selectLLMTier,
} from '@/services/ai/llm-tier-selector';

import type { DeviceCapability } from '@/types/device';

const GIB = 1024 ** 3;
const capability = (totalRamBytes: number | null, cpuScore = 10_000): DeviceCapability => ({
  totalRamBytes,
  availableDiskBytes: 10 * GIB,
  osName: 'iOS',
  osVersion: '18',
  cpuScore,
  assessedAt: 1,
  assessmentVersion: 1,
});

describe('LLMTierSelector', () => {
  it.each([
    [3 * GIB, 'lite'],
    [4 * GIB - 1, 'lite'],
    [4 * GIB, 'standard'],
    [6 * GIB, 'standard'],
    [6 * GIB + 1, 'pro'],
  ] as const)('uses RAM boundary %s to cap tier at %s', (ram, tier) => {
    expect(selectLLMTier(capability(ram)).tier).toBe(tier);
  });

  it('serves missing and sub-3GB RAM as Lite with a notice', () => {
    expect(selectLLMTier(capability(null))).toMatchObject({
      tier: 'lite',
      showLowMemoryNotice: true,
      reason: 'fallback',
    });
    expect(selectLLMTier(capability(2.9 * GIB)).showLowMemoryNotice).toBe(true);
  });

  it('lets compute downgrade but never upgrade past the RAM cap', () => {
    expect(selectLLMTier(capability(8 * GIB, 3_000))).toMatchObject({
      tier: 'standard',
      reason: 'compute-downgrade',
    });
    expect(selectLLMTier(capability(8 * GIB, 1_000)).tier).toBe('lite');
    expect(selectLLMTier(capability(4 * GIB, 10_000)).tier).toBe('standard');
  });

  it('downgrades one tier at a time', () => {
    expect(downgradeLLMTier('pro')).toBe('standard');
    expect(downgradeLLMTier('standard')).toBe('lite');
    expect(downgradeLLMTier('lite')).toBeNull();
  });

  it('maps each tier to a stable model id', () => {
    expect(modelIdForTier('lite')).toBe('qwen3-0.6b-quantized');
    expect(modelIdForTier('standard')).toBe('qwen3-1.7b-quantized');
    expect(modelIdForTier('pro')).toBe('qwen3-4b-quantized');
  });
});
