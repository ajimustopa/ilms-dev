Status: perlu-revisi
Diperbarui: 2026-09-29

# AI-CONTEXT: Sistem Manajemen Terintegrasi Yayasan & Sekolah Aldepos

> Dokumen acuan konteks sistem mesin-ke-mesin (AI Agent). Format ringkas, terstruktur, padat data.

---

## 1. Aturan Pembaruan (Definition-of-Done)
- **Wajib diperbarui** sebelum menyelesaikan task jika ada perubahan status modul, penambahan modul baru, jalur path kode, perubahan dependency, atau konvensi arsitektur.
- **Konsistensi:** Sinkronkan baris terakhir `<!-- updated: YYYY-MM-DD from commit <hash> -->` dengan commit hash aktif saat update dilakukan.

---

## 2. Status 14 Modul Sistem

| ID | Nama Modul | Backend (`apps/api-backend/src/modules/`) | Frontend Portal (`apps/core-portal/src/apps/`) | DB Migrations (`apps/api-backend/db/migrations/`) | Status Scan Aktual | File Referensi AI |
|---|---|---|---|---|---|---|
| 01 | Core Service | `core/` | `core/` | `core/` | `jalan-produksi` | `ai-ref-coreservice.md` |
| 02 | Website Utama & PPDB | `website-utama/` | `website-utama/` *(+ `apps/website-utama`)* | `website-utama/` | `jalan-produksi` | `ai-ref-website-utama.md` |
| 03 | Akademik | `akademik/` | `akademik/` *(+ `guru/`)* | `akademik/` | `jalan-produksi` *(Dapodik master, TP Kurikulum Merdeka, 2-phase CSP + Simulated Annealing Timetable engine, PSB / Penerimaan Murid Baru, e-Rapor, Portal Guru)* | `ai-ref-akademik.md` |
| 04 | Kepegawaian | `kepegawaian/` | `kepegawaian/` | `kepegawaian/` | `jalan-produksi` | `ai-ref-kepegawaian.md` |
| 05 | Keuangan | `keuangan/` | `keuangan/` | `keuangan/` | `jalan-produksi` *(Konteks Yayasan vs Satuan, Master Jenis Kas Tunai & Bank BNI, Kebijakan Non-Delete/Status Toggle, Wajib Catatan Perubahan & Audit Trail, Tombol Reload Database di seluruh halaman, RAPBS & Revisi Versi, Penetapan Tagihan Siswa Massal & Manual Ad-hoc, Approval Berjenjang Diskon Kasuistik 3 Tingkat dgn SK, Revisi Pasca-Terbit Safeguard Nominal Terbayar & Jurnal Penyesuaian, Scheduler Generator Bulanan Pola Hibrida, Kasir POS & Bukti Transfer Manual, Filter Otomatis Kas Tunai pada Pembayaran, Pengeluaran & Penerimaan Non-SPP, Pencairan Payroll, Jurnal Double-Entry, Tabungan, Tutup Buku, Laporan Standar Akuntansi & Manajerial Eksekutif, PPDB Aligned Lifecycle: Draf-Approval-Terbit-Revisi-Cicilan-Refund & Kontinuitas Kartu Bayar, Rekening Koran & Rekonsiliasi Bank Shadow Statement dgn Pecahan Desimal & Ekspor Waktu, Student Ledger & Matriks Kelas dgn Logika Unbilled Santri Keluar & Tunggakan TP Lalu, 88 Migrasi Knex)* | `ai-ref-keuangan.md` |
| 06 | Portal Orangtua | `-` *(endpoint tersebar di keuangan/perpus/akademik)* | `ParentBills.jsx` *(rute `/portal-orangtua/tagihan`, `/keuangan/portal-wali`)* | `-` | `jalan-sebagian` *(Parent-facing self-service tagihan & konfirmasi transfer aktif)* | `ai-ref-portal-orangtua.md` |
| 07 | Sarpras | `sarpras/` | `sarpras/` | `sarpras/` | `jalan-produksi` | `ai-ref-sarpras.md` |
| 08 | Kantin | `kantin/` | `kantin/` | `kantin/` | `jalan-produksi` | `ai-ref-kantin.md` |
| 09 | Dapur | `dapur/` | `dapur/` | `dapur/` | `jalan-produksi` | `ai-ref-dapur.md` |
| 10 | Perpustakaan | `perpustakaan/` | `perpustakaan/` | `perpustakaan/` | `jalan-produksi` | `ai-ref-perpustakaan.md` |
| 11 | Ujian & Bank Soal (CBE) | `-` | `-` | `-` | `belum mulai` | `ai-ref-cbe.md` |
| 12 | Komunikasi & Notifikasi | `-` | `-` | `-` | `belum mulai` | `ai-ref-komunikasi.md` |
| 13 | Tahfidz & Al-Quran | `alquran/` | `alquran/` | `alquran/` | `jalan-produksi` | `ai-ref-tahfidz-alquran.md` |
| 14 | Pengelolaan (Manajemen) | `manajemen/` | `manajemen/` | `manajemen/` | `jalan-produksi` *(RIPS, RKJP/RKJM, RKT multi-assignee & date-range, EVADIR, BSC, Repositori SK, SVAR Gantt Chart & theme switcher)* | `ai-ref-pengelolaan.md` |

---

## 3. Peta 3 Domain Deployment

| Domain Target | Direktori Monorepo | Framework / Runtime | Tipe Akses | Deskripsi & Cakupan |
|---|---|---|---|---|
| `aldeposibs.com` | `apps/website-utama/` | Next.js (App Router, Tailwind CSS) | Publik (Tanpa Login) | Profil yayasan/sekolah, berita, galeri, formulir pendaftaran PPDB online, status tracking PPDB |
| `core.aldeposibs.com` | `apps/core-portal/` | React 18 + Vite SPA, Tailwind CSS | Publik (Landing Launcher), Terautentikasi (Modul) | Single Page Application internal. Route `/` adalah launcher modul (publik); route `/<modul>/login` dan `/<modul>/*` (lazy loaded per modul) |
| `api.aldeposibs.com` | `apps/api-backend/` | Node.js + Express.js (Modular Monolith) | REST API (JWT & X-API-Key) | Backend tunggal 1 proses untuk seluruh domain: prefix `/api/v1/<modul>`, isolasi multi-database MariaDB (11 connection pool Knex terpisah: `core`, `kepegawaian`, `akademik`, `keuangan`, `alquran`, `kantin`, `sarpras`, `dapur`, `perpustakaan`, `manajemen`, `website-utama`) |

---

## 4. Matriks Dependency Antar Modul (Arah: "Modul Kiri Butuh Data Dari Modul Kanan")

| Modul Konsumen | Modul Sumber Data (Dependency) | Tujuan / Bentuk Data yang Dibutuhkan |
|---|---|---|
| Core Service | Akademik, Kepegawaian | Trigger webhook / auto-provisioning akun saat siswa/pegawai baru diinput |
| Website Utama | Core Service, Akademik, Kepegawaian, Sarpras, Keuangan | Satuan pendidikan, intake pendaftaran PPDB langsung ke modul Akademik (`POST /api/v1/akademik/internal/psb/intake`), profil guru, fasilitas sarpras, channel pembayaran PPDB |
| Akademik | Core Service, Kepegawaian, Website Utama, Manajemen | Satuan pendidikan & akun, penugasan guru pengajar/wali kelas, intake pendaftar PPDB publik, integrasi program RKT kalender pendidikan |
| Kepegawaian | Core Service | Satuan pendidikan & akun login pegawai |
| Keuangan | Core Service, Akademik, Kepegawaian, Website Utama, Kantin | Satuan pendidikan, data siswa/kelas (tagihan SPP), data pegawai (payroll), biaya PPDB, bagi hasil & omset kasir kantin |
| Portal Orangtua | Core Service, Akademik, Keuangan, Kantin, Tahfidz | Autentikasi ortu, profil/absensi/nilai anak, tagihan & riwayat bayar, saldo/transaksi jajan, mutaba'ah tahfidz |
| Sarpras | Core Service, Kepegawaian, Keuangan | Satuan pendidikan, penanggung jawab/peminjam aset (pegawai), anggaran pengadaan/maintenance |
| Kantin | Core Service, Keuangan, Portal Orangtua | Satuan pendidikan & auth, settlement kasir & bagi hasil, top-up saldo cashless santri |
| Dapur | Core Service, Keuangan | Satuan pendidikan, anggaran belanja bahan makanan harian/mingguan (opsional) |
| Perpustakaan | Core Service, Akademik, Kepegawaian | Satuan pendidikan & auth, data anggota siswa & kelas, data anggota guru/karyawan |
| Ujian & Bank Soal (CBE) | Core Service, Akademik | Satuan pendidikan & auth, rombel/kelas, jadwal pelajaran, bank soal kurikulum |
| Komunikasi & Notifikasi | Core Service, Akademik, Kepegawaian, Keuangan | Kontak tujuan, trigger broadcast presensi harian, pengingat tagihan SPP, pengumuman yayasan |
| Tahfidz & Al-Quran | Core Service, Akademik, Kepegawaian | Satuan pendidikan & auth, data santri/kelas, data ustadz/penguji munaqasyah |
| Pengelolaan (Manajemen) | Core Service, Akademik, Keuangan, Kepegawaian, Sarpras *(+ seluruh modul)* | Dashboard agregat KPI yayasan, RIPS/RKS, evaluasi kinerja unit, supervisi guru, monitoring program kerja |

---

## 5. Konvensi Teknis Global Aktual (Kode vs Dokumen)

### 5.1 Format Response API
- **Standar Format:**
  - Sukses: `{ "success": true, "data": <payload|null>, "message": "<deskripsi>", "errors": null }`
  - Gagal: `{ "success": false, "data": null, "message": "<alasan>", "errors": <array|object|null> }`
- **STATUS:** `Sesuai dokumen` (`apps/api-backend/src/middlewares/errorHandler.js`, controller standard).

### 5.2 Autentikasi & Otorisasi
- **Token Format:** Bearer JWT di header `Authorization: Bearer <token>`.
- **JWT Payload:** `{ id, username, full_name, account_type, ref_type, ref_id, school_units: [...] }` *(STATUS: DRIFT - apps/api-backend/src/modules/core/auth/service.js:115-122 payload aktual tidak memuat ref_type dan ref_id)*.
- **Verifikasi Lintas Modul:** In-process via middleware lokal `verifyJwt` dengan `CORE_JWT_SECRET` (tanpa query DB per request).
- **Service Internal Access:** Header `X-API-Key` via middleware `requireApiKey` *(STATUS: DRIFT - apps/api-backend/src/middlewares/auth.js:16-19 bypass next() tanpa validasi hash tabel api_clients)*.
- **Multi-Tenant Unit Selection:** Header `X-Satuan-Pendidikan-Id` / payload token `school_units`.
- **STATUS:** `DRIFT` (lihat rujukan file:baris pada poin JWT payload dan requireApiKey di atas).

### 5.3 Database & Query Engine
- **Engine:** MariaDB 10.5 InnoDB, Charset `utf8mb4_unicode_ci`.
- **Query Builder / Migrasi:** Knex.js (`knexfile.<modul>.js`, connection per modul di `apps/api-backend/src/config/db/<modul>.js`).
- **Isolasi Database:** 1 database fisik terpisah per modul. **Dilarang keras JOIN/FK fisik lintas database**.
- **STATUS:** `Sesuai dokumen`.

### 5.4 Penamaan Tabel & Kolom
- **Bahasa & Kasus:** Bahasa Inggris, `snake_case` untuk nama tabel dan kolom.
- **Primary Key:** `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`.
- **Multi-Tenant Column:** Wajib memiliki `satuan_pendidikan_id BIGINT UNSIGNED` pada tabel spesifik sekolah.
- **Audit Timestamps:** `created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` (kecuali tabel log audit append-only).
- **STATUS:** `Sesuai dokumen`.

### 5.5 Struktur Frontend (Core Portal)
- **Monolith Router:** Single React Router (`apps/core-portal/src/router.jsx`) memuat 13 modul terpisah via `lazyLoad()`.
- **Shared UI / State:** `apps/core-portal/src/shared/` (Layout, Header Shell, AuthContext, Axios Client dengan auto token refresh).
- **Sub-Aplikasi Guru:** Folder `apps/core-portal/src/apps/guru/` bertindak sebagai frontend interface khusus guru yang memadukan modul Akademik + Kepegawaian (presensi GPS radius, jadwal pribadi, input nilai & TP).
- **Aldepos ILMS Portal & Launcher Architecture:**
  - Nama Produk Resmi: **Aldepos ILMS**
  - **Login Portal:** `apps/core-portal/src/apps/core/pages/Login.jsx` dan subkomponen di `apps/core-portal/src/apps/core/pages/login/` (`LoginBrandPanel.jsx`, `LoginFormCard.jsx`, `LoginMobileHeader.jsx`, `LoginForgotModal.jsx`).
  - **Launcher (Dashboard Utama Ekosistem):** `apps/core-portal/src/pages/Launcher.jsx` dan subkomponen di `apps/core-portal/src/pages/launcher/components/` (`LauncherTopBar.jsx`, `LauncherGreeting.jsx`, `UnitSwitcher.jsx`, `AvatarMenu.jsx`, `ModuleTile.jsx`, `LauncherRecentShelf.jsx`, `LauncherEmptyAccess.jsx`, `LauncherSkeleton.jsx`, `LauncherFooter.jsx`).
  - **Komponen Brand & Modal Bersama:** `apps/core-portal/src/shared/components/brand/` (`BrandLogo.jsx`, `LatticePattern.jsx`) dan `apps/core-portal/src/shared/components/BottomSheet.jsx`.
  - **Prosedur Menambah Modul Baru ke Portal:**
    1. Daftarkan metadata modul di registry `apps/core-portal/src/pages/launcher/launcherModules.js` (`LAUNCHER_MODULES`).
    2. Daftarkan pemetaan izin role di `apps/core-portal/src/pages/launcher/accessControl.js` (`MODULE_ACCESS_MAP`).
    3. Daftarkan rute lazy-loaded di `apps/core-portal/src/router.jsx`.
- **STATUS:** `Sesuai dokumen`.

---

## 6. Panduan Desain UI
Untuk SETIAP tugas yang menyentuh tampilan/UI (membuat halaman baru, komponen baru, atau mengubah styling halaman yang sudah ada) di modul frontend mana pun, baca dan patuhi `apps/core-portal/PANDUAN-DESAIN-UI.md` sebelum menulis kode. File itu adalah rujukan resmi untuk token warna, tipografi, spacing/radius, komponen bersama wajib (StatRibbonCard, StatusPill, FlatAlertBanner, shared/utils/formatters.js), dan konvensi tabel yang berlaku lintas seluruh modul frontend aplikasi.

---

<!-- updated: 2026-10-08 - Dokumentasi Arsitektur Redesign Login & Launcher Aldepos ILMS serta Registrasi Modul launcherModules.js -->


