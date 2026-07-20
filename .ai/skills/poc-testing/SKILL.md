---
name: poc-testing
description: >
  Legacy reference for the completed native POC gate. MVP work follows
  docs/ARCHITECTURE.md and docs/SLICES_PLAN.md — do not block product slices on this skill.
---

# Workflow: POC Testing (legacy)

## Status

POC validation is **complete**. Product work is **MVP** (Slices 0–7).

- `src/app/poc.tsx` is legacy — never import from it or copy its patterns
- Do **not** treat this skill as a gate for new slices
- Use it only when debugging historical POC assumptions on device

## What the POC proved (current stack)

| Area | Decision locked in architecture |
|------|----------------------------------|
| STT | ExecuTorch `useSpeechToText` + `WHISPER_TINY` |
| LLM | ExecuTorch `useLLM` + device-tiered Qwen3 (0.6B / 1.7B / 4B) |
| Memory | Whisper and LLM never co-resident (`MemoryManager`) |
| Recording | Batch capture to disk in ~30s chunks; no live transcript |
| Audio conversion / FFmpeg | **PARKED** — see `ARCHITECTURE.md` §12 |

## Do not use (stale)

These appear in older notes and are **wrong for MVP**:

- `whisper.rn` / `initWhisper` / `ggml-base.bin`
- Mandatory FFmpeg conversion as a kill-switch
- `npm install` / Expo Go for native AI modules
- Eval / golden-dataset workflows (removed)

## Device checks still useful during MVP

When validating memory or native builds:

1. Run a **dev client** (`yarn workspace casescriptai ios` or `android`) — not Expo Go
2. Confirm Whisper load → unload → LLM load never overlaps
3. Confirm RAM returns toward baseline after unload + `forceGC`
4. Prefer a ~3GB-class device before closing memory-related slices

## Sign-off

MVP progress is tracked only in [`docs/SLICES_PLAN.md`](../../../docs/SLICES_PLAN.md). Mark sub-slices `DONE` when their unit tests are green — not via this checklist.
