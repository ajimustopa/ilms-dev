Status: perlu-revisi
Diperbarui: 2026-08-31

# rancangan-manajemen.md

> **WAJIB DIBACA setiap mulai sesi baru terkait modul Manajemen.** File ini adalah sumber
> kebenaran untuk ruang lingkup dan keputusan arsitektur modul ini. Kalau ada instruksi di suatu
> sesi yang tampak bertentangan dengan isi file ini, **tanyakan dulu ke developer sebelum
> melanjutkan** — jangan diam-diam mengubah keputusan yang sudah tercatat di sini. Update bagian
> **"Status & Log Perubahan"** di paling bawah setiap kali ada keputusan baru atau progres besar.
>
> **Catatan penamaan (2026-08-18):** modul ini disebut **"Manajemen"** (slug `manajemen`) sesuai
> kolom "Aplikasi" pada draf 13 fitur developer. `ARSITEKTUR-SISTEM.md` Bagian 2 menyebut modul
> fase-7/agregator yang sama dengan nama **"Pengelolaan"** — deskripsi & jumlah fiturnya (13,
> RIPS/RKS/Program Kerja, KPI & mutu, evaluasi kinerja, supervisi, manajemen proyek, dashboard
> agregat) cocok persis. Developer sudah mengonfirmasi ini modul yang sama dan memilih nama
> **"Manajemen"** sebagai nama resmi. **`ARSITEKTUR-SISTEM.md` Bagian 2 perlu diperbarui** untuk
> mengganti "Pengelolaan" → "Manajemen" supaya tidak ada dua nama untuk satu modul — belum
> dilakukan, tandai untuk dikerjakan developer.

## 1. Apa Ini & Posisinya dalam Sistem Besar

Manajemen adalah modul **level pimpinan/agregator** dari Sistem Manajemen Sekolah Terintegrasi
(14 modul: Core Service, Website Utama, Akademik, Kepegawaian, Keuangan, Portal Orangtua,
Sarpras, Kantin, Dapur, Perpustakaan, Ujian & Bank Soal/CBE, Komunikasi & Notifikasi, Tahfidz &
Al-Quran, **Manajemen**).

Sesuai `ARSITEKTUR-SISTEM.md` Bagian 7 (Urutan Pengembangan), modul ini ada di **Fase 7** —
dikerjakan **paling akhir** karena sifatnya mengagregasi data dari hampir semua modul lain.
Perannya:
- Pusat perencanaan strategis sekolah (RIPS, RKS tahunan, Program Kerja per unit)
- Pusat pemantauan mutu (KPI, Evaluasi Diri Sekolah, akreditasi, dashboard agregat lintas
  aplikasi, manajemen risiko/isu)
- Pusat evaluasi kinerja pegawai yang lebih mendalam dari penilaian dasar Kepegawaian
- Pusat supervisi akademik & manajerial
- Pusat manajemen proyek/kegiatan sekolah (task tracking, approval workflow berjenjang)

Manajemen **bukan** tempat menyimpan data induk siswa/pegawai/keuangan (lihat Bagian 6). Modul
ini murni **mengonsumsi** data dari modul lain untuk keperluan perencanaan, pemantauan mutu, dan
evaluasi — lalu menyimpan **artefak miliknya sendiri** (dokumen rencana, skor KPI, catatan
evaluasi, hasil supervisi, proyek, approval, risiko).

## 2. Prinsip Arsitektur

Prinsip arsitektur GLOBAL (berlaku semua 14 modul — satu database per modul, tidak ada JOIN/FK
fisik lintas database, multi-satuan-pendidikan, JWT SSO dari Core Service, webhook, data induk
hanya di satu modul pemilik) sudah hidup di **`ARSITEKTUR-SISTEM.md` Bagian 3 — baca file itu
dulu**, jangan diulang/disalin ulang di sini supaya tidak ada dua sumber kebenaran.

Yang spesifik untuk Manajemen saja:
- Manajemen adalah modul dengan **ketergantungan data terluas** setelah Core Service — mengonsumsi
  dari Core Service, Kepegawaian, Akademik (sesuai cakupan tugas sesi ini), dan berpotensi
  Keuangan/Sarpras/modul lain untuk fitur dashboard agregat (#201) di sesi pengembangan lanjutan.
  Modul ini **tidak pernah jadi sumber data** bagi modul lain — arah panah ketergantungan hanya
  satu arah masuk, kecuali untuk fitur #194 (lihat poin berikut).
- **Ketergantungan dua arah dengan Kepegawaian (fitur #194 — Evaluasi Kinerja mendalam):**
  Manajemen menarik data dasar dari tabel `performance_reviews` milik Kepegawaian sebagai bahan
  evaluasi mendalam, tapi hasil evaluasi mendalam ini juga perlu tersedia untuk dikonsumsi balik
  oleh Kepegawaian (mis. untuk keperluan kenaikan pangkat/DP3). Karena modul ini dikerjakan di
  Fase 7 — jauh setelah Kepegawaian (Fase 1) sudah selesai — **tidak perlu mock/stub seperti pola
  Core↔Akademik/Kepegawaian** (yang dipakai saat kedua sisi dikerjakan bersamaan); pemanggilan
  service-layer Kepegawaian dari Manajemen (in-process, sesuai `ARSITEKTUR-SISTEM.md` Bagian 1.1)
  bisa langsung dibuat nyata sejak awal. Bentuk konsumsi balik oleh Kepegawaian (apakah Kepegawaian
  query langsung ke service Manajemen, atau Manajemen publish webhook `manajemen.performance_evaluation.finalized`)
  **belum diputuskan** — lihat Bagian 5.
- Modul ini kemungkinan akan tumbuh cakupannya di sesi berikutnya (mis. fitur #201 Dashboard
  Agregat Lintas Aplikasi butuh integrasi ke seluruh 14 modul, bukan cuma 3 yang jadi cakupan
  sesi ini) — dokumen ini fokus ke cakupan 13 fitur dari draf developer, dengan Keputusan Terbuka
  eksplisit untuk bagian yang integrasinya belum final.

## 3. Stack Teknis

Mengikuti persis `ARSITEKTUR-SISTEM.md` Bagian 4 (Konvensi Teknis Global) — **tidak membuat
keputusan stack sendiri di sini**, karena Manajemen adalah modul satelit, bukan modul pemilik
konvensi (itu peran Core Service). Ringkasan cepat (detail lengkap ada di `ARSITEKTUR-SISTEM.md`
§4.1):

| Komponen | Pilihan |
|---|---|
| Backend | Express.js — folder `src/modules/manajemen/` di dalam proses `api-backend` yang sama |
| Query builder / migration | Knex.js |
| Database | MariaDB 10.5, InnoDB, `utf8mb4` — database sendiri `manajemen_local` (lokal) / `<kode_hosting>_dbmanajemen` (produksi) |
| Auth | JWT (verifikasi lokal, terbit dari Core Service) |
| Frontend | React (Vite), route `/manajemen/*` di dalam `apps/core-portal/` |

Environment variable diawali `MANAJEMEN_` (mis. `MANAJEMEN_DB_HOST`, `MANAJEMEN_DB_NAME`),
mengikuti pola prefix per modul di `ARSITEKTUR-SISTEM.md` §4.5.

## 4. Ruang Lingkup Fitur Manajemen (13 Fitur)

> Tabel di bawah adalah **draf yang perlu Anda review**, khususnya kolom **Prioritas** — carried
> apa adanya dari daftar fitur yang Anda berikan (kolom Prioritas asli dari PRD tidak saya ubah).
> Kolom "Kolom/Atribut Utama" untuk beberapa fitur (RIPS, RKS, Program Kerja, Supervisi, Evadir,
> dst) **tidak tersedia di draf asli** — saya rancang dari konteks nama & deskripsi fitur,
> ditandai dengan *(diusulkan)*. Detail struktur tabel lengkap ada di `erd-manajemen.md`.

| Modul | Fitur | Prioritas | Kolom/Atribut Utama | Aktor |
|---|---|---|---|---|
| Perencanaan | RIPS (Rencana Induk Pengembangan Sekolah) | Must | *(diusulkan)* judul, periode_mulai, periode_selesai, visi, misi, url_dokumen, status | Kepala Sekolah, Tim Mutu |
| Perencanaan | RKS (Rencana Kerja Sekolah) tahunan | Must | *(diusulkan)* tahun_ajaran, judul, fokus_program, referensi_plafon_anggaran, status | Kepala Sekolah |
| Perencanaan | Program Kerja per unit/bidang | Must | *(diusulkan)* nama_unit, pic, judul, target, estimasi_anggaran, status, tanggal_mulai, tanggal_selesai | Kepala Unit |
| Mutu | Dashboard KPI & Indikator Mutu | Must | *(diusulkan)* kode, nama, kategori, satuan_ukur, target, nilai_capaian, periode | Kepala Sekolah, Tim Mutu |
| Kinerja | Evaluasi Kinerja pegawai (mendalam) | Must | *(diusulkan)* periode, skor_total, kategori, status, kriteria+bobot+skor per kriteria | Atasan, HRD |
| Mutu | Evadir (Evaluasi Diri Sekolah) | Should | *(diusulkan)* tahun, komponen_standar, skor, catatan, status | Kepala Sekolah, Tim Mutu |
| Mutu | Laporan akreditasi & instrumen mutu | Should | standar, bukti, skor | Tim Mutu |
| Supervisi | Supervisi akademik & manajerial | Should | *(diusulkan)* jenis_supervisi, yang_disupervisi, jadwal, aspek, skor, temuan, rekomendasi | Kepala Sekolah, Pengawas |
| Manajemen Proyek | Pelacakan tugas (task tracking) | Should | *(diusulkan)* judul, deskripsi, penerima_tugas, prioritas, tenggat, status | Semua pegawai |
| Manajemen Proyek | Manajemen proyek/kegiatan sekolah | Should | *(diusulkan)* nama, deskripsi, pic, referensi_anggaran, tanggal_mulai, tanggal_selesai, status | PIC Kegiatan |
| Manajemen Proyek | Approval workflow (persetujuan berjenjang) | Should | *(diusulkan)* nama_workflow, jenjang_persetujuan, status_pengajuan, riwayat_aksi | Atasan, Kepala Sekolah |
| Mutu | Dashboard agregat lintas aplikasi | Must | *(diusulkan)* tanggal_snapshot, metrik (JSON) | Kepala Sekolah, Yayasan |
| Mutu | Manajemen risiko/isu sekolah | Could | *(diusulkan)* judul, kategori, deskripsi, kemungkinan, dampak, status, rencana_mitigasi | Kepala Sekolah |

## 5. Keputusan Terbuka — Finalisasi Saat/Sebelum ERD (Tahap 1)

Belum diputuskan developer, jangan diasumsikan sepihak saat coding — tanyakan dulu:

- **Arah konsumsi balik ke Kepegawaian (fitur #194).** Hasil evaluasi kinerja mendalam yang
  disimpan di Manajemen perlu tersedia untuk Kepegawaian — lewat Kepegawaian yang query langsung
  ke service-layer Manajemen (in-process), atau Manajemen publish webhook/event ke Kepegawaian
  saat evaluasi difinalisasi? Menentukan apakah perlu tabel `webhook_events`-serupa di Manajemen
  atau cukup service call satu arah balik.
- **Sumber data KPI & Dashboard Agregat (fitur #193, #201).** Apakah nilai KPI/dashboard ditarik
  **otomatis** dari service-layer modul sumber (Akademik, Keuangan, Kepegawaian, Sarpras) secara
  real-time saat halaman dibuka, atau **snapshot berkala** (job terjadwal yang menyimpan hasil
  agregasi ke tabel lokal Manajemen, mis. harian/mingguan)? Ini menentukan apakah perlu tabel
  `cross_app_dashboard_snapshots` atau cukup query on-the-fly.
- **Sumber data Evadir & Akreditasi (fitur #195, #196).** PRD menyebut sumber "Internal, Akademik,
  Sarpras" dan "Akademik, Sarpras, Kepegawaian" — apakah bukti/skor untuk tiap standar akreditasi
  diinput **manual** oleh Tim Mutu (upload dokumen/skor), atau ada tarikan data otomatis dari
  modul-modul tersebut untuk mengisi sebagian bukti? Draf ERD di Bagian ini mengasumsikan input
  manual (upload bukti + skor) sebagai baseline paling sederhana — perlu dikonfirmasi kalau butuh
  integrasi otomatis.
- **Granularitas approval workflow (fitur #200).** Jenjang persetujuan ditentukan oleh **struktur
  jabatan** (`job_positions` milik Kepegawaian, mis. berjenjang naik `level`), atau workflow
  didefinisikan manual per jenis pengajuan (mis. "pengajuan budget > Rp X harus lewat Kepala
  Sekolah")? Draf ERD mengusulkan workflow didefinisikan manual (tabel `approval_workflows` +
  `approval_steps` yang menunjuk `job_position_id`), tapi kombinasi keduanya mungkin diperlukan.
- **Target polymorphic approval/task/project.** Approval request & task perlu menunjuk ke objek
  yang diajukan (mis. pengajuan anggaran di Keuangan, atau Program Kerja internal Manajemen
  sendiri). Draf ERD mengusulkan kolom generik `reference_type` + `reference_id` (mirip pola
  `ref_type`/`ref_id` di `users` Core Service) — perlu dikonfirmasi apakah cukup, atau approval
  dibatasi hanya untuk objek internal Manajemen (Program Kerja, Proyek, Task) di tahap awal.
- **Cakupan integrasi dashboard agregat (#201).** Sesi ini cakupannya "coreservice, kepegawaian,
  akademik" — sementara PRD fitur #201 bilang sumbernya "Seluruh aplikasi". Apakah tahap awal
  cukup mengagregasi 3 modul ini dulu (skema tabel dibuat generik/fleksibel untuk ekspansi), atau
  perlu menunggu modul lain (Keuangan, Sarpras, dst) siap sebelum fitur ini mulai dibangun?

## 6. Yang BUKAN Tanggung Jawab Modul Ini — Jangan Dikerjakan di Sini

- Data induk siswa & orangtua, nilai, rapor, presensi siswa → domain **Akademik**
- Data induk pegawai, penilaian kinerja **dasar**, presensi/cuti pegawai, payroll → domain
  **Kepegawaian** (Manajemen hanya membangun evaluasi **mendalam** di atas data dasar itu, bukan
  menggantikannya)
- Akun login, Yayasan, Satuan Pendidikan, role & permission dasar → domain **Core Service**
- Anggaran/RAPBS, COA, pembukuan, pencairan dana proyek → domain **Keuangan** (Manajemen hanya
  menyimpan **referensi** anggaran untuk RKS/proyek, bukan angka anggaran itu sendiri)
- Inventaris aset, pengadaan fisik → domain **Sarpras**

Kalau di tengah pengembangan Manajemen muncul kebutuhan yang terasa seperti masuk ke salah satu
domain di atas (mis. ingin menyimpan ulang data nilai siswa untuk keperluan Evadir), itu tanda
untuk berhenti dan konfirmasi ke developer, bukan langsung dibuat.

## 7. Modul yang Terhubung ke Manajemen

Matriks ketergantungan penuh 14 modul ada di `ARSITEKTUR-SISTEM.md` Bagian 5. Ringkasan untuk
Manajemen:

| Arah | Modul |
|---|---|
| Manajemen **bergantung pada** | Core Service (auth, data Satuan Pendidikan), Kepegawaian (data pegawai, jabatan, penilaian kinerja dasar), Akademik (data guru/kelas untuk supervisi) |
| **Bergantung pada** Manajemen | Kepegawaian (hasil evaluasi kinerja mendalam, fitur #194 — lihat Bagian 2 soal arah konsumsi balik) |

Tidak ada modul lain yang tercantum sebagai konsumen data Manajemen di draf 13 fitur sesi ini
selain Kepegawaian — kalau fitur #201 (Dashboard Agregat) diperluas ke seluruh 14 modul di sesi
mendatang, matriks ini perlu diperbarui.

## 8. Konvensi Teknis

Konvensi teknis GLOBAL (format response API, penamaan tabel/endpoint, auth header, payload
webhook, dst) ada di `ARSITEKTUR-SISTEM.md` Bagian 4 — Manajemen **mengikuti**, bukan menentukan
sendiri. Kalau butuh mengubah salah satu konvensi itu, ubah di `ARSITEKTUR-SISTEM.md`, bukan diam-
diam beda sendiri di sini.

Khusus Manajemen: environment variable diawali `MANAJEMEN_` (mis. `MANAJEMEN_DB_HOST`,
`MANAJEMEN_DB_NAME`).

## 9. Dokumen Lain yang Terkait

- **`ARSITEKTUR-SISTEM.md`** — gambaran sistem penuh 14 modul, prinsip arsitektur global,
  konvensi teknis global, matriks ketergantungan. **Baca ini lebih dulu** kalau ada pertanyaan
  yang jawabannya menyangkut modul lain, bukan cuma Manajemen.
- `rancangan-coreservice.md`, `erd-coreservice.md`, `api-contract-coreservice.md`,
  `roles-coreservice.md`, — pola acuan format dokumen (Core Service dibangun duluan).
- `erd-manajemen.md` — ERD detail 22 tabel Manajemen.
- `api-contract-manajemen.md` — kontrak endpoint REST API lengkap Manajemen.
- `roles-manajemen.md` — matriks role & permission Manajemen.
- `panduan-pengembangan-manajemen.md` — checklist tahap pengembangan + prompt Antigravity & query
  siap pakai per tahap.
- `PRD_Template_Fitur_Sistem_Manajemen_Sekolah.xlsx` — daftar fitur lengkap. Sheet "Daftar Fitur"
  filter `Aplikasi = Manajemen` untuk 13 baris (190–202) yang jadi dasar dokumen ini.
- `Registry_Teknis_AsBuilt_Sistem_Manajemen_Sekolah.xlsx` — isi setiap satu item Manajemen selesai
  dibuat & diuji.
- `Controlling_Sistem_Manajemen_Sekolah.xlsx` — checklist tahapan & tracker progres.

## 10. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-28 | **Rombak Besar Arsitektur Modul Manajemen:** Konsolidasi skema perencanaan & mutu. Tabel legacy (`institution_development_plans`, `strategic_goals`, `school_work_plans`, `work_plan_programs`, `work_plan_activities`, `quality_indicators`, `quality_indicator_achievements`, `quality_goals`, `self_evaluations`) di-drop. 5 Tabel Fondasi Baru dibentuk: `rips_domains`, `rips_subdomains`, `bsc_aspects`, `committee_position_types`, dan `document_publications` (generik untuk versioning RIPS/RKJP/RKJM/RKT/EVADIR). Tabel operasional dipertahankan (`evaluation_follow_ups`, `accreditation_*`, `school_risks`, `employee_performance_*`, `supervision_*`, `projects`, `tasks`, `approval_*`). |
| 2026-08-18 | Dokumen dibuat. Nama modul dikonfirmasi developer: **"Manajemen"** (bukan "Pengelolaan"), jumlah fitur dikonfirmasi **13** (bukan 14). Tahap: belum mulai coding, baru mulai Tahap 1 (rancangan awal, ERD & kontrak API menyusul). |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
