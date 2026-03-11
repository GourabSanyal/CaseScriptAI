import { useEffect, useMemo, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { pickAudioFile } from "@/services/audio/audio-picker";
import {
  deleteAudioFile,
  resolveAudioUri,
  ensureCaseDirectory,
} from "@/services/audio/audio-storage";
import { convertToWav } from "@/services/audio/audio-processor";
import { encryptFile, decryptFile } from "@/services/audio/crypto-service";
import { usePocStore } from "@/stores/poc-store";

export const useAudio = () => {
  const addAudio = usePocStore((s) => s.addAudio);
  const audios = usePocStore((s) => s.audios);

  const lastAudioEntry = audios.length > 0 ? audios[audios.length - 1] : null;

  // For playback, we need a decrypted version in Cache
  const lastAudioUri = useMemo(() => {
    if (!lastAudioEntry) return null;
    // Note: We resolve the encrypted file here, but for playback
    // we will decrypt it just-in-time.
    return resolveAudioUri(lastAudioEntry.uri);
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

      // 1. Convert to 16kHz WAV in Cache
      const conversion = await convertToWav(picked.uri);
      if (!conversion.success) {
        console.error("[Ingestion] Conversion failed");
        return;
      }

      // 2. Encrypt WAV to Documents/cases/poc/...
      const caseId = "poc"; // Hardcoded for POC
      await ensureCaseDirectory(caseId);
      const encryptedPath = `${Paths.document.uri}cases/${caseId}/${picked.name}.enc`;

      const encryption = await encryptFile(conversion.data, encryptedPath);
      if (!encryption.success) {
        console.error("[Ingestion] Encryption failed");
        return;
      }

      // 3. Cleanup: Delete picked temp file and converted WAV
      console.log("[Cleanup] Removing temporary files...");
      await deleteAudioFile(picked.uri);
      await deleteAudioFile(conversion.data);

      addAudio({
        uri: `${picked.name}.enc`, // Save filename only
        name: picked.name,
        size: picked.size,
        addedAt: Date.now(),
        iv: encryption.data.iv,
        tag: encryption.data.tag,
      });
      console.log("[Ingestion] Complete!");
    } catch (err) {
      console.error("[Ingestion] Error:", err);
    } finally {
      // Final cleanup attempt for any artifacts left in Cache
    }
  };

  const playAudio = async () => {
    if (
      !lastAudioEntry ||
      !lastAudioUri ||
      !lastAudioEntry.iv ||
      !lastAudioEntry.tag
    )
      return;

    try {
      // JIT Decryption for playback
      const tempPlaybackPath = `${Paths.cache.uri}play_${Date.now()}.wav`;
      const decryption = await decryptFile(
        lastAudioUri,
        tempPlaybackPath,
        lastAudioEntry.iv,
        lastAudioEntry.tag,
      );

      if (decryption.success) {
        player.replace(tempPlaybackPath);
        player.play();

        // Cleanup temp file after a delay or when player ends
        // (Simplified for POC: we just leave it for now or delete on next play)
      }
    } catch (err) {
      console.error("[Playback] Decryption failed:", err);
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
