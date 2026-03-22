import { Directory, File, Paths } from "expo-file-system";

export const MODEL_PATHS = {
  whisper: {
    dir: "whisper",
    file: "ggml-tiny.bin",
  },
  phi: {
    dir: "llm",
    file: "Phi-3-mini-4k-instruct-q4.gguf",
  },
} as const;

export type ModelType = keyof typeof MODEL_PATHS;

export const checkModelExists = (type: ModelType): boolean => {
  try {
    const modelsDir = new Directory(Paths.document, "models");
    const config = MODEL_PATHS[type];
    const modelDir = new Directory(modelsDir, config.dir);
    const modelFile = new File(modelDir, config.file);
    return modelFile.exists;
  } catch (error) {
    console.warn(`[ModelUtils] Error checking existence for ${type}:`, error);
    return false;
  }
};
