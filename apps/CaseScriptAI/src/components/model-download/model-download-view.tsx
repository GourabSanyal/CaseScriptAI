import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressRing } from '@/components/model-download/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Layout, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// const TIP = '"Start with open-ended questions to build rapport."';

export function ModelDownloadView() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= Layout.tabletBreakpoint;
  const horizontalPad = isTablet ? Spacing.marginTablet : Spacing.marginMobile;
  const ringSize = isTablet ? 280 : Math.min(256, width * 0.64);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: horizontalPad,
            backgroundColor: theme.surface,
            borderBottomColor: theme.outlineVariant,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            hitSlop={8}
            testID="model-download-menu"
            style={styles.iconHit}
          >
            <MaterialIcons name="menu" size={24} color={theme.primary} />
          </Pressable>
          <ThemedText type="headlineLgMobile" themeColor="primary">
            CaseScriptAI
          </ThemedText>
        </View>
        <MaterialIcons name="cloud-download" size={24} color={theme.textSecondary} />
      </View>

      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <ThemedText
          type="headlineMd"
          themeColor="textSecondary"
          style={[styles.tip, { maxWidth: isTablet ? 420 : width - horizontalPad * 2 }]}
        >
          {/* {TIP} */}
        </ThemedText>

        <View style={styles.center}>
          <ProgressRing size={ringSize} percent={0} />
          <ThemedText
            type="bodyMd"
            themeColor="textSecondary"
            style={[styles.bodyCopy, { maxWidth: isTablet ? 360 : 300 }]}
          >
            We're preparing your private, encrypted clinical processing engine. This stays 100% on
            your device.
          </ThemedText>
        </View>

        <Pressable
          accessibilityLabel="Start Download"
          accessibilityRole="button"
          testID="model-download-start"
          style={({ pressed }) => [
            styles.button,
            {
              maxWidth: Math.min(width - horizontalPad * 2, 384),
              backgroundColor: theme.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialIcons name="file-download" size={22} color={theme.onPrimary} />
          <ThemedText type="headlineMd" themeColor="onPrimary">
            Start Download
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconHit: {
    padding: Spacing.one,
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
