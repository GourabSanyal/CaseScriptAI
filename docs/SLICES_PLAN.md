    # CaseScriptAI — Slice Plan & Tracker

> Canonical progress tracker. **Read this + [`ARCHITECTURE.md`](./ARCHITECTURE.md) + [`PROJECT_RULES.md`](../PROJECT_RULES.md) first** in every new chat/tab.
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
- **FFmpeg/audio-conversion PARKED** pending `POC_remove_ffmpeg` device tests.

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
| 1.6 | `downloadFFmpeg()` | PARKED | | pending POC |
| 1.7 | `download-store` | DONE | [`download-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/download-store.test.ts) | [`download-store.ts`](../apps/CaseScriptAI/src/stores/download-store.ts), [`run-model-download.ts`](../apps/CaseScriptAI/src/services/download/run-model-download.ts) |
| 1.8 | Download Screen (progress, delete all LLM tiers, Continue→init ExecuTorch→`/record`) | DONE | [`download-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/download-store.test.ts), [`delete-model-assets.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/delete-model-assets.test.ts), [`executorch-resource-delete.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/executorch-resource-delete.test.ts) | [`model-download.tsx`](../apps/CaseScriptAI/src/app/(onboarding)/model-download.tsx), [`model-download-view.tsx`](../apps/CaseScriptAI/src/components/model-download/model-download-view.tsx), [`delete-model-assets.ts`](../apps/CaseScriptAI/src/services/download/delete-model-assets.ts), [`_layout.tsx`](../apps/CaseScriptAI/src/app/_layout.tsx), [`executorch-boot.ts`](../apps/CaseScriptAI/src/services/ai/executorch-boot.ts) |
| 1.9 | Integration tests (NetInfo/checksum/storage/Range/auto-heal) | DONE | [`slice1-integration.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/slice1-integration.test.ts) | — |
| 1.10 | `ModelManager.checkAllModelsReady()` + size-safe integrity (`file-integrity` / no giant `toHex` spreads) | DONE | [`model-manager.test.ts`](../apps/CaseScriptAI/src/__tests__/services/ai/model-manager.test.ts), [`file-integrity.test.ts`](../apps/CaseScriptAI/src/__tests__/services/download/file-integrity.test.ts) | [`model-manager.ts`](../apps/CaseScriptAI/src/services/ai/model-manager.ts), [`model-manager-runtime.ts`](../apps/CaseScriptAI/src/services/ai/model-manager-runtime.ts), [`file-integrity.ts`](../apps/CaseScriptAI/src/services/download/file-integrity.ts), [`index.tsx`](../apps/CaseScriptAI/src/app/index.tsx) |

> **Slice 1 device note (jetsam):** Peak RAM must stay &lt; ~2GB ActiveHard on 3GB phones. Do not reintroduce JS Range `fetch`+`arrayBuffer` for `.pte` files; do not `initExecutorch` before models are on disk; do not re-hash on every download progress tick.

## SLICE 2 — Recording System *(native capture adapter gated on POC; logic via `AudioCapturePort`)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 2.1 | `AudioRecorderService` (30s chunks→disk, atomic, permissions) | DONE | [`audio-recorder-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/audio-recorder-service.test.ts), [`wav-chunk-writer.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/wav-chunk-writer.test.ts) | [`audio-recorder-service.ts`](../apps/CaseScriptAI/src/services/audio/audio-recorder-service.ts), [`wav-chunk-writer.ts`](../apps/CaseScriptAI/src/services/audio/wav-chunk-writer.ts), [`wav-pcm.ts`](../apps/CaseScriptAI/src/services/audio/wav-pcm.ts) — native `AudioCapturePort` adapter still pending §12 |
| 2.2 | `ForegroundSessionService` (background alive, notification, checkpoint) | DONE | [`foreground-session-service.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/foreground-session-service.test.ts) | [`foreground-session-service.ts`](../apps/CaseScriptAI/src/services/audio/foreground-session-service.ts) — real FG notification pending native capture |
| 2.3 | `RecordingStateMachine` | DONE | [`recording-state-machine.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/recording-state-machine.test.ts) | [`recording-state-machine.ts`](../apps/CaseScriptAI/src/services/audio/recording-state-machine.ts), [`recording.ts`](../apps/CaseScriptAI/src/types/recording.ts) |
| 2.4 | `recording-store` | DONE | [`recording-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/recording-store.test.ts) | [`recording-store.ts`](../apps/CaseScriptAI/src/stores/recording-store.ts), [`recording-runtime.ts`](../apps/CaseScriptAI/src/stores/recording-runtime.ts) |
| 2.5 | START always enabled; enqueue; processing badge | DONE | [`recording-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/recording-store.test.ts) | [`record.tsx`](../apps/CaseScriptAI/src/app/(app)/record.tsx), [`pending-session-queue.ts`](../apps/CaseScriptAI/src/services/audio/pending-session-queue.ts) |
| 2.6 | Orphaned-session recovery | DONE | [`recording-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/recording-store.test.ts), [`recording-state-machine.test.ts`](../apps/CaseScriptAI/src/__tests__/services/audio/recording-state-machine.test.ts) | [`recording-store.ts`](../apps/CaseScriptAI/src/stores/recording-store.ts), [`record.tsx`](../apps/CaseScriptAI/src/app/(app)/record.tsx) |
| 2.7 | `AudioConversionService` (imports) | PARKED | | pending POC |
| 2.8 | Unit tests | DONE | `yarn workspace casescriptai test --runInBand --testPathPattern='(recording-state-machine\|wav-chunk-writer\|audio-recorder-service\|foreground-session-service\|recording-store)'` — 20 passing | — |

## SLICE 3 — Processing Pipeline

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 3.0 | `processing-queue-store` | IN PROGRESS | test plan below | — |
| 3.1 | `PipelineOrchestrator` (queue consumer, events) | TODO | | |
| 3.2 | `WhisperService` (lock, per-chunk, disk-partial, unload) | TODO | | |
| 3.3 | `LLMService` (pre-check, interrupt-before-delete, OOM) | TODO | | |
| 3.4 | `pipeline-store` | TODO | | |
| 3.5 | Processing Screen | TODO | | |
| 3.6 | Background continuation | TODO | | |
| 3.7 | Unit tests (mocked models, OOM→auto-heal) | TODO | | |

### 3.0 test plan (`processing-queue-store`)

Target files (after approval): [`processing-queue-store.test.ts`](../apps/CaseScriptAI/src/__tests__/stores/processing-queue-store.test.ts) → [`processing-queue-store.ts`](../apps/CaseScriptAI/src/stores/processing-queue-store.ts) + [`processing-queue.ts`](../apps/CaseScriptAI/src/types/processing-queue.ts). Replaces lightweight [`pending-session-queue.ts`](../apps/CaseScriptAI/src/services/audio/pending-session-queue.ts) as `ProcessingEnqueuePort` for recording STOP.

Contract: `ARCHITECTURE.md` §9.

| # | Case |
|---|---|
| 1 | `enqueue` appends `queued` item; empty/blank sessionId fails `Result` |
| 2 | `enqueue` is idempotent (same id twice → one row) |
| 3 | Persist + restore round-trip via injected persistence port |
| 4 | Mid-`processing` item normalizes to `queued` on restore (safe re-claim) |
| 5 | `claimNext` promotes first `queued` → `processing`; second claim returns null while one processing |
| 6 | `complete` removes item; `pendingBadge().pendingCount` drops |
| 7 | `fail` with `retryCount===0` re-queues + sets `retryCount=1` |
| 8 | Second `fail` marks `failed` (stays in list for "Needs attention") |
| 9 | `requeue` from `failed` → `queued`, `retryCount=0` |
| 10 | `cancel` removes item and calls injected `onCancel(sessionId)` |
| 11 | `pendingBadge` counts `queued`+`processing`; `estimatedMinutes` from drain samples (0 until samples) |
| 12 | Store satisfies `ProcessingEnqueuePort` (`enqueue` + `pendingCount`) for recording-store wiring |
| 13 | No PHI: persistence payload is session ids + status metadata only (assert shape) |

Out of scope for 3.0: PipelineOrchestrator drain loop, Whisper/LLM, SQLCipher adapter (Slice 4), UI confirm dialog (screen calls `cancel` after confirm), reorder/priority.

## SLICE 4 — Storage & Sessions

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 4.1 | `SessionRepository` (op-sqlite/SQLCipher, schema, indexes) | TODO | | |
| 4.2 | `DocumentExporter` (PDF + share) | TODO | | |
| 4.3 | `session-store` | TODO | | |
| 4.4 | Sessions Screen | TODO | | |
| 4.5 | Storage cleanup (purge chunks post-COMPLETE) | TODO | | |
| 4.6 | Unit tests + Keychain/Keystore key wiring | TODO | | |

## SLICE 5 — Error Recovery & Resilience

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 5.1 | GlobalErrorHandler | TODO | | |
| 5.2 | OOM recovery + auto-heal | TODO | | |
| 5.3 | Corruption recovery → re-download | TODO | | |
| 5.4 | Network recovery / retry queue | TODO | | |
| 5.5 | Session recovery (resume/discard) | TODO | | |
| 5.6 | AppState recovery (re-check invariants) | TODO | | |
| 5.7 | Regression suite (all edge cases) | TODO | | |

## SLICE 6 — Test Suite Completion

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 6.1 | Unit tests (services/machines/stores) | TODO | | |
| 6.2 | Integration tests (full pipeline, resumption) | TODO | | |
| 6.3 | E2E (Maestro/Detox) | TODO | | |
| 6.4 | Performance benchmarks (<2GB peak, frame drops) | TODO | | |

## SLICE 7 — Checksum Infra

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 7.1 | Cloudflare Worker checksum endpoint + deploy | TODO | | |
| 7.2 | Fallback strategy (folded into 1.2) | TODO | | |
