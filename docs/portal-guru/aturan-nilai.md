# ATURAN DAN INTEGRASI PENILAIAN PORTAL GURU

Dokumen ini merangkum aturan validasi, pemanggilan API, dan status kunci nilai dari modul Akademik (`apps/core-portal/src/apps/akademik/pages/InputNilai.jsx` dan `apps/api-backend/src/modules/akademik/scores/`).

## 1. Arsitektur & Endpoint API Resmi

Penilaian siswa pada Portal Guru tersinkronisasi 100% dengan database Akademik tanpa membuat skema/tabel API baru:

| Fitur | Method & Path | Keterangan |
|---|---|---|
| **Jenis Pengujian** | `GET /akademik/assessment-types` | Daftar jenis tes (Formatif, Sumatif Lingkup Materi, STS, SAS) |
| **Daftar Sesi Penilaian** | `GET /akademik/assessment-sessions` | Filter: `satuan_pendidikan_id`, `academic_year_id`, `semester_id`, `class_group_id`, `subject_id` |
| **Buat Sesi Penilaian** | `POST /akademik/assessment-sessions` | Payload: `satuan_pendidikan_id`, `academic_year_id`, `semester_id`, `class_group_id`, `subject_id`, `assessment_type_id`, `title`, `assessment_date`, `max_score`, `learning_objective_ids` |
| **Nilai Siswa per Sesi** | `GET /akademik/assessment-sessions/:id/scores` | Mengambil data santri rombel & nilai yang tersimpan di sesi tersebut |
| **Simpan Nilai Sesi (Bulk)** | `POST /akademik/assessment-sessions/:id/scores` | Payload `{ items: [{ student_id, score, feedback, tp_scores }] }` |
| **KKM / KKTP Mapel** | `GET /akademik/curriculum/subject-grade-kkms` | Nilai batas ketuntasan minimal (default: 75.00) |

## 2. Aturan Validasi Skor & Input

1. **Rentang Nilai**:
   - Rentang angka sah adalah `0.00` hingga `max_score` (default `100.00`).
   - Nilai boleh bernilai `null` atau kosong (string kosong) jika santri belum mengikuti asesmen atau berhalangan sakit/izin.
2. **Format Desimal**:
   - Mendukung angka pecahan hingga 2 desimal (misal `78.50`, `85.25`).
3. **Indikator Ketuntasan KKM**:
   - `score >= KKM`: Tuntas (Indikator Hijau).
   - `score < KKM`: Belum Tuntas / Perlu Remedial (Indikator Merah/Amber).
4. **Perhitungan TP Otomatis**:
   - Jika sesi penilaian terhubung dengan satu atau beberapa Tujuan Pembelajaran (TP), backend secara otomatis menyinkronkan skor ke tabel `student_tp_scores` beserta status ketercapaian (`tercapai_optimal`, `tercapai`, `cukup`, `perlu_bimbingan`).

## 3. Aturan Kunci Nilai (Locking Policy)

1. **Status Terkunci**:
   - Sesi penilaian yang berstatus terkunci (`is_locked = true` atau telah diproses ke rapor final) **tidak boleh diubah**.
   - Pada antarmuka guru, input nilai menjadi *read-only* (`disabled`), tombol simpan dinonaktifkan, dan ditampilkan banner informasi: *"Sesi Penilaian Terkunci oleh Kurikulum"*.
2. **Pemberian Feedback / Catatan Guru**:
   - Guru dapat menyertakan feedback naratif per siswa pada kolom `feedback` yang disimpan langsung ke database sesi penilaian.
