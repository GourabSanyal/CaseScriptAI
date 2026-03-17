import { FFmpegKit, FFmpegKitConfig, ReturnCode } from "ffmpeg-kit-react-native";
import { Paths } from "expo-file-system";
import type { Result } from "@/types/result";

const toHelpfulFfmpegError = (message: string): string => {
  // Common when the native module isn't present in the Android build (Expo Go / no prebuild).
  if (
    message.includes("getLogLevel") ||
    message.includes("FFmpegKitConfig") ||
    message.toLowerCase().includes("of null")
  ) {
    return [
      "FFmpeg native module not initialized on Android.",
      "If you're using Expo, you must build a dev client / prebuild so `ffmpeg-kit-react-native` is compiled into the app.",
      `Original error: ${message}`,
    ].join(" ");
  }
  return message;
};

export const convertToWav = async (
  inputPath: string,
): Promise<Result<string>> => {
  try {
    // Avoid calling FFmpegKitConfig here: on Android builds without the native module,
    // FFmpegKitConfig methods can throw `...getLogLevel of null` before we even execute.

    console.log(`[FFmpeg] Starting conversion for: ${inputPath}`);
    const timestamp = Date.now();
    const outputPath = `${Paths.cache.uri}temp_${timestamp}.wav`.replace(
      "file://",
      "",
    );
    const formattedInput = inputPath.replace("file://", "");
    console.log(`[FFmpeg] Input: ${formattedInput}`);
    console.log(`[FFmpeg] Output: ${outputPath}`);

    const command = `-i "${formattedInput}" -acodec pcm_s16le -ac 1 -ar 16000 "${outputPath}"`;
    console.log(`[FFmpeg] Executing: ${command}`);

    const session = await FFmpegKit.execute(command);

    if (!session) {
      return { success: false, error: "FFmpeg session was null — native bridge not initialized" };
    }

    const returnCode = await session.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      console.log(`[FFmpeg] Conversion complete: file://${outputPath}`);
      return { success: true, data: `file://${outputPath}` };
    } else {
      const logs = await session.getLogsAsString();
      console.error(`[FFmpeg] Conversion failed: ${logs}`);
      return { success: false, error: "FFmpeg conversion failed" };
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : "FFmpeg error";
    const message = toHelpfulFfmpegError(raw);
    console.error(`[FFmpeg] Exception: ${message}`);
    return { success: false, error: message };
  }
};
