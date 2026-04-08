import { useState, useCallback, useRef, useEffect } from "react";
import { Directory, File, Paths } from "expo-file-system";
import { checkModelExists, MODEL_PATHS } from "@/services/ai/model-utils";
import type { Result } from "@/types/result";

type WhisperContext = {
  transcribe: (audioPath: string, options?: Record<string, unknown>) => { promise: Promise<{ result: string }> };
  release: () => Promise<void>;
};

export const useWhisperInference = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<WhisperContext | null>(null);

  const initModel = useCallback(async (): Promise<Result<WhisperContext>> => {
    if (contextRef.current) {
      return { success: true, data: contextRef.current };
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!checkModelExists("whisper")) {
        return {
          success: false,
          error: "Whisper model not found. Please download it first.",
        };
      }

      const modelsDir = new Directory(Paths.document, "models");
      const whisperDir = new Directory(modelsDir, MODEL_PATHS.whisper.dir);
      const modelFile = new File(whisperDir, MODEL_PATHS.whisper.file);
      const modelPath = modelFile.uri.replace("file://", "");

      console.log("[Whisper] Initializing with model:", modelPath);

      const { initWhisper } = await import("whisper.rn");
      const context = await initWhisper({
        filePath: modelPath,
      });

      contextRef.current = context;
      console.log("[Whisper] Model initialized successfully");
      setIsLoading(false);
      return { success: true, data: context };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Whisper initialization failed";
      console.error("[Whisper] Init error:", message);
      setError(message);
      setIsLoading(false);
      return { success: false, error: message };
    }
  }, []);

  const transcribe = useCallback(
    async (audioPath: string): Promise<Result<string>> => {
      setIsTranscribing(true);
      setError(null);

      try {
        const contextResult = await initModel();
        if (!contextResult.success || !contextResult.data) {
          setIsTranscribing(false);
          return { success: false, error: contextResult.error };
        }

        const context = contextResult.data;
        const cleanAudioPath = audioPath.replace("file://", "");

        console.log("[Whisper] Transcribing:", cleanAudioPath);

        const { promise } = context.transcribe(cleanAudioPath, {
          language: "en",
          maxThreads: 4,
        });

        const { result } = await promise;

        console.log("[Whisper] Transcription complete:", result.substring(0, 100));
        setTranscript(result);
        setIsTranscribing(false);
        return { success: true, data: result };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        console.error("[Whisper] Transcribe error:", message);
        setError(message);
        setIsTranscribing(false);
        return { success: false, error: message };
      }
    },
    [initModel],
  );

  const release = useCallback(async () => {
    if (contextRef.current) {
      try {
        await contextRef.current.release();
        contextRef.current = null;
        console.log("[Whisper] Model released");
      } catch (err) {
        console.error("[Whisper] Release error:", err);
      }
    }
  }, []);

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
  };
};