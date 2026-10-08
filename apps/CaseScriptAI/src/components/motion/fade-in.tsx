import { type ReactNode, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Motion } from '@/constants/motion';
import { useMotionBudget } from '@/hooks/use-motion-budget';

type FadeInProps = {
  children: ReactNode;
  delayMs?: number;
};

/** Opacity-only enter. Skips animation when motion budget is `none`. */
export function FadeIn({ children, delayMs = 0 }: FadeInProps) {
  const budget = useMotionBudget();
  const opacity = useSharedValue(budget === 'none' ? 1 : 0);

  useEffect(() => {
    if (budget === 'none') {
      opacity.value = 1;
      return;
    }
    opacity.value = 0;
    opacity.value = withDelay(
      delayMs,
      withTiming(1, { duration: Motion.fadeMs }),
    );
  }, [budget, delayMs, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
