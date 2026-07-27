import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { RecordingState } from '@/types/recording';

type HomePrimaryActionsProps = {
  machine: RecordingState;
  error: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRecover: (action: 'resume' | 'discard') => void;
};

export function HomePrimaryActions({
  machine,
  error,
  onStart,
  onPause,
  onResume,
  onStop,
  onRecover,
}: HomePrimaryActionsProps) {
  const theme = useTheme();
  const isRecording = machine.status === 'recording';
  const isPaused = machine.status === 'paused';
  const isOrphaned = machine.status === 'orphaned';
  const canStart =
    machine.status === 'idle' || machine.status === 'queued' || machine.status === 'failed';

  if (isOrphaned) {
    return (
      <View style={styles.column}>
        <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.error}>
          Unfinished session found. Resume or discard?
        </ThemedText>
        <GradientButton
          accessibilityLabel="Resume unfinished session"
          accessibilityRole="button"
          testID="home-recover-resume"
          onPress={() => onRecover('resume')}
        >
          <ThemedText type="headlineMd" themeColor="onPrimary">
            Resume session
          </ThemedText>
        </GradientButton>
        <Pressable
          accessibilityLabel="Discard unfinished session"
          accessibilityRole="button"
          testID="home-recover-discard"
          onPress={() => onRecover('discard')}
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: theme.outlineVariant, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <ThemedText type="bodyMd" themeColor="textSecondary">
            Discard
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.column}>
      {error ? (
        <ThemedText type="labelSm" themeColor="textSecondary" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      {canStart ? (
        <GradientButton
          accessibilityLabel="Start recording"
          accessibilityRole="button"
          testID="home-start"
          onPress={onStart}
        >
          <MaterialIcons name="mic" size={22} color={theme.onPrimary} />
          <ThemedText type="headlineMd" themeColor="onPrimary">
            START
          </ThemedText>
        </GradientButton>
      ) : null}

      {isRecording || isPaused ? (
        <>
          <GradientButton
            accessibilityLabel="Stop recording"
            accessibilityRole="button"
            testID="home-stop"
            onPress={onStop}
          >
            <MaterialIcons name="stop" size={22} color={theme.onPrimary} />
            <ThemedText type="headlineMd" themeColor="onPrimary">
              STOP
            </ThemedText>
          </GradientButton>
          <Pressable
            accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
            accessibilityRole="button"
            testID={isPaused ? 'home-resume' : 'home-pause'}
            onPress={isPaused ? onResume : onPause}
            style={({ pressed }) => [
              styles.secondary,
              { borderColor: theme.outlineVariant, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ThemedText type="bodyMd" themeColor="textSecondary">
              {isPaused ? 'Resume' : 'Pause'}
            </ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.three,
  },
  secondary: {
    width: '100%',
    height: 48,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    textAlign: 'center',
  },
});
