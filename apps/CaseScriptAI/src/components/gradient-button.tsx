import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type GradientButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

export function GradientButton({
  children,
  style,
  height = 56,
  disabled,
  ...rest
}: GradientButtonProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <Pressable
      disabled={disabled}
      style={[styles.pressable, style]}
      {...rest}
    >
      {({ pressed }) => {
        const active = pressed && !disabled;
        return (
          <View
            style={[
              styles.face,
              {
                height,
                backgroundColor: theme.primary,
                borderBottomColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.18)',
                borderBottomWidth: active ? 1 : 4,
                opacity: disabled ? 0.55 : 1,
                transform: [{ translateY: active ? 2 : 0 }],
                // light mode: dark shadow reads on cream; dark mode: tinted glow
                shadowColor: isDark ? theme.primary : '#1c1c19',
                shadowOpacity: active ? (isDark ? 0.12 : 0.08) : isDark ? 0.4 : 0.22,
                shadowRadius: isDark ? 10 : 14,
                shadowOffset: { width: 0, height: isDark ? 6 : 8 },
                elevation: isDark ? 5 : 8,
              },
            ]}
          >
            <View style={styles.content}>{children}</View>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    alignSelf: 'center',
  },
  face: {
    width: '100%',
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
});
