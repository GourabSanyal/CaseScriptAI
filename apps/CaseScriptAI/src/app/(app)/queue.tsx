import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { SessionCard, type SessionCardStatus } from '@/components/sessions/session-card';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { documentExporter } from '@/services/pdf/document-exporter';
import { loadEncryptedSoap } from '@/services/storage/encrypted-soap';
import { usePipelineStore } from '@/stores/pipeline-runtime';
import { useProcessingQueueStore } from '@/stores/recording-runtime';
import { useSessionStore } from '@/stores/session-runtime';

import type { ProcessingQueueItem } from '@/types/processing-queue';
import type { Session } from '@/types/session';

type ListRow =
  | { kind: 'queue'; item: ProcessingQueueItem }
  | { kind: 'session'; item: Session };

const formatSessionWhen = (ms: number): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
};

export default function QueueScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;
  const queueItems = useProcessingQueueStore((state) => state.items);
  const estimatedMinutes = useProcessingQueueStore(
    (state) => state.pendingBadge().estimatedMinutes,
  );
  const sessions = useSessionStore((state) => state.items);
  const hydrate = useSessionStore((state) => state.hydrate);
  const search = useSessionStore((state) => state.search);
  const pipelineSessionId = usePipelineStore((state) => state.sessionId);
  const pipelineProgress = usePipelineStore((state) => state.progress);
  const startDrain = usePipelineStore((state) => state.startDrain);
  const cancel = useProcessingQueueStore((state) => state.cancel);
  const requeue = useProcessingQueueStore((state) => state.requeue);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void search(query.trim() ? { patientQuery: query } : undefined);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, search]);

  const rows: ListRow[] = useMemo(() => {
    const queueRows: ListRow[] = queueItems.map((item) => ({ kind: 'queue', item }));
    const completeRows: ListRow[] = sessions
      .filter((s) => s.status === 'complete')
      .filter((s) => !queueItems.some((q) => q.sessionId === s.id))
      .map((item) => ({ kind: 'session', item }));
    return [...queueRows, ...completeRows];
  }, [queueItems, sessions]);

  const durationForQueue = (item: ProcessingQueueItem): string => {
    if (item.status === 'processing' || item.status === 'queued') {
      return estimatedMinutes > 0 ? `~${estimatedMinutes} min` : 'Pending';
    }
    if (item.failureReason) return item.failureReason;
    return '—';
  };

  const onExport = async (session: Session) => {
    const soap = await loadEncryptedSoap(session);
    if (!soap.success) {
      Alert.alert('Export failed', soap.error);
      return;
    }
    const pdf = await documentExporter.exportPdf({
      soapNote: soap.data,
      fileName: `soap-${session.id}.pdf`,
    });
    if (!pdf.success) {
      Alert.alert('Export failed', pdf.error);
      return;
    }
    const shared = await documentExporter.sharePdf(pdf.data);
    if (!shared.success) {
      Alert.alert('PDF saved', pdf.data);
    }
  };

  const onStop = (sessionId: string) => {
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

  const onRetry = (sessionId: string) => {
    requeue(sessionId);
    void startDrain();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader horizontalPad={horizontalPad} />
      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <ThemedText type="headlineLgMobile">Sessions</ThemedText>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              Manage and review your clinical transcriptions.
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="New session"
            accessibilityRole="button"
            testID="sessions-new"
            onPress={() => router.push('/record')}
            style={({ pressed }) => [
              styles.newBtn,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <MaterialIcons name="add" size={18} color={theme.onPrimary} />
            <ThemedText type="labelSm" style={{ color: theme.onPrimary }}>
              New Session
            </ThemedText>
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="Search patients"
          placeholder="Search patient name or id"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.search,
            {
              color: theme.text,
              borderColor: theme.outlineVariant,
              backgroundColor: theme.backgroundElement,
            },
          ]}
        />

        <FlatList
          data={rows}
          keyExtractor={(row) =>
            row.kind === 'queue' ? `q-${row.item.sessionId}` : `s-${row.item.id}`
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.outlineVariant,
                },
              ]}
            >
              <ThemedText type="bodyMd">No sessions yet.</ThemedText>
              <ThemedText type="labelSm" themeColor="textSecondary">
                Record or import audio from Home to fill this list.
              </ThemedText>
            </View>
          }
          renderItem={({ item: row }) => {
            if (row.kind === 'queue') {
              const item = row.item;
              return (
                <SessionCard
                  title={formatSessionWhen(item.enqueuedAt)}
                  durationLabel={durationForQueue(item)}
                  status={item.status as SessionCardStatus}
                  progress={
                    item.status === 'processing' && pipelineSessionId === item.sessionId
                      ? pipelineProgress
                      : undefined
                  }
                  onStart={item.status === 'queued' ? () => void startDrain() : undefined}
                  onStop={item.status === 'processing' ? () => onStop(item.sessionId) : undefined}
                  onRetry={item.status === 'failed' ? () => onRetry(item.sessionId) : undefined}
                  onMenuPress={
                    item.status === 'queued' || item.status === 'failed'
                      ? () => onStop(item.sessionId)
                      : undefined
                  }
                />
              );
            }
            return (
              <SessionCard
                title={
                  row.item.patientName?.trim() ||
                  formatSessionWhen(row.item.completedAt ?? row.item.createdAt)
                }
                durationLabel={
                  row.item.durationMs != null
                    ? `${Math.round(row.item.durationMs / 1000)}s`
                    : 'Done'
                }
                status="done"
                onExport={() => void onExport(row.item)}
                onMenuPress={() => void onExport(row.item)}
              />
            );
          }}
        />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
    marginTop: Spacing.one,
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  empty: {
    marginTop: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
});
