# LAPORAN IMPLEMENTASI — MODUL CUTI, IZIN & LEMBUR (TAHAP 6)

Status: Selesai | Branch: `feature/kepegawaian-cuti-lembur` | Tanggal: 2026-10-07

---

## (a) File Dibuat & Diubah

### Backend (`apps/api-backend`)
- `src/modules/kepegawaian/leave/durationCalculator.js`: Mesin perhitungan durasi murni (pure function tanpa ketergantungan DB, jam sistem, atau zona waktu), meliputi `computeDuration` / `computeLeaveDuration`, model porsi setengah hari (`start_portion`/`end_portion`), resolusi periode `periodOf` (basis Jul–Jun vs kalender), dan `computeEndDate` (presisi kalender & hari kerja efektif).
- `src/modules/kepegawaian/leave/durationCalculator.test.js`: 24 unit test suite `node:test` mencakup seluruh kasus T1–T21 SPEC §4.3, pengujian `periodOf`, dan `computeEndDate`.
- `src/modules/kepegawaian/leave/leaveService.js`: Penambahan metode `computeDurationForRequest` dan adapter `buildDayFacts` yang menghubungkan kalender kerja efektif pegawai (`calendarService`) serta hari libur (`holidayService`).
- `src/modules/kepegawaian/leave/controller.js`: Penambahan handler `previewDuration` untuk kalkulasi durasi cepat.
- `src/modules/kepegawaian/leave/routes.js`: Pendaftaran route `POST /leave-requests/preview-duration`.
- `src/modules/kepegawaian/leave/scripts/run_all_leave_tests.js`: Pembaruan test runner otomatis untuk mencakup Tahap 6.
- `src/modules/kepegawaian/leave/tahap6_duration_integration.test.js`: 8 automated integration test cases menguji alur mandiri guru, proteksi IDOR, pembatasan cakupan satuan HRD, penolakan akun siswa (403), validasi invarian, dan mode kalender.

---

## (b) Migrasi & SQL yang Dijalankan

### Target Database: `127.0.0.1:3306` (Local MariaDB - `kepegawaian_dev` & `core_dev`)
- **Tidak ada perintah migrasi DDL/skema baru pada tahap ini.** Tahap 6 berfokus pada mesin perhitungan murni dan endpoint durasi.

---

## (c) Endpoint Baru & Berubah (Method, Path, Permission)

| Method | Path | Permission / Guard | Keterangan |
|---|---|---|---|
| `POST` | `/api/v1/kepegawaian/leave-requests/preview-duration` | `authenticate` (Pegawai Aktif / HRD Scoped) | Endpoint ringan untuk pratinjau kalkulasi durasi hari kerja/kalender, rincian per hari, dan grouping per periode |

**Format Request Body:**
```json
{
  "employee_id": 3,
  "leave_type": "cuti_tahunan",
  "start_date": "2026-10-05",
  "end_date": "2026-10-09",
  "start_portion": "full",
  "end_portion": "full"
}
```

**Format Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "employee_id": 3,
    "leave_type": "cuti_tahunan",
    "leave_type_id": 1,
    "leave_type_name": "Cuti Tahunan",
    "count_mode": "work_days",
    "total_days": 5.0,
    "breakdown": [
      { "date": "2026-10-05", "state": "COUNTED", "weight": 1.0, "period": "2026/2027", "holiday_name": null },
      { "date": "2026-10-06", "state": "COUNTED", "weight": 1.0, "period": "2026/2027", "holiday_name": null },
      { "date": "2026-10-07", "state": "COUNTED", "weight": 1.0, "period": "2026/2027", "holiday_name": null },
      { "date": "2026-10-08", "state": "COUNTED", "weight": 1.0, "period": "2026/2027", "holiday_name": null },
      { "date": "2026-10-09", "state": "COUNTED", "weight": 1.0, "period": "2026/2027", "holiday_name": null }
    ],
    "by_period": {
      "2026/2027": 5.0
    },
    "warnings": []
  },
  "message": "Pratinjau durasi cuti berhasil dihitung",
  "errors": null
}
```

---

## (d) Langkah Uji Manual

1. **Uji Pengajuan Hari Kerja Penuh (T1):**
   ```bash
   curl -X POST http://localhost:3000/api/v1/kepegawaian/leave-requests/preview-duration \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN_GURU>" \
     -d '{"leave_type":"cuti_tahunan","start_date":"2026-10-05","end_date":"2026-10-09","start_portion":"full","end_portion":"full"}'
   ```
   *Ekspektasi: `total_days: 5.0`, seluruh breakdown berstatus `COUNTED`.*

2. **Uji Melewati Akhir Pekan (T2):**
   ```bash
   curl -X POST http://localhost:3000/api/v1/kepegawaian/leave-requests/preview-duration \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN_GURU>" \
     -d '{"leave_type":"cuti_tahunan","start_date":"2026-10-09","end_date":"2026-10-12"}'
   ```
   *Ekspektasi: `total_days: 2.0`, hari Sabtu dan Minggu berstatus `WEEKEND_OFF` dengan bobot 0.*

3. **Uji Setengah Hari di Ujung (T5):**
   ```bash
   curl -X POST http://localhost:3000/api/v1/kepegawaian/leave-requests/preview-duration \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN_GURU>" \
     -d '{"leave_type":"cuti_tahunan","start_date":"2026-10-05","end_date":"2026-10-07","start_portion":"pm","end_portion":"am"}'
   ```
   *Ekspektasi: `total_days: 2.0` (0.5 Sen + 1.0 Sel + 0.5 Rab).*

4. **Uji Penolakan Invarian (T15 & T16):**
   - Rentang terbalik (`start_date > end_date`): Mengembalikan HTTP 422 `INVALID_RANGE`.
   - Porsi tidak sah (`start_portion: 'am'` pada rentang multi-hari): Mengembalikan HTTP 422 `INVALID_PORTION`.

5. **Uji Proteksi IDOR & Hak Akses:**
   - Guru mencoba menghitung untuk ID pegawai lain: dipaksa ke `actor.employeeId` milik dirinya sendiri.
   - Akun siswa (`ref_type: 'student'`): Mengembalikan HTTP 403 `ACTOR_NOT_EMPLOYEE`.
   - HRD SMP mencoba menghitung pegawai SMA (Unit 2): Mengembalikan HTTP 403 `FORBIDDEN_SCOPE`.

---

## (e) Hasil Pengujian Otomatis

```
================================================================
RUNNING ALL LEAVE MODULE AUTOMATED TEST SUITES (TAHAP 1 - 6)
================================================================

[PASS] tahap1_foundation.test.js (20 tests passed)
[PASS] tahap1_integration.test.js (5 tests passed)
[PASS] tahap2_holidays_foundation.test.js (17 tests passed)
[PASS] tahap2_holidays_integration.test.js (7 tests passed)
[PASS] tahap4_master_types_foundation.test.js (19 tests passed)
[PASS] tahap4_master_types_integration.test.js (10 tests passed)
[PASS] durationCalculator.test.js (24 tests passed)
[PASS] tahap6_duration_integration.test.js (8 tests passed)

================================================================
TEST SUMMARY
================================================================
✅ tahap1_foundation.test.js: PASS
✅ tahap1_integration.test.js: PASS
✅ tahap2_holidays_foundation.test.js: PASS
✅ tahap2_holidays_integration.test.js: PASS
✅ tahap4_master_types_foundation.test.js: PASS
✅ tahap4_master_types_integration.test.js: PASS
✅ durationCalculator.test.js: PASS
✅ tahap6_duration_integration.test.js: PASS

Total Suites Passed: 8 / 8
🎉 ALL TEST SUITES PASSED CLEANLY (100%)!
```

- **Uji Lintas Zona Waktu:**
  `TZ=Asia/Jakarta`, `TZ=UTC`, dan `TZ=America/Los_Angeles` menghasilkan output yang identik 100% tanpa pergeseran tanggal.

---

## (f) Deviasi Desain

- Tidak ada deviasi UI baru pada tahap ini (tahap fokus pada mesin engine backend & endpoint kalkulasi durasi).

---

## (g) Keputusan Otomatis, Risiko & Temuan di Luar Lingkup

### KEPUTUSAN OTOMATIS
1. **Pemisahan `periodOf` Murni:** Fungsi `periodOf(dateStr, periodStartMonth)` dibuat parametris dengan nilai default `7` (basis tahun ajaran Jul–Jun sesuai SPEC §5.1), namun tetap mendukung basis tahun kalender (`periodStartMonth = 1`) tanpa hardcode.
2. **Prioritas Non-Kerja atas Libur:** Sesuai prinsip SPEC §4.2, hari non-kerja (akhir pekan) menang atas hari libur nasional (`WEEKEND_OFF`), sehingga libur yang jatuh di hari Sabtu/Minggu tidak dikurangi ganda pada kalkulasi hari kerja.
3. **Porsi Multi-Hari:** Memvalidasi secara ketat bahwa rentang multi-hari hanya boleh dimulai `full` atau `pm` (siang ke atas), dan berakhir `full` atau `am` (pagi saja) sesuai SPEC §4.1.

### Temuan di Luar Lingkup
- Integrasi pratinjau penuh yang melibatkan pengecekan saldo, kuota tersisa, dan deteksi konflik jadwal presensi akan dirangkai pada Tahap 9B (Preview Pengajuan Komprehensif).
