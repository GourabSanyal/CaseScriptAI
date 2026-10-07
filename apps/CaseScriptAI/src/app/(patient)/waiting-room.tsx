import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/motion/fade-in';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function WaitingRoomScreen() {
  const theme = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  const onLeave = () => {
    signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <FadeIn>
        <View style={styles.body}>
          <ThemedText type="labelSm" themeColor="primary">
            Patient
          </ThemedText>
          <ThemedText type="headlineLgMobile">Waiting room</ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary">
            Hi {session?.displayName ?? 'there'}. Your therapist will start the session soon.
          </ThemedText>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.backgroundElement, borderColor: theme.outlineVariant },
            ]}
            testID="patient-waiting-status"
          >
            <ThemedText type="headlineMd">Ready to join</ThemedText>
            <ThemedText type="labelSm" themeColor="textSecondary">
              Live call connects here after WebRTC (cloud C2). Demo auth is UI-only for now.
            </ThemedText>
          </View>

          <GradientButton onPress={onLeave} testID="patient-leave">
            <ThemedText type="default" style={{ color: theme.onPrimary }}>
              Leave
            </ThemedText>
          </GradientButton>
        </View>
      </FadeIn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },
  card: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
});
