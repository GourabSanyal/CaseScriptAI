# Hacktoberfest weekend demo API (fixture audio → STT → Gemma note → PDF)

Thin TypeScript HTTP service for the contest branch
`hacktoberfest/render-session-note`. Scope:
[`docs/HACKTOBERFEST_WEEKEND_SCOPE.md`](../../docs/HACKTOBERFEST_WEEKEND_SCOPE.md).

## Quick start

```bash
# from repo root (Node 20 — see .nvmrc)
yarn install
cp apps/hacktoberfest-api/.env.example apps/hacktoberfest-api/.env
# .env.example DATABASE_URL matches docker-compose.yml

docker compose up -d
yarn hacktoberfest:migrate
yarn hacktoberfest:check          # typecheck + unit tests
yarn hacktoberfest:dev
# → http://localhost:3001/       (demo UI)
# → http://localhost:3001/health
```

Local Postgres: `docker-compose.yml` (`postgres:16`). Host port is **`5433`** (mapped to container `5432`) so it does not clash with Homebrew / Postgres.app on `5432`. No Render required for day-to-day API work.

Put this in `apps/hacktoberfest-api/.env`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5433/casescriptai_demo
```

### View Docker Postgres in pgAdmin (GUI)

Docker DB does **not** appear under your existing “PostgreSQL 15/18” servers. Register a **new** server:

1. From repo root: `docker compose up -d` (container `casescriptai-hacktoberfest-pg` should be healthy).
2. pgAdmin → Register → Server.
3. **General** tab: Name anything (e.g. `csai-dev`).
4. **Connection** tab:

| Field | Value |
|---|---|
| Host name/address | `localhost` |
| Port | `5433` |
| Maintenance database | `casescriptai_demo` |
| Username | `user` |
| Password | `password` |
| Save password? | on |
| Role / Service | leave empty |

5. Save → expand server → Databases → `casescriptai_demo` → Schemas → `public` → Tables.
6. Run `yarn hacktoberfest:migrate` so tables (`schema_migrations`, `demo_sessions`, `users`, …) exist.

### View Docker Postgres from the terminal

```bash
docker compose ps
docker exec -it casescriptai-hacktoberfest-pg psql -U user -d casescriptai_demo
# \dt
# SELECT * FROM users;
# \q
```

Demo API:
- `POST /sessions/demo` — start fixture pipeline (returns `{ id, status }`)
- `GET /sessions/:id` — poll status (`pdfUrl` when ready; no transcript/note in JSON)
- `GET /sessions/:id/pdf` — download PDF
- `GET /me` — Bearer Clerk JWT → upsert `users` → `{ id, email, role }` (H5A)

```bash
yarn workspace hacktoberfest-api test
# optional live Groq Whisper / Gemma smoke (uses fixture audio + DB):
LIVE_PROVIDER_SMOKE=1 yarn workspace hacktoberfest-api test
```

PDF download (after a session is `ready`): `GET /sessions/:id/pdf`  
Artifacts are written under `data/pdfs/` (gitignored).

Env (gitignored `.env` or shell — never commit secrets): `DATABASE_URL`, `CLERK_SECRET_KEY`, `GROQ_API_KEY`, `LLM_PROVIDER` (`groq` default | `google`), optional `LLM_MODEL`, `LLM_TIMEOUT_MS`, and `GOOGLE_AI_API_KEY` only if `LLM_PROVIDER=google`. Optional `DEMO_ACCESS_KEY` (H6.9): when set, `POST /sessions/demo` requires `x-demo-key` or `?demoKey=` — leave unset for the public contest demo.

**Live LLM switch:** set `LLM_PROVIDER=groq` and `LLM_MODEL=openai/gpt-oss-20b` on the Render Web Service (same `GROQ_API_KEY` as Whisper). Flip to `google` + `GEMINI_MODEL=gemini-3.8-flash` only if you want Gemini again.

## Render deploy

Blueprint: repo-root [`render.yaml`](../../render.yaml) (web + Postgres, native Node build — no Dockerfile). Existing manual Web Service is fine; the blueprint documents the intended shape.

**Root deploy settings (monorepo):**

| Setting | Value |
|---|---|
| Root directory | repo root (`.`) |
| Build | `corepack enable && yarn workspaces focus hacktoberfest-api` |
| Pre-deploy | `yarn workspace hacktoberfest-api migrate` |
| Start | `yarn workspace hacktoberfest-api start` |
| Health | `GET /health` |

Equivalent one-liner start (if you skip pre-deploy):  
`yarn workspace hacktoberfest-api migrate && yarn workspace hacktoberfest-api start`

### Render Web Service env (dashboard — never commit secrets)

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Render Postgres **Internal** URL |
| `GROQ_API_KEY` | yes | Whisper STT (+ chat when `LLM_PROVIDER=groq`) |
| `CLERK_SECRET_KEY` | yes for `/me` | Server-only; never in the mobile app |
| `PUBLIC_BASE_URL` | yes | Public HTTPS URL of this service (PDF links) |
| `NODE_ENV` | yes | `production` |
| `LLM_PROVIDER` | recommended | `groq` (default) |
| `LLM_MODEL` | optional | e.g. `openai/gpt-oss-20b` |
| `LLM_TIMEOUT_MS` | optional | e.g. `120000` |
| `IP_HASH_SALT` | recommended | Change from default in production |
| `DEMO_ACCESS_KEY` | optional | Locks generate when set (H6.9) |
| `GOOGLE_AI_API_KEY` | only if google LLM | + `GEMINI_MODEL` as needed |

### Mobile against live Render (H6.11)

In `apps/CaseScriptAI/.env` (restart Metro after change; no prebuild for URL):

```bash
EXPO_PUBLIC_DEMO_API_URL=<same HTTPS as PUBLIC_BASE_URL>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_…
```

Publishable key may be `EXPO_PUBLIC_*`. `CLERK_SECRET_KEY` stays on Render only.

## Smoke checklist

Operator path after deploy / cold start (live smoke already PASSED on Render):

1. Open the public service URL (or wait ~1 min for free-tier wake).
2. `GET /health` → `{ "ok": true }` (demo page also hits `/health` while waking).
3. Demo UI → **Use sample session** → wait for Ready (rate limit: 3/IP/hour, 50/day).
4. **Download PDF** opens a non-empty PDF.
5. Optional: in Render Postgres / shell, confirm a `demo_sessions` row with `status = ready`.

### H5A therapist Google (local E2E checklist)

1. `docker compose up -d` + `yarn hacktoberfest:migrate` (applies `002_users.sql`).
2. Set `CLERK_SECRET_KEY` in `apps/hacktoberfest-api/.env`; `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` + `EXPO_PUBLIC_DEMO_API_URL` in `apps/CaseScriptAI/.env`.
3. `yarn hacktoberfest:dev` then `yarn workspace casescriptai ios` / `android` (dev client).
4. Welcome → I'm a therapist → Continue with Google → lands on therapist home; `users` row exists (`clerk_user_id` unique).
5. Sign out → sign in again → **same** `users.id` (upsert), `last_seen_at` newer.
6. `__DEV__` only: "Continue as therapist (demo)" on welcome; absent in release builds.

## Fixture disclaimer

Audio under [`fixtures/`](./fixtures/) is **synthetic demo data**, not real PHI.
See [`fixtures/README.md`](./fixtures/README.md).
