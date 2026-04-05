import { Directory, File, Paths } from "expo-file-system";

export const MODEL_PATHS = {
  whisper: {
    dir: "whisper",
    file: "ggml-tiny.bin",
  },
  phi: {
    dir: "llm",
    file: "Phi-3-mini-instruct-q4.gguf",
  },
} as const;

export type ModelType = keyof typeof MODEL_PATHS;

export const getModelPath = (type: ModelType): string => {
  const modelsDir = Paths.document + "/models";
  const config = MODEL_PATHS[type];
  const modelDir = modelsDir + "/" + config.dir;
  const modelFile = modelDir + "/" + config.file;
  return modelFile;
};

export const checkModelExists = (type: ModelType): boolean => {
  try {
    const modelsDir = new Directory(Paths.document, "models");
    const config = MODEL_PATHS[type];
    const modelDir = new Directory(modelsDir, config.dir);
    const modelFile = new File(modelDir, config.file);
    
    if (!modelFile.exists) {
      return false;
    }
    
    // Validate file size - reject error responses and incomplete downloads
    const fileSize = modelFile.size;
    const minSizeBytes = {
      whisper: 67108864, // 64MB minimum for ggml-tiny.bin
      phi: 1610612736,   // 1.5GB minimum for Phi-3-mini-instruct (2.3GB actual)
    };
    
    const minSize = minSizeBytes[type] || 0;
    if (fileSize < minSize) {
      console.warn(
        `[ModelUtils] ${type} file too small: ${fileSize} bytes (expected > ${minSize}). Likely a failed download or error response.`
      );
      return false;
    }
    
    // File is valid and large enough
    return true;
  } catch (error) {
    console.warn(`[ModelUtils] Error checking existence for ${type}:`, error);
    return false;
  }
};
