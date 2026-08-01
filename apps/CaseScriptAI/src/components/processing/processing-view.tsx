import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { PipelinePhase } from '@/types/pipeline';

export type ProcessingViewProps = {
  phase: PipelinePhase;
  progress: number;
  sessionId: string | null;
  error: string | null;
  pendingCount: number;
  estimatedMinutes: number;
  onStartDrain: () => void;
  onCancelCurrent: () => void;
};

const phaseLabel = (phase: PipelinePhase): string => {
  if (phase === 'whisper') return 'Transcribing audio…';
  if (phase === 'llm') return 'Generating SOAP note…';
  if (phase === 'complete') return 'Session complete';
  if (phase === 'failed') return 'Needs attention';
  return 'Waiting for sessions';
};

export function ProcessingView({
  phase,
  progress,
  sessionId,
  error,
  pendingCount,
  estimatedMinutes,
  onStartDrain,
  onCancelCurrent,
}: ProcessingViewProps) {
  const theme = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const active = phase === 'whisper' || phase === 'llm';

  return (
    <View style={styles.body}>
      <ThemedText type="headlineLgMobile">Processing</ThemedText>
      <ThemedText type="bodyMd" themeColor="textSecondary">
        {pendingCount > 0
          ? `${pendingCount} pending${estimatedMinutes > 0 ? ` (~${estimatedMinutes} min)` : ''}`
          : 'Queue is empty'}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="bodyMd">{phaseLabel(phase)}</ThemedText>
        {sessionId ? (
          <ThemedText type="labelSm" themeColor="textSecondary">
            Session in progress
          </ThemedText>
        ) : null}
        <View style={[styles.track, { backgroundColor: theme.outlineVariant }]}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>
        <ThemedText type="labelSm" themeColor="textSecondary">
          {pct}%
        </ThemedText>
        {error ? (
          <ThemedText type="bodyMd" themeColor="textSecondary">
            {error}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {!active ? (
          <Pressable
            accessibilityRole="button"
            onPress={onStartDrain}
            style={[styles.btn, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="bodyMd" style={{ color: theme.onPrimary }}>
              Process queue
            </ThemedText>
          </Pressable>
        ) : null}
        {sessionId && active ? (
          <Pressable
            accessibilityRole="button"
            onPress={onCancelCurrent}
            style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}
          >
            <ThemedText type="bodyMd">Cancel current</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.md,
    gap: Spacing.two,
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  actions: {
    gap: Spacing.two,
  },
  btn: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
});
