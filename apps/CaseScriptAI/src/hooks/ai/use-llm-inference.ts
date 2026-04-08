import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLLM, SMOLLM2_1_135M_QUANTIZED } from "react-native-executorch";
import { createLLMService } from "@/services/ai/llm-inference";
import { initializeExecutorch } from "@/services/ai/llm-inference";
import type { Result } from "@/types/result";

export const useLLMInference = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLLMReady, setIsLLMReady] = useState(false);
  const [shouldLoadModel, setShouldLoadModel] = useState(false);

  const isLLMReadyRef = useRef(false);
  // Resolver: resolves with true on ready, false on error
  const loadResolverRef = useRef<((ready: boolean) => void) | null>(null);

  const llmConfig = useMemo(
    () => ({
      model: SMOLLM2_1_135M_QUANTIZED,
      preventLoad: !shouldLoadModel,
    }),
    [shouldLoadModel],
  );

  const llm = useLLM(llmConfig);
  const service = createLLMService(llm);

  // Monitor LLM readiness — resolve pending load promise
  useEffect(() => {
    if (llm && llm.isReady) {
      console.log("[LLM] LLM is ready");
      setIsLLMReady(true);
      isLLMReadyRef.current = true;
      if (loadResolverRef.current) {
        loadResolverRef.current(true);
        loadResolverRef.current = null;
      }
    } else {
      setIsLLMReady(false);
      isLLMReadyRef.current = false;
    }
  }, [llm?.isReady]);

  // Monitor LLM error — reject pending load promise
  useEffect(() => {
    if (llm?.error) {
      console.error("[LLM] Load error:", llm.error.message);
      setError(llm.error.message);
      // Reject the pending load promise so loadModel() doesn't hang
      if (loadResolverRef.current) {
        loadResolverRef.current(false);
        loadResolverRef.current = null;
      }
    }
  }, [llm?.error]);

  const loadModel = useCallback(async (): Promise<Result<void>> => {
    if (isInitialized && shouldLoadModel && isLLMReadyRef.current) {
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

    console.log("[LLM] Triggering model download + load...");
    setShouldLoadModel(true);

    if (isLLMReadyRef.current) {
      return { success: true, data: undefined };
    }

    console.log("[LLM] Waiting for model download + load...");
    const ready = await Promise.race([
      new Promise<boolean>((resolve) => {
        loadResolverRef.current = resolve;
      }),
      // 10 min timeout for large model downloads
      new Promise<boolean>((resolve) =>
        setTimeout(() => resolve(false), 10 * 60 * 1000),
      ),
    ]);

    if (!ready) {
      const msg = llm?.error?.message || "Model failed to load within 10m";
      console.error("[LLM] Model load failed:", msg);
      return { success: false, error: msg };
    }

    console.log("[LLM] Model loaded successfully");
    return { success: true, data: undefined };
  }, [isInitialized, shouldLoadModel, llm?.error]);

  const generate = useCallback(
    async (prompt: string): Promise<Result<string>> => {
      setIsGenerating(true);

      if (!isLLMReadyRef.current) {
        const errorMsg = "LLM model is not ready. Call loadModel() first.";
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
    [service],
  );

  const generateSOAPNote = useCallback(
    async (transcript: string): Promise<Result<string>> => {
      setIsGenerating(true);

      if (!isLLMReadyRef.current) {
        const errorMsg = "LLM model is not ready. Call loadModel() first.";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      setError(null);
      const result = await service.generateSOAPNote(transcript);

      if (result.success) {
        setResponse(result.data);
      } else {
        setError(result.error);
      }

      setIsGenerating(false);
      return result;
    },
    [service],
  );

  const clearResponse = useCallback(() => {
    setResponse("");
    setError(null);
  }, []);

  return {
    loadModel,
    generate,
    generateSOAPNote,
    isGenerating,
    response,
    error,
    clearResponse,
    isLLMReady,
    downloadProgress: llm?.downloadProgress ?? 0,
  };
};