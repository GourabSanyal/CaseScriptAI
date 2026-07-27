import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function DraftsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />
      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <ThemedText type="headlineLgMobile">Drafts</ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          SOAP drafts will appear here after processing.
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
});
