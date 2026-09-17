# CaseScriptAI — Project Rules

> **Canonical DX doc** (TDD, layers, line limits, code quality, security habits). Do not merge into architecture files.
> **Current track = cloud MVP.** Session entry: [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md) §0 → [`docs/SLICES_PLAN_CLOUD.md`](docs/SLICES_PLAN_CLOUD.md) → **this file** → [`AGENTS_CLOUD.md`](AGENTS_CLOUD.md); security → [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md).
>
> On-device offline archive (outdated for current feature work): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/SLICES_PLAN.md`](docs/SLICES_PLAN.md), [`AGENTS.md`](AGENTS.md).
> `apps/CaseScriptAI/src/app/poc.tsx` remains legacy — never import from it or copy its patterns.

---

## 1. Document hierarchy

| Priority | Document | Use for |
|----------|----------|---------|
| 1 | `docs/ARCHITECTURE_CLOUD.md` | Cloud HLD, product flow, invariants; security entry → OWASP |
| 2 | `docs/SLICES_PLAN_CLOUD.md` | What to build, slice status, gates, test + impl links |
| 3 | **This file** | How to work: scope, TDD, layers, line limits, security, UI |
| 4 | `AGENTS_CLOUD.md` | Stack, commands, key file index (cloud) |
| 5 | `docs/OWASP_MOBILE_TOP_10.md` | Mobile Top 10 checklist (**keep file as-is**; apply when touching auth/storage/crypto/network/logging) |
| 6 | `.cursor/rules/*.mdc` | File-scoped conventions (TS, UI, navigation; `ai-pipeline.mdc` = on-device archive) |

Archive only (do not drive new features): `docs/ARCHITECTURE.md`, `docs/SLICES_PLAN.md`, `AGENTS.md`.

**Change control:** Architecture change → update `ARCHITECTURE_CLOUD.md` **before** code. New service/flow not documented → stop, update architecture, then implement.

---

## 2. MVP scope (cloud — current)

### In scope

- Auth / therapist↔patient pairing; session create/join
- Internet WebRTC 1:1 call (video optional); **server-side primary** recording → object storage; **therapist local backup** + completeness gate (not quality A/B)
- Async pipeline: STT → structured note (LLM) → PDF; therapist can start next session while generating
- Postgres + object storage; free-tier provider adapters; thin ops admin
- Spikes (`spike/*`) then feature branches (`feat/*`); scale ~10 concurrent therapists
- iOS + Android clients; paywall at navigation layer when gated

### Out of scope (cloud MVP)

- Fine-tuning voice models
- Live draft transcript during call
- Hard India residency / full DPDP compliance (adapters must allow later cutover)
- LangChain / agent graphs
- Web production therapist dashboard
- Custom design-system packages (TanStack Query, Lingui, etc.) without explicit need
- New npm dependencies without explicit need — check `packages/*` first

### Parked / gated

- See `PARKED` / `GATED` rows in [`docs/SLICES_PLAN_CLOUD.md`](docs/SLICES_PLAN_CLOUD.md) (SFU choice, STT/LLM winners, fine-tuning, India cutover)

### On-device archive (do not expand unless on `mvp_local_AI`)

- Offline ExecuTorch Whisper/LLM, model download, device RAM tiers — see archive `ARCHITECTURE.md` / `SLICES_PLAN.md`

---

## 3. Slice workflow (TDD)

For every sub-slice in `docs/SLICES_PLAN_CLOUD.md`:

1. Set status to **IN PROGRESS** with a test plan
2. Write test skeleton + core cases (user approval when non-trivial)
3. Implement against `ARCHITECTURE_CLOUD.md` contracts
4. All tests green → **DONE** with test file + impl file links

**Never** mark `DONE` with red or missing tests. Bugfixes require an updated/added test first.
Spikes (S0) document winners under `spikes/` before unlocking gated product slices.

---

## 4. Architecture layers

**Mobile** (`apps/CaseScriptAI/src/`):

```
src/app/          Screens & routes only (Expo Router)
src/stores/       Zustand — UI state, orchestration triggers
src/hooks/        Reusable logic; calls services
src/services/     Business logic — no React, no UI
src/types/        Shared TypeScript types
src/constants/    Theme, config
src/utils/        Pure helpers
```

**Rules (mobile):**

- UI → Stores → Services → Foundation (`Result<T>`, state machines)
- Services never import from `app/` or `components/`
- Screens never call native modules or vendor STT/LLM APIs directly
- Every fallible service returns `Result<T>` — no throw-as-control-flow at call sites

**Backend (cloud — when scaffolded):** thin HTTP handlers → domain services → provider adapters (`SttProvider`, `LlmProvider`, `StorageProvider`, `RealtimeProvider`). No LangChain for MVP. No PHI in logs.

---

## 5. Non-negotiable invariants

From `ARCHITECTURE_CLOUD.md` — enforce in code review:

1. Server-side recording is **primary**; therapist local backup is **fallback**; pick canonical audio by **completeness** (duration/existence), never quality A/B of two files
2. Redirect finished canonical audio to object storage (STUN-only cannot record server-side)
3. Screens never call STT/LLM vendors — only backend + adapters
4. Provider/region cutover via env + ports (India later = config change, not rewrite)
5. No LangChain for MVP — linear STT → LLM → validate → PDF job
6. Postgres holds metadata/text/keys; blobs stay in object storage
7. No PHI in production (or demo) logs
8. Long ops emit progress / session status; therapist may start next session after END
9. Free-tier ≠ compliance — do not treat US free APIs as production PHI-safe

On-device archive invariants (Whisper≠LLM, &lt;2GB RAM, offline-first) apply only when working `mvp_local_AI` / archive docs.

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
| LLM output | Must validate structured note / SOAP before display (server + client) |
| i18n | English-only; no i18n library yet |
| Cloud AI prompts | Single server prompt module; adapters only — no LangChain |

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

- Never log transcripts, SOAP/structured notes, or audio paths (no PHI in logs)
- No secrets in `EXPO_PUBLIC_*` — STT/LLM/storage keys on server / env only
- Release: R8/ProGuard on Android; strip `console.log` in production
- OWASP Mobile Top 10 (2024): [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md) — enter from [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md) §0 / change control (**keep OWASP file as-is**)
- On-device Keychain/SQLCipher notes in archive `ARCHITECTURE.md` apply only on `mvp_local_AI`

---

## 9. Testing

| What | How |
|------|-----|
| Unit / integration | Per sub-slice in `docs/SLICES_PLAN_CLOUD.md`; required before `DONE` |
| Test location (mobile) | `apps/CaseScriptAI/src/__tests__/`, mirroring production tree; do not colocate with prod files |
| Spikes (S0) | Out-of-app harnesses under `spikes/`; decision matrix before unlocking gates |
| Native / WebRTC | Dev client / `expo run:ios|android` as required — not Expo Go for call stacks |
| Backend (when added) | Co-locate or mirror tests per backend package convention; document in `AGENTS_CLOUD.md` |

---

## 10. Monorepo & commands

```bash
yarn install                              # repo root
yarn workspace casescriptai ios           # native mobile
yarn workspace casescriptai android
yarn workspace casescriptai web           # UI dev only
yarn workspace casescriptai lint
yarn workspace casescriptai test
```

- Use `yarn workspace` exclusively — never pnpm/npm at root
- App path: `apps/CaseScriptAI/`
- Check `packages/*` before creating new shared utilities
- Backend package path: TBD — update [`AGENTS_CLOUD.md`](AGENTS_CLOUD.md) when scaffolded

---

## 11. Skills & scoped rules

| Task | Location |
|------|----------|
| Cloud product flow / HLD | `docs/ARCHITECTURE_CLOUD.md` |
| Cloud slice status / TDD | `docs/SLICES_PLAN_CLOUD.md` |
| DX / line limits / layers | **This file** |
| Agent index (cloud) | `AGENTS_CLOUD.md` |
| Mobile security (OWASP) | `docs/OWASP_MOBILE_TOP_10.md` (via `ARCHITECTURE_CLOUD.md` §0) |
| Screens / paywall | `.cursor/rules/navigation.mdc` |
| UI / theming | `.cursor/rules/react-native-ui.mdc` |
| TS standards | `.cursor/rules/typescript-standards.mdc` |
| On-device AI memory (archive) | `.cursor/rules/ai-pipeline.mdc` |
| JS/native memory + Android R8 | `.ai/skills/react-native-best-practices/SKILL.md` |

Skills are under `.ai/skills/` only (symlinked into `.cursor/skills/`). Canonical **cloud** docs beat skills when they conflict.

---

## 12. When blocked

- **PARKED / GATED slice** → read [`docs/SLICES_PLAN_CLOUD.md`](docs/SLICES_PLAN_CLOUD.md) ledger + [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md); do not implement past the gate
- **Undocumented pattern** → update `ARCHITECTURE_CLOUD.md` first
- **Scope creep** → check §2 out-of-scope list; defer post-MVP
- **Need DX detail** → this file (§3 TDD, §6 code standards); do not duplicate into architecture