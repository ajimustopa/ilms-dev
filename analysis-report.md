# LAPORAN ANALISIS TEKNIS: SISTEM MANAJEMEN SEKOLAH TERINTEGRASI YAYASAN ALDEPOS

**Tanggal Laporan:** 2026-09-29  
**Lingkup Analisis:** Seluruh dokumen arsitektur dan spesifikasi pada folder `docs/` (69 file Markdown), konfigurasi monorepo, skema database migrasi, serta basis kode aktual (`apps/api-backend`, `apps/core-portal`, `apps/website-utama`).  
**Tujuan Dokumen:** Menjadi dokumen acuan mandiri (*self-contained*), faktual, dan mendalam bagi asisten AI lain maupun perekayasa sistem yang tidak memiliki akses langsung ke repositori ini.

---

## 1. Ringkasan Proyek
Sistem Manajemen Sekolah Terintegrasi Yayasan Aldepos (Aldepos Islamic Boarding School / IBS) adalah platform terpadu berskala *enterprise* berbasis multi-satuan-pendidikan (*multi-tenant* di tingkat unit sekolah) yang menaungi seluruh siklus operasional yayasan dan sekolah-sekolah di bawahnya. Sistem ini melayani berbagai pemangku kepentingan, meliputi Pengurus Yayasan/Superadmin, Pimpinan Unit (Kepala Sekolah/Mudir), Tata Usaha, Dewan Guru/Ustadz, Staf Keuangan/Kasir/Akuntan, Staf SDM/HRD, Staf Sarpras, Pengelola Dapur Santri, Pengelola Kantin, Pustakawan, Penguji Munaqasyah Al-Quran, Santri/Siswa, Wali Santri/Orang Tua, hingga Calon Siswa (PPDB) dan publik umum. Platform ini mengintegrasikan 14 domain modul fungsional: Core Service, Website Utama & PPDB, Akademik, Kepegawaian, Keuangan, Portal Orangtua, Sarpras, Kantin, Dapur, Perpustakaan, Ujian Berbasis Komputer (CBE), Komunikasi & Notifikasi, Tahfidz & Al-Quran, dan Pengelolaan (Manajemen Mutu). Secara infrastruktur, sistem diimplementasikan dalam arsitektur *monorepo* yang disatukan ke dalam 3 domain *deployment* fisik: situs publik (`aldeposibs.com`), portal internal terpadu (`core.aldeposibs.com`), dan backend tunggal modular monolith (`api.aldeposibs.com`) yang mengelola isolasi data multi-database. *(Sumber: `docs/AI-CONTEXT.md` Bagian 2–3; `docs/ARSITEKTUR-SISTEM.md` Bagian 1–2)*

---

## 2. Inventaris Dokumen

Tabel di bawah ini menginventarisasi seluruh 69 berkas dokumentasi di dalam folder `docs/` secara lengkap dan faktual.

| Path File | Isi Singkat | Status | Terakhir Diubah |
|---|---|---|---|
| `docs/AI-CONTEXT.md` | Konteks mesin-ke-mesin (AI Agent), status 14 modul, peta 3 domain deployment, dependensi antar modul, dan konvensi arsitektur. | Aktif | 2026-09-11 |
| `docs/ARSITEKTUR-SISTEM.md` | Sumber kebenaran tunggal arsitektur global, transisi 14 deployment ke 3 domain monorepo, prinsip multi-tenant, dan panduan deployment. | Aktif | 2026-08-18 |
| `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` | Single source of truth desain UI 13 modul: 5 token warna semantik, typography Inter, dense table, siklus status data kritis (wajib Void, larangan Delete). | Aktif | 2026-09-14 |
| `docs/panduan-deployment-dan-strategi-lingkungan.md` | SOP alur lingkungan kerja (Local Dev, Local Staging, GitHub, Hostinger), skrip sinkronisasi DB, dan workflow rilis harian. | Aktif | 2026-09-07 |
| `docs/prompt-migrasi-monorepo-core-service.md` | Instruksi langkah teknis penggabungan repo terpisah ke dalam struktur monorepo `apps/*`. | Arsip / Panduan Migrasi | 2026-08-17 |
| `docs/ai-ref-akademik.md` | Referensi AI modul Akademik: 58 tabel DB, kurikulum Merdeka, timetable engine (2-phase CSP + Simulated Annealing), e-rapor, PSB, dan Portal Guru. | Aktif | 2026-08-31 |
| `docs/ai-ref-coreservice.md` | Referensi AI modul Core Service: JWT auth, SSO, multi-tenancy satuan pendidikan, API gateway, webhook pub/sub, audit trail. | Aktif | 2026-08-28 |
| `docs/ai-ref-dapur.md` | Referensi AI modul Dapur: 63 tabel, perencanaan menu santri, standar porsi & nutrisi, kalkulasi bahan baku, QC, penerimaan barang, stok opname. | Aktif | 2026-08-28 |
| `docs/ai-ref-kantin.md` | Referensi AI modul Kantin: 18 tabel, transaksi kasir POS, e-wallet cashless santri, limit jajan harian, rekonsiliasi vendor & bagi hasil. | Aktif | 2026-08-28 |
| `docs/ai-ref-kepegawaian.md` | Referensi AI modul Kepegawaian: 37 tabel, master pegawai, absensi radius GPS, cuti/lembur, payroll, penilaian kinerja, psikotes MBTI & OCEAN. | Aktif | 2026-08-28 |
| `docs/ai-ref-keuangan.md` | Referensi AI modul Keuangan: 50 tabel, RAPBS & revisi, penetapan tagihan massal/manual, diskon kasuistik 3 tingkat, rekonsiliasi rekening koran, COA double-entry. | Aktif | 2026-09-09 |
| `docs/ai-ref-pengelolaan.md` | Referensi AI modul Pengelolaan: 54 tabel, perencanaan RIPS/RKJP/RKT, EVADIR, Balanced Scorecard (BSC), supervisi, repositori SK, SVAR Gantt. | Aktif | 2026-08-31 |
| `docs/ai-ref-perpustakaan.md` | Referensi AI modul Perpustakaan: 8 tabel, 14 fitur (9 PRD + 5 perluasan), sirkulasi peminjaman/kembali, denda, OPAC publik, scheduler pengingat. | Aktif | 2026-08-28 |
| `docs/ai-ref-sarpras.md` | Referensi AI modul Sarpras: 14 tabel, manajemen aset fisik, peminjaman ruang/fasilitas, stok bahan habis pakai, pemeliharaan, pengadaan. | Aktif | 2026-08-28 |
| `docs/ai-ref-tahfidz-alquran.md` | Referensi AI modul Al-Quran: 4 tabel, mutabaah hafalan surat/ayat santri, ujian munaqasyah berjenjang, dan kajian kitab kuning. | Aktif | 2026-08-28 |
| `docs/ai-ref-website-utama.md` | Referensi AI Website Utama (Next.js) & CMS Admin (React): berita/artikel, galeri, agenda, tiket konsultasi, form pendaftaran PPDB online & tracking. | Aktif | 2026-08-28 |
| `docs/api-contract-akademik.md` | Kontrak spesifikasi endpoint REST API modul Akademik (siswa, kurikulum, timetable, rapor, presensi, PSB). | Aktif | 2026-08-19 |
| `docs/api-contract-alquran.md` | Kontrak spesifikasi endpoint REST API modul Tahfidz & Al-Quran (hafalan, target, munaqasyah, kitab kuning). | Aktif | 2026-08-17 |
| `docs/api-contract-coreservice.md` | Kontrak spesifikasi endpoint REST API modul Core Service (auth, user, role, yayasan, unit, webhook, API client). | Aktif | 2026-08-17 |
| `docs/api-contract-dapur.md` | Kontrak spesifikasi endpoint REST API modul Dapur (menu, bahan baku, QC, order, stok, logistik makanan santri). | Aktif | 2026-08-18 |
| `docs/api-contract-kantin.md` | Kontrak spesifikasi endpoint REST API modul Kantin (menu/produk, kasir POS, dompet santri, vendor settlement). | Aktif | 2026-08-18 |
| `docs/api-contract-kepegawaian.md` | Kontrak spesifikasi endpoint REST API modul Kepegawaian (pegawai, absensi GPS, lembur/cuti, payroll, evaluasi, psikotes). | Aktif | 2026-08-19 |
| `docs/api-contract-keuangan.md` | Kontrak spesifikasi endpoint REST API modul Keuangan (tagihan SPP, pembayaran, pengeluaran, RAPBS, COA, jurnal umum). | Aktif | 2026-08-17 |
| `docs/api-contract-manajemen.md` | Kontrak spesifikasi endpoint REST API modul Manajemen (RIPS, program kerja, task checklist, BSC, evaluasi, dokumen SK). | Aktif | 2026-08-28 |
| `docs/api-contract-perpustakaan.md` | Kontrak spesifikasi endpoint REST API modul Perpustakaan (katalog buku, sirkulasi, reservasi, denda, OPAC publik). | Aktif | 2026-08-18 |
| `docs/api-contract-sarpras.md` | Kontrak spesifikasi endpoint REST API modul Sarpras (aset inventaris, peminjaman, maintenance, stok bahan habis pakai). | Aktif | 2026-08-18 |
| `docs/api-contract-website-utama.md` | Kontrak spesifikasi endpoint REST API Website Utama (publik & CMS admin, pendaftaran PPDB, berita, galeri). | Aktif | 2026-08-17 |
| `docs/api-contract.md` | Draf kontrak API awal Core Service sebelum dipisahkan menjadi file modul spesifik. | Usang (digantikan `api-contract-coreservice.md`) | 2026-08-16 |
| `docs/erd-akademik.md` | ERD detail modul Akademik: definisi tabel, kolom, index, dan relasi data kesiswaan/pembelajaran. | Aktif | 2026-08-19 |
| `docs/erd-alquran.md` | ERD detail modul Al-Quran: definisi tabel capaian hafalan, target juz, munaqasyah, dan kitab kuning. | Aktif | 2026-08-17 |
| `docs/erd-coreservice.md` | ERD detail modul Core Service: 17 tabel inti autentikasi, otorisasi RBAC, unit sekolah, audit, webhook. | Aktif | 2026-08-17 |
| `docs/erd-dapur.md` | ERD detail modul Dapur: relasi data resep, porsi, siklus menu, kebutuhan bahan, QC, dan persediaan makanan santri. | Aktif | 2026-08-18 |
| `docs/erd-kantin.md` | ERD detail modul Kantin: relasi tabel kasir POS, e-wallet cashless, saldo jajan, produk vendor, dan komisi. | Aktif | 2026-08-18 |
| `docs/erd-kepegawaian.md` | ERD detail modul Kepegawaian: relasi data kepegawaian, presensi geofence, penggajian, dan instrumen psikotes. | Aktif | 2026-08-19 |
| `docs/erd-keuangan.md` | ERD detail modul Keuangan: relasi tabel COA double-entry, skema biaya, tagihan santri, rekening koran, dan RAPBS. | Aktif | 2026-08-17 |
| `docs/erd-manajemen.md` | ERD detail modul Manajemen: relasi tabel dokumen mutu, rencana strategis (RIPS), evaluasi diri (EVADIR), dan task/proyek. | Aktif | 2026-08-28 |
| `docs/erd-perpustakaan.md` | ERD detail modul Perpustakaan: relasi tabel pustaka, eksemplar, keanggotaan, transaksi sirkulasi, dan reservasi. | Aktif | 2026-08-18 |
| `docs/erd-sarpras.md` | ERD detail modul Sarpras: relasi tabel gedung/ruangan, nomor aset inventaris, peminjaman, dan pemeliharaan fisik. | Aktif | 2026-08-18 |
| `docs/erd-website-utama.md` | ERD detail modul Website Utama & PPDB: relasi tabel konten CMS (artikel, galeri) dan intake pendaftar santri baru. | Aktif | 2026-08-17 |
| `docs/erd.md` | Draf awal ERD Core Service sebelum diformalkan ke dalam `erd-coreservice.md`. | Usang (digantikan `erd-coreservice.md`) | 2026-08-16 |
| `docs/rancangan-akademik.md` | Dokumen lingkup modul Akademik: cakupan 36 fitur PRD, arsitektur modul, dan batasan tanggung jawab. | Aktif | 2026-08-19 |
| `docs/rancangan-alquran.md` | Dokumen lingkup modul Tahfidz & Al-Quran: cakupan 6 fitur PRD mutabaah dan ujian santri. | Aktif | 2026-08-17 |
| `docs/rancangan-coresrvice.md` | Dokumen lingkup modul Core Service: 13 fitur fondasi SSO, tenant, dan user management *(Catatan: ada saltik nama file `coresrvice`)*. | Aktif | 2026-08-17 |
| `docs/rancangan-dapur.md` | Dokumen lingkup modul Dapur: arsitektur pemenuhan gizi santri, logistik pangan, dan siklus menu. | Aktif | 2026-08-18 |
| `docs/rancangan-kantin.md` | Dokumen lingkup modul Kantin: 9 fitur operasional kantin sehat, pembayaran nontunai, dan transparansi vendor. | Aktif | 2026-08-18 |
| `docs/rancangan-kepegawaian.md` | Dokumen lingkup modul Kepegawaian: 16 fitur PRD pengelolaan SDM, rekrutmen, dan integrasi penggajian. | Aktif | 2026-08-19 |
| `docs/rancangan-keuangan.md` | Dokumen lingkup modul Keuangan: 35 fitur PRD tata kelola finansial pesantren/sekolah, RAPBS, dan audit pembukuan. | Aktif | 2026-08-17 |
| `docs/rancangan-manajemen.md` | Dokumen lingkup modul Manajemen: 13 fitur perencanaan strategis, akreditasi, manajemen risiko, dan tata kelola yayasan. | Aktif | 2026-08-28 |
| `docs/rancangan-perpustakaan.md` | Dokumen lingkup modul Perpustakaan: perluasan 9 menjadi 14 fitur sistem literasi dan OPAC. | Aktif | 2026-08-18 |
| `docs/rancangan-sarpras.md` | Dokumen lingkup modul Sarpras: 13 fitur pemeliharaan fasilitas fisik dan penatausahaan aset. | Aktif | 2026-08-18 |
| `docs/rancangan-website-utama.md` | Dokumen lingkup Website Utama: 22 fitur publik, intake PPDB daring, dan portal CMS terpisah. | Aktif | 2026-08-17 |
| `docs/rancangan.md` | Draf rancangan awal Core Service sebelum dipecah per-modul. | Usang (digantikan `rancangan-coresrvice.md`) | 2026-08-16 |
| `docs/roles-akademik.md` | Matriks RBAC modul Akademik: definisi hak akses Guru, Wali Kelas, Waka Kurikulum, Kepala Sekolah, dan Siswa. | Aktif | 2026-08-19 |
| `docs/roles-alquran.md` | Matriks RBAC modul Al-Quran: definisi peran Ustadz/Musyrif, Penguji Munaqasyah, Koordinator Tahfidz. | Aktif | 2026-08-17 |
| `docs/roles-coreservice.md` | Matriks RBAC modul Core Service: definisi peran Superadmin, Admin Unit, struktur permission `core.*`, dan multi-tenant. | Aktif | 2026-08-17 |
| `docs/roles-dapur.md` | Matriks RBAC modul Dapur: definisi peran Kepala Dapur, Koki/Juru Masak, Tim QC, Petugas Logistik. | Aktif | 2026-08-18 |
| `docs/roles-kantin.md` | Matriks RBAC modul Kantin: definisi peran Pengelola Kantin, Kasir Kantin, Vendor Mitra, dan Konsumen Santri. | Aktif | 2026-08-17 |
| `docs/roles-kepegawaian.md` | Matriks RBAC modul Kepegawaian: definisi peran Staf HRD/Kepegawaian, Pimpinan Unit, Asesor, dan Pegawai Reguler. | Aktif | 2026-08-19 |
| `docs/roles-keuangan.md` | Matriks RBAC modul Keuangan: definisi peran Bendahara Yayasan, Staf Keuangan Unit, Kasir SPP, Auditor. | Aktif | 2026-08-17 |
| `docs/roles-manajemen.md` | Matriks RBAC modul Manajemen: definisi peran Tim Penjaminan Mutu, Pimpinan Eksekutif, PIC Program, Auditor Internal. | Aktif | 2026-08-28 |
| `docs/roles-perpustakaan.md` | Matriks RBAC modul Perpustakaan: definisi peran Kepala Perpustakaan, Staf Pustakawan, dan Anggota Pembaca. | Aktif | 2026-08-18 |
| `docs/roles-sarpras.md` | Matriks RBAC modul Sarpras: definisi peran Koordinator Sarpras, Teknisi Pemeliharaan, dan Peminjam Fasilitas. | Aktif | 2026-08-18 |
| `docs/roles-website-utama.md` | Matriks RBAC Website Utama: hak akses Admin CMS Berita, Panitia PPDB, dan Pengelola Publikasi. | Aktif | 2026-08-17 |
| `docs/roles.md` | Draf awal matriks RBAC Core Service sebelum diformalkan ke `roles-coreservice.md`. | Usang (digantikan `roles-coreservice.md`) | 2026-08-16 |
| `docs/panduan-pengembangan-core-service.md` | Panduan praktis eksekusi kode, urutan migrasi, dan pengujian modul Core Service. | Aktif | 2026-08-17 |
| `docs/panduan-pengembangan-dapur.md` | Panduan praktis eksekusi kode dan tahapan migrasi modul Dapur & Logistik Pangan. | Aktif | 2026-08-18 |
| `docs/panduan-pengembangan-kepegawaian.md` | Panduan praktis eksekusi kode dan tahapan pengembangan modul SDM & Kepegawaian. | Aktif | 2026-08-17 |
| `docs/panduan-pengembangan-manajemen.md` | Panduan praktis eksekusi kode dan integrasi instrumen modul Manajemen Mutu & Evaluasi. | Aktif | 2026-08-28 |
| `docs/panduan-pengembangan-perpustakaan.md` | Panduan praktis pengembangan fitur katalog, sirkulasi, dan antrean pengingat modul Perpustakaan. | Aktif | 2026-08-18 |

---

## 3. Tech Stack & Versi

Berdasarkan berkas konfigurasi (`package.json`, `apps/*/package.json`) dan dokumentasi arsitektur:

### 3.1 Bahasa & Lingkungan Runtime
- **Runtime:** Node.js (Target hosting: v18 LTS / v20 LTS; Versi lingkungan aktif: Node.js `v25.1.0`).
- **Bahasa:** JavaScript (ES6+, CommonJS pada backend `apps/api-backend`, ES Modules pada frontend `apps/core-portal`), TypeScript `^5.5.4` pada web publik `apps/website-utama`.
- **Manajemen Paket:** npm workspaces (monorepo tunggal yang menaungi seluruh paket di `apps/*`).

### 3.2 Backend Service (`apps/api-backend`)
- **Framework:** Express.js `^4.19.2` (Arsitektur *Modular Monolith* dalam 1 proses).
- **Database Query Builder:** Knex.js `^3.1.0`.
- **Database Driver:** `mysql2` `^3.10.1`.
- **Database Engine:** MariaDB 10.5 InnoDB, Charset `utf8mb4`, Collate `utf8mb4_unicode_ci`.
- **Autentikasi & Enkripsi:** `jsonwebtoken` `^9.0.2`, `bcryptjs` `^3.0.3`.
- **Keamanan Jaringan & HTTP:** `helmet` `^7.1.0`, `cors` `^2.8.5`.
- **Validasi Data:** `zod` `^4.4.3`.
- **Utilitas Dokumen & Cetak:** `pdfkit` `^0.20.2`.
- **Environment Parser:** `dotenv` `^16.4.5`.
- **Development Tool:** `nodemon` `^3.1.4`.

### 3.3 Frontend Internal Portal (`apps/core-portal`)
- **Framework & Bundler:** React `^18.3.1`, React DOM `^18.3.1`, Vite `^5.4.14` (dengan plugin `@vitejs/plugin-react` `^4.3.4`).
- **Routing:** `react-router-dom` `^6.28.2` (Lazy loading berbasis `React.lazy` dan `Suspense`).
- **Styling:** Tailwind CSS `^3.4.17`, PostCSS `^8.4.49`, Autoprefixer `^10.4.20`, Vanilla CSS Design Tokens (`src/index.css`).
- **Komponen & Visualisasi Khusus:**
  - `@svar-ui/react-gantt` `^2.7.1` (Diagram Gantt interaktif modul Manajemen/RKT).
  - `react-day-picker` `^10.0.1` & `date-fns` `^3.6.0` (Picker kalender terstandarisasi).
  - `lucide-react` `^0.395.0` (Ikonografi antarmuka).
  - `xlsx` `^0.18.5` (Ekspor/impor spreadsheet SheetJS).
- **HTTP Client:** `axios` `^1.7.2` (dengan *interceptor* otomatis untuk header Bearer dan refresh token).

### 3.4 Web Publik & PPDB (`apps/website-utama`)
- **Framework:** Next.js `^14.2.10` (App Router, Server-Side Rendering / Static Site Generation untuk optimasi SEO).
- **UI & Ikon:** React `^18.3.1`, Tailwind CSS `^3.4.10`, `lucide-react` `^0.439.0`.
- **TypeScript Definitions:** `@types/node` `^20.14.9`, `@types/react` `^18.3.3`, `@types/react-dom` `^18.3.0`.

### 3.5 Infrastruktur, Server & Tool Deploy
- **Server Produksi:** Hostinger Cloud / VPS Node.js Application Runner.
- **Process Manager:** PM2 (3 proses utama: `api-backend`, `core-portal`, `website-utama`).
- **Version Control & CI/CD:** Git, GitHub Actions (Automated deployment via SSH & Webhooks).

---

## 4. Arsitektur

### 4.1 Struktur Folder Proyek
```
Core Aldepos (Root Monorepo)
├── package.json                         # npm workspaces root (apps/*)
├── docs/                                # 69 berkas panduan & spesifikasi arsitektur
├── scratch/                             # Skrip uji teknis & analisis lokal
└── apps/
    ├── api-backend/                     # Modular Monolith Backend tunggal
    │   ├── server.js                    # Entry point server root
    │   ├── .env                         # Konfigurasi env rahasia seluruh modul
    │   ├── knexfile.*.js                # Konfigurasi migrasi Knex per-modul
    │   ├── db/migrations/               # 11 subfolder migrasi (core, keuangan, dll)
    │   └── src/
    │       ├── app.js                   # Express application & mounting rute modular
    │       ├── config/db/               # 11 Knex connection pool terpisah
    │       ├── middlewares/             # auth (JWT), tenant, errorHandler
    │       ├── services/scheduler.js    # Background scheduler harian
    │       └── modules/                 # 11 modul fungsional backend
    ├── core-portal/                     # React Vite SPA 13 modul internal
    │   ├── src/
    │   │   ├── main.jsx                 # Entry point React
    │   │   ├── router.jsx               # Router utama terpusat lazy-loaded
    │   │   ├── index.css                # CSS design system enterprise tokens
    │   │   ├── shared/                  # Komponen bersama (DataTable, Modal, dll)
    │   │   ├── pages/                   # Launcher modul (kartu akses)
    │   │   └── apps/                    # 13 sub-aplikasi frontend per modul
    └── website-utama/                   # Next.js App Router (situs publik & PPDB)
        ├── app/                         # Rute publik (home, ppdb, ppdb/status)
        └── lib/                         # Client fetcher ke api-backend
```

### 4.2 Pola Arsitektur Inti
1. **Modular Monolith Backend Tunggal**: Seluruh domain fungsi berjalan dalam 1 proses Express.js (`api.aldeposibs.com`), namun kode dipartisi rapi per domain modul (`src/modules/<modul>/`). Komunikasi antar modul terjadi secara *in-process* melalui lapisan *service* lokal tanpa pemanggilan HTTP berulang.
2. **Isolasi Database Terpisah (*Multi-Database Database-per-Module*)**: Setiap modul memiliki database MariaDB fisik tersendiri. **Dilarang keras melakukan SQL JOIN fisik atau FOREIGN KEY antar database modul**. Hubungan antar modul hanya disimpan sebagai referensi ID logis dan diselesaikan via *service layer*.
3. **Multi-Satuan-Pendidikan (*Multi-Tenancy*)**: Seluruh entitas data spesifik sekolah wajib memiliki kolom `satuan_pendidikan_id`. Konteks unit sekolah dikirimkan oleh klien melalui header `X-Satuan-Pendidikan-Id` atau payload JWT.
4. **Sentralisasi Autentikasi (Single Sign-On / SSO)**: Token JWT diterbitkan oleh modul Core Service (`CORE_JWT_SECRET`). Modul backend lain memverifikasi integritas signature JWT secara lokal *in-memory* tanpa melakukan query database ke Core Service.

### 4.3 Alur Data Antar Layer
```
[ Browser / Klien Web ]
        │  HTTPS (Bearer JWT, X-Satuan-Pendidikan-Id)
        ▼
[ Reverse Proxy / Web Server ]
        │
        ▼
[ Express Router (apps/api-backend/src/app.js) ]
        │
        ├─► [ Middlewares: Helmet, CORS, json, urlencoded ]
        ├─► [ Auth Middleware: verifyJwt, requirePermission, tenant resolution ]
        │
        ▼
[ Module Controller (e.g. modules/keuangan/bills/controller.js) ]
        │
        ▼
[ Module Service Layer (Business Logic & Audit Logging) ]
        │
        ├─► [ In-process Cross-Module Call (jika butuh data modul lain) ]
        │
        ▼
[ Knex Query Builder (Koneksi pool modul terkait di src/config/db/) ]
        │
        ▼
[ MariaDB Database Fisik Modul (e.g. keuangan_local) ]
```

### 4.4 Integrasi Eksternal
1. **Webhook Publisher & Subscriber**: Core Service bertindak sebagai publisher saat terjadi mutasi data fundamental (pembuatan akun, status unit), didistribusikan ke subscriber internal maupun eksternal.
2. **Rekonsiliasi Bank & Rekening Koran**: Parsing mutasi rekening bank (BNI/BSI) dengan pecahan desimal unik (*decimal matching*) dan pencocokan nomor referensi otomatis.
3. **Ekspor Spreadsheet & Dokumen PDF**: Menggunakan SheetJS (`xlsx`) untuk rekap ledger santri dan `pdfkit` untuk pencetakan slip gaji, kwitansi pembayaran SPP, dan kartu santri.

### 4.5 Diagram Teks Arsitektur Deployment & Lingkungan
```
                     ┌────────────────────────────────────────────────────────┐
                     │            DOMAIN PUBLIK & PENGGUNA                    │
                     └──────────────────────────┬─────────────────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         │                                      │                                      │
         ▼                                      ▼                                      ▼
┌─────────────────────────┐            ┌─────────────────────────┐            ┌─────────────────────────┐
│     aldeposibs.com      │            │   core.aldeposibs.com   │            │    api.aldeposibs.com   │
│  (Next.js App Router)   │            │   (React 18 Vite SPA)   │            │ (Express.js Monolith)   │
│  - Profil Yayasan       │            │  - Launcher 13 Modul    │            │  - /api/v1/core         │
│  - Informasi PPDB       │            │  - Dashboard per Modul  │            │  - /api/v1/keuangan     │
│  - Tracking Pendaftar   │            │  - Back-office System   │            │  - /api/v1/akademik ... │
└────────────┬────────────┘            └────────────┬────────────┘            └────────────┬────────────┘
             │                                      │                                      │
             └────────────────── HTTP REST API ─────┴──────────────────────────────────────┘
                                                                                           │
                                             ┌─────────────────────────────────────────────┴─────────────────────────────────────────────┐
                                             │                                                                                           │
                                             ▼                                                                                           ▼
                                  ┌────────────────────────┐                                                                  ┌────────────────────────┐
                                  │ MariaDB: db_core       │ ... [Total 11-14 Database Fisik Terpisah per Modul] ...          │ MariaDB: db_keuangan   │
                                  └────────────────────────┘                                                                  └────────────────────────┘
```

---

## 5. Skema Database

Berdasarkan 347 berkas migrasi aktif di `apps/api-backend/db/migrations/`, sistem mengelola **347 tabel** di 11 database terpisah:

### 5.1 Inventaris Tabel per Database Modul
1. **Core Service (`core` - 20 migrasi, 17 tabel):**
   - `users`, `roles`, `permissions`, `role_permissions`, `user_school_roles`, `school_units`, `school_unit_status_history`, `foundation_profiles`, `system_settings`, `refresh_tokens`, `password_reset_requests`, `webhook_events`, `webhook_subscribers`, `webhook_deliveries`, `api_clients`, `rate_limit_rules`, `activity_logs`.
2. **Akademik (`akademik` - 42 migrasi, 58 tabel):**
   - `students`, `guardians`, `student_guardians`, `student_addresses`, `student_physical_data`, `academic_years`, `semesters`, `grade_levels`, `class_groups`, `cohorts`, `student_class_enrollments`, `student_class_history`, `subjects`, `subject_grade_kkms`, `teaching_assignments`, `subject_teacher_assignments`, `subject_schedules`, `subject_schedule_presets`, `learning_objectives`, `student_scores`, `student_tp_scores`, `report_cards`, `student_attendances`, `lesson_attendances`, `psb_registrants`, `psb_tests`, `psb_test_sessions`, `psb_test_questions`, `psb_test_answers`, dll.
3. **Keuangan (`keuangan` - 88 migrasi, 50 tabel):**
   - `chart_of_accounts`, `cash_accounts`, `cash_transfers`, `fee_types`, `fee_groups`, `fee_schemes`, `fee_scheme_items`, `student_fee_scheme_assignments`, `student_fee_adjustments`, `student_bills`, `bill_payments`, `bill_payment_proofs`, `bill_payment_proof_allocations`, `bank_statements`, `bank_statement_references`, `budget_plans`, `budget_programs`, `budget_plan_income_items`, `budget_plan_expense_items`, `expenses`, `other_incomes`, `journal_entries`, `journal_entry_lines`, `payroll_disbursements`, `savings_accounts`, `savings_transactions`, `fiscal_year_closings`, `ppdb_registration_bills`, `ppdb_registration_payments`, `finance_audit_logs`, dll.
4. **Kepegawaian (`kepegawaian` - 32 migrasi, 37 tabel):**
   - `employees`, `job_positions`, `employment_statuses`, `employee_school_assignments`, `employee_addresses`, `employee_family_members`, `employee_education_trainings`, `employee_attendances`, `employee_leave_requests`, `employee_overtimes`, `payroll_periods`, `payroll_items`, `payroll_audit_logs`, `performance_reviews`, `recruitment_candidates`, `psychotest_types`, `psychotest_questions`, `psychotest_sessions`, `psychotest_answers`, `psychotest_results`, dll.
5. **Dapur & Logistik Pangan (`dapur` - 63 migrasi, 63 tabel):**
   - `kitchen_ingredients`, `kitchen_recipes`, `kitchen_recipe_ingredients`, `kitchen_menus`, `kitchen_menu_items`, `kitchen_meal_plans`, `kitchen_material_requirements`, `kitchen_purchase_requests`, `kitchen_purchase_orders`, `kitchen_goods_receipts`, `kitchen_stock_balances`, `kitchen_stock_movements`, `kitchen_stock_opnames`, `kitchen_production_batches`, `kitchen_qc_checks`, `kitchen_food_safety_incidents`, `kitchen_waste_records`, `kitchen_special_meal_recipients`, dll.
6. **Pengelolaan & Manajemen Mutu (`manajemen` - 54 migrasi, 54 tabel):**
   - `rips_documents`, `rips_domains`, `rips_goals`, `rips_programs`, `long_term_work_plans`, `school_work_plans`, `annual_work_plans`, `work_plan_programs`, `work_plan_activities`, `tasks`, `task_checklists`, `projects`, `quality_indicators`, `bsc_aspects`, `evadir_reports`, `accreditation_reports`, `institution_legal_documents`, `cross_app_dashboard_snapshots`, dll.
7. **Website Utama & PPDB (`website-utama` - 25 migrasi, 24 tabel):**
   - `news_posts`, `articles`, `galleries`, `gallery_items`, `events`, `testimonials`, `faqs`, `site_settings`, `home_hero_settings`, `consultation_tickets`, `ppdb_registrants`, `ppdb_payments`, `ppdb_registrant_documents`, `ppdb_selection_schedules`, `cms_access_grants`, dll.
8. **Kantin (`kantin` - 18 migrasi, 18 tabel):**
   - `vendors`, `vendor_products`, `product_categories`, `sales_transactions`, `sales_transaction_items`, `wallet_transactions`, `daily_spending_limits`, `canteen_students`, `vendor_fee_payments`, `operational_expenses`, `goods_receipts`, dll.
9. **Sarana & Prasarana (`sarpras` - 14 migrasi, 14 tabel):**
   - `facility_sites`, `facility_buildings`, `facility_rooms`, `assets`, `asset_mutations`, `facility_bookings`, `maintenance_requests`, `consumable_items`, `consumable_stock_mutations`, `consumable_stock_opnames`, `procurements`, `vendors`, dll.
10. **Perpustakaan (`perpustakaan` - 8 migrasi, 8 tabel):**
    - `books`, `book_categories`, `book_copies`, `library_members`, `book_loans`, `book_reservations`, `lost_damaged_reports`, `loan_reminders`.
11. **Tahfidz & Al-Quran (`alquran` - 4 migrasi, 4 tabel):**
    - `hafalan_records`, `hafalan_targets`, `munaqasyah_exams`, `kitab_kuning`.

### 5.2 Standar Konvensi Kolom & Relasi
- **Primary Key:** `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`.
- **Audit Timestamps:** `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`. (Tabel log seperti `finance_audit_logs` dan `activity_logs` bersifat *append-only* tanpa `updated_at`).
- **Multi-Tenant Scoping:** Seluruh tabel yang menyimpan data spesifik sekolah wajib memiliki kolom `satuan_pendidikan_id BIGINT UNSIGNED NOT NULL`.
- **Relasi Antar Database:** Dikelola secara logis. Contoh: `student_bills.student_id` (di modul Keuangan) merujuk ke `students.id` (di modul Akademik) tanpa constraint FK fisik MariaDB.

---

## 6. Fitur & Status Implementasi

Tabel pemetaan status fitur sistem dari PRD, dokumentasi referensi, dan kondisi kode aktual:

| Fitur / Modul | Dirujuk di Dokumen | Status Implementasi | File Kode Terkait |
|---|---|---|---|
| **01. Core Service** (13 Fitur) | `AI-CONTEXT.md` §2; `rancangan-coresrvice.md`; `ai-ref-coreservice.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/core/`, `apps/core-portal/src/apps/core/` |
| **02. Website Utama & PPDB** (22 Fitur) | `AI-CONTEXT.md` §2; `rancangan-website-utama.md`; `ai-ref-website-utama.md` | **Selesai (Jalan Produksi)** | `apps/website-utama/`, `apps/api-backend/src/modules/website-utama/`, `apps/core-portal/src/apps/website-utama/` |
| **03. Akademik** (36 Fitur) | `AI-CONTEXT.md` §2; `rancangan-akademik.md`; `ai-ref-akademik.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/akademik/`, `apps/core-portal/src/apps/akademik/`, `apps/core-portal/src/apps/guru/` |
| **04. Kepegawaian** (16 Fitur) | `AI-CONTEXT.md` §2; `rancangan-kepegawaian.md`; `ai-ref-kepegawaian.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/kepegawaian/`, `apps/core-portal/src/apps/kepegawaian/` |
| **05. Keuangan** (35 Fitur) | `AI-CONTEXT.md` §2; `rancangan-keuangan.md`; `ai-ref-keuangan.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/keuangan/`, `apps/core-portal/src/apps/keuangan/` |
| **06. Portal Orangtua** (14 Fitur) | `AI-CONTEXT.md` §2; `ARSITEKTUR-SISTEM.md` §2 | **Sebagian** | Endpoint tersebar (`keuangan/parent-facing`, `akademik`, `perpustakaan`), UI di `ParentBills.jsx` (`/portal-orangtua/tagihan`) |
| **07. Sarana & Prasarana** (9 Fitur) | `AI-CONTEXT.md` §2; `rancangan-sarpras.md`; `ai-ref-sarpras.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/sarpras/`, `apps/core-portal/src/apps/sarpras/` |
| **08. Kantin** (9 Fitur) | `AI-CONTEXT.md` §2; `rancangan-kantin.md`; `ai-ref-kantin.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/kantin/`, `apps/core-portal/src/apps/kantin/` |
| **09. Dapur** (8 Fitur PRD / 63 Tabel) | `AI-CONTEXT.md` §2; `rancangan-dapur.md`; `ai-ref-dapur.md` | **Selesai (Jalan Produksi)** *(integrasi staff/anggaran masih menggunakan stub fallback)* | `apps/api-backend/src/modules/dapur/`, `apps/core-portal/src/apps/dapur/` |
| **10. Perpustakaan** (14 Fitur) | `AI-CONTEXT.md` §2; `rancangan-perpustakaan.md`; `ai-ref-perpustakaan.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/perpustakaan/`, `apps/core-portal/src/apps/perpustakaan/` |
| **11. Ujian & Bank Soal (CBE)** (6 Fitur) | `AI-CONTEXT.md` §2; `ARSITEKTUR-SISTEM.md` §2 | **Belum Mulai** | Belum ada migrasi DB maupun modul backend/frontend |
| **12. Komunikasi & Notifikasi** (6 Fitur) | `AI-CONTEXT.md` §2; `ARSITEKTUR-SISTEM.md` §2 | **Belum Mulai** | Belum ada migrasi DB maupun modul backend/frontend |
| **13. Tahfidz & Al-Quran** (6 Fitur) | `AI-CONTEXT.md` §2; `rancangan-alquran.md`; `ai-ref-tahfidz-alquran.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/alquran/`, `apps/core-portal/src/apps/alquran/` |
| **14. Pengelolaan (Manajemen)** (13 Fitur) | `AI-CONTEXT.md` §2; `rancangan-manajemen.md`; `ai-ref-pengelolaan.md` | **Selesai (Jalan Produksi)** | `apps/api-backend/src/modules/manajemen/`, `apps/core-portal/src/apps/manajemen/` |

---

## 7. Aturan Bisnis

### 7.1 Keuangan & Pembukuan
1. **Kebijakan Non-Delete Data Finansial (Siklus Void):** Data transaksi, tagihan, kwitansi, atau jurnal keuangan yang sudah berstatus resmi dilarang dihapus secara fisik (`DELETE`) dari database. Status transaksi wajib melalui siklus: `DRAFT -> SUBMITTED -> APPROVED -> POSTED -> VOIDED`. Pembatalan transaksi wajib menggunakan aksi **"Void"** dengan menyertakan alasan (`void_reason`) dan mencatat jejak audit pada `finance_audit_logs`. *(Sumber: `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` §7; `docs/ai-ref-keuangan.md` §1)*
2. **Double-Entry Bookkeeping:** Setiap pengakuan penerimaan pembayaran, pengeluaran kas operasional, pencairan payroll, atau penyesuaian wajib menghasilkan pasangan debit dan kredit yang seimbang (`SUM(debit) == SUM(credit)`) pada tabel `journal_entries` dan `journal_entry_lines`. *(Sumber: `docs/ai-ref-keuangan.md` §4)*
3. **Approval Diskon Kasuistik Berjenjang (3 Tingkat):** Pengajuan potongan/keringanan biaya santri non-standar wajib melalui 3 level persetujuan: Verifikasi Dokumen & Rekomendasi TU -> Persetujuan Pimpinan Satuan (Kepala Sekolah) -> Pengesahan Direktur Yayasan dengan melampirkan Nomor SK Keringanan. *(Sumber: `docs/ai-ref-keuangan.md` §2)*
4. **Safeguard Nominal Terbayar pada Revisi Tagihan:** Nominal tagihan santri (`student_bills`) tidak boleh direvisi menjadi lebih kecil daripada nominal yang sudah terlanjur dibayarkan (`paid_amount`). *(Sumber: `docs/ai-ref-keuangan.md` §2)*
5. **Scheduler Generator Tagihan Bulanan (Pola Hibrida):** Setiap tanggal 25 pukul 00:00, background scheduler secara otomatis men-generate draf tagihan SPP santri aktif untuk bulan berikutnya, sementara biaya ad-hoc/insidental diinput manual. *(Sumber: `apps/api-backend/src/services/scheduler.js` baris 43–54)*
6. **Shadow Statement & Rekonsiliasi Bank:** Pencocokan mutasi rekening koran (`bank_statements`) dengan pembayaran santri (`bill_payments`) memanfaatkan pencocokan nominal desimal acak unik atau pencocokan nomor referensi bank. *(Sumber: `docs/ai-ref-keuangan.md` §5)*

### 7.2 Akademik & Penjadwalan
1. **Mesin Penjadwalan 2-Fase (CSP Solver + Simulated Annealing):** Penyusunan jadwal pelajaran otomatis menggunakan algoritma Constraint Satisfaction Problem (Fase 1: pemenuhan hard constraint ruang, guru, dan rombel tanpa bentrok) dilanjutkan Simulated Annealing (Fase 2: optimasi soft constraint seperti sebaran jam mengajar guru agar tidak menumpuk). *(Sumber: `docs/ai-ref-akademik.md` §4)*
2. **Penilaian Kurikulum Merdeka:** Mengakomodasi penilaian berbasis Tujuan Pembelajaran (TP) per lingkup materi dengan deskripsi capaian otomatis, di samping nilai sumatif akhir dan KKM/KKTP. *(Sumber: `docs/ai-ref-akademik.md` §3)*
3. **Konversi Intake PSB ke Siswa Aktif:** Pendaftar PSB yang dinyatakan lulus tes seleksi dan melunasi kewajiban daftar ulang secara otomatis dimigrasikan ke tabel induk `students`, dan dibuatkan akun login terintegrasi ke Core Service. *(Sumber: `docs/ai-ref-akademik.md` §2)*

### 7.3 SDM & Kepegawaian
1. **Presensi Geofencing GPS:** Absensi pegawai memvalidasi titik koordinat latitude/longitude perangkat terhadap koordinat radius resmi satuan pendidikan (radius default 100m) dan memeriksa jam toleransi keterlambatan. *(Sumber: `docs/ai-ref-kepegawaian.md` §3)*
2. **Kalkulasi Payroll Terintegrasi:** Komponen gaji mencakup gaji pokok, tunjangan fungsional/struktural, transport/kehadiran, dikurangi potongan presensi (alpa/terlambat) dan kasbon, yang disahkan menjadi draf pencairan ke modul Keuangan. *(Sumber: `docs/ai-ref-kepegawaian.md` §4)*

### 7.4 Dapur & Kantin
1. **Standar Nutrisi & Limit Anggaran Porsi Dapur:** Perencanaan menu makan santri wajib mematuhi batas pagu biaya per porsi (`kitchen_menu_cost_limits`) dan memenuhi variasi protein/gizi 10 harian. *(Sumber: `docs/ai-ref-dapur.md` §2)*
2. **Limit Jajan Harian & Cashless Kantin:** Transaksi santri menggunakan kartu santri (NFC/barcode) memotong saldo e-wallet, dan otomatis menolak transaksi jika melebihi batas limit jajan harian santri (`daily_spending_limits`). *(Sumber: `docs/ai-ref-kantin.md` §2)*

### 7.5 Perpustakaan
1. **Batas Pinjam & Denda Keterlambatan:** Peminjaman buku memiliki batasan durasi (default 7 hari) dan kuota maksimal buku per tipe anggota. Keterlambatan pengembalian otomatis mengakumulasikan tarif denda harian per buku. *(Sumber: `docs/ai-ref-perpustakaan.md` §2)*

---

## 8. Pedoman & Konvensi Pengembangan

### 8.1 Standar Kode & Penamaan
- **Database:** Nama tabel dan kolom menggunakan **Bahasa Inggris, format `snake_case`**. Tabel jamak (*plural*), contoh: `student_bills`, `employee_attendances`.
- **API Endpoint:** Format `/api/v1/<modul>/<resource>`, kata benda jamak, huruf kecil, pemisah tanda minus (`kebab-case`).
- **Format Respons Standar API:**
  - Sukses (HTTP 200/201):
    ```json
    { "success": true, "data": { ... }, "message": "Operasi berhasil", "errors": null }
    ```
  - Gagal (HTTP 4xx/5xx):
    ```json
    { "success": false, "data": null, "message": "Pesan deskripsi kesalahan", "errors": [ ... ] }
    ```

### 8.2 Aturan UI/UX (Aldepos Enterprise Design System)
*(Sumber: `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md`)*
1. **Filosofi:** *"Alat kerja data-padat, bukan landing page dekoratif."* Maksimalkan *information density*, bukan visual density. Dilarang menggunakan gradasi dekoratif (`bg-gradient-to-*`), glassmorphism, neumorphism, atau radius acak pada area kerja.
2. **Sistem 5 Warna Semantik Wajib (Dilarang Memakai Warna Ad-hoc):**
   - `success` (`emerald`): Berhasil, Kas Masuk, Surplus, Lunas, Disetujui.
   - `danger` (`rose`): Bahaya, Pengeluaran, Tunggakan, Gagal, Overdue.
   - `warning` (`amber`): Peringatan, Draft, Pending, Menunggu.
   - `info` (`indigo`): Informasi, Terbayar, Netral-Penting.
   - `neutral` (`slate`): Non-aktif, Arsip, Default.
   *(Pengecualian khusus: Quick-select chips yang memiliki kategori semantik sama dapat menggunakan warna sekunder info/indigo untuk opsi pembeda medis seperti izin vs sakit).*
3. **Token Radius & Shadow:**
   - Radius: Hanya `rounded-lg` (kartu/tabel/badge) dan `rounded-xl` (panel/modal).
   - Shadow: Default elemen kerja adalah border solid 1px tipis (`border-slate-200`). Hindari shadow tebal.
4. **Format Angka Finansial:** Wajib menggunakan kelas utility `.tnum` dan `.num-cell` (`text-align: right; font-variant-numeric: tabular-nums;`). Format Rupiah wajib melalui fungsi `formatRupiah` dari `shared/utils/formatters.js`.
5. **Komponen Wajib Reusable:** Wajib menggunakan komponen bersama yang telah disediakan: `StatRibbonCard`, `StatusPill`, `FlatAlertBanner`, `Pagination`, `DatePickerField`, `SearchableSelect`, `DataTable`, `FilterBar`, `Modal`.

### 8.3 Git & Branching
- **Branch Utama:** `main` (mencerminkan kode stabil yang dideploy ke produksi).
- **Branch Fitur:** `feature/<modul>-<deskripsi>` atau `fix/<modul>-<deskripsi>`.
- **Prinsip "Kerja Lokal Dulu":** Setiap penambahan fitur atau migrasi harus diuji tuntas di lingkungan lokal sebelum dilakukan `git push` ke remote repository.

---

## 9. Alur Kerja Utama

### 9.1 Alur Autentikasi Terpusat, Multi-Satuan Pendidikan, & SSO
1. Pengguna membuka portal `core.aldeposibs.com` dan diarahkan ke antarmuka Login (`/core/login`).
2. Klien mengirim kredensial (username/email dan password) ke `POST /api/v1/core/auth/login`.
3. Backend memverifikasi hash password dengan `bcryptjs` dan mengambil daftar unit sekolah yang diizinkan dari tabel `user_school_roles`.
4. Backend menerbitkan pasangan Access Token (JWT kedaluwarsa 15 menit) dan Refresh Token (7 hari), memuat klaim: `id`, `username`, `full_name`, `account_type`, dan array `school_units`.
5. Frontend menyimpan token di `AuthContext` (in-memory dan storage) serta menyisipkan header `Authorization: Bearer <token>` dan `X-Satuan-Pendidikan-Id` pada setiap request Axios.
6. Saat pengguna beralih antar-modul (misal dari Keuangan ke Akademik), SPA tidak melakukan login ulang karena token JWT berlaku untuk seluruh rute internal (SSO).

### 9.2 Alur Penerimaan Siswa Baru (PSB/PPDB) Lintas Domain
1. Calon wali murid mengakses formulir online di `aldeposibs.com/ppdb` (Next.js) tanpa login.
2. Form disubmit melalui endpoint intake `POST /api/v1/akademik/psb/intake`.
3. Modul Akademik mencatat data calon di `psb_registrants` dan secara in-process memanggil modul Keuangan (`POST /api/v1/keuangan/ppdb/bills`) untuk menerbitkan tagihan pendaftaran (`ppdb_registration_bills`).
4. Calon santri mengunggah bukti bayar atau melakukan pelunasan biaya seleksi.
5. Calon santri mengikuti ujian seleksi dan wawancara di portal `apps/core-portal/src/apps/calon-murid/`.
6. Panitia PPDB menetapkan status kelulusan di modul Akademik (`/akademik/psb/seleksi`).
7. Santri yang dinyatakan diterima dan melunasi biaya pangkal dikonversi menjadi santri resmi di `students`, dan webhook Core Service dipicu untuk membuat akun santri dan akun wali santri secara otomatis.

### 9.3 Alur Penetapan & Penagihan SPP, Kasir POS, dan Jurnal Otomatis
1. **Penetapan Skema:** Bagian Keuangan mengonfigurasi skema tarif biaya di `/keuangan/fee-schemes` dan menetapkan kelompok santri di `student_fee_scheme_assignments`.
2. **Penerbitan Tagihan:** Tanggal 25 setiap bulan, scheduler otomatis menerbitkan draf tagihan untuk bulan mendatang di tabel `student_bills`.
3. **Pembayaran Santri:**
   - Kasir fisik membuka menu `/keuangan/payments`, memilih santri, menerima uang tunai, dan mengklik "Bayar".
   - Atau wali santri mengunggah bukti transfer mandiri via `/portal-orangtua/tagihan`.
4. **Verifikasi & Eksekusi Jurnal:**
   - Sistem mencatat transaksi di `bill_payments`.
   - Status tagihan di `student_bills` terupdate (`paid` atau `partial`).
   - Sistem secara atomik membuat entri jurnal double-entry di `journal_entries` dan `journal_entry_lines`: mendebit akun Kas/Bank (`cash_accounts`) dan mengkredit akun Pendapatan SPP (`chart_of_accounts`).

### 9.4 Alur Penggajian (Payroll) hingga Pencairan Kas Keuangan
1. Staf HRD di modul Kepegawaian membuka menu `/kepegawaian/payroll` dan memilih periode gaji aktif.
2. Sistem mengagregasi data kehadiran, keterlambatan, lembur, dan potongan dari modul presensi, lalu menghasilkan draf rekapitulasi gaji di `payroll_items`.
3. HRD dan Kepala Sekolah menyetujui draf payroll.
4. Data payroll yang disetujui dikirim ke modul Keuangan (`payroll_disbursements`).
5. Bendahara Keuangan memverifikasi ketersediaan dana kas/bank di `/keuangan/payroll`, lalu menekan tombol "Cairkan Payroll".
6. Sistem memotong saldo akun kas/bank terkait dan otomatis membukukan jurnal pengeluaran gaji secara seimbang ke buku besar.

### 9.5 Alur Sirkulasi Perpustakaan (Katalog, Peminjaman, & Pengembalian)
1. Pustakawan mendaftarkan eksemplar buku baru dengan nomor barcode unik di `/perpustakaan/katalog`.
2. Pengunjung (santri atau guru) dapat mencari ketersediaan buku melalui antarmuka publik OPAC (`/perpustakaan/opac`).
3. Saat meminjam, staf pustakawan membuka menu `/perpustakaan/sirkulasi`, memindai kartu anggota dan barcode buku.
4. Sistem memverifikasi limit pinjaman dan batas buku, lalu mencatat data di `book_loans` dengan `due_date` default H+7.
5. Scheduler harian memeriksa buku yang mendekati jatuh tempo (H-1) dan mencatat antrean notifikasi di `loan_reminders`.
6. Saat pengembalian: jika melewati `due_date`, sistem menghitung denda otomatis per hari terlambat sebelum mengubah status eksemplar buku kembali menjadi `available`.

---

## 10. Masalah Terbuka

### 10.1 Isu Tercatat & TODO pada Kode
1. **Validasi Hash API Key (`apps/api-backend/src/middlewares/auth.js:17`):**
   ```javascript
   function requireApiKey(req, res, next) {
     const apiKey = req.headers['x-api-key'];
     if (!apiKey) { return res.status(401)...; }
     // TODO: Validasi hash API key di tabel api_clients
     next();
   }
   ```
   *Masalah:* Middleware saat ini hanya memeriksa apakah header `x-api-key` disertakan atau tidak, tanpa mencocokkan hash API key ke tabel `api_clients`. Siapa pun yang menyertakan string sembarang pada header `x-api-key` dapat mengakses rute internal service.
2. **Stub Resolver Lintas Modul pada Dapur (`apps/api-backend/src/modules/dapur/shared/external-refs.js`):**
   - Baris 28: `// TODO: Ganti dengan require('../../kepegawaian/internal/service') jika sudah terintegrasi`
   - Baris 54: `// TODO: Ganti dengan require('../../akademik/internal/service') jika mengambil rombel/kelas riil`
   - Baris 79: `// TODO: Ganti dengan pemanggilan akademikInternalService.getStudentBrief(id)`
   - Baris 106: `// TODO: Ganti dengan pemanggilan keuanganInternalService.getAccount(id)`
   *Masalah:* Modul Dapur saat ini masih mengembalikan string mock dummy (`Staf #${id}`, `Kelompok #${id}`) untuk referensi pegawai, santri, dan akun kas.
3. **Perluasan 5 Fitur Perpustakaan Belum Tercatat di PRD Excel Fisik:**
   Dokumen `ARSITEKTUR-SISTEM.md` §9 dan `rancangan-perpustakaan.md` mencatat penambahan 5 fitur resmi (#172–#176), tetapi file spreadsheet `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` dan `Controlling_Sistem_Manajemen_Sekolah.xlsx` belum diperbarui secara fisik.

### 10.2 Utang Teknis & Area Rawan
1. **Sistem Token CSS Paralel Manajemen (`apps/core-portal/src/apps/manajemen/theme/manajemen-theme.css`):**
   Berkas CSS berukuran 40.5 KB ini mendefinisikan ratusan variabel `--mj-*` independen yang menyimpang dari Aldepos Enterprise Design System. Sesuai `PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` §8, file ini merupakan utang desain yang harus dilebur ke token resmi.
2. **Duplikasi Shell Layout di Frontend:**
   Alih-alih menggunakan satu unified layout shell, sub-aplikasi di `apps/core-portal` masing-masing menduplikasi layout tersendiri (`KepegawaianLayout.jsx`, `AkademikLayout.jsx`, `KeuanganLayout.jsx`, `DapurLayout.jsx`, `KantinLayout.jsx`, `SarprasLayout.jsx`, `PerpustakaanLayout.jsx`, `AlquranLayout.jsx`, `DapurLayout.jsx`).
3. **Modul yang Belum Diimplementasikan:**
   Modul 11 (Ujian & Bank Soal / CBE) dan Modul 12 (Komunikasi & Notifikasi) belum memiliki baris kode maupun skema database sama sekali di repositori.

---

## 11. Konflik, Celah, dan Ambiguitas

### 11.1 Konflik Dokumentasi vs Kode Aktual
1. **KONFLIK: Akses Launcher Publik vs Login Gate pada Root Route `/`**
   - **Dokumentasi (`docs/ARSITEKTUR-SISTEM.md` baris 140 & baris 328):**
     *“Halaman awal (`/`) adalah halaman kartu/icon daftar 13 modul dan tampil publik, tidak butuh login untuk sekadar melihat kartunya. Klik satu kartu -> masuk ke route login milik modul itu sendiri (`/akademik/login`, `/keuangan/login`, dst).”*
   - **Kode Aktual (`apps/core-portal/src/router.jsx` baris 29–38 dan 56–60):**
     ```javascript
     function RootGate() {
       const { isAuthenticated, isLoading } = useAuth();
       if (isLoading) return <PageLoader />;
       if (!isAuthenticated) return <Login />;
       return <Launcher />;
     }
     ```
     *Penjelasan:* Pada kode riil, jika pengguna belum login (`!isAuthenticated`), rute root `/` langsung menampilkan form login Core Service (`<Login />`), sehingga pengguna umum tidak dapat melihat launcher modul secara publik tanpa login terlebih dahulu.
2. **KONFLIK: Konfigurasi Database Staging Tunggal vs Multi-Database Riil**
   - **Dokumentasi (`docs/panduan-deployment-dan-strategi-lingkungan.md` baris 90–106):**
     Menyebutkan variabel `DB_NAME=aldepos_staging` dan `DB_NAME=aldepos_dev` seolah-olah seluruh aplikasi menggunakan 1 database tunggal, dan menyediakan perintah kloning `mysql < hostinger_live.sql`.
   - **Kode Aktual (`apps/api-backend/.env` & `src/config/db/*.js`):**
     Sistem menggunakan 11 database fisik terpisah (`core_local`, `kepegawaian_local`, `akademik_local`, `keuangan_local`, `dapur_local`, dll). Script kloning tunggal dari panduan deployment tersebut tidak dapat diterapkan langsung pada lingkungan nyata.
3. **KONFLIK: Port Default Backend**
   - **Dokumentasi (`docs/panduan-deployment-dan-strategi-lingkungan.md` baris 92 & 101):** Mencantumkan port backend adalah `5000`.
   - **Kode Aktual (`apps/api-backend/.env` baris 4 dan `src/server.js` baris 10):** Port backend yang aktif adalah `3000` (`CORE_PORT=3000`).

### 11.2 Celah Dokumentasi & Ambiguitas
- Modul CBE (Ujian Berbasis Komputer) dan Komunikasi/Notifikasi terdaftar di PRD dan arsitektur sistem, tetapi dokumen spesifikasi detail seperti `erd-cbe.md`, `api-contract-cbe.md`, `rancangan-cbe.md` belum pernah dibuat.
- Terdapat saltik penamaan berkas pada `docs/rancangan-coresrvice.md` (kekurangan huruf 'e' pada kata *service*).

### 11.3 Pertanyaan yang Perlu Dijawab untuk Melengkapi Spesifikasi
1. Apakah root route `/` pada `core.aldeposibs.com` harus diubah agar menampilkan launcher kartu secara terbuka tanpa login (sesuai `ARSITEKTUR-SISTEM.md`), ataukah perilaku gerbang login tertutup (`RootGate`) yang saat ini aktif sengaja dipertahankan demi keamanan internal?
2. Bagaimana prosedur resmi *backup & restore* multi-database (11-14 file database) untuk lingkungan staging dan produksi di Hostinger?
3. Kapan modul Ujian (CBE) dan modul Komunikasi & Notifikasi dijadwalkan untuk dirancang spesifikasi teknis dan migrasi databasenya?

---

## 12. Cara Menjalankan

### 12.1 Prasyarat Lingkungan
- Node.js versi 18 LTS atau 20 LTS (ESM & CommonJS support).
- Layanan MariaDB 10.5 (atau MySQL 8) berjalan pada host `127.0.0.1:3306`.
- 11 database lokal dibuat terlebih dahulu di MariaDB: `core_local`, `kepegawaian_local`, `akademik_local`, `keuangan_local`, `alquran_local`, `kantin_local`, `sarpras_local`, `dapur_local`, `perpustakaan_local`, `manajemen_local`, `website_utama_local`.

### 12.2 Pemasangan Dependensi
Jalankan instalasi dari direktori root monorepo:
```bash
npm install
```

### 12.3 Konfigurasi Environment Variables
Buat file `apps/api-backend/.env` dengan daftar variabel berikut (isi dengan kredensial lokal Anda, nilai rahasia di bawah disamarkan):

```env
# Server
CORE_PORT=3000
CORE_NODE_ENV=development

# Database Koneksi (Ulangi untuk tiap prefix modul)
CORE_DB_HOST=127.0.0.1
CORE_DB_PORT=3306
CORE_DB_USER=[REDACTED]
CORE_DB_PASSWORD=[REDACTED]
CORE_DB_NAME=core_local
CORE_DB_SSL=false

KEPEGAWAIAN_DB_HOST=127.0.0.1
KEPEGAWAIAN_DB_PORT=3306
KEPEGAWAIAN_DB_USER=[REDACTED]
KEPEGAWAIAN_DB_PASSWORD=[REDACTED]
KEPEGAWAIAN_DB_NAME=kepegawaian_local
KEPEGAWAIAN_DB_SSL=false

AKADEMIK_DB_HOST=127.0.0.1
AKADEMIK_DB_PORT=3306
AKADEMIK_DB_USER=[REDACTED]
AKADEMIK_DB_PASSWORD=[REDACTED]
AKADEMIK_DB_NAME=akademik_local
AKADEMIK_DB_SSL=false

KEUANGAN_DB_HOST=127.0.0.1
KEUANGAN_DB_PORT=3306
KEUANGAN_DB_USER=[REDACTED]
KEUANGAN_DB_PASSWORD=[REDACTED]
KEUANGAN_DB_NAME=keuangan_local
KEUANGAN_DB_SSL=false

ALQURAN_DB_HOST=127.0.0.1
ALQURAN_DB_PORT=3306
ALQURAN_DB_USER=[REDACTED]
ALQURAN_DB_PASSWORD=[REDACTED]
ALQURAN_DB_NAME=alquran_local
ALQURAN_DB_SSL=false

KANTIN_DB_HOST=127.0.0.1
KANTIN_DB_PORT=3306
KANTIN_DB_USER=[REDACTED]
KANTIN_DB_PASSWORD=[REDACTED]
KANTIN_DB_NAME=kantin_local
KANTIN_DB_SSL=false

SARPRAS_DB_HOST=127.0.0.1
SARPRAS_PORT=3306
SARPRAS_DB_USER=[REDACTED]
SARPRAS_DB_PASSWORD=[REDACTED]
SARPRAS_DB_NAME=sarpras_local
SARPRAS_DB_SSL=false

DAPUR_DB_HOST=127.0.0.1
DAPUR_DB_PORT=3306
DAPUR_DB_USER=[REDACTED]
DAPUR_DB_PASSWORD=[REDACTED]
DAPUR_DB_NAME=dapur_local
DAPUR_DB_SSL=false

PERPUSTAKAAN_DB_HOST=127.0.0.1
PERPUSTAKAAN_PORT=3306
PERPUSTAKAAN_DB_USER=[REDACTED]
PERPUSTAKAAN_DB_PASSWORD=[REDACTED]
PERPUSTAKAAN_DB_NAME=perpustakaan_local
PERPUSTAKAAN_DB_SSL=false

MANAJEMEN_DB_HOST=127.0.0.1
MANAJEMEN_PORT=3306
MANAJEMEN_DB_USER=[REDACTED]
MANAJEMEN_DB_PASSWORD=[REDACTED]
MANAJEMEN_DB_NAME=manajemen_local
MANAJEMEN_DB_SSL=false

WEBSITEUTAMA_DB_HOST=127.0.0.1
WEBSITEUTAMA_PORT=3306
WEBSITEUTAMA_DB_USER=[REDACTED]
WEBSITEUTAMA_DB_PASSWORD=[REDACTED]
WEBSITEUTAMA_DB_NAME=website_utama_local
WEBSITEUTAMA_DB_SSL=false

# Keamanan JWT
CORE_JWT_SECRET=[REDACTED]
CORE_JWT_EXPIRES_IN=15m
CORE_JWT_REFRESH_SECRET=[REDACTED]
CORE_JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORE_CORS_ORIGIN=http://localhost:5173
```

### 12.4 Eksekusi Database Migration & Seeding
Jalankan migrasi database per modul:
```bash
# Migrasi modul utama
npm run migrate:core
npm run migrate:kepegawaian
npm run migrate:akademik
npm run migrate:perpustakaan
npm run migrate:manajemen

# Migrasi modul lainnya via workspace api-backend
npm --workspace=apps/api-backend run migrate:keuangan
npm --workspace=apps/api-backend run migrate:alquran
npm --workspace=apps/api-backend run migrate:kantin
npm --workspace=apps/api-backend run migrate:sarpras
npm --workspace=apps/api-backend run migrate:dapur
npm --workspace=apps/api-backend run migrate:website-utama

# (Opsional) Seeding data awal
npm run seed:core
npm run seed:kepegawaian
npm run seed:akademik
npm --workspace=apps/api-backend run seed:keuangan
```

### 12.5 Menjalankan Server Development
Buka 3 terminal terpisah atau jalankan secara paralel:
```bash
# Terminal 1: Jalankan Backend Server (Port 3000)
npm run dev:backend

# Terminal 2: Jalankan Core Portal Frontend (Port 5173)
npm run dev:portal

# Terminal 3: Jalankan Website Utama Next.js (Port 3001)
npm --workspace=apps/website-utama run dev
```

### 12.6 Pengujian & Build Produksi
- **Testing:** Pengujian integrasi lokal dijalankan via skrip scratch atau runner pengujian internal.
- **Build Frontend Portal:** `npm run build:portal` (menghasilkan folder `apps/core-portal/dist/`).
- **Build Website Utama:** `npm --workspace=apps/website-utama run build` (menghasilkan build Next.js di `apps/website-utama/.next/`).

---

## 13. Kutipan Kunci

### 13.1 Prinsip Arsitektur Global
> *Sumber: `docs/ARSITEKTUR-SISTEM.md` Baris 85–96*
```text
1. Satu database per aplikasi/modul. Tidak ada JOIN atau FOREIGN KEY fisik lintas database.
   Data lintas modul direferensikan lewat ID saja, divalidasi/diambil lewat pemanggilan
   service-layer modul pemiliknya (atau cache lokal terkontrol untuk data yang sering dibaca).
   Sejak revisi 2026-08-16 (Bagian 1.1), pemanggilan ini terjadi in-process (satu backend
   api.aldeposibs.com), bukan lagi HTTP antar server — tapi prinsip "tidak boleh query langsung
   ke tabel modul lain, harus lewat service milik modul itu" tetap wajib.
2. Multi-satuan-pendidikan. Satu Yayasan bisa punya beberapa Satuan Pendidikan. Setiap
   tabel di setiap aplikasi yang datanya spesifik per sekolah wajib punya kolom
   satuan_pendidikan_id yang mengacu ke Core Service, karena tampilan & operasi di semua
   aplikasi difilter oleh satuan pendidikan aktif yang dipilih pengguna di header.
```

### 13.2 Filosofi Desain Enterprise
> *Sumber: `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` Baris 12–22*
```text
> "Alat kerja data-padat, bukan landing page dekoratif."
> Maximize information density, not visual density. Layar boleh padat informasi, tapi setiap elemen harus punya hierarchy, alignment, dan spacing yang teratur.

DILARANG di seluruh aplikasi:
- Gradasi dekoratif (bg-gradient-to-*) pada kartu/section kerja
- Glassmorphism, neumorphism, bento grid
- Kotak ikon besar warna-warni pada kartu KPI
- Radius acak — hanya gunakan token radius resmi (lihat §2)
- Shadow besar/menyebar (shadow-2xl, custom drop shadow besar) pada elemen kerja harian
- Warna modul ad-hoc (mis. "Akademik = teal", "Kantin = amber") — warna HANYA mengikuti status semantik, bukan identitas modul
```

### 13.3 Kebijakan Non-Delete Data Finansial
> *Sumber: `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` Baris 169–176*
```text
Untuk data yang menyentuh uang, presensi, nilai, atau dokumen resmi:
DRAFT → SUBMITTED → APPROVED → POSTED → VOIDED

- Tombol yang benar: "Void", bukan "Delete".
- Void wajib meminta alasan (Void reason, required) dan tetap tercatat di audit trail — tidak dihapus fisik dari database.
- Pengecualian Delete Fisik: Delete fisik hanya diperbolehkan untuk data draft/belum final yang belum tercatat sebagai transaksi resmi (contoh: entri pengeluaran panitia PPDB sebelum SPJ resmi, draft slip gaji/payroll sebelum disetujui, draft nilai sebelum disubmit/disahkan), bukan untuk data yang sudah berstatus tercatat/posted/approved.
```

### 13.4 Standar Penamaan Database & Audit Timestamp
> *Sumber: `docs/ARSITEKTUR-SISTEM.md` Baris 170–179*
```text
Bahasa Inggris, snake_case, untuk nama tabel maupun kolom, di seluruh 14 aplikasi. Istilah
asli Indonesia dari PRD (siswa, rombel, dst) dipakai sebagai referensi arti saja, bukan nama
kolom/tabel aktual. Contoh penerapan ada di erd-coreservice.md (17 tabel, semua Inggris
snake_case) — jadikan itu acuan pola untuk ERD 13 aplikasi lainnya.

Standar PK & timestamp yang ikut berlaku di semua tabel semua aplikasi:
- Primary key: id BIGINT UNSIGNED AUTO_INCREMENT
- Semua tabel (kecuali tabel log append-only) punya created_at & updated_at TIMESTAMP
- Tabel log (audit/activity/history) tidak perlu updated_at — bersifat append-only
```

### 13.5 Kontrak Format Respons API
> *Sumber: `docs/AI-CONTEXT.md` Baris 68–72*
```text
### 5.1 Format Response API
- Standar Format:
  - Sukses: { "success": true, "data": <payload|null>, "message": "<deskripsi>", "errors": null }
  - Gagal: { "success": false, "data": null, "message": "<alasan>", "errors": <array|object|null> }
- STATUS: Sesuai dokumen (apps/api-backend/src/middlewares/errorHandler.js, controller standard).
```

---

## Bagian yang Tidak Bisa Saya Pastikan

1. **Implementasi Rinci Modul 11 (CBE) dan Modul 12 (Komunikasi & Notifikasi):**
   - *Alasan:* Tidak ditemukan berkas ERD, rancangan, kontrak API, maupun baris kode implementasi untuk kedua modul ini di seluruh repositori (status pada `AI-CONTEXT.md` tercatat `belum mulai`).
2. **Detail Rute & Desain UI Portal Orangtua yang Belum Tercover:**
   - *Alasan:* Modul Portal Orangtua tidak memiliki folder backend atau migrasi database terpisah. Sebagian fungsionalitas (tagihan & konfirmasi bayar) telah aktif di `ParentBills.jsx`, namun fungsionalitas mutabaah tahfidz anak, absensi harian anak, dan komunikasi langsung dengan wali kelas belum memiliki endpoint dedicated.
3. **Konfigurasi Kredensial dan Skrip Deployment Remote di Hostinger Production:**
   - *Alasan:* File `.env` bersifat lokal dan rahasia, serta alur deployment GitHub Actions ke server produksi Hostinger dikonfigurasi melalui GitHub Secrets yang berada di luar jangkauan pembacaan repositori kode lokal.
