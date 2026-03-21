import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { TestButton } from "@/components/common/test-button";
import { downloadWhisper } from "@/services/ai/whisper";

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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsDownloadingWhisper(false);
    setWhisperDownloaded(false);
    setWhisperRan(false);
    setDownloadStatus(null);
    setProgress(0);
  }, [audioKey]);

  const downloadWhisperModel = async (): Promise<void> => {
    if (!audioReady || isDownloadingWhisper || whisperDownloaded) return;

    setIsDownloadingWhisper(true);
    setDownloadStatus("Starting download...");
    setProgress(0);

    const result = await downloadWhisper((p) => {
      setProgress(Math.round(p * 100));
      setDownloadStatus(`Downloading: ${Math.round(p * 100)}%`);
    });

    if (result.success) {
      setWhisperDownloaded(true);
      setDownloadStatus("Whisper downloaded");
    } else {
      setDownloadStatus(result.error || "Download failed");
    }
    setIsDownloadingWhisper(false);
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
    ? "✅ Whisper downloaded"
    : isDownloadingWhisper
      ? `⬇️ Downloading... ${progress}%`
      : "1. Audio Processed, Download local Models";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Pipeline</Text>
      <TestButton
        title={step1Title}
        onPress={downloadWhisperModel}
        disabled={!step1Enabled || isDownloadingWhisper}
        style={{
          backgroundColor: step1Enabled ? "#0A84FF" : isDownloadingWhisper ? "#0056b3" : "#ccc"
        }}
      />
      {downloadStatus ? (
        <Text style={styles.statusText}>{downloadStatus}</Text>
      ) : null}
      <TestButton
        title="2. Run Whisper"
        onPress={runWhisper}
        disabled={!step2Enabled || isDownloadingWhisper}
        style={{ backgroundColor: step2Enabled && !isDownloadingWhisper ? "#34C759" : "#ccc" }}
      />
      <TestButton
        title="3. Run LLM"
        onPress={runLlm}
        disabled={!step3Enabled || isDownloadingWhisper}
        style={{ backgroundColor: step3Enabled && !isDownloadingWhisper ? "#FF9500" : "#ccc" }}
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
