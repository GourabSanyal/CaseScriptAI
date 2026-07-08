import { Directory, File, Paths } from "expo-file-system";

export const MODEL_PATHS = {
  whisper: {
    dir: "whisper",
    file: "ggml-base.bin",
  },
} as const;

/** Minimum bytes for a valid Whisper base GGML file (~142MB on disk). */
export const WHISPER_MIN_BYTES = 100 * 1024 * 1024;

export type ModelType = keyof typeof MODEL_PATHS;

export const getModelPath = (type: ModelType): string => {
  try {
    const modelsDir = new Directory(Paths.document, "models");
    const config = MODEL_PATHS[type];
    const modelDir = new Directory(modelsDir, config.dir);
    const modelFile = new File(modelDir, config.file);
    // Strip file:// scheme if present - ExecuTorch expects raw filesystem paths
    const path = modelFile.uri;
    return path.startsWith("file://") ? path.slice(7) : path;
  } catch (error) {
    console.error(`[ModelUtils] Error getting path for ${type}:`, error);
    return "";
  }
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
      whisper: WHISPER_MIN_BYTES,
    };

    const minSize = minSizeBytes[type] || 0;

    if (fileSize < minSize) {
      console.warn(
        `[ModelUtils] ${type} file too small: ${fileSize} bytes (expected > ${minSize}). Likely a failed download or error response.`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[ModelUtils] Error checking existence for ${type}:`, error);
    return false;
  }
};
