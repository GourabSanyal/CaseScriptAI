# CaseScriptAI — Cloud MVP Architecture

> **Cloud-backed** live therapist↔patient sessions for **iOS + Android** (web later).
> Audio is recorded **server-side**, stored, transcribed (STT API), structured (LLM API), and returned as PDF.
> Free-tier providers for MVP; India residency / compliance hardening later via **config/provider swap** (not a rewrite).
>
> This file is the source of truth for the **cloud MVP**. The on-device offline product remains in
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) + [`SLICES_PLAN.md`](./SLICES_PLAN.md) (branch `mvp_local_AI` / historical).
> Companion tracker: [`SLICES_PLAN_CLOUD.md`](./SLICES_PLAN_CLOUD.md). Dev practices: [`PROJECT_RULES.md`](../PROJECT_RULES.md).
> Security: still read [`OWASP_MOBILE_TOP_10.md`](./OWASP_MOBILE_TOP_10.md) for mobile auth/storage/network work.

---

## 1. Product Flow (source of truth)

1. **Auth / pairing** → therapist and patient are identities in Postgres; therapist creates or opens a session; patient joins via invite/deep link (pairing model TBD in grill).
2. **Live session** → both join a WebRTC room over the internet (video optional, audio required).
3. **Server-side record engine** → a recorder on the media path (SFU and/or recording bot) captures session audio while the call is live.
4. **END** → recording is **redirected** to object storage; session status → `queued` for processing. Therapist UI: **"Generating PDF…"** and **can start the next session**.
5. **Pipeline** (async worker): `ObjectStorage audio → STT → transcript → LLM (structured note) → PDF → Postgres metadata + object keys`.
6. **Return to doctor** → PDF ready; in-app status + download / share.
7. **Fine-tuning** → **out of scope** for MVP (audio + text retained for future export only).

---

## 2. Scale & constraints (MVP)

| Item | Value |
|---|---|
| Therapists | 10 |
| Patients per therapist | ~100 |
| Concurrency | **1 live call per therapist** (~10 concurrent rooms peak) |
| Session length | 10–90 minutes |
| Clients | React Native for therapist **and** patient; web later |
| Media | Video optional; audio-only fallback |
| Note timing | **After session ends** (no live draft in MVP) |
| AI providers | **Free tier** for MVP bake-off + early demos |
| Data residency | Target **India** later; MVP may use free US APIs behind adapters |
| Compliance (India / PHI) | **Deferred** for build velocity — must not be forgotten before real patients |
| Fine-tuning | Deferred |

Peak load is small: prefer **one VPS / simple PaaS + job queue**, not Kubernetes.

---

## 3. High-level architecture

```
Therapist App ──┐
                ├── WebRTC (internet) ──► SFU / signaling ──► Server Record Engine
Patient App  ──┘                                              │
                                                              ▼
                                                     Object Storage (audio)
                                                              │
                                                              ▼
Backend API + Job Queue ──► STT Provider ──► LLM Provider ──► PDF
        │                         │                │           │
        └─────────────────────────┴────────────────┴───────────┴──► Postgres
                                                                      │
                                                         Ops admin (thin) + therapist status UI
```

```mermaid
flowchart TB
  subgraph mobile [ReactNative]
    TApp[TherapistApp]
    PApp[PatientApp]
  end

  subgraph realtime [RealtimeInternet]
    SFU[SFU_or_Calls]
    Rec[ServerRecordEngine]
  end

  subgraph backend [Backend]
    API[SessionAPI_TS]
    Q[JobQueue]
    W[Worker]
    PG[(Postgres)]
    OBJ[(ObjectStorage)]
    Admin[OpsAdminPage]
  end

  subgraph ai [FreeTierAdapters]
    STT[SttProvider]
    LLM[LlmProvider]
  end

  TApp <-->|WebRTC| SFU
  PApp <-->|WebRTC| SFU
  SFU --> Rec
  Rec -->|redirect_on_END| OBJ
  TApp -->|REST_status| API
  API --> PG
  API --> Q
  Q --> W
  W --> OBJ
  W --> STT
  W --> LLM
  W --> PG
  W -->|PDF_key| OBJ
  Admin --> API
```

---

## 4. Layered architecture

```
Mobile UI (Expo Router)          therapist + patient screens
        │
Mobile stores / services         call session, status poll, PDF fetch — no provider keys in app
        │
Backend API (TypeScript)         auth, sessions, WebRTC tokens, job enqueue, status, admin
        │
Workers                          STT → LLM → PDF; provider adapters only
        │
Foundation                       Result/errors, session state machine, provider ports
        │
Infra                            Postgres, object storage, SFU/recording, free-tier APIs
```

**Rules:**

- Screens never call STT/LLM APIs directly — only your backend.
- `SttProvider` / `LlmProvider` / `StorageProvider` / `RealtimeProvider` are **interfaces**; swap region or vendor via env (one-variable / config change toward India).
- **No LangChain** for MVP — linear job + prompt file + JSON schema validation.
- **No PHI in logs** (even on free-tier demos).

---

## 5. Session state machine

```
scheduled → live → ending → recording_finalizing → queued
  → stt_running → llm_running → pdf_running → ready
  ↘ failed (retryable)
```

Therapist after END: navigate freely; soft badge / status **"Generating PDF for this session"**.

---

## 6. Key components

| Component | Responsibility |
|---|---|
| **Auth & pairing** | Therapist/patient roles; session create/join; invite tokens |
| **Realtime / WebRTC** | Internet calls; video optional; signaling + media path that supports **server recording** (STUN-only is insufficient for server record) |
| **Server record engine** | Captures mixed (or dual) audio during live call; on END redirects artifact to object storage |
| **Session API** | CRUD + status; issues realtime tokens; enqueues pipeline |
| **Object storage** | Audio + PDF blobs; Postgres holds keys/metadata only |
| **Job queue + worker** | One pipeline job per session; retry; idempotent |
| **SttProvider** | Free-tier Whisper-class API behind adapter |
| **LlmProvider** | Free-tier text model → validated structured note (SOAP JSON) |
| **PdfGenerator** | Structured note → PDF in object storage |
| **Ops admin page** | Operator-only thin UI: sessions, job status, last error (not pgAdmin; not therapist product UI) |
| **Therapist status UI** | `GET /sessions/:id/status` + PDF when `ready` |

---

## 7. WebRTC & recording (locked direction)

| Decision | Choice |
|---|---|
| Network | Internet (not LAN-only) |
| Recording | **Server-side**; redirect finished audio to object storage / pipeline |
| STUN-only | **Not enough** for server recording — need SFU and/or recording bot that receives media |
| Client local backup | Optional later; MVP bake-off may be server-only (accept drop risk) |
| Bake-off | Spike branches first; measure connect/disconnect, A/V quality, record→storage→Postgres row |

Preferred portable pattern: **recording bot joins room** (or SFU egress record) → file → object storage. Swapping Cloudflare Calls vs LiveKit later should not rewrite the STT/LLM pipeline.

---

## 8. Storage

| Store | Contents |
|---|---|
| **Postgres** | users, relationships, sessions, job status, transcript text, SOAP JSON, object keys, sizes, checksums |
| **Object storage** | raw/session audio, PDF |
| **Not in Postgres** | large WAV/MP4 blobs as row bytes |

Fine-tuning export: deferred; keep durable audio + text.

---

## 9. Free tier & region strategy

- MVP: free STT + free LLM behind adapters; same code path for “demo prod.”
- Free tier ≠ SLA: rate limits, ToS, and US processing conflict with later India/PHI — adapters must make cutover a **config change**.
- India cutover target: `STORAGE_ENDPOINT` / `STT_PROVIDER` / `LLM_PROVIDER` / `REALTIME_URL` (names illustrative) point to India-hosted or self-hosted equivalents.
- Unified mega-dashboard deferred: **API logs + simple ops admin page** for 10 therapists. Provider usage UIs (e.g. LiteLLM) optional later.

---

## 10. Language / stack (MVP recommendation)

| Layer | Choice |
|---|---|
| Mobile | TypeScript / React Native (extend product app on cloud branch) |
| API + workers | TypeScript monolith first (Fastify/Hono + job queue) |
| Spikes | Allowed in TS/Python/Rust for bake-off only; winners feed adapters |
| Rust / Python in prod | Only if a spike proves necessary (e.g. self-host Whisper) |
| LangChain | **No** for MVP |

---

## 11. Branching & validation workflow

| Mode | Purpose |
|---|---|
| `spike/*` | Out-of-app bake-offs (WebRTC+record, STT, LLM); decision matrix in `spikes/` |
| `feat/*` | Integrate winners into app + backend E2E |
| On-device archive | Keep offline architecture on `mvp_local_AI` / [`ARCHITECTURE.md`](./ARCHITECTURE.md) |

Hybrid: short spikes → document winner → feature branches for product E2E. Do not bake-off only inside full app UI.

---

## 12. Explicitly out of scope (MVP)

| Item | When |
|---|---|
| Fine-tuning voice model | Later |
| Live draft transcript during call | Later |
| Full observability suite | After thin ops admin |
| Hard India residency + DPDP/HIPAA-grade compliance | Before real PHI in production |
| Web therapist dashboard | After mobile MVP |
| LangChain / agent graphs | Not planned |

---

## 13. Change control

1. Update **this file** and [`SLICES_PLAN_CLOUD.md`](./SLICES_PLAN_CLOUD.md) **before** cloud MVP code that changes flow or invariants.
2. Do **not** overwrite [`ARCHITECTURE.md`](./ARCHITECTURE.md) / [`SLICES_PLAN.md`](./SLICES_PLAN.md) for cloud work.
3. Mark sub-slices `IN PROGRESS` (with test plan) before implementation; `DONE` only when tests green.
4. Provider or region swaps go through adapter + env — avoid hardcoding vendor URLs in screens.

---

## 14. Open grill items (do not silently assume)

- Therapist↔patient pairing model (assigned list vs invite link)
- Exact SFU product (Cloudflare Calls vs LiveKit vs other) after spike
- Recording bot vs SFU-native egress
- STT/LLM free-tier winners after bake-off
- Expected languages (en / hi / mixed)
- SOAP schema reuse from on-device `prompts.ts` vs new schema
- India host (VPS vs AWS/GCP Mumbai) when leaving free US APIs
