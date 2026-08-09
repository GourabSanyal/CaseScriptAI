import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ProcessingView } from '@/components/processing/processing-view';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  arePipelineRuntimesReady,
  usePipelineStore,
} from '@/stores/pipeline-runtime';
import { useProcessingQueueStore } from '@/stores/recording-runtime';

export default function ProcessingScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;

  const phase = usePipelineStore((s) => s.phase);
  const progress = usePipelineStore((s) => s.progress);
  const sessionId = usePipelineStore((s) => s.sessionId);
  const error = usePipelineStore((s) => s.error);
  const startDrain = usePipelineStore((s) => s.startDrain);
  const pendingCount = useProcessingQueueStore(
    (s) =>
      s.items.filter((item) => item.status === 'queued' || item.status === 'processing').length,
  );
  const failedCount = useProcessingQueueStore(
    (s) => s.items.filter((item) => item.status === 'failed').length,
  );
  const estimatedMinutes = useProcessingQueueStore((s) => s.pendingBadge().estimatedMinutes);
  const cancel = useProcessingQueueStore((s) => s.cancel);
  const requeue = useProcessingQueueStore((s) => s.requeue);
  const items = useProcessingQueueStore((s) => s.items);

  const onCancelCurrent = () => {
    if (!sessionId) return;
    Alert.alert(
      'Cancel processing?',
      'This removes the session from the queue and deletes the recording.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel session',
          style: 'destructive',
          onPress: () => {
            void cancel(sessionId);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />
      <View style={{ flex: 1, paddingHorizontal: horizontalPad }}>
        <ProcessingView
          phase={phase}
          progress={progress}
          sessionId={sessionId}
          error={
            error ??
            (failedCount > 0 && pendingCount === 0
              ? `${failedCount} failed session(s) — tap Process queue to retry`
              : arePipelineRuntimesReady()
                ? null
                : 'On-device models bind on native builds — queue is ready to drain when runtimes attach.')
          }
          pendingCount={pendingCount}
          estimatedMinutes={estimatedMinutes}
          onStartDrain={() => {
            // Failed encrypt leaves items as `failed` — requeue so drain can claim them.
            for (const item of items) {
              if (item.status === 'failed') requeue(item.sessionId);
            }
            void startDrain();
          }}
          onCancelCurrent={onCancelCurrent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
