# Database Migrations — Core Service (Knex.js)

Direktori ini berisi berkas migrasi database (Knex.js) untuk **Core Service** dalam Sistem Manajemen Sekolah Terintegrasi.

---

## 1. Catatan Penting Mengenai Skema Awal Production

> **PERHATIAN / IMPORTANT:**  
> Skema awal database (17 tabel final) untuk lingkungan development & production telah dibuat secara langsung melalui eksekusi SQL manual (misalnya via phpMyAdmin / MariaDB CLI), sebagaimana tercatat pada lampiran query di akhir dokumen `erd.md` (dan panduan pengembangan Core Service).

Berkas migrasi di direktori ini (`20260816000001_...` hingga `20260816000017_...`) berfungsi sebagai:
1. **Arsip & Standar Kode (Version Control Baseline)** untuk memastikan struktur 17 tabel terdokumentasi dalam format Knex.
2. **Titik Awal (*Baseline*) untuk Perubahan Skema Berikutnya:** Setiap ada penambahan kolom, tabel baru, atau perubahan indeks di masa mendatang, buat berkas migrasi baru (mis. `2026xxxxxx_add_column_...`) dan jalankan melalui CLI Knex.

---

## 2. Urutan 17 Tabel Berdasarkan Relasi Foreign Key

Berkas migrasi diberi penomoran timestamp berurutan sesuai dependensi Foreign Key:

1. `20260816000001_create_foundation_profiles_table.js` (Profil Yayasan - Singleton)
2. `20260816000002_create_school_units_table.js` (Satuan Pendidikan - FK ke `foundation_profiles`)
3. `20260816000003_create_users_table.js` (Akun Pengguna & Login SSO)
4. `20260816000004_create_roles_table.js` (Master Peran / Roles)
5. `20260816000005_create_permissions_table.js` (Master Izin / Permissions)
6. `20260816000006_create_role_permissions_table.js` (Pivot Role-Permission)
7. `20260816000007_create_user_school_roles_table.js` (Penugasan Role User per Satuan Pendidikan)
8. `20260816000008_create_refresh_tokens_table.js` (Sesi Refresh Token)
9. `20260816000009_create_password_reset_requests_table.js` (Pengajuan Reset Password)
10. `20260816000010_create_activity_logs_table.js` (Audit Log Login & Aksi Admin Lintas Aplikasi)
11. `20260816000011_create_school_unit_status_history_table.js` (Riwayat Status Satuan Pendidikan)
12. `20260816000012_create_system_settings_table.js` (Site Settings & Multi-Unit Override)
13. `20260816000013_create_webhook_subscribers_table.js` (Daftar Aplikasi Pelanggan Webhook)
14. `20260816000014_create_webhook_events_table.js` (Log Event Webhook yang Diterbitkan)
15. `20260816000015_create_webhook_deliveries_table.js` (Status Pengiriman Webhook ke Subscriber)
16. `20260816000016_create_api_clients_table.js` (API Gateway Clients)
17. `20260816000017_create_rate_limit_rules_table.js` (Aturan Rate Limiting)

---

## 3. Konfigurasi Lingkungan (Environment Variables)

Konfigurasi koneksi diatur melalui `backend/knexfile.js` dengan membaca variabel lingkungan:
- `CORE_DB_HOST` (default: `127.0.0.1`)
- `CORE_DB_PORT` (default: `3306`)
- `CORE_DB_USER` (default: `root`)
- `CORE_DB_PASSWORD`
- `CORE_DB_NAME` (default: `aldepos_core`)
