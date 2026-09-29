Status: perlu-revisi
Diperbarui: 2026-08-24

# rancangan-alquran.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Tahfidz & Al-Quran (Alquran).** File ini
> adalah sumber kebenaran untuk ruang lingkup dan keputusan arsitektur modul ini. Kalau ada
> instruksi di suatu sesi yang tampak bertentangan dengan isi file ini, **tanyakan dulu ke
> developer sebelum melanjutkan** — jangan diam-diam mengubah keputusan yang sudah tercatat di
> sini. Update bagian **"Status & Log Perubahan"** di paling bawah setiap kali ada keputusan baru
> atau progres besar.
>
> Dokumen ini mengikuti pola `rancangan-coreservice.md` (Core Service, modul pertama yang sudah
> selesai dibangun dan jadi acuan pola untuk 13 modul lain). Slug modul ini: **`alquran`**.

## 1. Apa Ini & Posisinya dalam Sistem Besar

Modul **Tahfidz & Al-Quran** adalah salah satu dari 14 modul **Sistem Manajemen Sekolah
Terintegrasi** (Core Service, Website Utama, Akademik, Kepegawaian, Keuangan, Portal Orangtua,
Sarpras, Kantin, Dapur, Perpustakaan, Ujian & Bank Soal/CBE, Komunikasi & Notifikasi, Tahfidz &
Al-Quran, Pengelolaan).

Perannya:
- Mengelola target/roadmap hafalan Al-Qur'an per kelas dan periode.
- Mencatat & memverifikasi capaian setoran hafalan tiap santri.
- Menjadwalkan dan mencatat hasil ujian hafalan berkala (munaqasyah).
- Mengelola daftar kitab kuning yang diajarkan beserta pengampunya.
- Menghasilkan laporan capaian hafalan per santri/kelas.
- Menyediakan data capaian hafalan anak untuk dikonsumsi Portal Orangtua.

Modul ini **bukan** tempat menyimpan data induk siswa, kelas/rombel, tahun ajaran/semester
(domain **Akademik**) maupun data induk pengajar/pegawai (domain **Kepegawaian**) — lihat
Bagian 6.

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (satu database per modul, tidak ada FK fisik lintas database,
multi-satuan-pendidikan, JWT SSO terpusat di Core Service, webhook, data induk hanya di satu
aplikasi pemilik) ada di **`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu dulu**, tidak diulang
di sini supaya tidak ada dua sumber kebenaran.

Yang spesifik untuk modul Alquran:
- Modul ini **mengonsumsi** data dari **Akademik** (data induk siswa/santri, kelas/rombel, tahun
  ajaran/semester) dan **Kepegawaian** (data induk pengajar/musyrif), serta Core Service untuk
  autentikasi/SSO dan data Satuan Pendidikan — sesuai `ARSITEKTUR-SISTEM.md` Bagian 5.
- Modul ini **menjadi sumber data** yang dikonsumsi oleh **Portal Orangtua** (fitur #6 — endpoint
  parent-facing capaian hafalan anak), sesuai matriks yang sama.
- Tidak ada ketergantungan dua arah yang perlu ditangani dengan mock/stub khusus (berbeda dari
  Core Service ↔ Akademik/Kepegawaian) — modul ini murni konsumen Akademik/Kepegawaian, jadi bisa
  dibangun dengan **data referensi ID dummy** dulu (lihat `panduan-pengembangan-alquran.md`),
  disambungkan sungguhan begitu Akademik & Kepegawaian tersedia. Sesuai urutan fase di
  `ARSITEKTUR-SISTEM.md` Bagian 7, modul ini masuk **Fase 6** (dependency ringan, Akademik &
  Kepegawaian diasumsikan sudah lebih dulu jadi).

## 3. Stack Teknis

Modul ini **mengikuti** stack teknis global, tidak menentukan sendiri — lihat
`ARSITEKTUR-SISTEM.md` Bagian 4.1 (Backend: Express.js modular monolith di `apps/api-backend/`,
Knex.js, MariaDB 10.5, `jsonwebtoken` + `bcrypt`) dan Bagian 4.2 (Frontend: React Vite, bagian
dari SPA `apps/core-portal/`, Tailwind CSS). Tidak ada baris *(asumsi awal)* seperti di
`rancangan-coreservice.md` karena keputusan stack sudah final duluan lewat Core Service —
kalau butuh mengubah salah satu pilihan stack, itu perubahan global, ubah di
`ARSITEKTUR-SISTEM.md`, bukan menyimpang sendiri di modul ini.

Khusus modul ini: environment variable diawali `ALQURAN_` (mis. `ALQURAN_DB_HOST`,
`ALQURAN_DB_NAME`), sesuai pola prefix per modul di `ARSITEKTUR-SISTEM.md` Bagian 4.5.

## 4. Ruang Lingkup Fitur Modul Alquran (6 Fitur, dari daftar 202 fitur — baris 184-189)

| Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|
| Target | Target & roadmap hafalan per kelas | Must | kelas, target_juz/halaman, periode | Admin Tahfidz, Musyrif |
| Capaian | Input capaian hafalan santri | Must | id_siswa, juz, halaman, tanggal, nilai_tajwid | Musyrif/Guru Tahfidz |
| Ujian | Ujian/setoran hafalan (munaqasyah) | Should | id_siswa, juz_diuji, nilai, penguji | Musyrif, Admin Tahfidz |
| Kurikulum | Manajemen kitab kuning yang diajarkan | Should | nama_kitab, pengarang, tingkat, pengajar_id | Admin Tahfidz |
| Laporan | Laporan capaian hafalan per santri/kelas | Should | filter periode/kelas | Admin Tahfidz, Kepala Sekolah |
| Integrasi | Endpoint parent-facing (capaian hafalan anak) | Should | - | Sistem |

Catatan: hanya fitur "Target & roadmap hafalan per kelas" dan "Input capaian hafalan santri" yang
berprioritas **Must**; 4 fitur lain **Should**. Kalau ada keterbatasan waktu pengembangan, 2 fitur
Must ini yang wajib selesai duluan.

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Referensi ke data Akademik (siswa/santri, kelas/rombel).** Draf `erd-alquran.md` mengusulkan
  pola yang sama seperti `users.ref_type/ref_id` di Core Service, yaitu kolom ID polos
  (`student_ref_id`, `class_ref_id`) tanpa FK fisik. Perlu dikonfirmasi apakah field ini cukup
  berupa ID tunggal, atau perlu kolom tambahan (mis. `academic_year_ref_id`,
  `academic_semester_ref_id`) begitu skema Akademik final.
- **Granularitas periode target hafalan.** Fitur #1 kolomnya cuma `periode` — apakah ini mengacu
  ke tahun ajaran/semester milik Akademik (butuh `academic_period_ref_id`), atau periode bebas
  yang diinput manual admin tahfidz (mis. teks "Semester Ganjil 2026/2027")? Draf ERD memakai
  kombinasi keduanya (ID referensi nullable + label teks) sampai dikonfirmasi.
- **Skala nilai (`nilai_tajwid` pada Capaian, `nilai` pada Ujian).** Belum ditentukan apakah
  numerik (mis. 0–100), predikat huruf (A/B/C/D), atau skala lain (mis. "Lancar/Perlu
  Bimbingan/Belum Lancar"). Draf ERD memakai `DECIMAL` sebagai placeholder numerik — perlu
  dikoreksi begitu skala final diputuskan.
- **Hubungan fitur Capaian vs fitur Ujian.** PRD memisahkan keduanya (Capaian = setoran harian
  yang diverifikasi Musyrif; Ujian = munaqasyah berkala dengan penguji). Perlu dikonfirmasi
  apakah keduanya benar-benar dua alur/tabel terpisah (asumsi draf ERD saat ini), atau munaqasyah
  sebenarnya salah satu *jenis* verifikasi capaian yang seharusnya satu tabel.
- **Status kepegawaian Musyrif/penguji.** Apakah Musyrif & penguji ujian selalu tercatat sebagai
  pegawai biasa di Kepegawaian (direferensikan lewat `teacher_ref_id` sederhana), atau ada
  atribut/peran khusus "musyrif" yang perlu disepakati bareng modul Kepegawaian?
- **Kebutuhan tabel untuk fitur Laporan.** Draf ERD saat ini **tidak** membuat tabel baru untuk
  Laporan — dianggap hasil agregasi query dari `hafalan_targets` & `hafalan_records`, digenerate
  on-the-fly, bukan disimpan. Perlu dikonfirmasi apakah butuh tabel log/riwayat export laporan.

## 6. Yang BUKAN Tanggung Jawab Modul Ini — Jangan Dikerjakan di Sini

- Data induk siswa/santri & orangtua → domain **Akademik**
- Data induk pengajar/musyrif/pegawai → domain **Kepegawaian**
- Tahun ajaran, semester, rombel/kelas, tingkat, angkatan → domain **Akademik**
- Akun login, role dasar, Satuan Pendidikan, Yayasan → domain **Core Service**
- Apapun yang sifatnya pembayaran/keuangan (mis. biaya program tahfidz) → domain **Keuangan**
- Notifikasi/broadcast capaian hafalan ke orangtua lewat SMS/WA/Email → domain **Komunikasi &
  Notifikasi** (modul ini hanya *menyediakan data* lewat endpoint internal, bukan mengirim
  notifikasi sendiri)

Kalau di tengah pengembangan muncul kebutuhan yang terasa seperti masuk ke salah satu domain di
atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Aplikasi yang Terhubung ke Modul Ini

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 5:
- **Modul ini bergantung pada:** Akademik, Kepegawaian (plus Core Service untuk
  autentikasi/SSO — berlaku semua modul, tidak dicatat ulang di matriks tersebut).
- **Modul yang bergantung pada modul ini:** Portal Orangtua (lewat endpoint parent-facing
  Fitur #6).

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, payload
webhook) ada di `ARSITEKTUR-SISTEM.md` Bagian 4 — modul ini **mengikuti**, tidak menentukan
sendiri. Kalau butuh mengubah salah satu konvensi itu, ubah di `ARSITEKTUR-SISTEM.md`, bukan diam-
diam beda sendiri di modul ini.

Khusus modul ini: prefix route API `/api/v1/alquran/...`, prefix route frontend
`/alquran/...`, environment variable diawali `ALQURAN_`.

## 9. Dokumen Lain yang Terkait (baca kalau relevan dengan tugas sesi ini)

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut modul lain, bukan cuma Alquran.
- `erd-alquran.md` — skema database modul Alquran.
- `api-contract-alquran.md` — kontrak endpoint REST API lengkap modul Alquran.
- `roles-alquran.md` — matriks role & permission modul Alquran.
- `panduan-pengembangan-alquran.md` — checklist tahap pengembangan + prompt Antigravity & query
  siap pakai per tahap.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md` — modul yang sudah selesai duluan, jadi contoh pola persis untuk 4
  dokumen di atas.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar fitur lengkap 202 baris; sheet
  "Daftar Fitur" filter `Aplikasi = Tahfidz & Al-Quran` untuk detail lengkap 6 fitur di atas
  (baris 184-189).
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — isi sheet ini setiap satu item modul
  Alquran selesai dibuat & diuji, jangan tunggu sampai semua selesai.
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan & tracker progres lintas 14
  modul.

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-17 | Dokumen dibuat. Jumlah fitur dikonfirmasi 6 (sesuai `ARSITEKTUR-SISTEM.md` Bagian 2 & draf 6 baris fitur PRD) — sempat salah tertulis 36 di permintaan awal, sudah diklarifikasi ke developer. Tahap: belum mulai coding, baru mulai Tahap 1 (ERD & kontrak API). Database lokal belum ada. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
