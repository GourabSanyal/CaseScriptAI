import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { AuthTextField } from '@/components/auth/auth-text-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function TherapistLoginScreen() {
  const theme = useTheme();
  const signInTherapist = useAuthStore((s) => s.signInTherapist);
  const lastError = useAuthStore((s) => s.lastError);
  const clearError = useAuthStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = () => {
    clearError();
    const result = signInTherapist({ email, password });
    if (result.success) router.replace('/(app)/record');
  };

  return (
    <AuthScreenShell
      title="Therapist sign in"
      subtitle="Use your practice email. Demo accepts any valid email and a password of 6+ characters."
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
      <AuthTextField
        label="Email"
        testID="auth-therapist-email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        placeholder="you@clinic.com"
      />
      <AuthTextField
        label="Password"
        testID="auth-therapist-password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        placeholder="••••••••"
      />
      {lastError ? (
        <ThemedText type="labelSm" style={{ color: theme.statusFailedFg }} testID="auth-therapist-error">
          {lastError}
        </ThemedText>
      ) : null}
      <GradientButton onPress={onSubmit} testID="auth-therapist-submit">
        <ThemedText type="default" style={{ color: theme.onPrimary }}>
          Sign in
        </ThemedText>
      </GradientButton>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
