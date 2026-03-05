import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TestButton } from "@/components/common/test-button";

import type { AudioInputSectionProps } from "@/types/poc";

export const AudioInputSection = ({
  handleAudioImport,
  clearAudios,
}: AudioInputSectionProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Audio Input</Text>
      <View style={styles.row}>
        <TestButton
          title="🎙️ Record"
          disabled={true}
          style={styles.flexButton}
        />
        <View style={styles.spacer} />
        <TestButton
          title="📁 Load"
          onPress={handleAudioImport}
          style={styles.flexButton}
        />
      </View>
      <TestButton
        title="🗑️ Clear All Tracks"
        onPress={clearAudios}
        style={{ marginTop: 12, backgroundColor: "#FF9500" }}
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  flexButton: {
    flex: 1,
    marginBottom: 0,
  },
  spacer: {
    width: 12,
  },
});
