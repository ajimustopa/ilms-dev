Status: perlu-revisi
Diperbarui: 2026-08-24

# rancangan-akademik.md

> **WAJIB DIBACA setiap mulai sesi baru terkait Akademik.** File ini adalah sumber kebenaran
> untuk ruang lingkup dan keputusan arsitektur modul ini, mengikuti pola yang sama dengan
> `rancangan-coreservice.md` dan `rancangan-kepegawaian.md`. Kalau ada instruksi di suatu sesi
> yang tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum
> melanjutkan** — jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian
> **"Status & Log Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> **Status dokumen ini: DRAF.** Berbeda dari `rancangan-coreservice.md`/`rancangan-kepegawaian.md`
> yang sudah final, banyak bagian di bawah — terutama Bagian 4 (daftar fitur) dan Bagian 5
> (keputusan terbuka) — **belum direview developer**. Jangan dipakai sebagai acuan migration
> sebelum direview.

## 1. Apa Ini & Posisinya dalam Sistem Besar

Akademik adalah modul dengan cakupan **terbesar kedua** dari 14 modul Sistem Manajemen Sekolah
Terintegrasi (36 fitur — lihat `ARSITEKTUR-SISTEM.md` Bagian 2). Perannya:

- Pemilik tunggal **data induk siswa & orang tua/wali** (bukan Core Service, bukan modul lain).
- Pemilik struktur **kurikulum, tahun ajaran, semester, rombel/kelas, tingkat, angkatan**.
- Pusat proses **penilaian, rapor, presensi siswa, dan kesiswaan** (pelanggaran, prestasi,
  bimbingan konseling, dsb — cakupan pasti menunggu review Bagian 4).
- Publisher webhook untuk perubahan data siswa/ortu (mis. siswa pindah kelas, siswa baru masuk)
  yang dikonsumsi Core Service (provisioning akun) dan modul lain (Keuangan, Portal Orangtua,
  Komunikasi & Notifikasi, dst).

Akademik **bukan** tempat menyimpan data akun/login (Core Service), data induk pegawai
(Kepegawaian), atau data transaksional non-akademik (tagihan di Keuangan, saldo kantin di
Kantin, dsb — lihat Bagian 6).

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (satu database per modul, tidak ada FK fisik lintas database,
`satuan_pendidikan_id` wajib di tabel yang spesifik per sekolah, JWT SSO dari Core, webhook,
data induk hanya di satu modul pemilik, in-process call antar modul lewat backend tunggal
`api.aldeposibs.com`) sudah final dan hidup di **`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu
dulu**, tidak diulang di sini.

Yang spesifik untuk Akademik:

- Akademik adalah **pemilik data induk siswa & orang tua**. Saat siswa/ortu baru diinput di
  Akademik, Akademik yang memberi tahu Core Service (lewat pemanggilan service-layer in-process,
  bukan HTTP) untuk membuatkan akunnya — pola yang sama persis dengan Kepegawaian → Core untuk
  akun pegawai (lihat `panduan-pengembangan-kepegawaian.md` Bagian 5.1 sebagai contoh alur).
- Akademik **mengonsumsi** data dari:
  - **Core Service**: `school_units` (Satuan Pendidikan), `foundation_profiles` (Yayasan), dan
    data akun (`users`) untuk validasi/tampilan nama pengguna yang login.
  - **Kepegawaian**: data guru/pegawai (`employees`) untuk penugasan mengajar, wali kelas,
    penanggung jawab ekstrakurikuler, dsb. Akademik **tidak boleh** menyimpan data induk pegawai
    sendiri — hanya kolom ID (mis. `teacher_employee_id`) yang mengacu ke `employees` milik
    Kepegawaian, divalidasi/diambil lewat pemanggilan service Kepegawaian in-process.
- **Ketergantungan dua arah dengan Kepegawaian**: penugasan mengajar (guru) butuh data pegawai
  dari Kepegawaian, sementara Kepegawaian tidak butuh data dari Akademik untuk fungsi intinya —
  jadi ketergantungan ini **satu arah** (Akademik → Kepegawaian), bukan dua arah. Ketergantungan
  dua arah yang sebenarnya ada di **Akademik ↔ Core Service** untuk provisioning akun siswa/ortu:
  Akademik tidak perlu menunggu Core Service selesai duluan — cukup pastikan pemanggilan service
  provisioning **idempotent** dan punya fallback antrian/retry kalau Core Service belum siap saat
  development lokal (pola sama seperti `ARSITEKTUR-SISTEM.md` Bagian 6).

## 3. Stack Teknis

Mengikuti persis **`ARSITEKTUR-SISTEM.md` Bagian 4** (Node.js + Express, Knex.js, MariaDB 10.5,
React/Vite untuk frontend `core-portal`) — Akademik **tidak membuat keputusan stack sendiri**.
Environment variable modul ini diawali `AKADEMIK_` (mis. `AKADEMIK_DB_HOST`,
`AKADEMIK_DB_NAME=akademik_local`), mengikuti pola `CORE_*` dan `KEPEGAWAIAN_*` yang sudah ada.

## 4. Ruang Lingkup Fitur Akademik (36 Fitur — DRAF, PERLU REVIEW)

> **Catatan penting:** `ARSITEKTUR-SISTEM.md` Bagian 2 hanya mencatat rekap "36 fitur" untuk
> Akademik tanpa rincian per-fitur (rincian aslinya ada di
> `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` sheet "Daftar Fitur", yang **tidak saya
> punya aksesnya di sesi ini**). Tabel di bawah adalah **draf yang saya susun sendiri**
> berdasarkan fungsi utama Akademik ("Data induk siswa/ortu, kurikulum, penilaian, rapor,
> presensi, kesiswaan") dan pola modul yang sudah jadi (Core Service 13 fitur, Kepegawaian 16
> fitur) — **BUKAN daftar final**. Kolom Prioritas juga tebakan awal. Mohon Anda review baris per
> baris, khususnya:
> - apakah 36 fitur di bawah cocok dengan yang ada di PRD Anda,
> - apakah ada fitur yang terlewat atau perlu digabung/dipisah,
> - koreksi kolom Prioritas (Must/Should/Could sesuai MoSCoW).
>
> Kalau Anda sudah punya daftar fitur asli (mis. dari PRD xlsx atau file draf lain), lebih baik
> **kirim itu** dan saya susun ulang tabel ini persis mengikutinya, daripada saya menebak.

| Modul | Fitur | Prioritas (draf) | Kolom/Atribut Utama (draf) | Aktor |
|---|---|---|---|---|
| Data Master Siswa | CRUD data induk siswa | Must | nis, nisn, nama, jenis_kelamin, tempat_tanggal_lahir, alamat, foto, status_siswa | Admin, TU |
| Data Master Siswa | CRUD data orang tua/wali | Must | nama, hubungan, pekerjaan, kontak, alamat | Admin, TU |
| Data Master Siswa | Riwayat mutasi siswa (masuk/keluar/pindah) | Must | jenis_mutasi, tanggal, sekolah_asal_tujuan, keterangan | Admin, TU |
| Kurikulum | CRUD tahun ajaran | Must | nama_tahun_ajaran, tanggal_mulai, tanggal_selesai, status_aktif | Admin |
| Kurikulum | CRUD semester | Must | tahun_ajaran_id, nama_semester, tanggal_mulai, tanggal_selesai, status_aktif | Admin |
| Kurikulum | CRUD tingkat/jenjang kelas | Must | nama_tingkat, urutan | Admin |
| Kurikulum | CRUD rombel/kelas | Must | nama_rombel, tingkat_id, tahun_ajaran_id, wali_kelas_employee_id, kapasitas | Admin |
| Kurikulum | Penempatan siswa ke rombel (kenaikan kelas) | Must | siswa_id, rombel_id, tahun_ajaran_id, status | Admin, TU |
| Kurikulum | CRUD mata pelajaran | Must | nama_mapel, kode_mapel, tingkat_id, kkm | Admin |
| Kurikulum | Penugasan guru mata pelajaran (jadwal ajar) | Must | guru_employee_id, mapel_id, rombel_id, hari, jam_ke | Admin |
| Penilaian | Input nilai harian/tugas | Must | siswa_id, mapel_id, jenis_nilai, nilai, tanggal | Guru |
| Penilaian | Input nilai UTS/UAS | Must | siswa_id, mapel_id, jenis_ujian, nilai, semester_id | Guru |
| Penilaian | Input nilai sikap/karakter | Should | siswa_id, aspek_sikap, predikat, deskripsi, semester_id | Guru, Wali Kelas |
| Penilaian | Kalkulasi nilai akhir/rapor otomatis | Must | siswa_id, mapel_id, nilai_akhir, predikat, semester_id | Sistem |
| Rapor | Generate rapor per semester (PDF) | Must | siswa_id, semester_id, template_rapor, tanggal_cetak | Wali Kelas, Admin |
| Rapor | Rekap nilai per rombel | Should | rombel_id, semester_id | Guru, Wali Kelas |
| Rapor | Catatan wali kelas di rapor | Should | siswa_id, semester_id, catatan | Wali Kelas |
| Presensi | Input presensi harian siswa | Must | siswa_id, rombel_id, tanggal, status_hadir, keterangan | Guru, Wali Kelas |
| Presensi | Rekap presensi per siswa/rombel | Must | siswa_id/rombel_id, periode, total_hadir_izin_sakit_alpa | Admin, Wali Kelas |
| Presensi | Pengajuan izin/sakit siswa | Should | siswa_id, tanggal, jenis, alasan, lampiran, status_persetujuan | Orang Tua, Wali Kelas |
| Kesiswaan | Pencatatan pelanggaran/poin disiplin | Should | siswa_id, jenis_pelanggaran, poin, tanggal, penindak | Guru BK, Wali Kelas |
| Kesiswaan | Pencatatan prestasi siswa | Should | siswa_id, jenis_prestasi, tingkat, tanggal, keterangan | Guru, Wali Kelas |
| Kesiswaan | Bimbingan konseling (catatan BK) | Could | siswa_id, tanggal, jenis_layanan, catatan, sifat_kerahasiaan | Guru BK |
| Kesiswaan | Manajemen ekstrakurikuler & pendaftaran | Should | nama_ekskul, pembina_employee_id, siswa_id, jadwal | Admin, Pembina |
| Kesiswaan | Kalender akademik (agenda sekolah) | Should | nama_agenda, tanggal_mulai_selesai, tingkat_id, keterangan | Admin |
| Integrasi | Webhook publisher perubahan data siswa/ortu | Must | event_type, endpoint_tujuan, payload, status_kirim | Sistem |
| Integrasi | Provisioning akun siswa/ortu ke Core Service | Must | siswa_id/ortu_id, status_provisioning | Sistem |
| Laporan | Dashboard rekap akademik per rombel/sekolah | Should | rombel_id/satuan_pendidikan_id, periode, ringkasan | Admin, Kepsek |
| Laporan | Ekspor data siswa/nilai (Excel/PDF) | Should | filter, format_ekspor | Admin, TU |
| Keamanan | Audit log aktivitas modul Akademik | Should | user_id, aksi, data_sebelum, data_sesudah, waktu | Admin, Sistem |
| *(+7 fitur belum teridentifikasi)* | *(perlu review Anda)* | — | — | — |

> Tabel di atas baru berisi **29 baris** — saya sengaja tidak memaksakan mengisi sampai 36 kalau
> tidak yakin fiturnya apa, supaya tidak mengarang. Sisa **7 fitur** kemungkinan ada di area yang
> belum saya sentuh (mis. manajemen jadwal pelajaran mingguan penuh, ujian sekolah/kelulusan,
> mutasi rombel per mapel untuk sistem SKS/lintas minat, integrasi khusus dengan CBE untuk nilai
> ujian daring, dsb) — tolong lengkapi atau kirim daftar fitur aslinya.

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Kelengkapan & kebenaran daftar 36 fitur di Bagian 4** — ini yang paling penting untuk
  dikonfirmasi lebih dulu sebelum ERD dibuat, karena ERD akan mengikuti tabel ini.
- **Struktur kurikulum**: apakah satu siswa hanya di satu rombel per tahun ajaran (model kelas
  klasikal SD/SMP sederhana), atau perlu dukungan sistem SKS/lintas minat (siswa bisa beda rombel
  per mata pelajaran, umum di SMA kurikulum merdeka)? Ini menentukan struktur tabel
  `student_class_enrollments` secara signifikan.
- **Skema penilaian & rapor**: format rapor mengikuti Kurikulum Merdeka (capaian pembelajaran per
  elemen, tanpa KKM per mapel) atau kurikulum lama (nilai angka + KKM)? Atau perlu mendukung
  keduanya karena TK/SD/SMP/SMA punya kurikulum berbeda?
- **Presensi**: presensi direkap per jam pelajaran (tiap mapel dicatat terpisah) atau cukup per
  hari (satu status kehadiran per siswa per hari, dicatat wali kelas)? Ini memengaruhi apakah
  perlu tabel presensi terpisah per jadwal_ajar atau cukup per rombel-hari.
- **Kesiswaan/BK**: apakah catatan bimbingan konseling perlu level kerahasiaan khusus (hanya BK &
  Kepsek yang bisa lihat, bahkan wali kelas tidak), mengingat sifat datanya sensitif?
- **Kalender akademik**: apakah ini murni referensi (tanggal libur/agenda), atau juga dipakai
  Presensi untuk otomatis menandai hari libur (tidak perlu isi presensi)?
- **Kepemilikan jadwal ajar vs Kepegawaian**: penugasan guru mata pelajaran disimpan di Akademik
  (usulan tabel `teaching_assignments` dengan `teacher_employee_id` ke Kepegawaian) — perlu
  dikonfirmasi ini bukan tanggung jawab Kepegawaian.
- **Format & pemicu webhook siswa/ortu**: event apa saja yang dipublish (siswa baru, siswa
  pindah rombel, siswa keluar/lulus, data ortu berubah)? Payload mengikuti standar
  `ARSITEKTUR-SISTEM.md` §4 (`event_type`, `timestamp`, `data`, `satuan_pendidikan_id`) — perlu
  daftar `event_type` yang disepakati sebelum modul lain (Keuangan, Portal Orangtua,
  Komunikasi & Notifikasi) mulai subscribe.

## 6. Yang BUKAN Tanggung Jawab Akademik — Jangan Dikerjakan di Sini

- Akun login, JWT, role & permission → domain **Core Service**
- Data induk pegawai/guru (identitas, kepegawaian, payroll) → domain **Kepegawaian**
- Tagihan SPP, pembayaran, RAPBS/anggaran → domain **Keuangan**
- Saldo cashless/transaksi kantin → domain **Kantin**
- Perencanaan menu makan & stok bahan baku → domain **Dapur**
- Sirkulasi buku perpustakaan → domain **Perpustakaan**
- Bank soal & ujian daring terjadwal (CBE) → domain **Ujian & Bank Soal (CBE)** — Akademik hanya
  konsumen hasil akhirnya untuk rapor (kalau disepakati di Bagian 5), bukan pemilik prosesnya
- Target/capaian hafalan Al-Quran → domain **Tahfidz & Al-Quran**
- Broadcast notifikasi WA/SMS/Email → domain **Komunikasi & Notifikasi** — Akademik hanya
  memicu event, bukan mengirim notifikasi sendiri

Kalau di tengah pengembangan Akademik muncul kebutuhan yang terasa seperti masuk ke salah satu
domain di atas, itu tanda untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Modul yang Terhubung ke Akademik

Matriks ketergantungan penuh 14 modul ada di `ARSITEKTUR-SISTEM.md` Bagian 5. Ringkasan yang
relevan untuk Akademik:

- **Akademik bergantung ke**: Core Service (auth, Satuan Pendidikan, akun), Kepegawaian (data
  guru untuk penugasan mengajar/wali kelas).
- **Modul yang bergantung ke Akademik**: Portal Orangtua (data nilai, rapor, presensi, kesiswaan
  anak), Keuangan (data siswa aktif untuk penagihan SPP), Kantin (data siswa untuk saldo
  cashless), Perpustakaan (data siswa peminjam), CBE (data siswa peserta ujian), Komunikasi &
  Notifikasi (data siswa/ortu untuk broadcast), Tahfidz & Al-Quran (data siswa), Pengelolaan
  (dashboard agregat akademik).

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, dst) ada di
`ARSITEKTUR-SISTEM.md` Bagian 4 — Akademik **mengikuti**, bukan menentukan sendiri, mengikuti pola
yang sudah dipakai Core Service dan Kepegawaian.

Khusus Akademik: environment variable diawali `AKADEMIK_` (mis. `AKADEMIK_JWT_...` tidak perlu
karena JWT tetap diverifikasi pakai secret Core, tapi `AKADEMIK_DB_HOST`, `AKADEMIK_DB_NAME`, dst).

## 9. Dokumen Lain yang Terkait (baca kalau relevan dengan tugas sesi ini)

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut modul lain, bukan cuma Akademik.
- `erd-akademik.md` — ERD Akademik (mengikuti tabel Bagian 4 di atas — status: draf, menunggu
  review Bagian 4 & 5).
- `api-contract-akademik.md` — kontrak endpoint REST API lengkap Akademik.
- `roles-akademik.md` — matriks role & permission Akademik.
- `panduan-pengembangan-akademik.md` — checklist tahap pengembangan (Database → Backend →
  Frontend → Integrasi → Verifikasi → Deployment), termasuk prompt Antigravity & query SQL siap
  pakai per tahap.
- `rancangan-coreservice.md`, `rancangan-kepegawaian.md` — contoh format & pola keputusan modul
  yang sudah selesai, dipakai sebagai acuan gaya penulisan dokumen ini.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar fitur lengkap 202 baris, 14 modul.
  Sheet "Daftar Fitur" filter `Aplikasi = Akademik` untuk detail lengkap 36 fitur — **sumber
  kebenaran asli** yang perlu dicocokkan dengan draf Bagian 4 di atas.
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — catatan teknis yang **sudah jadi**.
  Isi sheet ini setiap satu item Akademik selesai dibuat & diuji.
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan & tracker progres lintas 14
  modul.

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-19 | Redesain & perluasan skema Data Induk Siswa standar Dapodik: penambahan entitas 1:1 (`student_addresses`, `student_physical_data`, `student_admissions`, `student_document_checklists`), penambahan kolom Dapodik di `students`, `guardians`, `student_guardians`, `student_mutations`, penetapan masking otomatis data sensitif PII (NIK, No. KK, penghasilan), serta kalkulasi dinamis kelengkapan rapor (`report-card-completeness`) tanpa tabel manual. |
| 2026-08-17 | Dokumen dibuat sebagai draf awal. Daftar fitur Bagian 4 disusun manual (29 dari 36 fitur teridentifikasi) karena PRD xlsx tidak tersedia di sesi ini — **menunggu review developer** sebelum ERD dianggap final. Beberapa keputusan terbuka dicatat di Bagian 5. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
