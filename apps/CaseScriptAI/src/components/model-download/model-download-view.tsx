import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/gradient-button';
import { ModelDownloadHeader } from '@/components/model-download/model-download-header';
import { ProgressRing } from '@/components/model-download/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  MODEL_STATUS_COPY,
  type ModelGroupId,
  type ModelStatusRow,
} from '@/services/ai/model-status-rows';

export type { ModelStatusRow };

// ponytail: static tip; carousel when tips are productized
const TIP = '"Start with open-ended questions to build rapport."';

export type ModelDownloadViewProps = {
  percent: number;
  phaseLabel: string;
  modelStatuses?: ModelStatusRow[];
  error?: string | null;
  busy?: boolean;
  checking?: boolean;
  complete?: boolean;
  onPrimaryPress: () => void;
  onDeleteModel?: (id: ModelGroupId) => void;
};

export function ModelDownloadView({
  percent,
  phaseLabel,
  modelStatuses = [],
  error,
  busy = false,
  checking = false,
  complete = false,
  onPrimaryPress,
  onDeleteModel,
}: ModelDownloadViewProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= Layout.tabletBreakpoint;
  const horizontalPad = isTablet ? Spacing.marginTablet : Spacing.marginMobile;
  const ringSize = isTablet ? 280 : Math.min(256, width * 0.64);
  const primaryLabel = checking
    ? 'Checking'
    : complete
      ? 'Continue'
      : error
        ? 'Retry'
        : busy
          ? 'Downloading…'
          : 'Start Download';
  const ringCaption = checking
    ? 'Checking models'
    : complete
      ? 'Ready'
      : busy
        ? phaseLabel
        : error
          ? 'Needs attention'
          : 'Ready to download';
  const disabled = busy || checking;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <ModelDownloadHeader horizontalPad={horizontalPad} />

      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <ThemedText
          type="headlineMd"
          themeColor="textSecondary"
          style={[styles.tip, { maxWidth: isTablet ? 420 : width - horizontalPad * 2 }]}
        >
          {TIP}
        </ThemedText>

        <View style={styles.center}>
          <ProgressRing
            size={ringSize}
            percent={Math.round(percent * 100)}
            caption={ringCaption}
          />
          <ThemedText
            type="bodyMd"
            themeColor="textSecondary"
            style={[styles.bodyCopy, { maxWidth: isTablet ? 360 : 300 }]}
          >
            {error
              ? error
              : "We're preparing your private, encrypted clinical processing engine. This stays 100% on your device."}
          </ThemedText>

          {modelStatuses.length > 0 ? (
            <View
              style={[
                styles.statusList,
                { borderColor: theme.outlineVariant, maxWidth: isTablet ? 420 : 340 },
              ]}
              accessibilityRole="summary"
            >
              {modelStatuses.map((row) => (
                <View key={row.id} style={styles.statusRow}>
                  <MaterialIcons
                    name={
                      row.state === 'ready'
                        ? 'check-circle'
                        : row.state === 'corrupt'
                          ? 'error'
                          : row.state === 'missing'
                            ? 'cloud-download'
                            : 'hourglass-empty'
                    }
                    size={20}
                    color={row.state === 'ready' ? theme.primary : theme.textSecondary}
                  />
                  <View style={styles.statusText}>
                    <ThemedText type="bodyMd">{row.label}</ThemedText>
                    <ThemedText type="labelSm" themeColor="textSecondary">
                      {MODEL_STATUS_COPY[row.state]}
                      {row.detail ? ` · ${row.detail}` : ''}
                    </ThemedText>
                  </View>
                  {row.canDelete && onDeleteModel ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${row.label}`}
                      testID={`model-delete-${row.id}`}
                      disabled={busy}
                      hitSlop={8}
                      onPress={() => onDeleteModel(row.id)}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        { opacity: busy ? 0.4 : pressed ? 0.6 : 1 },
                      ]}
                    >
                      <MaterialIcons name="delete-outline" size={22} color={theme.textSecondary} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <GradientButton
          accessibilityLabel={primaryLabel}
          accessibilityRole="button"
          testID="model-download-start"
          disabled={disabled}
          onPress={onPrimaryPress}
          style={{ maxWidth: Math.min(width - horizontalPad * 2, 384) }}
        >
          <MaterialIcons
            name={
              checking
                ? 'hourglass-empty'
                : error
                  ? 'refresh'
                  : complete
                    ? 'check'
                    : 'file-download'
            }
            size={22}
            color={theme.onPrimary}
          />
          <ThemedText type="headlineMd" themeColor="onPrimary">
            {primaryLabel}
          </ThemedText>
        </GradientButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.section,
    paddingBottom: Spacing.five,
  },
  tip: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.four,
  },
  bodyCopy: {
    textAlign: 'center',
  },
  statusList: {
    alignSelf: 'stretch',
    width: '100%',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusText: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    padding: Spacing.one,
  },
});
