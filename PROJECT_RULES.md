# CaseScriptAI — Project Rules

> **Canonical dev-practices doc for MVP.** Read this with [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/SLICES_PLAN.md`](docs/SLICES_PLAN.md) at the start of every session.
>
> **Phase:** MVP (Slices 0–7). `apps/CaseScriptAI/src/app/poc.tsx` is legacy — never import from it or copy its patterns.

---

## 1. Document hierarchy

| Priority | Document | Use for |
|----------|----------|---------|
| 1 | `docs/ARCHITECTURE.md` | Product flow, services, invariants, error model; **§15 → OWASP Mobile Top 10** |
| 2 | `docs/SLICES_PLAN.md` | What to build, slice status, test + impl links |
| 3 | **This file** | How to work: scope, TDD, layers, security, UI |
| 4 | `AGENTS.md` | Stack, commands, key file index |
| 5 | `.cursor/rules/*.mdc` | File-scoped conventions (AI, UI, TS, navigation) |

Security checklist detail lives in [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md) — always reached **via** `ARCHITECTURE.md` §15 when starting a new chat/tab.

**Change control:** Architecture change → update `ARCHITECTURE.md` **before** code. New service/flow not documented → stop, update architecture, then implement.

---

## 2. MVP scope

### In scope

- Launch → model readiness gate → download screen → home
- Record (batch, chunked to disk) → stop → processing queue → Whisper → LLM → SOAP
- Sessions list, optional patient fields, PDF export
- Offline after initial download; device-tiered LLM; checksum-verified models
- Encrypted storage (SQLCipher + AES-GCM files); MMKV for config
- Error recovery: OOM auto-heal, orphan sessions, retry-once-then-flag, cancel-with-confirm
- Paywall for trial-gated features (navigation-layer gate)
- iOS + Android production targets

### Out of scope (MVP)

- Live transcription during recording
- Cloud inference, sync, or accounts beyond auth/paywall needs
- i18n (English only)
- Web production parity (`yarn web` is UI dev only)
- App-level PIN lock (rely on OS device lock)
- Session reorder/priority; hard recording cap
- Custom design-system packages (TanStack Query, Lingui, etc.)
- New npm dependencies without explicit need — check `packages/*` first

### Parked (do not implement until decided)

- FFmpeg / `AudioConversionService` — see `ARCHITECTURE.md` §12 and `PARKED` rows in `SLICES_PLAN.md`

---

## 3. Slice workflow (TDD)

For every sub-slice in `SLICES_PLAN.md`:

1. Set status to **IN PROGRESS** with a test plan
2. Write test skeleton + core cases (user approval when non-trivial)
3. Implement against architecture contracts
4. All tests green → **DONE** with test file + impl file links

**Never** mark `DONE` with red or missing tests. Bugfixes require an updated/added test first.

---

## 4. Architecture layers

```
src/app/          Screens & routes only (Expo Router)
src/stores/       Zustand — UI state, orchestration triggers
src/hooks/        Reusable logic; calls services
src/services/     Business logic — no React, no UI
src/types/        Shared TypeScript types
src/constants/    Theme, config
src/utils/        Pure helpers
```

**Rules:**

- UI → Stores → Services → Foundation (`Result<T>`, state machines, `MemoryManager`)
- Services never import from `app/` or `components/`
- Screens never call native modules directly (Whisper, ExecuTorch, sqlite)
- Every fallible service returns `Result<T>` — no throw-as-control-flow at call sites
- Prompts live **only** in `src/services/ai/prompts.ts`

---

## 5. Non-negotiable invariants

From `ARCHITECTURE.md` — enforce in code review:

1. Never load Whisper and LLM simultaneously (`MemoryManager` mutex) — detail: `.cursor/rules/ai-pipeline.mdc`
2. Recording loads **no** model (mic → disk only)
3. Peak RAM **< 2GB** on a 3GB device — leak/R8 playbooks: `.ai/skills/react-native-best-practices/`
4. Never hold audio bytes in JS — queues hold **file paths**
5. Never load binaries without checksum verification
6. Offline-first after initial download
7. No PHI in production logs
8. Long ops emit progress; handle `AppState` transitions
9. Purge temp audio after pipeline `COMPLETE`

---

## 6. Code standards

| Topic | Rule |
|-------|------|
| Files | `kebab-case.ts`; aim 115–150 lines; split above 150 |
| Imports | `@/` alias only; order: React/RN → external → `@/` → `import type` |
| Components | `function` declarations |
| Hooks / services | Arrow functions; hooks return objects |
| Errors | `Result<T>` + `AppErrorCode` in services |
| UI | `ThemedText`, `ThemedView`, `useTheme()` — no hardcoded colors |
| Navigation | Expo Router only; paywall via `router.push('/paywall')` |
| LLM output | Must validate SOAP structure before display (see `ai-pipeline.mdc`) |
| i18n | English-only; no i18n library yet |

Detail: `.cursor/rules/typescript-standards.mdc`, `react-native-ui.mdc`, `navigation.mdc`, `ai-pipeline.mdc`.

---

## 7. UI & design

- Design system: `apps/CaseScriptAI/assets/ui_design/stitch_casescriptai_therapist_assistant/serene_clinical_interface/DESIGN.md`
- Reference screens: `assets/ui_design/stitch_casescriptai_therapist_assistant/*/screen.png`
- Font: **DM Sans** (`assets/fonts/DMSans.ttf`, `useDmSans()`)
- Palette: warm off-white background `#fcf9f5`, sage primary `#3a6750`, no pure black text
- Tokens live in `apps/CaseScriptAI/src/constants/theme.ts` — use `useTheme()` / `ThemedText` / `ThemedView`; never hardcode palette hex in screens
- Shapes: pill buttons, 16px card radius, soft elevation (tonal layers, not heavy shadows)
- Responsive: scale typography and logo on tablet breakpoint (~768px)

---

## 8. Security & privacy

- PHI stays on-device — never log transcripts, SOAP, or audio paths in production
- Encryption keys in Keychain/Keystore (replace POC placeholder before Slice 4.6 ships)
- No secrets in `EXPO_PUBLIC_*`
- Release: R8/ProGuard on Android; strip `console.log` in production
- OWASP Mobile Top 10 (2024) mapping: [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md) — enter from [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §15

---

## 9. Testing

| What | How |
|------|-----|
| Unit / integration | Per slice in `SLICES_PLAN.md`; required before `DONE` |
| Test location | Keep tests under `src/__tests__/`, mirroring the production tree; do not colocate them with production files |
| Native AI | `yarn workspace casescriptai ios` or `android` — **not Expo Go** |
| Memory | Validate on ~3GB device before closing memory-related slices |

---

## 10. Monorepo & commands

```bash
yarn install                              # repo root
yarn workspace casescriptai ios           # native (AI, ExecuTorch)
yarn workspace casescriptai android
yarn workspace casescriptai web           # UI dev only
yarn workspace casescriptai lint
yarn workspace casescriptai test
```

- Use `yarn workspace` exclusively — never pnpm/npm at root
- App path: `apps/CaseScriptAI/`
- Check `packages/*` before creating new shared utilities

---

## 11. Skills & scoped rules

| Task | Location |
|------|----------|
| Product flow / invariants | `docs/ARCHITECTURE.md` |
| Mobile security (OWASP) | `docs/ARCHITECTURE.md` §15 → `docs/OWASP_MOBILE_TOP_10.md` |
| Slice status / TDD | `docs/SLICES_PLAN.md` |
| AI / model memory (Whisper↔LLM) | `.cursor/rules/ai-pipeline.mdc` |
| Screens / paywall | `.cursor/rules/navigation.mdc` |
| UI / theming | `.cursor/rules/react-native-ui.mdc` |
| JS/native memory + Android R8 | `.ai/skills/react-native-best-practices/SKILL.md` |
| Legacy POC device notes | `.ai/skills/poc-testing/SKILL.md` |

Skills are under `.ai/skills/` only (symlinked into `.cursor/skills/`). Do **not** vendor the Callstack `agent-skills` repo. Model memory exclusivity always defers to `ai-pipeline.mdc`.

---

## 12. When blocked

- **PARKED slice** → read `ARCHITECTURE.md` §12; do not implement
- **Undocumented pattern** → update architecture first
- **Scope creep** → check §2 out-of-scope list; defer post-MVP
