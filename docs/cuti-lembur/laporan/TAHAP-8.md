# Laporan Tahap 8: UI Tab "Saldo Cuti" dan "Pengaturan -> Jatah & Kebijakan"

**Modul:** Kepegawaian (HRIS) — Manajemen Cuti, Izin & Lembur  
**Status:** Selesai (100% Lulus Uji)  
**Tanggal:** 2026-10-07  
**Branch:** `feature/kepegawaian-cuti-lembur`  

---

## (a) File Dibuat / Diubah
1. **Frontend:**
   - [`LeaveBalancesTab.jsx`](file:///c:/PROYEK/Core%20Aldepos/apps/core-portal/src/apps/kepegawaian/pages/cuti-lembur/LeaveBalancesTab.jsx) *(Diperbarui)*:
     - 5 Kartu Ringkasan KPI: Total Hak Terdaftar, Carry Over Aktif, Total Terpakai, Reservasi Antrean, Total Saldo Tersedia.
     - Filter Bar & Pencarian (Periode, Satuan Pendidikan, Status Kepegawaian, Nama/NIP).
     - Indikator peringatan "Tanggal masuk belum diisi" dengan badge dan link ke tab Kelengkapan Data.
     - Tabel Saldo Komprehensif (Pegawai, Unit, Status, Masa Kerja, Hak, Carry Over + Expired Date, Terpakai, Reservasi, Sisa/Tersedia).
     - Drawer Ledger Mutasi Pegawai (Append-Only log, filter bucket/tipe, pembuktian formula invarian saldo).
     - Modal Penyesuaian Saldo Manual (Adjust delta available/used/reserved, alasan wajib, audit trail).
     - Modal Atur Jatah Massal (Bulk Assign) dengan validasi pratinjau dan overwrite toggle.
     - Modal Tutup Periode (Dry-run preview carry-over per pegawai, masa kedaluwarsa 30 September, eksekusi tutup periode).
     - Modal Periksa Konsistensi (Reconcile Balances Dry-run & Auto-fix terhadap Append-Only Ledger).
   - [`LeavePoliciesSection.jsx`](file:///c:/PROYEK/Core%20Aldepos/apps/core-portal/src/apps/kepegawaian/pages/cuti-lembur/settings/LeavePoliciesSection.jsx) *(Baru)*:
     - Konfigurasi parameter siklus periode (Juli-Juni TA vs Jan-Des Tahun Kalender).
     - Aturan prorata masuk (Monthly/Full/None) dan cut-off day (default 15).
     - Aturan pembulatan hasil perhitungan prorata (floor 0.5, nearest 0.5, ceil 0.5, none).
     - Syarat masa kerja minimum kelayakan (default 12 bulan).
     - Kebijakan Carry Over (toggle, batas max hari e.g. 6 hari, masa kedaluwarsa e.g. 3 bulan).
     - Kebijakan Saldo Negatif / Kasbon Cuti (toggle, batas minus).
     - Editor Tabel Aturan Jatah per Status Kepegawaian (`leave_entitlement_rules`) dengan prioritas dan masa kerja.
   - [`LeaveSettingsTab.jsx`](file:///c:/PROYEK/Core%20Aldepos/apps/core-portal/src/apps/kepegawaian/pages/cuti-lembur/LeaveSettingsTab.jsx) *(Diperbarui)*:
     - Integrasi sub-tab "Jatah & Kebijakan" (`policies`) berdampingan dengan master types, approval profiles, KS & delegasi, kelengkapan data, dan pengaturan umum.
2. **Backend / Test:**
   - [`tahap7_ledger_integration.test.js`](file:///c:/PROYEK/Core%20Aldepos/apps/api-backend/src/modules/kepegawaian/leave/tahap7_ledger_integration.test.js) *(Diperbarui)*:
     - Ditambahkan `t.after` untuk pembersihan pool koneksi database `knex.destroy()` sehingga proses uji otomatis selesai dengan cepat dan bersih.

---

## (b) Migrasi / SQL yang Dijalankan
- Tidak ada DDL baru pada tahap ini. Seluruh skema database telah terpenuhi pada Tahap 1, Tahap 4, dan Tahap 7.
- **Database Target:** `kepegawaian_dev` & `core_dev` di `127.0.0.1:3306`.

---

## (c) Endpoint Baru / Berubah
| Method | Path | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/kepegawaian/leave-balances` | `kepegawaian.leave_balances.read` / `manage` | Daftar saldo cuti pegawai dengan pagination & filter |
| `GET` | `/kepegawaian/leave-balances/:employeeId/ledger` | `kepegawaian.leave_balances.read` / `manage` | Riwayat mutasi ledger append-only pegawai |
| `POST` | `/kepegawaian/leave-balances/adjust` | `kepegawaian.leave_balances.manage` | Penyesuaian manual saldo cuti (alasan wajib) |
| `POST` | `/kepegawaian/leave-balances/bulk-assign` | `kepegawaian.leave_balances.manage` | Penetapan jatah massal dengan pratinjau kalkulator |
| `POST` | `/kepegawaian/leave-balances/periods/:id/close` | `kepegawaian.leave_balances.manage` | Tutup periode cuti (dry-run & eksekusi carry-over) |
| `POST` | `/kepegawaian/leave-balances/periods/:id/reconcile` | `kepegawaian.leave_balances.manage` | Pemeriksaan konsistensi / rekonsiliasi saldo ledger |
| `GET` | `/kepegawaian/leave-balance-policies` | `kepegawaian.leave_balances.read` / `manage` | Ambil data kebijakan saldo dan tabel jatah status |
| `PUT` | `/kepegawaian/leave-balance-policies/:id` | `kepegawaian.leave_balances.manage` | Simpan perubahan kebijakan saldo dan aturan jatah status |

---

## (d) Langkah Uji Manual
1. **Buka Halaman Cuti & Lembur di Portal:**
   - Navigasi ke `http://localhost:5173` -> Masuk sebagai HRD -> Buka Menu "Cuti, Izin & Lembur" -> Klik Tab "Saldo Cuti".
2. **Verifikasi Kartu Ringkasan & Tabel Saldo:**
   - Amati 5 kartu KPI di bagian atas (Total Hak, Carry Over, Digunakan, Reservasi, Tersedia).
   - Filter berdasarkan Unit Sekolah ("SMP") atau Status ("GTY") dan cari nama pegawai.
   - Pastikan pegawai yang belum memiliki `join_date` menampilkan peringatan oranye "Tanggal Masuk Belum Diisi" dengan tombol link.
3. **Buka Drawer Ledger Pegawai:**
   - Klik tombol "Ledger" pada salah satu baris pegawai.
   - Drawer kanan terbuka menampilkan ringkasan saldo pegawai, kartu validasi invarian formula `Sisa = (Granted + CarryIn + Adjusted) - Used - Reserved - Expired`, serta daftar kronologis seluruh mutasi ledger.
4. **Uji Penyesuaian Saldo Manual:**
   - Klik "Penyesuaian Manual" -> Pilih pegawai, masukkan delta saldo (+1.5 atau -1), ketik alasan wajib -> Simpan.
   - Periksa bahwa saldo dan ledger seketika terupdate.
5. **Uji Tutup Periode & Rekonsiliasi:**
   - Klik tombol "Tutup Periode" -> Amati tabel pratinjau dry-run carry-over (maksimal 6 hari, kedaluwarsa 30 September).
   - Klik tombol "Periksa Konsistensi" -> Amati laporan dry-run rekonsiliasi bahwa seluruh saldo tersinkron 100% dengan ledger mutasi.
6. **Buka Pengaturan -> Jatah & Kebijakan:**
   - Klik Tab "Pengaturan" -> Pilih sub-tab "Jatah & Kebijakan".
   - Ubah salah satu parameter (misal Carry Over Max Days atau aturan status) -> Klik "Simpan Kebijakan Saldo" -> Pastikan notifikasi sukses muncul dan data tersimpan ke backend.

---

## (e) Hasil Pengujian Otomatis
Perintah yang dijalankan:
`node apps/api-backend/src/modules/kepegawaian/leave/scripts/run_all_leave_tests.js`

**Ringkasan Hasil Uji:**
- `tahap1_foundation.test.js`: **PASS** (15 tests)
- `tahap1_integration.test.js`: **PASS** (10 tests)
- `tahap2_holidays_foundation.test.js`: **PASS** (8 tests)
- `tahap2_holidays_integration.test.js`: **PASS** (10 tests)
- `tahap4_master_types_foundation.test.js`: **PASS** (6 tests)
- `tahap4_master_types_integration.test.js`: **PASS** (10 tests)
- `durationCalculator.test.js`: **PASS** (24 tests)
- `tahap6_duration_integration.test.js`: **PASS** (8 tests)
- `entitlementCalculator.test.js`: **PASS** (11 tests)
- `tahap7_ledger_integration.test.js`: **PASS** (11 tests)

**Total Suites:** 10 / 10 Lulus (100% Passed).  
**Vite Portal Build:** `npm run build:portal` -> **0 Error, Success built in 28.32s**.

---

## (f) Deviasi Desain
- Sesuai instruksi SPEC §2 #28 dan kriteria selesai Tahap 8: **Cetak PDF Ledger tidak dibangun (P3)** dan tidak ada tombol palsu/dummy yang tidak berfungsi.
- Penyesuaian visual menggunakan Lucide Icons murni dan token warna desain sistem Core Aldepos tanpa ketergantungan CDN eksternal.

---

## (g) Keputusan Otomatis, Risiko & Temuan di Luar Lingkup

### KEPUTUSAN OTOMATIS
1. **Sub-Tab Jatah & Kebijakan:** Ditempatkan di dalam Tab "Pengaturan" sebagai sub-navigasi "Jatah & Kebijakan" (`policies`) agar konsisten dengan arsitektur UI modul pengaturan (bersama Jenis Cuti, Alur Persetujuan, Kepala Sekolah & Delegasi, Kelengkapan Data, dan Pengaturan Umum).
2. **Tautan Kelengkapan Data:** Pegawai tanpa `join_date` menampilkan tombol aksi yang secara otomatis mengarahkan admin HRD ke tab Pengaturan -> Kelengkapan Data Pegawai untuk melengkapi data NIP, Status, dan Tanggal Masuk Kerja.
3. **Pembersihan Koneksi Test Runner:** Menambahkan hook `t.after` untuk menutup pool Knex di integration test tahap 7 agar eksekusi `run_all_leave_tests.js` dapat keluar secara instan dengan exit code 0.

### Temuan di Luar Lingkup
- Tahap berikutnya (Tahap 9) akan menggarap permohonan cuti guru/pegawai (alur pengajuan, pratinjau durasi, unggah lampiran, alur multi-step approval dengan delegasi dan notifikasi).
