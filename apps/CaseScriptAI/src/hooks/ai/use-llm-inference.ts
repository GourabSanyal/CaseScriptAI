import { useState, useCallback, useEffect, useMemo } from "react";
import { useLLM } from "react-native-executorch";
import { createLLMService } from "@/services/ai/llm-inference";
import { initializeExecutorch } from "@/services/ai/llm-inference";
import { checkModelExists, getModelPath } from "@/services/ai/model-utils";
import type { Result } from "@/types/result";

export const useLLMInference = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLLMReady, setIsLLMReady] = useState(false);
  // Lazy loading: model stays prevented until explicitly requested
  const [shouldLoadModel, setShouldLoadModel] = useState(false);

  const modelExists = checkModelExists("phi");
  const modelPath = getModelPath("phi");

  console.log("[LLM] Model exists:", modelExists, "Path:", modelPath);

  // For .pte models, the tokenizer might be embedded in the model file
  // Try pointing all sources to the same file, or use empty paths if that fails
  const llmConfig = useMemo(
    () => ({
      model: {
        modelName: "phi-2" as unknown as Parameters<typeof useLLM>[0]["model"]["modelName"],
        // For GGUF format, ExecuTorch expects filesystem path without file:// scheme
        modelSource: { uri: modelPath },
        // GGUF includes tokenizer; if not, we'll get an error we can catch
        tokenizerSource: { uri: modelPath },
        tokenizerConfigSource: { uri: modelPath },
      },
      // Only load when user explicitly triggered loading
      preventLoad: !shouldLoadModel,
    }),
    [modelPath, shouldLoadModel],
  );

  const llm = useLLM(llmConfig);
  const service = createLLMService(llm);

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
    if (isInitialized && shouldLoadModel && isLLMReady) {
      console.log("[LLM] Model already loaded");
      return { success: true, data: undefined };
    }

    if (!checkModelExists("phi")) {
      return { success: false, error: "Phi model not downloaded" };
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

    // Step 3: Wait for the model to actually be ready
    // Poll isReady with exponential backoff (max 5 minutes)
    console.log("[LLM] Waiting for model to be ready...");
    let attempts = 0;
    let delay = 100; // Start with 100ms
    while (!isLLMReady && attempts < 300) {
      if (attempts % 10 === 0) {
        console.log("[LLM] Still loading... attempt", attempts, "isReady:", isLLMReady);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 1000); // Cap at 1s, grow exponentially
      attempts++;
    }

    if (!isLLMReady) {
      console.error("[LLM] Model load timeout after", attempts, "attempts");
      return { success: false, error: "Model failed to load within timeout (5m)" };
    }

    console.log("[LLM] Model loaded successfully after", attempts, "attempts");
    return { success: true, data: undefined };
  }, [isInitialized, shouldLoadModel, isLLMReady]);

  const generate = useCallback(
    async (prompt: string): Promise<Result<string>> => {
      setIsGenerating(true);
      
      if (!isInitialized || !shouldLoadModel) {
        const errorMsg = "ExecuTorch not initialized. Call loadModel() first.";
        setError(errorMsg);
        setIsGenerating(false);
        return { success: false, error: errorMsg };
      }

      if (!checkModelExists("phi")) {
        const errorMsg = "Phi model not downloaded";
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

      if (!checkModelExists("phi")) {
        const errorMsg = "Phi model not downloaded";
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