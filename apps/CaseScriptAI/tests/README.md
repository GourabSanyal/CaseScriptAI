# Test Isolation Layout (Expo App)

This project keeps tests fully isolated from runtime code.

## Rules

- Keep all testing libraries in `devDependencies` only.
- Keep all tests under `tests/` (or `e2e/`) only.
- Do not import from `tests/` inside `src/app`, `src/hooks`, or `src/services`.
- Keep all test setup in `tests/setup/jest.setup.ts`.

## Folder Structure

```text
apps/CaseScriptAI/
  jest.config.ts
  .detoxrc.js
  tests/
    setup/
      jest.setup.ts
    unit/
      services/
        ai/
        audio/
        pdf/
      stores/
      utils/
    integration/
      hooks/
      pipeline/
  e2e/
    smoke/
    pipeline/
```

## What goes where

- `tests/unit/**`: pure functions and service-level behavior with mocked dependencies.
- `tests/integration/**`: hooks/components and multi-step pipeline behavior.
- `e2e/**`: real app launch/navigation/flow verification on simulator/emulator.

## Placeholders

Every scaffolded test file contains comment stubs like:

- `// code for <function name> - unit tests`
- `// code for <Pipeline section> - happy flow`
- `// code for <function name> - e2e tests`

Replace those comments with actual tests as you implement.
