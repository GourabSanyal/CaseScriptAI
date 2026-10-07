import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthScreenShell } from '@/components/auth/auth-screen-shell';
import { AuthTextField } from '@/components/auth/auth-text-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { DEMO_INVITE_CODE } from '@/services/auth/demo-auth-service';
import { useAuthStore } from '@/stores/auth-store';

export default function PatientJoinScreen() {
  const theme = useTheme();
  const joinPatient = useAuthStore((s) => s.joinPatient);
  const lastError = useAuthStore((s) => s.lastError);
  const clearError = useAuthStore((s) => s.clearError);
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  const onSubmit = () => {
    clearError();
    const result = joinPatient({ inviteCode, displayName });
    if (result.success) router.replace('/(patient)/waiting-room');
  };

  return (
    <AuthScreenShell
      title="Join with invite"
      subtitle={`Enter the code from your therapist. Demo code: ${DEMO_INVITE_CODE}.`}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          testID="auth-patient-back"
        >
          <ThemedText type="linkPrimary" style={styles.center}>
            Back
          </ThemedText>
        </Pressable>
      }
    >
      <AuthTextField
        label="Your name (optional)"
        testID="auth-patient-name"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        placeholder="Alex"
      />
      <AuthTextField
        label="Invite code"
        testID="auth-patient-code"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        placeholder={DEMO_INVITE_CODE}
      />
      {lastError ? (
        <ThemedText type="labelSm" style={{ color: theme.statusFailedFg }} testID="auth-patient-error">
          {lastError}
        </ThemedText>
      ) : null}
      <GradientButton onPress={onSubmit} testID="auth-patient-submit">
        <ThemedText type="default" style={{ color: theme.onPrimary }}>
          Join session
        </ThemedText>
      </GradientButton>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
