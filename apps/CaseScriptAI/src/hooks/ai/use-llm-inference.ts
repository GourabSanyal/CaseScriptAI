import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLLM, PHI_4_MINI_4B } from "react-native-executorch";
import { createLLMService } from "@/services/ai/llm-inference";
import { initializeExecutorch } from "@/services/ai/llm-inference";
import { waitForCondition } from "@/utils/async-utils";
import type { Result } from "@/types/result";

export const useLLMInference = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLLMReady, setIsLLMReady] = useState(false);
  // Lazy loading: model stays prevented until explicitly requested
  const [shouldLoadModel, setShouldLoadModel] = useState(false);

  console.log("[LLM] Using PHI-4 Mini 4B model");

  // Use the predefined PHI-4 Mini model from react-native-executorch
  const llmConfig = useMemo(
    () => ({
      model: PHI_4_MINI_4B,
      // Only load when user explicitly triggered loading
      preventLoad: !shouldLoadModel,
    }),
    [shouldLoadModel],
  );

  const llm = useLLM(llmConfig);
  const llmRef = useRef<ReturnType<typeof useLLM> | null>(null);
  const service = createLLMService(llm);

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
      console.log("[LLM] LLM state - isReady:", llm?.isReady, "llm:", !!llm);
      setIsLLMReady(false);
    }
  }, [llm?.isReady]);

  /**
   * Prepares the LLM for inference: initializes ExecuTorch runtime and
   * triggers model loading. Waits for model to be fully ready.
   * Safe to call multiple times — idempotent once initialized.
   */
  const loadModel = useCallback(async (): Promise<Result<void>> => {
    if (isInitialized && shouldLoadModel && llmRef.current?.isReady) {
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
    console.log("[LLM] Waiting for model to be ready...");
    
    const isReady = await waitForCondition(
      () => !!llmRef.current?.isReady,
      {
        onAttempt: (attempt) => {
          if (attempt % 50 === 0) {
            console.log("[LLM] Still loading... attempt", attempt);
          }
        }
      }
    );

    if (!isReady) {
      console.error("[LLM] Model load timeout");
      return { success: false, error: "Model failed to load within timeout (5m)" };
    }

    console.log("[LLM] Model loaded successfully");
    return { success: true, data: undefined };
  }, [isInitialized, shouldLoadModel]);

  const generate = useCallback(
    async (prompt: string): Promise<Result<string>> => {
      setIsGenerating(true);
      
      if (!isInitialized || !shouldLoadModel) {
        const errorMsg = "ExecuTorch not initialized. Call loadModel() first.";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      if (!llm || !service) {
        const errorMsg = "LLM service not ready";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      if (!llm.isReady) {
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
    [service, llm, isInitialized, shouldLoadModel],
  );

  const generateSOAPNote = useCallback(
    async (transcript: string): Promise<Result<string>> => {
      setIsGenerating(true);
      
      if (!isInitialized || !shouldLoadModel) {
        const errorMsg = "ExecuTorch not initialized. Call loadModel() first.";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      if (!llm || !service) {
        const errorMsg = "LLM service not ready";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      if (!llm.isReady) {
        const errorMsg = "LLM model is still loading";
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
    [service, llm, isInitialized, shouldLoadModel],
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
  };
};