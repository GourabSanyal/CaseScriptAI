import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openDemoPdf } from '@/services/demo-api/open-demo-pdf';
import { demoStepLabel, useDemoNoteStore } from '@/stores/demo-note-store';

export default function DemoNoteScreen() {
  const theme = useTheme();
  const phase = useDemoNoteStore((s) => s.phase);
  const session = useDemoNoteStore((s) => s.session);
  const error = useDemoNoteStore((s) => s.error);
  const generate = useDemoNoteStore((s) => s.generate);
  const reset = useDemoNoteStore((s) => s.reset);
  const [shareError, setShareError] = useState<string | null>(null);

  const busy = phase === 'waking' || phase === 'starting' || phase === 'running';

  const onGenerate = () => {
    setShareError(null);
    void generate();
  };

  const onShare = async () => {
    if (!session?.pdfUrl || !session.id) return;
    setShareError(null);
    const result = await openDemoPdf(session.pdfUrl, session.id);
    if (!result.success) setShareError(result.error);
  };

  const statusText = (() => {
    if (phase === 'waking') return 'Waking server (~1 min)…';
    if (phase === 'starting') return 'Starting…';
    if (phase === 'running' && session) return demoStepLabel(session.status);
    if (phase === 'ready') return 'Ready.';
    if (phase === 'failed') return error ?? 'Failed';
    return 'Generate a note from the synthetic sample session.';
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.body}>
        <ThemedText type="title">Demo note</ThemedText>
        <ThemedText type="labelSm" themeColor="textSecondary" style={styles.sub}>
          Synthetic fixture only — not real PHI. Uses the same Render pipeline as the web demo.
        </ThemedText>

        <View style={[styles.status, { backgroundColor: theme.backgroundElement }]}>
          {busy ? <ActivityIndicator color={theme.primary} /> : null}
          <ThemedText type="default" testID="demo-note-status">
            {statusText}
          </ThemedText>
        </View>

        {shareError ? (
          <ThemedText type="labelSm" style={{ color: theme.statusFailedFg }}>
            {shareError}
          </ThemedText>
        ) : null}

        <GradientButton
          onPress={onGenerate}
          disabled={busy}
          testID="demo-note-generate"
        >
          <ThemedText type="default" style={{ color: theme.onPrimary }}>
            {phase === 'failed' ? 'Retry demo note' : 'Generate demo note'}
          </ThemedText>
        </GradientButton>

        {phase === 'ready' && session?.pdfUrl ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void onShare()}
            style={styles.share}
            testID="demo-note-share"
          >
            <ThemedText type="linkPrimary">Open / share PDF</ThemedText>
          </Pressable>
        ) : null}

        {phase !== 'idle' && !busy ? (
          <Pressable accessibilityRole="button" onPress={reset} testID="demo-note-reset">
            <ThemedText type="labelSm" themeColor="textSecondary">
              Reset
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sub: { marginTop: -Spacing.one },
  status: {
    minHeight: 64,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    justifyContent: 'center',
  },
  share: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
});
