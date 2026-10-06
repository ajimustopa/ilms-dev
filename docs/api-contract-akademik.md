Status: perlu-revisi
Diperbarui: 2026-08-24

# api-contract-akademik.md

> Dokumen ini adalah spesifikasi kontrak RESTful API untuk **Akademik**, mengikuti pola
> `api-contract-coreservice.md` dan `api-contract-kepegawaian.md`. Menjadi acuan implementasi
> backend Akademik dan integrasi modul lain dalam ekosistem Sistem Manajemen Sekolah Terintegrasi.
>
> **Status: DRAF.** Daftar endpoint di Bagian 3 mengikuti tabel tabel di `erd-akademik.md` yang
> juga masih draf (29 dari 36 fitur) — endpoint untuk 7 fitur yang belum teridentifikasi belum
> ada di sini. Path & payload bisa berubah kalau ERD berubah setelah review.

---

## 1. Informasi Umum & Konvensi Global

### 1.1 Base URL
- **Production:** `https://api.aldeposibs.com/api/v1/akademik`
- **Staging / Testing:** `https://staging-api.aldeposibs.com/api/v1/akademik`
- **Lokal Development:** `http://localhost:3000/api/v1/akademik`

### 1.2 Skema Autentikasi, Otorisasi, & Perlindungan Data Sensitif (PII)

Sama seperti Core Service dan Kepegawaian:

1. **Bearer Token (JWT) — untuk Pengguna (Admin, Guru, Wali Kelas, TU, Kepsek, Orang Tua):**
   ```http
   Authorization: Bearer <access_token>
   ```
   Token diterbitkan Core Service, diverifikasi lokal (signature) oleh Akademik tanpa call ke
   Core tiap request. Payload berisi `account_type` dan `user_school_roles` yang menentukan hak
   akses per Satuan Pendidikan.

2. **Perlindungan Data Sensitif (PII - Personally Identifiable Information):**
   - Field data sensitif: `nik`, `family_card_number` (siswa & wali), dan `income_range` (wali).
   - **At-Rest**: Disimpan terenkripsi atau terproteksi di database.
   - **Response API Auto-Masking**: Jika request dipanggil oleh role non-admin (mis. `guru`, `wali_kelas`, `pembina_ekskul`, dll), nilai `nik` dan `family_card_number` otomatis dimasking menjadi `3201************0001`, dan `income_range` disamarkan. Hanya role `admin_satuan_pendidikan`, `admin_yayasan`, dan `super_admin` yang menerima nilai asli (unmasked).

3. **API Key (`X-API-Key`) — untuk Internal Service-to-Service:**
   ```http
   X-API-Key: <service_api_key>
   ```
   Dipakai modul lain (Portal Orangtua, Keuangan, Kantin, Perpustakaan, CBE, Komunikasi &
   Notifikasi, Tahfidz & Al-Quran, Pengelolaan) memanggil **Internal Endpoint** Akademik (Bagian
   3.9) untuk membaca data siswa/rombel/nilai/presensi tanpa perlu context user login.

4. **Webhook Signature Header (`X-Webhook-Signature`):** disertakan pada payload event yang
   dipublish Akademik ke subscriber, format sama seperti Core Service.

### 1.3 Standar Struktur Response JSON

Sama persis dengan Core Service/Kepegawaian:

```json
{
  "success": true,
  "data": { } ,
  "message": "Pesan sukses operasi",
  "errors": null
}
```

```json
{
  "success": false,
  "data": null,
  "message": "Pesan ringkas kegagalan",
  "errors": [ { "field": "nisn", "message": "NISN sudah terdaftar" } ]
}
```

### 1.4 Kode Status HTTP

Sama seperti `api-contract-coreservice.md` §1.4 (`200`, `201`, `400`, `401`, `403`, `404`,
`409`, `422`, `429`, `500`) — tidak diulang di sini.

### 1.5 Parameter Query Umum untuk List Endpoint

| Parameter | Keterangan |
|---|---|
| `page`, `per_page` | Paginasi |
| `satuan_pendidikan_id` | **Wajib** untuk hampir semua endpoint list Akademik (kecuali endpoint global seperti `academic_years`) |
| `academic_year_id` / `semester_id` | Filter periode, dipakai luas di modul Penilaian/Presensi/Kesiswaan |
| `search` | Pencarian nama/NIS/NISN pada endpoint siswa |

---

## 2. Ringkasan Endpoint per Modul Fitur

| Modul (rancangan-akademik.md §4) | Prefix Endpoint |
|---|---|
| Data Master Siswa | `/students`, `/guardians`, `/student-mutations` |
| Kurikulum | `/academic-years`, `/semesters`, `/grade-levels`, `/class-groups`, `/subjects`, `/teaching-assignments`, `/enrollments` |
| Penilaian | `/scores`, `/attitude-scores` |
| Rapor | `/report-cards` |
| Presensi | `/attendances`, `/leave-requests` |
| Kesiswaan | `/disciplinary-records`, `/achievements`, `/counseling-records`, `/extracurriculars`, `/calendar-events` |
| Laporan | `/reports/academic-summary` |
| Keamanan | `/activity-logs` |
| Internal (service-to-service) | `/internal/*` |

---

## 3. Detail Endpoint

### 3.1 Data Master Siswa

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/students` | List siswa ringkas, filter `satuan_pendidikan_id`, `status`, `search` | JWT (Admin/TU/Guru/Wali Kelas) |
| `POST` | `/students` | Buat siswa baru (termasuk alamat, fisik, registrasi, ortu/wali & checklist awal) | JWT (Admin/TU) |
| `GET` | `/students/:id` | Detail komprehensif siswa (identitas Dapodik, alamat, fisik, admisi, wali, checklist) | JWT |
| `PUT` | `/students/:id` | Update data induk siswa (termasuk upsert child tables: alamat, fisik, admisi) | JWT (Admin/TU) |
| `DELETE` | `/students/:id` | Nonaktifkan siswa (soft delete, `status` diubah ke 'keluar') | JWT (Admin) |
| `GET` | `/students/:id/guardians` | List wali dari satu siswa (termasuk kolom penanggung biaya) | JWT |
| `POST` | `/students/:id/guardians` | Tambah/kaitkan wali ke siswa | JWT (Admin/TU) |
| `GET` | `/guardians` | List wali, filter `search` | JWT (Admin/TU) |
| `PUT` | `/guardians/:id` | Update data induk orang tua / wali | JWT (Admin/TU) |
| `GET` | `/students/:id/document-checklist` | Ambil status checklist berkas pendaftaran siswa | JWT (Admin/TU/Wali Kelas) |
| `PUT` | `/students/:id/document-checklist` | Update status checklist berkas pendaftaran (input / verifikasi) | JWT (Admin/TU) |
| `GET` | `/students/:id/report-card-completeness` | Rekap kelengkapan rapor per kelas × semester (dihitung otomatis dari `report_cards`) | JWT |
| `GET` | `/student-mutations` | Riwayat mutasi, filter `student_id`, `mutation_type`, `satuan_pendidikan_id` | JWT (Admin/TU) |
| `POST` | `/student-mutations` | Catat mutasi baru (kelulusan, pindah keluar/masuk) — update status siswa | JWT (Admin) |

#### 3.1.1 Contoh Payload `POST /students`
```json
{
  "satuan_pendidikan_id": 1,
  "nis": "2026001",
  "nisn": "0081234567",
  "nipd": "PD-2026-001",
  "family_card_number": "3201012345670001",
  "nik": "3201012345670002",
  "full_name": "Ahmad Fadhil",
  "nickname": "Fadhil",
  "gender": "L",
  "birth_place": "Bogor",
  "birth_date": "2012-05-14",
  "birth_certificate_reg_no": "1234/DISDUK/2012",
  "order_in_family": 2,
  "number_of_siblings": 2,
  "number_of_step_siblings": 0,
  "number_of_adoptive_siblings": 0,
  "religion": "islam",
  "citizenship": "WNI",
  "special_needs": null,
  "primary_language": "Bahasa Indonesia",
  "hobby": "Membaca",
  "ambition": "Insinyur",
  "photo_url": "https://cdn.aldeposibs.com/photos/students/2026001.jpg",
  "status": "calon",
  "enrolled_at": "2026-07-15",
  "address": {
    "street_address": "Jl. Raya Bogor No. 123",
    "rt": "03",
    "rw": "05",
    "hamlet": "Dusun Melati",
    "village": "Caringin",
    "district": "Caringin",
    "postal_code": "16730",
    "full_address": "Jl. Raya Bogor No. 123 RT 03/05 Caringin, Bogor",
    "email": "ahmad.fadhil@example.com",
    "gmaps_url": "https://maps.google.com/?q=-6.689,106.832",
    "latitude": -6.6891234,
    "longitude": 106.8324567,
    "residence_type": "orang_tua",
    "transportation_mode": "sepeda_motor",
    "travel_distance_km": 3.5,
    "travel_time_minutes": 15
  },
  "physical_data": {
    "height_cm": 145.0,
    "weight_kg": 38.5,
    "blood_type": "O",
    "medical_history": "Asma ringan saat balita"
  },
  "admission": {
    "initial_grade_level_id": 1,
    "initial_class_group_id": 1,
    "registration_type": "siswa_baru",
    "admission_date": "2026-07-15",
    "previous_school_name": "SD IT Al-Ikhlas",
    "previous_school_address": "Jl. K.H. Soleh Iskandar No. 10"
  },
  "document_checklist": {
    "form_submitted": true,
    "birth_cert_submitted": true,
    "family_card_submitted": true,
    "father_ktp_submitted": true,
    "mother_ktp_submitted": true,
    "photo_2x3_submitted": true,
    "photo_3x4_submitted": true,
    "notes": "Menunggu legalisir SKHUN"
  }
}
```

#### 3.1.2 Contoh Response `GET /students/:id`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "satuan_pendidikan_id": 1,
    "nis": "2026001",
    "nisn": "0081234567",
    "nipd": "PD-2026-001",
    "family_card_number": "3201************0001",
    "nik": "3201************0002",
    "full_name": "Ahmad Fadhil",
    "nickname": "Fadhil",
    "gender": "L",
    "birth_place": "Bogor",
    "birth_date": "2012-05-14",
    "birth_certificate_reg_no": "1234/DISDUK/2012",
    "order_in_family": 2,
    "number_of_siblings": 2,
    "number_of_step_siblings": 0,
    "number_of_adoptive_siblings": 0,
    "religion": "islam",
    "citizenship": "WNI",
    "special_needs": null,
    "primary_language": "Bahasa Indonesia",
    "hobby": "Membaca",
    "ambition": "Insinyur",
    "address": "Jl. Raya Bogor No. 123 RT 03/05 Caringin, Bogor",
    "photo_url": "https://cdn.aldeposibs.com/photos/students/2026001.jpg",
    "user_id": 150,
    "status": "aktif",
    "enrolled_at": "2026-07-15",
    "student_address": {
      "street_address": "Jl. Raya Bogor No. 123",
      "rt": "03",
      "rw": "05",
      "hamlet": "Dusun Melati",
      "village": "Caringin",
      "district": "Caringin",
      "postal_code": "16730",
      "full_address": "Jl. Raya Bogor No. 123 RT 03/05 Caringin, Bogor",
      "email": "ahmad.fadhil@example.com",
      "gmaps_url": "https://maps.google.com/?q=-6.689,106.832",
      "latitude": -6.6891234,
      "longitude": 106.8324567,
      "residence_type": "orang_tua",
      "transportation_mode": "sepeda_motor",
      "travel_distance_km": 3.5,
      "travel_time_minutes": 15
    },
    "physical_data": {
      "height_cm": 145.0,
      "weight_kg": 38.5,
      "blood_type": "O",
      "medical_history": "Asma ringan saat balita"
    },
    "admission": {
      "initial_grade_level_id": 1,
      "initial_class_group_id": 1,
      "registration_type": "siswa_baru",
      "admission_date": "2026-07-15",
      "previous_school_name": "SD IT Al-Ikhlas",
      "previous_school_address": "Jl. K.H. Soleh Iskandar No. 10"
    },
    "document_checklist": {
      "form_submitted": true,
      "form_verified": true,
      "birth_cert_submitted": true,
      "birth_cert_verified": true,
      "family_card_submitted": true,
      "family_card_verified": false,
      "father_ktp_submitted": true,
      "father_ktp_verified": true,
      "mother_ktp_submitted": true,
      "mother_ktp_verified": true,
      "other_docs_submitted": false,
      "other_docs_verified": false,
      "photo_2x3_submitted": true,
      "photo_2x3_verified": true,
      "photo_3x4_submitted": true,
      "photo_3x4_verified": true,
      "class_group_joined": true,
      "class_group_joined_verified": true,
      "teacher_socialized": true,
      "teacher_socialized_verified": true,
      "learning_started": true,
      "learning_started_verified": true,
      "data_completed": true,
      "data_verified": false,
      "notes": "Menunggu verifikasi KK"
    },
    "guardians": [
      {
        "id": 1,
        "nik": "3201************0003",
        "full_name": "Budi Santoso",
        "birth_place": "Jakarta",
        "birth_date": "1980-01-10",
        "education_level": "S1",
        "occupation": "Karyawan Swasta",
        "income_range": "5.000.000 - 10.000.000",
        "special_needs": null,
        "phone": "08123456789",
        "email": "budi@example.com",
        "address": "Jl. Raya Bogor No. 123",
        "relationship": "ayah",
        "expense_bearer": "ayah",
        "is_primary_contact": true
      }
    ]
  },
  "message": "Detail siswa berhasil diambil",
  "errors": null
}
```

#### 3.1.3 Contoh Response `GET /students/:id/report-card-completeness`
```json
{
  "success": true,
  "data": {
    "student_id": 1,
    "student_name": "Ahmad Fadhil",
    "nis": "2026001",
    "history": [
      {
        "grade_level": "7",
        "class_group_name": "7-A",
        "academic_year": "2026/2027",
        "semesters": [
          {
            "semester_id": 1,
            "semester_name": "ganjil",
            "has_report_card": true,
            "report_card_id": 12,
            "has_scores": true,
            "has_attitude_scores": true,
            "has_homeroom_note": true,
            "pdf_generated": true,
            "status": "lengkap"
          },
          {
            "semester_id": 2,
            "semester_name": "genap",
            "has_report_card": false,
            "report_card_id": null,
            "has_scores": false,
            "has_attitude_scores": false,
            "has_homeroom_note": false,
            "pdf_generated": false,
            "status": "belum_tersedia"
          }
        ]
      }
    ]
  },
  "message": "Rekap kelengkapan rapor berhasil diambil",
  "errors": null
}
```

### 3.2 Kurikulum & Jadwal Pembelajaran

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` / `POST` | `/academic-years` | List/buat tahun ajaran | JWT (Admin) |
| `PUT` | `/academic-years/:id/activate` | Set tahun ajaran aktif (nonaktifkan yang lain) | JWT (Admin) |
| `GET` / `POST` | `/semesters` | List/buat semester, filter `academic_year_id` | JWT (Admin) |
| `GET` / `POST` | `/grade-levels` | List/buat tingkat | JWT (Admin) |
| `GET` / `POST` | `/class-groups` | List/buat rombel, filter `satuan_pendidikan_id`, `academic_year_id` | JWT (Admin) |
| `GET` | `/class-groups/:id/members` | List anggota siswa dalam rombel (termasuk NIPD, NISN, nama, panggilan, TTL, & kontak wali primer) | JWT |
| `PUT` | `/class-groups/:id` | Update rombel (termasuk ganti wali kelas) | JWT (Admin) |
| `GET` | `/enrollments` | List penempatan siswa ke rombel, filter `class_group_id`, `student_id` | JWT |
| `POST` | `/enrollments` | Tempatkan siswa ke rombel | JWT (Admin/TU) |
| `POST` | `/enrollments/promote` | Proses kenaikan kelas massal (input: daftar `student_id` + `class_group_id` tujuan) | JWT (Admin) |
| `GET` / `POST` | `/subjects` | List/buat mata pelajaran, filter `satuan_pendidikan_id`, `grade_level_id` | JWT (Admin) |
| `GET` | `/teaching-duties` | List pembagian tugas mengajar guru & ekskul (filter `satuan_pendidikan_id`, `academic_year_id`, `class_group_id`) | JWT |
| `POST` | `/teaching-duties` | Tetapkan pembagian tugas mengajar | JWT (Admin) |
| `GET` | `/my-teaching-assignments` | **Endpoint Guru:** Daftar penugasan mengajar & rombel perwalian wali kelas guru yang login | JWT (Guru) |
| `GET` | `/schedules` | List jadwal KBM sekolah (filter `satuan_pendidikan_id`, `academic_year_id`, `preset_id`, `day_of_week`, `teacher_employee_id`, `class_group_id`) | JWT |
| `GET` | `/my-schedules` | **Endpoint Guru:** Jadwal mengajar guru yang login (diambil dari token `ref_id`, filter `satuan_pendidikan_id`, `academic_year_id`, `day_of_week`) | JWT (Guru) |
| `GET` | `/teaching-journals` | List jurnal mengajar (filter `schedule_id`, `teacher_employee_id`, `start_date`, `end_date`, `academic_year_id`) | JWT (Guru/Admin) |
| `GET` | `/teaching-journals/today-status` | **Endpoint Guru:** Status pengisian jurnal hari ini untuk seluruh jadwal aktif guru yang login | JWT (Guru) |
| `GET` | `/teaching-journals/:id` | Detail jurnal mengajar (termasuk data jadwal, rombel, & tujuan pembelajaran) | JWT (Guru/Admin) |
| `POST` | `/teaching-journals` | Buat jurnal mengajar KBM (validasi kepemilikan jadwal & unique schedule_id + date) | JWT (Guru/Admin) |
| `PUT` | `/teaching-journals/:id` | Perbarui materi/catatan/tujuan pembelajaran jurnal mengajar | JWT (Guru/Admin) |
| `DELETE` | `/teaching-journals/:id` | Hapus jurnal mengajar | JWT (Guru/Admin) |

#### 3.2.1 Contoh Response `GET /my-schedules`
```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": 1,
      "full_name": "Ahmad Fauzi, S.Pd",
      "employee_number": "PEG-0001",
      "school_unit_id": 1
    },
    "schedules": [
      {
        "id": 15,
        "satuan_pendidikan_id": 1,
        "academic_year_id": 1,
        "preset_id": 1,
        "subject_id": 2,
        "subject_name": "Matematika",
        "subject_code": "MAT-7",
        "teacher_employee_id": 1,
        "teacher_name": "Ahmad Fauzi, S.Pd",
        "day_of_week": 1,
        "day_name": "monday",
        "day_label_id": "Senin",
        "start_time": "07:30:00",
        "end_time": "09:00:00",
        "room_name": "Ruang Kelas 7A",
        "schedule_type": "subject",
        "class_groups": [
          { "id": 5, "name": "Kelas 7A", "type": "regular" }
        ],
        "class_group_names": "Kelas 7A"
      }
    ]
  },
  "message": "Jadwal mengajar guru berhasil dimuat",
  "errors": null
}
```

#### 3.2.2 Contoh Response `GET /my-teaching-assignments`
```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": 1,
      "full_name": "Ahmad Fauzi, S.Pd",
      "employee_number": "PEG-0001",
      "school_unit_id": 1
    },
    "is_homeroom_teacher": true,
    "homeroom_class_groups": [
      {
        "id": 5,
        "name": "Kelas 7A",
        "satuan_pendidikan_id": 1,
        "academic_year_id": 1,
        "grade_level_id": 1
      }
    ],
    "teaching_assignments": [
      {
        "id": 10,
        "subject_id": 2,
        "subject_name": "Matematika",
        "subject_code": "MAT-7",
        "class_group_id": 5,
        "class_group_name": "Kelas 7A",
        "allocated_hours": 4,
        "is_homeroom_for_this_class": true
      }
    ],
    "classes": [
      {
        "id": 5,
        "name": "Kelas 7A",
        "grade_level_id": 1,
        "satuan_pendidikan_id": 1,
        "academic_year_id": 1,
        "is_homeroom": true,
        "subjects": [
          { "id": 2, "name": "Matematika", "code": "MAT-7", "allocated_hours": 4 }
        ]
      }
    ]
  },
  "message": "Daftar penugasan mengajar dan rombel perwalian guru berhasil dimuat",
  "errors": null
}
```

### 3.3 Penilaian

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/scores` | List nilai, filter `student_id`, `subject_id`, `semester_id`, `score_type` | JWT |
| `POST` | `/scores` | Input nilai (harian/tugas/uts/uas) | JWT (Guru) |
| `POST` | `/scores/bulk` | Input nilai massal satu rombel-mapel sekaligus | JWT (Guru) |
| `POST` | `/scores/calculate-final` | Kalkulasi nilai akhir otomatis per siswa-mapel-semester | JWT (Admin/Guru) |
| `GET` / `POST` | `/attitude-scores` | List/input nilai sikap, filter `student_id`, `semester_id` | JWT (Guru/Wali Kelas) |

### 3.4 Rapor

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/report-cards` | List rapor, filter `student_id`, `semester_id` | JWT |
| `POST` | `/report-cards/generate` | Generate rapor PDF untuk satu siswa/satu rombel (`class_group_id`) | JWT (Wali Kelas/Admin) |
| `GET` | `/report-cards/:id` | Detail rapor + link file PDF | JWT |
| `PUT` | `/report-cards/:id/note` | Update catatan wali kelas | JWT (Wali Kelas) |

### 3.5 Presensi

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/attendances` | List presensi, filter `student_id`, `class_group_id`, `attendance_date` (range) | JWT |
| `POST` | `/attendances` | Input presensi satu siswa | JWT (Guru/Wali Kelas) |
| `POST` | `/attendances/bulk` | Input presensi massal satu rombel-tanggal sekaligus | JWT (Wali Kelas) |
| `GET` | `/attendances/summary` | Rekap presensi per siswa/rombel dalam periode | JWT |
| `GET` / `POST` | `/leave-requests` | List/ajukan izin-sakit siswa | JWT (Orang Tua/Wali Kelas) |
| `PUT` | `/leave-requests/:id/approve` | Setujui/tolak pengajuan izin | JWT (Wali Kelas) |

### 3.6 Kesiswaan & Kejadian Siswa Terpadu

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/incident-categories` | List master kategori kejadian (pelanggaran, prestasi, adab) per `satuan_pendidikan_id` | JWT |
| `POST` | `/incident-categories` | Tambah kategori baru (`code`, `name`, `type`, `severity_level`, `default_points`) | JWT (`akademik.disciplinary.manage`) |
| `PUT` | `/incident-categories/:id` | Update master kategori kejadian | JWT (`akademik.disciplinary.manage`) |
| `GET` | `/incidents` | List buku catatan kejadian siswa terpadu (filter unit, type, student, status, date, search) — Server menegakkan `visibility_level` (`public_school`, `teachers_only`, `homeroom_and_bk`, `bk_only`) | JWT |
| `GET` | `/incidents/:id` | Detail kejadian + data siswa, pelapor, penangan, verifikator & sesi BK terkait | JWT (terproteksi visibilitas) |
| `POST` | `/incidents` | Catat kejadian/prestasi baru (otomatis rekam `reported_by_employee_id`) | JWT |
| `PUT` | `/incidents/:id` | Update rincian kejadian (hanya pelapor sebelum status selesai, atau Kesiswaan/Admin) | JWT |
| `PATCH` | `/incidents/:id/handling-status` | Update status alur penanganan (`reported`, `in_progress`, `resolved`, `cancelled`) & tindakan pembinaan | JWT |
| `PATCH` | `/incidents/:id/verify-points` | Verifikasi poin & penetapan sanksi/reward resmi | JWT (`akademik.disciplinary.manage`) |
| `GET` | `/incidents/students/:student_id/summary` | Rekap poin total (+/-) dan skor perilaku bersih santri | JWT |
| `GET` / `POST` | `/disciplinary-records` | List/catat pelanggaran (Legacy compatibility wrapper) | JWT (Guru BK/Wali Kelas) |
| `GET` / `POST` | `/achievements` | List/catat prestasi (Legacy compatibility wrapper) | JWT (Guru/Wali Kelas) |
| `GET` / `POST` | `/counseling-records` | List/catat sesi BK (terhubung ke `incident_id` dan `satuan_pendidikan_id`) | JWT (Guru BK) |
| `GET` / `POST` | `/extracurriculars` | List/buat ekskul | JWT (Admin/Pembina) |
| `POST` | `/extracurriculars/:id/members` | Daftarkan siswa ke ekskul | JWT (Admin/Pembina) |
| `GET` / `POST` | `/calendar-events` | List/buat agenda kalender akademik | JWT (Admin) |

### 3.7 Laporan

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/reports/academic-summary` | Dashboard rekap akademik, filter `satuan_pendidikan_id`/`class_group_id`, `academic_year_id` | JWT (Admin/Kepsek) |
| `GET` | `/reports/export` | Ekspor data siswa/nilai, `format=excel|pdf` | JWT (Admin/TU) |

### 3.8 Keamanan

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `GET` | `/activity-logs` | List log aktivitas, filter `user_id`, `action`, tanggal | JWT (Admin) |

### 3.9 Internal Endpoint (Service-to-Service, `X-API-Key`)

Dikonsumsi modul lain lewat pemanggilan in-process/HTTP internal:

| Method | Path | Deskripsi | Dikonsumsi Oleh |
|---|---|---|---|
| `GET` | `/internal/students/:id` | Detail ringkas siswa (untuk validasi ID dari modul lain) | Semua modul konsumen |
| `GET` | `/internal/students` | List siswa aktif per `satuan_pendidikan_id`, dipakai untuk penagihan massal | Keuangan |
| `GET` | `/internal/students/:id/guardians` | Data wali untuk notifikasi/portal | Portal Orangtua, Komunikasi & Notifikasi |
| `GET` | `/internal/class-groups/:id` | Detail rombel | Kantin, Perpustakaan, CBE |
| `GET` | `/internal/academic-years` | List tahun ajaran akademik (aktif & riwayat) per satuan pendidikan | PSB, Keuangan, Portal |
| `POST` | `/internal/scores/exam-result` | Terima hasil ujian daring dari CBE untuk masuk `student_scores` | CBE *(perlu dikonfirmasi — lihat rancangan-akademik.md §6)* |

> Endpoint provisioning akun **bukan** endpoint yang Akademik sediakan — Akademik yang
> **memanggil** service provisioning milik Core Service (bukan sebaliknya), sesuai
> `rancangan-akademik.md` §2.

---

## 4. Format Payload Webhook yang Dipublish Akademik

Mengikuti standar global `ARSITEKTUR-SISTEM.md` §4:

```json
{
  "event_type": "student.created",
  "timestamp": "2026-08-17T08:00:00Z",
  "satuan_pendidikan_id": 3,
  "data": { "student_id": 1201, "nis": "2026001", "full_name": "Contoh Nama" }
}
```

**Daftar `event_type` — DRAF, perlu disepakati** (lihat `rancangan-akademik.md` §5):
`student.created`, `student.class_changed`, `student.graduated`, `student.transferred_out`,
`guardian.updated`.

---

## 5. Keputusan Terbuka Terkait Kontrak API

- Endpoint untuk 7 fitur yang belum teridentifikasi di `rancangan-akademik.md` §4 belum ada di
  sini — akan ditambahkan setelah daftar fitur final.
- Endpoint `/internal/scores/exam-result` (integrasi CBE) masih berupa usulan, perlu konfirmasi
  apakah Akademik benar jadi tempat menyimpan hasil ujian CBE atau cukup referensi tanpa disalin.
- Rate limit per endpoint mengikuti aturan global (`rate_limit_rules` di Core Service) — belum
  ada nilai spesifik yang diusulkan untuk endpoint Akademik yang volumenya besar (`/scores/bulk`,
  `/attendances/bulk`).

## 6. Status & Log Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-10-06 | Penambahan endpoint kurikulum KBM Portal Guru: `/my-schedules`, `/my-teaching-assignments`, dan manajemen Jurnal Mengajar (`/teaching-journals` CRUD & `/teaching-journals/today-status`). |
| 2026-08-19 | Redesain & perluasan skema Data Induk Siswa standar Dapodik: penambahan field pribadi komprehensif, relasi tabel 1:1 `student_addresses`, `student_physical_data`, `student_admissions`, `student_document_checklists`, endpoint derived `GET /students/:id/report-card-completeness`, serta spesifikasi perlindungan & masking PII (NIK, No. KK, penghasilan). |
| 2026-08-17 | Draf awal, mencakup endpoint untuk 29 dari 36 fitur di `rancangan-akademik.md` §4. |

*(Tambahkan baris baru di atas setiap ada keputusan penting/perubahan cakupan — jangan hapus
riwayat lama.)*
