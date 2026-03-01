---
name: manage-navigation
description: Use when adding screens, changing layouts, or handling deep links.
---
# Workflow: Navigation Management
1. **Identify Group**: Choose the correct group:
   - `(auth)` for login/signup.
   - `(onboarding)` for setup/downloads.
   - `(app)` for core authenticated logic (recording, preview).
2. **Layout Check**: Ensure every new folder has a `_layout.tsx` if it requires a shared Header or Tab state.
3. **Safe Area**: All screens in `src/app/` must use `ThemedView` or `SafeAreaView` from the start of the file.
4. **Link Usage**: Always use the `router` object or `<Link />` component from `expo-router`. Never use `react-navigation` directly.