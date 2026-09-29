Status: perlu-revisi
Diperbarui: 2026-08-24

# roles-kepegawaian.md

> Dokumen ini adalah acuan resmi otorisasi, penetapan peran, daftar izin, dan aturan kontrol
> akses berbasis peran (RBAC) untuk **Kepegawaian**. Ditulis mengikuti pola `roles-coreservice.md`.
> Peran & permission tetap **didefinisikan secara global di Core Service** (`roles`,
> `permissions`, `role_permissions` — lihat `erd-coreservice.md` §2.4–2.6); dokumen ini hanya
> memetakan peran mana yang relevan untuk Kepegawaian dan permission apa saja yang perlu
> didaftarkan dengan prefix `kepegawaian.*`.

---

## 1. Konsep & Arsitektur RBAC Kepegawaian

### 1.1 Prinsip Desain

1. **Tidak ada tabel `roles`/`permissions` baru di database Kepegawaian.** Kepegawaian memakai
   infrastruktur RBAC Core Service (`user_school_roles`) — role pegawai (`admin_yayasan`, `hrd`,
   dst.) ditetapkan di Core, permission barunya (`kepegawaian.*`) didaftarkan ke tabel
   `permissions` milik Core lewat migration/seed Core Service, bukan tabel Kepegawaian sendiri.
2. **Konteks per Satuan Pendidikan tetap berlaku** — role `hrd` seorang user bisa berbeda hak di
   tiap sekolah, mengikuti `user_school_roles` (sama seperti Core Service).
3. **Peran `atasan` bersifat relasional, bukan role tetap** — siapa "atasan" seorang pegawai
   ditentukan dari `job_positions.parent_position_id` + `employees.current_position_id`, bukan
   role terpisah di Core. Middleware `requirePermission` untuk endpoint approval (cuti/lembur)
   memvalidasi relasi ini di level service, di luar mekanisme role standar.
4. **Peran `pegawai` (self-service)** setara `pengguna_terautentikasi` di Core — pegawai bisa
   akses data miliknya sendiri lewat `ref_type='staff'`/`ref_id` di token JWT-nya.

---

## 2. Definisi Daftar Peran yang Relevan untuk Kepegawaian

| Nama Role (`roles.name` di Core) | Kategori Scope | Deskripsi Peran di Konteks Kepegawaian |
|---|---|---|
| `super_admin` | Global | Akses penuh (warisan dari Core Service, berlaku semua modul) |
| `admin_yayasan` | Yayasan (lintas satuan) | Melihat & mengelola seluruh data pegawai lintas sekolah, mengelola struktur jabatan lintas sekolah |
| `hrd` *(baru, khusus Kepegawaian)* | Spesifik Satuan Pendidikan (`user_school_roles`) | Pengelola operasional harian: CRUD pegawai, presensi, cuti/lembur, payroll, rekrutmen — di sekolah yang ditugaskan |
| `pengguna_terautentikasi` *(implicit, dari Core)* | Terikat akun | Dipakai sebagai basis peran `pegawai` — pegawai login, lihat & kelola data dirinya sendiri |
| `internal_service` *(dari Core)* | Service-to-service | Kredensial API Key modul lain untuk konsumsi endpoint `/internal/...` |

> **Peran `atasan`** di matriks Bagian 3 bukan baris `roles` terpisah — merujuk ke *siapa saja*
> yang login sebagai `pegawai` tapi punya bawahan menurut `job_positions`. Hak aksesnya sebagai
> atasan otomatis aktif kalau relasi itu terpenuhi (dicek di service-layer, bukan lewat
> `role_permissions`).

**Keputusan Terbuka terkait role** (lihat juga `rancangan-kepegawaian.md` §5): apakah perlu role
`hrd` terpisah per Satuan Pendidikan sejak awal, atau cukup satu `hrd` global dengan
`user_school_roles` yang membatasi cakupannya — direkomendasikan opsi kedua (konsisten dengan
pola `admin_satuan_pendidikan` di Core), tapi belum dikonfirmasi developer.

---

## 3. Matriks Hak Akses Fitur Kepegawaian (16 Fitur)

> ✅ Diizinkan penuh · 🏢 Diizinkan khusus sekolah yang ditugaskan · 👤 Hanya data milik sendiri
> · 🔗 Diizinkan khusus untuk bawahan (relasi `job_positions`) · ❌ Tidak diizinkan

| # | Modul | Fitur | Aksi | `admin_yayasan` | `hrd` | `atasan` | `pegawai` | `internal_service` |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|
| 1 | Data Pegawai | Master status kepegawaian | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | ✅<br>✅ | ❌<br>❌ | 👤 (baca)<br>❌ | ✅ (baca saja)<br>❌ |
| 2 | Data Pegawai | CRUD data pegawai (master) | Lihat daftar/detail<br>Tambah/edit<br>Ubah status akun | ✅<br>✅<br>✅ | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | 👤<br>❌<br>❌ | ✅ (baca saja)<br>❌<br>❌ |
| 2 | Data Pegawai | Data pegawai detail (pendidikan/diklat/keahlian) | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>👤 | ❌<br>❌ |
| 3 | Data Pegawai | Riwayat jabatan, SK, SPK & penugasan | Lihat<br>Tambah riwayat | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>❌ | ❌<br>❌ |
| 4 | Data Pegawai | Data keluarga pegawai | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>👤 | ❌<br>❌ |
| 5 | Data Pegawai | Riwayat karya tulis / publikasi | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>👤 | ❌<br>❌ |
| 6 | Data Pegawai | Riwayat karir eksternal | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>👤 | ❌<br>❌ |
| 7 | Data Pegawai | Kegiatan organisasi & sosial | Lihat<br>Tambah/edit/hapus | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>👤 | ❌<br>❌ |
| 8 | Data Pegawai | Kelengkapan berkas pegawai | Lihat<br>Kelola status berkas | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤 (lihat saja)<br>❌ | ❌<br>❌ |
| 9 | Data Pegawai | Data rekening bank (sensitif) | Lihat<br>Tambah/edit rekening | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤 (lihat saja)<br>❌ | ❌<br>❌ |
| 10 | Data Pegawai | Riwayat surat peringatan (SP) | Lihat<br>Terbitkan / hapus SP | ✅<br>✅ | 🏢<br>🏢 | 🔗 (bawahan)<br>❌ | 👤 (lihat saja)<br>❌ | ❌<br>❌ |
| 11 | Data Pegawai | Data pensiun | Lihat<br>Tambah/edit | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>❌ | ❌<br>❌ |
| 12 | Data Pegawai | Rekrutmen & onboarding | Lihat kandidat<br>Tambah/ubah tahap<br>Aktivasi jadi pegawai | ✅<br>✅<br>✅ | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| 13 | Organisasi | DUK Pangkat | Lihat/cetak | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 14 | Organisasi | Manajemen jabatan & struktur organisasi | Lihat<br>Tambah/edit<br>Hapus | ✅<br>✅<br>✅ | 🏢<br>🏢<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ✅ (baca saja)<br>❌<br>❌ |
| 15 | Organisasi | Riwayat mutasi/promosi | Lihat<br>Catat mutasi | ✅<br>✅ | 🏢<br>🏢 | ❌<br>❌ | 👤<br>❌ | ❌<br>❌ |
| 16 | Kehadiran | Presensi/absensi pegawai | Lihat<br>Check-in/out mandiri<br>Koreksi manual | ✅<br>❌<br>✅ | 🏢<br>❌<br>🏢 | ❌<br>❌<br>❌ | 👤<br>👤<br>❌ | ❌<br>❌<br>❌ |
| 17 | Kehadiran | Cuti & izin | Lihat<br>Ajukan<br>Setujui/tolak | ✅<br>❌<br>✅ | 🏢<br>❌<br>🏢 | 🔗<br>❌<br>🔗 | 👤<br>👤<br>❌ | ❌<br>❌<br>❌ |
| 18 | Kehadiran | Lembur | Lihat<br>Catat<br>Setujui/tolak | ✅<br>❌<br>✅ | 🏢<br>❌<br>🏢 | 🔗<br>❌<br>🔗 | 👤<br>👤<br>❌ | ❌<br>❌<br>❌ |
| 19 | Penggajian | Perhitungan gaji (payroll) | Buat periode & hitung<br>Lihat/koreksi rincian<br>Verifikasi<br>Ubah status kirim ke Keuangan | ✅<br>✅<br>✅<br>✅ | 🏢<br>🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌<br>❌ | ❌<br>👤 (lihat saja)<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ |
| 20 | Kinerja | Penilaian kinerja dasar | Lihat<br>Input/edit | ✅<br>✅ | 🏢<br>🏢 | 🔗<br>🔗 | 👤<br>❌ | ❌<br>❌ |
| 21 | Kinerja | Statistik kepegawaian | Lihat | ✅ | 🏢 | ❌ | ❌ | ❌ |
| 22 | Integrasi | Endpoint data pegawai untuk aplikasi lain | Ambil data (baca saja) | ❌ | ❌ | ❌ | ❌ | ✅ |
| 23 | Asesmen | Tes Psikologi (MBTI & Kepribadian) | Kelola bank soal & profil<br>Jadwalkan sesi & lihat laporan<br>Pengerjaan tes mandiri | ✅<br>✅<br>❌ | 🏢<br>🏢<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>👤 | ❌<br>❌<br>❌ |

---

## 4. Daftar Permission Baru untuk Didaftarkan ke Core Service

Format kode mengikuti pola Core: `kepegawaian.<resource>.<action>`. Didaftarkan lewat
seed/migration `permissions` di database **Core Service** (bukan di database Kepegawaian —
tabel `permissions` hanya ada satu, di Core), lalu dipetakan ke role lewat `role_permissions`.

| Kode Permission | Deskripsi |
|---|---|
| `kepegawaian.employees.view` | Lihat data pegawai |
| `kepegawaian.employees.manage` | Tambah/edit/ubah status pegawai |
| `kepegawaian.employee_details.manage` | Kelola pendidikan/diklat/keahlian, keluarga, publikasi, karir eksternal, organisasi, pensiun |
| `kepegawaian.employee_bank_accounts.manage` | Kelola data sensitif rekening bank pegawai |
| `kepegawaian.employee_warning_letters.manage` | Kelola & terbitkan surat peringatan (SP) pegawai |
| `kepegawaian.recruitment.manage` | Kelola rekrutmen & aktivasi pegawai baru |
| `kepegawaian.job_positions.view` | Lihat struktur jabatan |
| `kepegawaian.job_positions.manage` | Kelola struktur jabatan |
| `kepegawaian.attendances.manage` | Kelola presensi (termasuk koreksi manual) |
| `kepegawaian.leave_requests.manage` | Kelola & setujui/tolak cuti-izin |
| `kepegawaian.overtimes.manage` | Kelola & setujui/tolak lembur |
| `kepegawaian.payroll.manage` | Kelola perhitungan & verifikasi payroll |
| `kepegawaian.performance_reviews.manage` | Kelola penilaian kinerja dasar |
| `kepegawaian.statistics.view` | Lihat statistik kepegawaian |
| `kepegawaian.psychotest_bank.manage` | Kelola master tipe, dimensi, butir soal, dan profil psikotes |
| `kepegawaian.psychotest_sessions.manage` | Kelola jadwal sesi asesmen, token publik, dan laporan hasil |

Permission self-service (`.view_own`, `.manage_own` untuk cuti/lembur/keluarga/dst.) direkomendasikan
memakai mekanisme `pengguna_terautentikasi` + 👤 (cek `employee_id` = `ref_id` milik token),
bukan kode permission terpisah — konsisten dengan pola self-service di `roles-coreservice.md` §3
baris "Ganti password mandiri".

## 5. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-19 | Penambahan matriks hak akses dan permission khusus untuk perluasan Data Induk GTK Dapodik (`employee_bank_accounts`, `employee_warning_letters`, `employee_work_experiences`, `employee_organization_activities`, `employee_publications`, `employee_document_checklists`) dengan pembatasan hak tulis yang ketat untuk rekening & SP. |
| 2026-08-19 | Penambahan permission dan matriks hak akses untuk fitur Asesmen: **Tes Psikologi (MBTI & Big Five)** (`kepegawaian.psychotest_bank.manage` dan `kepegawaian.psychotest_sessions.manage`), serta penanganan self-service pengerjaan tes pegawai. |
| 2026-08-17 | Dokumen dibuat mengikuti pola `roles-coreservice.md`. Role baru `hrd` diusulkan (belum final — lihat Keputusan Terbuka Bagian 2), peran `atasan` didesain relasional lewat `job_positions`, bukan role tetap. |
