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
  progress?: number;
  onStart?: () => void;
  onStop?: () => void;
  onRetry?: () => void;
  onExport?: () => void;
  onMenuPress?: () => void;
};

const statusCopy = (status: SessionCardStatus): string => {
  if (status === 'processing') return 'Processing';
  if (status === 'queued') return 'Queued';
  if (status === 'failed') return 'Needs attention';
  return 'Done';
};

function IconHit({
  name,
  label,
  color,
  onPress,
}: {
  name: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.iconHit}
    >
      <MaterialIcons name={name} size={22} color={color} />
    </Pressable>
  );
}

export function SessionCard({
  title,
  durationLabel,
  status,
  progress,
  onStart,
  onStop,
  onRetry,
  onExport,
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
  const pct = Math.round(Math.min(1, Math.max(0, progress ?? 0)) * 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.outlineVariant,
        },
      ]}
    >
      <View style={styles.topRow}>
        <ThemedText type="bodyMd" style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.actions}>
          {status === 'queued' && onStart ? (
            <IconHit name="play-arrow" label="Start processing" color={theme.primary} onPress={onStart} />
          ) : null}
          {status === 'processing' && onStop ? (
            <IconHit name="stop" label="Stop processing" color={theme.text} onPress={onStop} />
          ) : null}
          {status === 'failed' && onRetry ? (
            <IconHit name="replay" label="Retry processing" color={theme.primary} onPress={onRetry} />
          ) : null}
          {status === 'done' && onExport ? (
            <IconHit name="note-add" label="Export note" color={theme.primary} onPress={onExport} />
          ) : null}
          {onMenuPress ? (
            <IconHit name="more-vert" label="Session actions" color={theme.textSecondary} onPress={onMenuPress} />
          ) : null}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.duration}>
          <MaterialIcons name="schedule" size={16} color={theme.textSecondary} />
          <ThemedText type="labelSm" themeColor="textSecondary">
            {status === 'processing' && progress != null ? `${pct}%` : durationLabel}
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

      {status === 'processing' && progress != null ? (
        <View style={[styles.track, { backgroundColor: theme.outlineVariant }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.primary }]} />
        </View>
      ) : null}
    </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    flex: 1,
    paddingRight: Spacing.two,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  track: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
