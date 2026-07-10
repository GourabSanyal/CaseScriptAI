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

## Brand & Style

The design system is centered on the "Quiet Therapy Room" philosophy. It prioritizes emotional regulation for therapists managing complex caseloads. The aesthetic is a blend of **Soft Minimalism** and **Organic Professionalism**, avoiding the coldness of traditional medical software in favor of a tactile, grounded atmosphere.

**Target Audience:** Mental health professionals and clinical administrators.
**Emotional Response:** Composed, supported, focused, and unhurried.
**Visual Direction:** High-end stationary meets soft digital interfaces. The UI utilizes expansive whitespace and low-frequency visual changes to reduce cognitive load. High-contrast elements are replaced with tonal shifts to maintain a "low-arousal" environment.

## Colors

The palette is derived from natural, muted tones to prevent eye strain during long documentation sessions. 

- **Primary (Sage Green):** Used for primary actions and active states. It represents growth and stability.
- **Secondary (Mist Blue):** Used for supportive information and secondary interactive elements.
- **Surface (Light Stone):** Used for card backgrounds and input fields to provide subtle separation from the warm off-white background.
- **Functional States:** In place of traditional red for errors, use a deep **Warm Slate (#726D6A)** with an icon to indicate attention. Success states should use a slightly more saturated version of the primary Sage.
- **Text:** Avoid pure black. Use a deep, warm grey for primary text to maintain the soft aesthetic.

## Typography

The design system utilizes **DM Sans** for its approachable, geometric clarity and soft terminals. 

- **Scale:** Typographic hierarchy is established through weight and color rather than drastic size jumps.
- **Readability:** Body text uses a generous 1.5x line height to facilitate the reading of long clinical notes.
- **Alignment:** Left-aligned text is preferred for all clinical documentation to ensure a predictable "F-pattern" scanning for the therapist.

## Layout & Spacing

This design system employs a **Fluid-Inset Model**. While the app utilizes a standard 12-column grid for tablet/desktop views, the mobile experience relies on consistent "breathing room" around elements.

- **Negative Space:** Use `section` spacing (48px) between major functional blocks to prevent the UI from feeling cluttered or overwhelming.
- **Touch Targets:** Minimum touch target size is 44x44px, but primary pill buttons should aim for 56px height to emphasize ease of use.
- **Reflow:** On tablets, sidebars should use the "Light Stone" surface color to create a distinct but soft functional zone.

## Elevation & Depth

To maintain a "flat and focused" feel, the system avoids traditional drop shadows. Depth is communicated through:

- **Tonal Layering:** The Background (#F7F5F0) is the lowest level. Surface Cards (#E8E4DC) sit on top. Active elements (like pressed buttons) shift slightly in hue rather than lifting off the page.
- **Micro-Borders:** Use 1px solid borders in a color 5% darker than the surface color to define boundaries without adding visual weight.
- **Blur:** For modal overlays, use a soft backdrop blur (10px - 15px) to maintain the sense of the "room" behind the dialogue.

## Shapes

The shape language is fundamentally **Ovoid and Organic**. 

- **Interactive Elements:** Buttons and tags must be fully pill-shaped (radius 24px+) to evoke a sense of softness and safety.
- **Containers:** Cards and input fields use a 16px radius (`rounded-lg`). 
- **Iconography:** Use soft-line icons (2px stroke) with rounded caps and joins. Avoid sharp 90-degree corners in custom illustrations or UI graphics.

## Components

### Buttons
- **Primary:** Sage Green background, white text, pill-shaped.
- **Secondary:** Mist Blue background or Light Stone with a Primary border.
- **Interaction:** On press, reduce opacity to 0.8 with a 300ms ease-in-out transition.

### Cards
- **Structure:** Background in Light Stone (#E8E4DC), 16px corner radius, no shadow. 
- **Padding:** 20px internal padding to ensure content doesn't feel cramped.

### Input Fields
- **Style:** Light Stone background with a subtle Mist Blue border (1px) when focused. 
- **Labels:** Always visible, positioned above the field in `label-lg` style.

### Feedback & Progress
- **Progress Bars:** Use thick, pill-shaped tracks in Sage Green.
- **Animations:** Transitions between screens should use a "Cross-Fade + Slight Slide" (500ms duration) to mimic a calm breathing rhythm. Avoid "pop" or "snap" animations.

### Case Chips
- Small pill-shaped badges used for patient tags or status. Use Mist Blue with 12px horizontal padding.