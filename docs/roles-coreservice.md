Status: final
Diperbarui: 2026-08-17

# Matriks Role & Permission Core Service — Sistem Manajemen Sekolah Terintegrasi

> Dokumen ini adalah acuan resmi arsitektur otorisasi, penetapan peran (*role*), daftar izin (*permissions*), dan aturan kontrol akses berbasis peran (Role-Based Access Control / RBAC) untuk **Core Service** dalam Sistem Manajemen Sekolah Terintegrasi.
>
> **Revisi 2026-08-16:** File diganti nama dari `roles.md` menjadi `roles-coreservice.md`
> (mengikuti pola penamaan `roles-<nama-modul>.md` untuk 13 modul lain di root proyek yang sama).
> Contoh path endpoint pada Bagian 5 diperbarui memakai prefix `/api/v1/core/...` sesuai
> `ARSITEKTUR-SISTEM.md` Bagian 1.1.

---

## 1. Konsep & Arsitektur RBAC Core Service

Core Service menerapkan model **Hierarchical Multi-Tenant RBAC** yang mendukung fleksibilitas peran lintas Satuan Pendidikan (TK, SD, SMP, SMA).

### 1.1 Prinsip Desain
1. **Definisi Role & Permission Bersifat Global:** Master tabel `roles` dan `permissions` berlaku secara sistemik untuk seluruh instalasi Yayasan.
2. **Penetapan Role Berbasis Konteks Satuan Pendidikan (`user_school_roles`):** Seorang pengguna dapat memiliki peran berbeda di setiap Satuan Pendidikan yang berbeda (sesuai **Keputusan Final #3** di `erd-coreservice.md`).
3. **Role Bawaan Sistem (*System Role*):** Role bawaan seperti `super_admin` memiliki flag `is_system_role = true` dan dilindungi agar tidak dapat diubah namanya atau dihapus.
4. **Prinsip Least Privilege:** Pengguna hanya mendapatkan izin akses yang relevan dengan tugas dan wilayah kerja Satuan Pendidikannya.

---

## 2. Definisi Daftar Role

Berdasarkan analisis aktor pada 13 fitur di `rancangan-coreservice.md` §4 dan kebutuhan operasional sekolah terintegrasi:

| Nama Role (`roles.name`) | Kategori Scope | `is_system_role` | Deskripsi Peran |
|---|---|:---:|---|
| `super_admin` | Global (Yayasan & Semua Satuan) | `TRUE` | Administrator tertinggi sistem dengan kendali penuh atas seluruh modul, konfigurasi keamanan, dan seluruh data Satuan Pendidikan. |
| `admin_yayasan` | Yayasan (Lintas Satuan) | `FALSE` | Pengurus / Tim IT Yayasan yang mengelola data profil Yayasan, master Satuan Pendidikan, pengaturan global, dan monitoring audit log lintas aplikasi. |
| `admin_satuan_pendidikan` | Spesifik Satuan Pendidikan | `FALSE` | Tenaga tata usaha / admin sekolah lokal yang mengelola operasional akun, penugasan role lokal, dan penanganan permohonan reset password di sekolahnya. |
| `developer` | Global (Teknis & Integrasi) | `FALSE` | Tim pengembang / teknis yang mengelola integrasi ekosistem: webhook subscriber, API client gateway, rate limit rules, dan dokumentasi OpenAPI. |
| `pengguna_terautentikasi` *(Implicit)* | Lokal / Terikat Akun | `FALSE` | Peran dasar untuk seluruh user aktif (Guru, Pegawai, Siswa, Orang Tua) untuk fungsi swalayan: login SSO, ganti password mandiri, dan melihat profil sekolah. |
| `internal_service` *(Sistem / Mesin)* | Service-to-Service | `TRUE` | Kredensial mesin/API Key untuk 13 aplikasi satelit (Akademik, Kepegawaian, Keuangan, dll.) untuk sinkronisasi otomatis dan ingest audit log. |

---

## 3. Matriks Hak Akses Fitur Core Service (13 Fitur)

Matriks berikut memetakan 13 fitur Core Service (`rancangan-coreservice.md` §4) terhadap aksi spesifik dan izin yang diberikan kepada masing-masing role:

> **Keterangan Simbol:**  
> ✅ : Diizinkan penuh  
> 🏢 : Diizinkan khusus untuk Satuan Pendidikan yang ditugaskan kepadanya (`school_unit_id` sesuai `user_school_roles`)  
> 👤 : Diizinkan khusus untuk data milik dirinya sendiri (*Self-service*)  
> ❌ : Tidak diizinkan  

| # | Modul | Fitur Core Service | Aksi yang Diizinkan | `super_admin` | `admin_yayasan` | `admin_satuan_pendidikan` | `developer` | `pengguna_terautentikasi` | `internal_service` |
|:---:|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **Autentikasi** | **Login SSO (JWT)** | - Melakukan autentikasi & login<br>- Refresh access token<br>- Logout & pencabutan sesi<br>- Verifikasi token sentral | ✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>❌ | ❌<br>❌<br>❌<br>✅ |
| **2** | **Autentikasi** | **Lupa Password** | - Pengajuan permohonan reset<br>- Melihat daftar permohonan<br>- Menyetujui / menolak permohonan | ✅<br>✅<br>✅ | ✅<br>✅<br>✅ | ✅<br>🏢<br>🏢 | ✅<br>❌<br>❌ | 👤<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **3** | **Autentikasi** | **Manajemen User & Reset Password** | - Buat akun otomatis (Akademik/Pegawai)<br>- Buat akun admin Core Service<br>- Melihat daftar & detail user<br>- Ubah status aktif/nonaktif<br>- Reset password oleh admin<br>- Ganti password mandiri | ❌<br>✅<br>✅<br>✅<br>✅<br>👤 | ❌<br>✅<br>✅<br>✅<br>✅<br>👤 | ❌<br>❌<br>🏢<br>🏢<br>🏢<br>👤 | ❌<br>❌<br>❌<br>❌<br>❌<br>👤 | ❌<br>❌<br>❌<br>❌<br>❌<br>👤 | ✅<br>❌<br>❌<br>✅<br>❌<br>❌ |
| **4** | **Autentikasi** | **Role & Permission Management** | - Melihat daftar role & permissions<br>- Buat, edit, hapus role kustom<br>- Menetapkan role ke user per sekolah<br>- Mencabut role user di sekolah | ✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>✅ | 🏢<br>❌<br>🏢<br>🏢 | ✅<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ |
| **5** | **Autentikasi** | **Audit Log Login & Aktivitas** | - Melihat riwayat login user<br>- Filter log berdasarkan tanggal/user | ✅<br>✅ | ✅<br>✅ | 🏢<br>🏢 | ✅<br>✅ | ❌<br>❌ | ❌<br>❌ |
| **6** | **Data Master** | **Profil Yayasan** | - Melihat informasi profil Yayasan<br>- Mengubah nama, kontak, logo Yayasan | ✅<br>✅ | ✅<br>✅ | ✅<br>❌ | ✅<br>❌ | ✅<br>❌ | ✅<br>❌ |
| **7** | **Data Master** | **CRUD Satuan Pendidikan** | - Melihat daftar & detail sekolah<br>- Menambah Satuan Pendidikan baru<br>- Mengedit profil Satuan Pendidikan<br>- Mengubah status aktif/nonaktif & rekam alasan<br>- Melihat riwayat status perubahan | ✅<br>✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>✅<br>✅ | ✅<br>❌<br>🏢<br>❌<br>🏢 | ✅<br>❌<br>❌<br>❌<br>❌ | ✅<br>❌<br>❌<br>❌<br>❌ | ✅<br>❌<br>❌<br>❌<br>❌ |
| **8** | **Data Master** | **Pengaturan Sistem (Site Settings)** | - Melihat konfigurasi sistem<br>- Mengatur/override setting global Yayasan<br>- Mengatur override setting per sekolah<br>- Hapus konfigurasi setting | ✅<br>✅<br>✅<br>✅ | ✅<br>✅<br>✅<br>✅ | 🏢<br>❌<br>🏢<br>❌ | ✅<br>✅<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ✅<br>❌<br>❌<br>❌ |
| **9** | **Integrasi** | **Webhook Publisher** | - Melihat log event yang dipublish<br>- Melihat status pengiriman per subscriber<br>- Melakukan retry kirim ulang webhook | ✅<br>✅<br>✅ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ | ✅<br>✅<br>✅ | ❌<br>❌<br>❌ | ❌<br>❌<br>❌ |
| **10** | **Integrasi** | **Webhook Subscriber Management** | - Melihat daftar subscriber aplikasi<br>- Mendaftarkan subscriber & event<br>- Memperbarui URL / event subscription<br>- Rotasi secret key signature<br>- Hapus subscriber | ✅<br>✅<br>✅<br>✅<br>✅ | ❌<br>❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌<br>❌ | ✅<br>✅<br>✅<br>✅<br>✅ | ❌<br>❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌<br>❌ |
| **11** | **Integrasi** | **Dokumentasi API (OpenAPI)** | - Mengakses file OpenAPI JSON/YAML<br>- Membuka antarmuka Swagger UI | ✅<br>✅ | ✅<br>✅ | ✅<br>✅ | ✅<br>✅ | ✅<br>✅ | ✅<br>✅ |
| **12** | **Integrasi** | **Rate Limiting & API Gateway** | - Melihat daftar API clients & rules<br>- Mendaftarkan API Client baru<br>- Mengatur batas limit per endpoint<br>- Edit & hapus aturan limit | ✅<br>✅<br>✅<br>✅ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ | ✅<br>✅<br>✅<br>✅ | ❌<br>❌<br>❌<br>❌ | ❌<br>❌<br>❌<br>❌ |
| **13** | **Keamanan** | **Audit Log Aktivitas Admin Lintas Aplikasi** | - Ingest log dari 13 aplikasi satelit<br>- Melihat daftar log audit lintas aplikasi<br>- Melihat perbandingan JSON data_before/after | ❌<br>✅<br>✅ | ❌<br>✅<br>✅ | ❌<br>🏢<br>🏢 | ❌<br>✅<br>✅ | ❌<br>❌<br>❌ | ✅<br>❌<br>❌ |

---

## 4. Pemetaan Database & Master Data Permissions

### 4.1 Hubungan Antar Tabel Otorisasi (Sesuai `erd-coreservice.md` §2.4–2.7)

```
+------------------+         +-----------------------+         +---------------------+
|      roles       | <-----> |   role_permissions    | <-----> |     permissions     |
+------------------+         +-----------------------+         +---------------------+
| id (PK)          |         | id (PK)               |         | id (PK)             |
| name             |         | role_id (FK)          |         | code (UNIQUE)       |
| description      |         | permission_id (FK)    |         | module              |
| is_system_role   |         +-----------------------+         | description         |
+------------------+                                           +---------------------+
         ^
         |
         +-----------------------------+
                                       |
+------------------+         +-----------------------+         +---------------------+
|      users       | <-----> |   user_school_roles   | <-----> |    school_units     |
+------------------+         +-----------------------+         +---------------------+
| id (PK)          |         | id (PK)               |         | id (PK)             |
| username         |         | user_id (FK)          |         | name                |
| account_type     |         | school_unit_id (FK)   |         | level               |
| status           |         | role_id (FK)          |         | is_active           |
+------------------+         +-----------------------+         +---------------------+
```

1. **`roles`**: Menyimpan daftar peran sistem dan kustom.
2. **`permissions`**: Menyimpan atom izin (*permission code*) dalam format `core.<module>.<action>`.
3. **`role_permissions`**: Tabel relasi many-to-many antara peran dan hak izin.
4. **`user_school_roles`**: Menghubungkan pengguna ke peran tertentu pada Satuan Pendidikan tertentu.

---

### 4.2 Standar Penamaan Kode Izin (`permissions.code`)

Format kode izin Core Service distandarkan dengan format:
`core.<module>.<submodule/resource>.<action>`

#### Daftar Standar Izin Core Service:

| Module (`permissions.module`) | Permission Code (`permissions.code`) | Deskripsi Izin |
|---|---|---|
| `core.auth` | `core.auth.login` | Mengakses endpoint login SSO |
| `core.auth` | `core.auth.password_resets.view` | Melihat daftar permohonan reset password |
| `core.auth` | `core.auth.password_resets.process` | Menyetujui/menolak permohonan reset password |
| `core.users` | `core.users.view` | Melihat daftar dan detail akun pengguna |
| `core.users` | `core.users.create` | Membuat akun admin baru |
| `core.users` | `core.users.edit` | Mengubah status aktif/nonaktif akun |
| `core.users` | `core.users.reset_password` | Mereset password akun pengguna lain |
| `core.roles` | `core.roles.view` | Melihat daftar master role dan permission |
| `core.roles` | `core.roles.manage` | Membuat, mengedit, dan menghapus master role kustom |
| `core.roles` | `core.roles.assign` | Menetapkan dan mencabut role user per Satuan Pendidikan |
| `core.logs` | `core.logs.login.view` | Melihat riwayat login dan aktivitas akun |
| `core.master` | `core.master.foundation.view` | Melihat informasi profil Yayasan |
| `core.master` | `core.master.foundation.edit` | Mengubah data profil Yayasan |
| `core.master` | `core.master.school_units.view` | Melihat daftar Satuan Pendidikan |
| `core.master` | `core.master.school_units.manage` | Menambah dan mengubah data Satuan Pendidikan |
| `core.master` | `core.master.school_units.toggle_status`| Mengaktifkan/menonaktifkan operasional sekolah |
| `core.settings`| `core.settings.view` | Melihat daftar konfigurasi sistem |
| `core.settings`| `core.settings.manage` | Menambah, mengubah, dan menghapus konfigurasi sistem |
| `core.integrations` | `core.integrations.webhooks.view` | Melihat log event dan status pengiriman webhook |
| `core.integrations` | `core.integrations.webhooks.manage` | Mengelola data subscriber dan retry pengiriman webhook |
| `core.integrations` | `core.integrations.api_clients.manage`| Mengelola API Clients dan Rate Limit Rules |
| `core.security` | `core.security.audit_logs.view` | Melihat log audit aktivitas admin lintas 14 aplikasi |
| `core.security` | `core.security.audit_logs.ingest` | Menerima pengiriman log aktivitas dari aplikasi satelit |

---

## 5. Implementasi Multi-Satuan-Pendidikan (Multi-Tenancy)

Sesuai **Keputusan Final #3 di ERD §0**, otorisasi pengguna tidak bersifat global kaku, melainkan diikat per Satuan Pendidikan via tabel `user_school_roles`.

### 5.1 Skenario Kasus Nyata

> **Kasus: Bpk. Muhammad Aris, S.Kom.**
> - Di **SMA Al-Depok Boarding School** (`school_unit_id = 1`): Bertugas sebagai Kepala Tata Usaha, sehingga diberikan role `admin_satuan_pendidikan`.
> - Di **SMP Al-Depok Boarding School** (`school_unit_id = 2`): Bertugas paruh waktu sebagai Tenaga Pengajar TIK, sehingga diberikan role `teacher` (guru biasa).
> - Di **SD Al-Depok Islamic Elementary School** (`school_unit_id = 3`): Tidak bertugas sama sekali.

#### Representasi Data pada Tabel Database:

**Tabel `users`:**
```sql
INSERT INTO users (id, username, full_name, account_type, status)
VALUES (45, 'aris.skom', 'Muhammad Aris, S.Kom.', 'staff', 'active');
```

**Tabel `user_school_roles`:**
```sql
-- Penugasan sebagai Admin di SMA (school_unit_id: 1)
INSERT INTO user_school_roles (user_id, school_unit_id, role_id)
VALUES (45, 1, 3); -- role_id 3: admin_satuan_pendidikan

-- Penugasan sebagai Guru di SMP (school_unit_id: 2)
INSERT INTO user_school_roles (user_id, school_unit_id, role_id)
VALUES (45, 2, 4); -- role_id 4: teacher
```

#### Implikasi Otorisasi Saat Mengakses API:
1. Saat Bpk. Aris mengakses `GET /api/v1/core/users?school_unit_id=1`:
   - Sistem memeriksa `user_school_roles` untuk unit ID `1`.
   - Menemukan role `admin_satuan_pendidikan` yang memiliki izin `core.users.view`.
   - **Hasil: Request DIIZINKAN (HTTP 200)** untuk melihat daftar pengguna SMA.
2. Saat Bpk. Aris mengakses `GET /api/v1/core/users?school_unit_id=2`:
   - Sistem memeriksa `user_school_roles` untuk unit ID `2`.
   - Menemukan role `teacher` yang **tidak** memiliki izin `core.users.view`.
   - **Hasil: Request DITOLAK (HTTP 403 Forbidden)**.
3. Saat Bpk. Aris mengakses `GET /api/v1/core/users?school_unit_id=3`:
   - Tidak ada entri penugasan sama sekali di `user_school_roles` untuk unit ID `3`.
   - **Hasil: Request DITOLAK (HTTP 403 Forbidden)**.

---

## 6. Integrasi Otorisasi dengan JWT Payload

Saat pengguna berhasil login (`POST /api/v1/core/auth/login`), Core Service menyematkan daftar peran dan izin efektif ke dalam JWT Payload:

```json
{
  "sub": 45,
  "username": "aris.skom",
  "account_type": "staff",
  "school_units": [
    {
      "unit_id": 1,
      "unit_name": "SMA Al-Depok Boarding School",
      "role": "admin_satuan_pendidikan",
      "permissions": [
        "core.users.view",
        "core.users.edit",
        "core.users.reset_password",
        "core.auth.password_resets.view",
        "core.auth.password_resets.process"
      ]
    },
    {
      "unit_id": 2,
      "unit_name": "SMP Al-Depok Boarding School",
      "role": "teacher",
      "permissions": [
        "akademik.nilai.view",
        "akademik.nilai.edit"
      ]
    }
  ],
  "iat": 1786878000,
  "exp": 1786881600
}
```

Dengan struktur token ini, 13 aplikasi satelit lainnya dapat langsung memeriksa hak akses pengguna secara cepat tanpa perlu melakukan query berulang ke database Core Service.

---

## 7. Status & Riwayat Dokumen

| Tanggal | Versi | Catatan Perubahan |
|---|---|---|
| 2026-08-16 | v1.1.0 | File diganti nama dari `roles.md` jadi `roles-coreservice.md`. Contoh path endpoint di Bagian 5 diperbarui ke prefix `/api/v1/core/...`. Referensi `erd.md`/`rancangan.md` diperbarui ke `erd-coreservice.md`/`rancangan-coreservice.md`. |
| 2026-08-16 | v1.0.0 | Penyusunan awal matriks role & permission Core Service. Meliputi pemetaan 13 fitur ke 6 peran (Super Admin, Admin Yayasan, Admin Satuan Pendidikan, Developer, Pengguna Swalayan, dan Internal Service), standarisasi skema izin `permissions.code`, serta dokumentasi skenario nyata multi-satuan pendidikan. |