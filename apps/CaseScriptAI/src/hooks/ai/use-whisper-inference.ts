import { useState, useCallback, useRef, useEffect } from "react";
import {
  downloadWhisper,
  checkWhisperExists,
} from "@/services/ai/whisper";
import {
  transcribeAudio,
  releaseWhisper,
} from "@/services/ai/whisper-inference";
import type { Result } from "@/types/result";

/**
 * Owned-download + whisper.rn for the POC pipeline.
 * Preload = download only (file on disk). Inference loads then releases so LLM can follow.
 * Callers must unload LLM before transcribe() (ARCHITECTURE: never co-resident).
 */
export const useWhisperInference = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isReady, setIsReady] = useState(() => checkWhisperExists());
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(
    checkWhisperExists() ? 1 : 0,
  );
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(isReady);

  useEffect(() => {
    readyRef.current = isReady;
  }, [isReady]);

  const getIsModelReady = useCallback(() => readyRef.current, []);

  /** Download ggml-base.bin if missing. Does not keep the native model in RAM. */
  const initModel = useCallback(async (): Promise<Result<void>> => {
    setIsLoading(true);
    setHasStartedLoading(true);
    setError(null);

    try {
      if (checkWhisperExists()) {
        setDownloadProgress(1);
        setIsReady(true);
        setIsLoading(false);
        console.log("[Whisper] Model already on disk");
        return { success: true, data: undefined };
      }

      console.log("[Whisper] Starting owned download...");
      setDownloadProgress(0);
      const dl = await downloadWhisper((progress) => {
        setDownloadProgress(progress);
      });

      if (!dl.success) {
        setError(dl.error ?? "Whisper download failed");
        setIsLoading(false);
        setIsReady(false);
        return { success: false, error: dl.error };
      }

      setDownloadProgress(1);
      setIsReady(true);
      setIsLoading(false);
      console.log("[Whisper] Download complete — ready for transcription");
      return { success: true, data: undefined };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Whisper download failed";
      console.error("[Whisper] Init error:", message);
      setError(message);
      setIsLoading(false);
      setIsReady(false);
      return { success: false, error: message };
    }
  }, []);

  const retryModelLoad = useCallback(async (): Promise<Result<void>> => {
    setIsReady(false);
    setDownloadProgress(0);
    setError(null);
    await releaseWhisper();
    return initModel();
  }, [initModel]);

  const transcribe = useCallback(
    async (audioPath: string): Promise<Result<string>> => {
      setIsTranscribing(true);
      setError(null);

      try {
        if (!checkWhisperExists()) {
          const init = await initModel();
          if (!init.success) {
            setIsTranscribing(false);
            return { success: false, error: init.error };
          }
        }

        console.log("[Pipeline] 🔊 Whisper starting transcription...");
        const result = await transcribeAudio(audioPath);

        if (!result.success) {
          setError(result.error ?? "Transcription failed");
          setIsTranscribing(false);
          return result;
        }

        console.log("[Pipeline] ✅ Whisper transcription complete");
        setTranscript(result.data);
        setIsTranscribing(false);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        console.error("[Pipeline] ❌ Whisper transcription error:", message);
        setError(message);
        setIsTranscribing(false);
        return { success: false, error: message };
      }
    },
    [initModel],
  );

  const release = useCallback(async () => {
    await releaseWhisper();
  }, []);

  useEffect(() => {
    return () => {
      void releaseWhisper();
    };
  }, []);

  return {
    initModel,
    retryModelLoad,
    transcribe,
    release,
    isLoading,
    isTranscribing,
    transcript,
    error,
    isReady,
    getIsModelReady,
    hasStartedLoading,
    downloadProgress,
    modelError: error,
  };
};
