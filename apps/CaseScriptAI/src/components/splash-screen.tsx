import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FontFamily, Layout, Radius, Spacing } from '@/constants/theme';
import { useSplashSequence } from '@/hooks/use-splash-sequence';
import { useTheme } from '@/hooks/use-theme';

type SplashScreenOverlayProps = {
  readyToDismiss: boolean;
  onFinish: () => void;
};

export function SplashScreenOverlay({ readyToDismiss, onFinish }: SplashScreenOverlayProps) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= Layout.tabletBreakpoint;
  const logoSize = isTablet ? 160 : 128;
  const titleSize = isTablet ? 24 : 22;
  const titleLineHeight = isTablet ? 32 : 30;
  const blobScale = Math.min(width, height);
  const { logoStyle, titleStyle, taglineStyle, loaderStyle, overlayStyle } = useSplashSequence(
    readyToDismiss,
    onFinish,
  );

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: theme.background }, overlayStyle]}
      accessibilityRole="none"
      importantForAccessibility="no-hide-descendants"
    >
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobTop,
          {
            width: blobScale * 0.4,
            height: blobScale * 0.4,
            backgroundColor: theme.primaryFixedDim,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          styles.blobBottom,
          {
            width: blobScale * 0.5,
            height: blobScale * 0.5,
            backgroundColor: theme.secondaryFixedDim,
          },
        ]}
      />

      <View
        style={[
          styles.content,
          {
            maxWidth: Math.min(width - Spacing.five, 384),
            paddingHorizontal: Math.max(Spacing.three, width * 0.05),
          },
        ]}
      >
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('@/assets/images/leaf-logo.png')}
            style={{ width: logoSize, height: logoSize }}
            contentFit="contain"
            accessibilityLabel="CaseScriptAI logo"
          />
        </Animated.View>

        <View style={styles.textBlock}>
          <Animated.Text
            style={[
              styles.title,
              {
                fontSize: titleSize,
                lineHeight: titleLineHeight,
                color: theme.text,
              },
              titleStyle,
            ]}
          >
            CaseScriptAI
          </Animated.Text>
          <Animated.Text
            style={[
              styles.tagline,
              {
                maxWidth: Math.min(280, width - Spacing.six),
                color: theme.textSecondary,
              },
              taglineStyle,
            ]}
          >
            Your session. Documented with care.
          </Animated.Text>
        </View>

        <Animated.View style={[styles.loaderBlock, loaderStyle]}>
          <ActivityIndicator color={theme.primary} />
          <Animated.Text style={[styles.loaderLabel, { color: theme.textSecondary }]}>
            {readyToDismiss ? 'Almost ready…' : 'Preparing your workspace…'}
          </Animated.Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  blob: { position: 'absolute', borderRadius: Radius.full, opacity: 0.1 },
  blobTop: { top: '-10%', left: '-5%' },
  blobBottom: { bottom: '-10%', right: '-5%' },
  content: { alignItems: 'center', width: '100%' },
  logoWrap: { marginBottom: Spacing.four },
  textBlock: { alignItems: 'center', gap: Spacing.two },
  title: {
    fontFamily: FontFamily.sans,
    fontWeight: '700',
    letterSpacing: -0.22,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FontFamily.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
  },
  loaderBlock: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  loaderLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
