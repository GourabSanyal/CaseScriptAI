import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { ProcessingQueueStatus } from '@/types/processing-queue';

export type SessionCardStatus = ProcessingQueueStatus | 'done';

export type SessionCardProps = {
  title: string;
  durationLabel: string;
  status: SessionCardStatus;
  onPress?: () => void;
  onMenuPress?: () => void;
};

const statusCopy = (status: SessionCardStatus): string => {
  if (status === 'processing') return 'Processing';
  if (status === 'queued') return 'Queued';
  if (status === 'failed') return 'Needs attention';
  return 'Done';
};

export function SessionCard({
  title,
  durationLabel,
  status,
  onPress,
  onMenuPress,
}: SessionCardProps) {
  const theme = useTheme();
  const pill =
    status === 'processing'
      ? { bg: theme.statusProcessingBg, fg: theme.statusProcessingFg, icon: 'sync' as const }
      : status === 'queued'
        ? { bg: theme.statusQueuedBg, fg: theme.statusQueuedFg, icon: null }
        : status === 'failed'
          ? { bg: theme.statusFailedBg, fg: theme.statusFailedFg, icon: null }
          : { bg: theme.statusDoneBg, fg: theme.statusDoneFg, icon: null };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.outlineVariant,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <ThemedText type="bodyMd" style={styles.title}>
          {title}
        </ThemedText>
        <Pressable
          accessibilityLabel="Session actions"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onMenuPress}
          style={styles.menuHit}
        >
          <MaterialIcons name="more-vert" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.duration}>
          <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
          <ThemedText type="labelSm" themeColor="textSecondary">
            {durationLabel}
          </ThemedText>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          {pill.icon ? (
            <MaterialIcons name={pill.icon} size={12} color={pill.fg} />
          ) : null}
          <ThemedText type="labelSm" style={{ color: pill.fg }}>
            {statusCopy(status)}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontWeight: '500',
  },
  menuHit: {
    padding: Spacing.half,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
});
