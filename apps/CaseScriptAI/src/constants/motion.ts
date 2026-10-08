/** Shared timing for UI motion — keep short on low-end devices. */
export const Motion = {
  fadeMs: 220,
  slideMs: 280,
  toastMs: 200,
  pressMs: 120,
} as const;

export type MotionBudget = 'none' | 'essential' | 'full';
