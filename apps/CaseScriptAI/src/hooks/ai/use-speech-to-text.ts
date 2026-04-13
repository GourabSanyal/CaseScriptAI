import { useState, useCallback, useRef, useEffect } from "react";
import { useSpeechToText, WHISPER_TINY } from "react-native-executorch";
import { File } from "expo-file-system";
import { parseWavData } from "@/services/audio/wav-parser";
import type { Result } from "../../types/result";

export const useSpeechToTextInference = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Call useSpeechToText at the hook level, not inside callbacks
  const model = useSpeechToText({
    model: WHISPER_TINY,
  });

  const isReady = model.isReady;
  const downloadProgress = model.downloadProgress;
  const modelError = model.error ? model.error.message : null;
  const isLoading = !isReady && !modelError;

  // Initialize the speech-to-text model (model is already initialized via hook)
  const initModel = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      console.log("[SpeechToText] Model already initialized via hook");
      setIsInitializing(false);
      return { success: true, data: model };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speech-to-text initialization failed";
      console.error("[SpeechToText] Init error:", message);
      setError(message);
      setIsInitializing(false);
      return { success: false, error: message };
    }
  }, [model]);

  // Transcribe audio from file path
  const transcribe = useCallback(
    async (audioPath: string): Promise<Result<string>> => {
      setIsTranscribing(true);
      setError(null);

      try {
        // Initialize model if not already done
        const modelResult = await initModel();
        if (!modelResult.success || !modelResult.data) {
          setIsTranscribing(false);
          return { success: false, error: modelResult.error! };
        }

        const model = modelResult.data;

        console.log("[SpeechToText] Loading audio file:", audioPath);

        // Load and decode WAV file
        console.log("[SpeechToText] Processing WAV file:", audioPath);

        let audioBuffer: Float32Array;
        try {
          const audioFile = new File(audioPath);
          if (!audioFile.exists) {
            throw new Error(`Audio file not found at ${audioPath}`);
          }

          const bytes = await audioFile.bytes();
          audioBuffer = parseWavData(bytes);
          console.log("[SpeechToText] WAV parsed successfully, samples:", audioBuffer.length);
        } catch (decodeErr) {
          console.error("[SpeechToText] WAV parsing error:", decodeErr);
          setIsTranscribing(false);
          const errorMessage = decodeErr instanceof Error ? decodeErr.message : 'Unknown error';
          return {
            success: false,
            error: `Failed to parse WAV file: ${errorMessage}`
          };
        }

        // Transcribe the audio
        console.log("[SpeechToText] Starting transcription...");

        const transcriptionResult = await model.transcribe(audioBuffer, {
          language: "en",
        });

        if (!transcriptionResult || !transcriptionResult.text) {
          throw new Error("Transcription returned empty result");
        }

        const transcriptionText = transcriptionResult.text;

        console.log("[SpeechToText] Transcription complete:", transcriptionText.substring(0, 100));
        setTranscript(transcriptionText);
        setIsTranscribing(false);
        return { success: true, data: transcriptionText };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transcription failed";
        console.error("[SpeechToText] Transcribe error:", message);
        setError(message);
        setIsTranscribing(false);
        return { success: false, error: message };
      }
    },
    [initModel],
  );

  // Release resources
  const release = useCallback(async () => {
    try {
      console.log("[SpeechToText] Resources released");
      // Note: react-native-executorch handles model cleanup automatically
    } catch (err) {
      console.error("[SpeechToText] Release error:", err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      release();
    };
  }, [release]);

  return {
    initModel,
    transcribe,
    release,
    isLoading,
    isTranscribing,
    transcript,
    error,
    isReady,
    downloadProgress,
    modelError,
  };
};