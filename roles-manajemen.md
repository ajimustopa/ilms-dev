# roles-manajemen.md

> Dokumen ini adalah acuan resmi otorisasi (RBAC) untuk **modul Manajemen** dalam Sistem
> Manajemen Sekolah Terintegrasi. Mengikuti pola `roles-coreservice.md` — role & permission
> global tetap didefinisikan/disimpan di tabel `roles`/`permissions`/`user_school_roles` milik
> **Core Service** (lihat `ARSITEKTUR-SISTEM.md` §3 poin 5); modul Manajemen hanya mendefinisikan
> **role tambahan** yang relevan dengan fiturnya dan memetakan kode izin (`permissions.code`)
> dengan prefix `manajemen.*`, disimpan lewat endpoint `roles-coreservice.md` yang sudah ada
> (`POST /api/v1/core/roles`, dst) — bukan tabel `roles` terpisah di database Manajemen.

---

## 1. Konsep & Arsitektur RBAC Modul Manajemen

### 1.1 Prinsip Desain
1. **Definisi Role & Permission tetap global di Core Service** — modul Manajemen tidak
   menyimpan tabel `roles` sendiri, sesuai `ARSITEKTUR-SISTEM.md` §3 poin 5 (akun/role hanya
   hidup di Core Service).
2. **Penetapan role tetap per Satuan Pendidikan** (`user_school_roles` milik Core Service) —
   role di modul Manajemen bisa berbeda antar sekolah untuk pengguna yang sama (mis. Kepala
   Sekolah di satu unit, guru biasa di unit lain), sama seperti pola Core Service.
3. **Sebagian besar aktor Manajemen adalah pegawai** — otorisasi memakai `ref_type = 'staff'` +
   `ref_id` (menunjuk `employees.id` Kepegawaian) yang sudah tercatat di `users` Core Service,
   bukan entitas baru.
4. **Self-service dibatasi ketat** — pegawai biasa (`pegawai_umum`) hanya boleh melihat/mengubah
   task miliknya sendiri dan melihat hasil evaluasi/supervisi terhadap dirinya sendiri, tidak
   pernah data pegawai lain.

---

## 2. Definisi Daftar Role (Tambahan untuk Modul Manajemen)

| Nama Role (`roles.name`) | Kategori Scope | `is_system_role` | Deskripsi Peran |
|---|---|:---:|---|
| `kepala_sekolah` | Spesifik Satuan Pendidikan | `FALSE` | Pemilik keputusan strategis: RIPS, RKS, approval tertinggi, manajemen risiko, dashboard agregat. |
| `tim_mutu` | Spesifik Satuan Pendidikan | `FALSE` | Pengelola KPI, Evadir, laporan akreditasi. |
| `kepala_unit` | Spesifik Satuan Pendidikan | `FALSE` | Pemilik Program Kerja unit/bidang miliknya sendiri. |
| `atasan_hrd` | Spesifik Satuan Pendidikan | `FALSE` | Penilai evaluasi kinerja pegawai mendalam — bisa atasan langsung atau staf HRD Kepegawaian yang diberi role ini di Manajemen. |
| `pengawas` | Spesifik Satuan Pendidikan | `FALSE` | Pelaksana supervisi akademik & manajerial. |
| `pic_kegiatan` | Spesifik Satuan Pendidikan | `FALSE` | Penanggung jawab proyek/kegiatan sekolah, mengelola task & anggota tim. |
| `pegawai_umum` *(Implicit)* | Lokal / Terikat Akun | `FALSE` | Peran dasar seluruh pegawai aktif — self-service task tracking, melihat hasil evaluasi/supervisi diri sendiri. |
| `internal_service` *(Sistem/Mesin, sudah ada di Core Service)* | Service-to-Service | `TRUE` | Dipakai Kepegawaian untuk menarik hasil evaluasi kinerja mendalam (Fitur #194). |

> `super_admin` dan `admin_yayasan` (didefinisikan di `roles-coreservice.md`) otomatis punya akses
> penuh ke seluruh fitur Manajemen juga, mengikuti prinsip *least privilege* dari atas ke bawah —
> tidak diulang di matriks Bagian 3 supaya ringkas (asumsikan ✅ di semua baris untuk kedua role
> ini).

---

## 3. Matriks Hak Akses Fitur Manajemen (13 Fitur)

> **Keterangan Simbol:**
> ✅ : Diizinkan penuh
> 🏢 : Diizinkan khusus untuk Satuan Pendidikan yang ditugaskan (`school_unit_id` sesuai `user_school_roles`)
> 👤 : Diizinkan khusus untuk data milik dirinya sendiri (*Self-service*)
> ❌ : Tidak diizinkan

| # | Kategori | Fitur | Aksi yang Diizinkan | `kepala_sekolah` | `tim_mutu` | `kepala_unit` | `atasan_hrd` | `pengawas` | `pic_kegiatan` | `pegawai_umum` | `internal_service` |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **190** | Perencanaan | **RIPS** | - Lihat & buat RIPS<br>- Ubah/approve/arsipkan | 🏢<br>🏢 | 🏢<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ |
| **191** | Perencanaan | **RKS tahunan** | - Lihat & buat RKS<br>- Submit/approve | 🏢<br>🏢 | 🏢<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ |
| **192** | Perencanaan | **Program Kerja unit/bidang** | - Lihat semua/unit sendiri<br>- Buat & ubah program unit sendiri<br>- Ubah status<br>- Hapus | 🏢<br>❌<br>❌<br>🏢 | 🏢<br>❌<br>❌<br>❌ | 👤<br>👤<br>👤<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ |
| **193** | Mutu | **Dashboard KPI & Indikator Mutu** | - Lihat dashboard<br>- Kelola definisi indikator<br>- Input capaian per periode | 🏢<br>❌<br>❌ | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **194** | Kinerja | **Evaluasi Kinerja pegawai (mendalam)** | - Buat & ubah evaluasi<br>- Submit<br>- Approve<br>- Lihat evaluasi diri sendiri<br>- Tarik hasil final (endpoint internal) | ❌<br>❌<br>🏢<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌<br>❌ | 🏢<br>🏢<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>👤<br>❌ | ❌<br>❌<br>❌<br>❌<br>✅ |
| **195** | Mutu | **Evadir** | - Lihat & input skor<br>- Submit | 🏢<br>❌ | 🏢<br>🏢 | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ |
| **196** | Mutu | **Laporan akreditasi & instrumen mutu** | - Lihat & buat laporan/standar<br>- Upload bukti + skor<br>- Generate ringkasan | 🏢<br>❌<br>🏢 | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **197** | Supervisi | **Supervisi akademik & manajerial** | - Lihat jadwal & hasil<br>- Jadwalkan supervisi<br>- Input hasil<br>- Lihat hasil diri sendiri (yang disupervisi) | 🏢<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | 🏢<br>🏢<br>🏢<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>👤 | ❌<br>❌<br>❌<br>❌ |
| **198** | Manajemen Proyek | **Pelacakan tugas (task tracking)** | - Lihat & buat task milik/tim sendiri<br>- Ubah status task milik sendiri<br>- Komentar | 🏢<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | 🏢<br>🏢<br>🏢 | 👤<br>👤<br>👤 | ❌<br>❌<br>❌ |
| **199** | Manajemen Proyek | **Manajemen proyek/kegiatan sekolah** | - Lihat semua/proyek sendiri<br>- Buat & ubah proyek<br>- Kelola anggota | 🏢<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | 🏢<br>🏢<br>🏢 | 👤<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **200** | Manajemen Proyek | **Approval workflow** | - Kelola definisi workflow<br>- Ajukan approval<br>- Setujui/tolak sesuai jenjang aktif<br>- Lihat riwayat aksi | 🏢<br>🏢<br>🏢<br>🏢 | ❌<br>🏢<br>❌<br>👤 | ❌<br>🏢<br>❌<br>👤 | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>🏢<br>🏢<br>👤 | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ |
| **201** | Mutu | **Dashboard agregat lintas aplikasi** | - Lihat dashboard<br>- Trigger snapshot manual (endpoint internal) | 🏢<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>✅ |
| **202** | Mutu | **Manajemen risiko/isu sekolah** | - Lihat & catat risiko<br>- Ubah status/mitigasi | 🏢<br>🏢 | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ | ❌<br>❌ |

---

## 4. Standar Penamaan Kode Izin (`permissions.code`)

Format kode izin mengikuti pola global `<module>.<resource>.<action>` dari `roles-coreservice.md`
§4.2, prefix modul `manajemen`:

| Module (`permissions.module`) | Permission Code | Deskripsi Izin |
|---|---|---|
| `manajemen.planning` | `manajemen.planning.rips.view` / `.manage` | Lihat / kelola RIPS |
| `manajemen.planning` | `manajemen.planning.rks.view` / `.manage` | Lihat / kelola RKS tahunan |
| `manajemen.planning` | `manajemen.planning.work_programs.view` / `.manage_own` / `.manage_all` | Lihat / kelola Program Kerja unit sendiri / semua unit |
| `manajemen.quality` | `manajemen.quality.kpi.view` / `.manage` | Lihat dashboard / kelola definisi & capaian KPI |
| `manajemen.quality` | `manajemen.quality.self_evaluation.view` / `.manage` | Lihat / kelola Evadir |
| `manajemen.quality` | `manajemen.quality.accreditation.view` / `.manage` | Lihat / kelola laporan akreditasi |
| `manajemen.quality` | `manajemen.quality.dashboard_cross_app.view` | Lihat dashboard agregat lintas aplikasi |
| `manajemen.quality` | `manajemen.quality.risks.view` / `.manage` | Lihat / kelola risiko & isu sekolah |
| `manajemen.performance` | `manajemen.performance.evaluations.manage` / `.approve` / `.view_own` | Kelola / setujui / lihat evaluasi kinerja mendalam milik sendiri |
| `manajemen.supervision` | `manajemen.supervision.schedules.manage` / `.view_own` | Kelola jadwal & hasil supervisi / lihat hasil diri sendiri |
| `manajemen.projects` | `manajemen.projects.tasks.manage_own` / `.manage_team` | Kelola task milik sendiri / task tim (untuk PIC) |
| `manajemen.projects` | `manajemen.projects.manage` / `.view_own` | Kelola proyek (PIC) / lihat proyek yang diikuti |
| `manajemen.projects` | `manajemen.projects.approvals.manage_workflow` / `.request` / `.act` | Kelola definisi workflow / ajukan / setujui-tolak sesuai jenjang |

---

## 5. Implementasi Multi-Satuan-Pendidikan

Sama seperti pola `roles-coreservice.md` §5 — mengikuti mekanisme `user_school_roles` milik Core
Service, tidak diduplikasi mekanismenya di sini. Contoh skenario khas untuk Manajemen:

> **Kasus: Ibu Siti Rahma, S.Pd. (Kepala Unit Kurikulum di SD, guru biasa di SMP)**
> - Di **SD Contoh 1** (`school_unit_id = 1`): role `kepala_unit` — bisa kelola Program Kerja
>   unit Kurikulum, tidak bisa lihat Program Kerja unit lain, tidak bisa akses RIPS/RKS.
> - Di **SMP Contoh 1** (`school_unit_id = 2`): tidak punya role Manajemen sama sekali (hanya
>   role `teacher` di Akademik) — otomatis tidak bisa akses endpoint Manajemen apapun di unit ini
>   (403 Forbidden), termasuk melihat task/evaluasi milik dirinya sendiri di sekolah tersebut
>   kalau memang belum ada penugasan `pegawai_umum` implisit untuk unit itu.

## 6. Status & Riwayat Dokumen

| Tanggal | Versi | Catatan Perubahan |
|---|---|---|
| 2026-08-18 | v1.0.0 | Penyusunan awal matriks role & permission modul Manajemen — 8 role tambahan dipetakan ke 13 fitur, standar kode izin `manajemen.*`. |

*(Tambahkan baris baru di atas setiap ada perubahan — jangan hapus riwayat lama.)*
