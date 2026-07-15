import { useEffect, useState } from 'react';

import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const LOGO_DURATION_MS = 1200;
const TEXT_DURATION_MS = 800;
const TITLE_DELAY_MS = 600;
const TAGLINE_DELAY_MS = 1000;
const DISMISS_DURATION_MS = 400;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export function useSplashSequence(readyToDismiss: boolean, onFinish: () => void) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.95);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const overlayOpacity = useSharedValue(1);
  const [animationsDone, setAnimationsDone] = useState(false);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: LOGO_DURATION_MS, easing: EASE });
    logoScale.value = withTiming(1, { duration: LOGO_DURATION_MS, easing: EASE });

    titleOpacity.value = withDelay(
      TITLE_DELAY_MS,
      withTiming(1, { duration: TEXT_DURATION_MS, easing: EASE }),
    );
    titleTranslateY.value = withDelay(
      TITLE_DELAY_MS,
      withTiming(0, { duration: TEXT_DURATION_MS, easing: EASE }),
    );

    taglineOpacity.value = withDelay(
      TAGLINE_DELAY_MS,
      withTiming(1, { duration: TEXT_DURATION_MS, easing: EASE }, (finished) => {
        if (finished) {
          runOnJS(setAnimationsDone)(true);
        }
      }),
    );
    taglineTranslateY.value = withDelay(
      TAGLINE_DELAY_MS,
      withTiming(0, { duration: TEXT_DURATION_MS, easing: EASE }),
    );
  }, [
    logoOpacity,
    logoScale,
    taglineOpacity,
    taglineTranslateY,
    titleOpacity,
    titleTranslateY,
  ]);

  useEffect(() => {
    if (!readyToDismiss || !animationsDone) {
      return;
    }

    overlayOpacity.value = withTiming(
      0,
      { duration: DISMISS_DURATION_MS, easing: Easing.out(Easing.ease) },
      (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      },
    );
  }, [animationsDone, onFinish, overlayOpacity, readyToDismiss]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return { logoStyle, titleStyle, taglineStyle, overlayStyle };
}
