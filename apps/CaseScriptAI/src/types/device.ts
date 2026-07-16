export type LLMTier = 'lite' | 'standard' | 'pro';

export type LLMModelId =
  | 'qwen3-0.6b-quantized'
  | 'qwen3-1.7b-quantized'
  | 'qwen3-4b-quantized';

export type DeviceCapability = {
  totalRamBytes: number | null;
  availableDiskBytes: number;
  osName: string | null;
  osVersion: string | null;
  cpuScore: number;
  assessedAt: number;
  assessmentVersion: number;
};

export type TierSelection = {
  tier: LLMTier;
  modelId: LLMModelId;
  showLowMemoryNotice: boolean;
  reason: 'ram' | 'compute-downgrade' | 'fallback';
};
