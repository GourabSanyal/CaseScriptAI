import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EncryptionStatusBar } from '@/components/home/encryption-status-bar';
import { HomePrimaryActions } from '@/components/home/home-primary-actions';
import { SessionTimer } from '@/components/home/session-timer';
import { WaveformCard } from '@/components/home/waveform-card';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { RecordingState } from '@/types/recording';

export type HomeRecordViewProps = {
  machine: RecordingState;
  error: string | null;
  elapsedMs: number;
  pendingCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRecover: (action: 'resume' | 'discard') => void;
};

const waveformCopy = (machine: RecordingState): string => {
  if (machine.status === 'recording') return 'Listening for clinical dialogue…';
  if (machine.status === 'paused') return 'Recording paused';
  if (machine.status === 'orphaned') return 'Unfinished session on disk';
  if (machine.status === 'stopping') return 'Saving session…';
  if (machine.status === 'queued') return 'Session queued for processing';
  if (machine.status === 'failed') return 'Ready when you are';
  return 'Tap START to begin a private session';
};

export function HomeRecordView({
  machine,
  error,
  elapsedMs,
  pendingCount,
  onStart,
  onPause,
  onResume,
  onStop,
  onRecover,
}: HomeRecordViewProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= Layout.tabletBreakpoint;
  const horizontalPad = isTablet ? Spacing.marginTablet : Spacing.marginMobile;
  const live = machine.status === 'recording';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />

      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <SessionTimer elapsedMs={elapsedMs} />

        <WaveformCard active={live} subtitle={waveformCopy(machine)} />

        <EncryptionStatusBar live={live} pendingCount={pendingCount} />

        <View style={styles.actions}>
          <HomePrimaryActions
            machine={machine}
            error={error}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onRecover={onRecover}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.section,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    alignItems: 'center',
  },
});
