import { useEffect, useMemo, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File } from "expo-file-system";
import { pickAudioFile } from "@/services/audio/audio-picker";
import {
  copyToDocuments,
  resolveAudioUri,
} from "@/services/audio/audio-storage";
import { usePocStore } from "@/stores/poc-store";
import type { AudioEntry } from "@/types/audio";

export const useAudio = () => {
  const addAudio = usePocStore((s) => s.addAudio);
  const audios = usePocStore((s) => s.audios);

  // determines the most recent audio track
  const lastAudioEntry = audios.length > 0 ? audios[audios.length - 1] : null;

  // resolves the full URI
  const lastAudioUri = useMemo(() => {
    if (!lastAudioEntry) return null;
    return resolveAudioUri(lastAudioEntry.uri);
  }, [lastAudioEntry]);

  // track the source actually loaded in the player to avoid redundant calls
  const currentSourceRef = useRef<string | null>(null);

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  // handle source replacement and verification
  useEffect(() => {
    const updateSource = async () => {
      if (!lastAudioUri) {
        currentSourceRef.current = null;
        return;
      }

      if (lastAudioUri !== currentSourceRef.current) {
        try {
          const fileSource = new File(lastAudioUri);
          if (fileSource.exists) {
            player.replace(lastAudioUri);
            currentSourceRef.current = lastAudioUri;
          }
        } catch (err) {
          // yet to implement
        }
      }
    };

    updateSource();
  }, [lastAudioUri, player]);

  const handleAudioImport = async (): Promise<void> => {
    const picked = await pickAudioFile();
    if (!picked) return;

    const result = await copyToDocuments(picked.uri);
    if (!result.success) {
      return;
    }

    addAudio({
      uri: result.data,
      name: picked.name,
      size: picked.size,
      addedAt: Date.now(),
    });
  };

  const playAudio = () => {
    if (
      lastAudioUri &&
      (status.playbackState === "readyToPlay" || status.isLoaded)
    ) {
      player.play();
    } else if (lastAudioUri) {
      player.play();
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
