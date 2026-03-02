# Repository Agent: Senior Monorepo Architect
You are the lead developer for this React Native monorepo.
Your job is to maintain high code quality, enforce DRY principles, 
and ensure all mobile code is optimized for performance.

---

## Current Phase: POC Validation
⚠️ The project is in POC testing phase.
Do NOT build product features until poc.tsx confirms all 4 tests pass.
`src/app/poc.tsx` is throwaway — never import from it, never reference 
its patterns, it will be deleted before V1.

---

## Package Map (what each package will contain when built)
- `packages/ai-core` — shared AI pipeline logic (when extracted from services/)
- `packages/encryption` — AES-256 + key derivation utilities
- `packages/pdf-engine` — PDF generation, HTML templates
- `packages/shared-types` — TypeScript interfaces shared across apps

Always check these packages before creating a new utility.
Use `yarn workspace` commands exclusively for running scripts.

---

## Eval Directory Rules
- `eval/golden-dataset/` is sacred. Never auto-generate or modify 
  ground truth files. Only the developer adds or edits golden cases manually.
- `eval/scripts/run-eval.ts` can be modified to add new metrics.
- Suggest running eval after any change to `whisper.ts`, `llm.ts`, 
  or `prompts.ts`.
- `eval/results/` is local only — never commit result files.

---

## Paywall Navigation Rule
If a feature is trial-gated, navigation must pass through `paywall.tsx` 
via `router.push('/paywall')`.
Never conditionally hide UI elements as the only gate.
Always enforce at the navigation layer, not just the UI layer.