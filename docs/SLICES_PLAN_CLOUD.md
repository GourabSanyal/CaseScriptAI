# CaseScriptAI — Cloud MVP Slice Plan & Tracker

> Canonical progress tracker for the **cloud** MVP.
>
> **Entry point:** [`ARCHITECTURE_CLOUD.md`](./ARCHITECTURE_CLOUD.md) §0 (document hierarchy). From there, read:
> 1. This file — what to build / status  
> 2. [`PROJECT_RULES.md`](../PROJECT_RULES.md) — DX, TDD steps, code standards (line limits, layers)  
> 3. [`AGENTS_CLOUD.md`](../AGENTS_CLOUD.md) — stack, commands, key files  
> 4. [`OWASP_MOBILE_TOP_10.md`](./OWASP_MOBILE_TOP_10.md) — before auth/storage/crypto/network/logging (keep as-is; do not merge)
>
> On-device offline tracker stays in [`SLICES_PLAN.md`](./SLICES_PLAN.md) — **do not replace** it for cloud work.
> Workflow: update the sub-slice to `IN PROGRESS` (with test plan) **before** work; mark `DONE` (with test + impl file links) only when tests are green — see [`PROJECT_RULES.md`](../PROJECT_RULES.md) §3.
>
> Status legend: `TODO` · `IN PROGRESS` · `DONE` · `PARKED`

---

## Cross-cutting decisions (locked so far — see ARCHITECTURE_CLOUD.md)

- Live **1:1** therapist↔patient call; video optional; audio required; **internet** (not LAN-only).
- React Native for **both** roles; web later.
- Scale: **10 therapists**, ~100 patients each, **1 concurrent call per therapist**, sessions **10–90 min**.
- Note timing: **after END**; UI **"Generating PDF…"** + therapist may start next session.
- Recording: **server-side primary** + **therapist local backup**; canonical audio via **completeness gate** (not quality A/B); backup upload only if server missing/short; purge local after `ready`.
- STUN-only is **insufficient** for server recording — SFU and/or recording bot required (exact vendor via spike).
- STT + LLM: **free-tier APIs** behind adapters for MVP; India / compliance later via **config swap**.
- Storage: **Postgres** (metadata + text) + **object storage** (audio + PDF).
- Fine-tuning: **PARKED**.
- Ops observability: **defer** unified multi-vendor dashboard → API logs + **thin ops admin page** (operator browser UI via API, not raw pgAdmin as product).
- No **LangChain** for MVP.
- Backend language: **TypeScript** monolith first; spikes may use other languages.
- Validation: **hybrid** — `spike/*` bake-offs outside app, then `feat/*` E2E in product.
- On-device archive branch: `mvp_local_AI` (historical); cloud work tracked here.

---

## Parked & gated ledger

> Do **not** unpark until the gate clears. `PARKED` = no product code yet. `GATED` = blocked on spike or decision.

### Gate: `SPIKE_WEBRTC_RECORD` (Slice S0 / C2)

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **S0.W** | WebRTC SFU bake-off (internet + server record path) | TODO | **Slice S0** | Candidates: Cloudflare Calls vs LiveKit vs mediasoup + recording bot. STUN-only disqualified for server record. |
| **S0.R** | Server record → object storage redirect | TODO | **Slice S0** | Metrics: connect/disconnect, A/V quality, record finalize latency, Postgres row written. |
| **C2.SFU** | Product SFU choice locked | GATED | **Slice C2** | Unblock after S0.W winner documented in `spikes/`. |

### Gate: `SPIKE_STT_LLM` (Slice S0 / C4–C5)

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **S0.S** | Free-tier STT bake-off (same audio fixtures) | TODO | **Slice S0** | Outside app; decision matrix → `SttProvider` winner. |
| **S0.L** | Free-tier LLM bake-off (structured note accuracy) | TODO | **Slice S0** | Outside app; JSON schema + rubric; no LangChain. |
| **C4.STT** | Production adapter wired to winner | GATED | **Slice C4** | After S0.S. |
| **C5.LLM** | Production adapter wired to winner | GATED | **Slice C5** | After S0.L. |

### Gate: India / compliance (post-MVP hardening)

| ID | Item | Status | Complete in | Notes |
|---|---|---|---|---|
| **IND.1** | Flip storage/realtime/STT/LLM to India endpoints | PARKED | Post-MVP | Must be env/adapter-only. |
| **IND.2** | DPDP / PHI policy + BAA-equivalent providers | PARKED | Post-MVP | Free US APIs not for real PHI. |

### Explicitly out of scope / deferred

| Item | When (if ever) |
|---|---|
| Fine-tuning voice model pipeline | Post-MVP |
| Live draft transcript during call | Post-MVP |
| Audio quality A/B between server vs local | Not planned — completeness gate only |
| Always dual-upload every session | Not planned |
| Full Grafana/LiteLLM mega-dashboard | After thin ops admin proves insufficient |
| Web therapist dashboard | After mobile MVP |
| LangChain / agents | Not planned for MVP |
| K8s / heavy autoscaling | Not needed at 10 concurrent calls |

---

## Diagram → slice map

| Diagram step | Slice | Focus |
|---|---|---|
| (prep) Bake-offs | **S0** | Spikes: WebRTC+record, STT, LLM — outside app |
| USER + Doc | **C1** | Auth, roles, pairing, session create/join |
| WebRTC + Record Engine | **C2** | Internet calls, server record + therapist local backup |
| Audio → backend / queue | **C3** | END, completeness gate, enqueue, status API |
| STT | **C4** | Free-tier STT adapter + transcript persist |
| Text Model | **C5** | Free-tier LLM adapter + structured note validation |
| PDF → doctor | **C6** | PDF generate, notify/status UI, download |
| Postgres + voice/text | **C7** | Schema, retention, admin read models |
| Ops visibility | **C8** | Thin ops admin page + API logs |
| Fine-tuning | **C9** | PARKED |

---

## SLICE S0 — Spikes & Bake-offs *(outside product app)*

> Branch pattern: `spike/webrtc-record`, `spike/stt-free-tier`, `spike/llm-free-tier`. Document winners under `spikes/` (or agreed folder) before unlocking C2/C4/C5.

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| S0.1 | Spike repo/folder layout + decision-matrix template (metrics, pass/fail) | TODO | | |
| S0.2 | WebRTC internet call harness (2 clients) — connect/disconnect timings | TODO | | |
| S0.3 | Server-side recording path spike (SFU egress or recording bot) | TODO | | |
| S0.4 | Record redirect → object storage → write session/job row to Postgres | TODO | | |
| S0.5 | Concurrent load simulation (~10 rooms) + 1 real RN↔RN quality check | TODO | | |
| S0.6 | STT free-tier bake-off on fixed audio fixtures (WER / qualitative rubric) | TODO | | |
| S0.7 | LLM free-tier bake-off on fixed transcripts → structured JSON score sheet | TODO | | |
| S0.8 | Publish spike decision records (winner + reject reasons); unlock gated slices | TODO | | |

**Suggested hard gates (tune in grill):** connect p95 &lt; 3s; End→audio in storage &lt; 60s; fixture ~30 min audio → STT+LLM+Postgres row &lt; 5 min on free tier (best effort).

---

## SLICE C1 — Identities, Auth & Session Join *(diagram: USER + Doc)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C1.1 | Postgres `users` + roles (`therapist` \| `patient`) | TODO | | |
| C1.2 | Care relationship / pairing model (assigned list and/or invite link) | TODO | | |
| C1.3 | Auth tokens (JWT or session); therapist creates session | TODO | | |
| C1.4 | Patient join (`POST /sessions/:id/join`) + invite expiry / revoke | TODO | | |
| C1.5 | Mobile auth screens (therapist + patient) — stores → services only | TODO | | |
| C1.6 | Unit/integration: wrong patient cannot join; double-join idempotent | TODO | | |

---

## SLICE C2 — WebRTC + Server Record Engine *(diagram: WebRTC + Record Engine)*

> Gated on **S0.W / S0.R** winner. Resilience: [`ARCHITECTURE_CLOUD.md`](./ARCHITECTURE_CLOUD.md) §7.1.

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C2.1 | `RealtimeProvider` adapter (token mint from API; no secrets in app) | TODO | | |
| C2.2 | RN call UI: join/leave, mute, video optional / audio-only fallback | TODO | | |
| C2.3 | Server record engine integration (SFU record or bot) | TODO | | |
| C2.4 | On END: finalize server recording → redirect to object storage (audio key) | TODO | | |
| C2.5 | Therapist local backup buffer (rolling chunks on device; no mid-call upload by default) | TODO | | |
| C2.6 | Reconnect / mid-call network loss + soft “poor connection” warning | TODO | | |
| C2.7 | Purge local backup after session `ready` or after successful server select | TODO | | |
| C2.8 | Soak: 10–90 min call; concurrent ~10 rooms smoke | TODO | | |

---

## SLICE C3 — Session Lifecycle, Queue & Status *(diagram: Audio → backend)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C3.1 | Session state machine (`scheduled`→`live`→…→`selecting_audio`→`ready`\|`failed`) | TODO | | |
| C3.2 | `POST /sessions/:id/end` → `recording_finalizing` → completeness gate | TODO | | |
| C3.3 | Completeness gate: prefer server if duration ≈ call; else request therapist backup upload | TODO | | |
| C3.4 | Therapist backup multipart upload path (only when gate fails server) | TODO | | |
| C3.5 | Job queue + worker skeleton (idempotent enqueue per session on canonical key) | TODO | | |
| C3.6 | `GET /sessions/:id/status` for therapist "Generating PDF…" / "Saving recording…" UI | TODO | | |
| C3.7 | Therapist may start next session while previous job runs | TODO | | |
| C3.8 | Failure + retry policy; `RECORDING_MISSING` / degraded flags; no PHI in logs | TODO | | |

---

## SLICE C4 — Speech-to-Text *(diagram: STT)*

> Gated on **S0.S** winner. Free tier only for MVP.

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C4.1 | `SttProvider` port + env-selected free-tier adapter | TODO | | |
| C4.2 | Worker: pull audio from object storage → STT → transcript segments | TODO | | |
| C4.3 | Persist transcript to Postgres (+ optional transcript object backup) | TODO | | |
| C4.4 | Long audio strategy (chunk / concatenate) for 90 min sessions | TODO | | |
| C4.5 | Retry/backoff on rate limit; mark session `failed` after policy | TODO | | |
| C4.6 | Unit tests with mocked provider; fixture integration on spike corpus | TODO | | |

---

## SLICE C5 — Text Model / Structured Note *(diagram: Text Model)*

> Gated on **S0.L** winner. Free tier only for MVP. **No LangChain.**

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C5.1 | `LlmProvider` port + env-selected free-tier adapter | TODO | | |
| C5.2 | Prompt + JSON schema for structured clinical note (reuse/adapt on-device SOAP ideas) | TODO | | |
| C5.3 | `validateStructuredNote` before persist/display | TODO | | |
| C5.4 | Long-transcript strategy (map-reduce / sectioned summarize → final note) | TODO | | |
| C5.5 | Persist SOAP/structured JSON to Postgres | TODO | | |
| C5.6 | Unit tests: invalid JSON retry; empty sections; hallucination guards | TODO | | |

---

## SLICE C6 — PDF & Return to Doctor *(diagram: PDF)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C6.1 | Server PDF generator from structured note | TODO | | |
| C6.2 | Store PDF in object storage; save key on session | TODO | | |
| C6.3 | Therapist UI: generating state → ready → open/share PDF | TODO | | |
| C6.4 | Notification channel (in-app poll first; push optional) | TODO | | |
| C6.5 | Idempotent PDF regenerate on failure | TODO | | |
| C6.6 | Tests: large note pagination; status transitions; download authz | TODO | | |

---

## SLICE C7 — Postgres & Object Storage *(diagram: Postgres + save text/voice)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C7.1 | Schema: users, relationships, sessions, jobs, transcripts, notes, artifacts | TODO | | |
| C7.2 | Object storage adapter (`StorageProvider`) — audio + PDF keys only in DB | TODO | | |
| C7.3 | Indexes: therapist session list, status, created_at | TODO | | |
| C7.4 | Retention policy stub (delete/export hooks; no fine-tune pipeline) | TODO | | |
| C7.5 | Region/endpoint env wiring (US free → India later = config change) | TODO | | |
| C7.6 | Migration tests + backup/restore smoke for MVP | TODO | | |

---

## SLICE C8 — Ops Admin & Logging *(deferred dashboard)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C8.1 | Structured API/worker logs **without PHI** | TODO | | |
| C8.2 | Thin ops admin page (browser): list sessions, job status, last error | TODO | | |
| C8.3 | Operator auth (basic auth / magic link) — not patient/therapist product role | TODO | | |
| C8.4 | Optional later: provider usage proxy UI (LiteLLM etc.) — PARKED until needed | PARKED | | |

---

## SLICE C9 — Fine-tuning Voice Model *(diagram: Fine Tuning)*

| Sub | Description | Status | Tests | Impl |
|---|---|---|---|---|
| C9.1 | Training-data export job | PARKED | | Deferred — store audio+text only in C7 |
| C9.2 | Voice model fine-tune pipeline | PARKED | | Out of MVP |

---

## Suggested branch map

| Branch | Purpose |
|---|---|
| `spike/webrtc-record` | S0.2–S0.5 |
| `spike/stt-free-tier` | S0.6 |
| `spike/llm-free-tier` | S0.7 |
| `feat/cloud-auth-sessions` | C1 |
| `feat/cloud-webrtc-record` | C2 |
| `feat/cloud-pipeline-queue` | C3 |
| `feat/cloud-stt` | C4 |
| `feat/cloud-llm-note` | C5 |
| `feat/cloud-pdf` | C6 |
| `feat/cloud-storage` | C7 (may start earlier for C1 schema) |
| `feat/cloud-ops-admin` | C8 |
| `mvp_local_AI` | On-device archive — do not mix cloud slices here |

---

## Definition of Done (every sub-slice)

1. Test plan written when status → `IN PROGRESS` (TDD steps: [`PROJECT_RULES.md`](../PROJECT_RULES.md) §3).
2. Unit and/or integration tests green; links in **Tests** / **Impl** columns (test location habits: [`PROJECT_RULES.md`](../PROJECT_RULES.md) §9).
3. Code standards followed ([`PROJECT_RULES.md`](../PROJECT_RULES.md) §6 — e.g. kebab-case, ~115–150 lines).
4. No PHI in logs.
5. Provider URLs/keys only via env/adapters.
6. [`ARCHITECTURE_CLOUD.md`](./ARCHITECTURE_CLOUD.md) updated if flow/invariants changed.
7. Security-touching mobile work checked against [`OWASP_MOBILE_TOP_10.md`](./OWASP_MOBILE_TOP_10.md).
