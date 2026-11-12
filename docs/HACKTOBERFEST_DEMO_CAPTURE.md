# Hacktoberfest — Happy-path demo capture (H7.2)

Record a **30–60s** screen capture (or GIF) of the public demo for the DEV post and submission package.

## Where to put the file

Preferred checked-in path (git-friendly GIF ≤ ~5–8 MB):

```
docs/assets/hacktoberfest-happy-path.gif
```

If the recording is too large for git, host it on Loom / YouTube / Cloudinary and paste the public link into [`HACKTOBERFEST_DEV_POST.md`](./HACKTOBERFEST_DEV_POST.md). Keep this checklist as the source of truth for *what* to film.

## Before you hit record

1. Confirm the **live Render** URL is serving the latest branch (note preview section exists after Ready).
2. Prefer a warmed instance: open `/health` once, wait for `{ "ok": true }`, then start recording (avoids a full cold-start minute in the clip).
3. Use desktop browser or phone browser — both are fine. Desktop is easier for a clean GIF.

## Shot list (in order)

| Step | Show on screen |
|------|----------------|
| 1 | Demo page title + “Use sample session” enabled |
| 2 | Tap **Use sample session** |
| 3 | Status steps: Transcribing → Writing note → Building PDF → Ready |
| 4 | **Note preview** (Subjective / Objective / Assessment / Plan) |
| 5 | Click **Download PDF** (or show the PDF open) |
| 6 | Optional one-liner on screen or voice: “Synthetic fixture — not real PHI” |

## Tools (pick one)

- macOS: QuickTime → New Screen Recording → trim → export; or Kap / LICEcap for GIF
- Phone: built-in screen record, then AirDrop / share the file
- Convert MP4 → GIF only if the file stays small enough for the repo

## Do not capture

- API keys, Render dashboard secrets, Clerk secret, or Postgres connection strings
- Real patient audio or real clinical content (this demo is fixture-only)
