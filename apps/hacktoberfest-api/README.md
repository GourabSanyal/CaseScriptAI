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

Local Postgres: `docker-compose.yml` (`postgres:16` on `localhost:5432`). No Render required for day-to-day API work.

Demo API:
- `POST /sessions/demo` — start fixture pipeline (returns `{ id, status }`)
- `GET /sessions/:id` — poll status (`pdfUrl` when ready; no transcript/note in JSON)
- `GET /sessions/:id/pdf` — download PDF


```bash
yarn workspace hacktoberfest-api test
# optional live Groq Whisper / Gemma smoke (uses fixture audio + DB):
LIVE_PROVIDER_SMOKE=1 yarn workspace hacktoberfest-api test
```

PDF download (after a session is `ready`): `GET /sessions/:id/pdf`  
Artifacts are written under `data/pdfs/` (gitignored).

Env (gitignored `.env` or shell — never commit secrets): `DATABASE_URL`, `GROQ_API_KEY`, `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY`, optional `GEMMA_MODEL` / `GEMINI_MODEL`, optional `LIVE_PROVIDER_SMOKE=1`.

## Fixture disclaimer

Audio under [`fixtures/`](./fixtures/) is **synthetic demo data**, not real PHI.
See [`fixtures/README.md`](./fixtures/README.md).
