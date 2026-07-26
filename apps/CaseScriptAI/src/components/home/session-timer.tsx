import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSessionTimer } from '@/utils/format-session-timer';

type SessionTimerProps = {
  elapsedMs: number;
};

export function SessionTimer({ elapsedMs }: SessionTimerProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={`Session timer ${formatSessionTimer(elapsedMs)}`}>
      <ThemedText type="labelSm" themeColor="textSecondary" style={styles.label}>
        CURRENT SESSION
      </ThemedText>
      <ThemedText style={[styles.timer, { color: theme.text }]}>
        {formatSessionTimer(elapsedMs)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  timer: {
    fontFamily: FontFamily.sans,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
