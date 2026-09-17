# CaseScriptAI — Agent Guide (Cloud MVP)

Cloud-backed live therapist↔patient sessions for **iOS and Android** (web later). Server-side recording → object storage → free-tier STT/LLM APIs → structured note → PDF. India residency / compliance later via provider config swap.

> **Entry point for agents:** [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md) §0 — follow links from there (do not merge docs).
> On-device offline guide remains [`AGENTS.md`](AGENTS.md) — use that only for historical / `mvp_local_AI` work.

## Document hierarchy (same as ARCHITECTURE_CLOUD §0)

| Order | Document | Use for |
|-------|----------|---------|
| 1 | [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md) | Product flow, HLD, invariants |
| 2 | [`docs/SLICES_PLAN_CLOUD.md`](docs/SLICES_PLAN_CLOUD.md) | Slice status, TDD gate, test/impl links |
| 3 | [`PROJECT_RULES.md`](PROJECT_RULES.md) | DX: TDD, layers, code standards, UI, security habits |
| 4 | **This file** | Stack, commands, key-file index |
| 5 | [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md) | Mobile security (keep as-is) before auth/storage/crypto/network/logging |

## Tech Stack (cloud MVP)

- **Mobile:** React 19.1, React Native 0.81, Expo 54, Expo Router 6, Zustand
- **Realtime:** WebRTC over internet (SFU and/or recording bot — winner via Slice S0 spike); video optional; **server record primary** + **therapist local backup** (completeness gate — see `ARCHITECTURE_CLOUD.md` §7.1)
- **Backend:** TypeScript monolith first (API + job workers); Postgres + object storage
- **AI:** Free-tier STT + LLM behind `SttProvider` / `LlmProvider` adapters — **no LangChain**
- **PDF:** Server-generated; stored in object storage; therapist app downloads/status polls
- **Ops:** Thin admin page + API logs (no mega-dashboard for MVP)

Do **not** add libraries without explicit need. Prefer `yarn workspace` at the monorepo root. Never put STT/LLM API keys in the mobile app.

## Essential Commands

```bash
yarn install                              # from repo root
yarn workspace casescriptai ios           # native mobile
yarn workspace casescriptai android
yarn workspace casescriptai web           # UI dev only
yarn workspace casescriptai lint
yarn workspace casescriptai test
```

Spikes (`spike/*`) may use separate scripts under `spikes/` — document commands in each spike README. Backend package path TBD when C1/C3 land — update this table when created.

Native WebRTC / call screens will **not** work fully in Expo Go; use dev client / `expo run:ios` / `expo run:android` or EAS as required by the chosen realtime SDK.

## Project Structure (target)

```
apps/CaseScriptAI/src/     → Mobile (therapist + patient): app/ stores/ services/ …
spikes/                    → Out-of-app bake-offs (WebRTC, STT, LLM); decision matrices
# backend package          → API + workers (add when Slice C1/C3 start; TypeScript)
```

Mobile layering still follows [`PROJECT_RULES.md`](PROJECT_RULES.md) §4: `app/` → `stores/` → `services/` — screens never call native modules or cloud AI providers directly.

Future monorepo packages (check before creating utilities): `packages/shared-types`, `packages/encryption`, etc.

## Current Phase: Cloud MVP

Build against [`docs/SLICES_PLAN_CLOUD.md`](docs/SLICES_PLAN_CLOUD.md) (S0 → C1…C8; C9 PARKED) and [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md).

**Order of work:** finish gated spikes **S0** before product slices that depend on them (C2 needs WebRTC/record winner; C4/C5 need STT/LLM winners). Then C1 → C2 → C3 → C4 → C5 → C6 → C7 (schema may start with C1) → C8.

## Security Principles (cloud)

- No PHI in logs (transcripts, SOAP, audio paths, raw errors that may embed PHI)
- STT/LLM/storage secrets only on server / env — never `EXPO_PUBLIC_*` for secrets
- Provider adapters so US free-tier → India/self-host is a config change
- Compliance (India DPDP / real PHI) deferred for build velocity — do not ship real patients on free US APIs without revisiting
- Mobile auth/storage/crypto/network/logging: read [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md) (unchanged)

## LLM / STT Guardrails (summary)

- Prompts and structured-note validation live on the **server** (adapt ideas from on-device `prompts.ts` / validators; do not call providers from screens)
- Validate structured note JSON before persist or PDF
- No LangChain for MVP

## i18n

English-only for V1. When i18n is added later, all user-facing strings must go through the i18n layer.

## Skills & scoped rules

Canonical product docs beat skills when they conflict.

| Task | Location |
|------|----------|
| Cloud product flow / HLD | [`docs/ARCHITECTURE_CLOUD.md`](docs/ARCHITECTURE_CLOUD.md) |
| Cloud slice status / TDD gate | [`docs/SLICES_PLAN_CLOUD.md`](docs/SLICES_PLAN_CLOUD.md) |
| DX / code standards / line limits | [`PROJECT_RULES.md`](PROJECT_RULES.md) |
| Mobile security (OWASP) | [`docs/OWASP_MOBILE_TOP_10.md`](docs/OWASP_MOBILE_TOP_10.md) |
| Screens / paywall (if still used) | [`.cursor/rules/navigation.mdc`](.cursor/rules/navigation.mdc) |
| TS / UI conventions | `.cursor/rules/typescript-standards.mdc`, `react-native-ui.mdc` |
| On-device AI memory (ExecuTorch) | `.cursor/rules/ai-pipeline.mdc` — **on-device only**; cloud uses server adapters |

## Key Concepts / Files (cloud)

| Purpose | Location |
|---------|----------|
| Cloud architecture (start here) | `docs/ARCHITECTURE_CLOUD.md` |
| Cloud slices | `docs/SLICES_PLAN_CLOUD.md` |
| Dev practices | `PROJECT_RULES.md` |
| OWASP mobile mapping | `docs/OWASP_MOBILE_TOP_10.md` |
| Spike decision records | `spikes/` (create with S0.1) |
| Theme (mobile) | `apps/CaseScriptAI/src/constants/theme.ts` |
| Result type (mobile) | `apps/CaseScriptAI/src/types/result.ts` |
| On-device prompts (reference only) | `apps/CaseScriptAI/src/services/ai/prompts.ts` |

Update this table when backend package paths and provider adapters land.
