# LAPORAN VERIFIKASI SINGKAT (READ-ONLY)
## Modul Manajemen Cuti, Izin & Lembur — Keamanan, Lingkungan & Hak Akses
**Core Aldepos — Modul Kepegawaian / HRIS**  
*Tanggal Verifikasi: 2026-10-07* | *Mode: 100% READ-ONLY INSPECTION*

---

## 1. LINGKUNGAN DATABASE (ENVIRONMENT)

### A. Database yang Digunakan Saat Ini
- **Kepegawaian:** `u622997391_kepegawaian`
- **Core Service:** `u622997391_core`
- **Akademik:** `u622997391_akademik`
- **Keuangan:** `u622997391_keuangan`
- **Status Database:** **LIVE / HOSTING REMOTE** (`153.92.15.118`).
- **Bukti:** `apps/api-backend/.env` mengonfigurasi `DB_HOST` ke server hosting cloud Hostinger dan `DB_NAME` ke prefix `u622997391_*`.

### B. Keberadaan Database Dev (`_dev` / `.env.dev`)
- **Status:** **BELUM ADA / TIDAK TERSEDIA**.
- **Bukti:**
  1. Tidak ditemukan file `.env.dev` di root repo maupun `apps/api-backend/`.
  2. Query `SHOW DATABASES` pada server MySQL tidak menemukan database berakhiran `_dev` (mis. `kepegawaian_dev` atau `u622997391_kepegawaian_dev`). Hanya database produksi/hosting yang ada.

### C. Lokasi Eksekusi Migrasi Batch 11–25 (Pekerjaan Presensi)
- **Status:** Seluruh migrasi batch 11–25 (15 file migrasi Knex dari `20261006140001` hingga `20261007230001`) telah dijalankan langsung pada database **`u622997391_kepegawaian`**.
- **Tabel `knex_migrations_kepegawaian`:** Tercatat **47 migrasi** (batch 1 s/d 25) pada database `u622997391_kepegawaian`. Tidak ada database dev terpisah untuk disinkronkan.

### D. Perintah Persis Menjalankan Backend & Portal

#### Menjalankan Terhadap Lingkungan Saat Ini (Remote Live)
```powershell
# Jalankan Backend API (Port 3000)
npm run dev:backend

# Jalankan Portal Frontend (Port 5173)
npm run dev:portal
```

#### Menjalankan Terhadap Lingkungan Lokal Dev (Jika DB Lokal Dikonfigurasi di Masa Depan)
```powershell
# Jalankan migrasi lokal (menggunakan konfigurasi default knexfile.js lokal)
$env:DB_HOST="127.0.0.1"; $env:KEPEGAWAIAN_DB_NAME="kepegawaian_local"; npm --workspace=apps/api-backend run migrate:kepegawaian

# Jalankan backend lokal
$env:DB_HOST="127.0.0.1"; npm run dev:backend

# Jalankan portal lokal
npm run dev:portal
```

---

## 2. HAK BACA `GET /leave-requests` DAN `GET /overtimes` (DAN `/my`)

### A. Temuan & Status Keamanan
- **Status:** **TERBUKTI CELAH (Information Disclosure / Missing BOLA Guard)**.

### B. Bukti Kode Sumber
1. **Route Definition (`apps/api-backend/src/modules/kepegawaian/attendance/routes.js:53 & 63`):**
   ```javascript
   router.get('/leave-requests', authenticate, attendanceController.listLeaveRequests);
   router.get('/overtimes', authenticate, attendanceController.listOvertimes);
   ```
   *Kedua route hanya memiliki middleware `authenticate`, tanpa `requirePermission('kepegawaian.leave_requests.manage')`.*
2. **Controller Handler (`apps/api-backend/src/modules/kepegawaian/attendance/controller.js:80-84 & 172-176`):**
   ```javascript
   async listLeaveRequests(req, res, next) {
     try {
       const result = await attendanceService.listLeaveRequests(req.query);
       res.status(200).json({ success: true, data: result, message: 'Daftar pengajuan cuti/izin berhasil diambil', errors: null });
     } catch (err) { next(err); }
   }
   ```
   *Perhatikan bahwa objek `req.user` sama sekali TIDAK diteruskan ke `attendanceService.listLeaveRequests`!*
3. **Service Layer (`apps/api-backend/src/modules/kepegawaian/attendance/service.js:1116-1141`):**
   ```javascript
   async listLeaveRequests(query = {}) {
     let baseQuery = db('employee_leave_requests')
       .leftJoin('employees as e', 'employee_leave_requests.employee_id', 'e.id')
       .leftJoin('employees as approver', 'employee_leave_requests.approved_by', 'approver.id')
       .select(
         'employee_leave_requests.*',
         'e.full_name as employee_name',
         'e.employee_number',
         'approver.full_name as approver_name'
       );

     if (query.employee_id) baseQuery = baseQuery.where('employee_leave_requests.employee_id', query.employee_id);
     if (query.school_unit_id) baseQuery = baseQuery.where('employee_leave_requests.school_unit_id', query.school_unit_id);
     if (query.status) baseQuery = baseQuery.where('employee_leave_requests.status', query.status);
     if (query.leave_type) baseQuery = baseQuery.where('employee_leave_requests.leave_type', query.leave_type);

     return baseQuery.orderBy('employee_leave_requests.id', 'desc');
   }
   ```

### C. Dampak Celah
- Jika seorang user non-HRD (mis. guru, staf, bahkan siswa) yang memiliki token JWT valid memanggil `GET /kepegawaian/leave-requests` tanpa parameter query, sistem akan **mengembalikan SELURUH data permohonan cuti semua pegawai lintas unit sekolah**.
- **Field yang Terbuka:**
  - `employee_leave_requests.*`: mencakup `reason` (alasan cuti yang bisa berisi riwayat medis sensitif, surat dokter, urusan keluarga pribadi), `start_date`, `end_date`, `status`, `rejection_reason`.
  - `attachment_url` & `attachment_name`: URL dan nama berkas lampiran surat dokter/dinas.
  - `employee_name` & `employee_number`: Nama lengkap dan NIP/NUPTK pegawai.
- **Kondisi `/my`:** Endpoint `GET /kepegawaian/leave-requests/my` (`service.js:1143-1185`) **TERBUKTI AMAN** karena memfilter data secara eksplisit menggunakan `employee_id = user.ref_id`. Namun celah tetap ada pada endpoint utama `/leave-requests`.

---

## 3. GUARD ANTI-IDOR PADA `POST /leave-requests` DAN `POST /overtimes`

### A. Temuan & Status Keamanan
- **Status:** **TERBUKTI CELAH (Flawed Role Whitelisting / IDOR Vulnerability)**.

### B. Bukti Kode Sumber (`apps/api-backend/src/modules/kepegawaian/attendance/service.js:1249-1268`)
```javascript
const isHRDOrAdmin = user && (
  user.role === 'super_admin' ||
  user.role === 'admin_yayasan' ||
  user.role === 'hrd' ||
  user.is_admin ||
  (user.permissions && (user.permissions.includes('kepegawaian.leave_requests.manage') || user.permissions.includes('superadmin')))
);

// Proteksi IDOR: Jika staff/guru self-service, wajib memakai ref_id miliknya sendiri
if (user && (user.ref_type === 'staff' || user.ref_type === 'teacher') && !isHRDOrAdmin) {
  employee_id = user.ref_id;
} else if (!employee_id && user && (user.ref_type === 'staff' || user.ref_type === 'teacher')) {
  employee_id = user.ref_id;
}
```

### C. Analisis Celah & Skenario Serangan
- **Masalah Logika:** Guard hanya memaksa `employee_id = user.ref_id` JIKA `user.ref_type === 'staff' || user.ref_type === 'teacher'`.
- **Skenario:** Jika akun dengan `ref_type: 'student'` (siswa) atau `ref_type: null` memanggil `POST /kepegawaian/leave-requests` dengan payload `{ employee_id: 2, leave_type: 'sakit', start_date: '2026-10-10', end_date: '2026-10-11', reason: 'Surat palsu' }`:
  1. `isHRDOrAdmin` bernilai `false`.
  2. `user.ref_type` bernilai `'student'` (bukan `'staff'`/`'teacher'`).
  3. Blok `if` proteksi dilewati tanpa error.
  4. Nilai `employee_id = 2` tetap dipertahankan.
  5. Sistem berhasil memasukkan pengajuan cuti atas nama Guru/Pegawai ID 2 ke database!
- Hal serupa terjadi pada `POST /kepegawaian/overtimes` (`service.js:1440-1444`).

### D. Distribusi Nilai `ref_type` di Tabel `users` Database Core
Berdasarkan query agregat riil pada `u622997391_core.users` (total 214 akun):

| `ref_type` | `account_type` | Jumlah Akun | Memiliki `ref_id` | Catatan |
|---|---|---|---|---|
| `student` | `student` | **171** | 171 (100%) | Akun Santri / Siswa (Dapat mengeksploitasi celah IDOR di atas jika tidak diblokir) |
| `staff` | `teacher` | **26** | 26 (100%) | Akun Guru (Terproteksi IDOR ke sesama guru) |
| `staff` | `staff` | **15** | 15 (100%) | Akun Staf TU & Karyawan (Terproteksi IDOR) |
| `NULL` | `admin` | **1** | 0 | Akun `superadmin` |
| `NULL` | `staff` | **1** | 0 | Akun Staf tanpa `ref_id` |

---

## 4. KETERSEDIAAN AKUN `hrd_smp` DAN PERMISSION ROLE `hrd`

### A. Keberadaan Akun HRD
- **Status:** **BELUM ADA (0 akun terdaftar)**.
- **Bukti:** Query pada `u622997391_core.users` dan `user_school_roles` untuk `role = 'hrd'` atau `username LIKE '%hrd%'` menghasilkan **0 baris**.
- Akun yang saat ini tersedia untuk pengujian:
  - `superadmin` (Role: `super_admin`) — Memiliki semua permission.
  - Akun Guru (`aji`, `septari`, `ahmad`, dll. — Role: `guru`).
  - Akun Staf (`ade` — Role: `staf`).

### B. Permission yang Dimiliki Role `hrd` di Database Core
Meskipun belum ada user yang ditugaskan, role `hrd` sudah terdaftar di `roles` (ID role di Core) dan memiliki **9 permissions**:

1. `kepegawaian.leave_requests.manage`: Persetujuan & Pengelolaan Permohonan Cuti/Izin
2. `kepegawaian.overtimes.manage`: Persetujuan & Pengelolaan Pengajuan Lembur
3. `kepegawaian.attendances.manage`: Pengelolaan Presensi & Absensi Pegawai (Koreksi, Tutup Periode, Input Manual)
4. `kepegawaian.attendances.read`: Melihat Data & Rekapitulasi Presensi Pegawai
5. `kepegawaian.manage`: Akses Penuh / Admin Modul Kepegawaian & SDM
6. `kepegawaian.view`: Hanya Tampil / View Only Modul Kepegawaian
7. `kepegawaian.work_schedules.manage`: Pengelolaan Master Jadwal Kerja & Shift
8. `kepegawaian.work_schedules.read`: Melihat Daftar Jadwal Kerja Pegawai
9. `core.view`: Akses Dasar Core Portal

---

## 5. INVENTARIS ENDPOINT BER-MIDDLEWARE `authenticate` SAJA

Berikut adalah daftar seluruh endpoint pada `apps/api-backend/src/modules/kepegawaian/attendance/routes.js` yang **hanya menggunakan middleware `authenticate`** (tanpa `requirePermission`), beserta alasan desain arsitekturnya:

| No | Method & Path | Kategori | Alasan Desain Arsitektur | Evaluasi Keamanan |
|---|---|---|---|---|
| 1 | `GET /attendances/dashboard-summary` | Presensi | Digunakan oleh widget dashboard guru & staf untuk melihat ringkasan presensi harian secara cepat. | **TERBUKTI AMAN** (Ada scoping unit di service layer `_resolveEffectiveSchoolUnit`) |
| 2 | `GET /attendances/today-status` | Presensi | Self-service guru: mengambil status check-in, check-out, jadwal, dan lokasi valid hari ini milik user login. | **TERBUKTI AMAN** (Scoping ketat ke `user.ref_id`) |
| 3 | `POST /attendances/check-in` | Presensi | Self-service guru/staf: tap masuk via GPS. Identitas diambil dari `user.ref_id`. | **TERBUKTI AMAN** |
| 4 | `PATCH /attendances/:id/check-out` | Presensi | Self-service guru/staf: tap keluar via GPS. Identitas diverifikasi terhadap pemilik record presensi. | **TERBUKTI AMAN** |
| 5 | `POST /attendances/clarifications` | Presensi | Self-service guru: pengajuan catatan presensi terlewat / lupa absen mandiri. | **TERBUKTI AMAN** |
| 6 | `GET /attendances/clarifications` | Presensi | Self-service guru: melihat riwayat klarifikasi pribadi. | **TERBUKTI AMAN** |
| 7 | `GET /attendances/clarifications/:id` | Presensi | Detail klarifikasi. Dilindungi guard kepemilikan di service. | **TERBUKTI AMAN** |
| 8 | `GET /leave-requests/my` | Cuti | Self-service guru: mengambil riwayat izin & cuti pribadi (`attendanceService.getMyLeaveRequests`). | **TERBUKTI AMAN** |
| 9 | `GET /leave-requests/:id/attachment` | Cuti | Unduh lampiran surat izin/dokter. Dilindungi guard `isOwner || isHRD` di service layer (`service.js:1207-1219`). | **TERBUKTI AMAN** |
| 10 | `GET /overtimes/my` | Lembur | Self-service guru: mengambil riwayat lembur pribadi. | **TERBUKTI AMAN** |
| 11 | `GET /leave-requests` | Cuti | Didesain untuk list tabel cuti HRD, namun luput dari middleware `requirePermission('kepegawaian.leave_requests.manage')`. | **TERBUKTI CELAH** (Non-HRD dapat melihat seluruh data cuti pegawai) |
| 12 | `GET /overtimes` | Lembur | Didesain untuk list tabel lembur HRD, namun luput dari middleware `requirePermission('kepegawaian.overtimes.manage')`. | **TERBUKTI CELAH** (Non-HRD dapat melihat seluruh data lembur pegawai) |
| 13 | `POST /leave-requests` | Cuti | Didesain untuk dual-use: guru mengajukan mandiri DAN HRD mengajukan atas nama pegawai lain. | **TERBUKTI CELAH** (Siswa/user non-staf dapat membuat cuti atas nama pegawai lain) |
| 14 | `POST /overtimes` | Lembur | Didesain untuk dual-use penugasan lembur mandiri / HRD. | **TERBUKTI CELAH** (Siswa/user non-staf dapat membuat lembur atas nama pegawai lain) |
| 15 | `GET /attendances` | Presensi | List riwayat presensi harian / bulanan. | **SEBAGIAN** (Perlu pengetatan filter unit/user jika diakses non-HRD) |
| 16 | `GET /attendances/:id/detail` | Presensi | Detail telemetri presensi. | **TERBUKTI AMAN** (Hanya data telemetri GPS) |
| 17 | `GET /schedule-assignments` & `/:id` | Jadwal | Melihat penugasan jadwal kerja pegawai. | **TERBUKTI AMAN** (Read-only data operasional) |
| 18 | `GET /locations` & `/:id` | Lokasi | Mengambil titik koordinat GPS master untuk validasi radius di sisi browser guru. | **TERBUKTI AMAN** |
| 19 | `GET /work-schedules` & `/:id` | Jadwal | Mengambil master jam kerja aktif untuk render jam kerja di portal guru. | **TERBUKTI AMAN** |

---

## REKOMENDASI PERBAIKAN UNTUK TAHAP IMPLEMENTASI

1. **Tambahkan Permission Guard pada List Global:**
   - Ubah `routes.js:53`: Pasang `requirePermission('kepegawaian.leave_requests.manage')` pada `GET /leave-requests`.
   - Ubah `routes.js:63`: Pasang `requirePermission('kepegawaian.overtimes.manage')` pada `GET /overtimes`.
   - Guru dan staf tetap menggunakan `GET /leave-requests/my` dan `GET /overtimes/my` yang aman.
2. **Koreksi Guard Anti-IDOR pada Endpoint Write (`POST /leave-requests` & `POST /overtimes`):**
   - Tolak secara tegas (`throw new Error('Hanya staf/guru atau HRD yang dapat membuat permohonan', 403)`) jika user bukan pegawai (`ref_type !== 'staff'`) dan tidak memiliki permission `kepegawaian.leave_requests.manage`.
3. **Buat Akun Uji Khusus Role HRD:**
   - Buat 1 akun pengujian baru (misal username: `hrd_smp`) yang terikat pada `role: 'hrd'` dan `school_unit_id: 1` agar pengujian fitur approval bertingkat dapat diverifikasi tanpa harus selalu memakai akun `superadmin`.

---
*Laporan verifikasi ini dibuat secara READ-ONLY dan seluruh temuan telah dibuktikan dengan path file dan nomor baris kode aktual.*
