import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";
import { Paths } from "expo-file-system";
import type { Result } from "@/types/result";

export const convertToWav = async (
  inputPath: string,
): Promise<Result<string>> => {
  try {
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
    const message = err instanceof Error ? err.message : "FFmpeg error";
    return { success: false, error: message };
  }
};
