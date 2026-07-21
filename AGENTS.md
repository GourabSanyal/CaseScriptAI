# CaseScriptAI — Agent Guide

Privacy-first, on-device medical transcription and clinical note generation for **iOS and Android**. All AI runs locally — no cloud inference. Web (`yarn web`) is dev UI testing only; production targets are native mobile.

## Tech Stack

- React 19.1, React Native 0.81, Expo 54
- Expo Router 6 (file-based routing)
- Zustand (state), MMKV (storage)
- react-native-executorch (Whisper STT + Qwen LLM)
- ffmpeg-kit-react-native (installed; audio-conversion **PARKED** — see `docs/ARCHITECTURE.md` §12)
- expo-print (PDF), react-native-aes-gcm-crypto (encryption)

Do **not** add libraries without explicit need. No TanStack Query, Lingui, or custom design-system packages. Use `yarn workspace` exclusively — never pnpm or npm at the root.

## Essential Commands

```bash
yarn install                              # from repo root
yarn workspace casescriptai ios           # native build (required for AI)
yarn workspace casescriptai android
yarn workspace casescriptai web           # UI dev only
yarn workspace casescriptai lint
yarn workspace casescriptai test
```

Native modules (ExecuTorch, and current FFmpeg kit wiring) do **not** work in Expo Go. Use `expo run:ios` / `expo run:android` or EAS builds.

## Project Structure

```
apps/CaseScriptAI/src/
├── app/          → Screens/routes only (Expo Router)
├── components/   → Reusable UI
├── hooks/        → Reusable logic; call services
├── services/     → Business logic, no UI (ai/, audio/, pdf/, storage/)
├── stores/       → Zustand state
├── types/        → Shared TypeScript types
├── constants/    → Theme, config, model constants
├── utils/        → Pure helpers
└── __tests__/    → Unit tests mirroring src/
```

Future monorepo packages (check before creating utilities):

- `packages/ai-core` — shared AI pipeline
- `packages/encryption` — AES-256 + key derivation
- `packages/pdf-engine` — PDF generation
- `packages/shared-types` — shared interfaces

## Current Phase: MVP

Build against [`docs/SLICES_PLAN.md`](docs/SLICES_PLAN.md) (Slices 0–7) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). **Dev practices:** [`PROJECT_RULES.md`](PROJECT_RULES.md). `src/app/poc.tsx` is legacy — never import from it or copy its patterns; delete when no longer needed for reference.

## Paywall Navigation

Trial-gated features must navigate via `router.push('/paywall')`. Never use conditional UI hiding as the only gate. Enforce at the navigation layer.

## Security Principles

- PHI stays on-device — never log transcripts, SOAP output, or audio paths in production
- Encryption keys belong in Keychain/Keystore (placeholder key in `crypto-service.ts` is POC-only)
- `EXPO_PUBLIC_*` for non-sensitive config only — never secrets
- Release builds: R8/ProGuard on Android; strip `console.log` in production
- Hermes bytecode provides baseline JS protection; no extra obfuscation library until V1 hardening

## LLM Guardrails (summary)

Full rules in `.cursor/rules/ai-pipeline.mdc`. SOAP output must be validated before display. Prompts live only in `prompts.ts`. Whisper/LLM exclusivity is owned by `MemoryManager`.

## i18n

English-only for V1. When i18n is added later, all user-facing strings must go through the i18n layer.

## Skills

Workflow skills live in `.ai/skills/` (symlinked from `.cursor/skills/`). Canonical product docs beat skills when they conflict.

| Task | Location |
|------|----------|
| Product flow / invariants | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Slice status / TDD | [`docs/SLICES_PLAN.md`](docs/SLICES_PLAN.md) |
| Dev practices | [`PROJECT_RULES.md`](PROJECT_RULES.md) |
| AI / model memory (Whisper↔LLM) | [`.cursor/rules/ai-pipeline.mdc`](.cursor/rules/ai-pipeline.mdc) |
| Screens / paywall | [`.cursor/rules/navigation.mdc`](.cursor/rules/navigation.mdc) |
| JS/native memory leaks + Android R8 | `.ai/skills/react-native-best-practices/SKILL.md` |
| Legacy POC device notes | `.ai/skills/poc-testing/SKILL.md` |

## Key Files

| Purpose | Location |
|---------|----------|
| POC screen (legacy) | `src/app/poc.tsx` |
| Prompts | `src/services/ai/prompts.ts` |
| Model constants | `src/constants/models.ts` |
| Memory mutex | `src/services/ai/memory-manager.ts` |
| Whisper | `src/services/ai/whisper.ts` |
| LLM | `src/services/ai/llm.ts` / `llm-inference.ts` |
| Tier selection | `src/services/ai/llm-tier-selector.ts` |
| Device store | `src/stores/device-store.ts` |
| Encryption | `src/services/audio/crypto-service.ts` |
| Theme | `src/constants/theme.ts` |
| Result type | `src/types/result.ts` |
| Paywall | `src/app/paywall.tsx` |
