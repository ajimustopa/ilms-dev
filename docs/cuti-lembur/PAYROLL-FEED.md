# Kontrak Data Payroll Feed (Read-Only)

**Modul Kepegawaian (HRIS) · Core Aldepos**  
**Spesifikasi Acuan:** `docs/cuti-lembur/SPEC-CUTI-LEMBUR.md` §10.5, §2 #13, #19, #12

---

## 1. Ringkasan Endpoint

- **Method & Path**: `GET /api/v1/kepegawaian/payroll-feed`
- **Tujuan**: Menyediakan feed data rekap cuti, izin, dan lembur per pegawai dalam satu periode bulan kalender yang siap dikonsumsi oleh modul Penggajian (Payroll) secara aman dan terisolasi tanpa mengubah logika internal modul Penggajian.
- **Hak Akses (Permission)**:
  - `kepegawaian.leave_reports.read` atau `kepegawaian.leave_requests.manage` / `kepegawaian.leave_requests.read`
- **Query Parameters**:
  - `period` *(string, wajib)*: Format `YYYY-MM` (contoh: `2026-10`, `2028-05`). Default ke bulan berjalan WIB jika tidak diisi.
  - `school_unit_id` *(integer, opsional)*: Filter satuan pendidikan tertentu (disesuaikan dengan cakupan `unitScope` user di JWT).

---

## 2. Aturan Bisnis & Kontrak Data

1. **Aturan `pay_percent: null`**:
   - Jika suatu jenis cuti memiliki persentase bayar gaji `payroll_pay_percent = null` (misal jenis legacy `cuti_khusus` atau `lainnya` yang belum direklasifikasi/ditetapkan HRD), nilai `pay_percent` dalam feed **HARUS** dipertahankan sebagai `null`.
   - `null` menandakan status *"belum diputuskan"* dan tidak boleh diasumsikan `100` atau `0`.
   - Hari cuti ber-`pay_percent: null` tidak dimasukkan ke dalam perhitungan `unpaid_equivalent_days` otomatis.
2. **Aturan `unpaid_equivalent_days`**:
   - Menghitung akumulasi hari potong gaji dari cuti tidak bergaji (`pay_percent: 0` = 1.0 hari potong per hari cuti) atau cuti bergaji sebagian (`0 < pay_percent < 100` = `(100 - p) / 100` hari potong per hari cuti).
3. **Aturan `provisional` & `lock_status`**:
   - `lock_status`: `'open' | 'review' | 'locked' | 'submitted_to_payroll'` (bersumber dari status penguncian periode di `attendance_period_locks`).
   - `provisional: true`: Jika status periode masih `'open'` atau `'review'` (data presensi dan cuti masih dapat berubah sebelum penutupan resmi HRD).
   - `provisional: false`: Jika periode telah berstatus `'locked'` atau `'submitted_to_payroll'`.
4. **Deterministik `snapshot_hash`**:
   - Tiap item pegawai dan amplop response memiliki `snapshot_hash` berupa string SHA-256 hexdigest deterministik dari canonical JSON (dengan key objek yang diurutkan secara rekursif).
   - Menjamin integritas data dan deteksi perubahan saat dilakukan sinkronisasi ke modul Payroll.

---

## 3. Contoh Respon JSON

```json
{
  "success": true,
  "data": {
    "period": "2026-10",
    "school_unit_id": 1,
    "lock_status": "locked",
    "provisional": false,
    "as_of": "2026-10-08T07:15:00.000Z",
    "snapshot_hash": "a4f10738d4b316474cb459b7df8ad5ec55d67e54366624a9e46a7be7c3faef52",
    "total_employees": 12,
    "items": [
      {
        "employee_id": 3,
        "employee_number": "EMP003",
        "full_name": "Budi Santoso, S.Kom",
        "school_unit_id": 1,
        "position_title": "Guru Mata Pelajaran",
        "employment_status": "gty",
        "leave_days_by_type": [
          {
            "code": "cuti_tahunan",
            "name": "Cuti Tahunan",
            "category": "annual",
            "days": 3.0,
            "pay_percent": 100,
            "affects_attendance_allowance": false
          },
          {
            "code": "cuti_umrah",
            "name": "Cuti Ibadah Umrah",
            "category": "special",
            "days": 14.0,
            "pay_percent": 0,
            "affects_attendance_allowance": false
          },
          {
            "code": "cuti_khusus",
            "name": "Cuti Khusus",
            "category": "special",
            "days": 2.0,
            "pay_percent": null,
            "affects_attendance_allowance": false
          }
        ],
        "unpaid_equivalent_days": 14.0,
        "overtime": {
          "total_payable_hours": 5.5,
          "total_estimated_wage": null,
          "by_day_type": {
            "workday": { "payable_hours": 3.5, "estimated_wage": null },
            "weekend": { "payable_hours": 2.0, "estimated_wage": null },
            "holiday": { "payable_hours": 0.0, "estimated_wage": null }
          },
          "items": [
            {
              "id": 12,
              "overtime_date": "2026-10-14",
              "day_type": "workday",
              "payable_hours": 3.5,
              "multiplier_breakdown": null,
              "estimated_wage": null,
              "realization_status": "matched"
            }
          ]
        },
        "attendance": {
          "effective_work_days": 22,
          "present_count": 5,
          "sick_count": 0,
          "permission_count": 17,
          "leave_count": 17,
          "duty_travel_count": 0,
          "absent_count": 0,
          "late_count": 0,
          "late_minutes": 0,
          "total_work_hours": 42.5
        },
        "source_ids": {
          "leave_request_ids": [101, 102, 103],
          "overtime_ids": [12]
        },
        "snapshot_hash": "c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2"
      }
    ]
  },
  "message": "Feed data cuti & lembur ke payroll untuk periode 2026-10",
  "errors": null
}
```
