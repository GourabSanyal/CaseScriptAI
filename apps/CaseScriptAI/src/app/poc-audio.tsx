/**
 * THROWAWAY POC SCREEN — branch: POC_remove_ffmpeg
 *
 * Goal: prove/disprove that we can drop ffmpeg-kit (RETIRED) and rely on
 * platform-native audio instead, producing the 16kHz / mono / 16-bit PCM WAV
 * that whisper.rn requires.
 *
 *   Scenario A — Live recording, NO conversion:
 *     react-native-live-audio-stream captures raw 16k/mono/16-bit PCM chunks;
 *     we prepend a 44-byte WAV header in pure JS and transcribe.
 *
 *   Scenario B — Imported arbitrary audio, native decode + resample:
 *     react-native-audio-api decodeAudioData() + OfflineAudioContext resamples
 *     to 16k mono, we export PCM -> WAV in JS and transcribe.
 *
 * This file is intentionally self-contained. It MUST NOT be imported by product
 * code and will be deleted with poc.tsx before V1. Only the whisper transcribe
 * helper is reused (the thing we are validating against), not modified.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import LiveAudioStream from "react-native-live-audio-stream";
import {
  AudioManager,
  decodeAudioData,
  OfflineAudioContext,
} from "react-native-audio-api";

import { transcribeAudio } from "@/services/ai/whisper-inference";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS = 1;
const TARGET_BIT_DEPTH = 16;

// ---------------------------------------------------------------------------
// Pure helpers (WAV header + PCM conversion + base64) — no native deps
// ---------------------------------------------------------------------------
const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) t[B64_CHARS.charCodeAt(i)] = i;
  return t;
})();

const base64ToBytes = (b64: string): Uint8Array => {
  const len = b64.length;
  if (len === 0) return new Uint8Array(0);
  let pad = 0;
  if (b64[len - 1] === "=") pad++;
  if (b64[len - 2] === "=") pad++;
  const byteLen = Math.floor((len * 3) / 4) - pad;
  const out = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const n =
      (B64_LOOKUP[b64.charCodeAt(i)] << 18) |
      (B64_LOOKUP[b64.charCodeAt(i + 1)] << 12) |
      (B64_LOOKUP[b64.charCodeAt(i + 2)] << 6) |
      B64_LOOKUP[b64.charCodeAt(i + 3)];
    if (p < byteLen) out[p++] = (n >> 16) & 0xff;
    if (p < byteLen) out[p++] = (n >> 8) & 0xff;
    if (p < byteLen) out[p++] = n & 0xff;
  }
  return out;
};

const writeAscii = (view: DataView, offset: number, str: string): void => {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
};

// Canonical 44-byte PCM WAV header.
const buildWavHeader = (
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitDepth: number,
): Uint8Array => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const blockAlign = (channels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (PCM)
  view.setUint16(20, 1, true); // AudioFormat = PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);
  return new Uint8Array(buffer);
};

// Read back the header bytes we (or a decoder) produced — kill-switch test #5.
type ParsedHeader = {
  riff: string;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  dataBytes: number;
};
const parseWavHeader = (bytes: Uint8Array): ParsedHeader => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (o: number, n: number) =>
    Array.from({ length: n }, (_, i) => String.fromCharCode(bytes[o + i])).join("");
  return {
    riff: ascii(0, 4),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitDepth: view.getUint16(34, true),
    dataBytes: view.getUint32(40, true),
  };
};

const floatToPcm16 = (input: Float32Array): Uint8Array => {
  const out = new Uint8Array(input.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
};

const writeWavFile = (
  name: string,
  pcmBytes: Uint8Array,
  sampleRate: number,
  channels: number,
  bitDepth: number,
): File => {
  const header = buildWavHeader(pcmBytes.length, sampleRate, channels, bitDepth);
  const full = new Uint8Array(header.length + pcmBytes.length);
  full.set(header, 0);
  full.set(pcmBytes, header.length);
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(full);
  return file;
};

const concatChunks = (chunks: Uint8Array[], total: number): Uint8Array => {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
type TestResult = {
  label: string;
  ok: boolean | null;
  header?: ParsedHeader;
  durationSec?: number;
  timings?: Record<string, number>;
  transcript?: string;
  error?: string;
  note?: string;
};

const PoCAudioScreen = (): React.JSX.Element => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  const chunksRef = useRef<Uint8Array[]>([]);
  const totalBytesRef = useRef(0);
  const recordStartRef = useRef(0);
  const listenerBoundRef = useRef(false);

  const log = useCallback((msg: string) => {
    const line = `${new Date().toISOString().substring(11, 23)}  ${msg}`;
    console.log(`[POC-AUDIO] ${msg}`);
    setLogs((prev) => [...prev, line]);
  }, []);

  const pushResult = useCallback((r: TestResult) => {
    setResults((prev) => [r, ...prev]);
  }, []);

  // Bind the live-audio data listener exactly once.
  useEffect(() => {
    if (listenerBoundRef.current) return;
    listenerBoundRef.current = true;
    LiveAudioStream.on("data", (b64: string) => {
      const bytes = base64ToBytes(b64);
      chunksRef.current.push(bytes);
      totalBytesRef.current += bytes.length;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Shared: validate header + transcribe a produced WAV file.
  // -------------------------------------------------------------------------
  const validateAndTranscribe = useCallback(
    async (file: File, label: string, extra: Partial<TestResult>) => {
      const headerBytes = (await file.bytes()).slice(0, 44);
      const header = parseWavHeader(headerBytes);
      const headerOk =
        header.riff === "RIFF" &&
        header.sampleRate === TARGET_SAMPLE_RATE &&
        header.channels === TARGET_CHANNELS &&
        header.bitDepth === TARGET_BIT_DEPTH;
      log(
        `header: riff=${header.riff} rate=${header.sampleRate} ch=${header.channels} bits=${header.bitDepth} data=${header.dataBytes}B (${headerOk ? "OK" : "BAD"})`,
      );

      const t0 = Date.now();
      const tr = await transcribeAudio(file.uri);
      const transcribeMs = Date.now() - t0;
      log(`transcribe ${transcribeMs}ms -> ${tr.success ? "ok" : "FAIL"}`);

      pushResult({
        label,
        ok: headerOk && tr.success,
        header,
        transcript: tr.success ? tr.data : undefined,
        error: tr.success ? undefined : tr.error,
        timings: { ...(extra.timings ?? {}), transcribeMs },
        durationSec: header.dataBytes / (header.sampleRate * 2 * header.channels),
        note: extra.note,
      });
    },
    [log, pushResult],
  );

  // -------------------------------------------------------------------------
  // Scenario A — live recording (no conversion)
  // -------------------------------------------------------------------------
  const startRecording = useCallback(async () => {
    try {
      const perm = await AudioManager.requestRecordingPermissions();
      log(`mic permission: ${perm}`);
      if (perm !== "Granted") {
        pushResult({ label: "A: live record", ok: false, error: `permission ${perm}` });
        return;
      }
      if (Platform.OS === "ios") {
        AudioManager.setAudioSessionOptions({
          iosCategory: "playAndRecord",
          iosMode: "measurement",
          iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
        });
        await AudioManager.setAudioSessionActivity(true);
      }

      chunksRef.current = [];
      totalBytesRef.current = 0;
      LiveAudioStream.init({
        sampleRate: TARGET_SAMPLE_RATE,
        channels: TARGET_CHANNELS,
        bitsPerSample: TARGET_BIT_DEPTH,
        audioSource: 6, // Android VOICE_RECOGNITION
        bufferSize: 4096,
        wavFile: "", // unused: we build the WAV ourselves from data events
      });
      recordStartRef.current = Date.now();
      LiveAudioStream.start();
      setIsRecording(true);
      log(`recording @ ${TARGET_SAMPLE_RATE}Hz mono 16-bit ...`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`start error: ${msg}`);
      pushResult({ label: "A: live record", ok: false, error: msg });
    }
  }, [log, pushResult]);

  const stopRecording = useCallback(async () => {
    try {
      setIsRecording(false);
      await LiveAudioStream.stop();
      if (Platform.OS === "ios") await AudioManager.setAudioSessionActivity(false);

      const elapsedSec = (Date.now() - recordStartRef.current) / 1000;
      const total = totalBytesRef.current;
      const pcm = concatChunks(chunksRef.current, total);
      chunksRef.current = [];
      log(
        `captured ${total}B PCM in ${elapsedSec.toFixed(1)}s (~${(total / 1024 / 1024).toFixed(2)}MB)`,
      );

      setBusy("Transcribing live recording...");
      const file = writeWavFile(
        `poc_live_${Date.now()}.wav`,
        pcm,
        TARGET_SAMPLE_RATE,
        TARGET_CHANNELS,
        TARGET_BIT_DEPTH,
      );
      log(`wrote ${file.uri}`);
      await validateAndTranscribe(file, `A: live record (${elapsedSec.toFixed(0)}s)`, {
        note: "raw PCM straight from mic, header added in JS — no resample",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`stop error: ${msg}`);
      pushResult({ label: "A: live record", ok: false, error: msg });
    } finally {
      setBusy(null);
    }
  }, [log, pushResult, validateAndTranscribe]);

  // -------------------------------------------------------------------------
  // Scenario B — import arbitrary audio, native decode + resample
  // -------------------------------------------------------------------------
  const pickAndDecode = useCallback(async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["audio/*", "video/mp4"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        log("pick cancelled");
        return;
      }
      const asset = picked.assets[0];
      const ext = (asset.name?.split(".").pop() ?? "?").toLowerCase();
      log(`picked ${asset.name} (${asset.mimeType ?? "?"})`);
      setBusy(`Decoding .${ext} ...`);

      // 1) Native decode (this is where unsupported formats — e.g. opus/ogg on
      //    iOS — should throw cleanly rather than emit garbage).
      let decoded;
      const tDecode = Date.now();
      try {
        decoded = await decodeAudioData(asset.uri);
      } catch (decodeErr) {
        const msg = decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
        log(`DECODE FAILED for .${ext}: ${msg}`);
        pushResult({
          label: `B: import .${ext}`,
          ok: false,
          error: `native decode failed: ${msg}`,
          note: "decode error caught cleanly (expected for unsupported formats)",
        });
        return;
      }
      const decodeMs = Date.now() - tDecode;
      log(
        `decoded: rate=${decoded.sampleRate} ch=${decoded.numberOfChannels} dur=${decoded.duration.toFixed(1)}s in ${decodeMs}ms`,
      );

      // 2) Resample -> 16k + downmix -> mono via OfflineAudioContext.
      const tResample = Date.now();
      const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
      const offline = new OfflineAudioContext({
        numberOfChannels: TARGET_CHANNELS,
        length: frames,
        sampleRate: TARGET_SAMPLE_RATE,
      });
      const src = offline.createBufferSource();
      src.buffer = decoded;
      src.connect(offline.destination);
      src.start(0);
      const rendered = await offline.startRendering();
      const resampleMs = Date.now() - tResample;
      const mono = rendered.getChannelData(0);
      log(
        `resampled -> ${rendered.sampleRate}Hz mono, ${mono.length} samples in ${resampleMs}ms`,
      );

      // 3) Export PCM -> WAV (44-byte header in JS) and validate + transcribe.
      setBusy(`Transcribing .${ext} import...`);
      const file = writeWavFile(
        `poc_import_${Date.now()}.wav`,
        floatToPcm16(mono),
        TARGET_SAMPLE_RATE,
        TARGET_CHANNELS,
        TARGET_BIT_DEPTH,
      );
      log(`wrote ${file.uri}`);
      await validateAndTranscribe(file, `B: import .${ext}`, {
        timings: { decodeMs, resampleMs },
        note: `src ${decoded.sampleRate}Hz/${decoded.numberOfChannels}ch -> 16k/mono`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`import error: ${msg}`);
      pushResult({ label: "B: import", ok: false, error: msg });
    } finally {
      setBusy(null);
    }
  }, [log, pushResult, validateAndTranscribe]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>POC: Remove FFmpeg</Text>
      <Text style={styles.sub}>
        Native audio pipeline → 16kHz / mono / 16-bit WAV → whisper.rn
      </Text>

      <Pressable
        style={[styles.btn, isRecording ? styles.btnStop : styles.btnRec]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={busy !== null}
      >
        <Text style={styles.btnText}>
          {isRecording ? "■ Stop & Transcribe" : "● Record (live PCM)"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.btnPick]}
        onPress={pickAndDecode}
        disabled={busy !== null || isRecording}
      >
        <Text style={styles.btnText}>Pick & Decode File</Text>
      </Pressable>

      {busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator />
          <Text style={styles.busyText}>{busy}</Text>
        </View>
      )}

      {results.map((r, i) => (
        <View
          key={`${r.label}-${i}`}
          style={[
            styles.card,
            r.ok === true ? styles.cardPass : r.ok === false ? styles.cardFail : null,
          ]}
        >
          <Text style={styles.cardTitle}>
            {r.ok === true ? "PASS" : r.ok === false ? "FAIL" : "…"} · {r.label}
          </Text>
          {r.header && (
            <Text style={styles.mono}>
              hdr: {r.header.sampleRate}Hz / {r.header.channels}ch / {r.header.bitDepth}
              bit · {r.header.dataBytes}B
            </Text>
          )}
          {typeof r.durationSec === "number" && (
            <Text style={styles.mono}>dur: {r.durationSec.toFixed(1)}s</Text>
          )}
          {r.timings && (
            <Text style={styles.mono}>
              {Object.entries(r.timings)
                .map(([k, v]) => `${k}=${v}ms`)
                .join("  ")}
            </Text>
          )}
          {r.note && <Text style={styles.note}>{r.note}</Text>}
          {r.transcript !== undefined && (
            <Text style={styles.transcript}>“{r.transcript}”</Text>
          )}
          {r.error && <Text style={styles.error}>{r.error}</Text>}
        </View>
      ))}

      <Text style={styles.logHeader}>Log</Text>
      <View style={styles.logBox}>
        {logs.length === 0 ? (
          <Text style={styles.logEmpty}>No events yet.</Text>
        ) : (
          logs.map((l, i) => (
            <Text key={i} style={styles.logLine}>
              {l}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, paddingBottom: 80 },
  header: { fontSize: 26, fontWeight: "bold", color: "#111" },
  sub: { fontSize: 13, color: "#666", marginTop: 4, marginBottom: 20 },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
  btnRec: { backgroundColor: "#D7263D" },
  btnStop: { backgroundColor: "#1B1B1E" },
  btnPick: { backgroundColor: "#2563EB" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  busyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  busyText: { color: "#444" },
  card: {
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: "#F4F4F6",
    borderLeftWidth: 4,
    borderLeftColor: "#999",
  },
  cardPass: { borderLeftColor: "#16A34A" },
  cardFail: { borderLeftColor: "#DC2626" },
  cardTitle: { fontWeight: "700", marginBottom: 6, color: "#111" },
  mono: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, color: "#333" },
  note: { fontSize: 12, color: "#777", fontStyle: "italic", marginTop: 4 },
  transcript: { marginTop: 8, fontSize: 14, color: "#0F172A" },
  error: { marginTop: 6, fontSize: 12, color: "#DC2626" },
  logHeader: { marginTop: 24, fontWeight: "700", color: "#111" },
  logBox: { backgroundColor: "#0B0B0C", borderRadius: 8, padding: 10, marginTop: 8 },
  logEmpty: { color: "#666" },
  logLine: {
    color: "#9FE870",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
  },
});

export default PoCAudioScreen;
