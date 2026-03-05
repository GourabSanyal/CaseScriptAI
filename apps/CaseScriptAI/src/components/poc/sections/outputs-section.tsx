import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TestButton } from "@/components/common/test-button";

import type { OutputsSectionProps } from "@/types/poc";

export const OutputsSection = ({ handlePress }: OutputsSectionProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Outputs & Security</Text>
      <TestButton
        title="📄 Generate PDF"
        onPress={() => handlePress("Generate PDF")}
      />
      <TestButton
        title="🔐 View Encrypted File"
        onPress={() => handlePress("View Encrypted File")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
