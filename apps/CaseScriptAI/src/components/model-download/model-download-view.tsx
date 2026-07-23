import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModelDownloadHeader } from '@/components/model-download/model-download-header';
import { ProgressRing } from '@/components/model-download/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  MODEL_STATUS_COPY,
  type ModelStatusRow,
} from '@/services/ai/model-status-rows';

export type { ModelStatusRow };

export type ModelDownloadViewProps = {
  percent: number;
  phaseLabel: string;
  tierLabel?: string;
  modelStatuses?: ModelStatusRow[];
  error?: string | null;
  busy?: boolean;
  complete?: boolean;
  onPrimaryPress: () => void;
};

export function ModelDownloadView({
  percent,
  phaseLabel,
  tierLabel,
  modelStatuses = [],
  error,
  busy = false,
  complete = false,
  onPrimaryPress,
}: ModelDownloadViewProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= Layout.tabletBreakpoint;
  const horizontalPad = isTablet ? Spacing.marginTablet : Spacing.marginMobile;
  const ringSize = isTablet ? 280 : Math.min(256, width * 0.64);
  const primaryLabel = complete ? 'Continue' : error ? 'Retry' : busy ? 'Downloading…' : 'Start Download';

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
          {tierLabel ? `Selected model tier: ${tierLabel}` : phaseLabel}
        </ThemedText>

        <View style={styles.center}>
          <ProgressRing size={ringSize} percent={Math.round(percent * 100)} />
          <ThemedText
            type="bodyMd"
            themeColor="textSecondary"
            style={[styles.bodyCopy, { maxWidth: isTablet ? 360 : 300 }]}
          >
            {error
              ? error
              : "We're preparing your private, encrypted clinical processing engine. This stays 100% on your device."}
          </ThemedText>
          <ThemedText type="bodyMd" themeColor="textSecondary">
            {phaseLabel}
          </ThemedText>

          {modelStatuses.length > 0 ? (
            <View
              style={[styles.statusList, { borderColor: theme.outlineVariant, maxWidth: isTablet ? 420 : 340 }]}
              accessibilityRole="summary"
            >
              {modelStatuses.map((row) => (
                <View key={row.label} style={styles.statusRow}>
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
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel={primaryLabel}
          accessibilityRole="button"
          testID="model-download-start"
          disabled={busy}
          onPress={onPrimaryPress}
          style={({ pressed }) => [
            styles.button,
            {
              maxWidth: Math.min(width - horizontalPad * 2, 384),
              backgroundColor: theme.primary,
              opacity: busy ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialIcons
            name={error ? 'refresh' : complete ? 'check' : 'file-download'}
            size={22}
            color={theme.onPrimary}
          />
          <ThemedText type="headlineMd" themeColor="onPrimary">
            {primaryLabel}
          </ThemedText>
        </Pressable>
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
    gap: Spacing.four,
  },
  bodyCopy: {
    textAlign: 'center',
  },
  statusList: {
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
  button: {
    width: '100%',
    height: 56,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
