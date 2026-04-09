import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Share } from "react-native";
import { Paths } from "expo-file-system";
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
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const {
    transcribe: runWhisperTranscribe,
    isTranscribing,
    error: whisperError,
  } = useWhisperInference();

  const {
    loadModel,
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
    setTranscriptionProgress(0);
    setPdfUri(null);
    clearPipelineResult();
  }, [audioKey, clearPipelineResult]);

  // State monitoring useEffect removed - pipeline state is now managed directly in runFullPipeline

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

    await Promise.resolve(handlePress("Run Pipeline"));

    const lastAudio = audios[audios.length - 1];
    const audioUri = resolveAudioUri(lastAudio.uri, "poc");

    // Update UI to show transcribing state
    setPipelineResult({
      transcript: "",
      soapNote: "",
      transcriptError: null,
      soapNoteError: null,
      isTranscribing: true,
      isGeneratingSoap: false,
    });

    // Start transcription progress
    setTranscriptionProgress(0);
    const transcriptionProgressInterval = setInterval(() => {
      setTranscriptionProgress(prev => {
        if (prev < 50) return prev + 5;
        return prev;
      });
    }, 200);

    // Step 1: Transcribe audio
    const transcribeResult = await runWhisperTranscribe(audioUri);

    // Stop transcription progress
    clearInterval(transcriptionProgressInterval);
    setTranscriptionProgress(50);

    // Start phi progress
    const phiProgressInterval = setInterval(() => {
      setTranscriptionProgress(prev => {
        if (prev < 100) return prev + 10;
        return prev;
      });
    }, 200);

    if (!transcribeResult.success) {
      // Transcription failed - update store with error
      clearInterval(phiProgressInterval);
      setPipelineResult({
        transcript: "",
        soapNote: "",
        transcriptError: transcribeResult.error,
        soapNoteError: null,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    // Initialize LLM before starting SOAP generation
    console.log("[Pipeline] Initializing LLM for SOAP generation...");
    const loadResult = await loadModel();
    if (!loadResult.success) {
      console.error("[Pipeline] Failed to load LLM:", loadResult.error);
      clearInterval(phiProgressInterval);
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: "",
        transcriptError: null,
        soapNoteError: loadResult.error,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    // Step 2: Start conversion with the transcript
    setIsConvertingToPdf(true);
    setConversionProgress(0);
    setDownloadStatus("Converting to PDF...");

    // Start progress animation
    const progressInterval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev < 90) return prev + 10;
        return prev;
      });
    }, 500);

    // Step 3: Generate SOAP note (with retry logic for loading edge cases)
    const generateWithRetry = async (transcript: string, retryCount = 0): Promise<{ success: boolean; data?: string; error?: string }> => {
      const result = await generateSOAPNote(transcript);

      if (result.success) {
        return result;
      }

      // Retry if model is still loading (up to 30 seconds)
      if (result.error?.includes("still loading") && retryCount < 60) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return generateWithRetry(transcript, retryCount + 1);
      }

      return result;
    };

    // Update UI to show generating state
    setPipelineResult({
      transcript: "",
      soapNote: "",
      transcriptError: null,
      soapNoteError: null,
      isTranscribing: false,
      isGeneratingSoap: true,
    });

    const soapResult = await generateWithRetry(transcribeResult.data);

    console.log("SOAP Result:", soapResult);

    // Cleanup progress animation
    clearInterval(progressInterval);

    // Step 4: Handle result
    if (soapResult.success) {
      clearInterval(phiProgressInterval);
      setTranscriptionProgress(100);
      console.log("The transcribing is complete");
      Alert.alert("Success", "The transcribing is complete");
      setDownloadStatus("Audio converted to PDF");
      setConversionProgress(100);
      setConversionComplete(true);
      setPdfUri(Paths.document + "/pdf/output.pdf");
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: "",
        transcriptError: null,
        soapNoteError: null,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
    } else {
      clearInterval(phiProgressInterval);
      setTranscriptionProgress(100);
      setDownloadStatus("Conversion failed");
      setIsConvertingToPdf(false);
      setConversionProgress(0);
      setConversionComplete(false);
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: "",
        transcriptError: null,
        soapNoteError: soapResult.error ?? null,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
    }
  };

  const openPDF = () => {
    if (pdfUri) {
      Share.share({ url: `file://${pdfUri}` });
    }
  };

  const step1Enabled = audioReady && !isDownloadingWhisper && !whisperDownloaded;
  const phiDownloadEnabled = audioReady && whisperDownloaded && !isDownloadingPhi && !phiDownloaded;
  const runEnabled = audioReady && whisperDownloaded && phiDownloaded && !isTranscribing && !isConvertingToPdf;

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

  const runTitle = conversionComplete
    ? "PDF Generated"
    : isTranscribing
      ? `🎙️ Transcribing... ${transcriptionProgress}%`
      : isConvertingToPdf
        ? `📄 Converting to PDF... ${conversionProgress}%`
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
        onPress={conversionComplete ? openPDF : runFullPipeline}
        disabled={!runEnabled && !conversionComplete}
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
          {pipelineResult.transcript && !pipelineResult.transcriptError && (
            <>
              <Text style={styles.resultLabel}>Transcript:</Text>
              <Text style={styles.resultText}>{pipelineResult.transcript}</Text>
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