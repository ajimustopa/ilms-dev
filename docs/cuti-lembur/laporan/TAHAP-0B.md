# LAPORAN PENYIAPAN LINGKUNGAN DEV & PENGAMAN — TAHAP 0B

Status: Selesai | Branch: `feature/kepegawaian-cuti-lembur` | Tanggal: 2026-10-07

---

## 1. Ringkasan Eksekusi Setup

- **Branch Dasar & Fitur:** Bekerja pada branch `feature/kepegawaian-cuti-lembur` yang telah menggabungkan seluruh pekerjaan Presensi dan hotfix keamanan presensi `hotfix/kepegawaian-presensi-actor-guard` (Tahap H-1).
- **Git Remote & Pengamanan Push:**
  - `origin`: `https://github.com/ajimustopa/ilms-dev.git`
  - `prod`: `https://github.com/ajimustopa/aldepos-ilms-prod.git`
  - Perintah penonaktifan push lokal ke remote `prod`:
    ```bash
    git remote set-url --push prod DISABLED
    ```
- **Database Dev Lokal (127.0.0.1:3306):**
  - Database: `core_dev`, `kepegawaian_dev`, `akademik_dev` aktif dan skema Knex lengkap dari nol.
- **Modul Pengaman Database (`dbGuard.js`):**
  - Memverifikasi target host (`127.0.0.1`, `localhost`, `::1`) dan memastikan nama database wajib berakhiran `_dev`.
  - Percobaan operasi tulis atau migrasi ke host remote atau nama database produksi (`u622997391_*`) langsung dibatalkan dengan fatal exception `ERR_REMOTE_DB_FORBIDDEN` / `ERR_NON_DEV_DATABASE_FORBIDDEN`.

---

## (a) File Dibuat & Diubah

- **Dibuat:**
  - `apps/api-backend/src/config/db/dbGuard.js`: Modul pengaman koneksi database dev lokal.
  - `apps/api-backend/src/config/db/dbGuard.test.js`: Test suite unit keamanan (6 skenario uji).
  - `apps/api-backend/src/modules/kepegawaian/leave/seeds/run_seed_dev.js`: Script runner seed data uji HRD dev.
  - `apps/api-backend/src/modules/kepegawaian/leave/seeds/run_clean_dev.js`: Script cleaner reset data uji dev.
  - `.env.dev` & `apps/api-backend/.env.dev`: Konfigurasi environment dev lokal (diabaikan oleh `.gitignore`).
  - `docs/cuti-lembur/laporan/TAHAP-0B.md`: Laporan resmi Tahap 0B.
- **Diubah:**
  - `apps/api-backend/src/config/db/core.js`, `kepegawaian.js`, `akademik.js`: Integrasi `.env.dev` dan `dbGuard.js`.
  - `apps/api-backend/src/modules/kepegawaian/leave/seeds/seed_data_uji_hrd.js`: Ekspansi 12 data pegawai fiktif, jadwal kerja (Sen-Jum, Sen-Sab, Flexible), dan akun pengujian.

---

## (b) Database & Data Uji (`[DATA_UJI_HRD]`)

### Akun Uji di `core_dev`:
| Username | Password | Role | Satuan | Keterangan |
|---|---|---|---|---|
| `superadmin` | `Password123!` | `super_admin` | Global | Super Administrator |
| `hrd_smp` | `Password123!` | `hrd` | 1 | Pengelola HRD & Cuti/Lembur |
| `kepala_sekolah_uji` | `Password123!` | `admin_satuan_pendidikan` | 1 | Kepala Sekolah (Approver KS Unit 1) |
| `guru_uji` | `Password123!` | `guru` | 1 | Guru Budi Santoso (GTY) |
| `staf_uji` | `Password123!` | `guru` / `staf` | 1 | Guru Dewi Lestari (PTY) |
| `siswa_uji` | `Password123!` | `siswa` | 1 | Siswa Andi (`ref_type=student`) |

### Pegawai Uji di `kepegawaian_dev` (12 Pegawai Fiktif):
- ID 1: Siti Aminah, S.Pd (GTY, HRD)
- ID 2: Dr. H. Ahmad Dahlan, M.Pd (GTY, Kepala Sekolah, Unit Approver)
- ID 3: Budi Santoso, S.Kom (GTY, Guru Mapel, Jadwal Reguler 5 Hari)
- ID 4: Dewi Lestari, S.Pd (PTY, Guru Baru masuk 10 Okt 2026, Prorated 9.0)
- ID 5: Agus Kurniawan, M.Si (PNS DPK, Guru)
- ID 6: Hendra Wijaya (Pelatih Ekskul, Jadwal Fleksibel)
- ID 7: Ratna Sari, A.Md (PTY, Staf TU, Jadwal Reguler 6 Hari)
- ID 8: Bambang Prasetyo, S.Pd (GTY, Guru Mapel)
- ID 9: Nurul Hidayah, S.Pd (PTY, Guru Mapel)
- ID 10: Eko Susanto, M.Pd (PNS DPK, Guru Mapel)
- ID 11: Linda Permata (PTY, Staf Dapur, Jadwal Reguler 6 Hari)
- ID 12: Dimas Saputra (Pelatih Ekskul, Jadwal Fleksibel)

---

## (c) Hasil Pengujian Otomatis

- **Pengujian dbGuard Safety Assertion (`dbGuard.test.js`):**
  - Menerima `127.0.0.1` + `*_dev`: **LULUS**
  - Menolak host remote publik: **LULUS (ERR_REMOTE_DB_FORBIDDEN)**
  - Menolak database tanpa `_dev` atau nama `u622997391_*`: **LULUS (ERR_NON_DEV_DATABASE_FORBIDDEN)**
- **Seluruh Test Suite Modul Kepegawaian & Database Guard:**
  ```text
  ✔ dbGuard.test.js -> 6 passed
  ✔ actorGuard.integration.test.js -> 6 passed
  ✔ actorHelper.test.js -> 6 passed
  ✔ calendarService.test.js -> 24 sub-checks passed
  ✔ durationCalculator.test.js -> 22 passed
  ✔ entitlementCalculator.test.js -> 8 passed
  ✔ leave.integration.test.js -> 5 passed
  ────────────────────────────────────────────────────────
  Total: 54 Passed, 0 Failed, 0 Cancelled (100% Lulus)
  ```

---

## (d) KEPUTUSAN OTOMATIS & Catatan Keamanan
1. **Pemisahan Konfigurasi Lingkungan:** File `.env.dev` dibuat khusus untuk lingkungan dev lokal dan berada di bawah aturan `.gitignore` agar tidak pernah ter-commit ke repositori git.
2. **Pengaman Bootstrap Database:** Seluruh inisialisasi koneksi Knex pada modul Core, Kepegawaian, dan Akademik memprioritaskan konfigurasi dev lokal ketika dijalankan di lingkungan development lokal.
