---
name: Aldepos Sarpras Modern UI
colors:
  surface: '#f3fcf4'
  surface-dim: '#d3dcd5'
  surface-bright: '#f3fcf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf6ee'
  surface-container: '#e7f0e9'
  surface-container-high: '#e1eae3'
  surface-container-highest: '#dce5dd'
  on-surface: '#151d19'
  on-surface-variant: '#3f4943'
  inverse-surface: '#2a322d'
  inverse-on-surface: '#eaf3ec'
  outline: '#6f7a73'
  outline-variant: '#bec9c1'
  surface-tint: '#006c4c'
  primary: '#005138'
  on-primary: '#ffffff'
  primary-container: '#006c4c'
  on-primary-container: '#93eac2'
  inverse-primary: '#81d7b0'
  secondary: '#4d6357'
  on-secondary: '#ffffff'
  secondary-container: '#cde6d6'
  on-secondary-container: '#51685b'
  tertiary: '#254b5b'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e6374'
  on-tertiary-container: '#b8def2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9df4cb'
  primary-fixed-dim: '#81d7b0'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005138'
  secondary-fixed: '#d0e8d9'
  secondary-fixed-dim: '#b4ccbd'
  on-secondary-fixed: '#0a1f16'
  on-secondary-fixed-variant: '#364b40'
  tertiary-fixed: '#c2e8fc'
  tertiary-fixed-dim: '#a6cce0'
  on-tertiary-fixed: '#001f2a'
  on-tertiary-fixed-variant: '#254b5c'
  background: '#f3fcf4'
  on-background: '#151d19'
  surface-variant: '#dce5dd'
typography:
  headline-small:
    fontFamily: Roboto Flex
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 32px
  title-large:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 28px
  title-medium:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.15px
  title-small:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  body-large:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-medium:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  body-small:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.4px
  label-large:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-medium:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  label-small:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-density, institutional utility interface designed specifically for campus facilities and asset operations (*Sarana dan Prasarana*) within an Islamic boarding school environment. The visual personality communicates stewardship (*amanah*), order, and pragmatic operational clarity.

### Aesthetic Foundation
- **Style Archetype:** Modern Material Design 3 (M3) Enterprise Utility. The interface emphasizes functional density over ornamental whitespace, ensuring rapid inventory auditing, facility inspections, and maintenance ticket processing.
- **Tone & Mood:** Trustworthy, institutional, disciplined, and calm. Visual distractions are removed to maximize operational efficiency during prolonged working sessions by administrative and estate staff.
- **Copy & Localization:** Strictly Indonesian using standard institutional sentence case (e.g., *Tambah aset baru*, *Jadwal pemeliharaan gedung*, *Cetak label inventaris*). Avoid untranslated technical jargon or mixed-language titling.

## Colors

The color system derives strictly from Material Design 3 tonal palettes keyed to a signature Islamic deep green seed.

### Core M3 Tonal Palette
- **Primary:** `#006C4C` | **On-Primary:** `#FFFFFF`
- **Primary Container:** `#8EF6C5` | **On-Primary Container:** `#002114`
- **Secondary:** `#4D6357` | **On-Secondary:** `#FFFFFF`
- **Secondary Container:** `#CFE9D8` | **On-Secondary Container:** `#0A1F16`
- **Tertiary:** `#3E6374` | **On-Tertiary:** `#FFFFFF`
- **Tertiary Container:** `#C2E8FD` | **On-Tertiary Container:** `#001F2A`

### Surface & Canvas Hierarchy
- **Surface:** `#FBFDF8`
- **On-Surface:** `#191C1A`
- **On-Surface Variant:** `#404943`
- **Outline:** `#707973`
- **Outline Variant:** `#C0C9C1`
- **Surface Container Lowest:** `#FFFFFF` (Data table cells, active sheet panels)
- **Surface Container Low:** `#F5F7F2` (Card backgrounds, canvas backdrop)
- **Surface Container:** `#EFF2ED` (Dividers, base panels)
- **Surface Container High:** `#E9ECE7` (Toolbar overlays, filtering sidebars)
- **Surface Container Highest:** `#E3E6E1` (Hover states, subtle row striping)

### Operational Status Semantics
Asset conditions must map directly to explicit container and on-container pairings to ensure WCAG AAA accessibility across audits:
- **Kondisi Baik (Success):** Container `#D1F2D9` | On-Container `#0A391B`
- **Rusak Ringan / Rusak Sedang (Warning):** Container `#FFECD2` | On-Container `#4A2800`
- **Rusak Berat (Error):** Container `#FFDAD6` | On-Container `#410002`
- **Dihapusbukukan / Nonaktif (Neutral/Archived):** Container `#E1E4DE` | On-Container `#404943`

## Typography

The type scale strictly follows Material Design 3 desktop administrative specifications, utilizing `Roboto Flex` with OpenType tabular figures (`font-variant-numeric: tabular-nums`) enabled universally across data tables, inventory counts, currency fields, and date stamps.

### Formatting Rules & Data Standards
- **Mata Uang (Currency):** Explicit space between currency symbol and amount with period thousands separator: `Rp 1.250.000` (never `Rp. 1.250.000` or `IDR 1250000`).
- **Dimensi & Luas (Dimensions & Area):** Metric notation with standard spaces: `12.500 m²`, `45,5 ha`, `3 × 4 m`.
- **Format Tanggal (Date Stamp):** Three-letter Indonesian abbreviated month: `07 Okt 2026`, `14 Jan 2025`.
- **Kode Inventaris (Asset Tag/SKU):** Set in `label-medium` or `body-small` with tabular uppercase figures: `ALD-ASSET/2026/GDA-041`.

## Layout & Spacing

A rigid 8dp base grid system governs structural alignment, paired with a secondary 4dp sub-grid for internal component padding, table cells, and compact form fields.

### Grid & Breakpoints
- **Desktop (≥ 1240px):** Fixed 280px left navigation rail or standard navigation drawer; 12-column layout with 24px (`1.5rem`) canvas margins and 16px (`1rem`) gutters. Dense tables allow 8px inline cell gutters.
- **Tablet (600px - 1239px):** 84px modal navigation rail; 8-column layout with 16px canvas margins.
- **Mobile (< 600px):** Single-column stacked layout with bottom app navigation bar; 16px outer margin.

### Density & Rhythms
As an enterprise workplace interface, high data density is prioritized:
- Standard data table row height is capped at 48px; compact table views at 40px.
- Stacked form fields use `space-md` (12px) separation.
- Component-internal padding adheres to 8px horizontal, 4px vertical for dense buttons and status chips.

## Elevation & Depth

In alignment with modern Material Design 3 guidelines, structural hierarchy is established through **tonal surface layering** rather than heavy drop shadows.

### Elevation Levels
- **Level 0 (Flat, Resting):** Surface background `#FBFDF8` with no shadow. Structural card separation is achieved via `1px solid` border using `outline-variant` (`#C0C9C1`).
- **Level 1 (Hovered Card, Top App Bar, Scrolled State):** Surface Container Low (`#F5F7F2`) with ambient diffuse shadow: `0px 1px 2px rgba(0, 0, 0, 0.08), 0px 1px 3px 1px rgba(0, 0, 0, 0.04)`.
- **Level 2 (Floating Action Button, Dropdown Menus):** Surface Container (`#EFF2ED`) with ambient shadow: `0px 2px 6px 2px rgba(0, 0, 0, 0.10)`.
- **Level 3 (Modal Dialogs, Drawer Overlays):** Surface Container High (`#E9ECE7`) with scrim backdrop overlay (`#000000` at 32% opacity).

## Shapes

The design system applies strict, differentiated corner radiuses to distinguish interactive triggers from structured containers.

### Shape Role Hierarchy
- **Buttons (Filled, Tonal, Outlined):** Full pill border radius (`9999px` / `rounded-full`).
- **Floating Action Buttons (FAB):** M3 standard large rounded corners (`16px`).
- **Cards & Data Panels:** Medium rounded corners (`12px`).
- **Filter & Status Chips:** Small-medium rounded corners (`8px`).
- **Form Text Fields & Dropdowns:** Outlined container radius (`4px`).
- **Dialogs & Sheets:** Large container radius (`28px` top/all).

## Components

### Buttons
- **Filled Button (Primary Action):** Background `#006C4C`, label `#FFFFFF`, border-radius `9999px`, height 40px, padding 0 24px. Hover applies 8% state layer tint `#FFFFFF`.
- **Tonal Button (Secondary Action):** Background `#CFE9D8`, label `#0A1F16`, border-radius `9999px`, height 40px.
- **Outlined Button (Tertiary/Cancel):** Border `1px solid #707973`, label `#006C4C`, border-radius `9999px`, height 40px.
- **Icon Buttons:** 40×40px target, standard 24px `Material Symbols Outlined` icon centered, fully circular (`9999px`).

### Chips & Badges
- **Status Chips (Kondisi Aset):** Height 24px, border-radius `8px`, typography `label-small`.
  - *Baik:* Container `#D1F2D9`, text `#0A391B`, leading check icon 14px.
  - *Rusak Ringan / Sedang:* Container `#FFECD2`, text `#4A2800`, leading alert icon 14px.
  - *Rusak Berat:* Container `#FFDAD6`, text `#410002`, leading warning icon 14px.
  - *Dihapusbukukan:* Container `#E1E4DE`, text `#404943`, leading block icon 14px.
- **Filter Chips:** Height 32px, border-radius `8px`, border `1px solid #707973`, active state fill `#CFE9D8` with check icon.

### Form Inputs & Controls
- **Outlined Text Field:** Height 52px (compact office spec), corner radius `4px`, resting border `1px solid #707973`, active focus `2px solid #006C4C`. Floating label in `body-small`. Tabular alignment for financial/numeric inputs.
- **Checkboxes & Radios:** Selection fill `#006C4C`, on-color `#FFFFFF`, unselected outline `#707973`, checkbox border radius `2px`.

### Cards & Data Tables
- **Asset Data Table:** Resting surface `#FFFFFF`, row height 44px, row border bottom `1px solid #EFF2ED`. Header row `#F5F7F2` with `title-small` in `#404943`. Numbers and monetary amounts right-aligned with monospace/tabular spacing.
- **Facility Card:** Background `#FFFFFF`, border `1px solid #C0C9C1`, border-radius `12px`, padding 16px. Header features location tag (`label-medium`), title (`title-medium`), and summary metric counter.

### Floating Action Button (FAB)
- Extended or regular FAB: Corner radius `16px`, background `#8EF6C5`, icon/text `#002114`, resting elevation 2, hover elevation 3. Used exclusively for primary workflows such as *Pindai QR / Barcode* or *Catat Aset Masuk*.