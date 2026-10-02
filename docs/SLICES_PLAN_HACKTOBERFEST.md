# Hacktoberfest Weekend — Slice Plan & Tracker

> **Scope lock:** [`HACKTOBERFEST_WEEKEND_SCOPE.md`](./HACKTOBERFEST_WEEKEND_SCOPE.md)  
> **Branch:** `hacktoberfest/render-session-note`  
> **Does not replace** [`SLICES_PLAN_CLOUD.md`](./SLICES_PLAN_CLOUD.md) — weekend demo only.  
>
> Workflow: set sub-slice → `IN PROGRESS` (with test plan) **before** code; `DONE` only when tests green — [`PROJECT_RULES.md`](../PROJECT_RULES.md) §3.  
> Status: `TODO` · `IN PROGRESS` · `DONE` · `PARKED`  
> **Order:** finish each slice top-to-bottom before starting the next. Do not skip ahead.

---

## Locked decisions (weekend)

- Pre-recorded fixture audio only (no WebRTC).  
- Render web service + Render Postgres; in-process pipeline (no Background Worker).  
- Whisper via hosted API (open weights); Gemma via hosted API (open weights); PDF on server.  
- No LangChain; no PHI in logs; secrets only in env.  
- TypeScript backend preferred (aligns with cloud MVP).

---

## Parked for after contest

| ID | Item | Why |
|---|---|---|
| WEB.RTC | Live call + server record | Out of weekend scope |
| AUTH.FULL | Real therapist/patient auth | Demo can use a single open generate endpoint |
| WORKER.BG | Render Background Worker | Not free; use in-process |
| MOBILE.POLISH | Full RN therapist E2E | Web demo is enough to submit |

---

## SLICE H0 — Repo layout, env, fixture

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H0.1 | Backend package / folder skeleton for weekend API + pipeline | DONE | `yarn workspace hacktoberfest-api test` | `apps/hacktoberfest-api/` |
| H0.2 | `.env.example` with `DATABASE_URL`, STT key, LLM key, `PUBLIC_BASE_URL` | DONE | — | `apps/hacktoberfest-api/.env.example` |
| H0.3 | Synthetic 2–3 min fixture audio checked in (or download script) + README note “not PHI” | DONE | fixture exists (health.test.ts) | `apps/hacktoberfest-api/fixtures/` |
| H0.4 | Health route `GET /health` returns ok | DONE | `src/__tests__/health.test.ts` | `src/create-server.ts` |

**Test plan (H0):** ✅ green
1. Health: request `GET /health` against in-process server → status 200, JSON `{ ok: true }`.
2. Unknown path → 404.
3. Fixture path constant resolves to an existing audio file under `fixtures/`.

**Done when:** `yarn` (or package script) starts API locally; `/health` works; fixture path documented.

---

## SLICE H1 — Postgres schema on Render-compatible DB

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H1.1 | Migration: `demo_sessions` (id, status, transcript, note_json, pdf_path, error, created_at, updated_at) | DONE | `yarn workspace hacktoberfest-api migrate` | `migrations/001_demo_sessions.sql`, `src/db/migrate.ts` |
| H1.2 | Status enum / machine: `queued` → `stt_running` → `llm_running` → `pdf_running` → `ready` \| `failed` | DONE | `src/__tests__/session-status.test.ts` | `src/domain/session-status.ts` |
| H1.3 | Repository helpers: create session, update status, get by id (no PHI in logs) | DONE | `src/__tests__/session-repository.test.ts` | `src/db/session-repository.ts` |

**Test plan (H1):** ✅ green (migrate up to date; 7/7 tests including DB integration)

**Done when:** migrations apply against local Postgres **or** Render external URL; unit tests for status transitions.

**You needed first:** local Postgres **or** Render Postgres + `DATABASE_URL` in `.env` (scope doc §7).

---

## SLICE H2 — STT adapter (Whisper API)

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H2.1 | `SttProvider` port + Groq Whisper adapter | DONE | `src/__tests__/groq-whisper-stt.test.ts` | `src/providers/stt-provider.ts`, `groq-whisper-stt.ts` |
| H2.2 | Transcribe fixture file → plain transcript string | DONE | mocked + optional live smoke | `src/providers/groq-whisper-stt.ts` |
| H2.3 | Persist transcript on session; mark `stt_running` / failure path | DONE | `src/__tests__/run-stt-step.test.ts` | `src/pipeline/run-stt-step.ts` |
| H2.4 | Unit tests with mocked HTTP; one optional live smoke behind env flag | DONE | mock always; `stt-live-smoke.test.ts` if `LIVE_PROVIDER_SMOKE=1` | `src/__tests__/` |

**Test plan (H2):** ✅ mocked green (12/12). Live smoke skipped until `GROQ_API_KEY` + `LIVE_PROVIDER_SMOKE=1`.

**Done when:** mocked tests green; with `GROQ_API_KEY`, fixture produces a non-empty transcript stored in DB.

**You needed first:** Groq API key in `.env` (scope doc §7 A/B).

---

## SLICE H3 — LLM adapter (Gemma → structured JSON)

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H3.1 | `LlmProvider` port + Gemma / Google AI Studio adapter | DONE | `src/__tests__/gemma-llm.test.ts` | `src/providers/llm-provider.ts`, `gemma-llm.ts` |
| H3.2 | Prompt + JSON schema for structured clinical note (adapt on-device SOAP ideas; server-only) | DONE | `src/__tests__/structured-note.test.ts` | `src/prompts/structured-note-prompt.ts`, `src/domain/structured-note.ts` |
| H3.3 | `validateStructuredNote` before persist; retry once on invalid JSON | DONE | `run-llm-step.test.ts` (retry) | `structured-note.ts`, `run-llm-step.ts` |
| H3.4 | Persist `note_json`; status `llm_running` → next / `failed` | DONE | `src/__tests__/run-llm-step.test.ts` | `src/pipeline/run-llm-step.ts` |
| H3.5 | Unit tests: invalid JSON, empty sections, mock provider | DONE | structured-note + run-llm-step + gemma-llm | `src/__tests__/` |

**Test plan (H3):** ✅ mocked green (22/22). Live LLM smoke skipped until `GOOGLE_AI_API_KEY` + `LIVE_PROVIDER_SMOKE=1`.

**Done when:** transcript → validated note JSON in Postgres with mocked LLM tests green.

**You needed first:** Google AI / Gemma API key in `.env`.

---

## SLICE H4 — PDF + return URL

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H4.1 | Server PDF from structured note | DONE | `src/__tests__/build-note-pdf.test.ts` | `src/pdf/build-note-pdf.ts` |
| H4.2 | Save `pdf_path` / key on session; `GET /sessions/:id/pdf` (or static signed path) | DONE | `src/__tests__/session-pdf-route.test.ts` | `run-pdf-step.ts`, `create-server.ts` |
| H4.3 | Idempotent regenerate on failure | DONE | `src/__tests__/run-pdf-step.test.ts` | `src/pdf/run-pdf-step.ts` |
| H4.4 | Tests: PDF bytes non-empty for fixture note; authz stub if any | DONE | pdf + route tests (demo open endpoint) | `src/__tests__/` |

**Test plan (H4):** ✅ green

**Done when:** end-to-end pipeline function returns PDF for fixture with mocks; live path works with keys.

---

## SLICE H5 — Demo API + UI

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H5.1 | `POST /sessions/demo` starts in-process pipeline on fixture (or uploaded short file) | TODO | | |
| H5.2 | `GET /sessions/:id` status for “Generating…” polling | TODO | | |
| H5.3 | Minimal web UI: button → poll → download PDF | TODO | | |
| H5.4 | No PHI logging; errors sanitized | TODO | | |

**Done when:** browser happy path works against local API.

---

## SLICE H6 — Render deploy

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H6.1 | `Dockerfile` or Render native build documented | TODO | | |
| H6.2 | Run migrations on deploy / release command | TODO | | |
| H6.3 | Env vars documented for Render dashboard | TODO | | |
| H6.4 | Smoke checklist: health → generate → PDF → row in Postgres | TODO | | |

**Done when:** public Render URL completes one generate after cold start.

**You needed first:** Render web service + Postgres + env vars (scope doc §7 C).

---

## SLICE H7 — Contest write-up pack

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H7.1 | README section: who it’s for, architecture, how to run, fixture disclaimer | TODO | | |
| H7.2 | Screen recording / GIF of happy path | TODO | | |
| H7.3 | DEV post draft: friend, open Whisper+Gemma, Render role, demo link | TODO | | |

**Done when:** submission post can be published with working demo link.

---

## Suggested work order (one after another)

```
H0 → H1 → H2 → H3 → H4 → H5 → H6 → H7
```

Do not start H6 until H5 works locally. Do not start H2 until H1 migrations apply.

---

## Branch map

| Branch | Purpose |
|---|---|
| `hacktoberfest/render-session-note` | All `H*` weekend slices |
| `dev` / cloud `feat/*` | Post-contest cloud MVP — stay on [`SLICES_PLAN_CLOUD.md`](./SLICES_PLAN_CLOUD.md) |

---

## Definition of Done (every sub-slice)

1. Test plan written when status → `IN PROGRESS`.  
2. Tests green before `DONE`; link test + impl paths in the table.  
3. No secrets committed; no PHI in logs.  
4. Scope stays inside [`HACKTOBERFEST_WEEKEND_SCOPE.md`](./HACKTOBERFEST_WEEKEND_SCOPE.md).
