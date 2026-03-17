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

  useEffect(() => {
    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'Z',location:'use-audio.ts:23',message:'useAudio mounted',data:{audiosCount:audios.length,lastAudioEntryUri:lastAudioEntry?.uri ?? null,hasFetch:typeof globalThis.fetch === 'function'},timestamp:Date.now()})})?.catch(()=>{});
    // #endregion agent log
  }, []);

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
      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'A',location:'use-audio.ts:38',message:'handleAudioImport start',data:{audiosCount:audios.length,lastAudioEntryUri:lastAudioEntry?.uri ?? null,hasFetch:typeof globalThis.fetch === 'function'},timestamp:Date.now()})})?.catch(()=>{});
      // #endregion agent log
      const picked = await pickAudioFile();
      if (!picked) return;

      console.log(`[Ingestion] Picked Assets:`, picked);
      console.log(`[Ingestion] Picked URI: ${picked.uri}`);
      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'A',location:'use-audio.ts:48',message:'picked asset',data:{pickedUri:picked.uri,pickedName:picked.name,pickedSize:picked.size ?? null},timestamp:Date.now()})})?.catch(()=>{});
      // #endregion agent log

      // 1. Convert to 16kHz WAV in Cache
      console.log(`[Ingestion] Step 1: Converting to 16kHz WAV...`);
      const conversion = await convertToWav(picked.uri);
      
      if (!conversion.success) {
        console.error(`[Ingestion] Conversion failed: ${conversion.error}`);
        return;
      }
      console.log(`[Ingestion] Conversion Success. WAV URI: ${conversion.data}`);
      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'A',location:'use-audio.ts:62',message:'conversion success',data:{convertedUri:conversion.data},timestamp:Date.now()})})?.catch(()=>{});
      // #endregion agent log

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
      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'D',location:'use-audio.ts:104',message:'store updated',data:{storedUri:conversion.data,resolvedUri:resolveAudioUri(conversion.data,'poc')},timestamp:Date.now()})})?.catch(()=>{});
      // #endregion agent log
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
      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7371/ingest/2857af09-21c5-4024-a0ea-45a2e9d0878e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d9a11'},body:JSON.stringify({sessionId:'9d9a11',runId:'pre-fix',hypothesisId:'F',location:'use-audio.ts:118',message:'playAudio called',data:{lastAudioEntry:lastAudioEntry ? {uri:lastAudioEntry.uri,name:lastAudioEntry.name,size:lastAudioEntry.size ?? null,addedAt:lastAudioEntry.addedAt ?? null} : null,lastAudioUri,status:{playing:status.playing,currentTime:status.currentTime,duration:status.duration ?? null,playbackState:status.playbackState ?? null}},timestamp:Date.now()})})?.catch(()=>{});
      // #endregion agent log
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
