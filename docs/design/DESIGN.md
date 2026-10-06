# Design System & UI Tokens — Core Aldepos Portal Guru

**Dokumen Acuan:** [docs/PRD-PORTAL-GURU-UIUX.md](file:///c:/PROYEK/Core%20Aldepos/docs/PRD-PORTAL-GURU-UIUX.md) & [docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md](file:///c:/PROYEK/Core%20Aldepos/docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md)  
**Status:** Canonical Design Tokens (Aturan Baku Implementasi Frontend Portal Guru)  

---

## 1. Skema Warna & Semantik Tailwind Standar

Sistem warna menggunakan kelas Tailwind standar yang sudah aktif di proyek, **BUKAN** token Material Design 3 / Google Stitch.

### A. Background, Surface, Border, & Teks
- **Latar Belakang Aplikasi (Canvas):** `bg-slate-50` (`#F8FAFC`)
- **Permukaan Kartu / Modal / Panel:** `bg-white` (`#FFFFFF`)
- **Border Default:** `border-slate-200` (`#E2E8F0`)
- **Border Lebih Kontras (Divider/Active):** `border-slate-300` (`#CBD5E1`)
- **Teks Utama:** `text-slate-900` (`#0F172A`) — kontras tinggi untuk keterbacaan data
- **Teks Sekunder (Label/Metadata):** `text-slate-600` (`#475569`)
- **Teks Muted (Placeholder/Timestamp):** `text-slate-500` (`#64748B`) / `text-slate-400` (`#94A3B8`)

### B. Aksi Utama & Brand Accent
- **Tombol / Aksi Utama (Primary):** `bg-emerald-600` (`#059669`) dengan hover `hover:bg-emerald-700` (`#047857`) dan teks `text-white`.
- **Focus Ring Form:** `focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`.

### C. 4 Pilar Status Semantik
Warna antarmuka hanya mengikuti status data (multi-modal: warna + teks/huruf):
- **1. Success / Hadir / Tuntas / Disetujui (Emerald):**
  - Background: `bg-emerald-50` (`#ECFDF5`)
  - Border: `border-emerald-200` (`#A7F3D0`)
  - Text: `text-emerald-700` (`#047857`)
  - Accent Solid: `bg-emerald-600` (`#059669`)
- **2. Danger / Alpa / Kritis / Terlambat / Di Bawah KKM (Rose):**
  - Background: `bg-rose-50` (`#FFF1F2`)
  - Border: `border-rose-200` (`#FECDD3`)
  - Text: `text-rose-700` (`#BE123C`)
  - Accent Solid: `bg-rose-600` (`#E11D48`)
- **3. Warning / Izin / Pending / Menunggu Verifikasi (Amber):**
  - Background: `bg-amber-50` (`#FFFBEB`)
  - Border: `border-amber-200` (`#FDE68A`)
  - Text: `text-amber-700` (`#B45309`)
  - Accent Solid: `bg-amber-600` (`#D97706`)
- **4. Info / Sakit / Konseling BK / Pengumuman Penting (Indigo):**
  - Background: `bg-indigo-50` (`#EEF2FF`)
  - Border: `border-indigo-200` (`#C7D2FE`)
  - Text: `text-indigo-700` (`#4338CA`)
  - Accent Solid: `bg-indigo-600` (`#4F46E5`)
  *(Catatan: Indigo HANYA digunakan untuk status info/sakit/konseling, bukan untuk tombol aksi utama).*

---

## 2. Tabel Pemetaan Token Stitch Mockup -> Kelas Tailwind Proyek

| Token / Konsep pada Mockup Stitch | Kelas Tailwind Standar Proyek | Keterangan |
|---|---|---|
| `bg-surface-container-lowest` / `bg-surface` | `bg-white` | Latar putih untuk kartu, tabel, dan form |
| `bg-background` / `bg-surface-container-low` | `bg-slate-50` | Latar utama aplikasi (*canvas*) |
| `border-outline-variant` / `border-outline` | `border-slate-200` | Border halus 1px solid standar |
| `text-on-surface` / `text-on-background` | `text-slate-900` | Teks utama kontras tinggi |
| `text-on-surface-variant` | `text-slate-600` / `text-slate-500` | Teks label & deskripsi sekunder |
| `bg-primary` / `bg-primary-container` | `bg-emerald-600` (hover: `bg-emerald-700`) | Tombol aksi utama (*primary action*) |
| `text-primary` / `text-primary-container` | `text-emerald-700` / `text-emerald-600` | Teks link aktif atau penekanan |
| `bg-secondary-container` / `text-secondary` | `bg-indigo-50` / `text-indigo-700` | Status Sakit / Catatan Konseling BK |
| `bg-error-container` / `text-error` | `bg-rose-50` / `text-rose-700` | Status Alpa / Peringatan / Nilai Kurang |
| `font-headline-sm` / `font-label-md` | `text-lg font-semibold` / `text-xs font-semibold` | Tipografi standar Tailwind |

---

## 3. Radius, Tipografi, & Ikonografi

### A. Batasan Corner Radius
- **`rounded-lg` (8px / `0.5rem`):** Untuk tombol, input form, card data, dropdown menu, tab pill, badge status, dan attendance chips.
- **`rounded-xl` (12px / `0.75rem`):** Untuk container modal popup, drawer filter bar, action sheet, dan panel section utama.
- **`rounded-full` (9999px):** **HANYA** untuk avatar foto profil dan badge indikator bundar kecil.
- **DILARANG KERAS:** Menggunakan `rounded-2xl` (16px) dan `rounded-3xl` (24px) pada seluruh elemen kode produksi.

### B. Tipografi & Angka Tabular
- **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Angka Tabular (`tabular-nums` / `.tnum`):** Wajib diterapkan pada seluruh kolom jam pelajaran, KPI, persentase absensi, nominal, dan sel entri nilai rapor (`font-variant-numeric: tabular-nums`).

### C. Ikonografi
- **Library Ikon:** Wajib menggunakan **`lucide-react`** yang sudah terpasang di `apps/core-portal`.
- **DILARANG:** Memakai Google Material Symbols Outlined dari file mockup HTML.

---

## 4. Komponen Shell Kanonis & Aturan Penyatuan

Setiap halaman Portal Guru wajib mematuhi spesifikasi kanonis berikut:

1. **Desktop Sidebar (`w-64`):**
   - Lebar kanonis: `w-64` (256px).
   - Posisi & Layer: `fixed left-0 top-0 h-screen z-50`.
   - Latar & Batas: `bg-white border-r border-slate-200`.
   - Profil Sekolah: Unit selector & identitas guru aktif.
2. **Desktop & Mobile Top App Bar (`h-16`):**
   - Tinggi: `h-16` (64px).
   - Posisi Desktop: `fixed top-0 left-64 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6`.
   - Posisi Mobile: `fixed top-0 w-full z-50 pt-safe bg-white/95 backdrop-blur-md border-b border-slate-200 px-4`.
3. **Mobile Bottom Navigation (5 Slot):**
   - Posisi: `fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200`.
   - Slot Navigasi:
     1. Beranda (`/guru/dashboard`)
     2. Jadwal (`/guru/jadwal`)
     3. Tombol Cepat Absen Tengah (Touch target min. 44x44px)
     4. Nilai (`/guru/penilaian`)
     5. Akun/Profil (`/guru/profil`)
4. **Attendance Chips (H / I / S / A):**
   - Ukuran mobile: Touch target minimal **44x44px** (mis. `min-w-[44px] min-h-[44px] rounded-lg font-bold`).
   - Kode eksplisit: **H** (Hadir - Emerald), **I** (Izin - Amber), **S** (Sakit - Indigo), **A** (Alpa - Rose).

---

## 5. Catatan Penyimpangan Mockup Stitch & Ketetapan Kanonis

Pada inspeksi mockup HTML/PNG, ditemukan beberapa penyimpangan teknis. Seluruh kode implementasi **WAJIB** mengikuti nilai kanonis berikut:

| Area | Penyimpangan di Mockup Stitch | Nilai Kanonis yang Ditetapkan (Wajib) |
|---|---|---|
| **Sidebar Desktop (11-profil)** | `11-profil` menggunakan `w-[260px]` | Wajib seragam **`w-64`** (256px) |
| **Sidebar Desktop (08-siswa)** | `08-siswa` tanpa `border-r`, hanya shadow | Wajib memiliki **`border-r border-slate-200`** |
| **Sidebar z-index (05-tp)** | `05-tujuan-pembelajaran` menggunakan `z-40` | Wajib seragam **`z-50`** |
| **Mobile Header (03-pengajuan)** | `03-pengajuan-izin` menggunakan `sticky top-0 z-30` | Wajib seragam **`fixed top-0 z-50`** |
| **Radius Kontainer (01, 02, 03, 04, 07)** | Menggunakan `rounded-2xl` di beberapa container | Wajib diturunkan ke maksimal **`rounded-xl`** |
| **Border Header Mobile (04 s/d 11)** | Menggunakan shadow tanpa border bawah | Wajib memiliki **`border-b border-slate-200`** |
