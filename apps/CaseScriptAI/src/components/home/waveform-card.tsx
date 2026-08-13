import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BAR_COUNT = 12;
const BAR_PATTERN = [0.35, 0.55, 0.8, 1, 0.7, 0.45, 0.9, 0.6, 0.4, 0.75, 0.5, 0.3];

type WaveformCardProps = {
  active: boolean;
  subtitle: string;
};

function WaveBar({
  index,
  active,
  color,
}: {
  index: number;
  active: boolean;
  color: string;
}) {
  const height = useSharedValue(10 + BAR_PATTERN[index]! * 28);

  useEffect(() => {
    if (!active) {
      height.value = withTiming(8 + BAR_PATTERN[index]! * 12, { duration: 280 });
      return () => cancelAnimation(height);
    }
    height.value = withRepeat(
      withTiming(14 + BAR_PATTERN[index]! * 36, {
        duration: 420 + index * 40,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(height);
  }, [active, height, index]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

export function WaveformCard({ active, subtitle }: WaveformCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessibilityRole="summary"
      accessibilityLabel={subtitle}
    >
      <View style={styles.waveRow}>
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <WaveBar
            key={index}
            index={index}
            active={active}
            color={active ? theme.primary : theme.primaryFixedDim}
          />
        ))}
      </View>
      <ThemedText type="labelSm" themeColor="textSecondary" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    minHeight: 160,
    borderRadius: Radius.md,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 56,
  },
  bar: {
    width: 8,
    borderRadius: Radius.full,
  },
  subtitle: {
    textAlign: 'center',
  },
});
