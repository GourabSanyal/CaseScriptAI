# UI — Dual Auth Entry + Motion

> **Branch:** `hacktoberfest/render-session-note` (keep work here; do not merge into cloud MVP docs).  
> **Purpose:** Checklist of mobile UI work for separate therapist/patient entry and low-end-safe animations.  
> **Backend:** Demo/local auth only. Real JWT, invite expiry, and Postgres roles remain cloud slice **C1**.

---

## Goals

1. Separate therapist vs patient entry UX (one app binary, server-owned roles later).
2. Native screen transitions + light Reanimated micro-motion.
3. Smooth on low-end devices: reduced-motion + lite-tier budgets; no layout-property animation spam.

---

## Change list

| ID | Change | Status |
|----|--------|--------|
| U1 | Auth welcome chooser (“I’m a therapist” / “I have an invite”) | DONE |
| U2 | Therapist login screen (demo credentials → therapist session) | DONE |
| U3 | Patient join screen (invite/code → patient session) | DONE |
| U4 | Redirect legacy `(auth)/login` + `(auth)/signup` into new flow | DONE |
| U5 | Patient route group + waiting-room screen | DONE |
| U6 | Launch gate: unauthenticated → welcome; role → therapist app or patient room | DONE |
| U7 | Role guards on `(app)` and `(patient)` layouts | DONE |
| U8 | Account: show role + sign out | DONE |
| U9 | Native Stack transitions on `(auth)`, `(onboarding)`, `(patient)` | DONE |
| U10 | Motion budget (`none` / `essential` / `full`) from reduced-motion + device tier | DONE |
| U11 | Shared `FadeIn` for auth/patient entry polish | DONE |
| U12 | Toast enter/exit via opacity + translateY (non-layout) | DONE |
| U13 | Waveform ambient loop only when motion budget is `full` | DONE |
| U14 | Unit tests: demo auth service + auth store + motion budget | DONE |
| U15 | Disable local model download / ExecuTorch boot (`LOCAL_ON_DEVICE_AI_ENABLED = false`) | DONE |
| U16 | Boot → auth → role home (no `/(onboarding)/model-download` gate) | DONE |

---

## Product rules (locked for this UI)

| Topic | Choice |
|-------|--------|
| Apps | One binary; role-gated trees |
| Therapist entry | Account login (demo offline) |
| Patient entry | Invite / join code (demo offline) |
| Security boundary | Role from session store; layouts redirect wrong role. Real authz on API in C1 |
| Motion | Native stack + Reanimated `opacity` / `transform` only |
| Low-end | `lite` tier or OS reduced-motion → no ambient loops; fades/slides only or instant |

---

## Route map

```
(auth)/welcome
(auth)/therapist-login
(auth)/patient-join
(auth)/login          → redirect welcome
(auth)/signup         → redirect therapist-login
(patient)/waiting-room
(app)/*               → therapist only (existing tabs)
```

---

## Demo credentials (UI only)

| Role | How |
|------|-----|
| Therapist | Any email + password (≥6 chars), or “Continue as therapist” |
| Patient | Invite code `JOIN-DEMO` (case-insensitive) or any code ≥6 chars |

---

## Local models vs external APIs

`apps/CaseScriptAI/src/constants/features.ts` → `LOCAL_ON_DEVICE_AI_ENABLED`.

| Flag | Boot path |
|------|-----------|
| `false` (this branch) | Splash → auth welcome → therapist/patient home. No download, no ExecuTorch. |
| `true` | Historical on-device path: model download gate + ExecuTorch before `(app)`. |

---

## Follow-ups (not this checklist)

- Wire demo auth to cloud C1 JWT / SecureStore tokens
- Deep-link invite tokens (`casescriptai://join/...`)
- Pairing model grill (assigned list vs invite) in `ARCHITECTURE_CLOUD.md`
- Reanimated static feature flags in release builds after profiling
