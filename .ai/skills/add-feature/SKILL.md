---
name: add-feature-monorepo
description: Workflow for adding a new business feature (e.g., new AI processing step).
---
# Workflow: Add Feature
1. **Analyze Dependency**: Determine if logic belongs in `packages/ai-core` (reusable) or `apps/CaseScriptAI/src/services` (app-specific).
2. **Type Definition**: Add new shared types to `packages/shared-types` before implementation.
3. **Service Layer**: Implement the logic in `src/services/`.
4. **Hook Integration**: Create a custom hook in `src/hooks/` to expose service state to the UI.
5. **UI Implementation**: Add the screen/component in `src/app/` or `src/components/`.
6. **Verification**: AI must check `eval/scripts/run-eval.ts` to see if a new evaluation case is needed for this feature.