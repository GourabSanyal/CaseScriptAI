import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function WelcomeScreen() {
  const theme = useTheme();
  const continueTherapistDemo = useAuthStore((s) => s.continueTherapistDemo);

  const onTherapistDemo = () => {
    const result = continueTherapistDemo();
    if (result.success) router.replace('/(app)/record');
  };

  return (
    <AuthScreenShell
      title="Welcome"
      subtitle="Therapists sign in to run sessions. Patients join with an invite."
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={onTherapistDemo}
          testID="auth-welcome-therapist-demo"
        >
          <ThemedText type="linkPrimary" style={styles.center}>
            Continue as therapist (demo)
          </ThemedText>
        </Pressable>
      }
    >
      <GradientButton
        onPress={() => router.push('/(auth)/therapist-login')}
        testID="auth-welcome-therapist"
      >
        <ThemedText type="default" style={{ color: theme.onPrimary }}>
          I&apos;m a therapist
        </ThemedText>
      </GradientButton>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(auth)/patient-join')}
        style={[
          styles.secondary,
          { borderColor: theme.outlineVariant, backgroundColor: theme.backgroundElement },
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
          Demo auth only — real accounts and invite expiry land with cloud C1.
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
});
