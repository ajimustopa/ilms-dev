# Kontrak API Core Service (v1) — Sistem Manajemen Sekolah Terintegrasi

> Dokumen ini adalah spesifikasi kontrak RESTful API resmi untuk **Core Service**. Menjadi acuan tunggal untuk implementasi backend Core Service dan integrasi 13 aplikasi satelit lainnya dalam ekosistem Sistem Manajemen Sekolah Terintegrasi.
>
> **Revisi 2026-08-16:** Base URL & seluruh path endpoint diperbarui mengikuti arsitektur monorepo
> 3 domain (`ARSITEKTUR-SISTEM.md` Bagian 1.1) — Core Service sekarang dilayani lewat backend
> tunggal `api.aldeposibs.com` dengan prefix `/api/v1/core/...`, bukan lagi domain
> `core.aldeposibs.com` yang kini dipakai untuk frontend Portal Aplikasi Internal. Nama file juga
> berganti dari `api-contract.md` menjadi `api-contract-coreservice.md` supaya tidak bentrok
> dengan kontrak API 13 modul lain yang disimpan di file terpisah dengan pola nama yang sama
> (`api-contract-akademik.md`, dst) di root proyek yang sama.

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/core`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/core`
- **Lokal Development:** `http://localhost:3000/api/v1/core`

---

### 1.2 Skema Autentikasi & Otorisasi

Core Service mendukung dua metode autentikasi utama:

1. **Bearer Token (JWT) — untuk Pengguna (Admin, Guru, Pegawai, Siswa, Orang Tua):**
   ```http
   Authorization: Bearer <access_token>
   ```
   Access Token berupa JSON Web Token (JWT) yang diterbitkan saat login. Berisi payload standar identitas user, `account_type`, dan daftar hak akses per Satuan Pendidikan (`user_school_roles`). Masa berlaku access token adalah **15–60 menit** (diatur via `CORE_JWT_EXPIRES_IN`).

2. **API Key (`X-API-Key`) — untuk Internal Service-to-Service (13 Aplikasi Satelit):**
   ```http
   X-API-Key: <service_api_key>
   ```
   Digunakan oleh aplikasi satelit (misal: Akademik, Kepegawaian) saat memanggil **Internal Endpoint** (seperti provisioning akun atau pengiriman log aktivitas admin lintas aplikasi).

3. **Webhook Signature Header (`X-Webhook-Signature`):**
   ```http
   X-Webhook-Signature: sha256=<hmac_hash>
   ```
   Disertakan pada setiap payload event yang dipublish Core Service ke endpoint subscriber untuk verifikasi integritas data.

---

### 1.3 Standar Struktur Response JSON

Seluruh response dari Core Service **wajib** mengikuti struktur amplop JSON konsisten:

#### Format Response Sukses (HTTP 200, 201)
```json
{
  "success": true,
  "data": { ... } | [ ... ] | null,
  "message": "Pesan sukses operasi",
  "errors": null
}
```

#### Format Response Gagal / Validasi / Error (HTTP 4xx, 5xx)
```json
{
  "success": false,
  "data": null,
  "message": "Pesan ringkas kegagalan",
  "errors": [
    {
      "field": "username",
      "message": "Username sudah terdaftar"
    }
  ]
}
```

---

### 1.4 Kode Status HTTP yang Digunakan

| Kode HTTP | Status | Keterangan Penggunaan |
|---|---|---|
| `200 OK` | Sukses | Request GET, PUT, PATCH berhasil, atau POST non-kreasi |
| `201 Created` | Berhasil Dibuat | Request POST berhasil membuat entitas/resource baru |
| `400 Bad Request` | Permintaan Tidak Valid | Format JSON salah atau parameter wajib tidak ada |
| `401 Unauthorized` | Belum Terautentikasi | Token tidak disertakan, kedaluwarsa, atau API Key salah |
| `403 Forbidden` | Tidak Memiliki Izin | Token valid tapi role/permission tidak memiliki hak akses |
| `404 Not Found` | Data Tidak Ditemukan | Resource dengan ID/Key yang dicari tidak ditemukan |
| `409 Conflict` | Konflik Data | Pelanggaran nilai unik (mis. username/NPSN sudah ada) |
| `422 Unprocessable Entity` | Validasi Gagal | Format payload benar tapi melanggar aturan validasi data |
| `429 Too Many Requests` | Melebihi Batas Rate Limit | Melebihi kuota request per menit yang ditentukan |
| `500 Internal Server Error` | Kesalahan Server | Terjadi error internal di server Core Service |

---

### 1.5 Definisi Aktor & Role (Berdasarkan ERD)

1. **Tipe Akun Pengguna (`account_type` di tabel `users`):**
   - `admin` : Administrator sistem (Super Admin / Admin Yayasan / Admin Sekolah)
   - `teacher` : Tenaga Pengajar / Guru
   - `staff` : Tenaga Kependidikan / Pegawai non-guru
   - `student` : Siswa
   - `parent` : Orang Tua / Wali Siswa
2. **Role Sistem (`roles` & `user_school_roles`):**
   - `super_admin` : Akses penuh ke seluruh fitur dan data lintas Satuan Pendidikan
   - `admin_yayasan` : Pengelola level yayasan (Profil Yayasan, Satuan Pendidikan, System Settings)
   - `admin_sekolah` : Administrator khusus pada 1 atau lebih Satuan Pendidikan tertentu
3. **Internal Service (`internal_service`):**
   - Aplikasi satelit terverifikasi (Akademik, Kepegawaian, Keuangan, dsb.) via API Key
4. **Public (`public`):**
   - Siapa saja tanpa login (login SSO, pengajuan lupa password, dokumentasi OpenAPI publik)

---

## 2. Daftar & Detail Endpoint per Modul

---

### MODUL 1: AUTENTIKASI

#### 1.1 Fitur #1: Login SSO (JWT) & Sesi

---

##### `POST /api/v1/core/auth/login`
- **Tipe:** Endpoint Pengguna
- **Aktor:** `public` (Semua Pengguna)
- **Status HTTP:** `200 OK`, `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`
- **Deskripsi:** Autentikasi utama seluruh ekosistem sekolah. Menerima kredensial pengguna dan mengembalikan Access Token (JWT) serta Refresh Token. Jika user aktif di beberapa Satuan Pendidikan, informasi sekolah & role dikembalikan dalam payload.

**Request Body:**
```json
{
  "username": "guru.ahmad",
  "password": "Password123!",
  "school_unit_id": 1
}
```
*Catatan:* `school_unit_id` opsional; jika user memiliki multi-role dan tidak mengirimkan ID ini, sistem memilih peran default atau peran pertama yang aktif.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "token_type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "refresh_token": "rt_8f9c2d1e0a4b7c6f...",
    "user": {
      "id": 12,
      "username": "guru.ahmad",
      "full_name": "Ahmad Fauzi, S.Pd.",
      "account_type": "teacher",
      "ref_type": "staff",
      "ref_id": 45,
      "active_school_unit": {
        "id": 1,
        "name": "SMA Al-Depok Boarding School",
        "level": "SMA"
      },
      "roles": [
        {
          "role_id": 3,
          "role_name": "guru_mapel",
          "school_unit_id": 1
        }
      ],
      "permissions": [
        "akademik.nilai.view",
        "akademik.nilai.edit",
        "tahfidz.halaqah.view"
      ]
    }
  },
  "message": "Login berhasil",
  "errors": null
}
```

**Response Gagal (`401 Unauthorized`):**
```json
{
  "success": false,
  "data": null,
  "message": "Username atau password salah",
  "errors": null
}
```

---

##### `POST /api/v1/core/auth/refresh-token`
- **Tipe:** Endpoint Pengguna
- **Aktor:** `public` (Pengguna yang memiliki Refresh Token valid)
- **Status HTTP:** `200 OK`, `400 Bad Request`, `401 Unauthorized`
- **Deskripsi:** Memperbarui Access Token yang sudah kedaluwarsa dengan menyertakan Refresh Token aktif. Mendukung perputaran token (Refresh Token Rotation) untuk keamanan.

**Request Body:**
```json
{
  "refresh_token": "rt_8f9c2d1e0a4b7c6f..."
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "token_type": "Bearer",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...",
    "expires_in": 3600,
    "refresh_token": "rt_9012abef34cd56gh..."
  },
  "message": "Token berhasil diperbarui",
  "errors": null
}
```

**Response Gagal (`401 Unauthorized`):**
```json
{
  "success": false,
  "data": null,
  "message": "Refresh token tidak valid atau sudah dicabut",
  "errors": null
}
```

---

##### `POST /api/v1/core/auth/logout`
- **Tipe:** Endpoint Pengguna
- **Aktor:** Authenticated User (`admin`, `teacher`, `staff`, `student`, `parent`)
- **Status HTTP:** `200 OK`, `401 Unauthorized`
- **Deskripsi:** Menghapus sesi aktif dengan mencabut (*revoke*) Refresh Token dari database sehingga tidak dapat digunakan kembali.

**Request Body:**
```json
{
  "refresh_token": "rt_8f9c2d1e0a4b7c6f..."
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Logout berhasil dan sesi telah diakhiri",
  "errors": null
}
```

---

##### `GET /api/v1/core/auth/me`
- **Tipe:** Endpoint Pengguna
- **Aktor:** Authenticated User
- **Status HTTP:** `200 OK`, `401 Unauthorized`
- **Deskripsi:** Mengambil informasi detail profil user yang sedang login, daftar penugasan Satuan Pendidikan, dan izin akses aktif.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "username": "guru.ahmad",
    "full_name": "Ahmad Fauzi, S.Pd.",
    "account_type": "teacher",
    "ref_type": "staff",
    "ref_id": 45,
    "status": "active",
    "last_login_at": "2026-08-16T10:15:30Z",
    "school_roles": [
      {
        "school_unit_id": 1,
        "school_name": "SMA Al-Depok Boarding School",
        "role_id": 3,
        "role_name": "guru_mapel"
      }
    ],
    "permissions": [
      "akademik.nilai.view",
      "akademik.nilai.edit"
    ]
  },
  "message": "Profil berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/auth/verify-token`
- **Tipe:** Endpoint Internal & Integrasi
- **Aktor:** `internal_service`, Authenticated User
- **Status HTTP:** `200 OK`, `400 Bad Request`, `401 Unauthorized`
- **Deskripsi:** Memvalidasi keabsahan token JWT secara langsung ke Core Service (opsi verifikasi sentral untuk 13 aplikasi satelit).

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "user_id": 12,
    "username": "guru.ahmad",
    "account_type": "teacher",
    "roles": ["guru_mapel"],
    "permissions": ["akademik.nilai.view", "akademik.nilai.edit"],
    "expires_at": "2026-08-16T12:00:00Z"
  },
  "message": "Token valid",
  "errors": null
}
```

---

#### 1.2 Fitur #2: Lupa Password (Pengajuan Reset ke Admin)

---

##### `POST /api/v1/core/auth/forgot-password/request`
- **Tipe:** Endpoint Pengguna
- **Aktor:** `public` (Semua Pengguna)
- **Status HTTP:** `201 Created`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Pengajuan permohonan reset password dari pengguna ke admin (karena nomor HP/email verifikasi perlu dikonfirmasi oleh admin sekolah/yayasan).

**Request Body:**
```json
{
  "username": "guru.ahmad",
  "contact": "081234567890",
  "school_unit_id": 1
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "request_id": 5,
    "username": "guru.ahmad",
    "request_status": "pending",
    "requested_at": "2026-08-16T11:20:00Z"
  },
  "message": "Permintaan reset password telah diajukan ke admin",
  "errors": null
}
```

---

##### `GET /api/v1/core/password-resets`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `401 Unauthorized`, `403 Forbidden`
- **Deskripsi:** Menampilkan daftar permohonan reset password pengguna untuk ditinjau admin.

**Query Parameter:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `request_status` (string: `pending`, `approved`, `rejected`)
- `school_unit_id` (integer)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 5,
        "user_id": 12,
        "username": "guru.ahmad",
        "full_name": "Ahmad Fauzi, S.Pd.",
        "contact": "081234567890",
        "school_unit_id": 1,
        "school_name": "SMA Al-Depok Boarding School",
        "request_status": "pending",
        "requested_at": "2026-08-16T11:20:00Z",
        "processed_by": null,
        "processed_at": null
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 1,
      "total_pages": 1
    }
  },
  "message": "Daftar permintaan reset password berhasil dimuat",
  "errors": null
}
```

---

##### `PATCH /api/v1/core/password-resets/:id/process`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Admin menyetujui atau menolak permohonan reset password. Jika disetujui, admin dapat mengeset password sementara atau meminta sistem menghasilkan password acak.

**Request Body:**
```json
{
  "request_status": "approved",
  "temp_password": "PasswordSementara123!"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "request_id": 5,
    "request_status": "approved",
    "processed_by": 1,
    "processed_at": "2026-08-16T11:35:00Z"
  },
  "message": "Permintaan reset password berhasil diproses dan password pengguna telah diperbarui",
  "errors": null
}
```

---

#### 1.3 Fitur #3: Manajemen User & Reset Password

> **PENTING:** Akun siswa, orangtua, guru, dan pegawai **tidak dibuat manual** di UI Core Service. Akun otomatis terbuat dari modul asal (Akademik & Kepegawaian) melalui endpoint internal di bawah ini. UI Core hanya membuat akun tipe `admin` dan mengelola status/reset password akun yang ada.

---

##### `POST /api/v1/core/internal/users`
- **Tipe:** **Internal Endpoint (Dipanggil oleh Akademik / Kepegawaian)**
- **Aktor:** `internal_service` (`X-API-Key`)
- **Status HTTP:** `201 Created`, `400 Bad Request`, `409 Conflict`, `422 Unprocessable Entity`
- **Deskripsi:** Digunakan oleh aplikasi **Kepegawaian** (saat tambah guru/staf) dan **Akademik** (saat registrasi siswa/ortu) untuk pembuatan akun otomatis secara sinkron di Core Service.

**Request Body:**
```json
{
  "username": "nis_2026001",
  "password": "PasswordAwal123!",
  "full_name": "Muhammad Rizky",
  "account_type": "student",
  "ref_type": "student",
  "ref_id": 1082,
  "school_unit_id": 1,
  "role_id": 5
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 105,
    "username": "nis_2026001",
    "full_name": "Muhammad Rizky",
    "account_type": "student",
    "ref_type": "student",
    "ref_id": 1082,
    "status": "active",
    "assigned_school_unit_id": 1,
    "assigned_role_id": 5
  },
  "message": "Akun berhasil dibuat otomatis",
  "errors": null
}
```

**Response Gagal (`409 Conflict`):**
```json
{
  "success": false,
  "data": null,
  "message": "Username atau referensi entitas sudah memiliki akun aktif",
  "errors": [
    {
      "field": "username",
      "message": "Username nis_2026001 sudah digunakan"
    }
  ]
}
```

---

##### `PATCH /api/v1/core/internal/users/sync`
- **Tipe:** **Internal Endpoint (Dipanggil oleh Akademik / Kepegawaian)**
- **Aktor:** `internal_service` (`X-API-Key`)
- **Status HTTP:** `200 OK`, `404 Not Found`, `422 Unprocessable Entity`
- **Deskripsi:** Sinkronisasi pembaruan data nama atau status akun dari aplikasi asal (mis. pegawai nonaktif atau siswa mutasi).

**Request Body:**
```json
{
  "ref_type": "student",
  "ref_id": 1082,
  "full_name": "Muhammad Rizky Pratama",
  "status": "inactive"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 105,
    "username": "nis_2026001",
    "full_name": "Muhammad Rizky Pratama",
    "status": "inactive"
  },
  "message": "Data akun berhasil disinkronkan",
  "errors": null
}
```

---

##### `GET /api/v1/core/users`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `401 Unauthorized`, `403 Forbidden`
- **Deskripsi:** Menampilkan daftar seluruh akun pengguna dengan filter multi-kriteria.

**Query Parameter:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `search` (string: cari username/full_name)
- `account_type` (string: `admin`, `teacher`, `staff`, `student`, `parent`)
- `status` (string: `active`, `inactive`)
- `school_unit_id` (integer)
- `role_id` (integer)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 12,
        "username": "guru.ahmad",
        "full_name": "Ahmad Fauzi, S.Pd.",
        "account_type": "teacher",
        "ref_type": "staff",
        "ref_id": 45,
        "status": "active",
        "last_login_at": "2026-08-16T10:15:30Z",
        "school_roles": [
          {
            "school_unit_id": 1,
            "school_name": "SMA Al-Depok Boarding School",
            "role_name": "guru_mapel"
          }
        ]
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 150,
      "total_pages": 8
    }
  },
  "message": "Daftar pengguna berhasil dimuat",
  "errors": null
}
```

---

##### `GET /api/v1/core/users/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengambil rincian akun pengguna berdasarkan ID.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "username": "guru.ahmad",
    "full_name": "Ahmad Fauzi, S.Pd.",
    "account_type": "teacher",
    "ref_type": "staff",
    "ref_id": 45,
    "status": "active",
    "last_login_at": "2026-08-16T10:15:30Z",
    "created_at": "2026-01-10T08:00:00Z",
    "user_school_roles": [
      {
        "id": 24,
        "school_unit_id": 1,
        "school_name": "SMA Al-Depok Boarding School",
        "role_id": 3,
        "role_name": "guru_mapel"
      }
    ]
  },
  "message": "Detail pengguna berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/users`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `201 Created`, `400 Bad Request`, `409 Conflict`
- **Deskripsi:** Pembuatan user **khusus tipe `admin`** secara langsung dari UI Core Service.

**Request Body:**
```json
{
  "username": "admin.sma",
  "password": "PasswordKuat123!",
  "full_name": "Budi Santoso (Admin SMA)",
  "account_type": "admin",
  "roles": [
    {
      "school_unit_id": 1,
      "role_id": 2
    }
  ]
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 13,
    "username": "admin.sma",
    "full_name": "Budi Santoso (Admin SMA)",
    "account_type": "admin",
    "status": "active"
  },
  "message": "Akun admin berhasil dibuat",
  "errors": null
}
```

---

##### `PATCH /api/v1/core/users/:id/status`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Mengubah status aktif / nonaktif akun pengguna.

**Request Body:**
```json
{
  "status": "inactive"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "username": "guru.ahmad",
    "status": "inactive"
  },
  "message": "Status akun berhasil diperbarui",
  "errors": null
}
```

---

##### `POST /api/v1/core/users/:id/reset-password`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Reset password paksa oleh admin untuk akun pengguna tertentu.

**Request Body:**
```json
{
  "new_password": "PasswordBaruAdmin123!"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "username": "guru.ahmad"
  },
  "message": "Password pengguna berhasil direset",
  "errors": null
}
```

---

##### `PUT /api/v1/core/users/change-password`
- **Tipe:** Endpoint Pengguna Mandiri
- **Aktor:** Authenticated User (Mengubah password miliknya sendiri)
- **Status HTTP:** `200 OK`, `400 Bad Request`, `422 Unprocessable Entity`
- **Deskripsi:** Pengguna mengganti password akunnya sendiri dengan memverifikasi password lama.

**Request Body:**
```json
{
  "old_password": "PasswordLama123!",
  "new_password": "PasswordBaruKuat123!",
  "confirm_password": "PasswordBaruKuat123!"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Password Anda berhasil diperbarui",
  "errors": null
}
```

---

#### 1.4 Fitur #4: Role & Permission Management

---

##### `GET /api/v1/core/roles`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil daftar seluruh master role dalam sistem.

**Query Parameter:**
- `search` (string: cari nama role)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "super_admin",
      "description": "Akses penuh seluruh modul dan sekolah",
      "is_system_role": true,
      "total_permissions": 120
    },
    {
      "id": 3,
      "name": "guru_mapel",
      "description": "Peran guru mata pelajaran",
      "is_system_role": false,
      "total_permissions": 15
    }
  ],
  "message": "Daftar role berhasil dimuat",
  "errors": null
}
```

---

##### `GET /api/v1/core/roles/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Detail role beserta daftar `permission_id` dan kode izin yang terpasang.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "guru_mapel",
    "description": "Peran guru mata pelajaran",
    "is_system_role": false,
    "permissions": [
      {
        "id": 10,
        "code": "akademik.nilai.view",
        "module": "akademik",
        "description": "Melihat nilai siswa"
      },
      {
        "id": 11,
        "code": "akademik.nilai.edit",
        "module": "akademik",
        "description": "Menginput dan mengedit nilai siswa"
      }
    ]
  },
  "message": "Detail role berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/roles`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `201 Created`, `400 Bad Request`, `409 Conflict`
- **Deskripsi:** Menambahkan role kustom baru ke dalam master data.

**Request Body:**
```json
{
  "name": "wali_kelas",
  "description": "Hak akses wali kelas untuk input catatan rapor",
  "permission_ids": [10, 11, 25, 26]
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "wali_kelas",
    "description": "Hak akses wali kelas untuk input catatan rapor",
    "is_system_role": false
  },
  "message": "Role berhasil dibuat",
  "errors": null
}
```

---

##### `PUT /api/v1/core/roles/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Memperbarui deskripsi role dan daftar izin (permissions) yang terkait.

**Request Body:**
```json
{
  "name": "wali_kelas",
  "description": "Hak akses wali kelas dan absensi harian",
  "permission_ids": [10, 11, 25, 26, 30]
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "wali_kelas"
  },
  "message": "Role berhasil diperbarui",
  "errors": null
}
```

---

##### `DELETE /api/v1/core/roles/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Menghapus role kustom. Role dengan `is_system_role: true` atau yang masih memiliki relasi aktif di `user_school_roles` ditolak penghapusannya.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Role berhasil dihapus",
  "errors": null
}
```

---

##### `GET /api/v1/core/permissions`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil daftar seluruh master permissions sistem yang dikelompokkan per modul/aplikasi.

**Query Parameter:**
- `module` (string: mis. `akademik`, `keuangan`, `core`)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "code": "akademik.nilai.view",
      "module": "akademik",
      "description": "Melihat nilai siswa"
    },
    {
      "id": 11,
      "code": "akademik.nilai.edit",
      "module": "akademik",
      "description": "Menginput dan mengedit nilai siswa"
    }
  ],
  "message": "Daftar permissions berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/users/:id/school-roles`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Menetapkan peran spesifik user pada Satuan Pendidikan tertentu (`user_school_roles`). Mengakomodasi skenario guru/staf yang mengajar di lebih dari satu sekolah dengan peran berbeda.

**Request Body:**
```json
{
  "school_unit_id": 2,
  "role_ids": [3, 6]
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "user_id": 12,
    "school_unit_id": 2,
    "assigned_roles": [3, 6]
  },
  "message": "Role penugasan sekolah berhasil diperbarui",
  "errors": null
}
```

---

##### `DELETE /api/v1/core/users/:id/school-roles/:user_school_role_id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mencabut peran penugasan user pada Satuan Pendidikan tertentu.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Penugasan role sekolah berhasil dicabut",
  "errors": null
}
```

---

#### 1.5 Fitur #5: Audit Log Login & Aktivitas (Tabel `activity_logs`)

---

##### `GET /api/v1/core/activity-logs/login`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `401 Unauthorized`, `403 Forbidden`
- **Deskripsi:** Menampilkan riwayat log aktivitas login, login gagal, dan aktivitas umum user pada Core Service (`log_type` in `['login', 'general_activity']`).

**Query Parameter:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `user_id` (integer)
- `school_unit_id` (integer)
- `action` (string: `login_success`, `login_failed`, `logout`)
- `start_date` (ISO Date: `2026-08-01`)
- `end_date` (ISO Date: `2026-08-31`)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1042,
        "log_type": "login",
        "user_id": 12,
        "username": "guru.ahmad",
        "full_name": "Ahmad Fauzi, S.Pd.",
        "school_unit_id": 1,
        "action": "login_success",
        "ip_address": "180.252.160.10",
        "occurred_at": "2026-08-16T10:15:30Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 420,
      "total_pages": 21
    }
  },
  "message": "Riwayat log login berhasil dimuat",
  "errors": null
}
```

---

### MODUL 2: DATA MASTER

#### 2.1 Fitur #6: Profil Yayasan

---

##### `GET /api/v1/core/foundation`
- **Tipe:** Endpoint Terbuka / Pengguna / Satelit
- **Aktor:** `public`, Authenticated User, `internal_service`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengambil data profil Yayasan (entitas singleton/induk). Digunakan seluruh aplikasi untuk header/branding laporan resmi.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Yayasan Pendidikan Al-Depok Sejahtera",
    "address": "Jl. Raya Sawangan No. 45, Pancoran Mas, Kota Depok, Jawa Barat",
    "phone_number": "021-77889900",
    "email": "sekretariat@aldeposibs.com",
    "chairman_name": "Dr. H. Ahmad Dahlan, M.Pd.",
    "logo": "https://core.aldeposibs.com/storage/foundation/logo.png",
    "updated_at": "2026-08-01T07:00:00Z"
  },
  "message": "Profil yayasan berhasil dimuat",
  "errors": null
}
```

---

##### `PUT /api/v1/core/foundation`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `422 Unprocessable Entity`
- **Deskripsi:** Memperbarui informasi profil Yayasan.

**Request Body (`multipart/form-data` atau `application/json`):**
```json
{
  "name": "Yayasan Pendidikan Al-Depok Sejahtera",
  "address": "Jl. Raya Sawangan No. 45, Pancoran Mas, Kota Depok, Jawa Barat",
  "phone_number": "021-77889900",
  "email": "sekretariat@aldeposibs.com",
  "chairman_name": "Dr. H. Ahmad Dahlan, M.Pd.",
  "logo": "https://core.aldeposibs.com/storage/foundation/logo.png"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Yayasan Pendidikan Al-Depok Sejahtera",
    "chairman_name": "Dr. H. Ahmad Dahlan, M.Pd."
  },
  "message": "Profil yayasan berhasil diperbarui",
  "errors": null
}
```

---

#### 2.2 Fitur #7: CRUD Satuan Pendidikan & Status History

---

##### `GET /api/v1/core/school-units`
- **Tipe:** Endpoint Umum & Integrasi
- **Aktor:** `public`, Authenticated User, `internal_service`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil daftar seluruh Satuan Pendidikan (TK, SD, SMP, SMA) di bawah Yayasan. Menjadi rujukan `school_unit_id` di seluruh 14 aplikasi.

**Query Parameter:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `is_active` (boolean: `true`, `false`)
- `level` (string: `TK`, `SD`, `SMP`, `SMA`, `SMK`)
- `search` (string: nama sekolah / NPSN)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "foundation_id": 1,
        "name": "SMA Al-Depok Boarding School",
        "level": "SMA",
        "npsn": "20268901",
        "address": "Jl. K.H. Ahmad Dahlan No. 10, Depok",
        "principal_name": "Drs. Hendro Wibowo, M.Si.",
        "phone_number": "021-77112233",
        "email": "sma@aldeposibs.com",
        "website": "https://sma.aldeposibs.com",
        "logo": "https://core.aldeposibs.com/storage/schools/sma-logo.png",
        "operating_license": "421.3/089-Disdik/2020",
        "is_active": true
      },
      {
        "id": 2,
        "foundation_id": 1,
        "name": "SMP Al-Depok Boarding School",
        "level": "SMP",
        "npsn": "20268902",
        "address": "Jl. K.H. Ahmad Dahlan No. 12, Depok",
        "principal_name": "Siti Nurhaliza, S.Pd.",
        "phone_number": "021-77112244",
        "email": "smp@aldeposibs.com",
        "website": "https://smp.aldeposibs.com",
        "logo": "https://core.aldeposibs.com/storage/schools/smp-logo.png",
        "operating_license": "421.2/045-Disdik/2018",
        "is_active": true
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 50,
      "total_items": 2,
      "total_pages": 1
    }
  },
  "message": "Daftar satuan pendidikan berhasil dimuat",
  "errors": null
}
```

---

##### `GET /api/v1/core/school-units/:id`
- **Tipe:** Endpoint Umum & Integrasi
- **Aktor:** Authenticated User, `internal_service`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengambil detail lengkap satu Satuan Pendidikan.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "foundation_id": 1,
    "name": "SMA Al-Depok Boarding School",
    "level": "SMA",
    "npsn": "20268901",
    "address": "Jl. K.H. Ahmad Dahlan No. 10, Depok",
    "principal_name": "Drs. Hendro Wibowo, M.Si.",
    "phone_number": "021-77112233",
    "email": "sma@aldeposibs.com",
    "website": "https://sma.aldeposibs.com",
    "logo": "https://core.aldeposibs.com/storage/schools/sma-logo.png",
    "operating_license": "421.3/089-Disdik/2020",
    "is_active": true
  },
  "message": "Detail satuan pendidikan berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/school-units`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `201 Created`, `400 Bad Request`, `409 Conflict`
- **Deskripsi:** Menambahkan Satuan Pendidikan baru di bawah naungan Yayasan.

**Request Body:**
```json
{
  "name": "SD Al-Depok Islamic Elementary School",
  "level": "SD",
  "npsn": "20268903",
  "address": "Jl. Raya Cinere No. 18, Depok",
  "principal_name": "Rahmat Hidayat, M.Pd.",
  "phone_number": "021-77556677",
  "email": "sd@aldeposibs.com",
  "website": "https://sd.aldeposibs.com",
  "logo": "https://core.aldeposibs.com/storage/schools/sd-logo.png",
  "operating_license": "421.1/012-Disdik/2022",
  "is_active": true
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "SD Al-Depok Islamic Elementary School",
    "level": "SD",
    "npsn": "20268903",
    "is_active": true
  },
  "message": "Satuan pendidikan berhasil ditambahkan",
  "errors": null
}
```

---

##### `PUT /api/v1/core/school-units/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Memperbarui data Satuan Pendidikan.

**Request Body:**
```json
{
  "name": "SMA Al-Depok Boarding School",
  "level": "SMA",
  "npsn": "20268901",
  "address": "Jl. K.H. Ahmad Dahlan No. 10, Depok",
  "principal_name": "Drs. Hendro Wibowo, M.Si.",
  "phone_number": "021-77112233",
  "email": "sma@aldeposibs.com",
  "website": "https://sma.aldeposibs.com",
  "logo": "https://core.aldeposibs.com/storage/schools/sma-logo.png",
  "operating_license": "421.3/089-Disdik/2020"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "SMA Al-Depok Boarding School"
  },
  "message": "Data satuan pendidikan berhasil diperbarui",
  "errors": null
}
```

---

##### `PATCH /api/v1/core/school-units/:id/status`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Mengubah status operasional aktif/nonaktif Satuan Pendidikan dan wajib merekam alasan ke tabel `school_unit_status_history`.

**Request Body:**
```json
{
  "is_active": false,
  "reason": "Renovasi total gedung sekolah, operasional dialihkan sementara"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "school_unit_id": 3,
    "is_active": false,
    "reason": "Renovasi total gedung sekolah, operasional dialihkan sementara",
    "changed_by": 1,
    "changed_at": "2026-08-16T11:45:00Z"
  },
  "message": "Status satuan pendidikan berhasil diubah dan riwayat telah dicatat",
  "errors": null
}
```

---

##### `GET /api/v1/core/school-units/:id/status-history`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengambil riwayat perubahan status aktif/nonaktif suatu Satuan Pendidikan.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_unit_id": 3,
      "new_status": false,
      "reason": "Renovasi total gedung sekolah, operasional dialihkan sementara",
      "changed_by": 1,
      "changed_by_name": "Super Administrator",
      "changed_at": "2026-08-16T11:45:00Z"
    }
  ],
  "message": "Riwayat status satuan pendidikan berhasil dimuat",
  "errors": null
}
```

---

#### 2.3 Fitur #8: Pengaturan Sistem (Site Settings)

---

##### `GET /api/v1/core/system-settings`
- **Tipe:** Endpoint Admin & Integrasi
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`, `internal_service`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil daftar konfigurasi sistem. Mendukung resolusi berjenjang: jika `school_unit_id` disertakan, nilai spesifik sekolah akan menggantikan default yayasan (*override*).

**Query Parameter:**
- `school_unit_id` (integer, opsional: jika null mengambil konfigurasi global yayasan)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_unit_id": null,
      "setting_key": "app.maintenance_mode",
      "setting_value": "false",
      "description": "Mode pemeliharaan sistem global"
    },
    {
      "id": 2,
      "school_unit_id": 1,
      "setting_key": "academic.grading_scale",
      "setting_value": "0-100",
      "description": "Skala penilaian akademik SMA"
    }
  ],
  "message": "Pengaturan sistem berhasil dimuat",
  "errors": null
}
```

---

##### `GET /api/v1/core/system-settings/:key`
- **Tipe:** Endpoint Admin & Integrasi
- **Aktor:** `super_admin`, `admin_yayasan`, `admin_sekolah`, `internal_service`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengambil nilai satu kunci pengaturan tertentu dengan prioritas override Satuan Pendidikan.

**Query Parameter:**
- `school_unit_id` (integer, opsional)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "setting_key": "app.timezone",
    "setting_value": "Asia/Jakarta",
    "effective_scope": "global"
  },
  "message": "Nilai konfigurasi ditemukan",
  "errors": null
}
```

---

##### `POST /api/v1/core/system-settings`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `201 Created`, `400 Bad Request`, `409 Conflict`
- **Deskripsi:** Menambahkan pasangan kunci-nilai konfigurasi baru.

**Request Body:**
```json
{
  "school_unit_id": null,
  "setting_key": "auth.max_failed_login",
  "setting_value": "5",
  "description": "Batas maksimal percobaan login gagal sebelum akun terkunci"
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "setting_key": "auth.max_failed_login",
    "setting_value": "5"
  },
  "message": "Pengaturan sistem berhasil disimpan",
  "errors": null
}
```

---

##### `PUT /api/v1/core/system-settings/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Memperbarui nilai konfigurasi yang sudah ada.

**Request Body:**
```json
{
  "setting_value": "3",
  "description": "Batas maksimal percobaan login diperketat menjadi 3 kali"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "setting_key": "auth.max_failed_login",
    "setting_value": "3"
  },
  "message": "Pengaturan sistem berhasil diperbarui",
  "errors": null
}
```

---

##### `DELETE /api/v1/core/system-settings/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Menghapus pengaturan konfigurasi.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Pengaturan sistem berhasil dihapus",
  "errors": null
}
```

---

### MODUL 3: INTEGRASI

#### 3.1 Fitur #9: Webhook Publisher

Core Service bertindak sebagai **publisher webhook utama** untuk perubahan data akun, Satuan Pendidikan, dan profil Yayasan.

##### Format Standar Payload Webhook Keluar
Semua event yang dikirimkan Core Service ke URL endpoint subscriber mengikuti skema:
```json
{
  "event_type": "account.created",
  "timestamp": "2026-08-16T11:50:00Z",
  "satuan_pendidikan_id": 1,
  "data": {
    "user_id": 105,
    "username": "nis_2026001",
    "full_name": "Muhammad Rizky",
    "account_type": "student",
    "ref_type": "student",
    "ref_id": 1082,
    "status": "active"
  }
}
```

---

##### `GET /api/v1/core/webhooks/events`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Melihat riwayat seluruh log event yang diterbitkan oleh Core Service (`webhook_events`).

**Query Parameter:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `event_type` (string: mis. `account.created`, `school_unit.updated`)
- `school_unit_id` (integer)
- `start_date` (ISO Date)
- `end_date` (ISO Date)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 501,
        "event_type": "account.created",
        "school_unit_id": 1,
        "published_at": "2026-08-16T11:50:00Z",
        "total_deliveries": 3,
        "successful_deliveries": 3
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 501,
      "total_pages": 26
    }
  },
  "message": "Daftar riwayat event webhook berhasil dimuat",
  "errors": null
}
```

---

##### `GET /api/v1/core/webhooks/events/:id`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Melihat rincian payload event dan status pengiriman ke masing-masing subscriber (`webhook_deliveries`).

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 501,
    "event_type": "account.created",
    "school_unit_id": 1,
    "published_at": "2026-08-16T11:50:00Z",
    "payload": {
      "user_id": 105,
      "username": "nis_2026001",
      "account_type": "student"
    },
    "deliveries": [
      {
        "delivery_id": 1201,
        "subscriber_id": 1,
        "application_name": "portal_ortu",
        "endpoint_url": "https://ortu.aldeposibs.com/api/v1/core/webhooks/core",
        "delivery_status": "success",
        "attempt_count": 1,
        "response_code": 200,
        "delivered_at": "2026-08-16T11:50:02Z"
      },
      {
        "delivery_id": 1202,
        "subscriber_id": 2,
        "application_name": "perpustakaan",
        "endpoint_url": "https://perpus.aldeposibs.com/api/v1/core/webhooks/core",
        "delivery_status": "failed",
        "attempt_count": 3,
        "response_code": 503,
        "delivered_at": "2026-08-16T11:50:15Z"
      }
    ]
  },
  "message": "Detail event webhook berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/webhooks/deliveries/:id/retry`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Memaksa pengiriman ulang (*retry*) pengiriman webhook yang gagal ke subscriber.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "delivery_id": 1202,
    "delivery_status": "success",
    "attempt_count": 4,
    "response_code": 200,
    "delivered_at": "2026-08-16T11:55:00Z"
  },
  "message": "Pengiriman ulang webhook berhasil",
  "errors": null
}
```

---

#### 3.2 Fitur #10: Webhook Subscriber Management

---

##### `GET /api/v1/core/webhooks/subscribers`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil daftar aplikasi yang terdaftar sebagai penerima webhook dari Core Service.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "application_name": "portal_ortu",
      "endpoint_url": "https://ortu.aldeposibs.com/api/v1/core/webhooks/core",
      "subscribed_events": ["account.created", "account.updated", "account.status_changed"],
      "status": "active",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "message": "Daftar subscriber webhook berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/webhooks/subscribers`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `201 Created`, `400 Bad Request`, `422 Unprocessable Entity`
- **Deskripsi:** Mendaftarkan aplikasi baru untuk berlangganan event webhook dari Core Service. Mengembalikan `secret_key` untuk verifikasi signature.

**Request Body:**
```json
{
  "application_name": "keuangan",
  "endpoint_url": "https://keuangan.aldeposibs.com/api/v1/core/webhooks/core",
  "subscribed_events": [
    "account.created",
    "account.status_changed",
    "school_unit.updated"
  ],
  "status": "active"
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "application_name": "keuangan",
    "endpoint_url": "https://keuangan.aldeposibs.com/api/v1/core/webhooks/core",
    "subscribed_events": [
      "account.created",
      "account.status_changed",
      "school_unit.updated"
    ],
    "secret_key": "whsec_99a8b7c6d5e4f3a2b1c0d9e8f7...",
    "status": "active"
  },
  "message": "Subscriber webhook berhasil didaftarkan. Simpan secret_key ini dengan aman.",
  "errors": null
}
```

---

##### `PUT /api/v1/core/webhooks/subscribers/:id`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Memperbarui URL endpoint, event yang dilanggan, atau status subscriber.

**Request Body:**
```json
{
  "endpoint_url": "https://keuangan-v2.aldeposibs.com/api/v1/core/webhooks/core",
  "subscribed_events": [
    "account.created",
    "account.updated",
    "account.status_changed",
    "school_unit.updated"
  ],
  "status": "active"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "application_name": "keuangan",
    "endpoint_url": "https://keuangan-v2.aldeposibs.com/api/v1/core/webhooks/core"
  },
  "message": "Subscriber webhook berhasil diperbarui",
  "errors": null
}
```

---

##### `POST /api/v1/core/webhooks/subscribers/:id/rotate-secret`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Menghasilkan ulang secret key untuk subscriber yang mengalami kebocoran kredensial.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "new_secret_key": "whsec_new_77b8c9d0e1f2a3b4c5d6..."
  },
  "message": "Secret key webhook berhasil diperbarui",
  "errors": null
}
```

---

##### `DELETE /api/v1/core/webhooks/subscribers/:id`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Menghapus pendaftaran subscriber webhook.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Subscriber webhook berhasil dihapus",
  "errors": null
}
```

---

#### 3.3 Fitur #11: Dokumentasi API (OpenAPI)

---

##### `GET /api/v1/core/docs/openapi.json`
- **Tipe:** Endpoint Terbuka
- **Aktor:** `public`, `developer`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Menyediakan berkas spesifikasi OpenAPI v3.0 dalam format JSON untuk keperluan integrasi otomatis, Swagger UI, atau postman collection.

**Response Sukses (`200 OK`):**
```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Core Service API",
    "version": "1.0.0",
    "description": "API Gateway & Central Authentication Service untuk Sistem Manajemen Sekolah Terintegrasi"
  },
  "servers": [
    {
      "url": "https://api.aldeposibs.com/api/v1/core",
      "description": "Production Server"
    }
  ],
  "paths": { ... }
}
```

---

##### `GET /api/v1/core/docs`
- **Tipe:** Endpoint Terbuka (UI)
- **Aktor:** `public`, `developer`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Antarmuka Swagger UI interaktif untuk menguji seluruh endpoint Core Service di peramban web.

---

#### 3.4 Fitur #12: Rate Limiting & API Gateway

---

##### `GET /api/v1/core/api-clients`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil daftar klien/aplikasi satelit yang terdaftar untuk akses API Gateway internal.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "client_name": "akademik_service",
      "status": "active",
      "created_at": "2026-01-10T08:00:00Z"
    },
    {
      "id": 2,
      "client_name": "kepegawaian_service",
      "status": "active",
      "created_at": "2026-01-10T08:00:00Z"
    }
  ],
  "message": "Daftar API client berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/api-clients`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `201 Created`, `400 Bad Request`
- **Deskripsi:** Mendaftarkan API Client baru untuk aplikasi satelit. Mengembalikan raw `api_key` (hanya ditampilkan satu kali saat registrasi).

**Request Body:**
```json
{
  "client_name": "keuangan_service",
  "status": "active"
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "client_name": "keuangan_service",
    "api_key": "core_ak_live_7a8b9c0d1e2f3a4b5c6d7e8f9...",
    "status": "active"
  },
  "message": "API Client berhasil dibuat. Simpan API Key ini, kunci tidak akan ditampilkan kembali.",
  "errors": null
}
```

---

##### `PATCH /api/v1/core/api-clients/:id/status`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Mengaktifkan atau menonaktifkan izin akses API Client.

**Request Body:**
```json
{
  "status": "inactive"
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "status": "inactive"
  },
  "message": "Status API Client berhasil diperbarui",
  "errors": null
}
```

---

##### `GET /api/v1/core/rate-limit-rules`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`
- **Deskripsi:** Mengambil aturan pembatasan laju panggilan (Rate Limit Rules).

**Query Parameter:**
- `api_client_id` (integer, opsional: filter per klien spesifik)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "api_client_id": null,
      "endpoint": "/api/v1/core/auth/login",
      "limit_per_minute": 10,
      "client_name": "Global / Anonymous"
    },
    {
      "id": 2,
      "api_client_id": 1,
      "endpoint": "/api/v1/core/*",
      "limit_per_minute": 500,
      "client_name": "akademik_service"
    }
  ],
  "message": "Daftar aturan rate limit berhasil dimuat",
  "errors": null
}
```

---

##### `POST /api/v1/core/rate-limit-rules`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `201 Created`, `400 Bad Request`
- **Deskripsi:** Menambahkan aturan pembatasan kuota request baru.

**Request Body:**
```json
{
  "api_client_id": null,
  "endpoint": "/api/v1/core/auth/forgot-password/request",
  "limit_per_minute": 5
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "api_client_id": null,
    "endpoint": "/api/v1/core/auth/forgot-password/request",
    "limit_per_minute": 5
  },
  "message": "Aturan rate limit berhasil dibuat",
  "errors": null
}
```

---

##### `PUT /api/v1/core/rate-limit-rules/:id`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `400 Bad Request`, `404 Not Found`
- **Deskripsi:** Memperbarui batasan limit per menit atau endpoint target.

**Request Body:**
```json
{
  "endpoint": "/api/v1/core/auth/forgot-password/request",
  "limit_per_minute": 3
}
```

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "limit_per_minute": 3
  },
  "message": "Aturan rate limit berhasil diperbarui",
  "errors": null
}
```

---

##### `DELETE /api/v1/core/rate-limit-rules/:id`
- **Tipe:** Endpoint Admin & Developer (UI Core)
- **Aktor:** `super_admin`, `developer`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Menghapus aturan rate limit.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": null,
  "message": "Aturan rate limit berhasil dihapus",
  "errors": null
}
```

---

### MODUL 4: KEAMANAN

#### 4.1 Fitur #13: Audit Log Aktivitas Admin Lintas Aplikasi (Tabel `activity_logs`)

Sesuai **Keputusan Final #2 di ERD**, Fitur #5 dan Fitur #13 digabung dalam satu tabel `activity_logs` dengan kolom pembeda `log_type = 'admin_action'` untuk aktivitas administratif lintas aplikasi.

---

##### `POST /api/v1/core/internal/activity-logs`
- **Tipe:** **Internal Endpoint (Dipanggil oleh 13 Aplikasi Satelit Lain)**
- **Aktor:** `internal_service` (`X-API-Key`)
- **Status HTTP:** `201 Created`, `400 Bad Request`, `422 Unprocessable Entity`
- **Deskripsi:** Ingest sentral log aktivitas admin dari 13 aplikasi lain (misalnya admin Akademik menghapus rombel, atau admin Keuangan mengubah tagihan SPP).

**Request Body:**
```json
{
  "log_type": "admin_action",
  "user_id": 1,
  "school_unit_id": 1,
  "application": "akademik",
  "module": "rombongan_belajar",
  "action": "delete",
  "data_before": {
    "id": 14,
    "name": "Kelas X IPA 1",
    "homeroom_teacher_id": 45
  },
  "data_after": null,
  "ip_address": "180.252.160.10"
}
```

**Response Sukses (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": 8901,
    "application": "akademik",
    "action": "delete",
    "occurred_at": "2026-08-16T11:58:30Z"
  },
  "message": "Audit log aktivitas admin berhasil dicatat",
  "errors": null
}
```

---

##### `GET /api/v1/core/activity-logs/admin`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `401 Unauthorized`, `403 Forbidden`
- **Deskripsi:** Query sentral untuk menampilkan dan memfilter seluruh log audit aktivitas admin lintas 14 aplikasi (dipakai oleh modul Pengelolaan & Pengawasan Yayasan).

**Query Parameter:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `application` (string: `akademik`, `kepegawaian`, `keuangan`, `sarpras`, dll.)
- `module` (string: nama modul terkait)
- `action` (string: `create`, `update`, `delete`, `approve`, `reject`)
- `user_id` (integer)
- `school_unit_id` (integer)
- `start_date` (ISO Date: `2026-08-01`)
- `end_date` (ISO Date: `2026-08-31`)

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 8901,
        "log_type": "admin_action",
        "user_id": 1,
        "admin_username": "superadmin",
        "admin_name": "Super Administrator",
        "school_unit_id": 1,
        "school_name": "SMA Al-Depok Boarding School",
        "application": "akademik",
        "module": "rombongan_belajar",
        "action": "delete",
        "ip_address": "180.252.160.10",
        "occurred_at": "2026-08-16T11:58:30Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 1280,
      "total_pages": 64
    }
  },
  "message": "Daftar audit log aktivitas admin berhasil dimuat",
  "errors": null
}
```

---

##### `GET /api/v1/core/activity-logs/admin/:id`
- **Tipe:** Endpoint Admin (UI Core)
- **Aktor:** `super_admin`, `admin_yayasan`
- **Status HTTP:** `200 OK`, `404 Not Found`
- **Deskripsi:** Menampilkan detail spesifik dari satu entri log audit admin, termasuk rekaman data sebelum dan sesudah perubahan (`data_before` vs `data_after`) dalam format JSON diff.

**Response Sukses (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": 8901,
    "log_type": "admin_action",
    "user_id": 1,
    "admin_username": "superadmin",
    "admin_name": "Super Administrator",
    "school_unit_id": 1,
    "school_name": "SMA Al-Depok Boarding School",
    "application": "akademik",
    "module": "rombongan_belajar",
    "action": "delete",
    "ip_address": "180.252.160.10",
    "occurred_at": "2026-08-16T11:58:30Z",
    "data_before": {
      "id": 14,
      "name": "Kelas X IPA 1",
      "homeroom_teacher_id": 45,
      "academic_year": "2026/2027"
    },
    "data_after": null
  },
  "message": "Detail audit log admin berhasil dimuat",
  "errors": null
}
```

---

## 3. Matriks Hak Akses Endpoint (Role Matrix)

| Endpoint | Method | Public | Student / Parent | Teacher / Staff | Admin Sekolah | Admin Yayasan | Super Admin | Internal Service |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/auth/login` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/refresh-token` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/logout` | POST | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/me` | GET | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/auth/verify-token` | POST | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/forgot-password/request` | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/password-resets` | GET | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/password-resets/:id/process` | PATCH | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/internal/users` | POST | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/internal/users/sync` | PATCH | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/users` | GET | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/users/:id` | GET | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/users` (Admin Create) | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/users/:id/status` | PATCH | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/users/:id/reset-password` | POST | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/users/change-password` | PUT | ❌ | ✅ (Self) | ✅ (Self) | ✅ (Self) | ✅ (Self) | ✅ (Self) | ❌ |
| `/roles` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/roles` | POST/PUT/DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/permissions` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/users/:id/school-roles` | POST/DELETE | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/activity-logs/login` | GET | ❌ | ❌ | ❌ | ✅ (Unit) | ✅ | ✅ | ❌ |
| `/foundation` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/foundation` | PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/school-units` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/school-units` | POST/PUT | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/school-units/:id/status` | PATCH | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/school-units/:id/status-history`| GET | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/system-settings` | GET | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/system-settings` | POST/PUT/DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/webhooks/*` | ALL | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `/docs/*` | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api-clients/*` | ALL | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/rate-limit-rules/*` | ALL | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/internal/activity-logs` | POST | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/activity-logs/admin` | GET | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

---

## 4. Status & Riwayat Dokumen

| Tanggal | Versi | Catatan Perubahan |
|---|---|---|
| 2026-08-16 | v1.1.0 | File diganti nama dari `api-contract.md` jadi `api-contract-coreservice.md`. Base URL production/staging/lokal diperbarui ke `api.aldeposibs.com/api/v1/core` (sebelumnya `core.aldeposibs.com/api/v1`), dan seluruh path endpoint di dokumen ini (Bagian 2) diberi prefix `/core/` mengikuti backend tunggal `api-backend` sesuai `ARSITEKTUR-SISTEM.md` Bagian 1.1. Referensi ke dokumen lain (`rancangan.md`, `erd.md`) diperbarui ke nama file baru `rancangan-coreservice.md`, `erd-coreservice.md`. |
| 2026-08-16 | v1.0.0 | Penyusunan awal kontrak API lengkap untuk seluruh 13 fitur Core Service sesuai `rancangan.md` §4 dan `erd.md` (Final). Standarisasi format amplop response `{ success, data, message, errors }`, pemisahan endpoint internal vs admin UI, dan rincian skema SSO/JWT untuk integrasi 13 aplikasi satelit. |