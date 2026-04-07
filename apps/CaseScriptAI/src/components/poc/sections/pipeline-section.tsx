import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { TestButton } from "@/components/common/test-button";
import { downloadWhisper, checkWhisperExists } from "@/services/ai/whisper";
import { downloadPhi, checkPhiExists } from "@/services/ai/llm";
import { useWhisperInference } from "@/hooks/ai/use-whisper-inference";
import { useLLMInference } from "@/hooks/ai/use-llm-inference";
import { usePocStore } from "@/stores/poc-store";
import { resolveAudioUri } from "@/services/audio/audio-storage";

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

  const setPipelineResult = usePocStore((s) => s.setPipelineResult);
  const clearPipelineResult = usePocStore((s) => s.clearPipelineResult);
  const pipelineResult = usePocStore((s) => s.pipelineResult);

  const [isDownloadingWhisper, setIsDownloadingWhisper] = useState(false);
  const [whisperDownloaded, setWhisperDownloaded] = useState(false);
  const [isDownloadingPhi, setIsDownloadingPhi] = useState(false);
  const [phiDownloaded, setPhiDownloaded] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phiProgress, setPhiProgress] = useState(0);
  const [isConvertingToPdf, setIsConvertingToPdf] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const isConversionStartedRef = useRef(false);

  const {
    transcribe: runWhisperTranscribe,
    isTranscribing,
    transcript,
    error: whisperError,
  } = useWhisperInference();

  const {
    generateSOAPNote,
    isGenerating: isGeneratingSoap,
    response: soapNote,
    error: soapError,
    isLLMReady,
  } = useLLMInference();

  useEffect(() => {
    setIsDownloadingWhisper(false);
    setWhisperDownloaded(checkWhisperExists());
    setIsDownloadingPhi(false);
    setPhiDownloaded(checkPhiExists());
    setDownloadStatus(null);
    setProgress(0);
    setPhiProgress(0);
    setIsConvertingToPdf(false);
    setConversionProgress(0);
    setConversionComplete(false);
    clearPipelineResult();
  }, [audioKey, clearPipelineResult]);

  useEffect(() => {
    if (transcript && !whisperError && !pendingTranscript && !conversionComplete) {
      setIsConvertingToPdf(true);
      setConversionProgress(0);
      setConversionComplete(false);
      setDownloadStatus("Converting to PDF...");
      setPendingTranscript(transcript);
    }
  }, [transcript, whisperError, pendingTranscript, conversionComplete]);

  useEffect(() => {
    if (!pendingTranscript || isConversionStartedRef.current) {
      return;
    }

    isConversionStartedRef.current = true;
    setIsConvertingToPdf(true);

    const progressInterval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev < 90) return prev + 10;
        return prev;
      });
    }, 500);

    const finishWithResult = (result: { success: boolean; data?: string; error?: string }) => {
      clearInterval(progressInterval);
      if (result.success) {
        setDownloadStatus("Audio converted to PDF");
        setConversionProgress(100);
        setConversionComplete(true);
        setPipelineResult({
          transcript: "",
          soapNote: result.data || "",
          transcriptError: null,
          soapNoteError: null,
          isTranscribing: false,
          isGeneratingSoap: false,
        });
      } else {
        setDownloadStatus("Conversion failed");
        setIsConvertingToPdf(false);
        setConversionProgress(0);
        setConversionComplete(false);
        setPipelineResult({
          transcript: "",
          soapNote: "",
          transcriptError: null,
          soapNoteError: result.error ?? null,
          isTranscribing: false,
          isGeneratingSoap: false,
        });
      }
      setPendingTranscript(null);
      isConversionStartedRef.current = false;
    };

    const runGeneration = async (retryCount = 0): Promise<void> => {
      const result = await generateSOAPNote(pendingTranscript);

      if (result.success) {
        finishWithResult(result);
        return;
      }

      if (result.error?.includes("still loading") && retryCount < 10) {
        setTimeout(() => runGeneration(retryCount + 1), 1000);
        return;
      }

      finishWithResult(result);
    };

    runGeneration();

    return () => clearInterval(progressInterval);
  }, [pendingTranscript, generateSOAPNote, setPipelineResult]);

  useEffect(() => {
    if (isTranscribing || isGeneratingSoap) {
      setPipelineResult({
        transcript: "",
        soapNote: "",
        transcriptError: null,
        soapNoteError: null,
        isTranscribing,
        isGeneratingSoap,
      });
    }
  }, [isTranscribing, isGeneratingSoap, setPipelineResult]);

  const downloadWhisperModel = async (): Promise<void> => {
    if (checkWhisperExists()) {
      setWhisperDownloaded(true);
      return;
    }
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
      // Show error and reset button state
      setDownloadStatus(null);
      setProgress(0);
      setWhisperDownloaded(false);
      setIsDownloadingWhisper(false);
      alert("Model not downloaded, try again");
      return;
    }
    setIsDownloadingWhisper(false);
  };

  const downloadPhiModel = async (): Promise<void> => {
    if (checkPhiExists()) {
      setPhiDownloaded(true);
      return;
    }
    if (!whisperDownloaded || isDownloadingPhi || phiDownloaded) return;

    setIsDownloadingPhi(true);
    setDownloadStatus("Starting LLM download...");
    setPhiProgress(0);

    const result = await downloadPhi((p) => {
      setPhiProgress(Math.round(p * 100));
      setDownloadStatus(`Downloading LLM: ${Math.round(p * 100)}%`);
    });

    if (result.success) {
      setPhiDownloaded(true);
      setDownloadStatus("LLM downloaded");
    } else {
      // Show error and reset button state
      setDownloadStatus(null);
      setPhiProgress(0);
      setPhiDownloaded(false);
      setIsDownloadingPhi(false);
      alert("Model not downloaded, try again");
      return;
    }
    setIsDownloadingPhi(false);
  };

  const runFullPipeline = async (): Promise<void> => {
    if (!audioReady || !whisperDownloaded || !phiDownloaded) return;
    if (isTranscribing || isConvertingToPdf) return;

    // Reset conversion states
    setIsConvertingToPdf(false);
    setConversionProgress(0);
    setConversionComplete(false);

    await Promise.resolve(handlePress("Run Pipeline"));

    const lastAudio = audios[audios.length - 1];
    const audioUri = resolveAudioUri(lastAudio.uri, "poc");

    const result = await runWhisperTranscribe(audioUri);

    if (result.success) {
      console.log("[Pipeline] Whisper complete, starting conversion...");
    }
  };

  const step1Enabled = audioReady && !isDownloadingWhisper && !whisperDownloaded;
  const phiDownloadEnabled = audioReady && whisperDownloaded && !isDownloadingPhi && !phiDownloaded;
  const runEnabled = audioReady && whisperDownloaded && phiDownloaded && !isTranscribing && !isConvertingToPdf && !conversionComplete;

  const step1Title = whisperDownloaded
    ? "✅ Whisper downloaded"
    : isDownloadingWhisper
      ? `⬇️ Downloading... ${progress}%`
      : "1. Download Whisper Model";

  const phiTitle = phiDownloaded
    ? "LLM downloaded ✅"
    : isDownloadingPhi
      ? `⬇️ Downloading... ${phiProgress}%`
      : "2. Download Phi Model";

  const runTitle = isTranscribing
    ? "🎙️ Transcribing..."
    : isConvertingToPdf
      ? `📄 Converting to PDF... ${conversionProgress}%`
      : conversionComplete
        ? "✅ Audio converted to PDF"
        : "3. Run Full Pipeline";

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
      <TestButton
        title={phiTitle}
        onPress={downloadPhiModel}
        disabled={!phiDownloadEnabled || isDownloadingWhisper || isDownloadingPhi}
        style={{
          backgroundColor: phiDownloadEnabled ? "#5856D6" : isDownloadingPhi ? "#403f9e" : "#ccc"
        }}
      />
      {downloadStatus ? (
        <Text style={styles.statusText}>{downloadStatus}</Text>
      ) : null}
      <TestButton
        title={runTitle}
        onPress={runFullPipeline}
        disabled={!runEnabled}
        style={{
          backgroundColor: runEnabled 
            ? "#34C759" 
            : isConvertingToPdf 
              ? "#FF9500" 
              : conversionComplete 
                ? "#30D158" 
                : "#ccc"
        }}
      />
      {(conversionComplete || pipelineResult?.transcriptError) && pipelineResult && (pipelineResult.soapNote || pipelineResult.soapNoteError || pipelineResult.transcriptError) && (
        <ScrollView style={styles.resultsContainer}>
          {pipelineResult.transcriptError && (
            <Text style={styles.errorText}>Whisper Error: {pipelineResult.transcriptError}</Text>
          )}
          {pipelineResult.soapNoteError && (
            <Text style={styles.errorText}>LLM Error: {pipelineResult.soapNoteError}</Text>
          )}
          {pipelineResult.soapNote && !pipelineResult.soapNoteError && (
            <>
              <Text style={styles.resultLabel}>SOAP Note:</Text>
              <Text style={styles.resultText}>{pipelineResult.soapNote}</Text>
            </>
          )}
        </ScrollView>
      )}
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
  resultsContainer: {
    marginTop: 12,
    maxHeight: 300,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 13,
    color: "#FF3B30",
    marginBottom: 8,
  },
});