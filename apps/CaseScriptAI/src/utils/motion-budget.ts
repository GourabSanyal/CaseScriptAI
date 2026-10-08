import type { MotionBudget } from '@/constants/motion';
import type { LLMTier } from '@/types/device';

/** Resolve how much UI motion to run. Prefer essential fades over ambient loops on lite devices. */
export const resolveMotionBudget = (
  reduceMotion: boolean,
  tier: LLMTier | null | undefined,
): MotionBudget => {
  if (reduceMotion) return 'none';
  if (!tier || tier === 'lite') return 'essential';
  return 'full';
};
