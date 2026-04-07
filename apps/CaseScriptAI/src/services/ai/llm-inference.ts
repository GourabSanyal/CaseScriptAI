import { useLLM, initExecutorch, Message } from "react-native-executorch";
import { ExpoResourceFetcher } from "react-native-executorch-expo-resource-fetcher";
import { Directory, File, Paths } from "expo-file-system";
import { checkModelExists, MODEL_PATHS, getModelPath } from "./model-utils";
import { SOAP_NOTE_PROMPT } from "./prompts";
import type { Result } from "@/types/result";

let executorchInitialized = false;

// Initialize ExecuTorch with ResourceFetcher - call this early
export const initializeExecutorch = async (): Promise<Result<void>> => {
  try {
    if (executorchInitialized) {
      return { success: true, data: undefined };
    }

    console.log("[ExecuTorch] Initializing with ExpoResourceFetcher...");
    await initExecutorch({
      resourceFetcher: ExpoResourceFetcher,
    });

    executorchInitialized = true;
    console.log("[ExecuTorch] Initialized successfully");
    return { success: true, data: undefined };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ExecuTorch initialization failed";
    console.error("[ExecuTorch] Init error:", message);
    return { success: false, error: message };
  }
};

export interface LLMState {
  isGenerating: boolean;
  response: string;
  error: string | null;
}

export const createLLMService = (llm: ReturnType<typeof useLLM>) => {
  const generate = async (prompt: string): Promise<Result<string>> => {
    if (!prompt) {
      return { success: false, error: "Prompt is empty" };
    }

    try {
      // First ensure ExecuTorch is initialized
      const execResult = await initializeExecutorch();
      if (!execResult.success) {
        return { success: false, error: execResult.error };
      }

      // Check model exists
      if (!checkModelExists("phi")) {
        return {
          success: false,
          error: "Phi model not found. Please download it first.",
        };
      }

      const chat: Message[] = [
        { role: "system", content: "You are a medical documentation assistant." },
        { role: "user", content: prompt },
      ];

      if (!llm) {
        return { success: false, error: "LLM instance not ready" };
      }

      if (!llm.isReady) {
        return { success: false, error: "LLM model is still loading or prevented from loading" };
      }

      // Generate output
      await llm.generate(chat);

      const result = llm.response || "";
      return { success: true, data: result };

    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed";
      console.error("[LLM] Generate error:", message);
      return { success: false, error: message };
    }
  };

  const generateSOAPNote = async (transcript: string): Promise<Result<string>> => {
    const prompt = SOAP_NOTE_PROMPT(transcript);
    return generate(prompt);
  };

  return { generate, generateSOAPNote };
};