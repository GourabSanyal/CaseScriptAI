import { NativeModules } from "react-native";
import { Paths } from "expo-file-system";
import type { Result } from "@/types/result";

export const convertToWav = async (
  inputPath: string,
): Promise<Result<string>> => {
  try {
    const ffmpegNativeModule = (NativeModules as any)
      ?.FFmpegKitReactNativeModule;
    if (!ffmpegNativeModule) {
      console.error(
        "[FFmpeg] Native module FFmpegKitReactNativeModule not available. NativeModules keys:",
        Object.keys(NativeModules ?? {}),
      );
      return {
        success: false,
        error:
          "FFmpeg native module not available (native linking missing or running Expo Go).",
      };
    }

    // Lazy import so the app doesn't crash at startup if ffmpeg-kit native
    // module isn't linked/available (e.g., running in Expo Go).
    const { FFmpegKit, ReturnCode } = await import(
      "ffmpeg-kit-react-native"
    );
    console.log("[FFmpeg] ffmpeg-kit-react-native module loaded");

    console.log(`[FFmpeg] Starting conversion for: ${inputPath}`);
    const timestamp = Date.now();
    const outputPath = `${Paths.cache.uri}temp_${timestamp}.wav`.replace(
      "file://",
      "",
    );
    const formattedInput = inputPath.replace("file://", "");

    // Command: -i input -acodec pcm_s16le -ac 1 -ar 16000 output.wav
    const command = `-i "${formattedInput}" -acodec pcm_s16le -ac 1 -ar 16000 "${outputPath}"`;

    console.log(`[FFmpeg] Executing: ${command}`);
    const session = await FFmpegKit.execute(command);
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
    console.error("[FFmpeg] Import/execute threw:", err);
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "FFmpeg import/execute failed";
    return { success: false, error: message };
  }
};
