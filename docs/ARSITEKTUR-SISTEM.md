Status: perlu-revisi
Diperbarui: 2026-09-29

# Arsitektur Sistem Manajemen Sekolah Terintegrasi

> **Sumber kebenaran tunggal** untuk gambaran sistem secara keseluruhan. File ini **tidak
> disalin ke tiap proyek aplikasi** — tiap `rancangan-<nama-modul>.md` per aplikasi (mis.
> `rancangan-coreservice.md`, `rancangan-akademik.md`, disimpan flat di root proyek monorepo yang
> sama) cukup merujuk ke sini.
> Lampirkan file ini secara utuh hanya untuk: (a) aplikasi yang datanya dikonsumsi banyak
> aplikasi lain (Core Service, Akademik, Keuangan, Kepegawaian), atau (b) sesi diskusi
> keputusan arsitektur lintas aplikasi. Untuk sesi coding rutin di aplikasi "daun" (Dapur,
> Sarpras, dst), cukup `rancangan-<nama-modul>.md` aplikasi itu + kontrak API dari aplikasi yang
> dikonsumsi.
>
> Update bagian **Status & Log Perubahan** di paling bawah setiap ada perubahan cakupan/arsitektur.

## 1. Ringkasan Sistem

Sistem manajemen sekolah untuk sebuah **Yayasan yang bisa membawahi lebih dari satu Satuan
Pendidikan (sekolah/unit)** — arsitekturnya multi-tenant di level satuan pendidikan, bukan
aplikasi tunggal untuk satu sekolah. Terdiri dari **14 modul aplikasi** (Core Service, Website
Utama, Akademik, Kepegawaian, Keuangan, Portal Orangtua, Sarpras, Kantin, Dapur, Perpustakaan,
CBE, Komunikasi & Notifikasi, Tahfidz & Al-Quran, Pengelolaan) yang **secara data & kode tetap
terpisah per modul**, tapi **secara deployment digabung jadi 3 domain** (lihat Bagian 1.1) supaya
tidak ada 14 subdomain, 14 slot hosting, dan 14 repo yang harus dikelola terpisah.

### 1.1 Arsitektur 3 Domain (Revisi 2026-08-16)

Ini mengganti model lama "1 subdomain + 1 deployment per aplikasi" (lihat catatan di Bagian
4.6/4.7). Sekarang hanya ada **3 deployment**:

| Domain | Isi | Framework | Diakses oleh |
|---|---|---|---|
| `aldeposibs.com` | **Website Utama** — situs publik, PPDB online, CMS berita/galeri | Next.js | Pengunjung umum, calon siswa/ortu (tanpa login) |
| `core.aldeposibs.com` | **Portal Aplikasi Internal** — halaman awal berupa daftar kartu/icon untuk 13 modul aplikasi internal (Core Service, Akademik, Kepegawaian, Keuangan, Portal Orangtua, Sarpras, Kantin, Dapur, Perpustakaan, CBE, Komunikasi & Notifikasi, Tahfidz & Al-Quran, Pengelolaan). Klik satu kartu → masuk ke halaman login/dashboard modul itu. | React (Vite) SPA, satu build, modul dimuat per-route (code splitting) supaya tiap modul tetap terasa seperti aplikasi sendiri | Staf, guru, ortu, siswa (butuh login) |
| `api.aldeposibs.com` | **Backend tunggal** — satu proses Express.js (modular monolith) yang menaungi seluruh 14 domain fungsi lewat prefix route per modul (`/api/v1/akademik/...`, `/api/v1/keuangan/...`, dst), termasuk endpoint publik untuk Website Utama (submit PPDB, ambil berita) | Express.js | Dipanggil oleh `core.aldeposibs.com` (setelah login) dan `aldeposibs.com` (endpoint publik) |

Yang **tidak berubah** meski deployment digabung:
- **Isolasi data per modul tetap berlaku** (Bagian 3 poin 1) — tiap modul tetap punya database
  sendiri di MariaDB, tidak ada JOIN/FK fisik lintas database. Yang berubah cuma satu proses
  backend yang membuka banyak koneksi (satu connection pool per modul), bukan lagi 14 proses
  backend terpisah.
- **Akses data lintas modul tetap lewat lapisan service milik modul pemilik**, bukan query
  langsung ke tabel modul lain — bedanya sekarang bisa berupa pemanggilan fungsi/service internal
  (in-process) karena satu proses, tidak wajib lewat HTTP lagi seperti dulu. Ini murni optimisasi;
  kontrak/skema tetap harus dijaga seolah-olah masih dipanggil lewat API, supaya suatu saat modul
  tertentu gampang dipecah lagi jadi service terpisah kalau perlu scale independen.
- **Autentikasi tetap terpusat di modul Core Service** (JWT). Karena `core.aldeposibs.com`
  sekarang satu SPA untuk semua modul internal, SSO antar modul jadi otomatis (token tersimpan
  sekali di SPA, dipakai semua modul) — tidak perlu lagi redirect token antar subdomain seperti
  model lama.

## 2. Daftar 14 Modul Aplikasi & Fungsinya

> Sejak revisi 2026-08-16, "aplikasi" di tabel ini adalah **modul** — satuan data & kode yang
> terpisah, tapi dideploy bersama dalam 3 domain di Bagian 1.1 (Website Utama → `aldeposibs.com`;
> 13 modul lainnya → `core.aldeposibs.com` sebagai frontend dan `api.aldeposibs.com` sebagai
> backend bersama).

| Aplikasi | Jumlah Fitur | Fungsi Utama |
|---|---|---|
| Core Service | 13 | Autentikasi/SSO, akun & role, data Yayasan/Satuan Pendidikan, webhook & API gateway |
| Website Utama | 22 | Situs publik, PPDB online, CMS berita/galeri, konsultasi |
| Akademik | 36 | Data induk siswa/ortu, kurikulum, penilaian, rapor, presensi, kesiswaan |
| Kepegawaian | 16 | Data induk pegawai, presensi & cuti pegawai, payroll, kinerja dasar, organisasi |
| Keuangan | 35 | Tagihan, pembayaran, RAPBS/anggaran, pembukuan (COA, jurnal), payroll disbursement, laporan keuangan |
| Portal Orangtua | 14 | Dashboard anak: nilai, absensi, tagihan, saldo kantin, komunikasi dengan guru |
| Sarpras | 9 | Inventaris aset, peminjaman fasilitas, maintenance, pengadaan |
| Kantin | 9 | Menu, transaksi kasir, saldo cashless siswa, laporan penjualan |
| Dapur | 8 | Perencanaan menu & porsi makan, stok bahan baku, laporan konsumsi |
| Perpustakaan | 14 | Katalog buku & bahan pustaka non-buku, sirkulasi (pinjam/kembali/denda/reservasi/hilang-rusak), OPAC, notifikasi jatuh tempo, laporan & statistik pemanfaatan, endpoint parent-facing *(9 fitur asli PRD + 5 fitur tambahan disetujui developer 2026-08-18, lihat `rancangan-perpustakaan.md` §4)* |
| Ujian & Bank Soal (CBE) | 6 | Bank soal, ujian daring terjadwal, analisis hasil ujian |
| Komunikasi & Notifikasi | 6 | Broadcast SMS/WA/Email, notifikasi otomatis presensi/nilai/tagihan, direktori kontak |
| Tahfidz & Al-Quran | 6 | Target & capaian hafalan, ujian/munaqasyah, kitab kuning |
| Pengelolaan | 13 | RIPS/RKS/Program Kerja, KPI & mutu, evaluasi kinerja, supervisi, manajemen proyek, dashboard agregat |

**Total: 207 fitur** *(202 fitur asli PRD + 5 fitur tambahan modul Perpustakaan, lihat catatan di
baris Perpustakaan pada tabel di atas dan Bagian 9 log perubahan)*. Rincian lengkap tiap fitur
(kolom/atribut, aksi, aktor, prioritas MoSCoW, sumber & konsumen data) ada di
`PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` sheet "Daftar Fitur" — file ini hanya
rekapnya. **Catatan:** 5 fitur tambahan Perpustakaan (172–176) belum ditambahkan ke sheet
`.xlsx` tersebut secara fisik — developer perlu menambahkannya secara manual, detail lengkap ada
di `rancangan-perpustakaan.md` §4.

## 3. Prinsip Arsitektur Global (Berlaku untuk SEMUA Aplikasi, Tanpa Kecuali)

1. **Satu database per aplikasi/modul.** Tidak ada JOIN atau FOREIGN KEY fisik lintas database.
   Data lintas modul direferensikan lewat ID saja, divalidasi/diambil lewat pemanggilan
   service-layer modul pemiliknya (atau cache lokal terkontrol untuk data yang sering dibaca).
   Sejak revisi 2026-08-16 (Bagian 1.1), pemanggilan ini terjadi **in-process** (satu backend
   `api.aldeposibs.com`), bukan lagi HTTP antar server — tapi prinsip "tidak boleh query langsung
   ke tabel modul lain, harus lewat service milik modul itu" tetap wajib.
2. **Multi-satuan-pendidikan.** Satu Yayasan bisa punya beberapa Satuan Pendidikan. **Setiap
   tabel di setiap aplikasi yang datanya spesifik per sekolah wajib punya kolom
   `satuan_pendidikan_id`** yang mengacu ke Core Service, karena tampilan & operasi di semua
   aplikasi difilter oleh satuan pendidikan aktif yang dipilih pengguna di header. Ini prinsip
   yang paling sering terlewat kalau tidak ditulis eksplisit di tiap proyek — jangan diasumsikan
   "nanti juga ketahuan sendiri".
3. **Autentikasi terpusat di Core Service lewat JWT** (access + refresh token). Aplikasi satelit
   verifikasi signature token secara lokal, tidak perlu call ke Core tiap request.
4. **Perubahan data penting diberitahu lewat webhook**, bukan polling. Core Service jadi
   publisher utama (perubahan akun, satuan pendidikan baru), tapi aplikasi lain juga bisa jadi
   publisher untuk datanya sendiri (mis. Akademik publish saat siswa pindah kelas).
5. **Data induk hanya hidup di satu aplikasi pemilik** — tidak boleh disalin/di-input ulang secara
   manual di aplikasi lain:
   - Siswa & orangtua → **Akademik**
   - Pegawai → **Kepegawaian**
   - Akun login, Yayasan, Satuan Pendidikan → **Core Service**
   - Anggaran/RAPBS, COA, pembukuan → **Keuangan**
6. **Akun pengguna dibuat otomatis, bukan input manual di Core.** Saat siswa/ortu baru diinput di
   Akademik atau pegawai baru diinput di Kepegawaian, aplikasi itu memberi tahu Core lewat
   webhook/API untuk membuatkan akunnya. Core hanya mengelola sisi akun (aktif/nonaktif, reset
   password, role) setelah akun itu ada.

## 4. Konvensi Teknis Global

Semua aplikasi di sistem ini mengikuti konvensi berikut supaya konsisten dan mudah
diintegrasikan (Core Service jadi rujukan pertama karena dibangun duluan — kalau ada
ketidaksesuaian antara bagian ini dan implementasi Core Service yang sudah jalan, bagian ini
yang harus diperbarui, bukan Core Service diam-diam menyimpang).

### 4.1 Backend & Database

| Komponen | Pilihan | Catatan |
|---|---|---|
| Backend framework | Express.js — **satu proses** (modular monolith) di `api.aldeposibs.com` | Bukan lagi 14 proses terpisah (lihat Bagian 1.1). Tiap modul jadi folder route/service sendiri (`src/modules/<nama-modul>/`) di dalam `apps/api-backend/` yang sama di monorepo, bukan folder/proses berbeda |
| Query builder / migration | Knex.js | Satu instance Knex (connection pool) per database modul, semua dikonfigurasi dalam satu proses `api-backend` |
| Database engine | **MariaDB 10.5**, storage engine InnoDB, charset `utf8mb4` | Wajib sama persis di semua database modul supaya perilaku (JSON column, window function, dsb) konsisten dan mudah di-*restore* antar server |
| Auth library | `jsonwebtoken` (JWT) + `bcryptjs` (hash password, `saltRounds` minimal 10) | Password mentah tidak pernah disimpan/di-log. Karena Core Service kini modul dalam proses yang sama, verifikasi JWT antar modul bisa langsung import fungsi/secret Core, tidak perlu request jaringan |
| Validasi request | Disarankan `zod` atau `joi` di tiap modul | *(asumsi awal — belum ada keputusan final, boleh beda antar modul selama konsisten di dalam satu modul)* |
| Satu database per aplikasi/modul | Wajib (lihat Bagian 3 poin 1) — **tapi satu backend proses** yang connect ke semuanya | Nama database ikut konvensi hosting (lihat 4.4), mis. `u622997391_dbcore` untuk modul Core Service |

### 4.2 Frontend

Sistem ini punya dua kategori aplikasi dengan kebutuhan frontend berbeda — **jangan pukul rata
satu framework untuk semua**, karena kebutuhan SEO/indexing hanya relevan untuk yang publik. Sejak
revisi 2026-08-16 (Bagian 1.1), masing-masing kategori hanya **satu deployment**, bukan satu per
modul:

| Kategori Aplikasi | Domain | Framework | Alasan |
|---|---|---|---|
| **Portal Aplikasi Internal** — satu SPA berisi 13 modul: Core Service, Akademik, Kepegawaian, Keuangan, Portal Orangtua, Sarpras, Kantin, Dapur, Perpustakaan, CBE, Komunikasi & Notifikasi, Tahfidz, Pengelolaan | `core.aldeposibs.com` | **React (Vite), SPA**, tiap modul di-*lazy load* per route (`/akademik/*`, `/keuangan/*`, dst) dari folder `apps/core-portal/` di monorepo | Route awal (`/`) adalah halaman kartu/icon daftar 13 modul dan **tampil publik, tidak butuh login** untuk sekadar melihat kartunya. Klik satu kartu → masuk ke route login **milik modul itu sendiri** (`/akademik/login`, `/keuangan/login`, dst — bukan satu login bersama), supaya tetap terasa seperti aplikasi terpisah walau satu build. Kalau sesi (JWT) sudah ada dari modul lain, klik kartu langsung ke dashboard tanpa login ulang (SSO) |
| **Website Utama** (situs sekolah, PPDB online, CMS berita/galeri) | `aldeposibs.com` | **Next.js** | Butuh SSR/SSG untuk SEO (halaman berita/profil sekolah harus terindeks Google) dan performa awal-muat yang baik untuk pengunjung umum. Tetap deployment terpisah dari portal internal karena kebutuhan SEO ini |

Konvensi tambahan frontend:
- Styling: **Tailwind CSS** di semua aplikasi (baik React Vite maupun Next.js) supaya konsisten
  secara visual dan mudah reuse komponen antar aplikasi.
- State management: React Context untuk kebutuhan sederhana (info user login, satuan pendidikan
  aktif); untuk aplikasi dengan state lebih kompleks boleh tambah Zustand — *(asumsi awal)*.
- HTTP client: `axios`, dengan interceptor standar untuk menyisipkan header
  `Authorization: Bearer <jwt>` dan auto-refresh token saat menerima 401 (pola ini pertama
  diimplementasikan di Core Service, aplikasi lain mengikuti).
- Header shell portal (`core.aldeposibs.com`) wajib menampilkan dropdown Satuan Pendidikan aktif
  (kecuali kalau akun cuma terkait satu satuan pendidikan, sesuai Bagian 3 poin 2) dan info user
  login — dipasang sekali di level shell, otomatis berlaku untuk semua 13 modul karena satu SPA.
- Karena 13 modul internal kini satu folder (`apps/core-portal/`) di monorepo, komponen UI di-*share* langsung lewat
  `src/components/` bersama tanpa perlu package terpisah. Tiap modul tetap punya folder sendiri
  (`src/apps/<nama-modul>/`) supaya styling/tema boleh sedikit beda per modul dan tetap terasa
  seperti aplikasi terpisah, sesuai gambaran di Bagian 1.1.

### 4.3 Format & Penamaan API

| Konvensi | Aturan |
|---|---|
| Format response API | `{ success, data, message, errors }` |
| Penamaan endpoint | `/api/v1/<resource>` |
| Auth header | `Authorization: Bearer <jwt>` |
| Payload webhook | `{ event_type, timestamp, data, satuan_pendidikan_id }` |

### 4.4 Penamaan Tabel & Kolom Database — **Sudah Final**

~~Sebelumnya keputusan terbuka~~ — **sudah diputuskan** saat penyusunan ERD Core Service:
**Bahasa Inggris, `snake_case`**, untuk nama tabel maupun kolom, di seluruh 14 aplikasi. Istilah
asli Indonesia dari PRD (`siswa`, `rombel`, dst) dipakai sebagai referensi arti saja, bukan nama
kolom/tabel aktual. Contoh penerapan ada di `erd-coreservice.md` (17 tabel, semua Inggris
`snake_case`) — jadikan itu acuan pola untuk ERD 13 aplikasi lainnya.

Standar PK & timestamp yang ikut berlaku di semua tabel semua aplikasi:
- Primary key: `id BIGINT UNSIGNED AUTO_INCREMENT`
- Semua tabel (kecuali tabel log *append-only*) punya `created_at` & `updated_at TIMESTAMP`
- Tabel log (audit/activity/history) tidak perlu `updated_at` — bersifat *append-only*

### 4.5 Environment Variable

Sejak revisi 2026-08-16, prefix per modul **tetap dipakai** (supaya jelas variabel database mana
milik modul mana), tapi semuanya kini hidup dalam **satu file `.env`** milik folder `apps/api-backend/`
(bukan 14 file `.env` di 14 repo terpisah), karena satu proses backend yang membuka semua koneksi:

| Modul | Prefix |
|---|---|
| Core Service | `CORE_` |
| Akademik | `AKADEMIK_` |
| Kepegawaian | `KEPEGAWAIAN_` |
| Keuangan | `KEUANGAN_` |
| *(dan seterusnya — satu prefix per modul, pakai nama modul dalam Bahasa Indonesia disingkat/disederhanakan seperlunya)* | |

Variabel minimal yang wajib ada per modul di `.env` `api-backend` (nama persis mengikuti pola
Core Service): `<PREFIX>_DB_HOST`, `<PREFIX>_DB_USER`, `<PREFIX>_DB_PASSWORD`, `<PREFIX>_DB_NAME`,
`<PREFIX>_PORT`. Untuk JWT (hanya modul Core Service yang menerbitkan/menandatangani):
`CORE_JWT_SECRET`, `CORE_JWT_REFRESH_SECRET` — dipakai langsung (import) oleh modul lain dalam
proses yang sama untuk verifikasi, tidak perlu lagi disalin ke tiap aplikasi seperti model lama.
Folder `apps/core-portal/` dan `apps/website-utama/` masing-masing punya `.env` sendiri (isinya jauh lebih
sedikit, umumnya cuma `VITE_API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` yang mengarah ke
`api.aldeposibs.com`). File `.env` **tidak pernah** di-commit ke GitHub — wajib masuk
`.gitignore` tiap repo.

### 4.6 Infrastruktur & Deployment — Hostinger (Revisi 2026-08-16)

> **Menggantikan model lama** "1 subdomain + 1 slot Node.js App per aplikasi (14 total)".
> Sekarang cukup **3 slot Node.js App**, konsisten dengan Bagian 1.1.

| Komponen | Pilihan | Catatan |
|---|---|---|
| Hosting | Hostinger — **3 Node.js App**: `website-utama`, `core-portal`, `api-backend` | Tiap deployment punya slot Node.js App sendiri di hPanel dan environment variable sendiri. `core-portal` di-*build* sebagai static SPA (hasil `vite build`) dan bisa disajikan lewat Node.js App atau static hosting, tergantung dukungan Hostinger |
| Database | MariaDB 10.5 terkelola Hostinger — **tetap satu database per modul** (11 database: `core`, `kepegawaian`, `akademik`, `keuangan`, `alquran`, `kantin`, `sarpras`, `dapur`, `perpustakaan`, `manajemen`, `website-utama`), semuanya diakses dari satu Node.js App `api-backend` | Penamaan database mengikuti pola Hostinger: `<kode_hosting>_db<nama_modul_singkat>`, mis. `u622997391_dbcore` untuk modul Core Service; user database: `<kode_hosting>_<nama_modul_singkat>` |
| Domain | **3 domain/subdomain**, bukan 1 per aplikasi lagi | `aldeposibs.com` → Website Utama, `core.aldeposibs.com` → Portal Aplikasi Internal, `api.aldeposibs.com` → backend tunggal. Modul internal (Akademik, Keuangan, dst) **tidak lagi punya subdomain sendiri** — mereka jadi route di dalam `core.aldeposibs.com` (frontend) dan prefix path di dalam `api.aldeposibs.com` (backend) |
| Process manager | PM2 | Satu proses PM2 per deployment (3 proses total): `website-utama`, `core-portal` *(kalau disajikan via Node.js, bukan static hosting murni)*, `api-backend` |
| Remote DB access | Aktifkan **Remote MySQL** di hPanel per database kalau perlu koneksi dari luar server (mis. testing lokal ke database production) | Batasi ke IP tertentu, jangan buka ke semua IP. Karena `api-backend` satu proses yang connect ke 11 database, pastikan kredensial tiap database tetap terpisah (jangan pakai satu user MariaDB untuk semua database) supaya isolasi akses tetap terjaga |

### 4.7 Version Control & CI/CD — GitHub (Revisi 2026-08-16, diperbarui)

> **Satu repo (monorepo)** untuk seluruh sistem — bukan 3 repo terpisah seperti revisi
> sebelumnya, dan bukan 14 repo seperti model paling lama. Ketiga deployment di Bagian 1.1
> (`website-utama`, `core-portal`, `api-backend`) jadi tiga folder `apps/` di repo yang sama;
> tiap modul internal jadi subfolder di dalam `apps/core-portal/` dan `apps/api-backend/`.

| Komponen | Pilihan | Catatan |
|---|---|---|
| Struktur repo | **1 repo** (mis. `aldepos-sistem`) dengan `apps/website-utama/`, `apps/core-portal/`, `apps/api-backend/` | Di dalam `apps/core-portal/`, tiap modul = folder `src/apps/<nama-modul>/`. Di dalam `apps/api-backend/`, tiap modul = folder `src/modules/<nama-modul>/`. `package.json` di root pakai npm workspaces supaya build/run tiap `apps/*` bisa dari root atau dari dalam foldernya sendiri |
| Kerja lokal dulu | **Wajib** — kode dikembangkan & diuji jalan di lokal (`npm run dev` per folder `apps/`) sampai benar-benar berfungsi, baru dipertimbangkan untuk di-push. Commit lokal boleh dibuat sesering perlu (`git add`/`git commit`), tapi `git push` ke `origin` ditunda sampai developer memberi instruksi eksplisit | Ini berlaku terutama saat merestrukturisasi modul yang sudah pernah live (lihat contoh alur migrasi Core Service di `panduan-pengembangan-core-service.md`), supaya production yang sedang jalan tidak keburu rusak oleh kode yang belum teruji |
| Branch utama | `main` | Deploy otomatis terpicu dari push/merge ke `main`, setelah developer menyetujui push |
| Alur kerja | Branch fitur (`feat/<modul>-...`, `fix/<modul>-...`) → Pull Request → review → merge ke `main` | Prefix nama modul di nama branch membantu menandai PR itu menyentuh modul yang mana, karena satu repo dipakai banyak modul sekaligus |
| CI/CD | GitHub Actions — SSH ke Hostinger saat push ke `main`, tiap workflow deploy **hanya folder `apps/<nama-deployment>` yang berubah** (pakai `paths:` filter di workflow supaya push ke satu `apps/` tidak memicu deploy ulang ketiganya), `git pull`, install dependency, build, `pm2 restart <nama-deployment>` | Kredensial SSH (host, username, private key) disimpan sebagai GitHub Secrets di repo yang sama, dipakai oleh ketiga workflow (`deploy-website-utama.yml`, `deploy-core-portal.yml`, `deploy-api-backend.yml`) |

## 5. Matriks Ketergantungan Antar Aplikasi

Arah panah = "aplikasi/modul kiri BUTUH data dari aplikasi/modul kanan". Diringkas dari kolom
"Dependency Aplikasi Lain" di 202 baris fitur. Matriks ini **tetap berlaku sama persis** setelah
revisi 2026-08-16 — yang berubah cuma *cara* ketergantungan ini dipenuhi: untuk 13 modul internal,
sekarang lewat pemanggilan service-layer in-process di dalam `api-backend` (bukan HTTP antar
server); untuk Website Utama, tetap lewat HTTP biasa ke `api.aldeposibs.com` karena Website Utama
adalah deployment terpisah (lihat Bagian 1.1).

| Aplikasi | Bergantung Pada |
|---|---|
| Core Service | Akademik, Kepegawaian *(hanya untuk provisioning akun — lihat catatan siklus di Bagian 6)* |
| Website Utama | Core Service, Akademik, Kepegawaian, Sarpras, Keuangan |
| Akademik | Core Service, Kepegawaian, Website Utama *(untuk data PPDB)* |
| Kepegawaian | Core Service |
| Keuangan | Core Service, Akademik, Kepegawaian, Website Utama, Kantin |
| Portal Orangtua | Core Service, Akademik, Keuangan, Kantin, Tahfidz & Al-Quran |
| Sarpras | Core Service, Kepegawaian, Keuangan |
| Kantin | Core Service, Portal Orangtua, Keuangan |
| Dapur | Core Service, Keuangan *(opsional)* |
| Perpustakaan | Akademik, Kepegawaian |
| Ujian & Bank Soal (CBE) | Akademik |
| Komunikasi & Notifikasi | Core Service, Akademik, Kepegawaian, Keuangan |
| Tahfidz & Al-Quran | Akademik, Kepegawaian |
| Pengelolaan | Core Service, Akademik, Keuangan, Kepegawaian, Sarpras, *(+ seluruh aplikasi untuk dashboard agregat)* |

## 6. Catatan Ketergantungan Dua Arah (Bukan Bug, Tapi Perlu Disadari)

Beberapa pasangan aplikasi/modul saling bergantung — ini wajar untuk alur kerja tertentu, tapi
**harus dibangun dengan mock/stub dulu di sisi yang lebih dulu jadi**, supaya tidak saling
menunggu. Untuk modul-modul yang sekarang satu proses (`api-backend`), mock ini berupa fungsi
service palsu yang dipanggil sementara sebelum modul aslinya jadi — bukan lagi mock endpoint HTTP
seperti model lama, kecuali untuk Website Utama yang tetap panggil lewat HTTP sungguhan:

- **Website Utama ↔ Akademik**: Website kirim data pendaftar PPDB ke Akademik untuk verifikasi;
  Akademik kirim balik status verifikasi ke Website untuk halaman tracking pendaftar. Bangun
  Website Utama dulu dengan endpoint Akademik di-mock, sambungkan sungguhan setelah Akademik
  fase verifikasi PPDB selesai.
- **Kantin ↔ Portal Orangtua**: Kantin expose saldo & riwayat jajan ke Portal Ortu; Portal Ortu
  kirim permintaan top-up saldo ke Kantin. Bangun Kantin dulu (transaksi kasir jalan tanpa Portal
  Ortu), baru sambungkan top-up online setelah Portal Ortu ada.
- **Core Service ↔ Akademik/Kepegawaian**: Core menyediakan auth untuk Akademik/Kepegawaian,
  tapi juga butuh Akademik/Kepegawaian untuk memicu pembuatan akun. Core Service tetap dibangun
  duluan (Fase 0) dengan endpoint pembuatan akun yang bisa dipanggil manual/lewat API dulu;
  otomatisasi webhook dari Akademik/Kepegawaian disambungkan begitu kedua aplikasi itu ada.

## 7. Urutan Pengembangan yang Disarankan

```
Fase 0  Core Service                                    (fondasi — tidak bergantung siapapun signifikan)
Fase 1  Kepegawaian                                      (hanya butuh Core; banyak app lain butuh data pegawai)
Fase 2  Akademik                                          (butuh Core + Kepegawaian)
Fase 3  Website Utama                                     (butuh Core + Akademik + Kepegawaian; PPDB butuh Akademik)
Fase 4  Keuangan                                           (butuh Core + Akademik + Kepegawaian)
Fase 5  Kantin, lalu Portal Orangtua                        (saling terkait, Kantin dulu baru integrasi penuh)
Fase 6  Sarpras, Dapur, Perpustakaan, CBE,                   (dependency ringan, bisa paralel)
        Tahfidz & Al-Quran, Komunikasi & Notifikasi
Fase 7  Pengelolaan                                           (agregator — butuh data dari hampir semua aplikasi)
```

> Sejak revisi 2026-08-16, urutan fase di atas tidak berubah — tapi tiap modul dikerjakan sebagai
> **folder baru di `apps/core-portal/` (frontend) dan `apps/api-backend/` (backend)** di monorepo
> yang sama, bukan repo baru. Modul dikerjakan & diuji **lokal dulu** sebelum push (lihat
> `panduan-pengembangan-core-service.md` Bagian 0), baru digabung ke `main` (ikut tampil di
> halaman kartu portal & aktif di `api.aldeposibs.com`) begitu modul itu siap rilis dan disetujui
> untuk di-push.

> File `Controlling_Sistem_Manajemen_Sekolah.xlsx` sheet "Tracker Kontrol" masih berisi 10
> aplikasi versi lama — **perlu diperbarui** untuk menambah Perpustakaan, Ujian & Bank Soal
> (CBE), Komunikasi & Notifikasi, dan Tahfidz & Al-Quran sesuai urutan fase di atas. Beri tahu
> saya kalau ingin file itu diperbarui.

## 8. Dokumen Lain yang Terkait

- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar 202 fitur lengkap per aplikasi
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — catatan teknis yang **sudah jadi**,
  diisi bertahap seiring pengembangan tiap aplikasi
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan & tracker progres (perlu update,
  lihat catatan di Bagian 7)
- `rancangan-<nama-modul>.md` per modul (sejak revisi 2026-08-16: disimpan **flat di root**
  monorepo, mis. `rancangan-coreservice.md`, `rancangan-akademik.md` — bukan di subfolder
  `apps/`, dan bukan lagi root repo terpisah) — scope spesifik modul itu, merujuk balik ke file
  ini untuk gambaran sistem penuh
- `erd-<nama-modul>.md` per modul — ERD detail, contoh penerapan konvensi Bagian 4.4 ada di
  `erd-coreservice.md`
- `api-contract-<nama-modul>.md` per modul — kontrak endpoint REST API modul itu
- `roles-<nama-modul>.md` per modul — matriks role & permission modul itu
- `panduan-pengembangan-<nama-modul>.md` per modul — prompt Antigravity & query siap pakai per
  tahap pengembangan, contoh polanya ada di `panduan-pengembangan-core-service.md`

## 9. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-18 | **Ruang lingkup Perpustakaan diperluas:** dari 9 fitur PRD asli (163–171) jadi **14 fitur** — ditambah 5 fitur hasil penyempurnaan yang disetujui developer (172: bahan pustaka non-buku, 173: buku hilang/rusak, 174: riwayat peminjaman anggota, 175: pengingat jatuh tempo & denda, 176: statistik pemanfaatan). Total fitur sistem berubah dari 202 → **207**. Prioritas fitur #169 (OPAC) dinaikkan dari Should → **Must**. Baris Perpustakaan di Bagian 2 dan kalimat "Total 202 fitur" di Bagian 2 diperbarui. Detail lengkap 14 fitur ada di `rancangan-perpustakaan.md` §4 (dokumen baru, dibuat sesi ini bersama `erd-perpustakaan.md`, `api-contract-perpustakaan.md`, `roles-perpustakaan.md`, `panduan-pengembangan-perpustakaan.md`). Sheet `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` **belum** diperbarui fisik — masih perlu dilakukan manual oleh developer. |
| 2026-08-16 | **Revisi kedua:** repo digabung jadi **1 monorepo** (bukan 3 repo terpisah seperti revisi sebelumnya) — `apps/website-utama/`, `apps/core-portal/`, `apps/api-backend/` dalam satu repo GitHub. Koreksi Bagian 1.1: halaman kartu (`Launcher`) di `core.aldeposibs.com` tampil **publik tanpa login**; login tetap per aplikasi (klik kartu → halaman login milik aplikasi itu sendiri), bukan satu login bersama. Bagian 4.7 & 4.6 diperbarui: alur kerja wajib diuji lokal dulu sebelum `git push`. Bagian 3 poin 1, 4.1, 4.2, 4.5, 8 disesuaikan referensi repo→folder. |
| 2026-08-16 | **Revisi arsitektur deployment (Bagian 1.1):** dari model "14 aplikasi terpisah = 14 subdomain/repo/slot hosting" jadi **3 domain**: `aldeposibs.com` (Website Utama, Next.js, publik), `core.aldeposibs.com` (Portal Aplikasi Internal — 1 React SPA berisi launcher kartu + 13 modul internal, login per modul setelah klik kartu), `api.aldeposibs.com` (1 backend Express modular monolith untuk semua 14 domain fungsi, terhubung MariaDB). Isolasi data per modul (1 database per modul) tetap dipertahankan; yang digabung cuma proses backend, deployment frontend internal, dan repo (14 → 3: `website-utama`, `core-portal`, `api-backend`). Bagian 3 poin 1, 4.1, 4.2, 4.5, 4.6, 4.7, 5, 6, 7, 8 diperbarui menyesuaikan. |
| 2026-08-16 | Bagian 4 (Konvensi Teknis Global) diperluas jadi 7 subbagian: Backend & Database, Frontend (React Vite untuk aplikasi internal, Next.js khusus Website Utama untuk kebutuhan SEO), Format & Penamaan API, Penamaan Tabel/Kolom (final: Inggris `snake_case`, mengacu `erd-coreservice.md`), Environment Variable, Infrastruktur & Deployment Hostinger (pola subdomain per aplikasi, PM2, Remote MySQL), Version Control & CI/CD GitHub (satu repo per aplikasi, branch `main`, GitHub Actions + Secrets). |
| 2026-08-16 | Dokumen dibuat dari 202 baris fitur (14 aplikasi). Prinsip arsitektur global & konvensi teknis dipindah dari `rancangan.md` Core Service ke sini. |

*(Tambahkan baris baru di atas setiap ada perubahan cakupan/arsitektur — jangan hapus riwayat lama.)*