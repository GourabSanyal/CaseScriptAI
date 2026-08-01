import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProcessingQueueStore } from '@/stores/recording-runtime';

export default function QueueScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;
  const pendingCount = useProcessingQueueStore((state) =>
    state.items.filter((item) => item.status === 'queued' || item.status === 'processing').length,
  );
  const failedCount = useProcessingQueueStore(
    (state) => state.items.filter((item) => item.status === 'failed').length,
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />
      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <ThemedText type="headlineLgMobile">Sessions</ThemedText>
        <ThemedText type="bodyMd" themeColor="textSecondary">
          Manage and review your clinical transcriptions.
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="bodyMd">
            {pendingCount > 0
              ? `${pendingCount} session${pendingCount === 1 ? '' : 's'} waiting to process.`
              : 'No sessions in the processing queue yet.'}
          </ThemedText>
          {failedCount > 0 ? (
            <ThemedText type="labelSm" themeColor="textSecondary">
              {failedCount} need{failedCount === 1 ? 's' : ''} attention — open Processing to re-run.
            </ThemedText>
          ) : (
            <ThemedText type="labelSm" themeColor="textSecondary">
              Full session list arrives with Slice 4.
            </ThemedText>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    marginTop: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.md,
    gap: Spacing.two,
  },
});
