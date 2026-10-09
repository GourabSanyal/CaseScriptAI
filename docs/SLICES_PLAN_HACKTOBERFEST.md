# Hacktoberfest Weekend — Slice Plan & Tracker

> **Scope lock:** [`HACKTOBERFEST_WEEKEND_SCOPE.md`](./HACKTOBERFEST_WEEKEND_SCOPE.md)  
> **Branch:** `hacktoberfest/render-session-note`  
> **Does not replace** [`SLICES_PLAN_CLOUD.md`](./SLICES_PLAN_CLOUD.md) — weekend demo only.  
> **LLD:** [`LLD_HACKTOBERFEST.md`](./LLD_HACKTOBERFEST.md) — module map, schema, API, limits, edge cases per slice.  
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
| AUTH.FULL | Real patient auth / server invites | Therapist Google login unparked as **H5A**; patient stays demo invite code |
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
| H5.1 | `POST /sessions/demo` starts in-process pipeline on fixture (or uploaded short file) | DONE | `src/__tests__/demo-api.test.ts`, `run-demo-pipeline.test.ts` | `src/pipeline/run-demo-pipeline.ts`, `demo-session-starter.ts` |
| H5.2 | `GET /sessions/:id` status for “Generating…” polling | DONE | `demo-api.test.ts`, `session-view.test.ts` | `src/http/session-view.ts`, `create-server.ts` |
| H5.3 | Minimal web UI: button → poll → download PDF | DONE | `GET /` HTML assertion | `public/index.html` |
| H5.4 | No PHI logging; errors sanitized | DONE | public DTO omits transcript/note | `session-view.ts`, pipeline |

**Test plan (H5):** ✅ green (33/33 with prior suites)

**Done when:** browser happy path works against local API.

---

## SLICE H5L — Local dev baseline *(first — pulled forward from H6)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H5L.1 | `docker-compose.yml` local Postgres (was H6.7) | DONE | `local-dev-baseline.test.ts` | `docker-compose.yml` |
| H5L.2 | Root scripts `hacktoberfest:typecheck` / `:migrate` / `:check` (was H6.5) | DONE | `local-dev-baseline.test.ts` | root `package.json` |
| H5L.3 | `.nvmrc` + shell-independent API test glob (was H6.6) | DONE | `local-dev-baseline.test.ts` | `.nvmrc`, `apps/hacktoberfest-api/package.json` |

**Test plan (H5L):** ✅ baseline + mocked suite green (`LIVE_PROVIDER_SMOKE=0` forced by `yarn hacktoberfest:check`). Migrate against compose needs Docker Desktop.

1. `docker compose up -d` → Postgres healthy on `localhost:5432`.
2. `.env` `DATABASE_URL` must match compose (`user:password@localhost:5432/casescriptai_demo` from `.env.example`) → `yarn hacktoberfest:migrate`.
3. `yarn hacktoberfest:check` → typecheck + tests (quoted glob; live provider smokes off).

**Done when:** artifacts in repo; unit path green without DB. Full path (compose → migrate → check with DB) is a local machine step when Docker is running.

---

## SLICE H5A — Therapist Google login (Clerk) + `users` table *(local first)*

> Read [`OWASP_MOBILE_TOP_10.md`](./OWASP_MOBILE_TOP_10.md) before starting. Design: [`LLD_HACKTOBERFEST.md`](./LLD_HACKTOBERFEST.md) §1.12.
> Therapist only. Patient keeps demo invite code. Demo web page stays open (no login).

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H5A.1 | Scope doc: therapist auth now in scope; OWASP checklist notes | TODO | | |
| H5A.2 | Migration `002_users.sql` (`clerk_user_id` unique, email, role) + `user-repository` upsert | TODO | | |
| H5A.3 | API `verifyClerkToken` (`@clerk/backend`) + `GET /me` (upsert on first call, role from server) | TODO | | |
| H5A.4 | Mobile `ClerkProvider` + SecureStore token cache; "Continue with Google" on therapist login | TODO | | |
| H5A.5 | Mobile `api-client` sends Bearer token; auth store takes role from `GET /me`; sign-out clears Clerk + store | TODO | | |
| H5A.6 | Demo therapist login kept for `__DEV__` only | TODO | | |
| H5A.7 | Local E2E checklist: simulator + emulator sign-in → `users` row → sign-out/in reuses row | TODO | | |

**Test plan (draft, H5A):**
1. `GET /me` without token → `401 auth_missing`; bad/expired token → `401 auth_invalid`.
2. Valid (mocked verifier) token, first call → user row created with role `therapist`; second call → same row, `last_seen_at` updated.
3. Role in response comes from DB, never from client input.
4. Mobile auth store: Clerk signed-in + `/me` ok → therapist session; `/me` 401 → signed out with error.
5. Release build: demo login button absent.

**Done when:** H5A.7 passes on iOS simulator and Android emulator against local API + local Postgres.

**You needed first:** Clerk dev app with Google enabled; native app redirect `casescriptai://` allowlisted; keys in local `.env` files (see LLD §1.12). Own Google Cloud OAuth clients not needed until production.

---

## SLICE H5S — Public demo guardrails *(urgent — blocks H6)*

> A public Render URL with an open generate endpoint and in-process pipeline must not burn free-tier quota, hang, or lose PDFs on restart.

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H5S.1 | Rate limit `POST /sessions/demo`: per-IP (e.g. 3/hour) + global daily cap → `429 rate_limited` | TODO | | |
| H5S.2 | Timeouts on Groq + Gemma `fetch` (`AbortSignal.timeout`) → sanitized `stt_timeout` / `llm_timeout` failure | TODO | | |
| H5S.3 | Boot recovery: sessions left in `queued` / `*_running` → `failed` with `interrupted_restart` | TODO | | |
| H5S.4 | PDF bytes in Postgres (`003_hardening` migration, `bytea`) instead of `data/pdfs/` — Render free disk is ephemeral | TODO | | |
| H5S.5 | Security headers on every response (CSP, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`) | TODO | | |
| H5S.6 | Graceful `SIGTERM`: stop accepting, close `pg` pool | TODO | | |

**Test plan (draft, H5S):**
1. N+1th demo start from same IP within window → 429; counter resets after window.
2. Mocked provider that never resolves → step fails with timeout code; status `failed`; no PHI in error.
3. Seed `stt_running` row → boot recovery marks `failed` / `interrupted_restart`; `ready` rows untouched.
4. PDF step writes bytes to DB; `GET /sessions/:id/pdf` serves from DB with no file on disk.
5. `GET /health`, `/`, `/sessions/:id` include all security headers.
6. `SIGTERM` handler closes server + pool (unit-test the shutdown function).

**Done when:** all six green; public endpoint safe to share with judges.

---

## SLICE H6 — Render deploy + DX baseline

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H6.1 | `render.yaml` blueprint (web service + Postgres) — Render native build, no Dockerfile | TODO | | |
| H6.2 | Run migrations on deploy (`preDeployCommand` / start script) | TODO | | |
| H6.3 | Env vars documented for Render dashboard | TODO | | |
| H6.4 | Smoke checklist: health → generate → PDF → row in Postgres | TODO | | |
| H6.5 | Moved to H5L.2 | — | | |
| H6.6 | Moved to H5L.3 | — | | |
| H6.7 | Moved to H5L.1 | — | | |
| H6.11 | Clerk keys on Render env (`CLERK_SECRET_KEY`) + EAS env (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`) | TODO | | |
| H6.8 | GitHub Actions: API tests + typecheck, mobile `test` + `typecheck` on PRs to this branch | TODO | | |
| H6.9 | Optional `DEMO_ACCESS_KEY` env → generate requires header/query key when set | TODO | | |
| H6.10 | Scope doc note: session UUID is a capability URL; open read is acceptable only for synthetic data | TODO | | |

**Done when:** public Render URL completes one generate after cold start; `yarn hacktoberfest:check` and CI green.

**You needed first:** Render web service + Postgres + env vars (scope doc §7 C).

---

## SLICE H6U — Demo UX polish *(before write-up)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H6U.1 | Step progress UI (Transcribing → Writing note → Building PDF → Ready) instead of raw status | TODO | | |
| H6U.2 | Cold-start notice: "Waking server (~1 min)" when first request is slow | TODO | | |
| H6U.3 | Retry button on `failed` (reuses idempotent pipeline steps) | TODO | | |
| H6U.4 | Poll backoff (1s → 2s → 5s cap), max wait, pause when tab hidden; respect `prefers-reduced-motion` | TODO | | |
| H6U.5 | Note preview on page before PDF download (synthetic data only) | TODO | | |

**Done when:** happy path + failure + retry demoable on the Render URL; `GET /` HTML assertions updated.

---

## SLICE H7 — Contest write-up pack

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H7.1 | README section: who it’s for, architecture, how to run, fixture disclaimer | TODO | | |
| H7.2 | Screen recording / GIF of happy path | TODO | | |
| H7.3 | DEV post draft: friend, open Whisper+Gemma, Render role, demo link | TODO | | |

**Done when:** submission post can be published with working demo link.

---

## SLICE H8 — Mobile guardrails + performance *(after write-up)*

> Mobile is not contest-scored (see [`UI_DUAL_AUTH_AND_MOTION.md`](./UI_DUAL_AUTH_AND_MOTION.md)); this hardens the branch app alongside the thin demo screen.

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H8.1 | Encrypt auth MMKV store (`casescriptai-storage`) and drop raw email from demo token | TODO | | |
| H8.2 | Strip `console.*` in release builds (babel config); replace PHI-adjacent logs in AI hooks | TODO | | |
| H8.3 | Exclude `poc.tsx` / `explore.tsx` routes from release builds | TODO | | |
| H8.4 | Lazy-load ExecuTorch / ffmpeg / Whisper modules only when `LOCAL_ON_DEVICE_AI_ENABLED` is `true` | TODO | | |
| H8.5 | Motion budget applied to every animated component; low-end Android test checklist | TODO | | |
| H8.6 | Drop one of `expo-av` / `expo-audio` (keep `expo-audio`) | TODO | | |
| H8.7 | Thin therapist "Generate demo note" screen → Render API (status + PDF open/share) | TODO | | |

**Done when:** mobile `test` + `typecheck` green; release build has no `console.*` and no POC routes.

---

## SLICE H9 — Stretch features

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| H9.1 | Upload own short audio (size/duration cap, WAV/MP3 check, rate limit from H5S.1 applies) | TODO | | |
| H9.2 | Recent sessions list (last 5) on demo page | TODO | | |

---

## Suggested work order (one after another)

```
H0 → H1 → H2 → H3 → H4 → H5 → H5L → H5A → H5S → H6 → H6U → H7 → H8 → H9
```

Local first: H5L + H5A must pass on local Postgres before any Render work. Do not start H6 until H5A local E2E **and H5S are green**. Do not start H2 until H1 migrations apply. H8.7 partially unparks `MOBILE.POLISH`.

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
