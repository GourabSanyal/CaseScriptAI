import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ProgressRingProps = {
  size: number;
  /** Static percent label; ring fill is not animated yet. */
  percent?: number;
};

export function ProgressRing({ size, percent = 0 }: ProgressRingProps) {
  const theme = useTheme();
  const trackWidth = Math.max(6, Math.round(size * 0.03));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 1.25,
            height: size * 1.25,
            borderRadius: (size * 1.25) / 2,
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
            borderRadius: size / 2,
            borderWidth: trackWidth,
            borderColor: theme.surfaceContainerHigh,
          },
        ]}
      />
      <View style={styles.label}>
        <ThemedText type="display" themeColor="primary">
          {`${percent}%`}
        </ThemedText>
        <ThemedText type="labelSm" themeColor="textSecondary" style={styles.caption}>
          Optimizing Model
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    opacity: 0.1,
  },
  track: {
    position: 'absolute',
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
