import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { TestButton } from "@/components/common/test-button";

import type { PipelineSectionProps } from "@/types/poc";

export const PipelineSection = ({
  audios,
  handlePress,
}: PipelineSectionProps) => {
  const audioReady = audios.length > 0;
  const audioKey = useMemo(() => {
    if (audios.length === 0) return "none";
    const last = audios[audios.length - 1];
    return `${last.uri}-${last.addedAt}`;
  }, [audios]);

  const [isDownloadingWhisper, setIsDownloadingWhisper] = useState(false);
  const [whisperDownloaded, setWhisperDownloaded] = useState(false);
  const [whisperRan, setWhisperRan] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  useEffect(() => {
    setIsDownloadingWhisper(false);
    setWhisperDownloaded(false);
    setWhisperRan(false);
    setDownloadStatus(null);
  }, [audioKey]);

  const downloadWhisperModel = async (): Promise<void> => {
    if (!audioReady || isDownloadingWhisper || whisperDownloaded) return;

    const url =
      process.env.WHISPER_DOWNLOAD_LINK ??
      process.env.EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK;
    if (!url) {
      setDownloadStatus(
        "Missing env var: WHISPER_DOWNLOAD_LINK (or EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK)",
      );
      return;
    }

    setIsDownloadingWhisper(true);
    setDownloadStatus("Downloading...");
    try {
      const modelsDir = new Directory(Paths.document, "models");
      if (!modelsDir.exists) {
        await modelsDir.create({ intermediates: true, idempotent: true });
      }

      const whisperDir = new Directory(modelsDir, "whisper");
      if (!whisperDir.exists) {
        await whisperDir.create({ intermediates: true, idempotent: true });
      }

      const output = await File.downloadFileAsync(url, whisperDir);
      const info = Paths.info(output.uri);
      if (!info.exists || info.isDirectory) {
        throw new Error("Download finished but file missing");
      }

      setWhisperDownloaded(true);
      setDownloadStatus("Whisper downloaded successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      setDownloadStatus(message);
    } finally {
      setIsDownloadingWhisper(false);
    }
  };

  const runWhisper = async (): Promise<void> => {
    if (!audioReady || !whisperDownloaded || whisperRan) return;
    await Promise.resolve(handlePress("Run Whisper"));
    setWhisperRan(true);
  };

  const runLlm = async (): Promise<void> => {
    if (!audioReady || !whisperRan) return;
    await Promise.resolve(handlePress("Run LLM"));
  };

  const step1Enabled = audioReady && !isDownloadingWhisper && !whisperDownloaded;
  const step2Enabled = audioReady && whisperDownloaded && !whisperRan;
  const step3Enabled = audioReady && whisperRan;

  const step1Title = whisperDownloaded
    ? "✅ Whisper downloaded successfully"
    : isDownloadingWhisper
      ? "⬇️ Downloading local models..."
      : "1. Audio Processed, Download local Models";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Pipeline</Text>
      <TestButton
        title={step1Title}
        onPress={downloadWhisperModel}
        disabled={!step1Enabled}
        style={{ backgroundColor: step1Enabled ? "#0A84FF" : "#ccc" }}
      />
      {downloadStatus ? (
        <Text style={styles.statusText}>{downloadStatus}</Text>
      ) : null}
      <TestButton
        title="2. Run Whisper"
        onPress={runWhisper}
        disabled={!step2Enabled}
        style={{ backgroundColor: step2Enabled ? "#34C759" : "#ccc" }}
      />
      <TestButton
        title="3. Run LLM"
        onPress={runLlm}
        disabled={!step3Enabled}
        style={{ backgroundColor: step3Enabled ? "#FF9500" : "#ccc" }}
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
  statusText: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 13,
    color: "#666",
  },
});
