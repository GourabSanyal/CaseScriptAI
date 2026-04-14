import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLLM, QWEN2_5_1_5B_QUANTIZED } from "react-native-executorch";
import { createLLMService } from "@/services/ai/llm-inference";
import { initializeExecutorch } from "@/services/ai/llm-inference";
import type { Result } from "@/types/result";

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

      // Step 1: Initialize ExecuTorch runtime
      console.log("[LLM] Initializing ExecuTorch...");
      const execResult = await initializeExecutorch();
      if (!execResult.success) {
        console.error("[LLM] ExecuTorch init failed:", execResult.error);
        return { success: false, error: execResult.error };
      }
      setIsInitialized(true);
      console.log("[LLM] ExecuTorch initialized");

      // Step 2: Allow useLLM to load the model (triggers re-render with preventLoad: false)
      console.log("[LLM] Triggering model load...");
      setShouldLoadModel(true);

      // Give React a chance to re-render and start the hook load process.
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Step 3: Wait for the model to actually be ready
      // Poll the latest llm readiness directly from the ref.
      console.log("[LLM] Waiting for model to be ready...");
      let attempts = 0;
      let delay = 100; // Start with 100ms
      while (!(llmRef.current?.isReady) && attempts < 300) {
        if (attempts % 50 === 0) { // Log less frequently
          console.log("[LLM] Still loading... attempt", attempts, "llmReady:", llmRef.current?.isReady, "llm:", !!llmRef.current);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 1000); // Cap at 1s, grow exponentially
        attempts++;
      }

      if (!(llmRef.current?.isReady)) {
        console.error("[LLM] Model load timeout after", attempts, "attempts");
        return { success: false, error: "Model failed to load within timeout (5m)" };
      }

      setIsLLMReady(true);
      console.log("[LLM] Model loaded successfully after", attempts, "attempts");
      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error in loadModel";
      console.error("[LLM] Unexpected error in loadModel:", message);
      return { success: false, error: message };
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

  return {
    loadModel,
    generate,
    generateSOAPNote,
    isGenerating,
    response,
    error,
    clearResponse,
    isLLMReady,
    getIsLLMReady,
  };
};
