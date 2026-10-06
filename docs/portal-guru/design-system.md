# DESIGN SYSTEM PORTAL GURU
**Core Aldepos Monorepo — Mobile-First Enterprise Classic**  
**Status:** Ditetapkan & Mengikat (Binding)  
**Pilihan Desain:** Opsi A (Enterprise Classic, Tema Terang) dengan Revisi Adaptif  
**Dokumen Rujukan:** `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md`, `docs/AUDIT-PORTAL-GURU.md`

---

## 1. Filosofi & Prinsip Desain
1. **Mobile-First Utilitas Kerja (360px Baseline):** Seluruh antarmuka dirancang untuk kenyamanan guru saat memegang HP dengan satu tangan di ruang kelas atau di gerbang sekolah.
2. **Kerapatan Informasi Berimbang (*Comfortable Density*):** Ketinggian baris data 40px pada mobile, memaksimalkan keterbacaan nama santri dan angka nilai tanpa membuat layar terasa sesak.
3. **Anti-Glow & Ketegasan Visual:** Tidak ada efek pendaran (glow), bayangan neon, atau gradasi warna-warni yang mengaburkan data resmi sekolah.
4. **Multi-Modal Accessibility:** Pembedaan status (seperti kehadiran siswa) tidak boleh mengandalkan warna semata; wajib menyertakan kode huruf (H/I/S/A), ikon, atau label teks yang jelas.

---

## 2. Palet Warna Semantik

### A. Tema Terang (Default)
| Peran / Token | Hex | Tailwind Class | Penggunaan | Rasio Kontras |
|---|---|---|---|---|
| **Latar Aplikasi (Background)** | `#F8FAFC` | `bg-slate-50` | Latar belakang seluruh halaman | Baseline |
| **Permukaan Kartu (Surface)** | `#FFFFFF` | `bg-white` | Kontainer kartu data, list, dialog | 16.5:1 terhadap Slate-900 |
| **Permukaan Sekunder (Subtle)**| `#F1F5F9` | `bg-slate-100` | Header tabel, chip non-aktif | 14.8:1 |
| **Border / Garis Pembatas** | `#E2E8F0` | `border-slate-200` | Border 1px solid elemen kerja | Netral |
| **Teks Utama (Primary Text)** | `#0F172A` | `text-slate-900` | Judul, nama siswa, nilai angka | 16.5:1 (AAA) |
| **Teks Sekunder (Secondary)** | `#475569` | `text-slate-600` | Sublabel, ruang kelas, NISN | 7.0:1 (AAA) |
| **Teks Redup (Muted)** | `#64748B` | `text-slate-500` | Placeholder, tanggal, helper text | 4.6:1 (AA) |
| **Aksen Brand Utama** | `#059669` | `bg-emerald-600` | Tombol CTA utama, tombol absen | 4.7:1 terhadap Putih |
| **Aksen Brand Hover/Active** | `#047857` | `bg-emerald-700` | State tekan tombol brand | 6.2:1 |

### B. Status Semantik (4 Status + Netral)
| Token Status | Warna Teks / Border | Background Lembut | Makna di Portal Guru |
|---|---|---|---|
| `success` (Emerald) | `#059669` (`text-emerald-700`) | `#ECFDF5` (`bg-emerald-50`) | Hadir (H), Nilai Tuntas, Presensi Masuk Tepat Waktu |
| `warning` (Amber) | `#D97706` (`text-amber-700`) | `#FFFBEB` (`bg-amber-50`) | Izin (I), Menunggu Persetujuan Cuti, Belum Absen |
| `danger` (Rose) | `#E11D48` (`text-rose-700`) | `#FFF1F2` (`bg-rose-50`) | Alpa (A), Nilai Remedial, Terlambat, Pelanggaran Santri |
| `info` (Indigo) | `#4F46E5` (`text-indigo-700`) | `#EEF2FF` (`bg-indigo-50`) | Sakit (S), Sesi KBM Berlangsung, Pengumuman Resmi |
| `neutral` (Slate) | `#475569` (`text-slate-700`) | `#F1F5F9` (`bg-slate-100`) | Jadwal Mendatang, Riwayat Lampau, Data Arsip |

### C. Mode Gelap Adaptif (`prefers-color-scheme: dark` / `.dark`)
- **Latar:** `#090D16` (`dark:bg-slate-950`)
- **Permukaan Kartu:** `#111827` (`dark:bg-slate-900`)
- **Border:** `#1E293B` (`dark:border-slate-800`)
- **Teks Utama:** `#F8FAFC` (`dark:text-slate-50`)
- **Teks Sekunder:** `#94A3B8` (`dark:text-slate-400`)
- **Status Background:** Transparan dengan opasitas 15-20% (`rgba(..., 0.15)`).

---

## 3. Tipografi
- **Font Utama:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`
- **Angka Finansial & Nilai:** Wajib menggunakan kelas `.tnum` (`font-variant-numeric: tabular-nums`)
- **Skala Tipografi:**
  - `Page Title`: 20px / Font-Weight 600 (Semibold) / Line-Height 1.3
  - `Section Title`: 16px / Font-Weight 600 (Semibold) / Line-Height 1.4
  - `Body Text`: 14px / Font-Weight 400 atau 500 / Line-Height 1.5
  - `Table Header / Subtitle`: 12px / Font-Weight 600 / Line-Height 1.4
  - `Table Body / Row Info`: 13px / Font-Weight 400 / Line-Height 1.4
  - `Caption / Metadata / Pill`: 11px atau 12px / Font-Weight 600 / Line-Height 1.3

---

## 4. Spasi, Radius & Bayangan

### A. Skala Spasi (Spacing)
- `4px` (`gap-1`, `p-1`) — Jarak antar-ikon dan teks kecil
- `8px` (`gap-2`, `p-2`) — Jarak antar-chip status absensi
- `12px` (`gap-3`, `p-3`) — Padding dalam banner alert & input
- `14px` (`p-3.5`) — Padding default kartu mobile (*comfortable*)
- `16px` (`gap-4`, `p-4`) — Margin samping layar & jarak antar-seksi
- `20px / 24px` — Jarak pemisah header halaman

### B. Token Radius
- `rounded-lg` (8px) — Kartu data, baris tabel, badge status, chip absensi
- `rounded-xl` (12px) — Wrapper modal dialog, bottom sheet, panel besar
- `rounded-sm` (6px) — Input teks, kotak nilai angka, tombol kecil
- `rounded-full` (9999px) — Avatar, status pill lonjong, tombol aksi floating

### C. Token Bayangan (Shadows)
- **Default Elemen Kerja:** Border 1px solid (`border border-slate-200`) tanpa shadow
- `shadow-sm` — Dropdown menu, popover tanggal
- `shadow-md` / `shadow-lg` — Bottom sheet modal, dialog konfirmasi
- **Tombol Absen Tengah:** Solid Emerald dengan `shadow-md` bersih tanpa pendaran neon (anti-glow).

---

## 5. Ukuran Touch Target & Pola Navigasi Mobile

### A. Touch Target Minimum
- **Seluruh elemen interaktif mobile:** Minimal **44x44px** (tombol CTA, tab navigasi, dropdown trigger).
- **Chip Kehadiran Santri (H/I/S/A):** Ukuran visual minimum 36x36px dengan touch bounding box 44x44px.

### B. Pola Navigasi Mobile
- **Bottom Navigation Bar:** Ketinggian 60px fixed di bawah dengan 5 slot:
  1. **Beranda:** Ringkasan jadwal harian, status check-in, dan pengumuman.
  2. **Jadwal / KBM:** Roster mengajar dan agenda tatap muka.
  3. **Aksi Cepat Absen (Tengah):** Tombol bulat solid 44px menonjol untuk presensi masuk/pulang GPS instan.
  4. **Nilai:** Input nilai sesi asesmen, TP, dan capaian karakter.
  5. **Akun:** Profil guru, ganti password, dan pengajuan izin/cuti.

---

## 6. Gaya Komponen Dasar

### A. Kartu & StatRibbonCard
- Latar `bg-white`, border `border-slate-200`, radius `rounded-lg`, padding `14px`.
- Kartu ringkasan/KPI menggunakan ribbon indikator vertikal 4px di sisi kiri sesuai token status (`emerald`, `amber`, `rose`, `indigo`).

### B. Chip Kehadiran Santri (H/I/S/A)
- Kotak tombol dengan kode huruf tebal:
  - **H (Hadir):** Teks hijau `text-emerald-700`, latar aktif `bg-emerald-50`, border `border-emerald-500`
  - **I (Izin):** Teks kuning `text-amber-700`, latar aktif `bg-amber-50`, border `border-amber-500`
  - **S (Sakit):** Teks indigo `text-indigo-700`, latar aktif `bg-indigo-50`, border `border-indigo-500`
  - **A (Alpa):** Teks merah `text-rose-700`, latar aktif `bg-rose-50`, border `border-rose-500`

### C. Input Formulir & Nilai
- Tinggi `44px`, padding horizontal `12px`, border `border-slate-200`, latar `bg-white`.
- Kotak nilai angka santri: lebar `68px`, tinggi `40px`, teks tengah tebal tabular `font-bold tnum`.

---

## 7. Daftar Larangan Keras (Anti-Patterns)
1. **Dilarang gradasi warna dekoratif (`bg-gradient-to-*`)** pada kartu atau header.
2. **Dilarang efek glassmorphism, blur latar belakang berlebihan, atau neumorphism**.
3. **Dilarang shadow besar atau pendaran neon (glow)** pada tombol maupun badge.
4. **Dilarang warna status acak** di luar 4 status semantik (emerald, amber, rose, indigo) + slate.
5. **Dilarang membedakan status kehadiran siswa hanya dengan warna titik/bulatan** (wajib ada kode huruf H/I/S/A atau teks).
6. **Dilarang menimbulkan scroll horizontal** pada viewport mobile selebar 360px.
7. **Dilarang menggunakan data dummy atau koordinat mock** di lingkungan aplikasi.
