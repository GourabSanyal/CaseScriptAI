import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

type Props = {
  title: string;
  onPress?: () => void | Promise<void>;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const TestButton = ({
  title,
  onPress,
  disabled,
  style,
  textStyle,
}: Props) => {
  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text
        style={[
          styles.buttonText,
          textStyle,
          disabled && styles.buttonTextDisabled,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  buttonTextDisabled: {
    color: "#A0A0A0",
  },
});
