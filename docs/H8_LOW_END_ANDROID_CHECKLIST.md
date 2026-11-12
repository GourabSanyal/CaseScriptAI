# H8.5 — Low-end Android motion checklist

Use a ~3GB RAM device or emulator (API 30+). Build a **release** or at least a production-like client (`LOCAL_ON_DEVICE_AI_ENABLED=false`).

| Check | Pass? |
|-------|-------|
| Cold launch splash does not jank / finishes | |
| Welcome wake banner → therapist Google or demo login | |
| Home tab scrolls; waveform card respects reduced motion if enabled in system settings | |
| **Demo** tab → Generate demo note → Ready → Open/share PDF | |
| System **Remove animations** / reduce motion → splash and collapsible stay static | |
| No `/poc` or `/explore` reachable in release | |

Motion budget: `useMotionBudget()` → `none` skips Reanimated enter transitions.
