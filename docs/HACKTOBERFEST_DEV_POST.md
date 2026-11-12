# DEV post draft — CaseScriptAI Hacktoberfest weekend (H7.3)

> Paste into [DEV.to](https://dev.to/new) (or the contest submission form).  
> Replace `YOUR_RENDER_HTTPS_URL` with the live Web Service URL.  
> Attach / embed the happy-path GIF from [`HACKTOBERFEST_DEMO_CAPTURE.md`](./HACKTOBERFEST_DEMO_CAPTURE.md).  
> **Do not** paste API keys or secrets.

---

## Title options

1. I built session notes for a therapist friend on Render (Hacktoberfest)
2. Fixture audio → Whisper → structured note → PDF — hosted on Render
3. Build for a Friend: clinical note demo without the typing grind

---

## Body (draft)

### Who it’s for

A therapist friend who finishes a session and still has to type the note.

This weekend demo takes a **short synthetic sample recording**, transcribes it, builds a structured clinical note, stores it in Postgres, and returns a **PDF** — so they can see the loop without real patient data.

### What judges can try

1. Open the live demo: **`YOUR_RENDER_HTTPS_URL`**
2. Wait for the free instance to wake (~1 min cold start) if needed
3. Tap **Use sample session**
4. Watch status: Transcribing → Writing note → Building PDF → Ready
5. Read the **note preview**, then **Download PDF**

Repo (branch `hacktoberfest/render-session-note`):  
https://github.com/GourabSanyal/CaseScriptAI

Scope lock: [`docs/HACKTOBERFEST_WEEKEND_SCOPE.md`](./HACKTOBERFEST_WEEKEND_SCOPE.md)

<!-- embed GIF or video here after capture -->

### Architecture (why Render)

```
Browser demo
   → Render Web Service (TypeScript API + in-process pipeline)
        → Whisper STT (hosted open-weight API)
        → Note LLM (hosted API; env-selected)
        → validate structured JSON → PDF
        → Render Postgres (session row + PDF bytes)
```

- **One** free Web Service + **Render Postgres** — no paid Background Worker
- Provider keys stay in Render env; the browser never sees them
- Adapters (`SttProvider` / `LlmProvider`) so STT/LLM can switch by env
- PDF lives in Postgres (`bytea`) because free disk is ephemeral

### Open weights / models

| Step | What we use |
|------|-------------|
| STT | Open-weight **Whisper** via Groq (`whisper-large-v3-turbo`) |
| Note | Default live path: Groq chat (`openai/gpt-oss-20b`) via `LLM_PROVIDER=groq` — Google free-tier Gemma was 503/timeout-heavy during the weekend; **Gemma** remains available with `LLM_PROVIDER=google` + a Google AI key |
| PDF | Deterministic server code from validated JSON |

### Fixture disclaimer

Audio and notes are **synthetic demo data**, not real PHI. Not for clinical use.

### What we deliberately skipped

Live WebRTC / server call recording, LangChain, and a Background Worker — those stay for the cloud MVP after the contest.

### Partner category

**Best Use of Render** — the demo runs end-to-end on Render’s free web + Postgres stack.

---

## Tags (suggested)

`hacktoberfest` `render` `typescript` `opensource` `whisper`

## Checklist before publish

- [ ] Live URL works after cold start
- [ ] GIF / video shows note preview + PDF
- [ ] Fixture disclaimer is visible in the post
- [ ] No secrets in screenshots
- [ ] Enter partner category **Best Use of Render**
