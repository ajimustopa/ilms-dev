# Panduan Desain UI — Sistem Manajemen Sekolah Aldepos

## Cara Pakai Dokumen Ini
Ini adalah rujukan tetap untuk siapa pun (termasuk AI/Antigravity) yang membangun atau
mengubah tampilan UI di frontend `apps/core-portal`. **Baca file ini sebelum mengerjakan
tugas UI apa pun**, terlepas dari modul mana yang sedang dikerjakan (Keuangan, Kepegawaian,
Akademik, Sarpras, dll) — komponen bersama di `shared/components/` dan `shared/utils/`
berlaku lintas modul, bukan milik satu modul saja.

Jika pola di kode lama (halaman yang belum direfactor) berbeda dari panduan ini, **panduan
ini yang harus diikuti untuk kode baru**. Jangan menulis ulang halaman lama secara massal
tanpa instruksi eksplisit — migrasi dilakukan bertahap per prompt terpisah.

## Status Rollout
Sistem token ini pertama kali diterapkan di modul **Keuangan** (Sept 2026). Modul lain
(mis. Kepegawaian) masih memakai pola lama (kartu `rounded-2xl` seragam, badge ikon besar,
banner gradient) dan akan dimigrasi bertahap di kesempatan terpisah — jangan diubah otomatis
hanya karena mengerjakan modul lain.

---

## 1. Prinsip Inti
Aplikasi ini adalah **alat kerja data-padat** untuk staf sekolah/keuangan/akademik — bukan
produk konsumen. Prioritas: presisi, densitas informasi, kemudahan scan cepat, dan
kepercayaan. Bukan keramahan visual dekoratif ala landing page SaaS.

Satu elemen boleh menonjol per konteks (garis aksen kiri berwarna pada kartu status/alert,
seperti tab warna di buku besar akuntansi). Elemen lain di sekitarnya tetap tenang dan
disiplin.

**Dilarang dipakai di UI manapun dalam sistem ini:**
- Gradient dekoratif pada background kartu/banner (`bg-gradient-to-r` dst untuk hiasan).
- Efek kaca/blur (glassmorphism) atau bayangan lembut ganda (neumorphism).
- Radius sudut yang seragam di semua elemen tanpa memperhatikan hierarki (semua
  `rounded-2xl` tanpa pembedaan).
- Kotak ikon besar berwarna sebagai elemen fokus utama kartu KPI — ikon boleh ada tapi
  ukurannya kecil dan sekunder terhadap angka.
- Import font baru hanya demi tampilan angka rapi — gunakan fitur digit tabular dari Inter
  yang sudah dimuat (lihat bagian Tipografi).

---

## 2. Token Warna
Warna primer aksi tetap `brand` (emerald) yang sudah ada di `tailwind.config.js`. Warna
status dibatasi **hanya 4**, dipetakan konsisten ke makna yang sama di seluruh modul:

| Peran | Warna | Text | Background tint | Border | Aksen kiri (border-l) |
|---|---|---|---|---|---|
| Sukses / Kas Masuk / Surplus / Selesai | Emerald | `emerald-700` | `emerald-50` | `emerald-200` | `emerald-500` |
| Bahaya / Pengeluaran / Over-Budget / Tunggakan / Gagal | Rose | `rose-700` | `rose-50` | `rose-200` | `rose-500` |
| Peringatan / Draft / Pending Approval / Butuh Tindakan | Amber | `amber-800` | `amber-50` | `amber-200` | `amber-500` |
| Info / Terbayar / Institusional / Netral-Penting | Indigo | `indigo-700` | `indigo-50` | `indigo-200` | `indigo-500` |
| Netral (default, tanpa status) | Slate | `slate-700/800` | `slate-50` | `slate-200/80` | `slate-300` |

Jangan menambah warna status kelima (mis. purple/ungu) di luar tabel ini kecuali panduan
ini diperbarui secara eksplisit.

---

## 3. Tipografi
- Family: **Inter** (sudah dimuat via Google Fonts, weight 300–700). Jangan menambah
  family baru tanpa alasan kuat.
- Angka finansial/numerik: JANGAN pakai font monospace terpisah. Pakai utility class
  berikut (didefinisikan di `index.css`):
  ```css
  .tnum { font-variant-numeric: tabular-nums; }
  .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
  ```
  Terapkan `.tnum` pada semua angka besar (KPI) dan `.num-cell` pada semua sel angka
  di dalam tabel.
- Skala ukuran standar:

| Elemen | Class |
|---|---|
| Label mikro (label KPI, header kolom tabel) | `text-[11px] font-semibold uppercase tracking-wide text-slate-500` |
| Isi tabel / body kecil | `text-xs` |
| Angka KPI besar | `text-lg font-bold tnum text-slate-800` |
| Judul section dalam halaman | `text-sm font-bold text-slate-800` |
| Judul halaman (H1) | `text-lg font-bold text-slate-800` |

**Pengecualian font monospace:** komponen pratinjau jurnal ganda (double-entry preview,
tampilan debit/kredit akuntansi) boleh memakai `font-mono` untuk kejelasan alignment kode
akuntansi ala buku besar. Ini SATU-SATUNYA pengecualian yang diizinkan terhadap aturan
tabular-nums Inter di bagian ini — jangan dipakai sebagai preseden untuk kartu KPI, sel
tabel data biasa, atau badge di komponen lain.

---

## 4. Spacing & Radius
| Elemen | Aturan |
|---|---|
| Padding kartu data | `p-3` – `p-3.5` (jangan lebih dari itu untuk kartu KPI/data) |
| Radius kartu data & baris | `rounded-lg` |
| Radius panel besar pembungkus (mis. wrapper section, modal) | `rounded-xl` — hanya satu tingkat lebih besar dari kartu data, bukan seragam |
| Gap antar kartu KPI dalam satu ribbon | `gap-3` |
| Gap antar panel besar dalam satu baris grid | `gap-4` |
| Jarak vertikal antar section dalam satu halaman | `space-y-4` |
| Border | `border border-slate-200/80` (standar di seluruh sistem, jangan diubah) |
| Shadow | `shadow-xs` boleh dipakai (sudah tipis), tapi TIDAK BOLEH ditambah gradient sebagai pengganti/pelengkap shadow |

---

## 5. Komponen Bersama Wajib Dipakai
Lokasi: `apps/core-portal/src/shared/components/` dan `apps/core-portal/src/shared/utils/`.
Sebelum menulis kartu/badge/alert/format angka baru dari nol, cek dulu apakah komponen ini
sudah tersedia dan pakai itu:

- **`StatRibbonCard.jsx`** — kartu KPI standar. Border-left 3px sesuai warna status, tanpa
  kotak ikon besar, angka pakai `.tnum`.
- **`StatusPill.jsx`** — badge status kecil, 5 varian (`success`/`danger`/`warning`/`info`/`neutral`)
  sesuai tabel warna di atas.
- **`FlatAlertBanner.jsx`** — pengganti banner gradient. Border-left 4px + background tint
  solid, tanpa gradient.
- **`shared/utils/formatters.js`** — `formatCurrency`, `formatNumber`, `formatPercentage`.
  Jangan menulis fungsi format angka baru di level halaman — impor dari sini.

Jika sebuah halaman butuh varian komponen yang belum ada di daftar ini, buat komponen baru
di `shared/components/` mengikuti token di atas (bukan style lokal sekali pakai), supaya
bisa dipakai ulang oleh halaman/modul lain.

**Status implementasi (per Sept 2026):** `StatRibbonCard.jsx`, `StatusPill.jsx`,
`FlatAlertBanner.jsx`, dan `shared/utils/formatters.js` SUDAH dibuat dan terkonfirmasi
tidak menimbulkan konflik build/lint. Jangan membuat ulang file-file ini — impor langsung
dari lokasi di atas.

---

## 6. Konvensi Tabel Data
- Setiap tabel dengan potensi baris banyak WAJIB dibungkus class `.table-container` yang
  sudah ada di `index.css` (header otomatis sticky, tinggi otomatis dibatasi dengan scroll).
- Semua kolom angka pakai class `.num-cell` (rata kanan + tabular).
- Hover baris: `hover:bg-slate-50/60` (standar yang sudah dipakai, pertahankan).
- Untuk tabel dengan volume baris besar (500+ baris — mis. Tagihan, Pembayaran, Bank
  Statement, Bookkeeping), pastikan endpoint backend mendukung pagination/filter server-side;
  jangan render seluruh dataset ke DOM sekaligus.

---

## 7. Checklist Sebelum Menyatakan Tugas UI Selesai
- [ ] Tidak ada `bg-gradient-to-r`/`to-b` dekoratif baru yang ditambahkan.
- [ ] Semua kartu data pakai `rounded-lg`, bukan `rounded-2xl`.
- [ ] Warna status yang dipakai hanya dari 4 warna di tabel Bagian 2 (tidak menambah purple/pink/dst).
- [ ] Angka KPI dan sel tabel numerik memakai `.tnum`/`.num-cell`.
- [ ] Tidak menulis fungsi `formatCurrency` baru — pakai dari `shared/utils/formatters.js`.
- [ ] Komponen kartu/badge/alert memakai `StatRibbonCard`/`StatusPill`/`FlatAlertBanner` jika
      kasusnya cocok, bukan className Tailwind manual yang meniru pola lama.
