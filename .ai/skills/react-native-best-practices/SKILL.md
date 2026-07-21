---
name: react-native-best-practices
description: >
  CaseScriptAI memory and Android R8 guidance only. Use for JS/native memory
  leaks, peak-RAM validation on ~3GB devices, and release R8/ProGuard.
  Whisper/LLM co-residency is NOT covered here — see ai-pipeline.mdc.
license: MIT
metadata:
  author: Callstack (trimmed for CaseScriptAI)
  tags: react-native, memory, r8, casescriptai
---

# CaseScriptAI — Memory & R8

Trimmed from Callstack’s React Native best practices. **Not** a general RN perf encyclopedia.

## Read first (canonical)

| Topic | Source of truth |
|-------|-----------------|
| Product flow, invariants, peak RAM | [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) §5–6 |
| Slice status / TDD | [`docs/SLICES_PLAN.md`](../../../docs/SLICES_PLAN.md) |
| How to work (layers, security, tests) | [`PROJECT_RULES.md`](../../../PROJECT_RULES.md) |
| Whisper/LLM exclusivity, prompts, queues | [`.cursor/rules/ai-pipeline.mdc`](../../../.cursor/rules/ai-pipeline.mdc) |
| Screens / paywall | [`.cursor/rules/navigation.mdc`](../../../.cursor/rules/navigation.mdc) |

## CaseScriptAI rules

- **AI model memory:** defer entirely to `ai-pipeline.mdc` (`MemoryManager`). Do not invent alternate load/unload patterns here.
- **Budget:** peak RAM **&lt; 2GB** on a 3GB device (`ARCHITECTURE.md`); validate on ~3GB hardware before closing memory-related slices.
- **PHI:** never log or capture transcripts, SOAP, patient fields, or audio paths.
- **Deps:** no new profiling/list libraries unless the user explicitly approves.
- **Commands:** `yarn workspace casescriptai …`; app at `apps/CaseScriptAI/`.

## When to use this skill

- JS heap growth / listener leaks after navigation or pipeline steps
- Native memory pressure after model unload / GC
- Android release shrinking (R8) — already required by `PROJECT_RULES` / `AGENTS.md`

## References (kept)

| File | Use for |
|------|---------|
| [js-memory-leaks.md](references/js-memory-leaks.md) | JS leak hunting |
| [native-memory-leaks.md](references/native-memory-leaks.md) | Native leak hunting |
| [native-memory-patterns.md](references/native-memory-patterns.md) | Native ownership / alloc patterns |
| [bundle-r8-android.md](references/bundle-r8-android.md) | Android R8 / code shrinking |

## Attribution

Based on Callstack’s “Ultimate Guide to React Native Optimization” (MIT). Reduced to memory + R8 for CaseScriptAI MVP.
