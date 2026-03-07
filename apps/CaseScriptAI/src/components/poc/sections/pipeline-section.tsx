import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TestButton } from "@/components/common/test-button";

import type { PipelineSectionProps } from "@/types/poc";
import { convertAudioToWav } from "@/services/audio/converter";

export const PipelineSection = ({
  audios,
  handlePress,
}: PipelineSectionProps) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Pipeline</Text>
      <TestButton
        title="⚙️ Convert to WAV"
        onPress={() => convertAudioToWav(audios)}
        disabled={audios.length === 0}
      />
      <TestButton
        title="🧠 Run Whisper"
        onPress={() => handlePress("Run Whisper")}
        disabled={true}
      />
      <TestButton
        title="📝 Run LLM"
        onPress={() => handlePress("Run LLM")}
        disabled={true}
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
