import { downgradeLLMTier, modelIdForTier } from '@/services/ai/llm-tier-selector';

import type { LLMTier, TierSelection } from '@/types/device';
import type { OomHealResult } from '@/types/recovery';
import type { Result } from '@/types/result';

/** Persist one-tier downgrade. Does not load/unload models — caller routes to download. */
export const healOom = (
  currentTier: LLMTier | null,
  persist: (selection: TierSelection) => void,
): Result<OomHealResult> => {
  if (!currentTier) {
    return { success: false, error: 'No LLM tier has been selected' };
  }

  const next = downgradeLLMTier(currentTier);
  if (!next) {
    return { success: true, data: { healed: false, tier: currentTier } };
  }

  persist({
    tier: next,
    modelId: modelIdForTier(next),
    showLowMemoryNotice: true,
    reason: 'compute-downgrade',
  });
  return { success: true, data: { healed: true, tier: next } };
};
