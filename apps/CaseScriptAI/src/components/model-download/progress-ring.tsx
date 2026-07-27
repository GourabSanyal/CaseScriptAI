import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const EASE = Easing.out(Easing.cubic);

type ProgressRingProps = {
  size: number;
  percent?: number;
  caption?: string;
};

export function ProgressRing({
  size,
  percent = 0,
  caption = 'Ready to download',
}: ProgressRingProps) {
  const theme = useTheme();
  const stroke = Math.max(8, Math.round(size * 0.045));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, percent / 100)), {
      duration: 420,
      easing: EASE,
    });
  }, [percent, progress]);

  // Right clip covers 0–50%; left clip covers 50–100% (needs the opposite border pair).
  const rightStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 0.5, 1], [-135, 45, 45])}deg` },
    ],
  }));

  const leftStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 0.5, 1], [-135, -135, 45])}deg` },
    ],
  }));

  const half = size / 2;
  const baseRing = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderColor: 'transparent',
  } as const;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          shadowColor: theme.primary,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: (size * 1.2) / 2,
            backgroundColor: theme.primaryFixedDim,
          },
        ]}
      />

      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
            borderColor: theme.surfaceContainerHigh,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.bevel,
          {
            width: size - stroke * 1.1,
            height: size - stroke * 1.1,
            borderRadius: (size - stroke * 1.1) / 2,
            borderColor: theme.outlineVariant,
          },
        ]}
      />

      <View style={[styles.clip, { width: half, height: size, left: half }]}>
        <Animated.View
          style={[
            baseRing,
            {
              marginLeft: -half,
              borderTopColor: theme.primary,
              borderRightColor: theme.primary,
            },
            rightStyle,
          ]}
        />
      </View>
      <View style={[styles.clip, { width: half, height: size, left: 0 }]}>
        <Animated.View
          style={[
            baseRing,
            {
              borderBottomColor: theme.primary,
              borderLeftColor: theme.primary,
            },
            leftStyle,
          ]}
        />
      </View>

      <View style={styles.label} pointerEvents="none">
        <ThemedText type="display" themeColor="primary">
          {`${Math.round(percent)}%`}
        </ThemedText>
        <ThemedText type="labelSm" themeColor="textSecondary" style={styles.caption}>
          {caption}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    position: 'absolute',
    opacity: 0.14,
  },
  track: {
    position: 'absolute',
  },
  bevel: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.45,
  },
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  label: {
    alignItems: 'center',
    gap: 4,
  },
  caption: {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
