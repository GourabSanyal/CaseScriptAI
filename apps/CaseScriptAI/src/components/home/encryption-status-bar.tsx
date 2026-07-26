import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type EncryptionStatusBarProps = {
  live: boolean;
  pendingCount?: number;
};

export function EncryptionStatusBar({ live, pendingCount = 0 }: EncryptionStatusBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.bar, { backgroundColor: theme.secondaryContainer }]}
      accessibilityRole="text"
    >
      <View style={styles.left}>
        <MaterialIcons name="lock" size={16} color={theme.onSecondaryContainer} />
        <ThemedText type="labelSm" style={{ color: theme.onSecondaryContainer }}>
          HIPAA Compliant Encryption
        </ThemedText>
      </View>
      <View style={styles.right}>
        {pendingCount > 0 && !live ? (
          <ThemedText type="labelSm" style={{ color: theme.onSecondaryContainer }}>
            {pendingCount} pending
          </ThemedText>
        ) : (
          <>
            <View
              style={[
                styles.dot,
                { backgroundColor: live ? theme.primary : theme.outlineVariant },
              ]}
            />
            <ThemedText type="labelSm" style={{ color: theme.onSecondaryContainer }}>
              {live ? 'Live' : 'Ready'}
            </ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.full,
    gap: Spacing.two,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
});
