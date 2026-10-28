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

Env (gitignored `.env` or shell — never commit secrets): `DATABASE_URL`, `CLERK_SECRET_KEY`, `GROQ_API_KEY`, `LLM_PROVIDER` (`groq` default | `google`), optional `LLM_MODEL`, `LLM_TIMEOUT_MS`, and `GOOGLE_AI_API_KEY` only if `LLM_PROVIDER=google`.

**Live LLM switch:** set `LLM_PROVIDER=groq` on the Render Web Service (uses the same `GROQ_API_KEY` as Whisper). Flip to `google` only if you want Gemini again.

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
