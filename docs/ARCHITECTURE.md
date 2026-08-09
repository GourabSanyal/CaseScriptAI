# CaseScriptAI — Architecture (Source of Truth)

> Privacy-first, **fully offline** on-device medical transcription for **iOS + Android**.
> All AI runs locally with ExecuTorch. No cloud inference. PHI never leaves the device.
>
> **Read this file first** at the start of every new chat/tab. Keep it in sync **before** changing code
> (see "Change Control" at the bottom). Companions: [`SLICES_PLAN.md`](./SLICES_PLAN.md), [`PROJECT_RULES.md`](../PROJECT_RULES.md).

---

## 1. Product Flow (source of truth)

1. **Launch** → `ModelManager.checkAllModelsReady()` verifies existence + checksum of every required asset (Whisper, tier-selected LLM `.pte` + tokenizer files). Any missing/corrupt → Download Screen for **only** the missing assets.
2. **Download Screen** → device capability assessed, correct LLM tier selected, assets downloaded sequentially with progress (native disk stream; ExecuTorch **not** loaded yet). Size-gated integrity while fetching. Continue → `initExecutorch` → Home.
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
Stores (Zustand)              device / download / recording / processing-queue / pipeline / session / auth / toast
        │
Services (no UI)              ai/  audio/  storage/  pdf/  subscription/  device/
        │
Foundation (contracts)        Result<T>, AppErrorCode, MemoryManager, Queues, State Machines
        │
Native modules                react-native-executorch, op-sqlite, MMKV, expo-device, audio-presence
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
| **AudioRecorderService** (`RecordingService`) | Captures audio to disk in rolling ~30s chunks (atomic write+rename). Loads **no** model. Depends on an injectable `AudioCapturePort` (native PCM adapter gated on `POC_remove_ffmpeg` §12). |
| **RecordingStateMachine** | Pure transitions for idle → permission → recording ↔ paused → stopping → queued; orphan detect/resume/discard; fail/reset. Restored mid-recording normalizes to `orphaned`. |
| **ForegroundSessionService** | Keeps recording alive when backgrounded (iOS bg-audio / Android mic foreground service). Simple tap-to-return notification. 30s checkpoint. |
| **AudioConversionService** | Imports only. Decode arbitrary format → 16kHz mono WAV. *(impl pending POC)* |
| **processing-queue-store** | Zustand queue of session IDs awaiting/in pipeline. Persist + restore; soft pending badge; cancel-with-confirm; fail→retry-once→`failed`. Implements `ProcessingEnqueuePort` for recording STOP. No audio bytes / PHI. |
| **PipelineOrchestrator** | Queue consumer. One session at a time. `tick`/`runUntilIdle`; Whisper then LLM; emits progress; `fail`→queue retry-once. |
| **WhisperService** | Acquire whisper lock → load → per-chunk path STT → `TranscriptQueue` append → delete WAV → unload+GC. Disk-partial resume via `hasChunk`. Injectable `WhisperRuntimePort` (ExecuTorch hook binding separate). |
| **LLMService** | Acquire llm lock → pre-check ready → generate SOAP (`prompts.ts`) → `validateSoapOutput` → interrupt before unload+GC. OOM → `MODEL_OOM`. Injectable `LlmRuntimePort`. |
| **pipeline-store** | UI progress (`phase`/`progress`/`error`); `startDrain` → orchestrator. |
| **pipeline-background** | AppState foreground → re-drain queue (auto-resume). |
| **MemoryManager** | Singleton mutex. `modelLoadLock: 'whisper'|'llm'|null`. `canLoadModel`, `acquire/releaseLock`, `forceGC`. |
| **SessionRepository** | op-sqlite/SQLCipher CRUD; indexes; date/patient search. |
| **DocumentExporter** | SOAP → PDF → share sheet. |
| **Storage (MMKV)** | Config, download state, checksums, feature flags. |
| **toast-store** + **ToastHost** | App-wide ephemeral notices (`showToast` / `dismissToast`). Host mounts once in root layout; screens/services never invent local banners. |
| **CallAudioPresence** (`audio-presence`) | Read-only: other app holds audio / in-call modes (cellular, FaceTime, VoIP). Used to warn before mic START; no PHI. |

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

- **Whisper + LLM:** both via **`react-native-executorch`** built-in model constants — STT: validated POC path `WHISPER_TINY` + `useSpeechToText`; LLM: Qwen3 tier constant (0.6B/1.7B/4B) + `useLLM`. Assets come from **Software Mansion HuggingFace** URLs; cache dir = `documentDirectory/react-native-executorch/`. Hooks use `preventLoad` until the app (not the Download Screen) needs inference.
- **Boot / RAM (jetsam):** Download Screen must **not** load ExecuTorch. Root layout resolves download vs app from **disk readiness only**; `initExecutorch` runs when entering `(app)` (Continue after download, or cold start with models already present). Keeps peak RAM under iOS ~2GB ActiveHard during large `.pte` fetches.
- **Transport:** per-file phased sequential via **native `createDownloadResumable` → disk** (no JS `arrayBuffer` of model bodies). LLM Range-resume: remainder → `.part`, then ≤1MB disk append onto the final file. Small assets = restart-from-zero. Progress/MMKV updates throttled.
- **Integrity during download:** size check against `FALLBACK_CHECKSUMS` / manifest (SHA not re-run on every progress tick — spreading multi‑MB buffers into JS arrays jetsams). Full SHA for small files remains available post-download; large `.pte` stay size-gated until streaming SHA lands.
- **Delete / re-test:** Download Screen can delete Whisper or **all LLM tiers** (Lite+Standard+Pro) plus `.part` leftovers and MMKV resume/checksum keys, then sweep any orphan `qwen3*` cache filenames.
- **Continue → Home:** init ExecuTorch → set boot destination `app` → `router.replace('/record')` only while root `Slot` stays mounted (`executorch-boot` flag). Do not flip destination to `app` before init or REPLACE to `(app)` fails with no navigator.
- Checksums: Worker JSON (`sha256`+`size`+`version`) → MMKV cache (30d TTL) → **hardcoded `FALLBACK_CHECKSUMS`**. Block on unverifiable when hashing is enabled.
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

**`processing-queue-store` (Slice 3.0)** owns the ordered session backlog that recording STOP feeds and `PipelineOrchestrator` (3.1) drains. Holds **session ids + queue metadata only** — never audio bytes, transcripts, or SOAP (paths stay in `AudioChunkQueue` / encrypted files).

| Item field | Meaning |
|---|---|
| `sessionId` | Opaque id (no patient name/id in queue rows) |
| `status` | `queued` \| `processing` \| `failed` |
| `enqueuedAt` | ms timestamp for FIFO + badge ETA |
| `retryCount` | `0` until first failure re-queues; `1` after auto-retry spent |
| `failureReason?` | Non-PHI short code/message when `failed` |

**API (store actions — all fallible ops → `Result<T>`):**

| Action | Behavior |
|---|---|
| `enqueue(sessionId)` | Append if absent (`queued`); idempotent; satisfies `ProcessingEnqueuePort` |
| `claimNext()` | First `queued` → `processing` (at most one `processing` at a time); `null` if none |
| `complete(sessionId)` | Remove from queue (pipeline wrote session artifacts elsewhere) |
| `fail(sessionId, reason)` | If `retryCount === 0` → re-`queued` + `retryCount = 1`; else → `failed` ("Needs attention") |
| `requeue(sessionId)` | Manual re-run from `failed` → `queued`, `retryCount = 0` (LLM-only path is orchestrator concern when transcript exists) |
| `cancel(sessionId)` | Remove item; invoke injected `onCancel(sessionId)` to delete recording assets (UI confirms first) |
| `pendingBadge()` | `{ pendingCount, estimatedMinutes }` — count of `queued`+`processing`; ETA from measured drain ms/session (injectable; `0` until samples exist) |

**Persistence:** injectable port (load/save item list). MVP wiring may use MMKV until Slice 4 SQLCipher `processing_queue` adapter. Restore on hydrate; crash mid-`processing` → treat as `queued` (orchestrator re-claims safely). No PHI in logs.

**Product rules (unchanged):**

- **No hard recording cap** — disk-gated + soft "N pending (~M min)" badge.
- Persist + **auto-resume** on launch (background, non-blocking indicator).
- **Cancel-with-confirm** (deletes recording). Reorder/priority deferred.
- Failure → **auto-retry once** (OOM → tier auto-heal downgrade lives in LLM/orchestrator) → skip + mark `failed` ("Needs attention", manual re-run).

---

## 10. Crash-Safe Recording

- Continuous ~30s chunks written to disk; **no reliance on shutdown hooks** (hard kills give no cleanup window).
- Temp file + **atomic rename** → half-written chunks discarded cleanly.
- Worst-case loss = single in-progress chunk (≤30s).
- Each finalized chunk is a complete **16 kHz / mono / 16-bit PCM WAV** path record enqueued to `AudioChunkQueue` (paths only — no audio bytes in JS queues).
- **RecordingStateMachine** owns UI/session phase; `AudioRecorderService` owns mic + disk. Neither loads Whisper/LLM.
- Orphaned-session recovery on relaunch → Resume / Discard (`orphaned` state after restore of `recording`/`paused`/`stopping`).
- Background recording via Option (b): stays alive + simple tap-to-return notification; STOP/PAUSE/RESUME in-app only.
- **Native capture adapter** still gated on §12 device results; product code programs against `AudioCapturePort` so Slice 2 logic is testable without locking the library.

---

## 11. Error Model

```
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: AppErrorCode };

enum AppErrorCode {
  MODEL_OOM, MODEL_CORRUPT, MODEL_MISSING,
  DOWNLOAD_NETWORK, DOWNLOAD_STORAGE, DOWNLOAD_CHECKSUM,
  AUDIO_PERMISSION, AUDIO_SESSION_BUSY, AUDIO_BUFFER_OVERFLOW,
  LLM_GENERATION_FAILED, SESSION_ORPHANED
}
```

---

## 12. Parked / Pending Decisions

- **Audio conversion / FFmpeg** — `ffmpeg-kit-react-native` is **bundled in the app binary** (1.6 download **NOT NEEDED**). Import uses that kit today; formal `AudioConversionService` (2.7) is optional rename. Foreground mic via `expo-audio` (2.1) is wired; FG notification (2.2) deferred.
- **Full parked/gated map:** [`SLICES_PLAN.md` — Parked & gated ledger](./SLICES_PLAN.md#parked--gated-ledger).

---

## 13. TDD Workflow (tests-first)

For every slice/sub-slice: **test plan → test skeleton + core cases → user approval → implement → all green → mark DONE in `SLICES_PLAN.md`**. New behavior/bugfix requires a new/updated test first. Never ship code for a slice with red/absent tests.

## 14. Change Control

1. New chat/tab → read this file + `SLICES_PLAN.md` first.
2. Architecture change → **update this file BEFORE code**.
3. Never introduce a new service/pattern/flow without recording it here first.
