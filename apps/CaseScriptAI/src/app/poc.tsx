import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from "react-native";

export default function PoCTestScreen() {
  const handlePress = (action: string) => {
    console.log(`${action} pressed`);
    // Placeholder for actual implementatio
  };

  const TestButton = ({ title, action, disabled }: { title: string; action: string, disabled?: boolean }) => (
    <TouchableOpacity
      style={styles.button}
      onPress={() => handlePress(action)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Pipeline PoC Test</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio Input</Text>
        <TestButton disabled={true} title="[Record Audio]" action="Record Audio" />
        <TestButton title="[Load Local Audio]" action="Load Local Audio" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playback</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.flexButton]}
            onPress={() => handlePress("Play")}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>[▶️ Play]</Text>
          </TouchableOpacity>
          <View style={styles.spacer} />
          <TouchableOpacity
            style={[styles.button, styles.flexButton, styles.pauseButton]}
            onPress={() => handlePress("Pause")}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>[⏸️ Pause]</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Pipeline</Text>
        <TestButton title="[Convert to WAV]" action="Convert to WAV" />
        <TestButton title="[Run Whisper]" action="Run Whisper" />
        <TestButton title="[Run LLM]" action="Run LLM" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outputs & Security</Text>
        <TestButton title="[Generate PDF]" action="Generate PDF" />
        <TestButton
          title="[View Encrypted File]"
          action="View Encrypted File"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
    textAlign: "center",
  },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  flexButton: {
    flex: 1,
    marginBottom: 0,
  },
  spacer: {
    width: 12,
  },
  pauseButton: {
    backgroundColor: "#FF3B30",
  },
});
