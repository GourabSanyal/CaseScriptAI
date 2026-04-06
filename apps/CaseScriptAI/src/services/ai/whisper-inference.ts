import { initWhisper, Whisper } from "whisper.rn";
import { Directory, File, Paths } from "expo-file-system";
import { checkModelExists, MODEL_PATHS } from "./model-utils";
import type { Result } from "@/types/result";

let whisperContext: Whisper | null = null;

export const initWhisperModel = async (): Promise<Result<Whisper>> => {
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

    const modelsDir = new Directory(Paths.document, "models");
    const whisperDir = new Directory(modelsDir, MODEL_PATHS.whisper.dir);
    const modelFile = new File(whisperDir, MODEL_PATHS.whisper.file);
    const modelPath = modelFile.uri.replace("file://", "");

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

export const transcribeAudio = async (
  audioPath: string,
): Promise<Result<string>> => {
  try {
    const contextResult = await initWhisperModel();
    if (!contextResult.success || !contextResult.data) {
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
    return { success: true, data: result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcription failed";
    console.error("[Whisper] Transcribe error:", message);
    return { success: false, error: message };
  }
};

export const releaseWhisper = async (): Promise<void> => {
  if (whisperContext) {
    try {
      await whisperContext.release();
      whisperContext = null;
      console.log("[Whisper] Model released");
    } catch (err) {
      console.error("[Whisper] Release error:", err);
    }
  }
};