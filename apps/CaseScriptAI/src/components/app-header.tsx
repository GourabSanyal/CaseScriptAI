import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppHeaderProps = {
  horizontalPad: number;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onMenuPress?: () => void;
};

export function AppHeader({
  horizontalPad,
  rightIcon,
  onMenuPress,
}: AppHeaderProps) {
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
          testID="app-menu"
          onPress={onMenuPress}
          style={styles.iconHit}
        >
          <MaterialIcons name="menu" size={24} color={theme.primary} />
        </Pressable>
        <ThemedText type="headlineLgMobile" themeColor="primary">
          CaseScriptAI
        </ThemedText>
      </View>
      {rightIcon ? (
        <MaterialIcons name={rightIcon} size={24} color={theme.textSecondary} />
      ) : (
        <View style={styles.iconHit} />
      )}
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
    minWidth: 32,
    padding: Spacing.one,
  },
});
