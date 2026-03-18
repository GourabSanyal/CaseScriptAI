import { useEffect, useMemo, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { pickAudioFile } from "@/services/audio/audio-picker";
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

      const copied = await copyToDocuments(picked.uri, caseId);
      if (!copied.success) {
        console.error("[Ingestion] Copy failed:", copied.error);
        return;
      }

      // Cleanup: Delete picked temp file
      console.log("[Cleanup] Removing temporary files...");
      await deleteAudioFile(picked.uri);

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
