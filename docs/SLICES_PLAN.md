# CaseScriptAI — Slice Plan & Tracker

> Canonical progress tracker. **Read this + [`ARCHITECTURE.md`](./ARCHITECTURE.md) first** in every new chat/tab.
> Workflow: update the sub-slice to `IN PROGRESS` (with test plan) **before** work; mark `DONE` (with test + impl file links) only when tests are green.
>
> Status legend: `TODO` · `IN PROGRESS` · `DONE` · `PARKED`

---

## Cross-cutting decisions (locked in grill — see ARCHITECTURE.md)

- Download: per-file phased sequential; **Range-resume for LLM**, restart for small assets.
- **We own all downloads** → hand ExecuTorch/Whisper local file paths.
- LLM = imperative `LLMModule`; Whisper = imperative `whisper.rn`; Whisper model = **`base`**.
- Device tiering: 3 tiers (Qwen3 0.6B/1.7B/4B); Assess→Commit→Verify(warmup)→Auto-heal; sub-3GB served Lite.
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
| 0.1 | Extend `Result<T>` + `AppErrorCode` enum | IN PROGRESS | _tbd_ | `src/types/result.ts` |
| 0.2 | `MemoryManager` singleton | TODO | | |
| 0.3 | `AudioChunkQueue` + `TranscriptQueue` (persist/restore) | TODO | | |
| 0.4 | `ModelStateMachine` | TODO | | |
| 0.5 | `DownloadStateMachine` | TODO | | |
| 0.6 | `device-store` + `DeviceCapabilityService` + `LLMTierSelector` | TODO | | |
| 0.7 | Unit tests for all of Slice 0 | TODO | | |

## SLICE 1 — Download System

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 1.1 | `StorageChecker` | TODO | | |
| 1.2 | `ChecksumValidator` (+ Worker/MMKV/fallback) | TODO | | |
| 1.3 | `ResumableDownloadManager` (Range/restart, NetInfo, AppState, retry) | TODO | | |
| 1.4 | Upgrade `downloadWhisper()` (base) onto manager | TODO | | |
| 1.5 | `downloadLLM()` (tier `.pte` + tokenizer + config) | TODO | | |
| 1.6 | `downloadFFmpeg()` | PARKED | | pending POC |
| 1.7 | `download-store` | TODO | | |
| 1.8 | Download Screen (progress, tier copy, warmup, retry) | TODO | | |
| 1.9 | Integration tests (NetInfo/checksum/storage/Range/auto-heal) | TODO | | |
| 1.10 | `ModelManager.checkAllModelsReady()` + integrity watcher | TODO | | |

## SLICE 2 — Recording System *(capture lib gated on POC)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 2.1 | `AudioRecorderService` (30s chunks→disk, atomic, permissions) | TODO | | |
| 2.2 | `ForegroundSessionService` (background alive, notification, checkpoint) | TODO | | |
| 2.3 | `RecordingStateMachine` | TODO | | |
| 2.4 | `recording-store` | TODO | | |
| 2.5 | START always enabled; enqueue; processing badge | TODO | | |
| 2.6 | Orphaned-session recovery | TODO | | |
| 2.7 | `AudioConversionService` (imports) | PARKED | | pending POC |
| 2.8 | Unit tests | TODO | | |

## SLICE 3 — Processing Pipeline

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| 3.0 | `processing-queue-store` | TODO | | |
| 3.1 | `PipelineOrchestrator` (queue consumer, events) | TODO | | |
| 3.2 | `WhisperService` (lock, per-chunk, disk-partial, unload) | TODO | | |
| 3.3 | `LLMService` (pre-check, interrupt-before-delete, OOM) | TODO | | |
| 3.4 | `pipeline-store` | TODO | | |
| 3.5 | Processing Screen | TODO | | |
| 3.6 | Background continuation | TODO | | |
| 3.7 | Unit tests (mocked models, OOM→auto-heal) | TODO | | |

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
