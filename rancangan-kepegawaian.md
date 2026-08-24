# rancangan-kepegawaian.md

> **WAJIB DIBACA setiap mulai sesi baru terkait Kepegawaian.** File ini adalah sumber kebenaran
> untuk ruang lingkup dan keputusan arsitektur modul ini. Kalau ada instruksi di suatu sesi yang
> tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum melanjutkan** —
> jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian **"Status & Log
> Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> Ditulis mengikuti pola `rancangan-coreservice.md` (Core Service sudah selesai dibangun duluan,
> jadi acuan format untuk 13 modul lain). Sumber 16 fitur: baris No. 72–87 pada
> `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` sheet "Daftar Fitur" (diberikan penuh oleh
> developer 2026-08-17) — bukan lagi draf tebakan dari ringkasan `ARSITEKTUR-SISTEM.md` Bagian 2.

## 1. Apa Ini & Posisinya dalam Sistem Besar

Kepegawaian adalah **pemilik data induk pegawai** (guru & tenaga kependidikan) dalam Sistem
Manajemen Sekolah Terintegrasi (14 modul — lihat `ARSITEKTUR-SISTEM.md` Bagian 1–2). Sesuai
prinsip arsitektur global poin 5, **data pegawai hanya boleh hidup di sini** — modul lain
(Akademik, Sarpras, Perpustakaan, Pengelolaan, dll.) mengonsumsi data ini lewat service-layer
Kepegawaian, tidak boleh menyalin/menginput ulang secara manual.

Perannya:
- Pusat data induk pegawai: identitas, riwayat pendidikan/diklat/sertifikasi, keluarga, riwayat
  jabatan & golongan, rencana pensiun.
- Pusat struktur organisasi & jabatan sekolah (dipakai juga oleh Sarpras untuk alur approval
  berjenjang dan Pengelolaan untuk dashboard KPI).
- Pencatat kehadiran, cuti/izin, dan lembur pegawai.
- Penghitung payroll (gaji bersih siap cair) — **bukan** pencairannya, itu domain Keuangan
  (lihat Bagian 6).
- Pencatat penilaian kinerja dasar (harian/bulanan) — evaluasi kinerja *mendalam* tetap domain
  Pengelolaan (lihat Bagian 6).
- Penyedia endpoint data pegawai untuk seluruh modul yang butuh (Akademik, Sarpras,
  Perpustakaan, Pengelolaan, Komunikasi & Notifikasi, Tahfidz & Al-Quran).
- Titik awal rekrutmen & onboarding sampai pegawai baru resmi aktif dan akunnya diprovisioning
  di Core Service.

Modul ini adalah **Fase 1** pada urutan pengembangan (`ARSITEKTUR-SISTEM.md` Bagian 7) — dibangun
segera setelah Core Service, karena banyak modul lain (Akademik, Sarpras, Perpustakaan,
Keuangan, Pengelolaan, Komunikasi & Notifikasi, Tahfidz & Al-Quran) butuh data pegawai lebih
awal.

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (DB per modul, multi-satuan-pendidikan, JWT SSO terpusat di Core,
webhook, data induk hanya di satu modul pemilik) ada di `ARSITEKTUR-SISTEM.md` Bagian 3 — **baca
itu dulu**, tidak diulang di sini.

Yang spesifik untuk Kepegawaian:
- Kepegawaian **tidak menerbitkan JWT sendiri** — autentikasi tetap lewat Core Service. Halaman
  `Login.jsx` milik Kepegawaian tetap ada (pola per-aplikasi, lihat
  `panduan-pengembangan-core-service.md` Bagian 4.3), tapi secara teknis memanggil
  `POST /api/v1/core/auth/login` milik Core.
- Kepegawaian adalah **pemilik tunggal** akun `staff` — saat pegawai baru diaktifkan (fitur
  Rekrutmen & Onboarding, §4 No. 16), Kepegawaian yang memicu pembuatan akun di Core lewat
  API/webhook (`ref_type='staff'`, `ref_id` = `employees.id`), bukan diinput manual di Core
  (sesuai `ARSITEKTUR-SISTEM.md` Bagian 3 poin 6 dan catatan di `rancangan-coreservice.md` §4).
- Kepegawaian **publisher webhook** untuk perubahan data pegawai (pegawai baru, pegawai
  nonaktif/resign/pensiun, perubahan jabatan) — modul lain (Akademik untuk data pengajar,
  Sarpras/Perpustakaan untuk keanggotaan, Komunikasi untuk direktori kontak) subscribe lewat
  fitur "Webhook subscriber management" milik Core Service.
- Ketergantungan dua arah dengan Core Service (Core butuh Kepegawaian untuk provisioning akun,
  Kepegawaian butuh Core untuk auth & referensi Satuan Pendidikan) — lihat Bagian 6 untuk cara
  menanganinya saat pengembangan.
- Ketergantungan dua arah dengan Keuangan (Kepegawaian hitung payroll → Keuangan cairkan) dan
  dengan Pengelolaan (Kepegawaian catat penilaian dasar → Pengelolaan pakai sebagai input evaluasi
  mendalam) — keduanya modul yang dibangun **setelah** Kepegawaian (Fase 4 dan Fase 7), jadi saat
  Kepegawaian dibangun sekarang, endpoint/webhook ke arah situ dibuat siap-pakai tapi belum ada
  konsumen sungguhan — lihat Bagian 6.

## 3. Stack Teknis

Mengikuti persis `ARSITEKTUR-SISTEM.md` Bagian 4 — **tidak membuat keputusan stack sendiri**:
Express.js (modular monolith, folder `apps/api-backend/src/modules/kepegawaian/`), Knex.js,
MariaDB 10.5 (`utf8mb4`, InnoDB), `jsonwebtoken` + `bcrypt` (untuk verifikasi token dari Core,
Kepegawaian tidak menandatangani token sendiri), React (Vite) di `apps/core-portal/src/apps/kepegawaian/`.
Kalau ada kebutuhan yang terasa perlu stack tambahan (mis. cron job untuk generate payroll
bulanan), itu **Keputusan Terbuka** (lihat Bagian 5), bukan ditentukan sepihak di sini.

## 4. Ruang Lingkup Fitur Kepegawaian (16 Fitur, sumber: PRD baris No. 72–87)

| Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|
| Data Pegawai | CRUD data pegawai (master) | Must | nip, nuptk, nama_lengkap, gelar, tempat/tanggal_lahir, jenis_kelamin, agama, status_pernikahan, alamat, kontak, foto, jabatan_aktif, golongan_aktif, status_kepegawaian (PNS/GTT/PTT) | Admin, HRD |
| Data Pegawai | Data pegawai detail (pendidikan, sertifikasi, diklat) | Must | jenjang_pendidikan, institusi, tahun_lulus, jenis_diklat, penyelenggara, sertifikat | HRD |
| Data Pegawai | Riwayat jabatan & golongan | Should | id_pegawai, jabatan/golongan, TMT, tanggal_berakhir | HRD |
| Data Pegawai | Data keluarga pegawai | Could | nama_pasangan, nama_anak, tanggal_lahir_anak | HRD, Pegawai |
| Data Pegawai | Data pensiun | Could | id_pegawai, tanggal_pensiun, jenis_pensiun | HRD |
| Data Pegawai | Rekrutmen & onboarding pegawai baru | Could | nama_pelamar, posisi, tahap_seleksi, status | HRD |
| Organisasi | DUK Pangkat (Daftar Urut Kepangkatan) | Could | urutan, id_pegawai, golongan, TMT | HRD |
| Organisasi | Manajemen jabatan & struktur organisasi | Should | nama_jabatan, level, atasan_id | HRD, Admin |
| Organisasi | Riwayat mutasi/promosi | Could | id_pegawai, jabatan_lama/baru, tanggal | HRD |
| Kehadiran | Presensi/absensi pegawai | Must | id_pegawai, tanggal, jam_masuk/keluar, status_hadir | Pegawai, HRD |
| Kehadiran | Cuti & izin | Must | id_pegawai, jenis_cuti, tanggal_mulai/selesai, alasan, status | Pegawai, Atasan |
| Kehadiran | Lembur | Should | id_pegawai, tanggal, jam_lembur, keterangan | Pegawai, Atasan |
| Penggajian | Perhitungan gaji (payroll) | Must | id_pegawai, komponen_gaji, potongan, gaji_bersih | HRD |
| Kinerja | Penilaian kinerja dasar (harian/bulanan) | Should | id_pegawai, periode, skor, catatan | Atasan, HRD |
| Kinerja | Statistik kepegawaian | Could | filter dimensi (golongan, jenis kelamin, status pernikahan, usia) | HRD, Kepala Sekolah |
| Asesmen | Tes Psikologi (MBTI & Kepribadian) | Should | psychotest_types, psychotest_dimensions, psychotest_questions, psychotest_type_profiles, psychotest_sessions, psychotest_answers, psychotest_results | HRD, Pelamar, Pegawai |
| Integrasi | Endpoint data pegawai untuk aplikasi lain | Must | - | Sistem |

Catatan konsumen data (dari PRD, untuk konteks — bukan hal yang dikerjakan di modul lain):
Akademik (guru pengajar), Sarpras (peminjaman fasilitas, approval berjenjang), Perpustakaan
(keanggotaan pegawai), Pengelolaan (dashboard KPI, evaluasi kinerja mendalam, DUK), Keuangan
(disbursement payroll), Komunikasi & Notifikasi (direktori kontak lewat Core), Tahfidz & Al-Quran
(pengajar kitab kuning), Core Service (provisioning akun `staff`).

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer secara eksplisit di PRD, jangan diasumsikan sepihak saat coding —
tanyakan dulu:

- **Skala nilai penilaian kinerja dasar.** PRD hanya menyebut kolom `skor` tanpa rentang (0–100?
  1–5? huruf A–E?) — perlu dikonfirmasi karena Pengelolaan akan memakainya sebagai input evaluasi
  mendalam (baris No. 194).
- **Formula/rate komponen gaji & potongan otomatis.** PRD menyebut "hitung otomatis, verifikasi"
  untuk payroll dari presensi/cuti/lembur, tapi tidak memberi rumus (mis. potongan per hari alpa,
  rate lembur per jam, komponen tunjangan apa saja). Untuk Tahap 1–2 (ERD & migration),
  `salary_components`/`deductions` disimpan sebagai kolom JSON generik supaya rumus final bisa
  ditentukan belakangan tanpa mengubah skema — tapi rumus perhitungannya sendiri **tidak**
  diimplementasikan sampai dikonfirmasi.
- **Skema golongan/pangkat untuk pegawai GTT/PTT.** PRD menyebut golongan mengikuti pola PNS
  (mis. `III/a`), tapi status_kepegawaian juga mencakup GTT/PTT yang biasanya tidak pakai golongan
  PNS — apakah GTT/PTT punya skema jenjang sendiri, atau kolom golongan dikosongkan (nullable)
  untuk mereka?
- **Jabatan level Yayasan.** Fitur "Manajemen jabatan & struktur organisasi" sumbernya "Core"
  (Satuan Pendidikan) — apakah ada juga jabatan lintas-yayasan (mis. Ketua Yayasan, bukan milik
  satu sekolah) yang perlu direpresentasikan, atau seluruh jabatan memang selalu terikat satu
  Satuan Pendidikan?
- **Cakupan "DUK Pangkat".** Fitur ini murni "generate, cetak" tanpa aksi tambah/edit data baru —
  rencana teknis: dihitung dari `employees` + `employee_position_history` saat diminta (tanpa
  tabel fisik terpisah), bukan tabel yang di-maintain manual. Konfirmasi apakah pendekatan ini
  sudah sesuai kebutuhan, atau developer mau DUK Pangkat sebagai daftar yang bisa diedit urutannya
  secara manual (override).

## 6. Ketergantungan Dua Arah — Cara Menangani Tanpa Saling Menunggu

Mengikuti pola `ARSITEKTUR-SISTEM.md` Bagian 6:

- **Kepegawaian ↔ Core Service**: Core butuh Kepegawaian untuk memicu pembuatan akun `staff`;
  Kepegawaian butuh Core untuk auth & data Satuan Pendidikan. Karena Core Service sudah lebih
  dulu selesai (Fase 0), sisi Core **sudah siap** menerima panggilan provisioning akun
  (`POST /api/v1/core/internal/users` — lihat `api-contract-coreservice.md`). Kepegawaian tinggal
  memanggilnya sungguhan begitu fitur Rekrutmen & Onboarding (§4 No. 16) selesai — tidak perlu
  mock di sisi Kepegawaian.
- **Kepegawaian ↔ Keuangan**: Kepegawaian menghasilkan `payroll_items` (gaji bersih per pegawai
  per periode); Keuangan nanti (Fase 4) mencairkannya. Karena Keuangan **belum dibangun**,
  endpoint `GET /api/v1/kepegawaian/payroll/periods/:id/items` (lihat `api-contract-kepegawaian.md`)
  dibangun sekarang sebagai kontrak yang siap dipanggil, tanpa menunggu Keuangan ada. Status
  `payroll_periods.status` punya nilai `sent_to_finance` yang untuk saat ini cukup diubah manual
  oleh HRD (belum ada webhook sungguhan ke Keuangan).
- **Kepegawaian ↔ Pengelolaan**: Kepegawaian catat `performance_reviews` (penilaian dasar);
  Pengelolaan (Fase 7) memakainya sebagai input evaluasi mendalam. Sama seperti di atas — endpoint
  baca (`GET /api/v1/kepegawaian/performance-reviews`) dibangun sekarang, dikonsumsi Pengelolaan
  belakangan tanpa perlu Kepegawaian menunggu.

## 7. Yang BUKAN Tanggung Jawab Kepegawaian — Jangan Dikerjakan di Sini

- Akun login, JWT, role & permission → domain **Core Service** (Kepegawaian hanya memicu
  pembuatan akun `staff`, tidak menyimpan password/session)
- Pencairan gaji (disbursement), jurnal akuntansi, COA → domain **Keuangan**
- Evaluasi kinerja mendalam, KPI mutu, supervisi, RIPS/RKS → domain **Pengelolaan** (Kepegawaian
  hanya menyediakan penilaian dasar sebagai input)
- Jadwal mengajar guru, absensi guru saat mengajar (per jam pelajaran) → domain **Akademik**
  (Kepegawaian hanya menyimpan presensi harian pegawai secara umum, bukan per jam pelajaran)
- Peminjaman fasilitas, approval berjenjang atas peminjaman → domain **Sarpras** (Kepegawaian
  hanya menyediakan data struktur jabatan yang dipakai Sarpras untuk alur approval)
- Keanggotaan perpustakaan, riwayat kitab kuning yang diajarkan → domain masing-masing
  (**Perpustakaan**, **Tahfidz & Al-Quran**), Kepegawaian hanya sumber data pegawai/pengajarnya

Kalau di tengah pengembangan Kepegawaian muncul kebutuhan yang terasa seperti masuk ke salah satu
domain di atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 8. Aplikasi yang Terhubung ke Kepegawaian

Matriks ketergantungan penuh 14 modul ada di `ARSITEKTUR-SISTEM.md` Bagian 5. Ringkasan yang
relevan (siapa butuh data Kepegawaian): Akademik, Keuangan, Sarpras, Perpustakaan, Komunikasi &
Notifikasi, Tahfidz & Al-Quran, Pengelolaan. Kepegawaian sendiri **hanya bergantung pada Core
Service** (auth, data Satuan Pendidikan/Yayasan).

## 9. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, payload
webhook, dst) ada di `ARSITEKTUR-SISTEM.md` Bagian 4 — Kepegawaian **mengikuti**, bukan
menentukan sendiri.

Khusus Kepegawaian: environment variable diawali `KEPEGAWAIAN_` (mis.
`KEPEGAWAIAN_DB_HOST`, `KEPEGAWAIAN_DB_NAME`). Karena Kepegawaian **tidak** menerbitkan JWT
sendiri, tidak ada `KEPEGAWAIAN_JWT_SECRET` — verifikasi token tetap memakai `CORE_JWT_SECRET`
milik Core Service (di-import langsung, satu proses backend, sesuai `ARSITEKTUR-SISTEM.md`
Bagian 4.1 & 4.5).

## 10. Dokumen Lain yang Terkait (baca kalau relevan dengan tugas sesi ini)

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut modul lain, bukan cuma Kepegawaian.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md` — modul yang jadi acuan pola untuk seluruh dokumen ini, dan satu-satunya
  dependency langsung Kepegawaian.
- `erd-kepegawaian.md` — ERD 14 tabel Kepegawaian.
- `api-contract-kepegawaian.md` — kontrak endpoint REST API lengkap Kepegawaian.
- `roles-kepegawaian.md` — matriks role & permission Kepegawaian.
- `panduan-pengembangan-kepegawaian.md` — checklist tahap pengembangan + prompt Antigravity &
  query SQL siap pakai per tahap.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — baris No. 72–87, sheet "Daftar Fitur",
  sumber tunggal 16 fitur di atas.
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — isi setiap satu item Kepegawaian
  selesai dibuat & diuji, jangan tunggu sampai semua selesai.
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan & tracker progres.

## 11. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-19 | Penambahan fitur **Master Status Kepegawaian Fleksibel** (`employment_statuses`): tabel master dinamis yang memungkinkan admin yayasan menambah, mengedit, menonaktifkan, dan mengurutkan jenis status kepegawaian (PNS, PPPK, GTY, GTT, PTY, PTT, Kontrak, Honorer, Magang, dll). Mengubah kolom `employees.employment_status` menjadi dinamis VARCHAR(50). |
| 2026-08-19 | Perluasan skema Data Induk GTK standar Dapodik: penambahan entitas baru (`employee_addresses`, `employee_publications`, `employee_work_experiences`, `employee_warning_letters`, `employee_organization_activities`, `employee_document_checklists`, `employee_bank_accounts`), perluasan kolom di `employees`, `employee_family_members`, `employee_education_trainings`, `employee_position_history`, serta standarisasi konvensi key JSON `salary_components`. |
| 2026-08-19 | Penambahan fitur baru di luar 16 fitur PRD asli: **Tes Psikologi (MBTI & Big Five Personality)**. Mencakup 7 tabel baru (`psychotest_types`, `psychotest_dimensions`, `psychotest_questions`, `psychotest_type_profiles`, `psychotest_sessions`, `psychotest_answers`, `psychotest_results`), mesin skoring otomatis 4-axis & trait average, portal pengisian mandiri karyawan & publik berbasis token, laporan hasil kuantitatif/kualitatif, dan manajemen bank soal. Branch: `feat/kepegawaian-psikotes`. |
| 2026-08-17 | Dokumen dibuat. 16 fitur diambil langsung dari baris No. 72–87 PRD lengkap yang dikirim developer (menggantikan rencana draf tebakan awal). 5 Keputusan Terbuka dicatat di Bagian 5 untuk dikonfirmasi sebelum/selama Tahap 2 (ERD). Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
