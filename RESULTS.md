# POC: Remove FFmpeg — Native Audio Pipeline Results

Branch: `POC_remove_ffmpeg` · Scope: throwaway POC only (`src/app/poc-audio.tsx` + this file + test deps).
Goal: decide whether CaseScriptAI can drop the **RETIRED** `ffmpeg-kit-react-native` and rely on
platform-native audio to produce the **16 kHz / mono / 16-bit PCM WAV** that `whisper.rn` requires.

> ⚠️ Status: code + tooling complete and type-clean. **On-device kill-switch runs are PENDING** —
> the native audio codecs and mic behavior must be confirmed on **real iOS + Android hardware**
> (simulators/emulators behave differently and are not acceptable evidence). Cells marked `PENDING`
> below must be filled in after running on devices. Expected outcomes are pre-annotated.

---

## Libraries installed (versions)

| Package | Version | Role |
|---|---|---|
| `react-native-live-audio-stream` | **1.1.1** | Scenario A — raw 16k/mono/16-bit PCM capture |
| `react-native-audio-api` (Software Mansion) | **0.12.2** | Scenario B — `decodeAudioData()` + `OfflineAudioContext` resample |
| `whisper.rn` | **0.6.0** | STT validator (also imported by existing product code; was missing from this branch's `package.json`) |

No FFmpeg and no ffmpeg-kit fork was added. `ffmpeg-kit-react-native` remains in `package.json` but
is **not used** by the POC screen — the comparison baseline below is the FFmpeg path on `main`/`mvp`.

### ⚠️ Build-risk to verify first
`react-native-audio-api@0.12.2` declares a peer dependency `react-native-worklets >= 0.6.0`, but this
project pins `react-native-worklets@0.5.1` (paired with `react-native-reanimated@4.1.1`). The POC does
**not** use any worklet nodes (only `decodeAudioData` + `OfflineAudioContext`), so runtime should be
unaffected, but confirm the native build links/compiles. If it fails, options: (a) bump worklets +
reanimated together, or (b) pin an older `react-native-audio-api` that accepts worklets 0.5.x.

---

## How to run

```bash
# from repo root
yarn install
yarn workspace casescriptai prebuild        # regenerate native projects with new pods/gradle
yarn workspace casescriptai ios             # real device (not simulator)
yarn workspace casescriptai android         # real device (not emulator)
```

Open the **“Audio”** tab (added to `app-tabs.tsx` as throwaway POC navigation).
Buttons: **Record (live PCM)**, **Pick & Decode File**. Each test prints the parsed WAV header
(sampleRate / channels / bitDepth / data bytes), per-stage timings, and the whisper transcript.

Suggested device protocol:
1. Read a fixed known passage (e.g. a ~30s scripted paragraph) for every recording test so accuracy
   is comparable across platforms and against the FFmpeg baseline.
2. For imports, use a real iPhone Voice Memo `.m4a`, plus an `.mp3`, `.wav`, `.aac`, and an `.ogg/.opus`
   (the expected-failure case).
3. Watch RSS in Xcode Instruments (iOS) / Android Studio Profiler while importing a long (~30 min) file.

---

## Kill-switch test matrix

> Fill `PENDING` cells from device runs. WER = word error rate vs the scripted passage.

| # | Test | iOS | Android | Notes |
|---|---|---|---|---|
| 1 | A: live record → 16k mono WAV → whisper, accuracy ≈ FFmpeg baseline | PENDING | — | Raw PCM, header in JS, no resample |
| 2 | A: same on Android | — | PENDING | `audioSource: 6` (VOICE_RECOGNITION) |
| 3 | B: import iPhone `.m4a` voice memo → decode+resample → whisper | PENDING | PENDING | Core import case |
| 4 | B: import `.mp3` and `.wav` → correct transcription | PENDING | PENDING | |
| 5 | Header bytes correct (rate=16000, ch=1, bits=16) — parsed & logged | PENDING | PENDING | Asserted in-app (`parseWavHeader`) |
| 6 | Memory: ~30 min import stays within a few hundred MB | PENDING | PENDING | See memory note below |

### Per-format decode matrix (Scenario B)

| Format | iOS expected | Android expected | iOS actual | Android actual |
|---|---|---|---|---|
| `.wav` (PCM) | ✅ decode | ✅ decode | PENDING | PENDING |
| `.mp3` | ✅ decode | ✅ decode | PENDING | PENDING |
| `.m4a` / AAC | ✅ decode | ✅ decode | PENDING | PENDING |
| `.aac` (raw ADTS) | ✅ likely | ⚠️ device-dependent | PENDING | PENDING |
| `.caf` | ✅ likely | ❌ likely | PENDING | PENDING |
| `.ogg` / `.opus` | ❌ expected fail (no iOS codec) | ✅ likely (Android has opus) | PENDING | PENDING |
| `.flac` | ⚠️ iOS 11+ maybe | ✅ likely | PENDING | PENDING |

Decode of unsupported formats is expected to **throw**, which the POC catches and reports as a clean
`native decode failed: …` result (no garbage audio). Kill-switch #6's failure-detection requirement
is satisfied by this `try/catch` around `decodeAudioData()`.

---

## Architecture validated in code

- **Scenario A** captures Int16 LE PCM chunks (base64) from the mic at 16 kHz/mono/16-bit, decodes
  base64 in pure JS, concatenates the raw bytes, prepends a canonical **44-byte WAV header** built in
  JS (`buildWavHeader`), and writes with `expo-file-system`'s `File.write(Uint8Array)`. No resample,
  no native conversion step — the hypothesis “capture is already Whisper-ready” holds structurally.
- **Scenario B** uses `decodeAudioData(uri)` then an `OfflineAudioContext({numberOfChannels:1,
  length:⌈dur·16000⌉, sampleRate:16000})` to **resample + downmix to mono in one render**, exports
  `Float32 → Int16` and writes the same JS WAV header.
- **Header verification (#5)** re-reads the first 44 bytes of every produced file and asserts
  `RIFF / 16000 / 1 / 16` before transcription.

## Memory notes (to confirm on device)

- Scenario A: raw PCM accumulates in JS. 30 min @ 16k/mono/16-bit ≈ **57.6 MB** — safe.
- Scenario B risk: `decodeAudioData()` decodes the **entire file into a Float32 PCM buffer in memory**
  (4 bytes/sample). A 30 min **stereo @ 44.1 kHz** source ≈ **~635 MB** of decoded PCM before
  resampling — this can blow the budget. If device profiling confirms this, the mitigation is
  chunked/streamed decoding (decode → resample → append in segments), which `react-native-audio-api`
  does not expose directly today. **This is the single biggest threat to a native-only Scenario B.**

---

## Recommendation

> Final call after device runs. Decision framework:

- **ADOPT native-only** if: Tests 1–5 pass on both platforms with WER within ~2–3% of the FFmpeg
  baseline, the worklets peer-dep build risk is resolved, and Scenario B memory for long imports stays
  within budget (or chunked decode is implemented).
- **Native for capture, keep a fallback for import** if: Scenario A is solid everywhere but Scenario B
  fails on key formats or blows memory on long files. Live recording (the primary product flow) goes
  native; arbitrary imports keep a converter.
- **KEEP FFmpeg** only if: native decode coverage or accuracy is materially worse across common
  formats AND the memory issue can’t be mitigated. Note this still requires solving the retirement of
  `ffmpeg-kit` (vendored binaries / maintained fork), which is its own liability.

Preliminary (pre-device) lean: **capture native (Scenario A) is low-risk and should be adopted**;
**import (Scenario B) is promising but gated on the long-file memory test and the opus/ogg-on-iOS gap.**

---

_Generated as part of the throwaway POC. Delete this file and `src/app/poc-audio.tsx` (and revert the
`app-tabs.tsx` tab entry) before V1._
