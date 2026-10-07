# LAPORAN HOTFIX KEAMANAN — TAHAP H-1: ACTOR GUARD ENDPOINT PRESENSI SELF-SERVICE

Status: Selesai | Branch: `hotfix/kepegawaian-presensi-actor-guard` | Tanggal: 2026-10-07

---

## 1. Tabel Temuan Audit Endpoint Presensi Self-Service

| Endpoint | Method | Path | Apakah `ref_type` Diperiksa Sebelum Hotfix? | Apakah `ref_id` Diverifikasi ke Pegawai Aktif? | Risiko Keamanan Sebelumnya | Status Setelah Hotfix |
|---|---|---|---|---|---|---|
| `today-status` | `GET` | `/kepegawaian/attendances/today-status` | ❌ Tidak (`else if (user.ref_id)`) | ❌ Tidak | Siswa (`ref_type=student`, `ref_id=3`) membaca jadwal & presensi Pegawai 3 di DB Kepegawaian | 🔒 Dilindungi `resolveActor`: 403 `ACTOR_NOT_EMPLOYEE` untuk siswa/non-pegawai |
| `check-in` | `POST` | `/kepegawaian/attendances/check-in` | ⚠️ Parsial (hanya menimpa bila `staff`/`teacher`) | ❌ Tidak | Siswa dapat mengisi `payload.employee_id = 3` dan melakukan check-in atas nama pegawai | 🔒 Dilindungi `resolveActor` + `assertEmployeeActor`: dipaksa `actor.employeeId` (non-HR), siswa 403 |
| `check-out` | `PATCH` | `/kepegawaian/attendances/:id/check-out` | ⚠️ Parsial (hanya mencocokkan jika `staff`/`teacher`) | ❌ Tidak | Siswa dapat melakukan check-out atas nama sembarang catatan presensi pegawai | 🔒 Dilindungi `resolveActor`: non-HR wajib cocok dengan `actor.employeeId`, siswa 403 |
| `clarifications (POST)` | `POST` | `/kepegawaian/attendances/clarifications` | ⚠️ Parsial (hanya menimpa bila `staff`/`teacher`) | ❌ Tidak | Siswa dapat mengajukan klarifikasi lupa absen atas nama pegawai sembarang | 🔒 Dilindungi `resolveActor`: 403 `ACTOR_NOT_EMPLOYEE` untuk siswa |
| `clarifications (GET)` | `GET` | `/kepegawaian/attendances/clarifications` | ❌ Tidak | ❌ Tidak | Non-HR dapat melihat seluruh antrean klarifikasi unit | 🔒 Terkunci otomatis ke `query.employee_id = actor.employeeId` untuk non-HR |
| `clarifications/:id` | `GET` | `/kepegawaian/attendances/clarifications/:id` | ❌ Tidak | ❌ Tidak | Non-HR dapat melihat detail klarifikasi pegawai lain | 🔒 Dilindungi: Non-HR ditolak 403 bila bukan pemilik klarifikasi |
| `dashboard-summary` | `GET` | `/kepegawaian/attendances/dashboard-summary` | ❌ Tidak | ❌ Tidak | Non-HR dapat memanggil ringkasan metrik dasbor HRD | 🔒 Dibatasi 403 untuk non-HR |
| `leave-requests/my` | `GET` | `/kepegawaian/leave-requests/my` | ❌ Tidak (`else if (user.ref_id)`) | ❌ Tidak | Siswa dapat melihat daftar cuti milik pegawai ber-ID sama | 🔒 Dilindungi `resolveActor`: siswa 403 |
| `overtimes/my` | `GET` | `/kepegawaian/overtimes/my` | ❌ Tidak (`else if (user.ref_id)`) | ❌ Tidak | Siswa dapat melihat daftar lembur milik pegawai ber-ID sama | 🔒 Dilindungi `resolveActor`: siswa 403 |
| `leave attachment` | `GET` | `/kepegawaian/leave-requests/:id/attachment` | ⚠️ Memeriksa `user.ref_type === 'staff'` tapi HRD via role string | ❌ Tidak ke tabel pegawai | Kurang konsisten dengan sistem hak akses permission | 🔒 Menggunakan `resolveActor` (`actor.employeeId === leave.employee_id` atau `actor.isHR`) |
| `attendances (list)` | `GET` | `/kepegawaian/attendances` | ❌ Tidak | ❌ Tidak | Non-HR memanggil list tanpa `employee_id` melihat semua data presensi dan status sakit orang lain | 🔒 Non-HR dikunci otomatis ke `query.employee_id = actor.employeeId` |
| `attendances/:id/detail`| `GET` | `/kepegawaian/attendances/:id/detail` | ❌ Tidak | ❌ Tidak | IDOR telemetri GPS presensi pegawai lain | 🔒 Non-HR ditolak 403 jika ID presensi bukan milik dirinya |

---

## (a) File Dibuat & Diubah

- **Dibuat:**
  - `apps/api-backend/src/modules/kepegawaian/common/actorHelper.js`: Helper resolusi aktor `resolveActor(user)`, evaluasi murni `evaluateActor(user, employeeRecord)`, dan guard `assertEmployeeActor(actor)` sesuai SPEC §9.1.
  - `apps/api-backend/src/modules/kepegawaian/common/actorHelper.test.js`: Test suite unit murni untuk `evaluateActor` (6 skenario uji).
  - `apps/api-backend/src/modules/kepegawaian/attendance/actorGuard.integration.test.js`: Test suite integrasi keamanan endpoint presensi (6 skenario uji).
- **Diubah:**
  - `apps/api-backend/src/modules/kepegawaian/attendance/service.js`: Integrasi `resolveActor` dan `assertEmployeeActor` ke semua endpoint presensi self-service (`checkIn`, `checkOut`, `getTodayStatus`, `submitClarification`, `listClarifications`, `getClarificationDetail`, `getDashboardSummary`, `getMyLeaveRequests`, `getMyOvertimes`, `getLeaveAttachment`, `listAttendances`, `getAttendanceDetail`).

---

## (b) Migrasi & SQL yang Dijalankan

- **Tidak ada perintah tulis atau migrasi database skema pada tahap hotfix ini.**
- Database target: Dev Lokal (`kepegawaian_dev`, `core_dev` di `127.0.0.1:3306`) hanya operasi `SELECT` data pegawai.

---

## (c) Endpoint Baru & Berubah

Semua endpoint yang diubah mempertahankan bentuk amplop dan format respons sukses `{ success: true, data, message, errors: null }`. Perubahan hanya pada layer otorisasi aktor:

1. **`POST /kepegawaian/attendances/check-in`**:
   - Jika akun bukan pegawai aktif (`ref_type=student` atau NULL atau pegawai nonaktif) dan bukan HR -> Mengembalikan `403 ACTOR_NOT_EMPLOYEE`.
   - Jika non-HR pegawai -> `employee_id` dipaksa ke `actor.employeeId` (mencegah IDOR).
2. **`PATCH /kepegawaian/attendances/:id/check-out`**:
   - Non-HR yang mencoba check-out untuk presensi pegawai lain -> Ditolak `403`.
3. **`GET /kepegawaian/attendances/today-status`**:
   - Siswa / akun non-pegawai -> Ditolak `403 ACTOR_NOT_EMPLOYEE`.
4. **`POST /kepegawaian/attendances/clarifications`**:
   - Siswa / akun non-pegawai -> Ditolak `403 ACTOR_NOT_EMPLOYEE`.
5. **`GET /kepegawaian/attendances`**:
   - Non-HR pengguna -> Query secara otomatis dipaksa memfilter data miliknya sendiri (`query.employee_id = actor.employeeId`), sehingga status `sick` pegawai lain tidak bocor.
6. **`GET /kepegawaian/attendances/dashboard-summary`**:
   - Hanya diizinkan untuk aktor dengan permission HRD / SuperAdmin.

---

## (d) Langkah Uji Manual

1. **Uji Akun Siswa (IDOR Prevention):**
   - Kirim `GET /kepegawaian/attendances/today-status` dengan token akun Siswa (`ref_type: 'student', ref_id: 3`).
   - Verifikasi respons: `403 Forbidden` dengan payload `{ success: false, errors: [{ code: 'ACTOR_NOT_EMPLOYEE' }] }`.
2. **Uji Check-in Siswa Mengatasnamakan Pegawai:**
   - Kirim `POST /kepegawaian/attendances/check-in` dengan body `{ employee_id: 3, attendance_date: '2026-10-07' }` memakai token Siswa.
   - Verifikasi respons: `403 Forbidden` dengan kode `ACTOR_NOT_EMPLOYEE`.
3. **Uji Guru/Staff Valid:**
   - Kirim `GET /kepegawaian/attendances/today-status` dengan token Guru Budi (`ref_type: 'staff', ref_id: 3`).
   - Verifikasi respons: `200 OK` berisi data status presensi hari ini.
4. **Uji Query Presensi Non-HR:**
   - Kirim `GET /kepegawaian/attendances?employee_id=4` dengan token Guru Budi (`ref_id: 3`).
   - Verifikasi respons: Hanya mengembalikan data presensi Guru Budi (`employee_id: 3`), query `employee_id=4` diabaikan/ditolak.
5. **Uji Akun Superadmin / HRD:**
   - Kirim `GET /kepegawaian/attendances/dashboard-summary` dengan token SuperAdmin.
   - Verifikasi respons: `200 OK` berisi ringkasan metrik dasbor.

---

## (e) Hasil Pengujian

- **Pure Actor Helper Test (`actorHelper.test.js`):**
  ```text
  ✔ evaluateActor: Akun Siswa (ref_type=student) -> employeeId null & bukan HR
  ✔ evaluateActor: Akun dengan ref_type NULL -> employeeId null
  ✔ evaluateActor: Akun Guru/Staff Valid Aktif -> employeeId sesuai ref_id
  ✔ evaluateActor: Akun Pegawai Nonaktif -> employeeId null & isInactive true
  ✔ evaluateActor: Akun Staff dengan ref_id tidak ada di DB Kepegawaian
  ✔ evaluateActor: Akun HRD / SuperAdmin memiliki isHR=true dan lolos assertEmployeeActor
  Total: 6 Passed, 0 Failed
  ```
- **Integration Test Actor Guard (`actorGuard.integration.test.js`):**
  ```text
  ✔ Attendance Security: Siswa (ref_type=student) ditolak 403 saat check-in
  ✔ Attendance Security: Siswa (ref_type=student) ditolak 403 saat getTodayStatus
  ✔ Attendance Security: Siswa (ref_type=student) ditolak 403 saat submitClarification
  ✔ Attendance Security: Guru aktif (ref_type=staff, ref_id=3) berhasil memanggil today-status
  ✔ Attendance Security: Non-HR memanggil listAttendances hanya mendapatkan record miliknya
  ✔ Attendance Security: HRD / SuperAdmin dapat mengakses dashboard-summary
  Total: 6 Passed, 0 Failed
  ```
- **Semua Test Keseluruhan Modul Kepegawaian:**
  ```text
  ✔ calendarService.test.js (24 sub-checks passed)
  ✔ durationCalculator.test.js (22 passed)
  ✔ entitlementCalculator.test.js (8 passed)
  ✔ leave.integration.test.js (5 passed)
  Total: 42 Passed, 0 Failed (100% lulus)
  ```

---

## (f) Deviasi Desain

- Tidak ada perubahan UI pada tahap hotfix keamanan backend ini.

---

## (g) KEPUTUSAN OTOMATIS & Temuan di Luar Lingkup

### KEPUTUSAN OTOMATIS
1. **Fallback Tipe Akun:** `evaluateActor` memvalidasi `ref_type` terhadap whitelist `['staff', 'teacher', 'employee']`. Jika tidak termasuk dalam whitelist atau `ref_id` kosong/null, `employeeId` langsung disetel ke `null`.
2. **Penanganan Pegawai Nonaktif:** Jika akun berstatus `account_status !== 'active'` di tabel `employees`, aktor ditolak dengan `403 ACTOR_NOT_EMPLOYEE` (`isInactive: true`) untuk mencegah mantan pegawai yang akun portalnya belum dicabut melakukan presensi.
3. **Privasi Telemetri Presensi (`getAttendanceDetail`):** Endpoint detail presensi dan riwayat audit klarifikasi ditambahkan pengaman otorisasi kepemilikan sehingga pegawai non-HR hanya dapat mengakses rekaman miliknya sendiri.

### Temuan di Luar Lingkup
- Pada modul Akademik, mapping `ref_type='student'` dapat diverifikasi menggunakan helper serupa di modul akademik (`studentActorHelper`) saat modul tersebut diaudit.
