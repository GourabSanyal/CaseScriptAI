import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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
  const [pipelineStep, setPipelineStep] = useState<'idle' | 'loading-models' | 'transcribing' | 'soap-generating' | 'complete'>('idle');
  const [isPreloadingModels, setIsPreloadingModels] = useState(true);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState(0);

  const {
    initModel: initWhisperModel,
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
    retryModelLoad,
    generateSOAPNote,
    isGenerating: isLLMGenerating,
    response: soapNote,
    error: soapError,
    isLLMReady,
    getIsLLMReady,
    downloadProgress: llmDownloadProgress,
    isLoading: isLLMModelLoading,
    hasStartedLoading: hasStartedLlmLoad,
    modelError: llmModelError,
  } = useLLMInference();

  const modelsReady = isSpeechModelReady && isLLMReady;

  const ensureModelsReady = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isSpeechModelReady && getIsLLMReady()) {
      return { success: true };
    }

    console.log("[Pipeline] Downloading and loading AI models...");
    const whisperResult = await initWhisperModel();
    if (!whisperResult.success) {
      const error = whisperResult.error ?? "Failed to load Whisper model";
      setModelLoadError(error);
      return { success: false, error };
    }

    const llmResult = await loadModel();
    if (!llmResult.success) {
      const error = llmResult.error ?? "Failed to load LLM model";
      setModelLoadError(error);
      return { success: false, error };
    }

    let readyWait = 0;
    while (!getIsLLMReady() && readyWait < 60) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      readyWait++;
    }

    if (!getIsLLMReady()) {
      const error = "LLM model did not become ready after download";
      setModelLoadError(error);
      return { success: false, error };
    }

    setModelLoadError(null);
    return { success: true };
  }, [
    isSpeechModelReady,
    getIsLLMReady,
    initWhisperModel,
    loadModel,
  ]);

  const retryModelDownload = useCallback(async (): Promise<void> => {
    setIsPreloadingModels(true);
    setModelLoadError(null);

    const result = isSpeechModelReady
      ? await retryModelLoad()
      : await ensureModelsReadyRef.current();

    if (!result.success) {
      setModelLoadError(result.error ?? "Failed to load AI models");
    } else {
      setModelLoadError(null);
    }
    setIsPreloadingModels(false);
  }, [isSpeechModelReady, retryModelLoad]);

  const ensureModelsReadyRef = useRef(ensureModelsReady);
  ensureModelsReadyRef.current = ensureModelsReady;

  useEffect(() => {
    let cancelled = false;

    const preloadModels = async (): Promise<void> => {
      setIsPreloadingModels(true);
      setModelLoadError(null);
      const result = await ensureModelsReadyRef.current();
      if (!cancelled && !result.success) {
        setModelLoadError(result.error ?? "Failed to load AI models");
      }
      if (!cancelled) {
        setIsPreloadingModels(false);
      }
    };

    preloadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPipelineStep('idle');
    setPipelineProgress(0);
    clearPipelineResult();
  }, [audioKey, clearPipelineResult]);

  // State monitoring useEffect removed - pipeline state is now managed directly in runFullPipeline

  const runFullPipeline = async (): Promise<void> => {
    if (!audioReady) return;
    if (pipelineStep !== 'idle') return;

    console.log('[Pipeline] Starting full pipeline...');
    await Promise.resolve(handlePress('Run Pipeline'));

    setPipelineStep('loading-models');
    setPipelineProgress(0);

    const modelsResult = await ensureModelsReady();
    if (!modelsResult.success) {
      setPipelineStep('idle');
      setPipelineProgress(0);
      setPipelineResult({
        transcript: '',
        soapNote: '',
        transcriptError: null,
        soapNoteError: modelsResult.error ?? 'Failed to load AI models',
        isTranscribing: false,
        isGeneratingSoap: false,
      });
      return;
    }

    setPipelineStep('transcribing');
    setPipelineProgress(10);

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
      setPipelineProgress(prev => Math.min(prev + 5, 35)); // 10-35% for transcription
    }, 200);

    // Step 1: Transcribe audio
    const transcribeResult = await runSpeechToTextTranscribe(audioUri);

    // Stop transcription progress
    clearInterval(transcriptionProgressInterval);
    setPipelineProgress(40);

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
      setPipelineStep('complete');
      setPipelineProgress(100);
      console.log('[Pipeline] Pipeline complete — transcript and SOAP note ready');
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

  const whisperPercent = whisperDownloadProgress && whisperDownloadProgress <= 1
    ? Math.round(whisperDownloadProgress * 100)
    : Math.round(whisperDownloadProgress || 0);

  const llmPercent = llmDownloadProgress && llmDownloadProgress <= 1
    ? Math.round(llmDownloadProgress * 100)
    : Math.round(llmDownloadProgress || 0);

  const preloadPercent = isSpeechModelReady
    ? Math.round(20 + llmPercent * 0.8)
    : Math.round(whisperPercent * 0.2);

  const whisperStatus = isSpeechModelReady
    ? "Whisper ready ✅"
    : isSpeechModelLoading || isPreloadingModels
      ? `Downloading Whisper... ${whisperPercent}%`
      : hasStartedWhisperLoad
        ? "Preparing Whisper..."
        : "Whisper will download when this screen opens";

  const llmStatus = isLLMReady
    ? "LLM ready ✅ (built-in Qwen 2.5 1.5B Quantized)"
    : isSpeechModelReady && (isLLMModelLoading || hasStartedLlmLoad || isPreloadingModels)
      ? `Downloading LLM (~1 GB)... ${llmPercent}%`
      : isPreloadingModels || pipelineStep === "loading-models"
        ? "Waiting to download LLM..."
        : modelLoadError
          ? `LLM error: ${modelLoadError}`
          : "Preparing LLM...";

  const runEnabled = audioReady && pipelineStep === 'idle' && modelsReady && !isPreloadingModels;

  const runTitle = isPreloadingModels
    ? isSpeechModelReady
      ? `Downloading LLM (~1 GB)... ${llmPercent}%`
      : `Downloading Whisper... ${whisperPercent}%`
    : pipelineStep === 'loading-models'
      ? `Loading AI models... ${pipelineProgress}%`
      : pipelineStep === 'transcribing'
        ? `Transcribing... ${pipelineProgress}%`
        : pipelineStep === 'soap-generating'
          ? `Summarizing... ${pipelineProgress}%`
          : pipelineStep === 'complete'
            ? "Pipeline complete ✅"
            : modelsReady
              ? "Run Full Pipeline"
              : "Waiting for AI models...";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Pipeline</Text>

      <Text style={styles.statusText}>{whisperStatus}</Text>
      {whisperModelError ? (
        <Text style={styles.errorText}>Whisper Model Error: {whisperModelError}</Text>
      ) : null}
      <Text style={styles.statusText}>{llmStatus}</Text>
      {llmModelError ? (
        <Text style={styles.errorText}>LLM Model Error: {llmModelError}</Text>
      ) : null}
      {modelLoadError ? (
        <>
          <Text style={styles.errorText}>{modelLoadError}</Text>
          <TestButton
            title="Retry model download"
            onPress={retryModelDownload}
            disabled={isPreloadingModels}
            style={{ backgroundColor: "#FF9500", marginTop: 8 }}
          />
        </>
      ) : null}
      <TestButton
        title={runTitle}
        onPress={runFullPipeline}
        disabled={!runEnabled}
        style={{
          backgroundColor: runEnabled
            ? "#34C759"
            : pipelineStep !== 'idle' && pipelineStep !== 'complete'
              ? "#FF9500"
              : isPreloadingModels
                ? "#FF9500"
                : "#ccc"
        }}
      />
      {(isPreloadingModels || pipelineStep !== 'idle') && pipelineStep !== 'complete' && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {isPreloadingModels ? preloadPercent : pipelineProgress}%
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${isPreloadingModels ? preloadPercent : pipelineProgress}%` }]} />
          </View>
          {pipelineStep === 'soap-generating' && isLLMGenerating && (
            <Text style={styles.statusText}>Qwen is actively summarizing the transcript...</Text>
          )}
        </View>
      )}
      {(pipelineStep === 'complete' || pipelineResult?.transcriptError) && pipelineResult && (pipelineResult.soapNote || pipelineResult.soapNoteError || pipelineResult.transcriptError) && (
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
