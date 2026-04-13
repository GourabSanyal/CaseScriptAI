import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Share } from "react-native";
import { Paths } from "expo-file-system";
import { TestButton } from "@/components/common/test-button";
// Speech-to-text models are downloaded automatically by react-native-executorch
import { downloadPhi, checkPhiExists } from "@/services/ai/llm";
import { useSpeechToTextInference } from "@/hooks/ai/use-speech-to-text";
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

  // Speech-to-text models are downloaded automatically by react-native-executorch
  const [isDownloadingPhi, setIsDownloadingPhi] = useState(false);
  const [phiDownloaded, setPhiDownloaded] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phiProgress, setPhiProgress] = useState(0);
  const [isConvertingToPdf, setIsConvertingToPdf] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<'idle' | 'transcribing' | 'llm-loading' | 'soap-generating' | 'pdf-converting' | 'complete'>('idle');
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const {
    transcribe: runSpeechToTextTranscribe,
    isLoading: isSpeechModelLoading,
    isTranscribing,
    isReady: isSpeechModelReady,
    downloadProgress: whisperDownloadProgress,
    error: speechToTextError,
    modelError: whisperModelError,
  } = useSpeechToTextInference();

  const {
    loadModel,
    generateSOAPNote,
    isGenerating: isGeneratingSoap,
    response: soapNote,
    error: soapError,
    isLLMReady,
  } = useLLMInference();

  useEffect(() => {
    // Speech-to-text models are downloaded automatically, no need to check existence
    // PHI_4_MINI_4B is a built-in model, no download needed
    setPhiDownloaded(true);
    setDownloadStatus(null);
    setPhiProgress(0);
    setIsConvertingToPdf(false);
    setConversionProgress(0);
    setConversionComplete(false);
    setPdfUri(null);
    clearPipelineResult();
  }, [audioKey, clearPipelineResult]);

  // State monitoring useEffect removed - pipeline state is now managed directly in runFullPipeline



  const downloadPhiModel = async (): Promise<void> => {
    if (checkPhiExists()) {
      setPhiDownloaded(true);
      return;
    }
    if (isDownloadingPhi || phiDownloaded) return;

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
    if (!audioReady || !isSpeechModelReady) return;
    if (pipelineStep !== 'idle') return;

    await Promise.resolve(handlePress("Run Pipeline"));

    setPipelineStep('transcribing');
    setPipelineProgress(0);

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
    const transcriptionProgressInterval = setInterval(() => {
      setPipelineProgress(prev => Math.min(prev + 5, 25)); // 0-25% for transcription
    }, 200);

    // Step 1: Transcribe audio
    const transcribeResult = await runSpeechToTextTranscribe(audioUri);

    // Stop transcription progress
    clearInterval(transcriptionProgressInterval);
    setPipelineProgress(25);

    if (!transcribeResult.success) {
      setPipelineStep('idle');
      setPipelineProgress(0);
      // Transcription failed - update store with error
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

    setPipelineStep('llm-loading');
    setPipelineProgress(30);

    // Initialize LLM before starting SOAP generation
    console.log("[Pipeline] Initializing LLM for SOAP generation...");
    const loadResult = await loadModel();
    if (!loadResult.success) {
      setPipelineStep('idle');
      setPipelineProgress(0);
      console.error("[Pipeline] Failed to load LLM:", loadResult.error);
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

    setPipelineStep('soap-generating');
    setPipelineProgress(50);

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

    if (soapResult.success) {
      setPipelineStep('pdf-converting');
      setPipelineProgress(75);

      // Step 4: Convert to PDF
      setIsConvertingToPdf(true);
      setConversionProgress(0);
      setDownloadStatus("Converting to PDF...");

      // Start progress animation
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
        setPipelineProgress(prev => Math.min(prev + 5, 100));
      }, 500);

      // Simulate PDF generation (replace with actual logic)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Placeholder

      // Cleanup progress animation
      clearInterval(progressInterval);

      setPipelineStep('complete');
      setPipelineProgress(100);
      console.log("The transcribing is complete");
      Alert.alert("Success", "The transcribing is complete");
      setDownloadStatus("Audio converted to PDF");
      setConversionProgress(100);
      setConversionComplete(true);
      setPdfUri(Paths.document + "/pdf/output.pdf");
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: soapResult.data || "",
        transcriptError: null,
        soapNoteError: null,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
    } else {
      setPipelineStep('idle');
      setPipelineProgress(0);
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

  const whisperPercent = whisperDownloadProgress && whisperDownloadProgress <= 1
    ? Math.round(whisperDownloadProgress * 100)
    : Math.round(whisperDownloadProgress || 0);

  const whisperStatus = isSpeechModelReady
    ? "Whisper ready ✅"
    : isSpeechModelLoading
      ? `Initializing Whisper... ${whisperPercent}%`
      : "Waiting for Whisper...";

  const phiDownloadEnabled = false; // PHI_4_MINI_4B is built-in, no download needed
  const runEnabled = audioReady && isSpeechModelReady && pipelineStep === 'idle';

  const phiTitle = "LLM ready ✅ (built-in PHI-4 Mini)";

  const runTitle = conversionComplete
    ? "PDF Generated"
    : pipelineStep === 'transcribing'
      ? `🎙️ Transcribing... ${pipelineProgress}%`
      : pipelineStep === 'llm-loading'
        ? `🧠 Loading LLM... ${pipelineProgress}%`
        : pipelineStep === 'soap-generating'
          ? `📝 Generating SOAP... ${pipelineProgress}%`
          : pipelineStep === 'pdf-converting'
            ? `📄 Converting to PDF... ${pipelineProgress}%`
            : pipelineStep === 'complete'
              ? "Complete ✅"
              : !isSpeechModelReady
                ? `⏳ ${whisperStatus}`
                : "Run Full Pipeline";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Pipeline</Text>

      <TestButton
        title={phiTitle}
        onPress={() => {}} // No action needed for built-in model
        disabled={true}
        style={{
          backgroundColor: "#ccc"
        }}
      />
      {downloadStatus ? (
        <Text style={styles.statusText}>{downloadStatus}</Text>
      ) : null}
      <Text style={styles.statusText}>{whisperStatus}</Text>
      {whisperModelError ? (
        <Text style={styles.errorText}>Whisper Model Error: {whisperModelError}</Text>
      ) : null}
      <TestButton
        title={runTitle}
        onPress={conversionComplete ? openPDF : runFullPipeline}
        disabled={!runEnabled && !conversionComplete}
        style={{
          backgroundColor: runEnabled 
            ? "#34C759" 
            : pipelineStep !== 'idle' && pipelineStep !== 'complete'
              ? "#FF9500" 
              : conversionComplete 
                ? "#30D158" 
                : "#ccc"
        }}
      />
      {pipelineStep !== 'idle' && pipelineStep !== 'complete' && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{pipelineProgress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pipelineProgress}%` }]} />
          </View>
        </View>
      )}
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
  progressContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
});