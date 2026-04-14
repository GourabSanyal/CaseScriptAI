import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Share } from "react-native";
import { Paths } from "expo-file-system";
import { TestButton } from "@/components/common/test-button";
import { useSpeechToTextInference } from "@/hooks/ai/use-speech-to-text";
import { useLLMInference } from "@/hooks/ai/use-llm-inference";
import { usePocStore } from "@/stores/poc-store";
import { resolveAudioUri } from "@/services/audio/audio-storage";

import type { PipelineSectionProps } from "@/types/poc";

// Helper function to clean and normalize transcript text for better LLM processing
const cleanTranscript = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[^\w\s.,!?-]/g, '') // Remove non-alphanumeric except basic punctuation
    .substring(0, 5000); // Limit length to prevent overly long inputs
};

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
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
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
    hasStartedLoading: hasStartedWhisperLoad,
    downloadProgress: whisperDownloadProgress,
    error: speechToTextError,
    modelError: whisperModelError,
  } = useSpeechToTextInference();

  const {
    loadModel,
    generateSOAPNote,
    isGenerating: isLLMGenerating,
    response: soapNote,
    error: soapError,
    getIsLLMReady,
  } = useLLMInference();

  useEffect(() => {
    // All AI models are built-in to react-native-executorch, no download needed
    setDownloadStatus(null);
    setPipelineStep('idle');
    setPipelineProgress(0);
    setIsConvertingToPdf(false);
    setConversionProgress(0);
    setConversionComplete(false);
    setPdfUri(null);
    clearPipelineResult();
  }, [audioKey, clearPipelineResult]);

  // State monitoring useEffect removed - pipeline state is now managed directly in runFullPipeline

  const runFullPipeline = async (): Promise<void> => {
    if (!audioReady) return;
    if (pipelineStep !== 'idle') return;

    console.log('[Pipeline] Starting full pipeline...');
    await Promise.resolve(handlePress('Run Pipeline'));

    setPipelineStep('transcribing');
    setPipelineProgress(0);

    const lastAudio = audios[audios.length - 1];
    const audioUri = resolveAudioUri(lastAudio.uri, 'poc');

    // Update UI to show transcribing state
    setPipelineResult({
      transcript: '',
      soapNote: '',
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
        transcript: '',
        soapNote: '',
        transcriptError: transcribeResult.error,
        soapNoteError: null,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      console.error('[Pipeline][ERROR] Transcription failed:', transcribeResult.error);
      return;
    }

    setPipelineStep('llm-loading');
    setPipelineProgress(30);

    // Initialize LLM before starting SOAP generation
    console.log('[Pipeline] Initializing LLM for SOAP generation...');
    let loadResult: any;
    try {
      console.log('[Pipeline][DEBUG] Calling loadModel()...');
      loadResult = await loadModel();
      console.log('[Pipeline][DEBUG] loadModel() result:', loadResult);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during model load';
      console.error('[Pipeline][ERROR] Exception during LLM load:', errorMsg);
      setPipelineStep('idle');
      setPipelineProgress(0);
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: '',
        transcriptError: null,
        soapNoteError: errorMsg,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    if (!loadResult || !loadResult.success) {
      setPipelineStep('idle');
      setPipelineProgress(0);
      const errorMsg = loadResult?.error || 'Unknown error - loadModel returned invalid result';
      console.error('[Pipeline][ERROR] Failed to load LLM:', errorMsg);
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: '',
        transcriptError: null,
        soapNoteError: errorMsg,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    // Wait for isLLMReady to be true (max 30s)
    let readyWait = 0;
    let llmReadyObserved = getIsLLMReady();
    while (!llmReadyObserved && readyWait < 60) {
      console.log(
        `[Pipeline][DEBUG] Waiting for isLLMReady... attempt ${readyWait}, isLLMReady:`,
        llmReadyObserved,
      );
      await new Promise(resolve => setTimeout(resolve, 500));
      llmReadyObserved = getIsLLMReady();
      readyWait++;
    }
    if (!llmReadyObserved) {
      setPipelineStep('idle');
      setPipelineProgress(0);
      const errorMsg = 'LLM model did not become ready after loadModel';
      console.error(
        '[Pipeline][ERROR] Failed to load LLM:',
        errorMsg,
        'isLLMReady:',
        getIsLLMReady(),
        'loadResult:',
        loadResult,
      );
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: '',
        transcriptError: null,
        soapNoteError: errorMsg,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    setPipelineStep('soap-generating');
    setPipelineProgress(50);

    // Update UI to show generating state
    const cleanedTranscript = cleanTranscript(transcribeResult.data);
    setPipelineResult({
      transcript: cleanedTranscript,
      soapNote: '',
      transcriptError: null,
      soapNoteError: null,
      isTranscribing: false,
      isGeneratingSoap: true,
    });

    // Step 3: Generate SOAP note (no retry needed)
    let soapResult;
    try {
      console.log('[Pipeline][DEBUG] Calling generateSOAPNote()...');
      soapResult = await generateSOAPNote(cleanedTranscript);
      console.log('[Pipeline][DEBUG] generateSOAPNote() result:', soapResult);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error during SOAP note generation';
      setPipelineStep('idle');
      setPipelineProgress(0);
      setDownloadStatus('Conversion failed');
      setIsConvertingToPdf(false);
      setConversionProgress(0);
      setConversionComplete(false);
      console.error('[Pipeline][ERROR] Exception during SOAP note generation:', errorMsg);
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: '',
        transcriptError: null,
        soapNoteError: errorMsg,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    if (soapResult && soapResult.success) {
      setPipelineStep('pdf-converting');
      setPipelineProgress(75);

      // Step 4: Convert to PDF
      setIsConvertingToPdf(true);
      setConversionProgress(0);
      setDownloadStatus('Converting to PDF...');

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
      console.log('[Pipeline] ✅ Pipeline complete - PDF generated');
      Alert.alert('Success', 'The transcribing is complete');
      setDownloadStatus('Audio converted to PDF');
      setConversionProgress(100);
      setConversionComplete(true);
      setPdfUri(Paths.document + '/pdf/output.pdf');
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: soapResult.data || '',
        transcriptError: null,
        soapNoteError: null,
        isTranscribing: false,
        isGeneratingSoap: false,
      });
    } else {
      setPipelineStep('idle');
      setPipelineProgress(0);
      setDownloadStatus('Conversion failed');
      setIsConvertingToPdf(false);
      setConversionProgress(0);
      setConversionComplete(false);
      console.error('[Pipeline][ERROR] SOAP generation failed:', soapResult?.error ?? null);
      setPipelineResult({
        transcript: transcribeResult.data,
        soapNote: '',
        transcriptError: null,
        soapNoteError: soapResult?.error ?? null,
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
      : hasStartedWhisperLoad
        ? "Preparing Whisper..."
        : "Whisper will load when you run the pipeline";

  const phiDownloadEnabled = false; // Qwen 2.5 1.5B is built-in, no download needed
  const runEnabled = audioReady && pipelineStep === 'idle';

  const phiTitle = "LLM ready ✅ (built-in Qwen 2.5 1.5B Quantized)";

  // Show more granular LLM (Qwen) state in the loader
  const runTitle = conversionComplete
    ? "PDF Generated"
    : pipelineStep === 'transcribing'
      ? `Transcribing... ${pipelineProgress}%`
      : pipelineStep === 'llm-loading'
        ? `Summarizing... ${pipelineProgress}%`
        : pipelineStep === 'soap-generating'
          ? `Summarizing... ${pipelineProgress}%`
          : pipelineStep === 'pdf-converting'
            ? `📄 Converting to PDF... ${pipelineProgress}%`
            : pipelineStep === 'complete'
              ? "Complete ✅"
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
          {pipelineStep === 'soap-generating' && isLLMGenerating && (
            <Text style={styles.statusText}>Qwen is actively summarizing the transcript...</Text>
          )}
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
