import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTherapistGoogleSignIn } from '@/hooks/use-therapist-google-sign-in';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function TherapistLoginScreen() {
  const theme = useTheme();
  const lastError = useAuthStore((s) => s.lastError);
  const { signInWithGoogle, isBusy } = useTherapistGoogleSignIn();

  const onGoogle = async () => {
    const result = await signInWithGoogle();
    if (result.success && useAuthStore.getState().session?.role === 'therapist') {
      router.replace('/(app)/record');
    }
  };

  return (
    <AuthScreenShell
      title="Therapist sign in"
      subtitle="Continue with the Google account you use for your practice."
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          testID="auth-therapist-back"
        >
          <ThemedText type="linkPrimary" style={styles.center}>
            Back
          </ThemedText>
        </Pressable>
      }
    >
      <GradientButton
        onPress={() => {
          void onGoogle();
        }}
        disabled={isBusy}
        testID="auth-therapist-google"
      >
        {isBusy ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <ThemedText type="default" style={{ color: theme.onPrimary }}>
            Continue with Google
          </ThemedText>
        )}
      </GradientButton>
      {lastError ? (
        <ThemedText
          type="labelSm"
          style={{ color: theme.statusFailedFg, marginTop: Spacing.two }}
          testID="auth-therapist-error"
        >
          {lastError}
        </ThemedText>
      ) : null}
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
