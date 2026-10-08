import type { MotionBudget } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useDeviceStore } from '@/stores/device-store';
import { resolveMotionBudget } from '@/utils/motion-budget';

export const useMotionBudget = (): MotionBudget => {
  const reduceMotion = useReducedMotion();
  const tier = useDeviceStore((state) => state.selection?.tier ?? null);
  return resolveMotionBudget(reduceMotion, tier);
};
