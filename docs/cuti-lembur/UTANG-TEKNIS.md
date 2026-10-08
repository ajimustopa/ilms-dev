# Utang Teknis & Item Backlog Prioritas Rendah (P3)
**Modul:** Manajemen Cuti, Izin & Lembur (HRIS Core Aldepos)  
**Status:** Dicatat untuk Pengembangan Masa Depan (Sesuai SPEC-CUTI-LEMBUR.md §13)  
**Terakhir Diperbarui:** 2026-10-08  

---

## 1. Item Backlog Fitur Masa Depan (P3 - SPEC §13)

Berikut adalah daftar fitur bernilai tambah yang berada di luar lingkup implementasi inti v1 dan direkomendasikan untuk fase pemeliharaan/iterasi berikutnya:

1. **Notifikasi Real-time WhatsApp & Email Gateway:**
   - *Deskripsi:* Mengirimkan notifikasi instan ke WhatsApp atau Email Atasan Langsung/Kepala Sekolah saat ada pengajuan cuti baru yang membutuhkan persetujuan, serta notifikasi ke pegawai saat status pengajuannya disetujui/ditolak.
   - *Rekomendasi Arsitektur:* Menggunakan message queue (Redis/BullMQ) pada backend agar tidak memperlambat response time HTTP saat gateway eksternal mengalami latensi.

2. **Sinkronisasi Otomatis Mesin Fingerprint Fisik (Scheduled Cron Worker):**
   - *Deskripsi:* Daemon / cron worker yang menarik data log kehadiran mentah dari mesin fingerprint lokal sekolah (ZKTeco/ADMS) secara berkala dan mencocokkannya dengan data penugasan lembur riil.
   - *Rekomendasi:* Layanan background terisolasi dengan mekanisme retry idempoten.

3. **Permohonan Pembatalan Cuti Parsial Mandiri:**
   - *Deskripsi:* Mengizinkan pegawai untuk mengajukan pembatalan sebagian hari dari cuti berdurasi panjang yang telah disetujui (misal membatalkan hari ke-3 dari cuti 5 hari karena masuk kerja lebih awal), dengan alur approval revisi.
   - *Catatan Saat Ini:* Pembatalan parsial saat ini ditangani oleh HRD melalui penyesuaian manual (*Manual Balance Adjustment*) atau reklasifikasi izin.

4. **Multi-File Chunking Upload untuk Berkas Pendukung:**
   - *Deskripsi:* Dukungan upload banyak berkas lampiran sekaligus (misal beberapa kwitansi rawat inap dan resume medis) dengan mekanisme resume upload untuk berkas besar (>10MB).
   - *Catatan Saat Ini:* Sistem v1 mendukung satu berkas dokumen resmi (PDF/JPG/PNG maks 5MB) per pengajuan.

---

## 2. Temuan di Luar Lingkup (*Out-of-Scope Findings*)

Catatan teknis dari penelusuran modul kepegawaian dan modul terkait:

1. **Attendance Legacy Queries:**
   - Beberapa endpoint lama di `apps/api-backend/src/modules/kepegawaian/attendance/service.js` masih menggunakan query langsung tanpa memanfaatkan cache profil `job_positions` atau `employee_leave_balances`. Hal ini aman dan tidak mengganggu fungsionalitas, namun dapat dioptimalkan saat refaktorisasi modul presensi penuh.

2. **Kompabilitas Browser Seluler:**
   - Antarmuka Core Portal saat ini dioptimalkan khusus untuk resolusi Desktop (min 1024px) sesuai konvensi yayasan. Tampilan Portal Guru telah mendukung layar responsif untuk pengajuan cepat, namun tampilan manajemen HRD dirancang khusus desktop.
