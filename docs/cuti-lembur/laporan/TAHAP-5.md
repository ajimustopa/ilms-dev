# LAPORAN IMPLEMENTASI — MODUL CUTI, IZIN & LEMBUR (TAHAP 5)

Status: Selesai | Branch: `feature/kepegawaian-cuti-lembur` | Tanggal: 2026-10-07

---

## (a) File Dibuat & Diubah

### 1. Frontend Portal (`apps/core-portal`)
- `src/apps/kepegawaian/pages/cuti-lembur/LeaveSettingsTab.jsx`: Orkestrator utama halaman Pengaturan Master Cuti dengan 5 sub-navigasi (`types`, `profiles`, `approvers`, `completeness`, `general`) dan state management terintegrasi.
- `src/apps/kepegawaian/pages/cuti-lembur/settings/LeaveTypesSection.jsx`: Komponen tabel master jenis cuti & izin lengkap dengan filter kategori, status aktif, pencarian teks, toggle status instan, dan proteksi jenis sistem (`is_system`).
- `src/apps/kepegawaian/pages/cuti-lembur/settings/LeaveTypeFormModal.jsx`: Modal komprehensif tambah/ubah jenis cuti dengan 5 sub-tab konfigurasi (Umum, Hitung Hari & Kuota, Syarat Peserta, Waktu & Lampiran, Payroll & Approval) serta generator pratinjau interaktif *"Aturan dalam Kalimat"*.
- `src/apps/kepegawaian/pages/cuti-lembur/settings/ApprovalProfilesSection.jsx`: Komponen manajemen rantai persetujuan berjenjang (`direct_supervisor`, `unit_head`, `hrd_pool`, `yayasan_pool`), modal edit langkah SLA/ambang hari, dan daftar jenis cuti terkait.
- `src/apps/kepegawaian/pages/cuti-lembur/settings/UnitApproversAndDelegationsSection.jsx`: Penetapan Kepala Sekolah per unit satuan pendidikan, kotak saran otomatis pejabat Level 1 (`job_positions.level = 1`), serta manajemen delegasi approval (dengan aturan Depth-1 anti-chaining).
- `src/apps/kepegawaian/pages/cuti-lembur/settings/EmployeeCompletenessSection.jsx`: Tabel audit kelengkapan profil pegawai (`join_date` dan Atasan Langsung), indikator status lengkap/belum lengkap, filter, serta modal edit cepat anti-siklus supervisor.
- `src/apps/kepegawaian/pages/cuti-lembur/settings/GeneralSettingsSection.jsx`: Form konfigurasi `leave_module_settings`, editor interaktif rentang semester (`semester_ranges`), dan ambang rawan personel (`absence_thresholds`).

### 2. Backend & Test Runner (`apps/api-backend`)
- `src/modules/kepegawaian/leave/leaveTypeValidation.js`: Mesin validasi murni aturan jenis cuti, tumpang tindih KS per unit, dan aturan delegasi persetujuan.
- `src/modules/kepegawaian/leave/leaveTypeService.js`: Service layer master konfigurasi.
- `src/modules/kepegawaian/leave/controller.js`: Request handler Express.
- `src/modules/kepegawaian/leave/routes.js`: Route definitions dengan permission check.
- `src/modules/kepegawaian/leave/seeds/seed_usulan_terkunci.js`: Seeder konfigurasi master bawaan sistem.
- `src/modules/kepegawaian/leave/scripts/run_all_leave_tests.js`: Orkestrator test runner otomatis.
- `src/modules/kepegawaian/leave/tahap4_master_types_foundation.test.js`: 19 unit test cases murni.
- `src/modules/kepegawaian/leave/tahap4_master_types_integration.test.js`: 10 integration test cases live database.

---

## (b) Migrasi & SQL yang Dijalankan

### Target Database: `127.0.0.1:3306` (Local MariaDB - `kepegawaian_dev` & `core_dev`)
- Seluruh migrasi skema tabel Knex telah terpasang idempoten pada Tahap 1–4 (`leave_types`, `leave_approval_profiles`, `leave_approval_profile_steps`, `school_unit_approvers`, `approval_delegations`, `leave_module_settings`, `absence_thresholds`).
- Tidak ada migrasi DDL destruktif baru pada Tahap 5 (UI consuming backend yang sudah lolos uji di Tahap 4).

---

## (c) Endpoint Baru & Berubah (Method, Path, Permission)

| Method | Path | Permission / Guard | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/kepegawaian/leave-types` | `authenticate` | Daftar jenis cuti (terfilter sesuai status/akses) |
| `POST` | `/api/v1/kepegawaian/leave-types` | `kepegawaian.leave_types.manage` | Buat jenis cuti baru dengan validasi invarian |
| `PUT` | `/api/v1/kepegawaian/leave-types/:id` | `kepegawaian.leave_types.manage` | Ubah konfigurasi jenis cuti (`is_system` kode terkunci) |
| `PATCH` | `/api/v1/kepegawaian/leave-types/:id/active` | `kepegawaian.leave_types.manage` | Toggle status aktif jenis cuti |
| `DELETE` | `/api/v1/kepegawaian/leave-types/:id` | `kepegawaian.leave_types.manage` | Hapus jenis cuti non-sistem |
| `GET` | `/api/v1/kepegawaian/approval-profiles` | `authenticate` | Daftar profil & tahapan approval |
| `PUT` | `/api/v1/kepegawaian/approval-profiles/:id` | `kepegawaian.leave_types.manage` | Update nama & rantai tahapan profil approval |
| `GET` | `/api/v1/kepegawaian/unit-approvers/suggestions`| `kepegawaian.leave_types.manage` | Saran KS otomatis dari `job_positions.level = 1` |
| `GET` | `/api/v1/kepegawaian/unit-approvers` | `authenticate` | Daftar penetapan KS aktif & riwayat |
| `POST` | `/api/v1/kepegawaian/unit-approvers` | `kepegawaian.leave_types.manage` | Tetapkan KS (validasi non-overlapping) |
| `DELETE` | `/api/v1/kepegawaian/unit-approvers/:id` | `kepegawaian.leave_types.manage` | Hapus penetapan KS |
| `GET` | `/api/v1/kepegawaian/approval-delegations` | `authenticate` | Daftar delegasi persetujuan |
| `POST` | `/api/v1/kepegawaian/approval-delegations` | `authenticate` (actor) | Buat delegasi (validasi Depth-1 & anti self-delegasi) |
| `DELETE` | `/api/v1/kepegawaian/approval-delegations/:id`| `authenticate` | Cabut wewenang delegasi (Revoke) |
| `GET` | `/api/v1/kepegawaian/leave-employee-profile` | `kepegawaian.leave_balances.read` | Audit kelengkapan profil pegawai |
| `PATCH` | `/api/v1/kepegawaian/leave-employee-profile/:id`| `kepegawaian.leave_balances.manage` | Update `join_date` & Atasan Langsung (anti-siklus) |
| `GET` | `/api/v1/kepegawaian/leave-settings` | `authenticate` | Parameter modul & rentang semester |
| `PUT` | `/api/v1/kepegawaian/leave-settings` | `kepegawaian.leave_types.manage` | Update parameter modul & semester ranges |
| `GET` | `/api/v1/kepegawaian/absence-thresholds` | `authenticate` | Ambang batas ketidakhadiran harian |
| `PUT` | `/api/v1/kepegawaian/absence-thresholds` | `kepegawaian.leave_types.manage` | Update ambang rawan personel |

---

## (d) Langkah Uji Manual

1. **Uji UI Jenis Cuti & Invarian:**
   - Masuk ke menu *Cuti & Lembur* -> Tab *Pengaturan* -> Sub-tab *Jenis Cuti & Izin*.
   - Klik tombol **"Tambah Jenis Cuti"**.
   - Coba atur kategori ke *Khusus (Special)* dan centang *Memotong Kuota Saldo Cuti*. Pastikan sistem otomatis mengubah kategori menjadi `annual` atau menonaktifkan centang sesuai aturan invarian SPEC §3.2.
   - Isi form dan perhatikan banner *"Pratinjau Aturan"* yang merangkum aturan ke dalam kalimat bahasa Indonesia secara otomatis.
   - Klik **Simpan**. Pastikan item baru muncul di tabel dengan badge warna dan status aktif.
   - Klik tombol toggle aktif/nonaktif pada salah satu baris, pastikan status terbarui seketika.
   - Coba tombol hapus pada jenis sistem (`cuti_tahunan`), pastikan tombol non-aktif/terkunci.

2. **Uji Profil Persetujuan & Langkah:**
   - Pindah ke sub-tab *Alur Persetujuan*.
   - Klik ikon edit pada profil `std_3` (Standar 3 Langkah).
   - Ubah SLA atau tambahkan tahap baru. Klik **Simpan Profil**.
   - Periksa perubahan rantai tahapan dan badge jenis cuti yang menggunakan profil tersebut.

3. **Uji Kepala Sekolah & Delegasi:**
   - Pindah ke sub-tab *Kepala Sekolah & Delegasi*.
   - Periksa kotak saran otomatis berwarna biru (*"Saran Otomatis Pejabat Struktural Level 1"*).
   - Klik **"Tetapkan"** pada saran, periksa tanggal berlaku lalu simpan.
   - Pindah ke sub-tab *Delegasi Persetujuan Aktif*, klik **"Buat Delegasi Baru"**.
   - Pilih delegator dan delegate yang sama, pastikan sistem menolak dengan pesan *"Pemberi delegasi dan penerima delegasi tidak boleh orang yang sama"*.
   - Masukkan delegasi valid, klik simpan, lalu coba klik tombol **"Cabut"** untuk mencabut delegasi.

4. **Uji Kelengkapan Data Pegawai:**
   - Pindah ke sub-tab *Kelengkapan Data Pegawai*.
   - Gunakan filter *"Hanya Belum Lengkap"*.
   - Klik tombol **"Ubah"** pada baris pegawai yang belum lengkap, isi `join_date` dan pilih Atasan Langsung.
   - Klik **Simpan Perubahan**, pastikan status berubah menjadi *"Lengkap"* (badge hijau) dan counter ringkasan terbarui.

5. **Uji Pengaturan Umum & Ambang Batas:**
   - Pindah ke sub-tab *Pengaturan Umum*.
   - Tambah atau ubah tanggal pada editor *Kalender Rentang Semester Pendidikan*.
   - Ubah ambang batas pada *Ambang Rawan Personel Ketidakhadiran*.
   - Klik **"Simpan Pengaturan"**, pastikan toast sukses muncul dan data tersimpan.

---

## (e) Hasil Pengujian Otomatis

```
================================================================
RUNNING ALL LEAVE MODULE AUTOMATED TEST SUITES (TAHAP 1 - 4)
================================================================

[PASS] tahap1_foundation.test.js (20 tests passed, 0 failed)
[PASS] tahap1_integration.test.js (5 tests passed, 0 failed)
[PASS] tahap2_holidays_foundation.test.js (17 tests passed, 0 failed)
[PASS] tahap2_holidays_integration.test.js (7 tests passed, 0 failed)
[PASS] tahap4_master_types_foundation.test.js (19 tests passed, 0 failed)
[PASS] tahap4_master_types_integration.test.js (10 tests passed, 0 failed)

================================================================
TEST SUMMARY
================================================================
✅ tahap1_foundation.test.js: PASS
✅ tahap1_integration.test.js: PASS
✅ tahap2_holidays_foundation.test.js: PASS
✅ tahap2_holidays_integration.test.js: PASS
✅ tahap4_master_types_foundation.test.js: PASS
✅ tahap4_master_types_integration.test.js: PASS

Total Suites Passed: 6 / 6
🎉 ALL TEST SUITES PASSED CLEANLY (100%)!
```

- **Vite Portal Build Verification:**
  `npm run build:portal` -> **SUCCESS** (0 errors, 3643 modules transformed).

---

## (f) Deviasi Desain

1. **Sub-Navigasi 5 Domain Konfigurasi:** Mengikuti pola token visual `DESIGN.md` (Aldepos HRIS Precision), sub-navigasi diletakkan rapi di bagian atas tab *Pengaturan* agar memudahkan HRD berpindah antara:
   - Jenis Cuti & Izin
   - Alur Persetujuan
   - Kepala Sekolah & Delegasi
   - Kelengkapan Data Pegawai
   - Pengaturan Umum & Ambang Batas
2. **Generator Pratinjau "Aturan dalam Kalimat":** Menambahkan live preview banner di dalam modal jenis cuti untuk menerjemahkan puluhan field teknis ke dalam bahasa naratif Indonesia yang mudah dipahami HRD.
3. **Pemisahan Tab Kepala Sekolah & Delegasi:** Memberikan pemisahan visual antara penetapan resmi Kepala Sekolah aktif per unit dan pendelegasian wewenang sementara (dengan status aktif, berakhir, atau dicabut).

---

## (g) Keputusan Otomatis, Risiko & Temuan di Luar Lingkup

### KEPUTUSAN OTOMATIS
1. **Pemisahan Modal Form Jenis Cuti:** Mengingat jumlah atribut SPEC §3.2 mencapai lebih dari 25 field, formulir diorganisasi ke dalam 5 sub-tab internal (*Umum, Hitung Hari, Syarat, Waktu & Lampiran, Payroll & Approval*) agar tidak membebani pengguna dan menjaga touch target serta layout yang proporsional.
2. **Indikator Pimpinan Puncak pada Kelengkapan Data:** Pegawai dengan `position_level === 1` (Kepala Sekolah/Direktur) dianggap lengkap secara hierarki tanpa mewajibkan atasan langsung tambahan di tabel `employees`, ditandai dengan badge khusus *"Level 1 (Pimpinan Puncak)"*.
3. **Penyimpanan Semester Ranges:** Menggunakan kolom JSON pada `leave_module_settings.semester_ranges` yang dipetakan langsung ke komponen baris tanggal dinamis tanpa membuat tabel baru terpisah, menjaga performa dan kemudahan edit.

### Temuan di Luar Lingkup
1. Belum tersedianya master struktur organisasi pohon hierarki visual (saat ini relasi atasan langsung menggunakan `direct_supervisor_employee_id` flat self-join).
2. Modul penggajian (Payroll feed) saat ini membaca persentase gaji (`payroll_pay_percent`), namun kalkulasi komponen tunjangan kehadiran terpisah akan dieksekusi pada integrasi payroll.
