# Hacktoberfest weekend demo API (fixture audio → STT → Gemma note → PDF)

Thin TypeScript HTTP service for the contest branch
`hacktoberfest/render-session-note`. Scope:
[`docs/HACKTOBERFEST_WEEKEND_SCOPE.md`](../../docs/HACKTOBERFEST_WEEKEND_SCOPE.md).

## Quick start

```bash
# from repo root
yarn install
cp apps/hacktoberfest-api/.env.example apps/hacktoberfest-api/.env
# set DATABASE_URL (local Postgres or Render External URL)

yarn workspace hacktoberfest-api migrate
yarn workspace hacktoberfest-api dev
# → http://localhost:3001/health
```

```bash
yarn workspace hacktoberfest-api test
```

`DATABASE_URL` is read from `apps/hacktoberfest-api/.env` or repo-root `.env` (both gitignored), or from the shell — never commit real secrets.

## Fixture disclaimer

Audio under [`fixtures/`](./fixtures/) is **synthetic demo data**, not real PHI.
See [`fixtures/README.md`](./fixtures/README.md).
