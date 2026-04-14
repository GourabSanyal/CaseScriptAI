import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSpeechToText, WHISPER_TINY } from "react-native-executorch";
import { File } from "expo-file-system";
import type { Result } from "../../types/result";

// Simple WAV file parser for 16-bit PCM data
const parseWavData = (wavBytes: Uint8Array): Float32Array => {
  // Check WAV header (simplified check)
  if (wavBytes.length < 44) {
    throw new Error("Invalid WAV file: too short");
  }

  // Read sample rate from header (bytes 24-27, little-endian)
  const sampleRate = wavBytes[24] | (wavBytes[25] << 8) | (wavBytes[26] << 16) | (wavBytes[27] << 24);

  // Read number of channels (bytes 22-23)
  const numChannels = wavBytes[22] | (wavBytes[23] << 8);

  // Read bits per sample (bytes 34-35)
  const bitsPerSample = wavBytes[34] | (wavBytes[35] << 8);

  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported bits per sample: ${bitsPerSample}, expected 16`);
  }

  // Find data chunk
  let dataOffset = 44; // Skip header
  // In a full implementation, we'd search for the "data" chunk, but for simplicity assume it's at offset 44

  const dataSize = wavBytes.length - dataOffset;
  const numSamples = dataSize / 2 / numChannels; // 2 bytes per sample, per channel

  const audioBuffer = new Float32Array(numSamples);

  // Convert 16-bit PCM to float32 (-1.0 to 1.0)
  for (let i = 0; i < numSamples; i++) {
    // Read 16-bit sample (little-endian)
    const sampleOffset = dataOffset + (i * numChannels * 2);
    const sample = wavBytes[sampleOffset] | (wavBytes[sampleOffset + 1] << 8);

    // Convert to signed 16-bit
    const signedSample = sample > 32767 ? sample - 65536 : sample;

    // Convert to float
    audioBuffer[i] = signedSample / 32768.0;
  }

  // Resample to 16kHz if necessary
  if (sampleRate !== 16000) {
    console.log(`[WAV Parser] Resampling from ${sampleRate}Hz to 16000Hz`);
    const resampled = resampleAudio(audioBuffer, sampleRate, 16000);
    return resampled;
  }

  return audioBuffer;
};

// Simple audio resampling (linear interpolation)
const resampleAudio = (input: Float32Array, fromRate: number, toRate: number): Float32Array => {
  const ratio = toRate / fromRate;
  const outputLength = Math.floor(input.length * ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const inputIndex = i / ratio;
    const index = Math.floor(inputIndex);
    const fraction = inputIndex - index;

    if (index + 1 < input.length) {
      output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
    } else {
      output[i] = input[index];
    }
  }

  return output;
};

export const useSpeechToTextInference = () => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shouldLoadModel, setShouldLoadModel] = useState(false);

  const speechConfig = useMemo(
    () => ({
      model: WHISPER_TINY,
      preventLoad: !shouldLoadModel,
    }),
    [shouldLoadModel],
  );

  // Call useSpeechToText at the hook level, not inside callbacks
  const model = useSpeechToText(speechConfig);
  const modelRef = useRef(model);
  const shouldLoadModelRef = useRef(shouldLoadModel);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    shouldLoadModelRef.current = shouldLoadModel;
  }, [shouldLoadModel]);

  const isReady = model.isReady;
  const downloadProgress = model.downloadProgress;
  const modelError = model.error ? model.error.message : null;
  const isLoading = shouldLoadModel && !isReady && !modelError;

  const getIsModelReady = useCallback(() => {
    return Boolean(modelRef.current?.isReady);
  }, []);

  const initModel = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      if (modelRef.current?.isReady) {
        console.log("[SpeechToText] Whisper model already loaded");
        setIsInitializing(false);
        return { success: true, data: modelRef.current };
      }

      if (!shouldLoadModelRef.current) {
        console.log("[SpeechToText] Triggering Whisper model load...");
        setShouldLoadModel(true);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      let attempts = 0;
      let delay = 100;
      while (!modelRef.current?.isReady && attempts < 180) {
        if (attempts % 20 === 0) {
          console.log(
            "[SpeechToText] Waiting for Whisper model... attempt",
            attempts,
            "ready:",
            modelRef.current?.isReady,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 1000);
        attempts++;
      }

      if (!modelRef.current?.isReady) {
        const timeoutMessage = "Whisper model failed to become ready";
        console.error("[SpeechToText] Init error:", timeoutMessage);
        setError(timeoutMessage);
        setIsInitializing(false);
        return { success: false, error: timeoutMessage };
      }

      console.log("[SpeechToText] Whisper model is ready");
      setIsInitializing(false);
      return { success: true, data: modelRef.current };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speech-to-text initialization failed";
      console.error("[SpeechToText] Init error:", message);
      setError(message);
      setIsInitializing(false);
      return { success: false, error: message };
    }
  }, []);

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
        console.log("[Pipeline] 🔊 Whisper starting transcription...");

        const transcriptionResult = await model.transcribe(audioBuffer, {
          language: "en",
        });

        if (!transcriptionResult || !transcriptionResult.text) {
          throw new Error("Transcription returned empty result");
        }

        const transcriptionText = transcriptionResult.text;

        console.log("[Pipeline] ✅ Whisper transcription complete");
        console.log("[Pipeline] Transcript:", transcriptionText.substring(0, 100) + (transcriptionText.length > 100 ? "..." : ""));
        setTranscript(transcriptionText);
        setIsTranscribing(false);
        return { success: true, data: transcriptionText };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transcription failed";
        console.error("[Pipeline] ❌ Whisper transcription error:", message);
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
    getIsModelReady,
    hasStartedLoading: shouldLoadModel,
    downloadProgress,
    modelError,
  };
};
