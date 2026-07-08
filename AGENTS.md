# CaseScriptAI — Agent Guide

Privacy-first, on-device medical transcription and clinical note generation for **iOS and Android**. All AI runs locally — no cloud inference. Web (`yarn web`) is dev UI testing only; production targets are native mobile.

## Tech Stack

- React 19.1, React Native 0.81, Expo 54
- Expo Router 6 (file-based routing)
- Zustand (state), MMKV (storage)
- whisper.rn (STT), react-native-executorch (LLM)
- ffmpeg-kit-react-native (audio conversion)
- expo-print (PDF), react-native-aes-gcm-crypto (encryption)

Do **not** add libraries without explicit need. No TanStack Query, Lingui, or custom design-system packages. Use `yarn workspace` exclusively — never pnpm or npm at the root.

## Essential Commands

```bash
yarn install                              # from repo root
yarn workspace casescriptai ios           # native build (required for AI/ffmpeg)
yarn workspace casescriptai android
yarn workspace casescriptai web           # UI dev only
yarn workspace casescriptai lint
```

Native modules (Whisper, ffmpeg, ExecuTorch) do **not** work in Expo Go. Use `expo run:ios` / `expo run:android` or EAS builds.

## Project Structure

```
apps/CaseScriptAI/src/
├── app/          → Screens/routes only (Expo Router)
├── components/   → Reusable UI
├── hooks/        → Reusable logic; call services
├── services/     → Business logic, no UI (ai/, audio/, pdf/, storage/)
├── stores/       → Zustand state
├── types/        → Shared TypeScript types
├── constants/    → Theme, config
└── utils/        → Pure helpers (device-tier, etc.)
```

Future monorepo packages (check before creating utilities):

- `packages/ai-core` — shared AI pipeline
- `packages/encryption` — AES-256 + key derivation
- `packages/pdf-engine` — PDF generation
- `packages/shared-types` — shared interfaces

## Current Phase: POC Validation

Do **not** build product features until `poc.tsx` passes all 4 kill-switch tests (Whisper load, memory stability, ffmpeg, chunking). `src/app/poc.tsx` is throwaway — never import from it or copy its patterns. It will be deleted before V1.

## Eval Rules

- `eval/golden-dataset/` is sacred — never auto-generate or modify ground truth
- Suggest running eval after changes to `whisper.ts`, `llm.ts`, or `prompts.ts`
- `eval/results/` is local only — never commit

## Paywall Navigation

Trial-gated features must navigate via `router.push('/paywall')`. Never use conditional UI hiding as the only gate. Enforce at the navigation layer.

## Security Principles

- PHI stays on-device — never log transcripts, SOAP output, or audio paths in production
- Encryption keys belong in Keychain/Keystore (placeholder key in `crypto-service.ts` is POC-only)
- `EXPO_PUBLIC_*` for non-sensitive config only — never secrets
- Release builds: R8/ProGuard on Android; strip `console.log` in production
- Hermes bytecode provides baseline JS protection; no extra obfuscation library until V1 hardening

## LLM Guardrails (summary)

Full rules in `.cursor/rules/ai-pipeline.mdc`. Every LLM response must pass `validateSOAPOutput()` before display. Prompts live only in `prompts.ts`.

## i18n

English-only for V1. When i18n is added later, all user-facing strings must go through the i18n layer.

## Skills

Workflow skills live in `.ai/skills/`. Cursor and Claude resolve them via symlinks in `.cursor/skills/` and `.claude/skills/`.

## Key Files

| Purpose | Location |
|---------|----------|
| POC screen | `src/app/poc.tsx` |
| Prompts | `src/services/ai/prompts.ts` |
| Output validator | `src/services/ai/output-validator.ts` |
| Whisper | `src/services/ai/whisper.ts` |
| Whisper inference | `src/services/ai/whisper-inference.ts` |
| LLM inference | `src/services/ai/llm-inference.ts` |
| Chunker | `src/services/audio/chunker.ts` |
| Encryption | `src/services/audio/crypto-service.ts` |
| Theme | `src/constants/theme.ts` |
| Result type | `src/types/result.ts` |
| Paywall | `src/app/paywall.tsx` |
