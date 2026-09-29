Status: perlu-revisi
Diperbarui: 2026-08-24

# roles-akademik.md

> Dokumen ini adalah acuan matriks role & permission untuk **Akademik**, mengikuti pola
> `roles-coreservice.md` dan `roles-kepegawaian.md`. Contoh path endpoint memakai prefix
> `/api/v1/akademik/...` sesuai `ARSITEKTUR-SISTEM.md` Bagian 1.1.
>
> **Status: DRAF** — mengikuti fitur draf di `rancangan-akademik.md` §4. Role di bawah adalah
> role **spesifik konteks Akademik** yang dipetakan lewat `user_school_roles` milik Core Service
> (Keputusan Final #3 `erd-coreservice.md`) — Akademik sendiri **tidak menyimpan tabel role**,
> hanya memakai `role.name` dan `permission` dari JWT yang diterbitkan Core Service.

---

## 1. Konsep & Arsitektur RBAC Akademik

Akademik memakai model RBAC yang sama dengan Core Service dan Kepegawaian: role global
(`super_admin`, dst) didefinisikan di Core Service, tapi **penetapan role per Satuan Pendidikan**
dicatat di `user_school_roles`. Guru yang mengajar di 2 sekolah bisa punya role berbeda di
masing-masing (mis. Wali Kelas di satu sekolah, Guru Mapel biasa di sekolah lain).

### 1.1 Prinsip Desain
1. Definisi role tetap global (di Core Service) — Akademik hanya konsumen nama role & permission
   lewat payload JWT, tidak mendefinisikan ulang.
2. Permission spesifik Akademik ditambahkan ke tabel `permissions` global Core Service dengan
   prefix `akademik.*` (mis. `akademik.students.create`), mengikuti pola `core.*` dan
   `kepegawaian.*` yang sudah ada.
3. Beberapa role di Akademik **scope-nya lebih sempit dari satuan pendidikan** — mis. Wali Kelas
   hanya boleh akses siswa di rombelnya sendiri, Guru Mapel hanya siswa di kelas yang diajarnya.
   Ini **tidak** bisa direpresentasikan lewat `user_school_roles` saja (yang granularitasnya per
   satuan pendidikan) — perlu pengecekan tambahan di service-layer Akademik terhadap
   `class_groups.homeroom_teacher_employee_id` / `teaching_assignments.teacher_employee_id`.
   **Ini keputusan terbuka**, lihat Bagian 6.

---

## 2. Definisi Daftar Role

| Nama Role (`roles.name` di Core Service) | Kategori Scope | Deskripsi Peran di Akademik |
|---|---|---|
| `super_admin` | Global | Akses penuh seluruh data Akademik lintas satuan pendidikan (warisan dari Core Service). |
| `admin_yayasan` | Yayasan (lintas satuan) | Melihat rekap akademik lintas satuan pendidikan, mengelola tahun ajaran/semester/tingkat yayasan-wide. |
| `admin_satuan_pendidikan` / `tu` (Tata Usaha) | Spesifik satuan pendidikan | Mengelola data induk siswa/ortu, rombel, mutasi, jadwal ajar di sekolahnya. |
| `kepala_sekolah` | Spesifik satuan pendidikan | Melihat dashboard rekap akademik, menyetujui hal tertentu (opsional, lihat Bagian 6), tidak input data harian. |
| `guru` (Guru Mapel) | Terbatas ke jadwal ajarnya | Input nilai & presensi hanya untuk rombel-mapel yang diampu (`teaching_assignments`). |
| `wali_kelas` | Terbatas ke rombelnya | Semua hak `guru` + input nilai sikap, catatan rapor, presensi harian, approve izin, untuk siswa di rombel yang diampu sebagai wali kelas. |
| `guru_bk` | Spesifik satuan pendidikan | Akses `disciplinary-records`, `counseling-records`, `achievements`. |
| `pembina_ekskul` | Terbatas ke ekskul yang dibina | Mengelola anggota & jadwal ekskul yang dibinanya. |
| `orang_tua` | Self-service, per anak | Melihat data anaknya sendiri (nilai, rapor, presensi, kesiswaan non-BK), mengajukan izin. |
| `siswa` *(opsional, lihat Bagian 6)* | Self-service | Melihat nilai/rapor/presensi milik sendiri, kalau modul ini disepakati punya akses langsung untuk siswa (bukan hanya lewat ortu). |
| `internal_service` | Service-to-service | Kredensial API Key modul lain untuk baca data lewat Internal Endpoint (`api-contract-akademik.md` §3.9). |

---

## 3. Matriks Hak Akses per Fitur (Ringkas — Draf)

> **Keterangan Simbol:** ✅ Diizinkan penuh · 🏫 Scope satuan pendidikan · 🎒 Scope rombel/jadwal
> ajar sendiri (perlu cek tambahan service-layer, lihat §1.1 poin 3) · 👤 Self-service (anak
> sendiri) · ❌ Tidak diizinkan

| Fitur | `admin_satuan_pendidikan` | `kepala_sekolah` | `guru` | `wali_kelas` | `guru_bk` | `orang_tua` |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| CRUD data siswa/ortu | ✅ | ❌ (lihat saja) | ❌ | ❌ | ❌ | ❌ |
| Akses Data Sensitif PII (NIK, No KK, Penghasilan) | ✅ (Unmasked) | ❌ (Masked) | ❌ (Masked) | ❌ (Masked) | ❌ (Masked) | 👤 (Anak sendiri) |
| Kelola Checklist Berkas Pendaftaran | ✅ | 🏫 (lihat saja) | ❌ | 🎒 (lihat rombelnya) | ❌ | 👤 (lihat anak sendiri) |
| CRUD rombel & jadwal ajar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Input nilai | ❌ | ❌ | 🎒 | 🎒 | ❌ | ❌ |
| Input nilai sikap & catatan rapor | ❌ | ❌ | ❌ | 🎒 | ❌ | ❌ |
| Generate rapor | ✅ | 🏫 (lihat saja) | ❌ | 🎒 | ❌ | 👤 (lihat saja) |
| Input presensi harian | ❌ | ❌ | ❌ | 🎒 | ❌ | ❌ |
| Approve izin/sakit | ❌ | ❌ | ❌ | 🎒 | ❌ | ❌ (hanya ajukan) |
| Pencatatan pelanggaran & BK | ❌ | 🏫 (lihat saja) | ❌ | ❌ (lihat rombelnya) | ✅ | ❌ (lihat anak sendiri) |
| Dashboard rekap akademik | 🏫 | 🏫 | ❌ | 🎒 (rombelnya) | ❌ | ❌ |

> Matriks lengkap per 29 fitur draf akan ditambahkan setelah `rancangan-akademik.md` §4 direview
> dan final — tabel di atas baru mencakup fitur inti supaya polanya jelas dulu.

---

## 4. Contoh Penerapan di Middleware (`requirePermission`)

Mengikuti pola `apps/api-backend/src/middlewares/requirePermission.js` yang sudah ada untuk Core
Service/Kepegawaian, ditambah pengecekan scope rombel/jadwal ajar khusus Akademik:

```
GET /api/v1/akademik/scores?student_id=123
→ requirePermission('akademik.scores.read')
→ tambahan: kalau role = guru/wali_kelas, cek teaching_assignments/class_groups
  milik teacher_employee_id dari JWT mencakup rombel siswa 123, kalau tidak → 403
```

Pengecekan scope tambahan ini **belum ada polanya** di Core Service/Kepegawaian (yang scope-nya
cukup sampai level satuan pendidikan) — perlu ditulis khusus di service-layer Akademik. Lihat
Bagian 6.

---

## 5. Permission Baru yang Perlu Ditambahkan ke Core Service

Karena definisi role & permission global tetap hidup di tabel `permissions` Core Service, daftar
permission baru berikut perlu ditambahkan (lewat migration/seed Core Service, bukan Akademik)
saat Tahap 2 Akademik berjalan:

```
akademik.students.read / .create / .update / .delete
akademik.students.sensitive.read
akademik.students.checklist.manage
akademik.class_groups.manage
akademik.scores.read / .create
akademik.attendances.read / .create
akademik.disciplinary.read / .create
akademik.counseling.read / .create
akademik.report_cards.generate
```

---

## 6. Keputusan Terbuka Terkait Role & Permission

- **Scope per rombel/jadwal ajar** (guru hanya lihat siswa yang diajarnya) — perlu dikonfirmasi
  apakah ini benar-benar wajib dari awal, atau cukup scope per satuan pendidikan dulu (lebih
  sederhana) dan diperketat belakangan.
- **Role `siswa`** — apakah siswa (terutama SMP/SMA) punya akun & akses langsung untuk lihat
  nilai/rapor sendiri, atau semua akses siswa selalu lewat akun `orang_tua`?
- **`kepala_sekolah` sebagai role tersendiri** — apakah perlu dibuat eksplisit di Core Service
  (belum ada di `roles-coreservice.md` §2), atau memakai `admin_satuan_pendidikan` dengan
  permission lebih terbatas (read-only untuk sebagian fitur)?
- Level kerahasiaan `counseling_records.visibility_level` (lihat `erd-akademik.md` §2.19) —
  menentukan apakah `wali_kelas` boleh baca sebagian catatan BK atau tidak sama sekali.

## 7. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-19 | Penambahan matriks hak akses data sensitif PII (NIK, No. KK, rentang penghasilan ortu) dengan kebijakan masking otomatis untuk role non-admin, serta penambahan izin kelola checklist berkas pendaftaran. |
| 2026-08-17 | Draf awal, matriks lengkap baru mencakup fitur inti — menunggu `rancangan-akademik.md` §4 final untuk dilengkapi. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
