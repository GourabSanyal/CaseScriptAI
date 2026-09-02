# OWASP Mobile Top 10 — CaseScriptAI mapping

> Canonical security checklist for this app. **Entered via [`ARCHITECTURE.md`](./ARCHITECTURE.md)** (see §15).  
> Upstream source: [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/) (2024 final release).  
> Companion testing guide: [OWASP MASTG](https://owasp.org/www-project-mobile-security-testing-guide/).

When changing auth, storage, crypto, networking, native modules, or logging: check the matching row below **before** coding. Prefer fixing at the shared service/layer (root cause), not per-screen.

---

## Top 10 Mobile Risks (2024)

| ID | Risk | CaseScriptAI MVP posture | Primary code / docs |
|---|---|---|---|
| **M1** | Improper Credential Usage | No cloud AI credentials. AES key via Keychain/Keystore (`KeyStore`); never hardcode production keys. No secrets in `EXPO_PUBLIC_*`. | `key-store.ts`, `crypto-service.ts`, `AGENTS.md` Security |
| **M2** | Inadequate Supply Chain Security | Pin known deps via yarn lockfile; model assets checksum-gated (Worker/MMKV/`FALLBACK_CHECKSUMS`). Prefer few new packages. | `checksum-validator.ts`, `fallback-checksums.ts`, `yarn.lock` |
| **M3** | Insecure Authentication/Authorization | MVP: OS device lock only (no app PIN). Paywall gated at **navigation** (`router.push('/paywall')`), not UI-hide-only. | `paywall.tsx`, `.cursor/rules/navigation.mdc`, `ARCHITECTURE.md` |
| **M4** | Insufficient Input/Output Validation | LLM SOAP must pass `validateSoapOutput` before display/persist. Fallible paths return `Result<T>`. | `output-validator.ts`, `prompts.ts`, `result.ts` |
| **M5** | Insecure Communication | Offline-first after model download; no cloud inference. Downloads over HTTPS (HF / Worker). PHI never uploaded. | `ARCHITECTURE.md` §1, §5, §7 |
| **M6** | Inadequate Privacy Controls | PHI on-device only; never log transcripts, SOAP, or audio paths in production; generic toasts only. | `global-error-handler.ts`, `PROJECT_RULES.md` §8 |
| **M7** | Insufficient Binary Protections | Release: Android R8/ProGuard; strip `console.log`; Hermes bytecode baseline. No extra obfuscation lib until V1 hardening. | `AGENTS.md` Security, `.ai/skills/react-native-best-practices/` |
| **M8** | Security Misconfiguration | Dev client / EAS for native AI (not Expo Go). Web = UI testing only. (PHI store crypto → M9/M10.) | `eas.json`, `AGENTS.md` |
| **M9** | Insecure Data Storage | Sessions/queue/chunks → SQLCipher; SOAP files → AES-GCM; MMKV = config only (no PHI blobs). Purge temp WAV after `COMPLETE`. | `session-repository.ts`, `encrypted-soap.ts`, `mmkv.ts` |
| **M10** | Insufficient Cryptography | AES-GCM for files; SQLCipher for DB; key material in platform secure storage. Block unverifiable model binaries. | `crypto-service.ts`, `encrypted-soap.ts`, `checksum-validator.ts` |

---

## Watchlist (not in 2024 Top 10; still relevant here)

From OWASP’s “may consider later” set — track for this codebase:

| Topic | Why it matters here | Guard |
|---|---|---|
| Data leakage | Logs, crash reports, toasts | See **M6** |
| Hardcoded secrets | POC crypto placeholders | See **M1** (and **M10** for key material) |
| Unprotected endpoints / deeplinks | Expo Router routes | See **M3** |
| Unsafe sharing | PDF/share sheet | Export only user-initiated SOAP PDF |

---

## Historical lists (reference only)

Do **not** use these as the active checklist — 2024 supersedes them.

- **2016:** Improper Platform Usage, Insecure Data Storage, Insecure Communication, Insecure Authentication, Insufficient Cryptography, Insecure Authorization, Client Code Quality, Code Tampering, Reverse Engineering, Extraneous Functionality  
- **2014:** Weak Server Side Controls, Insecure Data Storage, Insufficient Transport Layer Protection, Unintended Data Leakage, Poor Authorization and Authentication, Broken Cryptography, Client Side Injection, Security Decisions Via Untrusted Inputs, Improper Session Handling, Lack of Binary Protections  

Full upstream detail: https://owasp.org/www-project-mobile-top-10/

---
