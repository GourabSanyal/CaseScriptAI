# CaseScriptAI — Architecture (Source of Truth)

> Privacy-first, **fully offline** on-device medical transcription for **iOS + Android**.
> All AI runs locally with ExecuTorch. No cloud inference. PHI never leaves the device.
>
> **Read this file first** at the start of every new chat/tab. Keep it in sync **before** changing code
> (see "Change Control" at the bottom). Companions: [`SLICES_PLAN.md`](./SLICES_PLAN.md), [`PROJECT_RULES.md`](../PROJECT_RULES.md).

---

## 1. Product Flow (source of truth)

1. **Launch** → `ModelManager.checkAllModelsReady()` verifies existence + checksum of every required asset (Whisper, tier-selected LLM `.pte` + tokenizer files). Any missing/corrupt → Download Screen for **only** the missing assets.
2. **Download Screen** → device capability assessed, correct LLM tier selected, assets downloaded sequentially with progress, checksum-validated, warmup-verified. Auto-redirect Home when all ready.
3. **Home** → doctor presses **START** → recording begins (audio captured to disk in rolling chunks).
4. **STOP** → completed session is enqueued into the **processing queue** (does *not* immediately block; doctor can record the next patient right away).
5. **Pipeline** (one session at a time): `AudioChunkQueue → Whisper → TranscriptQueue → LLM → SOAP note → SQLite`.
6. Sessions viewable in **Sessions Screen**. Optional patient fields (name/id/notes) addable during or after recording, never forced.
7. **Imported audio** (pre-recorded, any format) → `AudioConversionService` → same Whisper→LLM pipeline. *(Conversion strategy pending `POC_remove_ffmpeg` result — see §12.)*

---

## 2. Layered Architecture

```
UI (Expo Router screens)      app/(app|auth|onboarding)
        │
Stores (Zustand)              device / download / recording / processing-queue / pipeline / session / auth
        │
Services (no UI)              ai/  audio/  storage/  pdf/  subscription/
        │
Foundation (contracts)        Result<T>, AppErrorCode, MemoryManager, Queues, State Machines
        │
Native modules                react-native-executorch, op-sqlite, MMKV, expo-device
```

**Rules:** UI → Stores → Services → Foundation. Services never import UI. Screens never call native modules directly.

---

## 3. Key Services & Components

| Component | Responsibility |
|---|---|
| **ModelManager** | `checkAllModelsReady()`; existence + checksum gate before recording/processing; triggers targeted re-download. |
| **DeviceCapabilityService** | Reads total RAM, free disk, OS version; runs a versioned CPU micro-benchmark; returns capability data. |
| **LLMTierSelector** | Pure capability → tier mapping (Lite/Standard/Pro). RAM caps tier up; benchmark can only downgrade. `device-store` persists the selection. |
| **ResumableDownloadManager** | Owns **all** downloads. Per-file phased sequential. Range-resume (LLM) / restart (small). NetInfo + AppState aware. Retry w/ backoff. Persists per-asset state to MMKV. |
| **StorageChecker** | Pre-download free-disk check (asset size + 20% buffer). |
| **ChecksumValidator** | SHA-256 validation. Worker → MMKV cache (30d) → hardcoded fallback. **Block on unverifiable.** |
| **RecordingService** | Captures audio to disk in rolling ~30s chunks (atomic write+rename). Loads **no** model. |
| **ForegroundSessionService** | Keeps recording alive when backgrounded (iOS bg-audio / Android mic foreground service). Simple tap-to-return notification. 30s checkpoint. |
| **AudioConversionService** | Imports only. Decode arbitrary format → 16kHz mono WAV. *(impl pending POC)* |
| **PipelineOrchestrator** | Queue consumer. One session at a time. Drives Whisper then LLM. Emits progress events. |
| **WhisperService** | ExecuTorch `useSpeechToText` with `WHISPER_TINY`, matching the validated POC. Per-chunk, disk-partial, unload+GC. |
| **LLMService** | ExecuTorch `useLLM` with the selected Qwen3 tier. Pre-check + OOM handling. |
| **MemoryManager** | Singleton mutex. `modelLoadLock: 'whisper'|'llm'|null`. `canLoadModel`, `acquire/releaseLock`, `forceGC`. |
| **SessionRepository** | op-sqlite/SQLCipher CRUD; indexes; date/patient search. |
| **DocumentExporter** | SOAP → PDF → share sheet. |
| **Storage (MMKV)** | Config, download state, checksums, feature flags. |

---

## 4. Data Flow

**Recording (loads no model):**
```
mic → 30s PCM chunk → temp file → atomic rename → audio_chunks (SQLite path row)
STOP → session row status=QUEUED → processing_queue
```

**Queue contracts (Slice 0):** `AudioChunkQueue` and `TranscriptQueue` own ordering, acknowledgement, idempotency, and restore behavior through injected persistence ports. They do not persist PHI to MMKV. Concrete SQLCipher audio-backlog and encrypted transcript-file adapters are wired in Slices 3–4. `AudioChunkQueue.nextBatch()` is non-destructive and materializes at most 50 path records; removal happens only after transcript persistence succeeds.

**Pipeline (one session, one model at a time):**
```
next session ← processing_queue
  acquire Whisper lock → ExecuTorch `useSpeechToText` (`WHISPER_TINY`)
    for each chunk path (fed through AudioChunkQueue, ≤50 in flight):
        transcribe → append segment → TranscriptQueue (persisted) → delete WAV
  release Whisper (release + forceGC)
  acquire LLM lock → ExecuTorch `useLLM` (selected Qwen3 tier)
    concat TranscriptQueue → generate SOAP
  delete() + forceGC → release LLM
  save SOAP (encrypted file) → session status=COMPLETE → purge chunks
```

---

## 5. Invariants (NON-NEGOTIABLE)

1. **Never** load Whisper and LLM simultaneously — enforced at `MemoryManager`, not call sites.
2. **Recording loads no model** — mic → disk only. Enables record-while-processing without co-residency.
3. Peak RAM **< 2GB on a 3GB device**. Tier selection + KV-cache capping keep the LLM in budget.
4. **Never** hold audio bytes in JS memory — queues hold **file paths**; disk is the source of truth.
5. Every fallible function returns **`Result<T>`** — no try/catch-as-control-flow at call sites.
6. **Never** load a binary that isn't checksum-verified (block on unverifiable).
7. **Offline-first** — after initial download, zero internet required.
8. **PHI on-device only** — encrypted at rest; never logged in production.
9. Every long op emits **progress events** and handles **AppState** transitions.
10. Temp audio purged after pipeline `COMPLETE`.

---

## 6. Memory & Tiering

3 tiers (built-in ExecuTorch `8da4w` quantized):

| Tier | Total RAM | LLM | ~Loaded RAM |
|---|---|---|---|
| Lite | 3–4GB (or weak compute) | Qwen3 0.6B | ~0.6–0.9GB |
| Standard | 4–6GB | Qwen3 1.7B | ~1.3–1.7GB |
| Pro | > 6GB + healthy compute | Qwen3 4B | ~2.5–3GB |
| < 3GB | served **Lite**, gentle "may be slower" notice — never blocked | Qwen3 0.6B | — |

**Selection flow:** Assess (total RAM + versioned micro-benchmark) → Commit (`device-store` persists tier) → Verify (warmup load + short generate) → **Auto-heal** (downgrade + re-download during setup only, never mid-session). Rule: **RAM caps tier up; compute/benchmark can only downgrade.** Missing RAM safely selects Lite. Cross-platform available RAM is not part of the contract because Expo does not expose a reliable value. Whisper runtime/model = **ExecuTorch `useSpeechToText` + `WHISPER_TINY`**, matching the validated POC.

---

## 7. Downloads & Integrity

- **Whisper + LLM:** both via **`react-native-executorch`** built-in model constants — STT: validated POC path `WHISPER_TINY` + `useSpeechToText`; LLM: Qwen3 tier constant (0.6B/1.7B/4B) + `useLLM`. The library downloads `.pte` + tokenizer from **Software Mansion HuggingFace repos** (URLs shipped in the package); caches on device. Hooks use `preventLoad` until the Download Screen / pipeline triggers fetch.
- Per-file **phased sequential** *(future: custom manager for LLM)*. LLM `.pte` = **HTTP `Range`-resume** from on-disk offset (HEAD checks `Accept-Ranges`; else restart). Small assets = restart-from-zero.
- Checksums: Worker JSON (`sha256`+`size`+`version`, incl. tokenizer files) → MMKV cache (30d TTL) → **hardcoded `FALLBACK_CHECKSUMS` shipped for every tier**. Block on unverifiable.
- NetInfo pause/resume; AppState graceful pause; retry 3× exponential backoff (2s/4s/8s); pre-download disk check.

---

## 8. Storage

| Store | Data | Encryption |
|---|---|---|
| **op-sqlite + SQLCipher** | `sessions`, `processing_queue`, `audio_chunks` | Whole-DB at rest |
| **Files** | raw transcript, SOAP note | AES-GCM (`crypto-service`), key in Keychain/Keystore |
| **MMKV** | onboarding, download state, checksums, tier, timestamps | (device FS) |

App-level lock deferred to OS device lock (MVP). Rule: queryable → SQLite; singleton config → MMKV.

---

## 9. Processing Queue

- **No hard recording cap** — disk-gated + soft "N pending (~M min)" badge (estimate from measured drain time).
- Persist + **auto-resume** on launch (background, non-blocking indicator).
- **Cancel-with-confirm** (deletes recording). Reorder/priority deferred.
- Failure → **auto-retry once** (OOM → tier auto-heal downgrade) → skip + mark `failed` ("Needs attention", manual re-run; re-run LLM-only if transcript on disk).

---

## 10. Crash-Safe Recording

- Continuous ~30s chunks written to disk; **no reliance on shutdown hooks** (hard kills give no cleanup window).
- Temp file + **atomic rename** → half-written chunks discarded cleanly.
- Worst-case loss = single in-progress chunk (≤30s).
- Orphaned-session recovery on relaunch → Resume / Discard.
- Background recording via Option (b): stays alive + simple tap-to-return notification; STOP/PAUSE/RESUME in-app only.

---

## 11. Error Model

```
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: AppErrorCode };

enum AppErrorCode {
  MODEL_OOM, MODEL_CORRUPT, MODEL_MISSING,
  DOWNLOAD_NETWORK, DOWNLOAD_STORAGE, DOWNLOAD_CHECKSUM,
  AUDIO_PERMISSION, AUDIO_BUFFER_OVERFLOW,
  LLM_GENERATION_FAILED, SESSION_ORPHANED
}
```

---

## 12. Parked / Pending Decisions

- **Audio conversion / FFmpeg** — being validated on branch `POC_remove_ffmpeg` (native raw-PCM capture + native decoders vs. FFmpeg). Slices 1.6 / 2.1 / 2.7 gated on the result. FFmpeg download slice may be **deleted** if native path wins.

---

## 13. TDD Workflow (tests-first)

For every slice/sub-slice: **test plan → test skeleton + core cases → user approval → implement → all green → mark DONE in `SLICES_PLAN.md`**. New behavior/bugfix requires a new/updated test first. Never ship code for a slice with red/absent tests.

## 14. Change Control

1. New chat/tab → read this file + `SLICES_PLAN.md` first.
2. Architecture change → **update this file BEFORE code**.
3. Never introduce a new service/pattern/flow without recording it here first.
