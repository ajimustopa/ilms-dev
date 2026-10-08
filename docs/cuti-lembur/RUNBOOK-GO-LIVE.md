# Runbook Go-Live: Modul Manajemen Cuti, Izin & Lembur
**Sistem Manajemen Sekolah Terintegrasi Yayasan Aldepos (Core Aldepos)**  
**Status:** Dokumen Panduan Rilis Produksi  
**Peringatan:** JANGAN menjalankan migrasi atau skrip pada lingkungan Live/Produksi sebelum seluruh prasyarat manusia dan backup selesai dilakukan.

---

## 1. Urutan Migrasi Database Produksi

Pastikan koneksi database live telah terisolasi dan dicadangkan sebelum menjalankan migrasi.

### Langkah 1: Backup Database Penuh
Ambil snapshot/dump penuh dari database:
- `core`
- `kepegawaian`

Contoh perintah:
```bash
mysqldump -h [DB_HOST] -u [DB_USER] -p core > backup_core_pre_cuti_$(date +%F_%T).sql
mysqldump -h [DB_HOST] -u [DB_USER] -p kepegawaian > backup_kepegawaian_pre_cuti_$(date +%F_%T).sql
```

### Langkah 2: Jalankan Migrasi Modul Kepegawaian
Jalankan migrasi skema tabel cuti, lembur, dan kolom integrasi presensi:
```bash
npm --workspace=apps/api-backend run migrate:kepegawaian
```
*File migrasi yang dieksekusi:*
1. `db/migrations/kepegawaian/20261008000001_create_leave_and_overtime_tables.js`
2. `db/migrations/kepegawaian/20261008000002_add_leave_integration_to_employee_attendances.js`

### Langkah 3: Jalankan Migrasi Permission Modul Core
Jalankan migrasi permission dan role mapping:
```bash
npm --workspace=apps/api-backend run migrate:core
```
*File migrasi yang dieksekusi:*
1. `db/migrations/core/20261008000001_seed_leave_and_overtime_permissions.js`

### Langkah 4: Jalankan Seed Konfigurasi Standar (USULAN-TERKUNCI)
Jalankan hanya seed konfigurasi dasar (jenis cuti master, profil approval, tier lembur standar). **DILARANG menjalankan seed data uji `[DATA_UJI_HRD]` pada produksi!**
```bash
node -e "const { seedUsulanTerkunci } = require('./src/modules/kepegawaian/leave/seeds/seed_usulan_terkunci'); seedUsulanTerkunci().then(() => { console.log('Seed usulan terkunci sukses'); process.exit(0); });"
```

---

## 2. Checklist Input Data Awal Oleh Tim HRD / Admin (Prasyarat Manusia)

Sebelum modul dibuka untuk seluruh guru dan staf, Tim HRD Yayasan wajib melengkapi dan memverifikasi data berikut:

- [ ] **1. Kelengkapan `join_date` (Tanggal Masuk Pegawai):**
  - Pastikan seluruh pegawai aktif di tabel `employees` memiliki `join_date` yang valid (bukan null/0000-00-00).
  - *Mengapa:* Digunakan oleh mesin kalkulator saldo cuti untuk menghitung masa kerja dan prorasi kuota tahunan.
- [ ] **2. Penetapan Atasan Langsung (`direct_supervisor_id`):**
  - Verifikasi bahwa setiap guru/staf telah terhubung dengan atasan langsungnya masing-masing.
  - *Mengapa:* Menjadi penentu tujuan langkah pertama (Step 1) pada alur persetujuan cuti berjenjang.
- [ ] **3. Penetapan Kepala Sekolah / Pimpinan Satuan Pendidikan:**
  - Buka tab *Pengaturan & Master* > *Approver Satuan* dan pastikan setiap unit (TK, SD, SMP, SMA, Pondok/Pesantren) memiliki Kepala Sekolah terdaftar sebagai approver Step 2.
- [ ] **4. Input Kalender Hari Libur Resmi & Cuti Bersama SKB 3 Menteri:**
  - Buka tab *Hari Libur*, klik *Impor SKB 3 Menteri* atau input manual seluruh hari libur nasional dan cuti bersama untuk tahun ajaran aktif (2026/2027).
  - Tinjau opsi *Potong Cuti Tahunan* untuk setiap tanggal cuti bersama.
- [ ] **5. Verifikasi Akun dan Hak Akses Tim HRD:**
  - Pastikan user staf HRD memiliki permission `kepegawaian.leave_requests.manage`, `kepegawaian.leave_balances.manage`, dan `kepegawaian.overtimes.manage`.
- [ ] **6. Verifikasi Formula & Tarif Lembur dengan Konsultan Hukum Yayasan:**
  - Tinjau nilai `flat_hourly_rate`, `calc_method` (flat vs 1/173 gaji pokok), batas lembur maksimal (harian/mingguan/bulanan), dan status kepegawaian yang memenuhi syarat lembur (misal: GTY/PTY/Honorer).
- [ ] **7. Peninjauan Kebijakan Izin Ibadah Haji / Umrah:**
  - Tinjau parameter `payroll_pay_percent` untuk izin ibadah keagamaan panjang (misal 40 hari / 14 hari) apakah berlaku gaji pokok penuh (100%), subsidi proporsional, atau cuti di luar tanggungan (0%).

---

## 3. Langkah Pembukaan Periode Cuti Pertama

1. Tim HRD membuka Tab **Saldo & Ledger**.
2. Klik tombol **Alokasi Hak Cuti Awal Periode** (*Bulk Assign Entitlements*).
3. Sistem akan menghitung hak cuti tahunan (12 hari prorata berdasarkan masa kerja) untuk seluruh staf aktif.
4. Periksa tabel saldo untuk memastikan tidak ada anomali.
5. Jalankan verifikasi integritas saldo (*Reconcile Balances*) untuk memastikan seluruh invarian ledger berstatus valid.
6. Modul siap digunakan secara resmi (*Go-Live*).
