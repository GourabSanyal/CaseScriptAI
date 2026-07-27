import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDeviceStore } from '@/stores/device-store';

export default function AccountScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;
  const selection = useDeviceStore((state) => state.selection);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />
      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <ThemedText type="headlineLgMobile">Account</ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          {selection
            ? `On-device model tier: ${selection.tier} (${selection.modelId})`
            : 'Device tier not assessed yet.'}
        </ThemedText>
        <ThemedText type="labelSm" themeColor="textSecondary">
          All clinical data stays on this device.
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
