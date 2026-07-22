import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModelDownloadHeader } from '@/components/model-download/model-download-header';
import { ProgressRing } from '@/components/model-download/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ModelDownloadViewProps = {
  percent: number;
  phaseLabel: string;
  tierLabel?: string;
  error?: string | null;
  busy?: boolean;
  complete?: boolean;
  onPrimaryPress: () => void;
};

export function ModelDownloadView({
  percent,
  phaseLabel,
  tierLabel,
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
    gap: Spacing.six,
  },
  bodyCopy: {
    textAlign: 'center',
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
