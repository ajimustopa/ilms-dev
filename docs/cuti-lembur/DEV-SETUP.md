# PANDUAN PENGEMBANGAN DAN LINGKUNGAN DEV — CUTI, IZIN & LEMBUR

Status: Terverifikasi | Tanggal: 2026-10-07

---

## 1. Konfigurasi Lingkungan Database Dev Lokal

- **Host Database:** `127.0.0.1:3306` (Local MariaDB Daemon)
- **Database Modul:**
  - `core_dev`: Modul Core (User, Roles, School Units, Permissions)
  - `kepegawaian_dev`: Modul Kepegawaian (Employees, Attendance, Leave, Overtime, Holidays)
  - `akademik_dev`: Modul Akademik (Calendar, Students, Classes)

> **Catatan Keamanan:** Dilarang keras menyentuh host atau database `u622997391_*` (Production/Live Hostinger).

---

## 2. Struktur Branch Git

- **Branch Fitur Aktif:** `feature/kepegawaian-cuti-lembur`
  - Berisi implementasi penuh Modul Manajemen Cuti, Izin & Lembur (Tahap 1–10).
- **Branch Hotfix Keamanan:** `hotfix/kepegawaian-presensi-actor-guard`
  - Berisi pengamanan actor guard IDOR dan validasi akun pegawai aktif untuk endpoint presensi self-service (Tahap H-1).

---

## 3. Perintah Verifikasi & Eksekusi Pengujian

```bash
# Jalankan seluruh test suite unit & integrasi Kepegawaian (48 test cases)
node --test apps/api-backend/src/modules/kepegawaian/common/actorHelper.test.js apps/api-backend/src/modules/kepegawaian/attendance/actorGuard.integration.test.js apps/api-backend/src/modules/kepegawaian/attendance/calendarService.test.js apps/api-backend/src/modules/kepegawaian/leave/*.test.js

# Build dan validasi frontend Portal React
npm run build:portal
```
