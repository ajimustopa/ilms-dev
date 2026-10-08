---
name: Aldepos HRIS Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#555c6d'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e7486'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#dce2f6'
  tertiary-fixed-dim: '#c0c6da'
  on-tertiary-fixed: '#151b2a'
  on-tertiary-fixed-variant: '#404757'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
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
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style
The design system serves an institutional, high-reliability educational foundation HR environment (Human Resource Information System - Modul Kepegawaian). Its core personality is structured, dependable, precise, and operational. Users range from school foundation executives and HR administrators to operational branch supervisors handling personnel records, attendance, psychological testing, and leave permissions.

The visual style follows modern enterprise minimalism with purposeful density. It pairs an authoritative dark midnight sidebar navigation with an ultra-clean, high-legibility light canvas for high-volume tabular workflows. It eliminates visual fluff, relying on crisp 1px borders, purposeful emerald accents for critical actions, and cobalt/indigo cues for state tabs to direct cognitive attention swiftly.

## Colors
The color architecture relies on functional zoning:

- **Deep Midnight (`#0B1220`):** Used strictly as the persistent structural background for the primary sidebar navigation and brand anchors, framing the workspace with institutional weight.
- **Emerald Green (`#059669`):** The primary interactive driver. Reserved for primary calls-to-action (e.g., *Ajukan Cuti / Izin*), active sidebar menu pill selection, and positive operational states.
- **Indigo / Royal Blue (`#4F46E5`):** Secondary interactive indicator, specifically orchestrating segment tabs, view switchers, active filter states, and analytical focal points.
- **Canvas & Surface System:** Canvas neutral background uses soft slate white (`#F6F8FA`), cards and tables use pristine white (`#FFFFFF`), while subtle hairline dividers and structure outlines rely on neutral borders (`#E2E8F0`).
- **Typography Neutrals:** Headings and primary data text use deep slate (`#0F172A`), secondary metadata and captions use mid slate (`#64748B`), and subdued table headers or empty state texts use light slate (`#94A3B8`).

## Typography
The system adopts **Inter** across all typographic hierarchies to optimize tabular legibility, micro-copy scanning, and numerical alignment.

- **Data-Dense Optimization:** The scale prioritizes compact, crisp sizing between 11px and 14px for general operations, keeping page headers restrained at 20px (`headline-lg`) to preserve maximum vertical space for data tables.
- **Section & Table Headers:** Subheaders, table column markers, and grouped metadata utilize `label-sm` (11px uppercase with `0.04em` tracking) in muted `#64748B` to create immediate visual scannability.
- **Tabular Numerals:** All data grids and statistical counters use OpenType tabular figure styling (`tnum`) to keep financial amounts, dates, and headcounts perfectly vertically aligned.

## Layout & Spacing
The layout follows an administrative enterprise shell architecture composed of:
1. **Fixed Sidebar:** A 256px wide persistent dark column containing foundation branding, module tags, user roles, and scrollable vertical navigation.
2. **Top Utility Bar:** A 56px high horizontal bar handling institution switchers (e.g., *SMP Aldepos Boarding School*), quick actions, and user session profiles.
3. **Workspace Canvas:** An edge-to-edge flexible layout framed with `1.5rem` (`margin`) outer padding. 

Spacings are biased toward high density:
- **Component Padding:** Tables utilize compact vertical row spacing (8px to 10px vertical cell padding via `space-sm`) and generous horizontal alignment (`space-md`).
- **Responsive Adaptability:** On viewports below 1024px, the sidebar collapses into an off-canvas drawer accessed via a hamburger trigger, while table containers activate horizontal smooth-scroll with locked primary identification columns.

## Elevation & Depth
This design system avoids heavy shadows, adopting a flat, structured low-contrast outline paradigm:

- **Level 0 (Canvas Base):** Background workspace rendered in `#F6F8FA`.
- **Level 1 (Card & Sheet Surface):** Data grids, toolbars, and operational sections rest on pure white (`#FFFFFF`) bound by a 1px solid border (`#E2E8F0`). No drop shadow is applied in resting state.
- **Level 2 (Dropdowns & Popovers):** Institutional switchers, notification flyouts, and context menus employ a subtle ambient shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)` over a 1px `#E2E8F0` border.
- **Level 3 (Modal Dialogs):** Leave application modals, employee assignment sheets, and confirmation dialogs float with `0 20px 25px -5px rgba(15, 23, 42, 0.12)` layered above a semi-opaque `#0B1220` (60% alpha) backdrop.

## Shapes
The visual geometry communicates precision and clean modern execution using a standardized `roundedness: 2` (0.5rem / 8px) scale:

- **Buttons, Text Inputs, and Dropdown Triggers:** Styled with `8px` corner radius for an ergonomic yet compact touch/click target.
- **Badges, Tags, and Status Chips:** Formed with full pill styling (`9999px`) to immediately differentiate metadata tokens from clickable square buttons.
- **Cards and Data Enclosures:** Bound by `8px` or `12px` rounded corners with crisp border strokes.
- **Sidebar Active Items:** Rounded at `8px` to nest flush inside the sidebar container's 12px internal margin gutters.

## Components

### Buttons
- **Primary Button (Emerald):** Background `#059669`, text `#FFFFFF`, font weight 600. Hover state `#047857`. Focus ring 2px offset with `#10B981`. Includes optional left icon for actions (e.g., `+ Ajukan Cuti / Izin`).
- **Secondary / Ghost Button:** Background transparent or `#FFFFFF`, border 1px solid `#E2E8F0`, text `#0F172A`. Hover background `#F1F5F9`.
- **Icon Utility Button:** Square 36x36px with rounded 8px corners, border 1px solid `#E2E8F0`, hover background `#F8FAFC`.

### Navigation & Tabs
- **Sidebar Nav Items:** Height 40px, rounded 8px. Resting state `#94A3B8` icon/text on `#0B1220`. Hover state `#F8FAFC` text with `#1E293B` background. Active state solid `#059669` fill with `#FFFFFF` text and icon.
- **Horizontal Segment Tabs:** Underline tabs with active tab colored in indigo `#4F46E5` with a 2px bottom border line and bold font weight. Badge counters next to tab text inherit the indigo tint (`#EEF2FF` fill with `#4F46E5` label).

### Data Tables & Empty States
- **Headers:** `#F8FAFC` background, uppercase 11px font (`label-sm`), letter spacing `0.04em`, text `#64748B`, 1px border-bottom `#E2E8F0`.
- **Rows:** 44px min-height, alternating or clean white rows with 1px border-bottom `#F1F5F9`. Hover state shifts cell backgrounds to `#F8FAFC`.
- **Empty State Display:** Centered vertical container with a clean illustration or muted calendar icon, secondary text `#64748B` at 13px, and an optional immediate contextual creation action.

### Status Badges & Chips
- **Pending / In Review:** Fill `#FEF3C7`, text `#D97706`.
- **Approved / Active:** Fill `#ECFDF5`, text `#059669`.
- **Rejected / Terminated:** Fill `#FEF2F2`, text `#DC2626`.
- **Role Chips (`super_admin`):** Dark badge with `#1E293B` background and `#38BDF8` text for system administrative highlights.

### Form Inputs & Filters
- **Text Inputs & Selects:** 36px height, 1px border `#E2E8F0`, placeholder `#94A3B8`, active focus border `#4F46E5` with a subtle focus glow (`ring-1 ring-indigo-500/20`).
- **Institution Switcher:** Pill-shaped selector with institution icon, chevron indicator, `#FFFFFF` background, and 1px border `#E2E8F0`.