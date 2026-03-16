import { useEffect, useMemo, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { pickAudioFile } from "@/services/audio/audio-picker";
import {
  deleteAudioFile,
  resolveAudioUri,
  ensureCaseDirectory,
  copyAudioToCase,
} from "@/services/audio/audio-storage";
import { convertToWav } from "@/services/audio/audio-processor";
import { encryptFile, decryptFile } from "@/services/audio/crypto-service";
import { usePocStore } from "@/stores/poc-store";
import { Audio } from "expo-av";

export const useAudio = () => {
  const addAudio = usePocStore((s) => s.addAudio);
  const audios = usePocStore((s) => s.audios);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
          playThroughEarpieceAndroid: false,
        });
        console.log("[Audio] Global session configured.");
      } catch (err) {
        console.error("[Audio] Failed to set audio mode:", err);
      }
    };
    setupAudio();
  }, []);

  const lastAudioEntry = audios.length > 0 ? audios[audios.length - 1] : null;



  // For playback, we need a decrypted version in Cache
  const lastAudioUri = useMemo(() => {
    if (!lastAudioEntry) return null;
    // Note: We resolve the file in the specific case directory
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

      console.log(`[Ingestion] Picked Assets:`, picked);
      console.log(`[Ingestion] Picked URI: ${picked.uri}`);

      // 1. Convert to 16kHz WAV in Cache
      console.log(`[Ingestion] Step 1: Converting to 16kHz WAV...`);
      const conversion = await convertToWav(picked.uri);
      if (!conversion.success) {
        console.error(`[Ingestion] Conversion failed: ${conversion.error}`);
        return;
      }
      console.log(`[Ingestion] Conversion Success. WAV URI: ${conversion.data}`);


      // 2. Cleanup: delete picked original, keep converted WAV in Cache for playback
      console.log("[Ingestion] Step 2: Cleaning up picked file...");
      console.log(`[Cleanup] Deleting picked file: ${picked.uri}`);
      await deleteAudioFile(picked.uri);

      console.log(`[Ingestion] Step 4: Updating store...`);
      addAudio({
        uri: conversion.data, // store full wav URI in cache
        name: picked.name,
        size: picked.size,
        addedAt: Date.now(),
      });
      console.log("[Ingestion] COMPLETE! Audio added to store.");

    } catch (err) {
      console.error("[Ingestion] Error:", err);
    } finally {
      // Final cleanup attempt for any artifacts left in Cache
    }
  };

  const playAudio = async () => {
    if (!lastAudioEntry || !lastAudioUri) return;

    try {
      console.log(`[Playback] Playing: ${lastAudioUri}`);

      player.replace(lastAudioUri);
      player.play();
    } catch (err) {
      console.error("[Playback] Error:", err);
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
