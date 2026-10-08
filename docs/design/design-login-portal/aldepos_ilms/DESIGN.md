---
name: Aldepos ILMS
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#3f493f'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#6f7a6e'
  outline-variant: '#becabc'
  surface-tint: '#006d30'
  primary: '#00652c'
  on-primary: '#ffffff'
  primary-container: '#15803d'
  on-primary-container: '#d3ffd5'
  inverse-primary: '#79db8d'
  secondary: '#2e6a41'
  on-secondary: '#ffffff'
  secondary-container: '#b1f2be'
  on-secondary-container: '#347047'
  tertiary: '#b00032'
  on-tertiary: '#ffffff'
  tertiary-container: '#da1544'
  on-tertiary-container: '#fff0f0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#95f8a7'
  primary-fixed-dim: '#79db8d'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#b1f2be'
  secondary-fixed-dim: '#96d5a3'
  on-secondary-fixed: '#00210d'
  on-secondary-fixed-variant: '#12512c'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b6'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920028'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system serves an institutional Islamic boarding school foundation managing academic tracks, boarding quarters, religious curricula (Tahfidz, Kitab), and administrative workflows. The visual identity conveys dignity, order, structural permanence, and moral authority while maintaining modern enterprise efficiency.

- **Design Philosophy:** Institutional Modernism. The aesthetic prioritizes rigorous clarity, authoritative calm, and utilitarian structure. Flat planar architecture is paired with understated Islamic geometric motifs implemented exclusively as delicate tone-on-tone hairline watermarks or micro-perforations.
- **Tone of Voice:** Authoritative, disciplined, serene, and transparent.
- **Visual Boundaries:** Strictly avoid decorative dropshadows, glassmorphic blurs, organic skew, and neon accents. Visual interest arises from disciplined grid alignments, crisp typography, and disciplined emerald-and-slate contrasts.

## Colors

The color system combines deep botanical emeralds with slate gray neutrals and a decisive rose-red for critical alerts.

### Palette Architecture
- **Primary Emerald (`#15803d`):** Key interactive controls, active navigation nodes, completed progress bars, and authoritative validation indicators.
- **Dark Deep Emerald (`#14532d`):** Primary brand anchor, header bars, key institutional summaries, and high-impact structural framing.
- **Slate Neutrals:**
  - `slate-950` (`#0f172a`): Body copy, headings, and high-emphasis data points.
  - `slate-700` (`#334155`): Secondary text, field descriptors, and inactive table headers.
  - `slate-500` (`#64748b`): Tertiary captions, inactive icons, and metadata timestamps.
  - `slate-300` (`#cbd5e1`): Standard hairline dividers, structural 1px component borders, and inactive control outlines.
  - `slate-100` (`#f1f5f9`): Primary neutral background canvas, inner table row alternates, and secondary button fills.
  - `pure-white` (`#ffffff`): Component card planes, active modals, and data inputs.
- **Rose Alert Tokens:**
  - `rose-600` (`#e11d48`): Disciplinary violations, delinquent balance indicators, error messages, and destructive action states.
  - `rose-100` (`#ffe4e6`): Background containers for warning callouts and critical metric badges.

### Surface Treatment
Color fills are solid and opaque. Transitions between surfaces rely on 1px borders in `#cbd5e1` rather than diffuse drop shadows. Watermarked Islamic geometric patterns must be applied with a maximum opacity of 4% using `#14532d` on white/slate-100 or `#ffffff` on dark emerald panels.

## Typography

Inter serves as the sole typographic engine across all hierarchy levels. To support dense operational dashboards (santri rosters, payment reconciliations, grade ledgers), strict tracking and proportional metrics are enforced.

- **Numerals:** Tabular figures (`tnum`) must be forced on all financial ledgers, grade tables, identification codes, and date columns to preserve vertical scanning rhythm.
- **Headings:** Bold and semibold weights carry negative letter-spacing for tight architectural framing.
- **Labels & Microcopy:** Small caps and uppercase conversions must be reserved solely for `label-sm` (e.g., status badges, system pills), configured with generous positive letter-spacing (`+0.04em`) to ensure legibility.

## Layout & Spacing

The layout is built around an enterprise dashboard grid structured for dense information architecture and high productivity.

- **Breakpoints:**
  - Mobile (`< 768px`): 4 columns, single-tier stack, collapsible side rail, `margin: 1rem`.
  - Tablet (`768px - 1024px`): 8 columns, compact navigation bar, `margin: 1.5rem`.
  - Desktop (`> 1024px`): 12 columns, persistent 280px left navigation drawer, content container max-width 1600px, `margin: 2rem`.
- **Rhythm & Structure:** All inner margins and spacing follow an 8px architectural cadence (`0.25rem`, `0.5rem`, `0.75rem`, `1.25rem`, `2rem`). Forms and table data rows maintain a compact 36px or 40px height to prevent vertical bloat.

## Elevation & Depth

Visual hierarchy is maintained without heavy elevation drops. Depth is achieved entirely through structural surface tiering and crisp low-contrast borders.

- **Borders & Outlines:** Every container, card, modal, and dropdown uses a 1px solid border (`#cbd5e1`). Nested panels inside cards leverage an alternate surface fill (`#f1f5f9`) or a `#e2e8f0` border to demarcate inner boundaries.
- **Shadow Profile:** Box shadows are almost entirely eliminated, with two strict exceptions:
  - **Overlays & Modals:** `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)` to separate them from the backdrop.
  - **Dropdown Flyouts:** `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Surface Layering:**
  - Layer 0 (Base canvas): `#f1f5f9`
  - Layer 1 (Cards, sheets, tables): `#ffffff` with 1px `#cbd5e1` outline
  - Layer 2 (Active elements, headers, sidebars): `#14532d` or `#0f172a` for high-contrast context zones

## Shapes

The interface balances sharp institutional precision with ergonomic corner geometries.

- **Panels & Cards:** Enforce an exact `12px` corner radius (`rounded-lg`). This creates clear, framed zones for dashboards, santri profiles, and data charts.
- **Interactive Controls (Inputs, Buttons, Dropdowns):** Enforce an exact `8px` corner radius (`rounded-md`). This distinguishes functional elements from the panels containing them.
- **Badges, Tags, & Status Pills:** Formatted with `4px` or `6px` radii; pill-shaped full-round corners are prohibited to preserve the structured, non-casual enterprise tone.

## Components

### Buttons
- **Primary:** Solid `#15803d` background, `#ffffff` text, 8px radius, no shadow, 1px solid `#15803d`. Hover: `#14532d`. Focus: 2px offset ring with `#15803d`.
- **Secondary / Neutral:** `#ffffff` background, `#0f172a` text, 1px solid `#cbd5e1`, 8px radius. Hover: `#f1f5f9` background, `#0f172a` border.
- **Destructive:** `#ffffff` background, `#e11d48` text, 1px solid `#fca5a5`, 8px radius. Hover: `#ffe4e6` background, `#e11d48` border.
- **Sizing:** Compact (32px height, 12px px), Standard (40px height, 16px px).

### Input Fields & Controls
- **Text Inputs & Selects:** `#ffffff` background, 1px solid `#cbd5e1`, 8px radius, height 40px, font `body-md`. Focus state: 1px border `#15803d` accompanied by an inner ring of 1px `#15803d`. Error state: 1px border `#e11d48`, background `#fff1f2`.
- **Checkboxes & Radios:** 18px size, 1px solid `#cbd5e1`, 4px radius (checkbox) or circular (radio). Checked state: solid `#15803d` fill with sharp `#ffffff` icon.

### Cards & Data Panels
- Background `#ffffff`, 12px radius, 1px solid `#cbd5e1`. Padding: 20px desktop, 16px mobile.
- Headers within cards must feature a 1px solid `#f1f5f9` bottom border separating title metadata from card contents.

### Chips & Badges
- Strict rectangular forms with 4px corner radius.
- **Success / Completed:** Background `#f0fdf4`, text `#15803d`, 1px border `#bbf7d0`.
- **Warning / Pending:** Background `#fefce8`, text `#a16207`, 1px border `#fef08a`.
- **Critical / Violation / Unpaid:** Background `#ffe4e6`, text `#e11d48`, 1px border `#fecdd3`.
- **Neutral / Informational:** Background `#f1f5f9`, text `#334155`, 1px border `#cbd5e1`.

### Data Tables (Academic / Financial Rosters)
- Surface: `#ffffff`, 1px solid `#cbd5e1`, 12px outer wrapper radius.
- Header row: Background `#f8fafc`, text `#64748b`, font `label-md`, height 40px, border-bottom 1px solid `#cbd5e1`.
- Rows: Background alternating between `#ffffff` and `#fafafa` on density mode; row height 44px; cell font `body-md` (tabular numerals enabled). Hover state: `#f1f5f9`.

### Domain-Specific Components
- **Tahfidz Memorization Tracker:** Segmented progress strip using 12px panel bounding, segmented blocks shaded from `#f1f5f9` (not started) to `#15803d` (mutqin/verified), separated by 1px white lines.
- **Islamic Lattice Watermark Frame:** Applied to certification headers and high-level card headers: inline SVG repeating 8-point geometric star mesh, styled via CSS mask with 3% opacity `#14532d`.