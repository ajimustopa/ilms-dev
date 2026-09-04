/**
 * Script to insert custom Chart of Accounts (COA) requested by user
 */
const db = require('../src/config/db/keuangan');

const rawCoaList = [
  // 1. HARTA
  { code: '101', parent: null, name: 'Kas Tunai', group: 'harta', normal: 'debit', level: 1, is_active: 1 },
  { code: '10101', parent: '101', name: 'Kas Tunai Umum', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '102', parent: null, name: 'Kas Bank', group: 'harta', normal: 'debit', level: 1, is_active: 1 },
  { code: '10201', parent: '102', name: 'Kas Bank - Kas Penerimaan (BSI 5114411440)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10202', parent: '102', name: 'Kas Bank - Kas TP Berjalan (BNI 1559456108)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10203', parent: '102', name: 'Kas Bank - Kas Operasional (BNI 1559557311)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10204', parent: '102', name: 'Kas Bank - Kas Kantin (BNI 1559494315)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10205', parent: '102', name: 'Kas Bank - Kas Tabungan THR (BNI 1559422963)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10206', parent: '102', name: 'Kas Bank - Bank #1 (BNI 1559480459)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10207', parent: '102', name: 'Kas Bank - Sport Center (BNI 1559508828)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10208', parent: '102', name: 'Kas Bank - Bank #2 (BNI 1559526575)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10209', parent: '102', name: 'Kas Bank - Bank #3 (BNI 1559539437)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10210', parent: '102', name: 'Kas Bank - Bank #4 (BNI 1559548330)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10211', parent: '102', name: 'Kas Bank - Dana Kurban (BNI 1559566982)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10212', parent: '102', name: 'Kas Bank - Bank #5 (BNI 1857137308)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10213', parent: '102', name: 'Kas Bank - Bank #6 (BNI 1857138630)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10214', parent: '102', name: 'Kas Bank - Bank #7 (BNI 1857140128)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10215', parent: '102', name: 'Kas Bank - Kas PPDB (BNI 1857140424)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10216', parent: '102', name: 'Kas Bank - Bank #8 (BNI 1857140718)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10217', parent: '102', name: 'Kas Bank - Bank #9 (BNI 1857141020)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10218', parent: '102', name: 'Kas Bank - Bank #10 (BNI 1857141495)', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '103', parent: null, name: 'Kas BOS', group: 'harta', normal: 'debit', level: 1, is_active: 1 },
  { code: '10301', parent: '103', name: 'Kas BOS Tunai', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10302', parent: '103', name: 'Kas BOS Bank', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '105', parent: null, name: 'Persediaan', group: 'harta', normal: 'debit', level: 1, is_active: 1 },
  { code: '10501', parent: '105', name: 'Persediaan ATK', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10502', parent: '105', name: 'Persediaan Bahan Habis Pakai Kebersihan', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10503', parent: '105', name: 'Persediaan Bahan Masak', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10504', parent: '105', name: 'Persediaan Obat-obatan', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10505', parent: '105', name: 'Persediaan Buku', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '10506', parent: '105', name: 'Persediaan Bahan Pembelajaran', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '125', parent: null, name: 'Kas Bank SchoolPay', group: 'harta', normal: 'debit', level: 1, is_active: 1 },
  { code: '12501', parent: '125', name: 'Kas Bank SchoolPay SMP', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '12502', parent: '125', name: 'Kas Bank SchoolPay SMA', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '126', parent: null, name: 'Kas Tunai SchoolPay', group: 'harta', normal: 'debit', level: 1, is_active: 1 },
  { code: '12601', parent: '126', name: 'Kas Tunai SchoolPay SMP', group: 'harta', normal: 'debit', level: 2, is_active: 1 },
  { code: '12602', parent: '126', name: 'Kas Tunai SchoolPay SMA', group: 'harta', normal: 'debit', level: 2, is_active: 1 },

  // 2. PIUTANG
  { code: '201', parent: null, name: 'Piutang SPP', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20101', parent: '201', name: 'Piutang SPP SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20102', parent: '201', name: 'Piutang SPP SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '202', parent: null, name: 'Piutang Kegiatan', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20201', parent: '202', name: 'Piutang Kegiatan SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20202', parent: '202', name: 'Piutang Kegiatan SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '203', parent: null, name: 'Piutang Buku', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20301', parent: '203', name: 'Piutang Buku SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20302', parent: '203', name: 'Piutang Buku SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '204', parent: null, name: 'Piutang Seragam', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20401', parent: '204', name: 'Piutang Seragam SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20402', parent: '204', name: 'Piutang Seragam SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '205', parent: null, name: 'Piutang Sarpras', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20501', parent: '205', name: 'Piutang Sarpras SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20502', parent: '205', name: 'Piutang Sarpras SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '206', parent: null, name: 'Piutang Bangunan', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20601', parent: '206', name: 'Piutang Bangunan SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20602', parent: '206', name: 'Piutang Bangunan SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '207', parent: null, name: 'Piutang Kegiatan Akhir Tahun', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20701', parent: '207', name: 'Piutang Kegiatan Akhir Tahun SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20702', parent: '207', name: 'Piutang Kegiatan Akhir Tahun SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '208', parent: null, name: 'Piutang Pendaftaran', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '20801', parent: '208', name: 'Piutang Pendaftaran SMP', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '20802', parent: '208', name: 'Piutang Pendaftaran SMA', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '298', parent: null, name: 'Cadangan Kerugian Piutang', group: 'piutang', normal: 'credit', level: 1, is_active: 1 },
  { code: '29801', parent: '298', name: 'Cadangan Kerugian Piutang', group: 'piutang', normal: 'credit', level: 2, is_active: 1 },
  { code: '299', parent: null, name: 'Piutang Lainnya', group: 'piutang', normal: 'debit', level: 1, is_active: 1 },
  { code: '29901', parent: '299', name: 'Piutang Lainnya', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },
  { code: '29902', parent: '299', name: 'Piutang Kasbon Karyawan', group: 'piutang', normal: 'debit', level: 2, is_active: 1 },

  // 3. INVENTARIS
  { code: '301', parent: null, name: 'Tanah', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30101', parent: '301', name: 'Tanah', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '302', parent: null, name: 'Gedung Sekolah', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30201', parent: '302', name: 'Gedung Sekolah', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '303', parent: null, name: 'Peralatan Teknologi', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30301', parent: '303', name: 'Peralatan Teknologi', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '304', parent: null, name: 'Perabot & Peralatan Kantor', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30401', parent: '304', name: 'Perabot & Peralatan Kantor', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '305', parent: null, name: 'Kendaraan', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30501', parent: '305', name: 'Kendaraan', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '306', parent: null, name: 'Peralatan Pembelajaran', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30601', parent: '306', name: 'Peralatan Pembelajaran', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '307', parent: null, name: 'Peralatan Asrama', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30701', parent: '307', name: 'Peralatan Asrama', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '308', parent: null, name: 'Peralatan Dapur', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30801', parent: '308', name: 'Peralatan Dapur', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '309', parent: null, name: 'Aset Tetap Lainnya', group: 'inventaris', normal: 'debit', level: 1, is_active: 1 },
  { code: '30901', parent: '309', name: 'Aset Tetap Lainnya', group: 'inventaris', normal: 'debit', level: 2, is_active: 1 },
  { code: '320', parent: null, name: 'Akumulasi Penyusutan Gedung', group: 'inventaris', normal: 'credit', level: 1, is_active: 1 },
  { code: '32001', parent: '320', name: 'Akumulasi Penyusutan Gedung', group: 'inventaris', normal: 'credit', level: 2, is_active: 1 },
  { code: '321', parent: null, name: 'Akumulasi Penyusutan Peralatan', group: 'inventaris', normal: 'credit', level: 1, is_active: 1 },
  { code: '32101', parent: '321', name: 'Akumulasi Penyusutan Peralatan', group: 'inventaris', normal: 'credit', level: 2, is_active: 1 },
  { code: '322', parent: null, name: 'Akumulasi Penyusutan Kendaraan', group: 'inventaris', normal: 'credit', level: 1, is_active: 1 },
  { code: '32201', parent: '322', name: 'Akumulasi Penyusutan Kendaraan', group: 'inventaris', normal: 'credit', level: 2, is_active: 1 },
  { code: '323', parent: null, name: 'Akumulasi Penyusutan Inventaris Lainnya', group: 'inventaris', normal: 'credit', level: 1, is_active: 1 },
  { code: '32301', parent: '323', name: 'Akumulasi Penyusutan Inventaris Lainnya', group: 'inventaris', normal: 'credit', level: 2, is_active: 1 },

  // 4. UTANG
  { code: '401', parent: null, name: 'Utang Pihak Ketiga', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '402', parent: null, name: 'Utang Gaji & Honor', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '403', parent: null, name: 'Utang Talangan', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '404', parent: null, name: 'Dana Titipan SchoolPay', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '40401', parent: '404', name: 'Dana Titipan SchoolPay SMP', group: 'utang', normal: 'credit', level: 2, is_active: 1 },
  { code: '40402', parent: '404', name: 'Dana Titipan SchoolPay SMA', group: 'utang', normal: 'credit', level: 2, is_active: 1 },
  { code: '405', parent: null, name: 'Utang Transaksi Vendor SchoolPay', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '40501', parent: '405', name: 'Utang Transaksi Vendor SchoolPay SMP', group: 'utang', normal: 'credit', level: 2, is_active: 1 },
  { code: '40502', parent: '405', name: 'Utang Transaksi Vendor SchoolPay SMA', group: 'utang', normal: 'credit', level: 2, is_active: 1 },
  { code: '406', parent: null, name: 'Utang Pajak', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '407', parent: null, name: 'Utang Tabungan Karyawan', group: 'utang', normal: 'credit', level: 1, is_active: 1 },
  { code: '408', parent: null, name: 'Utang Biaya/Akrual', group: 'utang', normal: 'credit', level: 1, is_active: 1 },

  // 5. MODAL
  { code: '501', parent: null, name: 'Modal Usaha/Yayasan', group: 'modal', normal: 'credit', level: 1, is_active: 1 },
  { code: '502', parent: null, name: 'Saldo Dana/Surplus Ditahan', group: 'modal', normal: 'credit', level: 1, is_active: 1 },
  { code: '503', parent: null, name: 'Surplus-Defisit Tahun Berjalan', group: 'modal', normal: 'credit', level: 1, is_active: 1 },

  // 6. PENDAPATAN
  { code: '601', parent: null, name: 'Pendapatan SPP', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60101', parent: '601', name: 'Pendapatan SPP SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60102', parent: '601', name: 'Pendapatan SPP SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '602', parent: null, name: 'Pendapatan Kegiatan', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60201', parent: '602', name: 'Pendapatan Kegiatan SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60202', parent: '602', name: 'Pendapatan Kegiatan SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '603', parent: null, name: 'Pendapatan Buku', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60301', parent: '603', name: 'Pendapatan Buku SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60302', parent: '603', name: 'Pendapatan Buku SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '604', parent: null, name: 'Pendapatan Seragam', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60401', parent: '604', name: 'Pendapatan Seragam SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60402', parent: '604', name: 'Pendapatan Seragam SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '605', parent: null, name: 'Pendapatan Sarpras', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60501', parent: '605', name: 'Pendapatan Sarpras SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60502', parent: '605', name: 'Pendapatan Sarpras SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '606', parent: null, name: 'Pendapatan Bangunan', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60601', parent: '606', name: 'Pendapatan Bangunan SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60602', parent: '606', name: 'Pendapatan Bangunan SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '607', parent: null, name: 'Pendapatan Kegiatan Akhir Tahun', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60701', parent: '607', name: 'Pendapatan Kegiatan Akhir Tahun SMP', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60702', parent: '607', name: 'Pendapatan Kegiatan Akhir Tahun SMA', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '608', parent: null, name: 'Pendapatan Lainnya', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '60801', parent: '608', name: 'Pendapatan Lainnya', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '60802', parent: '608', name: 'Pendapatan Donasi', group: 'pendapatan', normal: 'credit', level: 2, is_active: 1 },
  { code: '609', parent: null, name: 'Pendapatan DSP', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '610', parent: null, name: 'Pendapatan Sukarela Siswa', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '611', parent: null, name: 'Pendapatan BOS', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '612', parent: null, name: 'Pendapatan Sukarela Calon Siswa', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '613', parent: null, name: 'Pendapatan Pendaftaran (PPDB)', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '614', parent: null, name: 'Pendapatan Daftar Ulang', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '615', parent: null, name: 'Pendapatan Sewa Fasilitas (Sport Center)', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '616', parent: null, name: 'Pendapatan Sewa Kantin', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '617', parent: null, name: 'Pendapatan Dana Kurban / Sumbangan Khusus', group: 'pendapatan', normal: 'credit', level: 1, is_active: 1 },
  { code: '690', parent: null, name: 'Kontra Pendapatan / Diskon', group: 'pendapatan', normal: 'debit', level: 1, is_active: 1 },
  { code: '69001', parent: '690', name: 'Diskon SPP', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },
  { code: '69002', parent: '690', name: 'Diskon Kegiatan', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },
  { code: '69003', parent: '690', name: 'Diskon Buku', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },
  { code: '69004', parent: '690', name: 'Diskon Seragam', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },
  { code: '69005', parent: '690', name: 'Diskon Sarpras', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },
  { code: '69006', parent: '690', name: 'Diskon Bangunan', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },
  { code: '69007', parent: '690', name: 'Diskon Kegiatan Akhir Tahun', group: 'pendapatan', normal: 'debit', level: 2, is_active: 1 },

  // 7. BIAYA / BEBAN OPERASIONAL
  { code: '710', parent: null, name: 'Beban Transportasi', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '711', parent: null, name: 'Beban Listrik', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '712', parent: null, name: 'Beban Telepon', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '713', parent: null, name: 'Beban Internet', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '714', parent: null, name: 'Beban Air', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '715', parent: null, name: 'Beban Bahan Bakar', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '716', parent: null, name: 'Beban ATK', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '717', parent: null, name: 'Beban Administrasi Bank', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '718', parent: null, name: 'Beban Konsumsi & Snack', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '719', parent: null, name: 'Beban Perjalanan Dinas', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '720', parent: null, name: 'Beban Bahan Habis Pakai Kebersihan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '721', parent: null, name: 'Beban Laundry', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '722', parent: null, name: 'Beban Kesehatan & Pengobatan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '723', parent: null, name: 'Beban Pajak', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '730', parent: null, name: 'Beban Gaji & Honor GTK/Karyawan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '731', parent: null, name: 'Beban THR', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '732', parent: null, name: 'Beban Lembur', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '733', parent: null, name: 'Beban Tunjangan Sosial', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '734', parent: null, name: 'Beban BPJS Ketenagakerjaan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '735', parent: null, name: 'Beban Honor Pelatih Ekstrakurikuler', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '736', parent: null, name: 'Beban Honor PKL, Magang & Freelance', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '737', parent: null, name: 'Beban Pengembangan Kompetensi Guru', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '738', parent: null, name: 'Beban Seragam GTK & Karyawan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '740', parent: null, name: 'Beban Pengembangan Kurikulum & Asesmen', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '741', parent: null, name: 'Beban Kegiatan Pembelajaran & Pembinaan Prestasi', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '742', parent: null, name: 'Beban Ujian & Penilaian', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '743', parent: null, name: 'Beban Bahan Habis Pakai Pembelajaran', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '744', parent: null, name: 'Beban Buku Pelajaran', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '745', parent: null, name: 'Beban Kelulusan (Laporan Nilai, Ijazah, Wisuda)', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '750', parent: null, name: 'Beban Kegiatan Keagamaan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '751', parent: null, name: 'Beban Kepramukaan & Ekstrakurikuler', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '752', parent: null, name: 'Beban Study Tour, Outing & Language Camp', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '753', parent: null, name: 'Beban Perayaan Hari Besar & Peringatan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '754', parent: null, name: 'Beban Lomba & Kompetisi Siswa', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '755', parent: null, name: 'Beban Layanan Psikologi, Karakter & Parenting', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '756', parent: null, name: 'Beban Seragam Siswa', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '757', parent: null, name: 'Beban MPLS & Penyambutan Siswa Baru', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '760', parent: null, name: 'Beban Pemeliharaan & Perbaikan Sarana', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '761', parent: null, name: 'Beban Pemeliharaan & Perbaikan Prasarana', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '762', parent: null, name: 'Beban Pengadaan & Pembaruan Fasilitas', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '763', parent: null, name: 'Beban Penataan & Pengecatan Ruang', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '770', parent: null, name: 'Beban Penerimaan Peserta Didik Baru (PPDB)', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '771', parent: null, name: 'Beban Kedinasan & Operasional Kantor', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '780', parent: null, name: 'Beban Penyusutan', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '78001', parent: '780', name: 'Beban Penyusutan Gedung', group: 'biaya', normal: 'debit', level: 2, is_active: 1 },
  { code: '78002', parent: '780', name: 'Beban Penyusutan Peralatan', group: 'biaya', normal: 'debit', level: 2, is_active: 1 },
  { code: '78003', parent: '780', name: 'Beban Penyusutan Kendaraan', group: 'biaya', normal: 'debit', level: 2, is_active: 1 },
  { code: '78004', parent: '780', name: 'Beban Penyusutan Inventaris Lainnya', group: 'biaya', normal: 'debit', level: 2, is_active: 1 },
  { code: '790', parent: null, name: 'Beban Estimasi Piutang Tak Tertagih', group: 'biaya', normal: 'debit', level: 1, is_active: 1 },
  { code: '791', parent: null, name: 'Beban Lainnya', group: 'biaya', normal: 'debit', level: 1, is_active: 1 }
];

async function seedChartOfAccounts() {
  console.log('=== MEMULAI PENAMBAHAN BAGAN AKUN (COA) ===\n');

  try {
    const schoolUnitId = 0; // Yayasan / Global COA
    const codeToIdMap = {};

    // 1. Insert Level 1 Accounts (Header)
    const level1 = rawCoaList.filter(item => item.level === 1);
    for (const item of level1) {
      const [id] = await db('chart_of_accounts').insert({
        school_unit_id: schoolUnitId,
        account_code: item.code,
        account_name: item.name,
        account_group: item.group,
        normal_balance: item.normal,
        parent_account_id: null,
        level: item.level,
        is_active: item.is_active
      });
      codeToIdMap[item.code] = id;
    }
    console.log(`✓ Berhasil memasukkan ${level1.length} Akun Header (Level 1).`);

    // 2. Insert Level 2 Accounts (Detail)
    const level2 = rawCoaList.filter(item => item.level === 2);
    for (const item of level2) {
      const parentId = item.parent ? codeToIdMap[item.parent] || null : null;
      const [id] = await db('chart_of_accounts').insert({
        school_unit_id: schoolUnitId,
        account_code: item.code,
        account_name: item.name,
        account_group: item.group,
        normal_balance: item.normal,
        parent_account_id: parentId,
        level: item.level,
        is_active: item.is_active
      });
      codeToIdMap[item.code] = id;
    }
    console.log(`✓ Berhasil memasukkan ${level2.length} Akun Detail (Level 2).`);

    const total = await db('chart_of_accounts').count('id as cnt').first();
    console.log(`\n=== SELESAI: Total ${total.cnt} Akun Bagan Akun (COA) berhasil didaftarkan ===`);
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat input COA:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedChartOfAccounts();
