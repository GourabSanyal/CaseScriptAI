import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToastStore } from '@/stores/toast-store';

import type { ToastVariant } from '@/types/toast';

/** Matches `(app)/_layout` tab content height — keep toast above tabs. */
const TAB_BAR_CONTENT_HEIGHT = 56;
/** Lift above Home START / Import so the toast sits in the open mid band. */
const PRIMARY_ACTIONS_CLEARANCE = 112;

const variantIcon = (variant: ToastVariant): keyof typeof MaterialIcons.glyphMap => {
  if (variant === 'warning') return 'phone-in-talk';
  if (variant === 'error') return 'error-outline';
  if (variant === 'success') return 'check-circle-outline';
  return 'info-outline';
};

type ToastHostProps = {
  /** Extra lift above the safe-area bottom (e.g. tab bar). Default assumes app tabs. */
  bottomOffset?: number;
};

export function ToastHost({ bottomOffset }: ToastHostProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);

  if (!toast) return null;

  const tabLift = bottomOffset ?? TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, Spacing.two);
  const icon = variantIcon(toast.variant);
  const accent =
    toast.variant === 'success' || toast.variant === 'warning'
      ? theme.primary
      : theme.onSecondaryContainer;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          bottom: tabLift + PRIMARY_ACTIONS_CLEARANCE,
          paddingHorizontal: Spacing.marginMobile,
        },
      ]}
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: theme.surfaceContainerHigh,
            borderColor: theme.outlineVariant,
          },
        ]}
        testID="app-toast"
      >
        <MaterialIcons name={icon} size={20} color={accent} />
        <View style={styles.copy}>
          {toast.title ? (
            <ThemedText type="labelSm" style={{ color: theme.text }}>
              {toast.title}
            </ThemedText>
          ) : null}
          <ThemedText type="labelSm" style={{ color: theme.textSecondary }}>
            {toast.message}
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="Dismiss notification"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => dismiss(toast.id)}
          testID="app-toast-dismiss"
        >
          <MaterialIcons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
