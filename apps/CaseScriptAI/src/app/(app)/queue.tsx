import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { SessionCard } from '@/components/sessions/session-card';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProcessingQueueStore } from '@/stores/recording-runtime';

import type { ProcessingQueueItem } from '@/types/processing-queue';

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
  const items = useProcessingQueueStore((state) => state.items);
  const estimatedMinutes = useProcessingQueueStore(
    (state) => state.pendingBadge().estimatedMinutes,
  );

  const durationFor = (item: ProcessingQueueItem): string => {
    if (item.status === 'processing' || item.status === 'queued') {
      return estimatedMinutes > 0 ? `~${estimatedMinutes} min` : 'Pending';
    }
    return '—';
  };

  const onOpenItem = (item: ProcessingQueueItem) => {
    if (item.status === 'processing' || item.status === 'queued' || item.status === 'failed') {
      router.push('/processing');
    }
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

        <FlatList
          data={items}
          keyExtractor={(item) => item.sessionId}
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
          renderItem={({ item }) => (
            <SessionCard
              title={formatSessionWhen(item.enqueuedAt)}
              durationLabel={durationFor(item)}
              status={item.status}
              onPress={() => onOpenItem(item)}
            />
          )}
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
