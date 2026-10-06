# ATURAN KERJA PEMBANGUNAN ULANG PORTAL GURU
**Core Aldepos Monorepo**  
**Status:** Wajib Dipatuhi (Strict Rules)  
**Dokumen Rujukan:** `docs/AUDIT-PORTAL-GURU.md`, `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md`, `AGENTS.md`

---

1. **Satu Tahap, Satu Tujuan**  
   Kerjakan HANYA lingkup yang diminta pada tahap aktif. Jangan mengerjakan hal di luar instruksi tahap saat ini.

2. **Isolasi Modul Terkendali**  
   Jangan mengubah file pada modul lain di luar daftar modul/file yang secara eksplisit disebutkan dalam prompt tahap aktif.

3. **Patuhi Pola Monorepo Eksisting**  
   Ikuti arsitektur dan pola baku monorepo Core Aldepos (struktur controller-service-routes Knex, skema migrasi, snake_case, permission RBAC, standar response `{ success, data, message, errors }`). Selalu pelajari contoh nyata di modul Akademik dan Kepegawaian sebelum membuat struktur baru.

4. **Zero Dummy & Zero Hardcode (Anti-Mock)**  
   Dilarang keras menggunakan data dummy, array mock fallback, koordinat GPS hardcode, atau banner notifikasi simulasi palsu. Jika endpoint gagal atau mengembalikan data kosong, tampilkan Empty State atau Error State yang informatif dan jujur.

5. **Hindari Duplikasi Endpoint & Ketergantungan Baru**  
   Jangan membuat endpoint baru jika endpoint yang sama sudah tersedia di modul backend terkait. Dilarang menambah pustaka/dependency `npm` baru tanpa persetujuan eksplisit.

6. **State Resilien & Kode Bersih**  
   Setiap halaman antarmuka wajib mengimplementasikan 3 state utama: *Loading*, *Empty*, dan *Error State*. Bersihkan seluruh sisa `console.log`, `console.warn`, dan `console.error` dari kode produksi.

7. **Mobile-First & Sentuhan Presisi**  
   Antarmuka wajib didesain mulai dari lebar 360px (mobile viewport). Touch target tombol dan elemen interaktif minimal **44x44px**, dilarang menimbulkan scroll horizontal, dan formulir harus nyaman dioperasikan dengan satu tangan.

8. **Prosedur Keputusan Desain Baru (Stop & Ask)**  
   Untuk setiap keputusan desain yang belum tercatat di `docs/portal-guru/design-system.md` atau `docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md` (warna, tipografi, gaya komponen, pola navigasi): **BERHENTI**, ajukan 2 sampai 3 opsi terstruktur, dan tunggu keputusan/pilihan user. Dilarang langsung mengimplementasikannya secara sepihak.

9. **Review Desain Impeccable pada Tahap UI**  
   Pada setiap tahap pengerjaan UI, gunakan standar Impeccable sesuai konteks proyek. Setelah halaman selesai dibuat/dirombak, jalankan review desain Impeccable pada file halaman terkait dan segera selesaikan semua temuan kualitasnya.

10. **Sinkronisasi Dokumentasi Teknis Wajib**  
    Setiap penambahan atau perubahan migrasi database dan endpoint API wajib langsung dicatat ke dalam dokumen `api-contract-*.md` dan `erd-*.md` modul terkait pada tahap yang sama.

11. **Format Laporan Akhir Tahap & Pembaruan Progress**  
    Di akhir setiap tahap, sajikan ringkasan **maksimal 15 baris** yang memuat:
    - Apa yang dibuat / diselesaikan
    - File yang ditambah / diubah
    - Cara memverifikasi (test / manual step)
    - Hal yang belum selesai / catatan tahap berikutnya  
    Lalu perbarui status tahap terkait di `docs/portal-guru/PROGRESS.md`.
