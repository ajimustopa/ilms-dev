# Aturan Proyek: Portal Guru (Core Aldepos)
- Ikuti stack, struktur folder, dan konvensi yang SUDAH ada di repo. Jangan memperkenalkan framework, ORM, atau library UI baru tanpa persetujuan.
- Ikuti docs/PRD-PORTAL-GURU-UIUX.md dan docs/PANDUAN-DESAIN-ENTERPRISE-ALDEPOS.md. Token desain: slate-50/900, 4 warna semantik (emerald, rose, amber, indigo), radius 8/12px, font Inter, angka tabular. Dilarang dark mode, gradasi, radius di atas 12px.
- Jangan membuat endpoint, tabel, atau kolom baru jika sudah ada yang setara. Selalu cari dulu di kode yang ada dan laporkan temuan.
- Perubahan skema DB hanya lewat file migrasi yang bisa di-rollback. Jangan pernah menjalankan migrasi, seed, atau query tulis ke database tanpa persetujuan eksplisit saya.
- Semua endpoint wajib: validasi input, otorisasi berbasis peran guru, filter data hanya milik guru yang login (guru tidak boleh melihat data guru/sekolah lain).
- Setiap halaman wajib punya 4 state: loading skeleton, empty, error, dan offline/GPS lemah (khusus presensi).
- Akhir setiap tugas: jalankan lint, type-check, dan test, lalu laporkan hasilnya. Jangan menyatakan selesai jika ada yang gagal.
- Jangan menyimpan secret atau kredensial di kode. Pakai environment variable.
