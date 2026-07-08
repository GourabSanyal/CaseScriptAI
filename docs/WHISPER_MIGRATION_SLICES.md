# Whisper Migration — Slice Tracker

> Goal: replace ExecuTorch `WHISPER_TINY` (Hugging Face auto-download) with **owned download + `whisper.rn`**, matching [`ARCHITECTURE.md`](./ARCHITECTURE.md).
>
> Companion to [`SLICES_PLAN.md`](./SLICES_PLAN.md) (full product plan). This tracker is **only** the POC → architecture Whisper cutover.
>
> Status: `TODO` · `IN PROGRESS` · `DONE` · `PARKED`

---

## Decisions (locked for this migration)

| Decision | Choice |
|---|---|
| Runtime | `whisper.rn` (imperative `initWhisper → transcribe → release`) |
| Model | Whisper **base** → `ggml-base.bin` (~142MB) |
| Who downloads | **We download** via `downloadWhisper()` → local path |
| URL | `EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK` (POC default: ggerganov/whisper.cpp HF; prod = owned CDN) |
| Checksums / Range-resume | **Deferred** to Slice 1 in `SLICES_PLAN.md` — this migration uses size-check + retry |
| ExecuTorch Whisper | Removed (`use-speech-to-text.ts` deleted). LLM stays on ExecuTorch |

---

## Slices

| Sub | Description | Status | Impl |
|---|---|---|---|
| **W0** | Tracker + link from `SLICES_PLAN.md` | DONE | `docs/WHISPER_MIGRATION_SLICES.md` |
| **W1** | Add `whisper.rn`; align path to `ggml-base.bin` | DONE* | `package.json`, `model-utils.ts` — *run `yarn install` locally; registry was unreachable in agent env* |
| **W2** | Harden `downloadWhisper()`: default URL, 3× retry, restart-from-zero | DONE | `src/services/ai/whisper.ts` |
| **W3** | whisper.rn service + hook (`downloadProgress`, `isReady`, `retry`) | DONE | `whisper-inference.ts`, `use-whisper-inference.ts` |
| **W4** | Swap `pipeline-section.tsx` → whisper.rn hook | DONE | `pipeline-section.tsx` |
| **W5** | Delete ExecuTorch Whisper hook | DONE | deleted `use-speech-to-text.ts` |
| **W6** | No Whisper+LLM co-residency in POC pipeline | DONE | preload Whisper only → transcribe → release → load LLM → SOAP → unload LLM |

\*W1 install incomplete until you run yarn on a network that can reach the registry.

---

## Out of scope (stay in `SLICES_PLAN.md`)

- Full `ResumableDownloadManager` + SHA-256 checksums
- Dedicated Download Screen / onboarding gate
- Full `MemoryManager` mutex singleton (POC enforces order manually in `pipeline-section`)
- Memory stability kill-switch loops (POC test 2)

---

## What you must run locally

```bash
# From repo root — installs whisper.rn and updates yarn.lock
yarn install

# Native rebuild required (whisper.rn is not Expo Go compatible)
yarn workspace casescriptai ios
# or
yarn workspace casescriptai android
```

Optional: copy `.env.example` → `.env` and keep / override `EXPO_PUBLIC_WHISPER_DOWNLOAD_LINK`.

---

## Manual test plan (device)

1. Open POC pipeline → Whisper downloads with progress → “on disk only” (LLM status says deferred).
2. Kill network mid-download → Retry recovers (restart-from-zero, up to 3 auto-retries).
3. Run Full Pipeline on a short WAV → logs show unload LLM → Whisper init/transcribe/release → load LLM → SOAP → unload LLM.
4. Confirm no sudden kill during Whisper init (was OOM from co-load).
5. Confirm Logbox/network: **no** fetch of `react-native-executorch-whisper-tiny`.

---

## Change log

| Date | Slice | Change |
|---|---|---|
| 2026-07-08 | W0–W5 | Tracker created; owned download + whisper.rn wired into POC pipeline |
| 2026-07-08 | W6 | Sequential load: Whisper then LLM; unload LLM around Whisper |
