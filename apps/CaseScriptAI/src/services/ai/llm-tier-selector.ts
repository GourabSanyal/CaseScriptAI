import type {
  DeviceCapability,
  LLMModelId,
  LLMTier,
  TierSelection,
} from '@/types/device';

const GIB = 1024 ** 3;
const STANDARD_MIN_RAM = 4 * GIB;
const PRO_MIN_RAM_EXCLUSIVE = 6 * GIB;
const LOW_MEMORY_NOTICE_MAX = 3 * GIB;
const STANDARD_MIN_CPU_SCORE = 2_000;
const PRO_MIN_CPU_SCORE = 5_000;

const MODEL_IDS: Record<LLMTier, LLMModelId> = {
  lite: 'qwen3-0.6b-quantized',
  standard: 'qwen3-1.7b-quantized',
  pro: 'qwen3-4b-quantized',
};

const ramTier = (totalRamBytes: number): LLMTier => {
  if (totalRamBytes < STANDARD_MIN_RAM) return 'lite';
  if (totalRamBytes <= PRO_MIN_RAM_EXCLUSIVE) return 'standard';
  return 'pro';
};

const computeTier = (cpuScore: number): LLMTier => {
  if (cpuScore < STANDARD_MIN_CPU_SCORE) return 'lite';
  if (cpuScore < PRO_MIN_CPU_SCORE) return 'standard';
  return 'pro';
};

const lowerTier = (left: LLMTier, right: LLMTier): LLMTier => {
  const order: LLMTier[] = ['lite', 'standard', 'pro'];
  return order[Math.min(order.indexOf(left), order.indexOf(right))];
};

export const selectLLMTier = (capability: DeviceCapability): TierSelection => {
  if (capability.totalRamBytes === null) {
    return {
      tier: 'lite',
      modelId: MODEL_IDS.lite,
      showLowMemoryNotice: true,
      reason: 'fallback',
    };
  }

  const maximum = ramTier(capability.totalRamBytes);
  const tier = lowerTier(maximum, computeTier(capability.cpuScore));

  return {
    tier,
    modelId: MODEL_IDS[tier],
    showLowMemoryNotice: capability.totalRamBytes < LOW_MEMORY_NOTICE_MAX,
    reason: tier === maximum ? 'ram' : 'compute-downgrade',
  };
};

export const downgradeLLMTier = (tier: LLMTier): LLMTier | null => {
  if (tier === 'pro') return 'standard';
  if (tier === 'standard') return 'lite';
  return null;
};

export const modelIdForTier = (tier: LLMTier): LLMModelId => MODEL_IDS[tier];
