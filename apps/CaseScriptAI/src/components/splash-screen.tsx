import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const TABLET_BREAKPOINT = 768;
const LOGO_DURATION_MS = 1200;
const TEXT_DURATION_MS = 800;
const TITLE_DELAY_MS = 600;
const TAGLINE_DELAY_MS = 1000;
const DISMISS_DURATION_MS = 400;

const SPLASH = {
  background: '#fcf9f5',
  onSurface: '#1c1c19',
  onSurfaceVariant: '#414943',
  primaryFixedDim: '#a0d2b5',
  secondaryFixedDim: '#b3cad7',
} as const;

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

type SplashScreenOverlayProps = {
  readyToDismiss: boolean;
  onFinish: () => void;
};

export function SplashScreenOverlay({
  readyToDismiss,
  onFinish,
}: SplashScreenOverlayProps) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const logoSize = isTablet ? 160 : 128;
  const titleSize = isTablet ? 24 : 22;
  const titleLineHeight = isTablet ? 32 : 30;
  const blobScale = Math.min(width, height);

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

  return (
    <Animated.View
      style={[styles.container, overlayStyle]}
      accessibilityRole="none"
      importantForAccessibility="no-hide-descendants"
    >
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobTop,
          {
            width: blobScale * 0.4,
            height: blobScale * 0.4,
            backgroundColor: `${SPLASH.primaryFixedDim}1A`,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobBottom,
          {
            width: blobScale * 0.5,
            height: blobScale * 0.5,
            backgroundColor: `${SPLASH.secondaryFixedDim}1A`,
          },
        ]}
      />

      <View
        style={[
          styles.content,
          {
            maxWidth: Math.min(width - 32, 384),
            paddingHorizontal: Math.max(16, width * 0.05),
          },
        ]}
      >
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('@/assets/images/leaf-logo.png')}
            style={{ width: logoSize, height: logoSize }}
            contentFit="contain"
            accessibilityLabel="CaseScriptAI logo"
          />
        </Animated.View>

        <View style={styles.textBlock}>
          <Animated.Text
            style={[
              styles.title,
              { fontSize: titleSize, lineHeight: titleLineHeight },
              titleStyle,
            ]}
          >
            CaseScriptAI
          </Animated.Text>
          <Animated.Text
            style={[
              styles.tagline,
              { maxWidth: Math.min(280, width - 64) },
              taglineStyle,
            ]}
          >
            Your session. Documented with care.
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

export { SPLASH as SplashColors };

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  blobTop: {
    top: '-10%',
    left: '-5%',
  },
  blobBottom: {
    bottom: '-10%',
    right: '-5%',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoWrap: {
    marginBottom: 24,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'DMSans',
    fontWeight: '700',
    color: SPLASH.onSurface,
    letterSpacing: -0.22,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'DMSans',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: SPLASH.onSurfaceVariant,
    textAlign: 'center',
  },
});
