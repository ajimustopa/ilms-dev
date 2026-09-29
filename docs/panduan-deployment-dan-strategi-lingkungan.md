Status: perlu-revisi
Diperbarui: 2026-09-07

# Panduan Strategi Deployment Hostinger, Local Staging, & Sinkronisasi Database

Dokumen ini memuat standar operasional prosedur (SOP) dan strategi arsitektur lingkungan pengembangan, pengujian pra-rilis (*local staging*), serta deployment otomatis ke **Hostinger Production** melalui **GitHub**.

---

## 1. Arsitektur & Alur Kerja Lingkungan (Environment Flow)

Sistem membagi lingkungan kerja menjadi 3 lapisan untuk menjamin lingkungan produksi tetap stabil tanpa menghentikan proses pengembangan:

```
┌────────────────────────────────────────────────────────┐
│ 1. Local Development (Branch: feature/* atau dev)      │
│    - Database: aldepos_dev                             │
│    - Fokus: Eksperimen dan pembuatan fitur baru        │
└───────────────────────────┬────────────────────────────┘
                            │ Merge lokal setelah selesai coding
                            ▼
┌────────────────────────────────────────────────────────┐      Tarik salinan data Hostinger
│ 2. Local Staging (Branch: main atau staging)           │ <==================================┐
│    - Database: aldepos_staging (Kloning DB Hostinger)  │ (Dump data terbaru dari produksi)  │
│    - Fokus: Uji integrasi, uji migrasi & validasi data │                                    │
└───────────────────────────┬────────────────────────────┘                                    │
                            │ Jika lolos pengujian 100%                                       │
                            │ Push ke remote repository                                       │
                            ▼                                                                 │
┌────────────────────────────────────────────────────────┐                                    │
│ 3. GitHub Repository (Branch: main)                    │                                    │
└───────────────────────────┬────────────────────────────┘                                    │
                            │ Webhook / Auto-Deploy / Git Pull                                │
                            ▼                                                                 │
┌────────────────────────────────────────────────────────┐                                    │
│ 4. Hostinger Production Server                         │ ───────────────────────────────────┘
│    - Database: Live Production DB                      │
│    - Live User Traffic                                 │
└────────────────────────────────────────────────────────┘
```

---

## 2. Inisialisasi Pertama: Penempatan Proyek & Database ke Hostinger

### A. Membawa Data Database Lokal ke Hostinger (Seed Awal)
1. **Export Database Lokal**:
   ```bash
   mysqldump -u root -p nama_database_lokal > backup_awal_init.sql
   ```
   *Atau melalui phpMyAdmin lokal: pilih database -> menu **Export** -> Format **SQL** -> klik **Export**.*
2. **Setup Database di Hostinger**:
   - Masuk ke **hPanel Hostinger** -> Menu **Databases** -> **MySQL Databases**.
   - Buat database baru (contoh: `u123456_aldepos`), user, dan password yang aman.
   - Buka **phpMyAdmin** untuk database tersebut di Hostinger.
   - Pilih tab **Import** -> Upload file `backup_awal_init.sql` -> Klik **Import**.

### B. Konfigurasi GitHub Repository
1. Pastikan file rahasia/lokal tidak ikut ter-commit di `.gitignore`:
   ```gitignore
   node_modules/
   .env
   .env.local
   .env.*.local
   dist/
   build/
   *.sql
   ```
2. Push codebase ke GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/username-anda/core-aldepos.git
   git push -u origin main
   ```

### C. Konfigurasi Deployment di Hostinger (hPanel)
1. Masuk ke **hPanel** -> **Advanced** -> **Git**.
2. Masukkan URL repository GitHub dan pilih branch `main`.
3. Aktifkan **Auto Deployment / Webhook**. Salin Webhook URL yang diberikan dan tempelkan ke **GitHub Repository Settings -> Webhooks**.
4. Di menu **Node.js** Hostinger:
   - Tentukan direktori aplikasi dan Entry Point (misal: `apps/api-backend/src/server.js`).
   - Masukkan Environment Variables produksi (`NODE_ENV=production`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, dll).

---

## 3. Konfigurasi Lingkungan Pengujian Lokal (Local Staging)

Agar pengujian di lokal benar-benar mencerminkan kondisi riil di Hostinger, kita membuat satu database lokal bernama `aldepos_staging`.

### A. Profil Environment di `apps/api-backend`
Sediakan konfigurasi environment terpisah:
- `.env.development`:
  ```env
  NODE_ENV=development
  PORT=5000
  DB_HOST=127.0.0.1
  DB_USER=root
  DB_PASSWORD=root
  DB_NAME=aldepos_dev
  ```
- `.env.staging`:
  ```env
  NODE_ENV=staging
  PORT=5000
  DB_HOST=127.0.0.1
  DB_USER=root
  DB_PASSWORD=root
  DB_NAME=aldepos_staging
  ```

### B. Script Sinkronisasi Data Hostinger ke Local Staging
Buat script utilitas lokal (misal: `scripts/sync-staging-db.ps1` untuk Windows PowerShell):

```powershell
# 1. Ekspor data dari Hostinger (jika menggunakan SSH)
# ssh user@hostinger_ip "mysqldump -u user_db -p'pass_db' nama_db_hostinger" > hostinger_live.sql

# 2. Reset dan timpa database staging di lokal
mysql -u root -p -e "DROP DATABASE IF EXISTS aldepos_staging; CREATE DATABASE aldepos_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p aldepos_staging < hostinger_live.sql

Write-Host "Database aldepos_staging berhasil disinkronkan persis dengan Hostinger!" -ForegroundColor Green
```
> **Catatan jika tanpa SSH:** Download manual export `.sql` dari phpMyAdmin Hostinger, simpan dengan nama `hostinger_live.sql`, lalu jalankan langkah import di atas.

---

## 4. Standar Operasional Prosedur (SOP) Siklus Harian

### Langkah 1: Koding Fitur Baru (Local Dev)
1. Buat branch baru dari `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nama-fitur-baru
   ```
2. Jalankan server lokal dengan database development (`aldepos_dev`).
3. Jika ada perubahan struktur tabel baru, buat file migrasi Knex (jangan ubah tabel manual):
   ```bash
   npx knex --knexfile knexfile.js migrate:make create_table_contoh
   ```
4. Kembangkan fitur sampai selesai dan commit:
   ```bash
   git add .
   git commit -m "feat(keuangan): implementasi modul baru"
   ```

### Langkah 2: Uji Coba Integrasi di Local Staging (Tempat Pengujian Persis)
1. Tarik salinan database terbaru dari Hostinger ke database `aldepos_staging` (jalankan script sinkronisasi).
2. Pindah ke branch `main` dan gabungkan (*merge*) fitur yang baru dibuat:
   ```bash
   git checkout main
   git merge feature/nama-fitur-baru
   ```
3. Arahkan koneksi backend lokal ke `aldepos_staging` (`.env.staging`).
4. Jalankan migrasi database pada data staging tersebut:
   ```bash
   npm run migrate:core
   ```
5. Uji aplikasi secara menyeluruh:
   - Apakah data lama di database produksi tetap terbaca normal?
   - Apakah migrasi tabel baru berjalan tanpa error?
   - Apakah fitur baru bekerja selaras dengan relasi data yang sudah ada?

### Langkah 3: Rilis ke Hostinger (Deploy Production)
Setelah seluruh pengujian di `aldepos_staging` berhasil 100%:
1. Push branch `main` ke GitHub:
   ```bash
   git push origin main
   ```
2. Hostinger akan otomatis menarik perubahan (*Auto Deployment* via Webhook).
3. Jalankan migrasi di Hostinger (melalui terminal SSH atau panel runner):
   ```bash
   npm run migrate:core
   ```
4. Lakukan verifikasi singkat (*smoke test*) pada web produksi.

---

## 5. Prinsip Keamanan & Konsistensi Data

1. **Selalu Gunakan Migrasi Kode**: Perubahan kolom/tabel wajib dibuat lewat file migrasi Knex agar tercatat di Git dan dapat diterapkan berulang (*idempotent*) di database lokal, staging, maupun produksi.
2. **Kerahasiaan Data Kredensial**: File `.env` tidak boleh masuk ke repository publik maupun privat.
3. **Data Anonymization (Opsional)**: Jika database Hostinger memuat data rahasia santri/pegawai/transaksi, tambahkan perintah masking otomatis (misal menyamarkan password hash/nomor kontak) saat restore ke `aldepos_staging`.

---
*Dokumen ini akan terus diperbarui jika terdapat perubahan arsitektur hosting, CI/CD pipeline, atau infrastruktur database.*
