    # CaseScriptAI — Slice Plan & Tracker

> Canonical progress tracker. **Read this + [`ARCHITECTURE.md`](./ARCHITECTURE.md) + [`PROJECT_RULES.md`](../PROJECT_RULES.md) first** in every new chat/tab.
> Security-touching work: [`ARCHITECTURE.md` §15](./ARCHITECTURE.md) → [`OWASP_MOBILE_TOP_10.md`](./OWASP_MOBILE_TOP_10.md).
> Workflow: update the sub-slice to `IN PROGRESS` (with test plan) **before** work; mark `DONE` (with test + impl file links) only when tests are green.
>
> Status legend: `TODO` · `IN PROGRESS` · `DONE` · `PARKED`

---

## Cross-cutting decisions (locked in grill — see ARCHITECTURE.md)

- Download: per-file phased sequential; **native disk stream** (not JS Range body buffers); **Range-resume for LLM**; restart for small assets.
- **Download RAM:** never `initExecutorch` on the Download Screen; size-only integrity while fetching; delete wipes all LLM tiers + `.part` residue.
- Runtime integration = ExecuTorch hooks with explicit load/unload; `MemoryManager` enforces no co-residency.- Device tiering: 3 tiers (Qwen3 0.6B/1.7B/4B); Assess→Commit→Verify(warmup)→Auto-heal; sub-3GB served Lite.
- Memory: Whisper & LLM never co-resident; recording loads no model; peak <2GB on 3GB device.
- Recording: batch (no live transcript); 30s chunks→disk atomic; background Option (b).
- Storage: op-sqlite/SQLCipher + AES-GCM files + MMKV config; OS-level app lock.
- Checksums: Worker→MMKV→hardcoded fallback; block on unverifiable.
- Queue: no hard cap (disk-gated); persist+auto-resume; cancel-with-confirm; fail→retry once→skip+flag.
- **FFmpeg/audio-conversion PARKED** pending `POC_remove_ffmpeg` device tests — see **Parked & gated ledger** below.

---

## Parked & gated ledger

> Do **not** unpark rows below until their gate clears. `PARKED` = no product code yet. `GATED` = logic/`DONE` with stub/port; native or infra still missing. Canonical decision: [`ARCHITECTURE.md` §12](./ARCHITECTURE.md).

### Gate: `POC_remove_ffmpeg` (ARCHITECTURE §12)

Branch validates **native raw-PCM capture + native decoders** vs keeping FFmpeg. Outcome decides whether 1.6 is implemented or **deleted**.

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **1.6** | `downloadFFmpeg()` | **NOT NEEDED** | — | FFmpeg ships in-app via `ffmpeg-kit-react-native` native binary — no separate download. |
| **2.1 native** | Real `AudioCapturePort` mic adapter | DONE (foreground) | **Slice 2** | [`expo-audio-capture.ts`](../apps/CaseScriptAI/src/services/audio/expo-audio-capture.ts) — expo-audio segments + FFmpeg→PCM; no FG notification yet. |
| **2.2 native** | Real FG / bg-audio notification | GATED (deferred) | **Slice 2** | Skip until background recording needed. |
| **2.7** | `AudioConversionService` (imports → 16 kHz mono WAV) | PARKED formal / **bridge works** | **Slice 2** | Home **Import audio** already uses bundled FFmpeg (`import-audio-to-queue.ts`). Formal 2.7 rename optional. |

**Note:** 1.6 dropped (FFmpeg in binary). 2.1 foreground mic done. 2.2 optional. 2.7 formal optional — Import bridge already works.

### Gate: ExecuTorch device binding (Slice 3 stubs)

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **3.RT** | Bind `useSpeechToText` / `useLLM` → `WhisperRuntimePort` / `LlmRuntimePort` | DONE (device bind) | **Slice 3** | [`use-bind-pipeline-runtimes.ts`](../apps/CaseScriptAI/src/hooks/ai/use-bind-pipeline-runtimes.ts) + [`pipeline-runtime-bridge.ts`](../apps/CaseScriptAI/src/services/ai/pipeline-runtime-bridge.ts); mounted in `(app)/_layout`. |
| **2.7 bridge** | Temp local-file import via POC FFmpeg | TEMP (not 2.7 DONE) | **Slice 2** formal after §12 | [`import-audio-to-queue.ts`](../apps/CaseScriptAI/src/services/audio/import-audio-to-queue.ts) + Home **Import audio** — for ASAP testing only. |
| **3.SHA** | Streaming SHA for large `.pte` (today size-gated) | GATED (1.10 size-safe DONE) | **Slice 1** follow-up or **Slice 7** | Optional hardening; not blocking Slice 4. |

### Gate: Storage / crypto (intentional Slice 4+)

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **4.SQL** | SQLCipher adapters for `sessions` / `processing_queue` / `audio_chunks` | DONE (sessions runtime; queue/chunks adapters + schema) | **Slice 4** | Sessions via `session-repository` + `initAppStorage`. Queue still MMKV at runtime (sync hydrate); SQL adapters tested for queue/chunks. |
| **4.AES** | AES-GCM encrypted transcript + SOAP files | DONE (SOAP files) | **Slice 4** (`4.5`/`4.6`) | SOAP encrypted via `encrypted-soap` + Keychain key. Transcript still MMKV segments until file adapter needed. |
| **4.PURGE** | Purge temp WAV after pipeline `COMPLETE` | DONE | **Slice 4.5** | `purgeSessionArtifacts` in soap persist port. |

### Gate: Resilience polish (Slice 5)

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **5.OOM** | Full OOM → tier auto-heal (download downgrade) mid-pipeline | DONE | **Slice 5.2** | Queue retry-once remains Slice 3; lasting tier persist + Download Screen is `OomHeal` after lock release. |
| **5.ORPH** | Broader session/AppState recovery beyond recording orphan | DONE | **Slice 5.5–5.6** | Recording Resume/Discard stays Slice 2.6; `AppRecovery` adds stale-lock, integrity, network retry. |

### Explicitly out of scope / deferred (not PARKED rows)

| Item | When (if ever) |
|---|---|
| Session reorder / priority in processing queue | Post-MVP |
| Hard recording time cap | Post-MVP (disk-gated only) |
| Live transcription during recording | Post-MVP |
| App-level PIN lock | OS device lock for MVP |
| i18n | Post-V1 |

---

## SLICE 0 — Foundation & Contracts

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 0.1 | Extend `Result<T>` + `AppErrorCode` enum | DONE | [`result.test.ts`](../apps/CaseScriptAI/src/__tests__/types/result.test.ts) | [`result.ts`](../apps/CaseScriptAI/src/types/result.ts) |
| 0.2 | `MemoryManager` singleton | DONE | [`memory-manager.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/memory-manager.test.ts) | [`memory-manager.ts`](../apps/CaseScriptAI/src/services/ai/memory-manager.ts) |
| 0.3 | `AudioChunkQueue` + `TranscriptQueue` (persist/restore) | DONE | [`audio-chunk-queue.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/audio-chunk-queue.test.ts), [`transcript-queue.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/transcript-queue.test.ts) | [`audio-chunk-queue.ts`](../apps/CaseScriptAI/src/services/audio/audio-chunk-queue.ts), [`transcript-queue.ts`](../apps/CaseScriptAI/src/services/ai/transcript-queue.ts) |
| 0.4 | `ModelStateMachine` | DONE | [`model-state-machine.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/model-state-machine.test.ts) | [`model-state-machine.ts`](../apps/CaseScriptAI/src/services/ai/model-state-machine.ts) |
| 0.5 | `DownloadStateMachine` | DONE | [`download-state-machine.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/download-state-machine.test.ts) | [`download-state-machine.ts`](../apps/CaseScriptAI/src/services/download/download-state-machine.ts) |
| 0.6 | `device-store` + `DeviceCapabilityService` + `LLMTierSelector` | DONE | [`device-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/device-store.test.ts), [`device-capability-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/device/device-capability-service.test.ts), [`llm-tier-selector.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/llm-tier-selector.test.ts) | [`device-store.ts`](../apps/CaseScriptAI/src/stores/device-store.ts), [`device-capability-service.ts`](../apps/CaseScriptAI/src/services/device/device-capability-service.ts), [`llm-tier-selector.ts`](../apps/CaseScriptAI/src/services/ai/llm-tier-selector.ts) |
| 0.7 | Unit tests for all of Slice 0 | DONE | `yarn workspace casescriptai test --runInBand` — 48 passing | [`jest.config.js`](../apps/CaseScriptAI/jest.config.js) |

## SLICE 1 — Download System

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 1.1 | `StorageChecker` | DONE | [`storage-checker.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/storage-checker.test.ts) | [`storage-checker.ts`](../apps/CaseScriptAI/src/services/download/storage-checker.ts) |
| 1.2 | `ChecksumValidator` (+ Worker/MMKV/fallback) | DONE | [`checksum-validator.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/checksum-validator.test.ts), [`fallback-checksums.test.ts`](../apps/CaseScriptAI/src/__tests__/constants/fallback-checksums.test.ts) | [`checksum-validator.ts`](../apps/CaseScriptAI/src/services/download/checksum-validator.ts), [`checksum-manifest.ts`](../apps/CaseScriptAI/src/services/download/checksum-manifest.ts), [`fallback-checksums.ts`](../apps/CaseScriptAI/src/constants/fallback-checksums.ts) |
| 1.3 | `ResumableDownloadManager` + native disk stream to ExecuTorch cache (throttled progress; no JS model buffers) | DONE | [`resumable-download-manager.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/resumable-download-manager.test.ts), [`streaming-download-transport.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/streaming-download-transport.test.ts) | [`resumable-download-manager.ts`](../apps/CaseScriptAI/src/services/download/resumable-download-manager.ts), [`streaming-download-transport.ts`](../apps/CaseScriptAI/src/services/download/streaming-download-transport.ts), [`streaming-download-fs.ts`](../apps/CaseScriptAI/src/services/download/streaming-download-fs.ts), [`download-runtime.ts`](../apps/CaseScriptAI/src/stores/download-runtime.ts) |
| 1.4 | ExecuTorch STT download (`WHISPER_TINY` — progress, retry, readiness) | DONE | [`executorch-model-download.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/executorch-model-download.test.ts), [`executorch-resource.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/executorch-resource.test.ts) | [`executorch-model-download.ts`](../apps/CaseScriptAI/src/services/download/executorch-model-download.ts), [`executorch-resource.ts`](../apps/CaseScriptAI/src/services/download/executorch-resource.ts), [`executorch-resource-fetch.ts`](../apps/CaseScriptAI/src/services/download/executorch-resource-fetch.ts), [`model-assets.ts`](../apps/CaseScriptAI/src/services/download/model-assets.ts) |
| 1.5 | ExecuTorch LLM download (tier `.pte` + tokenizer) | DONE | [`executorch-model-download.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/executorch-model-download.test.ts) | [`executorch-model-download.ts`](../apps/CaseScriptAI/src/services/download/executorch-model-download.ts), [`model-assets.ts`](../apps/CaseScriptAI/src/services/download/model-assets.ts) |
| 1.6 | `downloadFFmpeg()` | **NOT NEEDED** | | Bundled via `ffmpeg-kit-react-native` — no runtime download |
| 1.7 | `download-store` | DONE | [`download-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/download-store.test.ts) | [`download-store.ts`](../apps/CaseScriptAI/src/stores/download-store.ts), [`run-model-download.ts`](../apps/CaseScriptAI/src/services/download/run-model-download.ts) |
| 1.8 | Download Screen (progress, delete all LLM tiers, Continue→init ExecuTorch→`/record`) | DONE | [`download-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/download-store.test.ts), [`delete-model-assets.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/delete-model-assets.test.ts), [`executorch-resource-delete.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/executorch-resource-delete.test.ts) | [`model-download.tsx`](../apps/CaseScriptAI/src/app/(onboarding)/model-download.tsx), [`model-download-view.tsx`](../apps/CaseScriptAI/src/components/model-download/model-download-view.tsx), [`delete-model-assets.ts`](../apps/CaseScriptAI/src/services/download/delete-model-assets.ts), [`_layout.tsx`](../apps/CaseScriptAI/src/app/_layout.tsx), [`executorch-boot.ts`](../apps/CaseScriptAI/src/services/ai/executorch-boot.ts) |
| 1.9 | Integration tests (NetInfo/checksum/storage/Range/auto-heal) | DONE | [`slice1-integration.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/slice1-integration.test.ts) | — |
| 1.10 | `ModelManager.checkAllModelsReady()` + size-safe integrity (`file-integrity` / no giant `toHex` spreads) | DONE | [`model-manager.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/model-manager.test.ts), [`file-integrity.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/file-integrity.test.ts) | [`model-manager.ts`](../apps/CaseScriptAI/src/services/ai/model-manager.ts), [`model-manager-runtime.ts`](../apps/CaseScriptAI/src/services/ai/model-manager-runtime.ts), [`file-integrity.ts`](../apps/CaseScriptAI/src/services/download/file-integrity.ts), [`index.tsx`](../apps/CaseScriptAI/src/app/index.tsx) |

> **Slice 1 device note (jetsam):** Peak RAM must stay &lt; ~2GB ActiveHard on 3GB phones. Do not reintroduce JS Range `fetch`+`arrayBuffer` for `.pte` files; do not `initExecutorch` before models are on disk; do not re-hash on every download progress tick.

## SLICE 2 — Recording System *(native capture adapter gated on POC; logic via `AudioCapturePort`)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 2.1 | `AudioRecorderService` (30s chunks→disk, atomic, permissions) | DONE | [`audio-recorder-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/audio-recorder-service.test.ts), [`wav-chunk-writer.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/wav-chunk-writer.test.ts), [`expo-audio-capture.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/expo-audio-capture.test.ts) | [`audio-recorder-service.ts`](../apps/CaseScriptAI/src/services/audio/audio-recorder-service.ts), [`expo-audio-capture.ts`](../apps/CaseScriptAI/src/services/audio/expo-audio-capture.ts), [`recording-runtime.ts`](../apps/CaseScriptAI/src/stores/recording-runtime.ts) — **foreground mic wired**; 2.2 FG notification deferred |
| 2.2 | `ForegroundSessionService` (background alive, notification, checkpoint) | DONE | [`foreground-session-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/foreground-session-service.test.ts) | [`foreground-session-service.ts`](../apps/CaseScriptAI/src/services/audio/foreground-session-service.ts) — **real FG notification GATED** → Slice 2 with 2.1 native ([ledger](#parked--gated-ledger)) |
| 2.3 | `RecordingStateMachine` | DONE | [`recording-state-machine.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/recording-state-machine.test.ts) | [`recording-state-machine.ts`](../apps/CaseScriptAI/src/services/audio/recording-state-machine.ts), [`recording.ts`](../apps/CaseScriptAI/src/types/recording.ts) |
| 2.4 | `recording-store` | DONE | [`recording-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/recording-store.test.ts) | [`recording-store.ts`](../apps/CaseScriptAI/src/stores/recording-store.ts), [`recording-runtime.ts`](../apps/CaseScriptAI/src/stores/recording-runtime.ts) |
| 2.5 | START always enabled; enqueue; processing badge | DONE | [`recording-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/recording-store.test.ts) | [`record.tsx`](../apps/CaseScriptAI/src/app/(app)/record.tsx), [`pending-session-queue.ts`](../apps/CaseScriptAI/src/services/audio/pending-session-queue.ts) |
| 2.6 | Orphaned-session recovery | DONE | [`recording-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/recording-store.test.ts), [`recording-state-machine.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/recording-state-machine.test.ts) | [`recording-store.ts`](../apps/CaseScriptAI/src/stores/recording-store.ts), [`record.tsx`](../apps/CaseScriptAI/src/app/(app)/record.tsx) |
| 2.7 | `AudioConversionService` (imports) | PARKED | | **Ledger:** complete in Slice 2 after §12 decoder choice |
| 2.8 | Unit tests | DONE | `yarn workspace casescriptai test --runInBand --testPathPattern='(recording-state-machine\|wav-chunk-writer\|audio-recorder-service\|foreground-session-service\|recording-store)'` — 20 passing | — |

## SLICE 3 — Processing Pipeline

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 3.0 | `processing-queue-store` | DONE | [`processing-queue-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/processing-queue-store.test.ts) | [`processing-queue-store.ts`](../apps/CaseScriptAI/src/stores/processing-queue-store.ts), [`processing-queue.ts`](../apps/CaseScriptAI/src/types/processing-queue.ts), [`recording-runtime.ts`](../apps/CaseScriptAI/src/stores/recording-runtime.ts) |
| 3.1 | `PipelineOrchestrator` (queue consumer, events) | DONE | [`pipeline-orchestrator.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/pipeline-orchestrator.test.ts) | [`pipeline-orchestrator.ts`](../apps/CaseScriptAI/src/services/ai/pipeline-orchestrator.ts) |
| 3.2 | `WhisperService` (lock, per-chunk, disk-partial, unload) | DONE | [`whisper-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/whisper-service.test.ts) | [`whisper-service.ts`](../apps/CaseScriptAI/src/services/ai/whisper-service.ts) |
| 3.3 | `LLMService` (pre-check, interrupt-before-delete, OOM) | DONE | [`llm-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/llm-service.test.ts) | [`llm-service.ts`](../apps/CaseScriptAI/src/services/ai/llm-service.ts), [`output-validator.ts`](../apps/CaseScriptAI/src/services/ai/output-validator.ts), [`prompts.ts`](../apps/CaseScriptAI/src/services/ai/prompts.ts) |
| 3.4 | `pipeline-store` | DONE | [`pipeline-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/pipeline-store.test.ts) | [`pipeline-store.ts`](../apps/CaseScriptAI/src/stores/pipeline-store.ts), [`pipeline-store.ts` types](../apps/CaseScriptAI/src/types/pipeline-store.ts), [`pipeline-runtime.ts`](../apps/CaseScriptAI/src/stores/pipeline-runtime.ts) |
| 3.5 | Processing Screen | DONE | (view wired; unit coverage via pipeline-store + queue) | [`processing.tsx`](../apps/CaseScriptAI/src/app/(app)/processing.tsx), [`processing-view.tsx`](../apps/CaseScriptAI/src/components/processing/processing-view.tsx) |
| 3.6 | Background continuation | DONE | [`pipeline-background.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/pipeline-background.test.ts) | [`pipeline-background.ts`](../apps/CaseScriptAI/src/services/ai/pipeline-background.ts), [`pipeline-runtime.ts`](../apps/CaseScriptAI/src/stores/pipeline-runtime.ts) |
| 3.7 | Unit tests (mocked models, OOM→auto-heal) | DONE | `yarn workspace casescriptai test --runInBand --testPathPattern='(processing-queue-store\|pipeline-orchestrator\|whisper-service\|llm-service\|pipeline-store\|pipeline-background)'` — 28 passing | — |

> **Slice 3 device note:** ExecuTorch ports bound via `useBindPipelineRuntimes` (3.RT). Live mic still GATED on §12 (2.1). Temp **Import audio** uses FFmpeg (`2.7 bridge`) — do not mark 2.7 DONE. SOAP encryption → Slice 4.

## SLICE 4 — Storage & Sessions

> Picks up ledger **4.SQL / 4.AES / 4.PURGE** (SQLCipher queue/chunks, encrypted SOAP files, Keychain keys, purge after COMPLETE).

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 4.1 | `SessionRepository` (op-sqlite/SQLCipher, schema, indexes) | DONE | [`session-repository.test.ts`](../apps/CaseScriptAI/src/__tests__/services/storage/session-repository.test.ts), [`sql-persistence.test.ts`](../apps/CaseScriptAI/src/__tests__/services/storage/sql-persistence.test.ts) | [`session-repository.ts`](../apps/CaseScriptAI/src/services/storage/session-repository.ts), [`memory-sql.ts`](../apps/CaseScriptAI/src/services/storage/memory-sql.ts), [`sql-persistence.ts`](../apps/CaseScriptAI/src/services/storage/sql-persistence.ts), [`session-runtime.ts`](../apps/CaseScriptAI/src/stores/session-runtime.ts) |
| 4.2 | `DocumentExporter` (PDF + share) | DONE | [`document-exporter.test.ts`](../apps/CaseScriptAI/src/__tests__/services/pdf/document-exporter.test.ts) | [`document-exporter.ts`](../apps/CaseScriptAI/src/services/pdf/document-exporter.ts) |
| 4.3 | `session-store` | DONE | [`session-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/session-store.test.ts) | [`session-store.ts`](../apps/CaseScriptAI/src/stores/session-store.ts), [`session.ts`](../apps/CaseScriptAI/src/types/session.ts) |
| 4.4 | Sessions Screen | DONE | (wired Records tab; coverage via session-store) | [`queue.tsx`](../apps/CaseScriptAI/src/app/(app)/queue.tsx) |
| 4.5 | Storage cleanup (purge chunks post-COMPLETE) | DONE | [`encrypted-soap.test.ts`](../apps/CaseScriptAI/src/__tests__/services/storage/encrypted-soap.test.ts) | [`encrypted-soap.ts`](../apps/CaseScriptAI/src/services/storage/encrypted-soap.ts), [`pipeline-runtime.ts`](../apps/CaseScriptAI/src/stores/pipeline-runtime.ts) |
| 4.6 | Unit tests + Keychain/Keystore key wiring | DONE | [`key-store.test.ts`](../apps/CaseScriptAI/src/__tests__/services/storage/key-store.test.ts), [`encrypted-soap.test.ts`](../apps/CaseScriptAI/src/__tests__/services/storage/encrypted-soap.test.ts) | [`key-store.ts`](../apps/CaseScriptAI/src/services/storage/key-store.ts), [`crypto-service.ts`](../apps/CaseScriptAI/src/services/audio/crypto-service.ts), [`_layout.tsx`](../apps/CaseScriptAI/src/app/_layout.tsx) |

## SLICE 5 — Error Recovery & Resilience

> Picks up ledger **5.OOM / 5.ORPH** (full tier auto-heal; global AppState/session recovery beyond 2.6 + 3.6).

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 5.1 | GlobalErrorHandler | DONE | [`global-error-handler.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/global-error-handler.test.ts) | [`global-error-handler.ts`](../apps/CaseScriptAI/src/services/recovery/global-error-handler.ts) |
| 5.2 | OOM recovery + auto-heal | DONE | [`oom-heal.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/oom-heal.test.ts) | [`oom-heal.ts`](../apps/CaseScriptAI/src/services/recovery/oom-heal.ts), [`pipeline-runtime.ts`](../apps/CaseScriptAI/src/stores/pipeline-runtime.ts), [`recovery-runtime.ts`](../apps/CaseScriptAI/src/stores/recovery-runtime.ts) |
| 5.3 | Corruption recovery → re-download | DONE | [`global-error-handler.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/global-error-handler.test.ts), [`app-recovery.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/app-recovery.test.ts) | [`app-recovery.ts`](../apps/CaseScriptAI/src/services/recovery/app-recovery.ts) |
| 5.4 | Network recovery / retry queue | DONE | [`app-recovery.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/app-recovery.test.ts) | [`app-recovery.ts`](../apps/CaseScriptAI/src/services/recovery/app-recovery.ts), [`use-app-recovery.ts`](../apps/CaseScriptAI/src/hooks/use-app-recovery.ts) |
| 5.5 | Session recovery (resume/discard) | DONE | [`app-recovery.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/app-recovery.test.ts) | [`app-recovery.ts`](../apps/CaseScriptAI/src/services/recovery/app-recovery.ts) — inspect only; Resume/Discard remains recording-store |
| 5.6 | AppState recovery (re-check invariants) | DONE | [`app-recovery.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/app-recovery.test.ts), [`memory-manager.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/memory-manager.test.ts) | [`memory-manager.ts`](../apps/CaseScriptAI/src/services/ai/memory-manager.ts), [`use-app-recovery.ts`](../apps/CaseScriptAI/src/hooks/use-app-recovery.ts), [`_layout.tsx`](../apps/CaseScriptAI/src/app/_layout.tsx) |
| 5.7 | Regression suite (all edge cases) | DONE | [`slice5-regression.test.ts`](../apps/CaseScriptAI/src/__tests__/services/recovery/slice5-regression.test.ts) — `yarn workspace casescriptai test --runInBand --testPathPattern='(global-error-handler\\|oom-heal\\|app-recovery\\|slice5-regression\\|memory-manager)'` — 24 passing | — |

## SLICE 6 — Test Suite Completion

> Existing Slice 0–5 units kept (no second suite). Detox skipped. Live &lt;2GB peak is Xcode Instruments / Android Profiler on a ~3GB phone.

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 6.1 | Unit tests (services/machines/stores) | DONE | `yarn workspace casescriptai test --runInBand` — 53 suites / 199 passing; gap fill [`wav-parser.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/wav-parser.test.ts) | existing services / machines / stores |
| 6.2 | Integration tests (full pipeline, resumption) | DONE | [`slice6-pipeline.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/slice6-pipeline.test.ts) | [`pipeline-orchestrator.ts`](../apps/CaseScriptAI/src/services/ai/pipeline-orchestrator.ts), [`whisper-service.ts`](../apps/CaseScriptAI/src/services/ai/whisper-service.ts), [`pipeline-background.ts`](../apps/CaseScriptAI/src/services/ai/pipeline-background.ts) |
| 6.3 | E2E (Maestro; Detox skipped) | DONE | [`.maestro/smoke.yaml`](../.maestro/smoke.yaml) — `maestro test .maestro/smoke.yaml` (Android: `appId` `com.casescriptai.app`) | [`home-primary-actions.tsx`](../apps/CaseScriptAI/src/components/home/home-primary-actions.tsx), [`model-download-view.tsx`](../apps/CaseScriptAI/src/components/model-download/model-download-view.tsx), [`processing-view.tsx`](../apps/CaseScriptAI/src/components/processing/processing-view.tsx) |
| 6.4 | Performance benchmarks (<2GB peak, frame drops) | DONE | [`peak-ram-invariants.test.ts`](../apps/CaseScriptAI/src/__tests__/perf/peak-ram-invariants.test.ts) — Jest invariants; **device peak still you**: Instruments Allocations / Android Profiler | [`audio-chunk-queue.ts`](../apps/CaseScriptAI/src/services/audio/audio-chunk-queue.ts), [`memory-manager.ts`](../apps/CaseScriptAI/src/services/ai/memory-manager.ts) |

## SLICE 7 — Checksum Infra

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 7.1 | Cloudflare Worker checksum endpoint + deploy | TODO | | |
| 7.2 | Fallback strategy (folded into 1.2) | TODO | | |
