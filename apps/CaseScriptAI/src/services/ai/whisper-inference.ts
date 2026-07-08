import { initWhisper } from "whisper.rn";
import { getModelPath, checkModelExists } from "./model-utils";
import type { Result } from "@/types/result";

type WhisperContext = Awaited<ReturnType<typeof initWhisper>>;

let whisperContext: WhisperContext | null = null;

export const initWhisperModel = async (): Promise<Result<WhisperContext>> => {
  try {
    if (whisperContext) {
      return { success: true, data: whisperContext };
    }

    if (!checkModelExists("whisper")) {
      return {
        success: false,
        error: "Whisper model not found. Please download it first.",
      };
    }

    const modelPath = getModelPath("whisper");
    if (!modelPath) {
      return { success: false, error: "Could not resolve Whisper model path" };
    }

    console.log("[Whisper] Initializing with model:", modelPath);

    whisperContext = await initWhisper({
      filePath: modelPath,
    });

    console.log("[Whisper] Model initialized successfully");
    return { success: true, data: whisperContext };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Whisper initialization failed";
    console.error("[Whisper] Init error:", message);
    return { success: false, error: message };
  }
};

/**
 * Transcribe one audio file. Loads whisper.rn, runs inference, always releases.
 * Callers must not keep LLM loaded while this runs (MemoryManager comes later).
 */
export const transcribeAudio = async (
  audioPath: string,
): Promise<Result<string>> => {
  try {
    const contextResult = await initWhisperModel();
    if (!contextResult.success || !contextResult.data) {
      return { success: false, error: contextResult.error };
    }

    const context = contextResult.data;
    const cleanAudioPath = audioPath.replace(/^file:\/\//, "");

    console.log("[Whisper] Transcribing...");

    const { promise } = context.transcribe(cleanAudioPath, {
      language: "en",
      maxThreads: 4,
    });

    const { result } = await promise;

    console.log(
      "[Whisper] Transcription complete:",
      result.substring(0, 100),
    );
    return { success: true, data: result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcription failed";
    console.error("[Whisper] Transcribe error:", message);
    return { success: false, error: message };
  } finally {
    await releaseWhisper();
  }
};

export const releaseWhisper = async (): Promise<void> => {
  if (!whisperContext) return;

  try {
    await whisperContext.release();
    whisperContext = null;
    console.log("[Whisper] Model released");
  } catch (err) {
    console.error("[Whisper] Release error:", err);
  }
};
