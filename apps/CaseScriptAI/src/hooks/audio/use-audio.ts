import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { pickAudioFile } from "@/services/audio/audio-picker";
import { convertToWav } from "@/services/audio/audio-processor";
import {
  deleteAudioFile,
  resolveAudioUri,
  ensureCaseDirectory,
  copyToDocuments,
} from "@/services/audio/audio-storage";
import { usePocStore } from "@/stores/poc-store";

export const useAudio = () => {
  const addAudio = usePocStore((s) => s.addAudio);
  const audios = usePocStore((s) => s.audios);

  const lastAudioEntry = audios.length > 0 ? audios[audios.length - 1] : null;

  const lastAudioUri = useMemo(() => {
    if (!lastAudioEntry) return null;
    // POC stores audio under Documents/cases/poc/
    return resolveAudioUri(lastAudioEntry.uri, "poc");
  }, [lastAudioEntry]);

  const currentSourceRef = useRef<string | null>(null);
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  const handleAudioImport = async (): Promise<void> => {
    try {
      console.log("[Ingestion] Starting import...");
      const picked = await pickAudioFile();
      if (!picked) return;

      console.log(`[Ingestion] Picked: ${picked.name}`);

      const caseId = "poc"; // Hardcoded for POC
      await ensureCaseDirectory(caseId);

      // Convert picked media to Whisper-compatible WAV before persisting.
      // On Android, continue with the original picked file if FFmpeg bridge
      // is unavailable at runtime to avoid blocking local import.
      const wavResult = await convertToWav(picked.uri);
      let sourceUriForCopy = picked.uri;
      let convertedTempUri: string | null = null;
      if (!wavResult.success) {
        if (Platform.OS === "android") {
          console.warn(
            `[FFmpeg] WAV conversion failed on Android, falling back to original file: ${wavResult.error}`,
          );
        } else {
          console.error(
            `[FFmpeg] WAV conversion failed: ${wavResult.error}`,
          );
          // Best-effort cleanup of any temp artifacts.
          await deleteAudioFile(picked.uri);
          return;
        }
      } else {
        sourceUriForCopy = wavResult.data;
        convertedTempUri = wavResult.data;
        console.log(`[FFmpeg] WAV conversion success: ${wavResult.data}`);
      }

      const copied = await copyToDocuments(sourceUriForCopy, caseId);
      if (!copied.success) {
        console.error(
          "[Ingestion] Copy failed:",
          copied.error,
        );
        await deleteAudioFile(picked.uri);
        if (convertedTempUri) {
          await deleteAudioFile(convertedTempUri);
        }
        return;
      }

      // Cleanup: Delete picked temp file
      console.log("[Cleanup] Removing temporary files...");
      await deleteAudioFile(picked.uri);
      if (convertedTempUri) {
        await deleteAudioFile(convertedTempUri);
      }

      addAudio({
        uri: copied.data, // Save filename only (stored unencrypted)
        name: picked.name,
        size: picked.size,
        addedAt: Date.now(),
      });
      console.log("[Ingestion] Complete!");
    } catch (err) {
      console.error("[Ingestion] Error:", err);
    } finally {
      // Final cleanup attempt for any artifacts left in Cache
    }
  };

  const playAudio = async () => {
    if (!lastAudioEntry || !lastAudioUri) return;

    try {
      const info = Paths.info(lastAudioUri);
      if (!info.exists || info.isDirectory) {
        console.error("[Playback] Missing audio file:", lastAudioUri);
        return;
      }
      player.replace(lastAudioUri);
      player.play();
    } catch (err) {
      console.error("[Playback] Failed:", err);
    }
  };

  const pauseAudio = () => {
    player.pause();
  };

  const seekTo = (seconds: number) => {
    if (status.duration > 0) {
      player.seekTo(seconds);
    }
  };

  return {
    handleAudioImport,
    audios,
    playAudio,
    pauseAudio,
    seekTo,
    isPlaying: status.playing,
    currentTime: status.currentTime,
    duration: status.duration || 0,
    playbackState: status.playbackState || "unknown",
  };
};
