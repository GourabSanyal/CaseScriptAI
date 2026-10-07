import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { LOCAL_ON_DEVICE_AI_ENABLED } from '@/constants/features';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';
import { useDeviceStore } from '@/stores/device-store';

export default function AccountScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;
  const selection = useDeviceStore((state) => state.selection);
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);

  const onSignOut = () => {
    signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />
      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <ThemedText type="headlineLgMobile">Account</ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          Signed in as {session?.displayName ?? 'Therapist'} ({session?.role ?? 'therapist'})
        </ThemedText>
        {LOCAL_ON_DEVICE_AI_ENABLED ? (
          <ThemedText type="bodyMd" themeColor="textSecondary">
            {selection
              ? `On-device model tier: ${selection.tier} (${selection.modelId})`
              : 'Device tier not assessed yet.'}
          </ThemedText>
        ) : (
          <ThemedText type="bodyMd" themeColor="textSecondary">
            AI runs via external APIs — local model download is off.
          </ThemedText>
        )}
        <ThemedText type="labelSm" themeColor="textSecondary">
          Demo session only — cloud C1 will replace this with secure tokens.
        </ThemedText>
        <GradientButton onPress={onSignOut} testID="account-sign-out">
          <ThemedText type="default" style={{ color: theme.onPrimary }}>
            Sign out
          </ThemedText>
        </GradientButton>
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
