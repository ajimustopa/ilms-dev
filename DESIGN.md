---
name: Core Aldepos - Portal Guru
description: Enterprise Classic Mobile-First Design System for Core Aldepos Portal Guru
colors:
  primary: "#059669"
  primary-hover: "#047857"
  bg-app: "#f8fafc"
  surface: "#ffffff"
  surface-subtle: "#f1f5f9"
  border: "#e2e8f0"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#64748b"
  status-success: "#059669"
  status-success-bg: "#ecfdf5"
  status-warning: "#d97706"
  status-warning-bg: "#fffbeb"
  status-danger: "#e11d48"
  status-danger-bg: "#fff1f2"
  status-info: "#4f46e5"
  status-info-bg: "#eef2ff"
typography:
  page-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  section-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "14px"
---

# Design System — Core Aldepos Portal Guru

## Overview
Portal Guru adalah antarmuka web utilitas mobile-first (baseline 360px) untuk guru Yayasan Aldepos. Sistem menggunakan pendekatan **Enterprise Classic** bernuansa terang, tenang, dan berdensitas nyaman (*comfortable density*), berorientasi pada kecepatan entri data dan aksesibilitas tinggi.

## Colors
- **Latar:** `#F8FAFC` (Slate-50)
- **Permukaan:** `#FFFFFF` (White)
- **Border:** `#E2E8F0` (Slate-200)
- **Teks Utama:** `#0F172A` (Slate-900, kontras 16.5:1)
- **Teks Sekunder:** `#475569` (Slate-600)
- **Brand Accent:** `#059669` (Emerald-600)
- **Status Semantik:**
  - Sukses: `#059669` / Soft `#ECFDF5`
  - Peringatan: `#D97706` / Soft `#FFFBEB`
  - Bahaya: `#E11D48` / Soft `#FFF1F2`
  - Info: `#4F46E5` / Soft `#EEF2FF`
- **Dark Mode:** Adaptif via `prefers-color-scheme: dark` atau `.dark` tanpa paksaan.

## Typography
- **Keluarga Font:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Angka Tabular:** Wajib menerapkan `.tnum` (`tabular-nums`) untuk jam jadwal, KPI, dan nilai siswa.

## Layout
- **Mobile First:** Dirancang khusus untuk kenyamanan satu tangan pada layar 360px+.
- **Navigasi:** 5-slot fixed bottom navigation bar (Beranda, Jadwal, Tombol Absen Tengah 44px, Nilai, Akun).

## Elevation & Depth
- Default elemen kerja menggunakan border 1px solid (`border border-slate-200`) tanpa bayangan mengambang.
- Modal & dropdown menggunakan bayangan lembut `shadow-sm` atau `shadow-md`.
- **Anti-Glow:** Tombol aksi utama bebas dari efek pendaran (glow shadow).

## Shapes
- `rounded-lg` (8px) untuk kontainer kartu dan baris tabel.
- `rounded-sm` (6px) untuk input form dan chip kehadiran.
- `rounded-full` (9999px) untuk avatar dan tombol aksi cepat.

## Components
- **StatRibbonCard:** Kartu data dengan strip indikator semantik 4px di sisi kiri.
- **Attendance Chips:** Tombol kotak 38x38px bertuliskan kode huruf eksplisit **H**, **I**, **S**, **A**.
- **Form Inputs & Nilai:** Tinggi seragam 44px dengan teks tajam dan focus ring 2px.

## Do's and Don'ts
- **DO:** Pastikan seluruh target sentuh minimal 44x44px.
- **DO:** Tampilkan status multi-modal (warna + teks/huruf).
- **DON'T:** Dilarang menggunakan gradasi warna dekoratif `bg-gradient-to-*`.
- **DON'T:** Dilarang menggunakan glassmorphism atau efek pendaran neon.
- **DON'T:** Dilarang menimbulkan scroll horizontal pada viewport mobile.
