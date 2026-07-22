import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ModelDownloadHeaderProps = {
  horizontalPad: number;
};

export function ModelDownloadHeader({ horizontalPad }: ModelDownloadHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          paddingHorizontal: horizontalPad,
          backgroundColor: theme.surface,
          borderBottomColor: theme.outlineVariant,
        },
      ]}
    >
      <View style={styles.headerLeft}>
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          hitSlop={8}
          testID="model-download-menu"
          style={styles.iconHit}
        >
          <MaterialIcons name="menu" size={24} color={theme.primary} />
        </Pressable>
        <ThemedText type="headlineLgMobile" themeColor="primary">
          CaseScriptAI
        </ThemedText>
      </View>
      <MaterialIcons name="cloud-download" size={24} color={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconHit: {
    padding: Spacing.one,
  },
});
