import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from "react-native";

type Props = {
  title: string;
  onPress?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const TestButton = ({
  title,
  onPress,
  disabled,
  loading = false,
  style,
  textStyle,
}: Props) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.button, style, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isDisabled}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={[styles.buttonText, styles.loadingText, textStyle]}>{title}</Text>
        </View>
      ) : (
        <Text
          style={[
            styles.buttonText,
            textStyle,
            isDisabled && styles.buttonTextDisabled,
          ]}
        >
          {title}
        </Text>
      )}
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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#fff",
  },
});
