import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeIn } from '@/components/motion/fade-in';
import { ThemedText } from '@/components/themed-text';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthScreenShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreenShell({ title, subtitle, children, footer }: AuthScreenShellProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const pad =
    width >= Layout.tabletBreakpoint ? Spacing.marginTablet : Spacing.marginMobile;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: pad }]}
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn>
          <View style={styles.header}>
            <ThemedText type="labelSm" themeColor="primary">
              CaseScriptAI
            </ThemedText>
            <ThemedText type="headlineLgMobile">{title}</ThemedText>
            <ThemedText type="bodyMd" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          </View>
        </FadeIn>
        <FadeIn delayMs={80}>
          <View style={styles.body}>{children}</View>
        </FadeIn>
        {footer ? (
          <FadeIn delayMs={140}>
            <View style={styles.footer}>{footer}</View>
          </FadeIn>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
    maxWidth: Layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  body: { gap: Spacing.three, width: '100%' },
  footer: { marginTop: 'auto', gap: Spacing.two, paddingTop: Spacing.four },
});
