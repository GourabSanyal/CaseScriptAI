import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  testID: string;
};

export function AuthTextField({ label, testID, style, ...rest }: AuthTextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <ThemedText type="labelSm" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        autoCapitalize={rest.autoCapitalize ?? 'none'}
        placeholderTextColor={theme.outline}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.outlineVariant,
          },
          style,
        ]}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one, width: '100%' },
  input: {
    width: '100%',
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontFamily: FontFamily.sans,
    fontSize: 16,
  },
});
