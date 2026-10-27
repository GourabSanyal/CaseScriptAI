import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWakeDemoApi } from '@/hooks/use-wake-demo-api';
import { useAuthStore } from '@/stores/auth-store';

export default function WelcomeScreen() {
  const theme = useTheme();
  const continueTherapistDemo = useAuthStore((s) => s.continueTherapistDemo);
  const { isWaking, isReady, error, retry } = useWakeDemoApi();

  const onTherapistDemo = () => {
    const result = continueTherapistDemo();
    if (result.success) router.replace('/(app)/record');
  };

  return (
    <AuthScreenShell
      title="Welcome"
      subtitle="Therapists sign in to run sessions. Patients join with an invite."
      footer={
        __DEV__ ? (
          <Pressable
            accessibilityRole="button"
            onPress={onTherapistDemo}
            testID="auth-welcome-therapist-demo"
          >
            <ThemedText type="linkPrimary" style={styles.center}>
              Continue as therapist (demo)
            </ThemedText>
          </Pressable>
        ) : null
      }
    >
      {isWaking ? (
        <View style={styles.wake} testID="auth-welcome-waking">
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="labelSm" themeColor="textSecondary">
            Waking server (~1 min)…
          </ThemedText>
        </View>
      ) : null}
      {error ? (
        <View style={styles.wake}>
          <ThemedText
            type="labelSm"
            style={{ color: theme.statusFailedFg }}
            testID="auth-welcome-wake-error"
          >
            {error}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={retry} testID="auth-welcome-wake-retry">
            <ThemedText type="linkPrimary">Retry</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <GradientButton
        onPress={() => router.push('/(auth)/therapist-login')}
        disabled={!isReady}
        testID="auth-welcome-therapist"
      >
        <ThemedText type="default" style={{ color: theme.onPrimary }}>
          I&apos;m a therapist
        </ThemedText>
      </GradientButton>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(auth)/patient-join')}
        disabled={!isReady}
        style={[
          styles.secondary,
          {
            borderColor: theme.outlineVariant,
            backgroundColor: theme.backgroundElement,
            opacity: isReady ? 1 : 0.5,
          },
        ]}
        testID="auth-welcome-patient"
      >
        <ThemedText type="default">I have an invite</ThemedText>
        <ThemedText type="labelSm" themeColor="textSecondary">
          Join a session with a code from your therapist
        </ThemedText>
      </Pressable>

      <View style={styles.hint}>
        <ThemedText type="labelSm" themeColor="textSecondary">
          Therapists sign in with Google. Patients still join with an invite code.
        </ThemedText>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  secondary: {
    width: '100%',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  hint: { marginTop: Spacing.two },
  center: { textAlign: 'center' },
  wake: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
});
