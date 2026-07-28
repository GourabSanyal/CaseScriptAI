---
name: Serene Clinical Interface
colors:
  surface: '#fcf9f5'
  surface-dim: '#dcdad6'
  surface-bright: '#fcf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ef'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e4'
  surface-container-highest: '#e5e2de'
  on-surface: '#1c1c19'
  on-surface-variant: '#414943'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f3f0ec'
  outline: '#717973'
  outline-variant: '#c0c9c1'
  surface-tint: '#3a6750'
  primary: '#3a6750'
  on-primary: '#ffffff'
  primary-container: '#7faf94'
  on-primary-container: '#13422e'
  inverse-primary: '#a0d2b5'
  secondary: '#4c616d'
  on-secondary: '#ffffff'
  secondary-container: '#cce3f1'
  on-secondary-container: '#506671'
  tertiary: '#605e58'
  on-tertiary: '#ffffff'
  tertiary-container: '#a7a49d'
  on-tertiary-container: '#3b3a35'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceed0'
  primary-fixed-dim: '#a0d2b5'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#214f39'
  secondary-fixed: '#cfe6f4'
  secondary-fixed-dim: '#b3cad7'
  on-secondary-fixed: '#061e28'
  on-secondary-fixed-variant: '#344a55'
  tertiary-fixed: '#e6e2da'
  tertiary-fixed-dim: '#cac6be'
  on-tertiary-fixed: '#1c1c17'
  on-tertiary-fixed-variant: '#484741'
  background: '#fcf9f5'
  on-background: '#1c1c19'
  surface-variant: '#e5e2de'
typography:
  display:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  headline-lg-mobile:
    fontFamily: DM Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section: 48px
  gutter: 16px
  margin-mobile: 20px
  margin-tablet: 40px
---

## Runtime source of truth

App screens must consume tokens from `apps/CaseScriptAI/src/constants/theme.ts` via `useTheme()`, `ThemedText`, and `ThemedView`. Do **not** hardcode hex values in screens. This file is the design reference; if prose and `theme.ts` diverge, **update this file or `theme.ts` together**.

Mapped app tokens (light):

| Role | Hex | `theme.ts` |
|------|-----|------------|
| Background / surface | `#fcf9f5` | `background`, `surface` |
| Card / element | `#f0ede9` | `backgroundElement` |
| Selected / high container | `#ebe8e4` | `backgroundSelected`, `surfaceContainerHigh` |
| Primary text | `#1c1c19` | `text` |
| Secondary text | `#414943` | `textSecondary` |
| Primary (sage) | `#3a6750` | `primary` |
| On primary | `#ffffff` | `onPrimary` |
| Outline | `#717973` | `outline` |
| Outline variant | `#c0c9c1` | `outlineVariant` |
| Primary fixed dim | `#a0d2b5` | `primaryFixedDim` |
| Secondary fixed dim | `#b3cad7` | `secondaryFixedDim` |
| Secondary container (HIPAA bar) | `#cce3f1` | `secondaryContainer` |
| On secondary container | `#506671` | `onSecondaryContainer` |

Font: **DM Sans** (`assets/fonts/DMSans.ttf`, `useDmSans()` → `FontFamily.sans`). Spacing/radius: `Spacing` / `Radius` in `theme.ts` (e.g. `three` = 16, `section` = 48, card radius `md` = 16, pill `lg`/`full`). Tablet breakpoint: `Layout.tabletBreakpoint` (768).

## Brand & style

"Quiet Therapy Room" — soft minimalism for clinicians documenting encounters. Prefer tonal layers over high-contrast chrome.

**Audience:** Clinicians using CaseScriptAI (record → process → SOAP / sessions).
**Feel:** Composed, focused, unhurried.
**Direction:** Warm off-white field, sage actions, mist-blue secondary accents; whitespace over density.

## Colors

- **Primary (sage `#3a6750`):** Primary actions and active states.
- **Secondary (mist / `#4c616d` family):** Supportive UI; chips and secondary actions lean on secondary-container / fixed-dim tokens.
- **Surfaces:** Page `#fcf9f5`; raised content `#f0ede9` / `#ebe8e4` — not flat pure white cards with heavy shadow.
- **Text:** `#1c1c19` / `#414943` — never pure black `#000000`.
- **Errors:** Prefer semantic error tokens from the palette above when needed; pair with iconography. Success stays in the sage family.

## Typography

DM Sans. Hierarchy via weight and color more than large size jumps. Body ~1.5× line height for long notes. Left-align clinical documentation.

## Layout & spacing

- Major blocks: `section` (48px).
- Mobile margins ~20px; tablet ~40px (`Spacing.marginMobile` / `marginTablet`).
- Touch targets ≥ 44×44; primary pills aim ~56px height.
- Tablet: soft side zones using surface-container tones.

## Elevation & depth

No heavy drop shadows. Depth via tonal layering:

- Lowest: background `#fcf9f5`
- Content: `#f0ede9` / `#ebe8e4`
- 1px borders using outline / outline-variant
- Modals: light backdrop blur (10–15px) when used

## Shapes

- Buttons / tags: pill (`Radius.lg` / `full`)
- Cards / inputs: 16px (`Radius.md`)
- Icons: soft 2px stroke, rounded caps

## Components

### Buttons

- Primary: sage fill, on-primary text, pill.
- Secondary: mist / surface with primary outline.
- Press: opacity ~0.8, ~300ms ease.

### Cards

- Fill `backgroundElement` (`#f0ede9`), 16px radius, no shadow, ~20px padding.

### Inputs

- Surface-container fill; focused border from secondary / outline tokens.
- Labels always visible above the field (`label-lg`).

### Feedback & progress

- Thick pill progress tracks in sage.
- Screen transitions: cross-fade + slight slide (~500ms); avoid snap/pop.

### Status chips

- Pill badges for session / patient tags; mist secondary-container with horizontal padding.
