# PANDUAN DESAIN ENTERPRISE ALDEPOS
**Versi:** 1.0 — Perluasan dari `PANDUAN-DESAIN-UI.md` (147 baris) berbasis hasil Audit Menyeluruh
**Status:** WAJIB dibaca dan dipatuhi oleh Antigravity sebelum menulis/mengubah kode UI apapun di 13+ modul
**Cakupan:** `apps/core-portal`, `apps/guru`, `apps/website-utama`

> Dokumen ini adalah SATU-SATUNYA sumber kebenaran (single source of truth) untuk keputusan visual. Jika ada halaman lama yang menyimpang dari dokumen ini, halaman lama yang salah — bukan dokumen ini yang disesuaikan ke halaman lama.

---

## 0. Filosofi Inti

> **"Alat kerja data-padat, bukan landing page dekoratif."**
> **Maximize information density, not visual density.** Layar boleh padat informasi, tapi setiap elemen harus punya hierarchy, alignment, dan spacing yang teratur.

DILARANG di seluruh aplikasi:
- Gradasi dekoratif (`bg-gradient-to-*`) pada kartu/section kerja
- Glassmorphism, neumorphism, bento grid
- Kotak ikon besar warna-warni pada kartu KPI
- Radius acak — hanya gunakan token radius resmi (lihat §2)
- Shadow besar/menyebar (`shadow-2xl`, custom drop shadow besar) pada elemen kerja harian
- Warna modul ad-hoc (mis. "Akademik = teal", "Kantin = amber") — **warna HANYA mengikuti status semantik, bukan identitas modul**

---

## 1. Warna — 4 Status Semantik + Netral (WAJIB, TANPA KECUALI)

Ini sudah berlaku di modul Keuangan dan HARUS jadi satu-satunya sistem warna di 13 modul:

| Token | Warna Tailwind | Makna |
|---|---|---|
| `success` | `emerald` | Sukses / Kas Masuk / Surplus / Lunas / Disetujui |
| `danger` | `rose` | Bahaya / Pengeluaran / Tunggakan / Gagal / Overdue |
| `warning` | `amber` | Peringatan / Draft / Pending / Menunggu |
| `info` | `indigo` | Info / Terbayar / Netral-Penting |
| `neutral` | `slate` | Non-aktif / Arsip / Default |

**Aturan keras:**
- Dilarang memakai `teal`, `purple`, `violet`, `fuchsia`, `pink`, `orange`, `cyan`, `sky`, `blue`, `green`, `red`, `yellow` untuk elemen UI status (badge, ribbon, alert, ikon status). Warna-warna ini adalah **utang desain** dari kode lama (mis. dominasi teal di Akademik/Perpustakaan, amber berlebihan di Kantin/Dapur) dan wajib dipetakan ulang ke 5 token di atas saat halaman direstyle.
- Setiap komponen HARUS menerima prop semantik (`status="success"`, `variant="danger"`), **tidak boleh** menerima warna mentah (`color="green"`, class Tailwind warna langsung di JSX halaman).
- Brand color (`emerald` di `tailwind.config.js`, skala 50–950) tetap dipakai untuk elemen brand/primary action, terpisah dari makna status "sukses" — namun karena kebetulan sama-sama emerald di Aldepos, ini aman selama pemakaiannya konsisten.
- **Dua Status Berbeda, Kategori Semantik Sama:** Untuk grup pilihan cepat (quick-select chips / toggle multi-opsi) di mana 2+ opsi berbagi mapping kategori semantik yang sama (contoh: Izin dan Sakit sama-sama kategori 'warning'), opsi primer mempertahankan warna semantik utamanya (Izin = amber), sedangkan opsi sekunder yang berkonotasi medis/khusus diperbolehkan menggunakan token info (Sakit = indigo) agar pengguna dapat membedakannya seketika tanpa kebingungan visual.

---

## 2. Design Tokens

### Radius
```
rounded-lg   → kartu data, baris tabel, badge
rounded-xl   → wrapper modal/section/panel besar
```
Dilarang: `rounded-2xl`, `rounded-3xl`, radius custom di luar dua token ini untuk elemen kerja.

### Shadow
```
border 1px solid   → default elemen kerja (bukan shadow)
shadow-sm          → dropdown, popover
shadow-lg          → dialog/modal
shadow-xl          → drawer/offcanvas
```

### Tipografi
- Font: **Inter** (sudah dimuat, jangan diganti)
- Hierarchy:
  ```
  Page title      20px / 600
  Section title   16px / 600
  Body            14px
  Table header    12px / 600
  Table body      13px
  Metadata        12px
  ```
- Angka finansial/kuantitas WAJIB pakai class yang sudah ada di `index.css`:
  - `.tnum` → untuk angka ringkasan/KPI
  - `.num-cell` → untuk sel tabel angka (`text-align: right; font-variant-numeric: tabular-nums;`)
  - **Jangan buat ulang utility ini** — pakai yang sudah ada, jangan duplikasi di CSS module lain (lihat catatan `manajemen-theme.css` di §8).

### Density Tabel (baru — belum ada di kode, wajib dibuat di Fase 0)
```
Compact       32px row height   ← default untuk Keuangan, Akademik, Kepegawaian (power user)
Comfortable   40px row height   ← default untuk Portal Guru, Portal Wali/Calon Murid
```
Density dipilih per modul secara default, tidak perlu toggle user di versi awal (toggle density adalah peningkatan fase lanjut, bukan syarat Fase 0–4).

---

## 3. Komponen yang SUDAH ADA dan WAJIB Dipakai Ulang (Jangan Ditulis Ulang)

| Komponen | Path | Wajib dipakai untuk |
|---|---|---|
| `StatRibbonCard` | `shared/components/StatRibbonCard.jsx` | Semua kartu KPI/ringkasan — ganti seluruh kartu gradient/custom di 12 modul non-Keuangan |
| `StatusPill` | `shared/components/StatusPill.jsx` | Semua badge status — ganti seluruh `bg-*-100 text-*-700` manual |
| `FlatAlertBanner` | `shared/components/FlatAlertBanner.jsx` | Semua alert/notifikasi inline di atas form/tabel |
| `Pagination` | `shared/components/Pagination.jsx` | Semua tabel berpaginasi (catatan: belum ada page-size selector — jangan buat versi baru, cukup extend props-nya di Fase 0) |
| `DatePickerField` | `shared/components/DatePickerField.jsx` | Semua input tanggal — sudah stabil, jangan diganti library-nya |
| `SearchableSelect` | `shared/components/SearchableSelect.jsx` | Semua dropdown searchable/multi-select |
| `formatters.js` | `shared/utils/formatters.js` | Semua format Rupiah/angka/persen/tanggal — dilarang menulis fungsi format duplikat di halaman |
| `Toast` | `shared/components/Toast.jsx` | Semua notifikasi aksi — jangan pakai `window.alert` langsung |
| `ProtectedRoute` | `shared/components/ProtectedRoute.jsx` | Semua routing berproteksi — tidak berubah |

**Kelas CSS global (`index.css`) yang wajib dipakai ulang:**
`.table-container`, `.table-responsive`, `.num-cell`, `.tnum`

---

## 4. Komponen yang BELUM ADA — Wajib Dibangun di Fase 0 (Sekali, Dipakai 13 Modul)

Ini adalah *super component* yang menggantikan pola manual di 161 halaman. Jangan buat versi per-modul.

### 4.1 `<DataTable />` (prioritas tertinggi)
Spesifikasi minimum:
```
props:
  columns          // [{ key, label, width?, align?, type: 'text'|'currency'|'date'|'status', sticky?: 'left'|'right' }]
  data
  density          // 'compact' | 'comfortable' — default sesuai §2
  stickyColumns    // { left: [...key], right: [...key] } — kolom identitas kiri, kolom aksi kanan
  selectable       // checkbox baris + batch action bar
  sortable
  expandableRow    // render function opsional untuk detail baris (pengganti pola state lokal di BudgetPlans.jsx)
  loading          // -> LoadingSkeleton
  error            // -> ErrorState + tombol "Coba lagi"
  emptyMessage     // -> EmptyState kontekstual (bukan teks generik)
  pagination       // terhubung ke Pagination.jsx yang sudah ada
```
Kolom bertipe `currency`/angka WAJIB otomatis dapat class `.num-cell`. Kolom aksi WAJIB `sticky: 'right'` jika tabel melebihi lebar viewport (rujukan: `BankStatements.jsx` 14 kolom, `Payments.jsx`, `MasterData.jsx` 64 kolom — kolom aksi tidak boleh lagi hilang tergulung ke kanan).

### 4.2 `<FilterBar />`
Satu baris: `[Search....] [Filter1 ▼] [Filter2 ▼] [Filter3 ▼] [More filters]`. "More filters" membuka Drawer, bukan menambah baris filter baru di halaman. Target: filter area tidak boleh memakan lebih dari ~56px tinggi di kondisi default (collapsed).

### 4.3 `<Modal />` / `<Dialog />` generik
Pengganti pola manual `fixed inset-0 z-50 bg-black/50 flex items-center justify-center` yang saat ini ditulis ulang berbeda-beda di ratusan tempat. Aturan pemakaian dialog vs drawer vs full page ada di §6.

### 4.4 `<Drawer />` / Offcanvas generik
Untuk: filter lanjutan, quick detail, approval, audit detail.

### 4.5 State Komponen: `EmptyState`, `ErrorState`, `LoadingSkeleton`
- `EmptyState`: pesan kontekstual + 1-2 CTA (contoh: "Belum ada transaksi rekening BSI untuk periode ini" + tombol "Ubah periode"). Dilarang teks generik "No data."
- `ErrorState`: pesan + tombol "Coba lagi", opsional kode error teknis kecil di bawah.
- `LoadingSkeleton`: skeleton bar untuk load awal halaman; untuk refresh tabel, JANGAN hilangkan data lama — tampilkan indikator kecil "Memuat ulang..." saja.

---

## 5. Aturan Tabel Dense (berlaku begitu `DataTable` siap dipakai)

- Kolom identitas (nomor, nama, tanggal utama) → sticky kiri
- Kolom aksi (edit/hapus/void/detail) → sticky kanan
- Kolom angka (Debit, Kredit, Saldo, Total, Qty) → rata kanan + `.num-cell`
- Header tabel: `font-weight 600`, `12px`, sticky saat scroll vertikal (sudah didukung `.table-container`)
- Zebra stripe TIDAK wajib — cukup border tipis antar baris + hover state jelas
- Horizontal scroll DIPERBOLEHKAN dan lebih disukai daripada memaksa semua kolom muat di layar sempit — jangan sembunyikan kolom penting demi "responsif" di desktop

---

## 6. Form: Dialog vs Drawer vs Full Page

| Gunakan | Untuk |
|---|---|
| **Dialog** | Konfirmasi, quick edit satu-dua field, create sederhana |
| **Drawer** | Filter lanjutan, quick detail, approval, audit detail, edit menengah |
| **Full Page** | Transaksi kompleks (jurnal, tagihan massal, RAPBS, payroll, penjadwalan), proses multi-step |

Halaman raksasa hasil audit (`Payments.jsx`, `RegistrationBilling.jsx`, `BudgetPlans.jsx`, dll) sebagian besar melanggar aturan ini dengan menaruh form kompleks di dalam modal — ini salah satu penyebab file jadi ribuan baris. Saat direstyle, form kompleks WAJIB dipindah ke pola full-page atau drawer besar, bukan modal.

---

## 7. Status Transaksi Keuangan/Data Kritis — Jangan Pernah "Delete"

Untuk data yang menyentuh uang, presensi, nilai, atau dokumen resmi:
```
DRAFT → SUBMITTED → APPROVED → POSTED → VOIDED
```
- Tombol yang benar: **"Void"**, bukan **"Delete"**.
- Void wajib meminta alasan (`Void reason`, required) dan tetap tercatat di audit trail — tidak dihapus fisik dari database.
- **Pengecualian Delete Fisik:** Delete fisik hanya diperbolehkan untuk data draft/belum final yang belum tercatat sebagai transaksi resmi (contoh: entri pengeluaran panitia PPDB sebelum SPJ resmi, draft slip gaji/payroll sebelum disetujui, draft nilai sebelum disubmit/disahkan), bukan untuk data yang sudah berstatus tercatat/posted/approved.
- Untuk modul dengan aksi kritis ini (Keuangan, Kepegawaian/Payroll, Akademik/Nilai), sertakan komponen `AuditTimeline` (dibangun di fase lanjut, opsional untuk Fase 0–4) sebagai catatan siapa-melakukan-apa-kapan.

---

## 8. Peringatan Teknis Khusus (dari Temuan Audit)

- **`manajemen-theme.css`** (40.5 KB, variabel `--mj-*`) adalah sistem token PARALEL yang menyimpang dari token resmi ini. Saat modul Manajemen direstyle (Fase 4), file ini harus dipetakan/dilebur ke token resmi — **jangan menambah aturan baru ke file ini**, dan jangan buat sistem token modul-spesifik serupa di modul lain.
- **`@svar-ui/react-gantt`**: override CSS untuk komponen ini harus diisolasi di satu file scoped (jangan disebar), agar tidak terikat erat ke token global yang sedang diseragamkan.
- **`react-day-picker`** di dalam `DatePickerField.jsx`: sudah stabil, jangan diganti engine-nya, cukup pastikan styling luar (border, radius, font) ikut token resmi.
- **`Layout.jsx`**: saat ini khusus modul Core Service, sedangkan modul lain menduplikasi shell masing-masing. Saat sidebar/header diseragamkan, jangan hapus `Layout.jsx` sebelum semua modul migrasi — lakukan bertahap.
- **`Toast.jsx`** meng-override `window.alert` secara global — jangan tambah override lain di atasnya; kalau ada halaman masih pakai `window.confirm`/`window.alert` native, ganti ke `Toast` API yang sudah ada, jangan bikin sistem alert baru.

---

## 9. Mobile / Responsif

- Portal Guru dan Portal Wali/Calon Murid HARUS dirancang mobile-first (bukan versi desktop yang di-scale). Rujukan pola: daftar bertumpuk dengan CTA besar per item (bukan tabel lebar dipaksa masuk layar sempit).
- Modul back-office murni (Keuangan, Akademik, Kepegawaian, Manajemen) boleh tetap desktop-first — tidak wajib dioptimalkan untuk mobile di fase awal.
- Touch target minimum untuk elemen interaktif di halaman mobile-first: cukup besar untuk jari (hindari tombol/link kecil berdempetan seperti pola desktop).

---

## 10. Checklist Sebelum Halaman Dianggap "Selesai Direstyle"

Sebuah halaman baru dianggap sesuai Panduan ini jika SEMUA berikut benar:
- [ ] Tidak ada warna non-semantik (teal/purple/orange/dst) untuk elemen status
- [ ] Kartu KPI pakai `StatRibbonCard`, bukan custom/gradient
- [ ] Badge status pakai `StatusPill`
- [ ] Alert/notifikasi inline pakai `FlatAlertBanner`
- [ ] Tabel pakai `.table-container` + `.num-cell` (atau `DataTable` generik jika sudah tersedia)
- [ ] Format angka/tanggal pakai `formatters.js`, tidak ada fungsi format duplikat
- [ ] Tidak ada modal untuk form kompleks (ikuti aturan §6)
- [ ] Tidak ada tombol "Delete" untuk data transaksi/keuangan/nilai — pakai "Void" (§7)
- [ ] Empty/error/loading state kontekstual, bukan teks generik
- [ ] Radius hanya `rounded-lg`/`rounded-xl`, tidak ada gradient dekoratif

Jika satu poin gagal, halaman BELUM selesai — jangan tandai sebagai "sudah direstyle".
