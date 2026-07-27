import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

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
        <Pressable
          accessibilityLabel="Resume unfinished session"
          accessibilityRole="button"
          testID="home-recover-resume"
          onPress={() => onRecover('resume')}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText type="headlineMd" themeColor="onPrimary">
            Resume session
          </ThemedText>
        </Pressable>
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
        <Pressable
          accessibilityLabel="Start recording"
          accessibilityRole="button"
          testID="home-start"
          onPress={onStart}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <MaterialIcons name="mic" size={22} color={theme.onPrimary} />
          <ThemedText type="headlineMd" themeColor="onPrimary">
            START
          </ThemedText>
        </Pressable>
      ) : null}

      {isRecording || isPaused ? (
        <>
          <Pressable
            accessibilityLabel="Stop recording"
            accessibilityRole="button"
            testID="home-stop"
            onPress={onStop}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <MaterialIcons name="stop" size={22} color={theme.onPrimary} />
            <ThemedText type="headlineMd" themeColor="onPrimary">
              STOP
            </ThemedText>
          </Pressable>
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
  primary: {
    width: '100%',
    height: 56,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
