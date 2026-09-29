Status: perlu-revisi
Diperbarui: 2026-08-24

# roles-alquran.md

> Dokumen ini adalah acuan resmi arsitektur otorisasi, penetapan peran (*role*), dan aturan
> kontrol akses berbasis peran (RBAC) untuk modul **Tahfidz & Al-Quran (Alquran)**. Mengikuti
> pola `roles-coreservice.md`. Role & permission tetap didefinisikan secara global lewat tabel
> `roles`/`permissions`/`role_permissions`/`user_school_roles` milik **Core Service** (lihat
> `erd-coreservice.md` §2.4-2.7) — dokumen ini hanya mendefinisikan role & kode izin **spesifik
> modul Alquran** yang perlu ditambahkan ke master data Core Service tersebut.

---

## 1. Konsep & Arsitektur RBAC Modul Alquran

Mengikuti model **Hierarchical Multi-Tenant RBAC** yang sama seperti Core Service
(`roles-coreservice.md` §1.1): definisi role & permission bersifat global per Yayasan, penetapan
role ke user tetap berbasis konteks Satuan Pendidikan lewat `user_school_roles` milik Core
Service. Modul ini tidak membuat tabel RBAC sendiri.

---

## 2. Definisi Daftar Role

| Nama Role (`roles.name`) | Kategori Scope | `is_system_role` | Deskripsi Peran |
|---|---|:---:|---|
| `super_admin` *(role global Core Service)* | Global | `TRUE` | Akses penuh ke seluruh modul termasuk Alquran, tidak dicatat ulang izinnya per modul. |
| `admin_yayasan` *(role global Core Service)* | Yayasan | `FALSE` | Akses penuh ke modul Alquran lintas Satuan Pendidikan, sesuai kebijakan Yayasan. |
| `admin_tahfidz` | Spesifik Satuan Pendidikan | `FALSE` | Pengelola operasional modul Tahfidz di satu Satuan Pendidikan: target hafalan, kurikulum kitab kuning, laporan. |
| `musyrif` | Spesifik Satuan Pendidikan | `FALSE` | Guru tahfidz/musyrif yang menginput & memverifikasi capaian hafalan santri, serta menjadi penguji ujian munaqasyah. |
| `kepala_sekolah` *(role lintas modul, dipakai bersama modul lain)* | Spesifik Satuan Pendidikan | `FALSE` | Akses baca (read-only) ke laporan capaian hafalan sekolahnya. |
| `internal_service` *(role global Core Service)* | Service-to-Service | `TRUE` | Kredensial mesin/API Key untuk Portal Orangtua mengambil data capaian hafalan anak. |

> `admin_tahfidz` dan `musyrif` adalah role **baru** khusus modul ini, perlu ditambahkan ke tabel
> `roles` milik Core Service saat migration modul Alquran dijalankan (lihat
> `panduan-pengembangan-alquran.md`). `super_admin`, `admin_yayasan`, `kepala_sekolah`, dan
> `internal_service` sudah ada/dipakai bersama modul lain — cukup ditambahkan permission barunya.

---

## 3. Matriks Hak Akses Fitur Modul Alquran (6 Fitur)

> **Keterangan Simbol:**
> ✅ : Diizinkan penuh
> 🏢 : Diizinkan khusus untuk Satuan Pendidikan yang ditugaskan kepadanya
> ❌ : Tidak diizinkan

| # | Modul | Fitur | Aksi yang Diizinkan | `super_admin` | `admin_yayasan` | `admin_tahfidz` | `musyrif` | `kepala_sekolah` | `internal_service` |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **Target** | **Target & Roadmap Hafalan per Kelas** | - Melihat daftar target<br>- Tambah target baru<br>- Edit/hapus target | ✅<br>✅<br>✅ | ✅<br>✅<br>✅ | 🏢<br>🏢<br>🏢 | 🏢<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **2** | **Capaian** | **Input Capaian Hafalan Santri** | - Melihat daftar capaian<br>- Input capaian baru<br>- Verifikasi/tolak capaian | ✅<br>✅<br>✅ | ✅<br>✅<br>✅ | 🏢<br>❌<br>🏢 | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **3** | **Ujian** | **Ujian/Setoran Hafalan (Munaqasyah)** | - Melihat daftar ujian<br>- Jadwalkan ujian<br>- Input hasil ujian | ✅<br>✅<br>✅ | ✅<br>✅<br>✅ | 🏢<br>🏢<br>❌ | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **4** | **Kurikulum** | **Manajemen Kitab Kuning** | - Melihat daftar kitab<br>- Tambah/edit kitab<br>- Nonaktifkan kitab | ✅<br>✅<br>✅ | ✅<br>✅<br>✅ | 🏢<br>🏢<br>🏢 | 🏢<br>❌<br>❌ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **5** | **Laporan** | **Laporan Capaian Hafalan per Santri/Kelas** | - Melihat laporan per santri<br>- Melihat laporan per kelas<br>- Export laporan | ✅<br>✅<br>✅ | ✅<br>✅<br>✅ | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ | 🏢<br>🏢<br>🏢 | ❌<br>❌<br>❌ |
| **6** | **Integrasi** | **Endpoint Parent-Facing** | - Mengambil data capaian anak (via API Key) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Standar Penamaan Kode Izin (`permissions.code`)

Format kode izin modul Alquran: `alquran.<module>.<action>`

| Module (`permissions.module`) | Permission Code | Deskripsi Izin |
|---|---|---|
| `alquran.targets` | `alquran.targets.view` | Melihat daftar target hafalan |
| `alquran.targets` | `alquran.targets.manage` | Tambah, edit, hapus target hafalan |
| `alquran.records` | `alquran.records.view` | Melihat daftar capaian hafalan |
| `alquran.records` | `alquran.records.create` | Menginput capaian hafalan baru |
| `alquran.records` | `alquran.records.verify` | Memverifikasi/menolak capaian hafalan |
| `alquran.exams` | `alquran.exams.view` | Melihat daftar ujian munaqasyah |
| `alquran.exams` | `alquran.exams.schedule` | Menjadwalkan ujian munaqasyah |
| `alquran.exams` | `alquran.exams.record_result` | Menginput hasil ujian munaqasyah |
| `alquran.books` | `alquran.books.view` | Melihat daftar kitab kuning |
| `alquran.books` | `alquran.books.manage` | Tambah, edit, nonaktifkan kitab kuning |
| `alquran.reports` | `alquran.reports.view` | Melihat laporan capaian hafalan |
| `alquran.reports` | `alquran.reports.export` | Mengekspor laporan capaian hafalan |
| `alquran.integration` | `alquran.integration.parent_view` | Mengambil data capaian hafalan anak (internal service) |

---

## 5. Contoh Path Endpoint per Permission

Sesuai `api-contract-alquran.md`, prefix `/api/v1/alquran/...`:

| Permission Code | Endpoint |
|---|---|
| `alquran.targets.manage` | `POST/PUT/DELETE /api/v1/alquran/targets` |
| `alquran.records.create` | `POST /api/v1/alquran/records` |
| `alquran.records.verify` | `PATCH /api/v1/alquran/records/:id/verify` |
| `alquran.exams.record_result` | `PATCH /api/v1/alquran/exams/:id/result` |
| `alquran.reports.export` | `GET /api/v1/alquran/reports/classes/:class_ref_id/export` |
| `alquran.integration.parent_view` | `GET /api/v1/alquran/internal/students/:student_ref_id/achievements` |

---

## 6. Status & Log Perubahan

| Tanggal | Versi | Catatan Perubahan |
|---|---|---|
| 2026-08-17 | v1.0.0 | Draf awal matriks role & permission modul Alquran. 2 role baru (`admin_tahfidz`, `musyrif`) + 4 role lintas modul yang sudah ada (`super_admin`, `admin_yayasan`, `kepala_sekolah`, `internal_service`). |

*(Tambahkan baris baru di atas setiap ada perubahan role/permission — jangan hapus riwayat lama.)*
