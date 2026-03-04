import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from "react-native";
import { useAudio } from "@/hooks/audio/use-audio";

export const PoCTestScreen = (): React.JSX.Element => {
  const handlePress = (type: string) => {
    console.log(`${type} pressed`);
    // Placeholder for actual implementatio
  };

  const { handleAudioImport } = useAudio();

  const TestButton = ({
    title,
    action,
    disabled,
    type,
  }: {
    title: string;
    action?: () => void | Promise<void>;
    disabled?: boolean;
    type?: string;
  }) => (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={() => {
        if (type) handlePress(type);
        action?.();
      }}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Pipeline PoC Test</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio Input</Text>
        <TestButton
          type="[Record Audio]"
          disabled={true}
          title="[Record Audio]"
        />
        <TestButton
          title="[Load Local Audio]"
          action={handleAudioImport}
          type="[Load Local Audio]"
        />
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
        <TestButton
          title="[Convert to WAV]"
          action={() => handlePress("Convert to WAV")}
          type="[Convert to WAV]"
        />
        <TestButton
          title="[Run Whisper]"
          action={() => handlePress("Run Whisper")}
          type="[Run Whisper]"
        />
        <TestButton
          title="[Run LLM]"
          action={() => handlePress("Run LLM")}
          type="[Run LLM]"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outputs & Security</Text>
        <TestButton
          title="[Generate PDF]"
          action={() => handlePress("Generate PDF")}
          type="[Generate PDF]"
        />
        <TestButton
          title="[View Encrypted File]"
          action={() => handlePress("View Encrypted File")}
          type="[View Encrypted File]"
        />
      </View>
    </ScrollView>
  );
};

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
  buttonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  buttonTextDisabled: {
    color: "#A0A0A0",
  },
});

export default PoCTestScreen;
