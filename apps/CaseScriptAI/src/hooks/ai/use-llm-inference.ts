import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLLM, QWEN2_5_1_5B_QUANTIZED } from "react-native-executorch";
import { createLLMService } from "@/services/ai/llm-inference";
import { initializeExecutorch } from "@/services/ai/llm-inference";
import type { Result } from "@/types/result";

const MAX_DOWNLOAD_RETRIES = 3;

const isRetryableDownloadError = (message: string): boolean =>
  /cancel|reset|timeout|network|interrupted|aborted|econn|failed to connect/i.test(message);

const formatDownloadError = (message: string): string => {
  if (isRetryableDownloadError(message)) {
    return `${message}. Keep the app open on Wi-Fi and tap Retry.`;
  }
  return message;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const useLLMInference = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLLMReady, setIsLLMReady] = useState(false);
  // Lazy loading: model stays prevented until explicitly requested
  const [shouldLoadModel, setShouldLoadModel] = useState(false);

  // Qwen 2.5 1.5B quantized: ~800MB, strong medical reasoning, works on both simulator and production
  const llmConfig = useMemo(
    () => ({
      model: QWEN2_5_1_5B_QUANTIZED,
      // Only load when user explicitly triggered loading
      preventLoad: !shouldLoadModel,
    }),
    [shouldLoadModel],
  );

  const llm = useLLM(llmConfig);
  const llmRef = useRef<ReturnType<typeof useLLM> | null>(null);
  const isInitializedRef = useRef(isInitialized);
  const shouldLoadModelRef = useRef(shouldLoadModel);
  const isLLMReadyRef = useRef(isLLMReady);

  // Keep refs in sync with state
  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);

  useEffect(() => {
    shouldLoadModelRef.current = shouldLoadModel;
  }, [shouldLoadModel]);

  useEffect(() => {
    isLLMReadyRef.current = isLLMReady;
  }, [isLLMReady]);

  // Keep the latest llm instance available for async polling
  useEffect(() => {
    llmRef.current = llm;
  }, [llm]);

  const downloadProgress = llm.downloadProgress;
  const modelError = llm.error ? llm.error.message : null;
  const isLoading = shouldLoadModel && !llm.isReady && !modelError;

  // Monitor LLM readiness
  useEffect(() => {
    if (llm && llm.isReady) {
      console.log("[LLM] LLM is ready");
      setIsLLMReady(true);
    } else {
      setIsLLMReady(false);
    }
  }, [llm?.isReady]);

  const getIsLLMReady = useCallback(() => {
    return Boolean(llmRef.current?.isReady ?? isLLMReadyRef.current);
  }, []);

  // Keep service stable and resolve the latest model instance at call time.
  const service = useMemo(() => createLLMService(() => llmRef.current), []);

  /**
   * Prepares the LLM for inference: initializes ExecuTorch runtime and
   * triggers model loading. Waits for model to be fully ready.
   * Safe to call multiple times — idempotent once initialized.
   */
  const loadModel = useCallback(async (): Promise<Result<void>> => {
    try {
      if (isInitializedRef.current && shouldLoadModelRef.current && llmRef.current?.isReady) {
        console.log("[LLM] Model already loaded");
        return { success: true, data: undefined };
      }

      console.log("[LLM] Initializing ExecuTorch...");
      const execResult = await initializeExecutorch();
      if (!execResult.success) {
        console.error("[LLM] ExecuTorch init failed:", execResult.error);
        return { success: false, error: execResult.error };
      }
      setIsInitialized(true);
      console.log("[LLM] ExecuTorch initialized");

      for (let retry = 0; retry <= MAX_DOWNLOAD_RETRIES; retry++) {
        if (retry > 0) {
          console.warn(`[LLM] Retrying download (${retry}/${MAX_DOWNLOAD_RETRIES})...`);
          setShouldLoadModel(false);
          await sleep(500 * retry);
        }

        console.log("[LLM] Triggering model load...");
        setShouldLoadModel(true);
        await sleep(200);

        console.log("[LLM] Waiting for model to be ready...");
        let attempts = 0;
        let delay = 100;
        let retryableError: string | null = null;

        while (!(llmRef.current?.isReady) && attempts < 1200) {
          const llmError = llmRef.current?.error;
          if (llmError) {
            const message = llmError.message ?? "LLM model download failed";
            if (isRetryableDownloadError(message) && retry < MAX_DOWNLOAD_RETRIES) {
              retryableError = message;
              break;
            }
            console.error("[LLM] Init error:", message);
            return { success: false, error: formatDownloadError(message) };
          }

          if (attempts % 50 === 0) {
            const progress = llmRef.current?.downloadProgress ?? 0;
            const progressPercent = progress <= 1 ? Math.round(progress * 100) : Math.round(progress);
            console.log(
              "[LLM] Still loading... attempt",
              attempts,
              "llmReady:",
              llmRef.current?.isReady,
              "progress:",
              `${progressPercent}%`,
            );
          }
          await sleep(delay);
          delay = Math.min(delay * 1.5, 1000);
          attempts++;
        }

        if (llmRef.current?.isReady) {
          setIsLLMReady(true);
          console.log("[LLM] Model loaded successfully");
          return { success: true, data: undefined };
        }

        if (retryableError && retry < MAX_DOWNLOAD_RETRIES) {
          console.warn("[LLM] Download interrupted:", retryableError);
          continue;
        }

        const progress = llmRef.current?.downloadProgress ?? 0;
        const progressPercent = progress <= 1 ? Math.round(progress * 100) : Math.round(progress);
        console.error("[LLM] Model load timeout after", attempts, "attempts");
        const timeoutMessage =
          progressPercent > 0 && progressPercent < 100
            ? `LLM download still in progress (${progressPercent}%). Qwen is ~1 GB — keep the app open on Wi-Fi.`
            : "Model failed to load within timeout (~20 min). Check your network connection.";
        return { success: false, error: formatDownloadError(timeoutMessage) };
      }

      return {
        success: false,
        error: "LLM download failed after multiple retries. Keep the app open on Wi-Fi and try again.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error in loadModel";
      console.error("[LLM] Unexpected error in loadModel:", message);
      return { success: false, error: formatDownloadError(message) };
    }
  }, []);

  const generate = useCallback(
    async (prompt: string): Promise<Result<string>> => {
      setIsGenerating(true);
      
      if (!isInitializedRef.current || !shouldLoadModelRef.current) {
        const errorMsg = "ExecuTorch not initialized. Call loadModel() first.";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      // Check both state and ref for model readiness
      if (!getIsLLMReady()) {
        const errorMsg = "LLM model is still loading";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      setError(null);

      const result = await service.generate(prompt);

      if (result.success) {
        setResponse(result.data);
      } else {
        setError(result.error);
      }

      setIsGenerating(false);
      return result;
    },
    [getIsLLMReady, service],
  );

  const generateSOAPNote = useCallback(
    async (transcript: string): Promise<Result<string>> => {
      console.log("[Pipeline] Starting SOAP generation from transcript...");
      setIsGenerating(true);
      
      if (!isInitializedRef.current || !shouldLoadModelRef.current) {
        const errorMsg = "ExecuTorch not initialized. Call loadModel() first.";
        console.error("[Pipeline] SOAP generation failed:", errorMsg);
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      // Check both state and ref for model readiness
      // State is more reliable, but ref is the direct source
      if (!getIsLLMReady()) {
        const errorMsg = "LLM model is still loading";
        console.error("[Pipeline] SOAP generation failed:", errorMsg);
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      setError(null);

      const result = await service.generateSOAPNote(transcript);

      if (result.success) {
        console.log("[Pipeline] SOAP generation complete");
        setResponse(result.data);
      } else {
        console.error("[Pipeline] SOAP generation error:", result.error);
        setError(result.error);
      }

      setIsGenerating(false);
      return result;
    },
    [getIsLLMReady, service],
  );

  const clearResponse = useCallback(() => {
    setResponse("");
    setError(null);
  }, []);

  const retryModelLoad = useCallback(async (): Promise<Result<void>> => {
    setIsLLMReady(false);
    setShouldLoadModel(false);
    await sleep(300);
    return loadModel();
  }, [loadModel]);

  return {
    loadModel,
    retryModelLoad,
    generate,
    generateSOAPNote,
    isGenerating,
    response,
    error,
    clearResponse,
    isLLMReady,
    getIsLLMReady,
    downloadProgress,
    isLoading,
    modelError,
    hasStartedLoading: shouldLoadModel,
  };
};
