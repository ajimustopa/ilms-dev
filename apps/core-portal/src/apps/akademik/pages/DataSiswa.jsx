import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  ArrowRightLeft,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  School,
  Layers,
  UserPlus,
  Calendar,
  Sparkles,
  CheckSquare,
  Square,
  RotateCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  FileSpreadsheet,
  FileUp,
  FileText,
  CheckCircle2,
  HelpCircle,
  Info,
  AlertTriangle,
  FileCheck,
  Printer,
  QrCode,
  CreditCard,
  Palette,
  Layout,
  Scissors,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

/**
 * Kompresi pas foto siswa otomatis menggunakan HTML5 Canvas
 */
const compressStudentPhoto = (file, options = {}) => {
  const {
    maxWidth = 600,
    maxHeight = 800,
    quality = 0.82
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan gambar yang valid (JPG/PNG/WebP)'));
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            const compressedSize = blob ? blob.size : Math.round((compressedBase64.length * 3) / 4);
            resolve({
              base64: compressedBase64,
              blob: blob,
              originalSize,
              compressedSize,
              width,
              height
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Gagal memproses berkas gambar'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
    reader.readAsDataURL(file);
  });
};

const CARD_PALETTES = [
  {
    bg: 'bg-gradient-to-br from-indigo-50/90 to-indigo-100/40 hover:from-indigo-100/80 hover:to-indigo-200/50',
    border: 'border-indigo-200/80 hover:border-indigo-300',
    activeRing: 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-100/90 shadow-sm',
    tag: 'bg-indigo-600 text-white',
    countText: 'text-indigo-900',
    subText: 'text-indigo-600',
    statSub: 'text-indigo-700/80',
    iconColor: 'text-indigo-600'
  },
  {
    bg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/40 hover:from-emerald-100/80 hover:to-emerald-200/50',
    border: 'border-emerald-200/80 hover:border-emerald-300',
    activeRing: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-100/90 shadow-sm',
    tag: 'bg-emerald-600 text-white',
    countText: 'text-emerald-900',
    subText: 'text-emerald-600',
    statSub: 'text-emerald-700/80',
    iconColor: 'text-emerald-600'
  },
  {
    bg: 'bg-gradient-to-br from-purple-50/90 to-purple-100/40 hover:from-purple-100/80 hover:to-purple-200/50',
    border: 'border-purple-200/80 hover:border-purple-300',
    activeRing: 'ring-2 ring-purple-500 border-purple-500 bg-purple-100/90 shadow-sm',
    tag: 'bg-purple-600 text-white',
    countText: 'text-purple-900',
    subText: 'text-purple-600',
    statSub: 'text-purple-700/80',
    iconColor: 'text-purple-600'
  },
  {
    bg: 'bg-gradient-to-br from-amber-50/90 to-amber-100/40 hover:from-amber-100/80 hover:to-amber-200/50',
    border: 'border-amber-200/80 hover:border-amber-300',
    activeRing: 'ring-2 ring-amber-500 border-amber-500 bg-amber-100/90 shadow-sm',
    tag: 'bg-amber-600 text-white',
    countText: 'text-amber-950',
    subText: 'text-amber-700',
    statSub: 'text-amber-700/80',
    iconColor: 'text-amber-600'
  },
  {
    bg: 'bg-gradient-to-br from-rose-50/90 to-rose-100/40 hover:from-rose-100/80 hover:to-rose-200/50',
    border: 'border-rose-200/80 hover:border-rose-300',
    activeRing: 'ring-2 ring-rose-500 border-rose-500 bg-rose-100/90 shadow-sm',
    tag: 'bg-rose-600 text-white',
    countText: 'text-rose-900',
    subText: 'text-rose-600',
    statSub: 'text-rose-700/80',
    iconColor: 'text-rose-600'
  },
  {
    bg: 'bg-gradient-to-br from-cyan-50/90 to-cyan-100/40 hover:from-cyan-100/80 hover:to-cyan-200/50',
    border: 'border-cyan-200/80 hover:border-cyan-300',
    activeRing: 'ring-2 ring-cyan-500 border-cyan-500 bg-cyan-100/90 shadow-sm',
    tag: 'bg-cyan-600 text-white',
    countText: 'text-cyan-900',
    subText: 'text-cyan-700',
    statSub: 'text-cyan-700/80',
    iconColor: 'text-cyan-600'
  },
  {
    bg: 'bg-gradient-to-br from-teal-50/90 to-teal-100/40 hover:from-teal-100/80 hover:to-teal-200/50',
    border: 'border-teal-200/80 hover:border-teal-300',
    activeRing: 'ring-2 ring-teal-500 border-teal-500 bg-teal-100/90 shadow-sm',
    tag: 'bg-teal-600 text-white',
    countText: 'text-teal-900',
    subText: 'text-teal-700',
    statSub: 'text-teal-700/80',
    iconColor: 'text-teal-600'
  },
  {
    bg: 'bg-gradient-to-br from-sky-50/90 to-sky-100/40 hover:from-sky-100/80 hover:to-sky-200/50',
    border: 'border-sky-200/80 hover:border-sky-300',
    activeRing: 'ring-2 ring-sky-500 border-sky-500 bg-sky-100/90 shadow-sm',
    tag: 'bg-sky-600 text-white',
    countText: 'text-sky-900',
    subText: 'text-sky-600',
    statSub: 'text-sky-700/80',
    iconColor: 'text-sky-600'
  }
];

const CARD_PRINT_PAPERS = [
  { value: 'a4', label: 'A4 (210 × 297 mm)', width_mm: 210, height_mm: 297, desc: 'Standar kertas kantor' },
  { value: 'f4', label: 'F4 / Folio (215 × 330 mm)', width_mm: 215, height_mm: 330, desc: 'Kertas F4 / Folio Indonesia' },
  { value: 'letter', label: 'Letter (215.9 × 279.4 mm)', width_mm: 215.9, height_mm: 279.4, desc: 'Standar US Letter' },
  { value: 'a3', label: 'A3 (297 × 420 mm)', width_mm: 297, height_mm: 420, desc: 'Ukuran Besar A3' },
  { value: 'custom', label: 'Ukuran Kertas Kustom (mm)', width_mm: 210, height_mm: 297, desc: 'Tentukan panjang & lebar kertas sendiri' }
];

const CARD_PRINT_SIZES = [
  { value: 'cr80', label: 'Standar ID Card / KTP (85.6 × 54.0 mm)', width_mm: 85.6, height_mm: 54.0, desc: 'Ukuran resmi KTP / SIM / Kartu ATM PVC (Default)' },
  { value: 'b2', label: 'Ukuran B2 (106.0 × 82.0 mm)', width_mm: 106.0, height_mm: 82.0, desc: 'Ukuran Name Tag B2 Landscape' },
  { value: 'b3', label: 'Ukuran B3 (124.0 × 95.0 mm)', width_mm: 124.0, height_mm: 95.0, desc: 'Ukuran Name Tag B3 Landscape' },
  { value: 'compact', label: 'Ukuran Compact (70.0 × 45.0 mm)', width_mm: 70.0, height_mm: 45.0, desc: 'Ukuran Ringkas Hemat Kertas' },
  { value: 'a6_landscape', label: 'Ukuran A6 Landscape (148.0 × 105.0 mm)', width_mm: 148.0, height_mm: 105.0, desc: 'Ukuran Kartu Besar A6' },
  { value: 'custom', label: 'Ukuran Kartu Kustom (mm)', width_mm: 85.6, height_mm: 54.0, desc: 'Tentukan dimensi kartu sendiri' }
];

const CARD_PRINT_THEMES = [
  {
    value: 'emerald',
    label: 'Emerald Islamic (Hijau & Emas)',
    desc: 'Warna resmi identitas Yayasan Aldepos',
    headerBg: 'bg-emerald-900',
    primaryColor: '#064e3b',
    accentColor: '#059669',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    goldColor: '#d97706'
  },
  {
    value: 'navy',
    label: 'Royal Navy (Biru Tua & Perak)',
    desc: 'Kesan formal, modern, dan berwibawa',
    headerBg: 'bg-slate-900',
    primaryColor: '#0f172a',
    accentColor: '#2563eb',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    goldColor: '#eab308'
  },
  {
    value: 'indigo',
    label: 'Modern Indigo (Ungu & Indigo)',
    desc: 'Elegan dan kontemporer untuk sekolah modern',
    headerBg: 'bg-indigo-900',
    primaryColor: '#312e81',
    accentColor: '#6366f1',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    goldColor: '#f59e0b'
  },
  {
    value: 'maroon',
    label: 'Classic Maroon (Merah Marun & Emas)',
    desc: 'Klasik, tegas, dan eksklusif',
    headerBg: 'bg-rose-950',
    primaryColor: '#881337',
    accentColor: '#e11d48',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    goldColor: '#d97706'
  },
  {
    value: 'slate',
    label: 'Dark Slate (Monokrom Minimalis)',
    desc: 'Nuansa monokrom bersih & profesional',
    headerBg: 'bg-slate-900',
    primaryColor: '#0f172a',
    accentColor: '#475569',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    goldColor: '#ca8a04'
  },
  {
    value: 'teal',
    label: 'Teal Cyan (Tosika Segar)',
    desc: 'Ceria, segar, dan dinamis',
    headerBg: 'bg-teal-900',
    primaryColor: '#134e4a',
    accentColor: '#0d9488',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    goldColor: '#d97706'
  }
];

export const ENUM_OPTIONS_GUIDE = [
  {
    field: 'Jenis Kelamin',
    column: 'Jenis Kelamin (L/P) *',
    desc: 'Wajib diisi kode L atau P',
    options: [
      { code: 'L', label: 'Laki-laki', desc: 'Siswa putra / ikhwan' },
      { code: 'P', label: 'Perempuan', desc: 'Siswa putri / akhwat' }
    ]
  },
  {
    field: 'Agama',
    column: 'Agama',
    desc: 'Agama resmi yang diakui',
    options: [
      { code: 'Islam', label: 'Islam', desc: 'Agama Islam (Standar Yayasan)' },
      { code: 'Kristen', label: 'Kristen Protestan', desc: 'Agama Kristen' },
      { code: 'Katolik', label: 'Katolik', desc: 'Agama Katolik' },
      { code: 'Hindu', label: 'Hindu', desc: 'Agama Hindu' },
      { code: 'Buddha', label: 'Buddha', desc: 'Agama Buddha' },
      { code: 'Konghucu', label: 'Konghucu', desc: 'Agama Konghucu' }
    ]
  },
  {
    field: 'Kewarganegaraan',
    column: 'Kewarganegaraan',
    desc: 'Status kewarganegaraan siswa',
    options: [
      { code: 'WNI', label: 'Warga Negara Indonesia', desc: 'WNI (Default)' },
      { code: 'WNA', label: 'Warga Negara Asing', desc: 'WNA' }
    ]
  },
  {
    field: 'Status Siswa',
    column: 'Status Siswa (aktif/calon/lulus/pindah/keluar/non_aktif)',
    desc: 'Status keaktifan kesiswaan di sekolah',
    options: [
      { code: 'aktif', label: 'Aktif Belajar', desc: 'Siswa reguler aktif mengikuti KBM' },
      { code: 'calon', label: 'Calon Siswa', desc: 'Calon siswa / registran baru' },
      { code: 'lulus', label: 'Alumni / Lulus', desc: 'Siswa yang telah menyelesaikan pendidikan' },
      { code: 'pindah', label: 'Mutasi Keluar', desc: 'Siswa yang pindah ke sekolah lain' },
      { code: 'keluar', label: 'Keluar / Drop Out', desc: 'Siswa yang mengundurkan diri' },
      { code: 'non_aktif', label: 'Non-Aktif / Cuti', desc: 'Siswa berstatus non-aktif atau cuti' }
    ]
  },
  {
    field: 'Jenis Pendaftaran',
    column: 'Jenis Pendaftaran',
    desc: 'Jalur masuk pendaftaran siswa',
    options: [
      { code: 'Siswa Baru', label: 'Siswa Baru (PPDB)', desc: 'Penerimaan peserta didik baru tingkat awal' },
      { code: 'Siswa Pindahan', label: 'Siswa Pindahan (Mutasi Masuk)', desc: 'Pindahan dari sekolah lain di tingkat pertengahan' }
    ]
  },
  {
    field: 'Golongan Darah',
    column: 'Golongan Darah',
    desc: 'Tipe golongan darah siswa',
    options: [
      { code: 'A', label: 'Golongan Darah A', desc: 'Tipe darah A' },
      { code: 'B', label: 'Golongan Darah B', desc: 'Tipe darah B' },
      { code: 'AB', label: 'Golongan Darah AB', desc: 'Tipe darah AB' },
      { code: 'O', label: 'Golongan Darah O', desc: 'Tipe darah O' },
      { code: 'Tidak Tahu', label: 'Belum Diketahui / -', desc: 'Belum dilakukan cek golongan darah' }
    ]
  },
  {
    field: 'Jenjang Pendidikan Orang Tua',
    column: 'Pendidikan Ayah / Ibu / Wali',
    desc: 'Tingkat pendidikan terakhir ayah/ibu/wali',
    options: [
      { code: 'Tidak Sekolah', label: 'Tidak Sekolah', desc: 'Tanpa ijazah formal' },
      { code: 'SD', label: 'SD / MI Sederajat', desc: 'Lulusan Sekolah Dasar' },
      { code: 'SMP', label: 'SMP / MTs Sederajat', desc: 'Lulusan SMP / MTs' },
      { code: 'SMA/SMK', label: 'SMA / SMK / MA', desc: 'Lulusan SMA / SMK / MA' },
      { code: 'D1', label: 'Diploma 1 (D1)', desc: 'Pendidikan Diploma 1' },
      { code: 'D2', label: 'Diploma 2 (D2)', desc: 'Pendidikan Diploma 2' },
      { code: 'D3', label: 'Diploma 3 (D3)', desc: 'Pendidikan Diploma 3' },
      { code: 'D4/S1', label: 'Sarjana / S1 / D4', desc: 'Pendidikan Sarjana S1 / D4' },
      { code: 'S2', label: 'Magister / S2', desc: 'Pendidikan Pascasarjana Magister S2' },
      { code: 'S3', label: 'Doktor / S3', desc: 'Pendidikan Pascasarjana Doktor S3' }
    ]
  },
  {
    field: 'Kategori Pekerjaan Orang Tua',
    column: 'Pekerjaan Ayah / Ibu / Wali',
    desc: 'Bidang profesi pekerjaan orang tua/wali',
    options: [
      { code: 'PNS', label: 'Pegawai Negeri Sipil (PNS)', desc: 'Aparatur Sipil Negara / ASN' },
      { code: 'TNI/Polri', label: 'TNI / Polri', desc: 'Anggota Militer / Kepolisian' },
      { code: 'Guru/Dosen', label: 'Tenaga Pendidik / Guru / Dosen', desc: 'Profesi Pendidikan' },
      { code: 'Karyawan Swasta', label: 'Karyawan / Pegawai Swasta', desc: 'Bekerja di perusahaan swasta' },
      { code: 'Wiraswasta', label: 'Wiraswasta / Pengusaha / Pedagang', desc: 'Pemilik usaha mandiri' },
      { code: 'Petani/Peternak', label: 'Petani / Peternak / Nelayan', desc: 'Sektor agraris & kelautan' },
      { code: 'Buruh', label: 'Buruh Harian / Pekerja Lepas', desc: 'Pekerja harian lepas' },
      { code: 'Pensiunan', label: 'Pensiunan', desc: 'Pensiunan pegawai' },
      { code: 'Ibu Rumah Tangga', label: 'Ibu Rumah Tangga (IRT)', desc: 'Mengurus rumah tangga' },
      { code: 'Tidak Bekerja', label: 'Tidak Bekerja', desc: 'Belum / sedang tidak bekerja' },
      { code: 'Lainnya', label: 'Pekerjaan Lainnya', desc: 'Kategori pekerjaan lainnya' }
    ]
  },
  {
    field: 'Rentang Penghasilan Bulanan',
    column: 'Penghasilan Ayah / Ibu / Wali',
    desc: 'Estimasi penghasilan per bulan',
    options: [
      { code: '< 1.000.000', label: 'Di bawah Rp 1.000.000', desc: 'Kategori prasejahtera' },
      { code: '1.000.000 - 3.000.000', label: 'Rp 1.000.000 - Rp 3.000.000', desc: 'Rentang menengah bawah' },
      { code: '3.000.000 - 5.000.000', label: 'Rp 3.000.000 - Rp 5.000.000', desc: 'Rentang menengah' },
      { code: '5.000.000 - 10.000.000', label: 'Rp 5.000.000 - Rp 10.000.000', desc: 'Rentang menengah atas' },
      { code: '10.000.000 - 20.000.000', label: 'Rp 10.000.000 - Rp 20.000.000', desc: 'Rentang atas' },
      { code: '> 20.000.000', label: 'Di atas Rp 20.000.000', desc: 'Rentang tinggi' },
      { code: 'Tidak Berpenghasilan', label: 'Tidak Berpenghasilan', desc: 'Tanpa penghasilan tetap' }
    ]
  },
  {
    field: 'Hubungan Keluarga Wali',
    column: 'Hubungan Wali',
    desc: 'Hubungan perwalian dengan siswa',
    options: [
      { code: 'ayah', label: 'Ayah', desc: 'Orang tua kandung (Ayah)' },
      { code: 'ibu', label: 'Ibu', desc: 'Orang tua kandung (Ibu)' },
      { code: 'kakek_nenek', label: 'Kakek / Nenek', desc: 'Kakek atau nenek siswa' },
      { code: 'paman_bibi', label: 'Paman / Bibi', desc: 'Paman atau bibi siswa' },
      { code: 'saudara_kandung', label: 'Kakak / Saudara Kandung', desc: 'Saudara kandung dewasa' },
      { code: 'wali', label: 'Wali Lainnya', desc: 'Wali sah lainnya' }
    ]
  }
];

export const buildEnumGuideSheet = (activeClassGroupsList = []) => {
  const guideRows = [
    {
      'Kategori Data / Kolom': '=== PANDUAN PENGISIAN ISIAN ENUM / KATEGORI DATA SISWA ===',
      'Kode / Isian Pilihan Valid': '=== KETERANGAN & CONTOH ===',
      'Deskripsi / Catatan': 'Gunakan kode / teks di bawah ini pada kolom terkait di sheet data agar terbaca sistem secara otomatis.'
    },
    { 'Kategori Data / Kolom': '', 'Kode / Isian Pilihan Valid': '', 'Deskripsi / Catatan': '' }
  ];

  ENUM_OPTIONS_GUIDE.forEach(grp => {
    guideRows.push({
      'Kategori Data / Kolom': `[ ${grp.field.toUpperCase()} ] -> Kolom: ${grp.column}`,
      'Kode / Isian Pilihan Valid': `Keterangan: ${grp.desc}`,
      'Deskripsi / Catatan': '--- Pilihan yang Diterima ---'
    });
    grp.options.forEach(opt => {
      guideRows.push({
        'Kategori Data / Kolom': grp.field,
        'Kode / Isian Pilihan Valid': opt.code,
        'Deskripsi / Catatan': `${opt.label} (${opt.desc})`
      });
    });
    guideRows.push({ 'Kategori Data / Kolom': '', 'Kode / Isian Pilihan Valid': '', 'Deskripsi / Catatan': '' });
  });

  // Tambahkan daftar Rombel Aktif pada Tahun Ajaran Ini
  guideRows.push({
    'Kategori Data / Kolom': '[ ROMBEL / KELAS AKTIF ] -> Kolom: Rombel / Kelas',
    'Kode / Isian Pilihan Valid': 'Daftar Rombel Resmi Terdaftar pada TA Ini',
    'Deskripsi / Catatan': 'Tuliskan persis nama rombel berikut pada kolom Rombel / Kelas'
  });

  if (activeClassGroupsList && activeClassGroupsList.length > 0) {
    activeClassGroupsList.forEach(cg => {
      guideRows.push({
        'Kategori Data / Kolom': 'Rombel / Kelas',
        'Kode / Isian Pilihan Valid': cg.name,
        'Deskripsi / Catatan': `Tingkat ${cg.grade_level_name || 'Kelas'} (ID Rombel: ${cg.id})`
      });
    });
  } else {
    guideRows.push({
      'Kategori Data / Kolom': 'Rombel / Kelas',
      'Kode / Isian Pilihan Valid': 'Kosongkan atau buat rombel di menu Rombongan Belajar',
      'Deskripsi / Catatan': 'Belum ada rombel yang terdaftar pada TA ini'
    });
  }

  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [
    { wch: 38 },
    { wch: 35 },
    { wch: 60 }
  ];
  return wsGuide;
};

const EXCEL_COLUMNS = [
  { key: 'id', header: 'ID Siswa (Khusus Update)', width: 15 },
  { key: 'nis', header: 'NIS *', width: 15 },
  { key: 'nisn', header: 'NISN', width: 16 },
  { key: 'nik', header: 'NIK Siswa', width: 20 },
  { key: 'family_card_number', header: 'No KK', width: 20 },
  { key: 'full_name', header: 'Nama Lengkap *', width: 28 },
  { key: 'nickname', header: 'Nama Panggilan', width: 16 },
  { key: 'gender', header: 'Jenis Kelamin (L/P) * [L/P]', width: 20 },
  { key: 'birth_place', header: 'Tempat Lahir', width: 18 },
  { key: 'birth_date', header: 'Tanggal Lahir (YYYY-MM-DD)', width: 22 },
  { key: 'religion', header: 'Agama [Islam/Kristen/Katolik/Hindu/Buddha/Konghucu]', width: 22 },
  { key: 'citizenship', header: 'Kewarganegaraan [WNI/WNA]', width: 18 },
  { key: 'order_in_family', header: 'Anak Ke', width: 10 },
  { key: 'number_of_siblings', header: 'Jumlah Saudara', width: 14 },
  { key: 'class_group_name', header: 'Rombel / Kelas [Pilih Rombel Aktif]', width: 22 },
  { key: 'registration_type', header: 'Jenis Pendaftaran [Siswa Baru/Siswa Pindahan]', width: 22 },
  { key: 'previous_school_name', header: 'Asal Sekolah', width: 22 },
  { key: 'status', header: 'Status Siswa (aktif/calon/lulus/pindah/keluar/non_aktif)', width: 26 },
  { key: 'address', header: 'Alamat Lengkap', width: 30 },
  { key: 'rt', header: 'RT', width: 8 },
  { key: 'rw', header: 'RW', width: 8 },
  { key: 'hamlet', header: 'Dusun', width: 16 },
  { key: 'village', header: 'Kelurahan / Desa', width: 18 },
  { key: 'district', header: 'Kecamatan', width: 18 },
  { key: 'postal_code', header: 'Kode Pos', width: 12 },
  { key: 'phone', header: 'No HP / WA Siswa', width: 18 },
  { key: 'email', header: 'Email Siswa', width: 24 },
  { key: 'height_cm', header: 'Tinggi Badan (cm)', width: 16 },
  { key: 'weight_kg', header: 'Berat Badan (kg)', width: 16 },
  { key: 'blood_type', header: 'Golongan Darah [A/B/AB/O/Tidak Tahu]', width: 20 },
  { key: 'medical_history', header: 'Riwayat Penyakit', width: 20 },
  { key: 'father_name', header: 'Nama Ayah', width: 24 },
  { key: 'father_nik', header: 'NIK Ayah', width: 20 },
  { key: 'father_education', header: 'Pendidikan Ayah [SD/SMP/SMA/D3/S1/S2/S3]', width: 22 },
  { key: 'father_occupation', header: 'Pekerjaan Ayah [PNS/TNI/Swasta/Wiraswasta/Guru/Lainnya]', width: 25 },
  { key: 'father_income', header: 'Penghasilan Ayah [< 1jt/1-3jt/3-5jt/5-10jt/10-20jt/> 20jt]', width: 26 },
  { key: 'father_phone', header: 'No HP Ayah', width: 18 },
  { key: 'mother_name', header: 'Nama Ibu', width: 24 },
  { key: 'mother_nik', header: 'NIK Ibu', width: 20 },
  { key: 'mother_education', header: 'Pendidikan Ibu [SD/SMP/SMA/D3/S1/S2/S3]', width: 22 },
  { key: 'mother_occupation', header: 'Pekerjaan Ibu [PNS/Swasta/Wiraswasta/Guru/IRT/Lainnya]', width: 25 },
  { key: 'mother_income', header: 'Penghasilan Ibu [< 1jt/1-3jt/3-5jt/5-10jt/10-20jt/> 20jt]', width: 26 },
  { key: 'mother_phone', header: 'No HP Ibu', width: 18 },
  { key: 'guardian_name', header: 'Nama Wali', width: 24 },
  { key: 'guardian_relationship', header: 'Hubungan Wali [ayah/ibu/kakek_nenek/paman_bibi/wali]', width: 24 },
  { key: 'guardian_phone', header: 'No HP Wali', width: 18 }
];

const SAMPLE_ROW_NEW_STUDENT = {
  'ID Siswa (Khusus Update)': '',
  'NIS *': '2026001',
  'NISN': '0081234567',
  'NIK Siswa': '3201012305110001',
  'No KK': '3201010101080005',
  'Nama Lengkap *': 'Ahmad Fathan Al-Farisi [CONTOH]',
  'Nama Panggilan': 'Fathan',
  'Jenis Kelamin (L/P) * [L/P]': 'L',
  'Tempat Lahir': 'Bogor',
  'Tanggal Lahir (YYYY-MM-DD)': '2011-05-14',
  'Agama [Islam/Kristen/Katolik/Hindu/Buddha/Konghucu]': 'Islam',
  'Kewarganegaraan [WNI/WNA]': 'WNI',
  'Anak Ke': 1,
  'Jumlah Saudara': 2,
  'Rombel / Kelas [Pilih Rombel Aktif]': '7A',
  'Jenis Pendaftaran [Siswa Baru/Siswa Pindahan]': 'Siswa Baru',
  'Asal Sekolah': 'SDIT Al-Ihsan',
  'Status Siswa (aktif/calon/lulus/pindah/keluar/non_aktif)': 'aktif',
  'Alamat Lengkap': 'Jl. Raya Dramaga No. 12',
  'RT': '03',
  'RW': '02',
  'Dusun': 'Babakan',
  'Kelurahan / Desa': 'Babakan',
  'Kecamatan': 'Dramaga',
  'Kode Pos': '16680',
  'No HP / WA Siswa': '081234567890',
  'Email Siswa': 'fathan@example.com',
  'Tinggi Badan (cm)': 155,
  'Berat Badan (kg)': 45,
  'Golongan Darah [A/B/AB/O/Tidak Tahu]': 'O',
  'Riwayat Penyakit': 'Tidak ada',
  'Nama Ayah': 'Budi Santoso',
  'NIK Ayah': '3201010101750002',
  'Pendidikan Ayah [SD/SMP/SMA/D3/S1/S2/S3]': 'D4/S1',
  'Pekerjaan Ayah [PNS/TNI/Swasta/Wiraswasta/Guru/Lainnya]': 'Karyawan Swasta',
  'Penghasilan Ayah [< 1jt/1-3jt/3-5jt/5-10jt/10-20jt/> 20jt]': '5.000.000 - 10.000.000',
  'No HP Ayah': '081288889999',
  'Nama Ibu': 'Siti Aminah',
  'NIK Ibu': '3201010101800003',
  'Pendidikan Ibu [SD/SMP/SMA/D3/S1/S2/S3]': 'D4/S1',
  'Pekerjaan Ibu [PNS/Swasta/Wiraswasta/Guru/IRT/Lainnya]': 'Guru/Dosen',
  'Penghasilan Ibu [< 1jt/1-3jt/3-5jt/5-10jt/10-20jt/> 20jt]': '3.000.000 - 5.000.000',
  'No HP Ibu': '081277776666',
  'Nama Wali': '',
  'Hubungan Wali [ayah/ibu/kakek_nenek/paman_bibi/wali]': '',
  'No HP Wali': ''
};

function parseDateToYmd(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    if (clean.includes('T') || clean.includes('Z')) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    const match = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

function normalizeImportRow(rawRow) {
  const row = {};
  for (const [k, v] of Object.entries(rawRow)) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    row[cleanKey] = v !== undefined && v !== null ? String(v).trim() : '';
  }

  const id = row.idsiswakhususupdate || row.idsiswa || row.id || row.studentid || '';
  const nis = row.nis || row.nomorinduksiswa || '';
  const nisn = row.nisn || '';
  const nik = row.niksiswa || row.nik || '';
  const family_card_number = row.nokk || row.nomorkk || row.kartukeluarga || '';
  const full_name = row.namalengkap || row.nama || row.fullname || '';
  const nickname = row.namapanggilan || row.panggilan || '';
  let gender = (row.jeniskelaminlp || row.jeniskelamin || row.jk || row.gender || 'L').toUpperCase();
  if (gender.startsWith('P') || gender === 'WANITA' || gender === 'PEREMPUAN' || gender === 'AKHWAT') {
    gender = 'P';
  } else {
    gender = 'L';
  }

  const birth_place = row.tempatlahir || '';
  let birth_date = row.tanggallahiryyyymmdd || row.tanggallahir || '';
  birth_date = parseDateToYmd(birth_date);

  const religion = row.agama || 'Islam';
  const citizenship = row.kewarganegaraan || 'WNI';
  const order_in_family = row.anakke || '';
  const number_of_siblings = row.jumlahsaudara || '';
  const class_group_name = row.rombelkelas || row.rombel || row.kelas || '';
  const registration_type = row.jenispendaftaran || 'Siswa Baru';
  const previous_school_name = row.asalsekolah || '';
  const status = (row.statussiswaaktifcalonluluspindahkeluar || row.statussiswa || row.status || 'aktif').toLowerCase();
  const address = row.alamatlengkap || row.alamat || '';
  const rt = row.rt || '';
  const rw = row.rw || '';
  const hamlet = row.dusun || '';
  const village = row.kelurahandesa || row.kelurahan || row.desa || '';
  const district = row.kecamatan || '';
  const postal_code = row.kodepos || '';
  const phone = row.nohpwasiswa || row.nohpsiswa || row.nohp || '';
  const email = row.emailsiswa || row.email || '';
  const height_cm = row.tinggibadancm || row.tinggibadan || '';
  const weight_kg = row.beratbadankg || row.beratbadan || '';
  const blood_type = (row.golongandarah || '').toUpperCase();
  const medical_history = row.riwayatpenyakit || '';
  const father_name = row.namaayah || '';
  const father_nik = row.nikayah || '';
  const father_education = row.pendidikanayah || '';
  const father_occupation = row.pekerjaanayah || '';
  const father_income = row.penghasilanayah || '';
  const father_phone = row.nohpayah || '';
  const mother_name = row.namaibu || '';
  const mother_nik = row.nikibu || '';
  const mother_education = row.pendidikanibu || '';
  const mother_occupation = row.pekerjaanibu || '';
  const mother_income = row.penghasilanibu || '';
  const mother_phone = row.nohpibu || '';
  const guardian_name = row.namawali || '';
  const guardian_relationship = row.hubunganwali || 'wali';
  const guardian_phone = row.nohpwali || '';

  const isExample = full_name.toUpperCase().includes('[CONTOH]') || nis.toUpperCase().includes('[CONTOH]');

  return {
    id: id && !isNaN(id) ? Number(id) : null,
    nis,
    nisn,
    nik,
    family_card_number,
    full_name,
    nickname,
    gender,
    birth_place,
    birth_date,
    religion,
    citizenship,
    order_in_family: order_in_family && !isNaN(order_in_family) ? Number(order_in_family) : null,
    number_of_siblings: number_of_siblings && !isNaN(number_of_siblings) ? Number(number_of_siblings) : null,
    class_group_name,
    registration_type,
    previous_school_name,
    status,
    address,
    rt,
    rw,
    hamlet,
    village,
    district,
    postal_code,
    phone,
    email,
    height_cm: height_cm && !isNaN(height_cm) ? Number(height_cm) : null,
    weight_kg: weight_kg && !isNaN(weight_kg) ? Number(weight_kg) : null,
    blood_type,
    medical_history,
    father_name,
    father_nik,
    father_education,
    father_occupation,
    father_income,
    father_phone,
    mother_name,
    mother_nik,
    mother_education,
    mother_occupation,
    mother_income,
    mother_phone,
    guardian_name,
    guardian_relationship,
    guardian_phone,
    isExample
  };
}

export default function DataSiswa() {
  const { activeSchoolUnit } = useAuth();
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [rombelFilter, setRombelFilter] = useState('');
  const [registrationTypeFilter, setRegistrationTypeFilter] = useState('');
  const [classGroupsFilter, setClassGroupsFilter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, per_page: 100, total: 0 });

  // State Sorting Kolom
  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
    }
  };

  // State Modal Impor & Ekspor Excel
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importPreviewStats, setImportPreviewStats] = useState({ total: 0, newCount: 0, updateCount: 0, exampleCount: 0, invalidCount: 0 });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [templateRombelScope, setTemplateRombelScope] = useState('all'); // 'all' | '<rombel_name>' | 'belum_rombel'
  const [showEnumGuideInModal, setShowEnumGuideInModal] = useState(false);
  const [enumGuideCategoryFilter, setEnumGuideCategoryFilter] = useState('all');
  const fileInputRef = useRef(null);

  // State Modal Cetak Kartu Siswa PDF
  const [printCardModalOpen, setPrintCardModalOpen] = useState(false);
  const [selectedStudentIdsForCard, setSelectedStudentIdsForCard] = useState(new Set());
  const [generatingCardPdf, setGeneratingCardPdf] = useState(false);
  const [cardModalRombelFilter, setCardModalRombelFilter] = useState('all');
  const [cardPreviewStudentId, setCardPreviewStudentId] = useState(null);
  const [cardPrintConfig, setCardPrintConfig] = useState({
    paper_size: 'a4',
    paper_orientation: 'portrait',
    custom_paper_width_mm: 210,
    custom_paper_height_mm: 297,
    card_size: 'cr80', // KTP / ID Card default
    custom_card_width_mm: 85.6,
    custom_card_height_mm: 54.0,
    margin_mm: 8,
    gap_mm: 3,
    show_cutting_lines: true,
    theme: 'emerald',
    card_title: 'KARTU TANDA SISWA',
    show_nis: true,
    show_nipd: true,
    show_nisn: true,
    show_class: true,
    show_birth_info: true,
    show_gender: false,
    show_address: false,
    show_qr: true,
    show_academic_year: true
  });

  // Modal State Tambah / Edit Siswa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Modal State Wali
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [selectedStudentForGuardian, setSelectedStudentForGuardian] = useState(null);

  // Modal State Masukkan ke Rombel
  const [assignRombelModalOpen, setAssignRombelModalOpen] = useState(false);
  const [selectedStudentForRombel, setSelectedStudentForRombel] = useState(null);
  const [availableClassGroups, setAvailableClassGroups] = useState([]);
  const [targetClassGroupId, setTargetClassGroupId] = useState('');
  const [savingRombel, setSavingRombel] = useState(false);
  const [guardiansList, setGuardiansList] = useState([]);

  // Modal State Kenaikan Kelas / Roll-over Tahun Ajaran
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    target_academic_year_id: '',
    target_class_group_id: '',
    student_ids: []
  });
  const [targetAcademicYearClassGroups, setTargetAcademicYearClassGroups] = useState([]);
  const [savingPromote, setSavingPromote] = useState(false);

  const [studentEnrollmentsHistory, setStudentEnrollmentsHistory] = useState([]);

  // Form State Siswa
  const [formData, setFormData] = useState({
    satuan_pendidikan_id: activeSchoolUnit?.id || 1,
    cohort_id: '',
    cohort_name: '',
    academic_year_id: '',
    class_group_id: '',
    registration_type: 'Siswa Baru',
    initial_grade_level_id: '',
    previous_school_name: '',
    previous_school_address: '',
    nis: '',
    nisn: '',
    full_name: '',
    gender: 'L',
    birth_place: '',
    birth_date: '',
    address: '',
    photo_url: '',
    status: 'aktif',
    enrolled_at: new Date().toISOString().split('T')[0]
  });

  // State Pas Foto Siswa & Kompresi Otomatis
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoStats, setPhotoStats] = useState(null);
  const photoInputRef = useRef(null);

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressingPhoto(true);
      setErrorMsg('');
      const compressed = await compressStudentPhoto(file, {
        maxWidth: 600,
        maxHeight: 800,
        quality: 0.82
      });

      const origKb = (compressed.originalSize / 1024).toFixed(1);
      const compKb = (compressed.compressedSize / 1024).toFixed(1);
      const savedPct = Math.max(0, Math.round((1 - compressed.compressedSize / compressed.originalSize) * 100));

      setPhotoStats({
        origSize: `${origKb} KB`,
        compSize: `${compKb} KB`,
        savedPct: `${savedPct}%`,
        dimensions: `${compressed.width} × ${compressed.height} px`
      });

      setFormData(prev => ({
        ...prev,
        photo_url: compressed.base64
      }));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengompres dan memuat pas foto');
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo_url: '' }));
    setPhotoStats(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Form State Wali
  const [guardianForm, setGuardianForm] = useState({
    full_name: '',
    occupation: '',
    phone: '',
    email: '',
    address: '',
    relationship: 'ayah',
    is_primary_contact: true
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [foundationProfile, setFoundationProfile] = useState(null);

  useEffect(() => {
    fetchCohorts();
    fetchAcademicYears();
    fetchGradeLevels();
    fetchFoundationProfile();
  }, [activeSchoolUnit]);

  const fetchFoundationProfile = async () => {
    try {
      const res = await api.get('/core/foundation');
      if (res.data?.success && res.data.data) {
        setFoundationProfile(res.data.data);
      }
    } catch (e) {
      try {
        const fallbackRes = await api.get('/foundation');
        if (fallbackRes.data?.success && fallbackRes.data.data) {
          setFoundationProfile(fallbackRes.data.data);
        }
      } catch (err) {}
    }
  };

  useEffect(() => {
    fetchFilterClassGroups();
  }, [activeSchoolUnit, academicYearFilter]);

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter, cohortFilter, academicYearFilter, rombelFilter, registrationTypeFilter, activeSchoolUnit]);

  const fetchCohorts = async () => {
    try {
      const params = {};
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      const res = await api.get('/akademik/cohorts', { params });
      setCohorts(res.data?.data || []);
    } catch (e) {}
  };

  const fetchGradeLevels = async () => {
    try {
      const params = {};
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      const res = await api.get('/akademik/grade-levels', { params });
      setGradeLevels(res.data?.data || []);
    } catch (e) {}
  };

  const fetchFilterClassGroups = async () => {
    if (!academicYearFilter) {
      setClassGroupsFilter([]);
      return;
    }
    try {
      const params = {};
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      params.academic_year_id = academicYearFilter;
      const res = await api.get('/akademik/class-groups', { params });
      const rawList = res.data?.data || [];
      const regulerList = rawList.filter(cg => !cg.type || cg.type === 'reguler');
      const uniqueNames = [];
      const seen = new Set();
      for (const cg of regulerList) {
        if (cg.name && !seen.has(cg.name)) {
          seen.add(cg.name);
          uniqueNames.push(cg);
        }
      }
      uniqueNames.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
      setClassGroupsFilter(uniqueNames);
    } catch (e) {
      setClassGroupsFilter([]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const params = {};
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      const res = await api.get('/akademik/academic-years', { params });
      const rawList = res.data?.data || [];
      const uniqueMap = new Map();
      rawList.forEach((ay) => {
        const nameKey = (ay.name || '').trim();
        const existing = uniqueMap.get(nameKey);
        if (!existing) {
          uniqueMap.set(nameKey, ay);
        } else if (ay.is_active && !existing.is_active) {
          uniqueMap.set(nameKey, ay);
        }
      });
      const list = Array.from(uniqueMap.values()).sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      setAcademicYears(list);

      // Pastikan selalu ada Tahun Ajaran yang terpilih (Wajib per Tahun Ajaran Tertentu)
      if (list.length > 0) {
        setAcademicYearFilter((prev) => {
          const stillValid = list.find(y => String(y.id) === String(prev));
          if (stillValid) return prev;
          const activeYear = list.find(y => y.is_active) || list[0];
          return String(activeYear.id);
        });
      }
    } catch (e) {}
  };

  const fetchStudents = async () => {
    if (!academicYearFilter) return; // Wajib per Tahun Ajaran Tertentu
    try {
      setLoading(true);
      const params = {
        per_page: 500 // Muat seluruh siswa untuk kelengkapan data
      };
      if (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') params.satuan_pendidikan_id = activeSchoolUnit.id;
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (cohortFilter) params.cohort_id = cohortFilter;
      params.academic_year_id = academicYearFilter;
      if (rombelFilter && rombelFilter !== 'all' && rombelFilter !== 'belum_rombel') {
        params.class_group_name = rombelFilter;
      }
      if (registrationTypeFilter && registrationTypeFilter !== 'all') params.registration_type = registrationTypeFilter;

      const res = await api.get('/akademik/students', { params });
      const rawList = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []);
      setStudents(rawList);
      setPagination(res.data?.pagination || { page: 1, per_page: 500, total: rawList.length });
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Nama Tahun Ajaran Terpilih
  const selectedYearName = useMemo(() => {
    const found = academicYears.find((ay) => String(ay.id) === String(academicYearFilter));
    return found ? found.name : 'Tahun Ajaran Aktif';
  }, [academicYears, academicYearFilter]);

  // Statistik Jumlah Siswa per Rombel pada Tahun Ajaran yang Aktif
  const rombelStats = useMemo(() => {
    const map = {};
    let unassigned = 0;
    let maleTotal = 0;
    let femaleTotal = 0;

    students.forEach((s) => {
      if (s.gender === 'L') maleTotal++;
      else if (s.gender === 'P') femaleTotal++;

      const rName = s.class_group_name;
      if (rName) {
        if (!map[rName]) {
          map[rName] = { count: 0, male: 0, female: 0 };
        }
        map[rName].count++;
        if (s.gender === 'L') map[rName].male++;
        else if (s.gender === 'P') map[rName].female++;
      } else {
        unassigned++;
      }
    });

    return { map, unassigned, total: students.length, maleTotal, femaleTotal };
  }, [students]);

  // Data siswa terfilter (termasuk filter 'belum_rombel' atau rombel spesifik)
  const displayStudents = useMemo(() => {
    return students.filter((s) => {
      if (rombelFilter === 'belum_rombel') {
        return !s.class_group_name;
      }
      if (rombelFilter && rombelFilter !== 'all') {
        return s.class_group_name === rombelFilter;
      }
      return true;
    });
  }, [students, rombelFilter]);

  const handleOpenAddModal = async () => {
    setEditingStudent(null);
    setStudentEnrollmentsHistory([]);
    const activeYear = academicYears.find((y) => y.is_active) || academicYears[0];
    const defaultYearId = academicYearFilter !== 'all' && academicYearFilter ? academicYearFilter : (activeYear?.id || '');
    const defaultUnitId = (activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') ? Number(activeSchoolUnit.id) : 1;
    setFormData({
      satuan_pendidikan_id: defaultUnitId,
      cohort_id: '',
      cohort_name: '',
      academic_year_id: defaultYearId ? String(defaultYearId) : '',
      class_group_id: '',
      registration_type: 'Siswa Baru',
      initial_grade_level_id: '',
      previous_school_name: '',
      previous_school_address: '',
      nis: '',
      nisn: '',
      full_name: '',
      gender: 'L',
      birth_place: '',
      birth_date: '',
      address: '',
      photo_url: '',
      status: 'aktif',
      enrolled_at: parseDateToYmd(new Date())
    });
    setPhotoStats(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    setErrorMsg('');
    try {
      if (defaultYearId) {
        const res = await api.get('/akademik/class-groups', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: defaultYearId }
        });
        setAvailableClassGroups(res.data?.data || []);
      } else {
        setAvailableClassGroups([]);
      }
    } catch (e) {}
    setModalOpen(true);
  };

  const handleOpenEditModal = async (student) => {
    setEditingStudent(student);
    const activeYear = academicYears.find((y) => y.is_active) || academicYears[0];
    const targetYearId = (academicYearFilter && academicYearFilter !== 'all')
      ? String(academicYearFilter)
      : String(student.academic_year_id || activeYear?.id || '');

    const initialClassGroupId = (String(student.academic_year_id) === String(targetYearId) ? student.class_group_id : '') || '';

    setFormData({
      satuan_pendidikan_id: student.satuan_pendidikan_id || activeSchoolUnit?.id || 1,
      cohort_id: student.cohort_id || '',
      cohort_name: student.cohort_name || '',
      academic_year_id: targetYearId,
      class_group_id: initialClassGroupId ? String(initialClassGroupId) : '',
      registration_type: (student.registration_type || '').toLowerCase().includes('pindah') ? 'Siswa Pindahan' : 'Siswa Baru',
      initial_grade_level_id: student.initial_grade_level_id ? String(student.initial_grade_level_id) : '',
      previous_school_name: student.previous_school_name || '',
      previous_school_address: student.previous_school_address || '',
      nis: student.nis || '',
      nisn: student.nisn || '',
      full_name: student.full_name || '',
      gender: student.gender || 'L',
      birth_place: student.birth_place || '',
      birth_date: parseDateToYmd(student.birth_date),
      address: student.address || '',
      photo_url: student.photo_url || '',
      status: student.status || 'aktif',
      enrolled_at: parseDateToYmd(student.enrolled_at || student.admission_date || new Date())
    });
    setPhotoStats(student.photo_url ? { origSize: '-', compSize: 'Tersimpan', savedPct: '-', dimensions: 'Pas Foto Siswa' } : null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    setErrorMsg('');
    setModalOpen(true);

    try {
      const [classGroupsRes, studentDetailRes] = await Promise.all([
        targetYearId ? api.get('/akademik/class-groups', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id || student.satuan_pendidikan_id, academic_year_id: targetYearId }
        }) : Promise.resolve({ data: { data: [] } }),
        api.get(`/akademik/students/${student.id}`)
      ]);

      const groups = classGroupsRes.data?.data || [];
      setAvailableClassGroups(groups);

      const fullDetail = studentDetailRes.data?.data || {};
      const enrollments = fullDetail.enrollments || [];
      setStudentEnrollmentsHistory(enrollments);

      // Cari rombel aktif di targetYearId
      const matchingEnrollment = enrollments.find(e => String(e.academic_year_id) === String(targetYearId));
      const resolvedClassGroupId = matchingEnrollment
        ? String(matchingEnrollment.class_group_id)
        : (initialClassGroupId ? String(initialClassGroupId) : '');

      setFormData(prev => ({
        ...prev,
        academic_year_id: targetYearId,
        class_group_id: resolvedClassGroupId,
        initial_grade_level_id: fullDetail.admission?.initial_grade_level_id ? String(fullDetail.admission.initial_grade_level_id) : (prev.initial_grade_level_id || ''),
        birth_date: parseDateToYmd(fullDetail.birth_date || prev.birth_date),
        enrolled_at: parseDateToYmd(fullDetail.enrolled_at || fullDetail.admission?.admission_date || prev.enrolled_at),
        registration_type: fullDetail.admission?.registration_type ? (String(fullDetail.admission.registration_type).toLowerCase().includes('pindah') ? 'Siswa Pindahan' : 'Siswa Baru') : prev.registration_type,
        previous_school_name: fullDetail.admission?.previous_school_name || prev.previous_school_name,
        previous_school_address: fullDetail.admission?.previous_school_address || prev.previous_school_address
      }));
    } catch (err) {
      console.warn('Error loading student edit details:', err);
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const resolvedUnitId = (formData.satuan_pendidikan_id && formData.satuan_pendidikan_id !== 'all')
        ? Number(formData.satuan_pendidikan_id)
        : ((activeSchoolUnit?.id && activeSchoolUnit.id !== 'all') ? Number(activeSchoolUnit.id) : 1);

      const payload = {
        ...formData,
        satuan_pendidikan_id: resolvedUnitId,
        nis: formData.nis ? String(formData.nis).trim() : '',
        nisn: formData.nisn ? String(formData.nisn).trim() : null,
        enrolled_at: formData.enrolled_at,
        admission: {
          registration_type: formData.registration_type,
          initial_grade_level_id: formData.registration_type.includes('Pindah') ? (formData.initial_grade_level_id ? Number(formData.initial_grade_level_id) : null) : null,
          previous_school_name: formData.previous_school_name || null,
          previous_school_address: formData.previous_school_address || null,
          admission_date: formData.enrolled_at
        }
      };

      if (editingStudent) {
        await api.put(`/akademik/students/${editingStudent.id}`, payload);
        setSuccessMsg('Data siswa berhasil diperbarui!');
      } else {
        await api.post('/akademik/students', payload);
        setSuccessMsg('Siswa baru berhasil ditambahkan!');
      }
      setModalOpen(false);
      fetchStudents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data siswa');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenGuardianModal = async (student) => {
    setSelectedStudentForGuardian(student);
    setErrorMsg('');
    try {
      const res = await api.get(`/akademik/students/${student.id}/guardians`);
      setGuardiansList(res.data?.data || []);
      setGuardianModalOpen(true);
    } catch (err) {
      console.error('Error fetching guardians:', err);
    }
  };

  const handleSaveGuardian = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      await api.post(`/akademik/students/${selectedStudentForGuardian.id}/guardians`, guardianForm);
      const res = await api.get(`/akademik/students/${selectedStudentForGuardian.id}/guardians`);
      setGuardiansList(res.data?.data || []);
      setGuardianForm({
        full_name: '',
        occupation: '',
        phone: '',
        email: '',
        address: '',
        relationship: 'ayah',
        is_primary_contact: true
      });
      setSuccessMsg('Wali berhasil dikaitkan ke siswa!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menambahkan wali');
    } finally {
      setSaving(false);
    }
  };

  // --- MASUKKAN SISWA KE ROMBEL ---
  const handleOpenAssignRombelModal = async (student) => {
    setSelectedStudentForRombel(student);
    setTargetClassGroupId(student.class_group_id || '');
    setAssignRombelModalOpen(true);
    try {
      const res = await api.get('/akademik/class-groups', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || student.satuan_pendidikan_id,
          type: 'reguler'
        }
      });
      setAvailableClassGroups((res.data?.data || []).filter((cg) => !cg.type || cg.type === 'reguler'));
    } catch (err) {
      console.error('Gagal mengambil daftar rombel:', err);
    }
  };

  const handleSaveAssignRombel = async (e) => {
    e.preventDefault();
    if (!targetClassGroupId) {
      alert('Pilih rombongan belajar terlebih dahulu');
      return;
    }
    try {
      setSavingRombel(true);
      await api.post(`/akademik/class-groups/${targetClassGroupId}/members`, {
        student_ids: [selectedStudentForRombel.id],
        satuan_pendidikan_id: activeSchoolUnit?.id || selectedStudentForRombel.satuan_pendidikan_id
      });
      setSuccessMsg(`Siswa ${selectedStudentForRombel.full_name} berhasil dimasukkan ke rombel!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setAssignRombelModalOpen(false);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memasukkan siswa ke rombel');
    } finally {
      setSavingRombel(false);
    }
  };

  // --- KENAIKAN KELAS / ROLL-OVER TAHUN AJARAN ---
  const handleOpenPromoteModal = async () => {
    const activeYear = academicYears.find((y) => y.is_active);
    const defaultTargetYearId = activeYear ? activeYear.id : '';
    setPromoteForm({
      target_academic_year_id: defaultTargetYearId,
      target_class_group_id: '',
      student_ids: students.map((s) => s.id)
    });
    setPromoteModalOpen(true);
    if (defaultTargetYearId) {
      try {
        const res = await api.get('/akademik/class-groups', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: defaultTargetYearId }
        });
        setTargetAcademicYearClassGroups(res.data?.data || []);
      } catch (e) {}
    }
  };

  const handleTargetYearChange = async (yearId) => {
    setPromoteForm({ ...promoteForm, target_academic_year_id: yearId, target_class_group_id: '' });
    try {
      const res = await api.get('/akademik/class-groups', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: yearId }
      });
      setTargetAcademicYearClassGroups(res.data?.data || []);
    } catch (e) {}
  };

  const handleToggleStudentSelection = (id) => {
    const current = [...promoteForm.student_ids];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setPromoteForm({ ...promoteForm, student_ids: current });
  };

  const handleToggleSelectAll = () => {
    if (promoteForm.student_ids.length === students.length) {
      setPromoteForm({ ...promoteForm, student_ids: [] });
    } else {
      setPromoteForm({ ...promoteForm, student_ids: students.map((s) => s.id) });
    }
  };

  const handleSavePromote = async (e) => {
    e.preventDefault();
    if (!promoteForm.target_academic_year_id || !promoteForm.target_class_group_id || !promoteForm.student_ids.length) {
      alert('Mohon pilih Tahun Ajaran Tujuan, Rombel Tujuan, dan minimal 1 siswa');
      return;
    }
    try {
      setSavingPromote(true);
      const res = await api.post('/akademik/students/promote', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        target_academic_year_id: promoteForm.target_academic_year_id,
        target_class_group_id: promoteForm.target_class_group_id,
        student_ids: promoteForm.student_ids
      });
      setSuccessMsg(res.data?.message || 'Proses kenaikan kelas/penempatan berhasil!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setPromoteModalOpen(false);
      setAcademicYearFilter(promoteForm.target_academic_year_id);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses kenaikan kelas');
    } finally {
      setSavingPromote(false);
    }
  };

  // --- FITUR EKSPORT DAN IMPORT EXCEL ---
  const getUnitCodeName = () => {
    return (activeSchoolUnit?.name || activeSchoolUnit?.unit_name || 'Sekolah').replace(/[^a-zA-Z0-9]/g, '_');
  };

  const getActiveYearName = () => {
    const ay = academicYears.find(y => String(y.id) === String(academicYearFilter)) || academicYears.find(y => y.is_active);
    return (ay?.name || 'Semua_TA').replace(/[^a-zA-Z0-9]/g, '_');
  };

  // Daftar siswa yang disaring untuk Template Edit berdasarkan templateRombelScope
  const studentsForEditTemplate = useMemo(() => {
    if (templateRombelScope === 'all') {
      return students;
    }
    if (templateRombelScope === 'belum_rombel') {
      return students.filter(s => !s.class_group_name);
    }
    return students.filter(s => s.class_group_name === templateRombelScope);
  }, [students, templateRombelScope]);

  // 1. Unduh Template Murid Baru (Format Kosong + 1 Baris Contoh Lengkap + Sheet Panduan Enum)
  const handleDownloadNewStudentTemplate = () => {
    const headers = EXCEL_COLUMNS.map(c => c.header);
    const data = [SAMPLE_ROW_NEW_STUDENT];

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    ws['!cols'] = EXCEL_COLUMNS.map(c => ({ wch: c.width || 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa_Baru');

    // Sheet 2: Panduan & Referensi Opsi Enum
    const wsGuide = buildEnumGuideSheet(classGroupsFilter);
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Opsi_Enum');

    const fileName = `Template_Import_Siswa_Baru_${getUnitCodeName()}_TA_${getActiveYearName()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // 2. Unduh Template Edit / Update Data Siswa (Berisi Data Siswa Terdaftar per Rombel / Semua Rombel)
  const handleDownloadUpdateStudentTemplate = () => {
    const targetStudents = studentsForEditTemplate;
    if (targetStudents.length === 0) {
      alert('Tidak ada data siswa yang tersedia untuk cakupan rombel terpilih pada Tahun Ajaran ini.');
      return;
    }

    const headers = EXCEL_COLUMNS.map(c => c.header);

    const rows = targetStudents.map(s => ({
      'ID Siswa (Khusus Update)': s.id,
      'NIS *': s.nis || '',
      'NISN': s.nisn || '',
      'NIK Siswa': s.nik || '',
      'No KK': s.family_card_number || '',
      'Nama Lengkap *': s.full_name || '',
      'Nama Panggilan': s.nickname || '',
      'Jenis Kelamin (L/P) * [L/P]': s.gender || 'L',
      'Tempat Lahir': s.birth_place || '',
      'Tanggal Lahir (YYYY-MM-DD)': s.birth_date ? parseDateToYmd(s.birth_date) : '',
      'Agama [Islam/Kristen/Katolik/Hindu/Buddha/Konghucu]': s.religion || 'Islam',
      'Kewarganegaraan [WNI/WNA]': s.citizenship || 'WNI',
      'Anak Ke': s.order_in_family || '',
      'Jumlah Saudara': s.number_of_siblings || '',
      'Rombel / Kelas [Pilih Rombel Aktif]': s.class_group_name || '',
      'Jenis Pendaftaran [Siswa Baru/Siswa Pindahan]': s.registration_type || 'Siswa Baru',
      'Asal Sekolah': s.previous_school_name || '',
      'Status Siswa (aktif/calon/lulus/pindah/keluar/non_aktif)': s.status || 'aktif',
      'Alamat Lengkap': s.address || '',
      'RT': '',
      'RW': '',
      'Dusun': '',
      'Kelurahan / Desa': '',
      'Kecamatan': '',
      'Kode Pos': '',
      'No HP / WA Siswa': '',
      'Email Siswa': '',
      'Tinggi Badan (cm)': '',
      'Berat Badan (kg)': '',
      'Golongan Darah [A/B/AB/O/Tidak Tahu]': '',
      'Riwayat Penyakit': '',
      'Nama Ayah': '',
      'NIK Ayah': '',
      'Pendidikan Ayah [SD/SMP/SMA/D3/S1/S2/S3]': '',
      'Pekerjaan Ayah [PNS/TNI/Swasta/Wiraswasta/Guru/Lainnya]': '',
      'Penghasilan Ayah [< 1jt/1-3jt/3-5jt/5-10jt/10-20jt/> 20jt]': '',
      'No HP Ayah': '',
      'Nama Ibu': '',
      'NIK Ibu': '',
      'Pendidikan Ibu [SD/SMP/SMA/D3/S1/S2/S3]': '',
      'Pekerjaan Ibu [PNS/Swasta/Wiraswasta/Guru/IRT/Lainnya]': '',
      'Penghasilan Ibu [< 1jt/1-3jt/3-5jt/5-10jt/10-20jt/> 20jt]': '',
      'No HP Ibu': '',
      'Nama Wali': '',
      'Hubungan Wali [ayah/ibu/kakek_nenek/paman_bibi/wali]': '',
      'No HP Wali': ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws['!cols'] = EXCEL_COLUMNS.map(c => ({ wch: c.width || 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa_Update');

    // Sheet 2: Panduan & Referensi Opsi Enum
    const wsGuide = buildEnumGuideSheet(classGroupsFilter);
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Opsi_Enum');

    const rombelSuffix = templateRombelScope === 'all'
      ? 'Semua_Rombel'
      : (templateRombelScope === 'belum_rombel'
        ? 'Belum_Ada_Rombel'
        : `Rombel_${templateRombelScope.replace(/[^a-zA-Z0-9]/g, '_')}`);

    const fileName = `Template_Edit_Siswa_${getUnitCodeName()}_TA_${getActiveYearName()}_${rombelSuffix}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // 3. Ekspor Data Siswa Aktif (Excel Lengkap)
  const handleExportExcel = () => {
    try {
      setExporting(true);
      const dataToExport = displayStudents.length > 0 ? displayStudents : students;

      const rows = dataToExport.map((s, idx) => ({
        'No': idx + 1,
        'ID Siswa': s.id,
        'NIS': s.nis || '',
        'NISN': s.nisn || '',
        'NIK': s.nik || '',
        'No KK': s.family_card_number || '',
        'Nama Lengkap': s.full_name || '',
        'Nama Panggilan': s.nickname || '',
        'JK': s.gender || 'L',
        'Tempat Lahir': s.birth_place || '',
        'Tanggal Lahir': s.birth_date ? parseDateToYmd(s.birth_date) : '',
        'Agama': s.religion || 'Islam',
        'Rombel / Kelas': s.class_group_name || 'Belum ada rombel',
        'Tahun Ajaran': s.academic_year_name || selectedYearName,
        'Jenis Pendaftaran': s.registration_type || 'Siswa Baru',
        'Asal Sekolah': s.previous_school_name || '-',
        'Status': (s.status || 'aktif').toUpperCase(),
        'Alamat': s.address || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 10 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 28 },
        { wch: 16 },
        { wch: 6 },
        { wch: 16 },
        { wch: 14 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 22 },
        { wch: 12 },
        { wch: 35 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Siswa');

      const fileName = `Data_Siswa_${getUnitCodeName()}_${getActiveYearName()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert('Gagal mengekspor data: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // 4. Buka Modal Impor
  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportRows([]);
    setImportPreviewStats({ total: 0, newCount: 0, updateCount: 0, exampleCount: 0, invalidCount: 0 });
    setImportResult(null);
    setErrorMsg('');
    setImportModalOpen(true);
  };

  // 5. Handler File Input Impor
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('File Excel kosong atau format tidak sesuai.');
          return;
        }

        const existingStudentNisSet = new Set(students.map(s => String(s.nis).trim().toLowerCase()));
        const existingStudentIdSet = new Set(students.map(s => Number(s.id)));

        const parsedRows = [];
        let newCount = 0;
        let updateCount = 0;
        let exampleCount = 0;
        let invalidCount = 0;

        for (const raw of rawJson) {
          const norm = normalizeImportRow(raw);
          if (!norm.full_name) {
            invalidCount++;
            continue;
          }
          if (norm.isExample) {
            exampleCount++;
            norm.importType = 'example';
          } else if (norm.id && existingStudentIdSet.has(norm.id)) {
            updateCount++;
            norm.importType = 'update';
          } else if (norm.nis && existingStudentNisSet.has(String(norm.nis).toLowerCase())) {
            updateCount++;
            norm.importType = 'update';
          } else {
            newCount++;
            norm.importType = 'new';
          }
          parsedRows.push(norm);
        }

        setImportRows(parsedRows);
        setImportPreviewStats({
          total: parsedRows.length,
          newCount,
          updateCount,
          exampleCount,
          invalidCount
        });
      } catch (err) {
        alert('Gagal membaca file spreadsheet: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 6. Eksekusi Impor Batch
  const handleExecuteImport = async () => {
    const activeRowsToImport = importRows.filter(r => !r.isExample && r.full_name);
    if (activeRowsToImport.length === 0) {
      alert('Tidak ada baris data valid yang siap diimpor.');
      return;
    }

    try {
      setImporting(true);
      const res = await api.post('/akademik/students/batch-import', {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: academicYearFilter || undefined,
        rows: activeRowsToImport
      });

      const result = res.data?.data || {};
      setImportResult(result);
      setSuccessMsg(`Import selesai! ${result.inserted_count || 0} siswa baru ditambahkan, ${result.updated_count || 0} data diperbarui.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses import batch siswa');
    } finally {
      setImporting(false);
    }
  };

  // --- FITUR CETAK KARTU SISWA PDF ---
  const handleOpenCardPrintModal = (preselectedStudent = null) => {
    if (preselectedStudent && preselectedStudent.id) {
      setSelectedStudentIdsForCard(new Set([preselectedStudent.id]));
      setCardPreviewStudentId(preselectedStudent.id);
    } else {
      const initialIds = new Set(displayStudents.map(s => s.id));
      setSelectedStudentIdsForCard(initialIds);
      setCardPreviewStudentId(displayStudents[0]?.id || students[0]?.id || null);
    }
    setCardModalRombelFilter('all');
    setPrintCardModalOpen(true);
  };

  const handleToggleCardStudent = (id) => {
    const next = new Set(selectedStudentIdsForCard);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIdsForCard(next);
    if (!cardPreviewStudentId || cardPreviewStudentId === id) {
      setCardPreviewStudentId(id);
    }
  };

  const handleSelectAllCardStudents = (listToSelect) => {
    const listIds = listToSelect.map(s => s.id);
    const allSelected = listIds.length > 0 && listIds.every(id => selectedStudentIdsForCard.has(id));
    const next = new Set(selectedStudentIdsForCard);
    if (allSelected) {
      listIds.forEach(id => next.delete(id));
    } else {
      listIds.forEach(id => next.add(id));
    }
    setSelectedStudentIdsForCard(next);
  };

  const handleExecuteCardPrintPdf = async (actionType = 'open') => {
    const targetIds = Array.from(selectedStudentIdsForCard);
    if (targetIds.length === 0) {
      alert('Pilih minimal satu siswa untuk dicetak kartunya.');
      return;
    }

    try {
      setGeneratingCardPdf(true);
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: academicYearFilter || undefined,
        student_ids: targetIds,
        paper_size: cardPrintConfig.paper_size,
        paper_orientation: cardPrintConfig.paper_orientation,
        custom_paper_width_mm: cardPrintConfig.custom_paper_width_mm,
        custom_paper_height_mm: cardPrintConfig.custom_paper_height_mm,
        card_size: cardPrintConfig.card_size,
        custom_card_width_mm: cardPrintConfig.custom_card_width_mm,
        custom_card_height_mm: cardPrintConfig.custom_card_height_mm,
        margin_mm: cardPrintConfig.margin_mm,
        gap_mm: cardPrintConfig.gap_mm,
        show_cutting_lines: cardPrintConfig.show_cutting_lines,
        theme: cardPrintConfig.theme,
        card_title: cardPrintConfig.card_title,
        show_nis: cardPrintConfig.show_nis,
        show_nipd: cardPrintConfig.show_nipd,
        show_nisn: cardPrintConfig.show_nisn,
        show_class: cardPrintConfig.show_class,
        show_birth_info: cardPrintConfig.show_birth_info,
        show_gender: cardPrintConfig.show_gender,
        show_address: cardPrintConfig.show_address,
        show_qr: cardPrintConfig.show_qr,
        show_academic_year: cardPrintConfig.show_academic_year
      };

      const res = await api.post('/akademik/students/print-cards-pdf', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `Kartu_Tanda_Siswa_${getUnitCodeName()}_${targetIds.length}_Siswa.pdf`;

      if (actionType === 'open') {
        const printWindow = window.open(blobUrl, '_blank');
        if (!printWindow) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert('Gagal membuat PDF kartu siswa: ' + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingCardPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Data Induk Siswa</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data master seluruh siswa, NISN, rombongan belajar periodik per tahun ajaran, dan riwayat orang tua/wali.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchStudents}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition active:scale-95 border border-slate-200 shadow-2xs cursor-pointer"
            title="Segarkan Data dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          {/* Tombol Cetak Kartu Siswa */}
          <button
            onClick={() => handleOpenCardPrintModal()}
            disabled={displayStudents.length === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Cetak Kartu Tanda Siswa / ID Card Resmi Format PDF (Ukuran KTP, QR NIPD, Pilihan Desain & Margin)"
          >
            <CreditCard className="w-4 h-4" />
            <span>Cetak Kartu Siswa</span>
          </button>

          {/* Tombol Ekspor Excel */}
          <button
            onClick={handleExportExcel}
            disabled={exporting || displayStudents.length === 0}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Ekspor seluruh data siswa yang terfilter ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{exporting ? 'Mengekspor...' : 'Ekspor Excel'}</span>
          </button>

          {/* Tombol Impor Excel */}
          <button
            onClick={handleOpenImportModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Impor Data Siswa Baru atau Update Data Masal via Excel"
          >
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Impor Excel</span>
          </button>

          <button
            onClick={handleOpenPromoteModal}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Proses Kenaikan Kelas / Roll-over Siswa ke Tahun Ajaran Baru"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Kenaikan Kelas</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Alert Success */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Kartu Statistik Jumlah Siswa Per Rombel (Berjejer 1 Baris dengan Beragam Warna Menarik) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-700">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Distribusi Siswa per Rombel Reguler
              </h2>
              <p className="text-[10.5px] text-slate-400 font-medium">
                Tahun Ajaran Aktif: <strong className="text-emerald-700 font-bold">{selectedYearName}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Klik kartu untuk filter cepat:
            </span>
            {rombelFilter && (
              <button
                type="button"
                onClick={() => setRombelFilter('')}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition"
              >
                Reset Filter Rombel
              </button>
            )}
          </div>
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-1.5 custom-scrollbar">
          {/* 1. Kartu Semua Rombel (Total Siswa) */}
          <div
            onClick={() => setRombelFilter('')}
            className={`min-w-[170px] max-w-[210px] p-3 rounded-2xl border transition-all duration-200 cursor-pointer shrink-0 select-none flex flex-col justify-between ${
              !rombelFilter || rombelFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-800 shadow-md ring-2 ring-emerald-500 ring-offset-1 scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                !rombelFilter || rombelFilter === 'all'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                Semua Rombel
              </span>
              <Users className={`w-3.5 h-3.5 ${!rombelFilter || rombelFilter === 'all' ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight">{rombelStats.total}</span>
                <span className={`text-xs font-bold ${!rombelFilter || rombelFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Siswa</span>
              </div>
              <p className={`text-[10px] mt-0.5 truncate font-medium ${!rombelFilter || rombelFilter === 'all' ? 'text-emerald-200' : 'text-slate-400'}`}>
                {rombelStats.maleTotal} Ikhwan • {rombelStats.femaleTotal} Akhwat
              </p>
            </div>
          </div>

          {/* 2. Kartu Tiap Rombel Reguler */}
          {classGroupsFilter.map((cg, idx) => {
            const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
            const stats = rombelStats.map[cg.name] || { count: 0, male: 0, female: 0 };
            const isSelected = rombelFilter === cg.name;

            return (
              <div
                key={cg.id || cg.name}
                onClick={() => setRombelFilter(isSelected ? '' : cg.name)}
                className={`min-w-[160px] max-w-[200px] p-3 rounded-2xl border transition-all duration-200 cursor-pointer shrink-0 select-none flex flex-col justify-between ${
                  palette.bg
                } ${
                  isSelected
                    ? `${palette.activeRing} scale-[1.01]`
                    : `${palette.border} shadow-2xs hover:shadow-xs`
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${palette.tag}`}>
                    {cg.grade_level_name || 'Rombel'}
                  </span>
                  <div className="text-[10px] font-bold text-slate-600 truncate max-w-[85px]" title={cg.name}>
                    {cg.name}
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black tracking-tight ${palette.countText}`}>
                      {stats.count}
                    </span>
                    <span className={`text-xs font-bold ${palette.subText}`}>Siswa</span>
                  </div>
                  <p className={`text-[10px] mt-0.5 truncate font-semibold ${palette.statSub}`}>
                    {stats.male} L • {stats.female} P
                  </p>
                </div>
              </div>
            );
          })}

          {/* 3. Kartu Belum Masuk Rombel (Bila Ada Siswa Belum Di-plot) */}
          {rombelStats.unassigned > 0 && (
            <div
              onClick={() => setRombelFilter(rombelFilter === 'belum_rombel' ? '' : 'belum_rombel')}
              className={`min-w-[160px] max-w-[200px] p-3 rounded-2xl border transition-all duration-200 cursor-pointer shrink-0 select-none flex flex-col justify-between bg-gradient-to-br from-rose-50/90 to-amber-50/70 ${
                rombelFilter === 'belum_rombel'
                  ? 'ring-2 ring-rose-500 border-rose-400 bg-rose-100/80 shadow-sm scale-[1.01]'
                  : 'border-rose-200/90 hover:border-rose-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-600 text-white">
                  Perhatian
                </span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>

              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black tracking-tight text-rose-950">
                    {rombelStats.unassigned}
                  </span>
                  <span className="text-xs font-bold text-rose-700">Siswa</span>
                </div>
                <p className="text-[10px] mt-0.5 truncate font-semibold text-rose-800">
                  Belum ada rombel
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar Filter & Pencarian */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau NISN..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Badge Jumlah Data Ditampilkan */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-700 whitespace-nowrap self-start sm:self-auto shadow-2xs">
            <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Menampilkan: <strong className="text-emerald-700 font-bold">{displayStudents.length}</strong> Siswa
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Filter Tahun Ajaran (Wajib per Tahun Ajaran Tertentu) */}
          <div className="flex items-center bg-emerald-50/80 hover:bg-emerald-50 border border-emerald-200/90 rounded-xl p-1 shadow-2xs transition">
            <div className="flex items-center gap-1.5 pl-2.5 pr-1 text-emerald-900 font-bold text-xs shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">T.A.:</span>
            </div>
            <div className="min-w-[190px] sm:min-w-[215px]">
              <SearchableSelect
                options={academicYears.map((ay) => ({
                  value: String(ay.id),
                  label: `T.A. ${ay.name}`,
                  sublabel: ay.is_active ? 'Tahun Ajaran Berjalan (Aktif)' : 'Tahun Ajaran Arsip',
                  badge: ay.is_active ? 'Aktif' : undefined,
                  badgeClass: ay.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : undefined
                }))}
                value={String(academicYearFilter || '')}
                onChange={(val) => {
                  if (val) {
                    setAcademicYearFilter(val);
                    setRombelFilter('');
                  }
                }}
                placeholder="Pilih Tahun Ajaran..."
                searchPlaceholder="Cari tahun ajaran..."
                accentColor="teal"
                allowClear={false}
                variant="header-white"
                menuMinWidth="230px"
              />
            </div>
          </div>

          {/* Filter Rombel */}
          <select
            value={rombelFilter}
            onChange={(e) => setRombelFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto font-medium text-slate-700 shadow-2xs cursor-pointer"
            title="Filter Berdasarkan Rombongan Belajar (Rombel)"
          >
            <option value="">Semua Rombel</option>
            {classGroupsFilter.map((cg) => (
              <option key={cg.id || cg.name} value={cg.name}>
                Rombel {cg.name}
              </option>
            ))}
            {rombelStats.unassigned > 0 && (
              <option value="belum_rombel">⚠️ Belum Masuk Rombel ({rombelStats.unassigned})</option>
            )}
          </select>

          {/* Filter Jenis Pendaftaran */}
          <select
            value={registrationTypeFilter}
            onChange={(e) => setRegistrationTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto font-medium text-slate-700 shadow-2xs"
            title="Filter Berdasarkan Jenis Pendaftaran"
          >
            <option value="">Semua Jenis Pendaftaran</option>
            <option value="siswa_baru">Siswa Baru</option>
            <option value="pindahan">Siswa Pindahan</option>
          </select>

          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto font-semibold"
          >
            <option value="">Semua Angkatan</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="calon">Calon</option>
            <option value="lulus">Lulus</option>
            <option value="pindah">Pindah</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th
                  onClick={() => handleSort('nis')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NIS / NISN</span>
                    {sortField === 'nis' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('full_name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nama Lengkap</span>
                    {sortField === 'full_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('class_group_name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Rombel Reguler</span>
                    {sortField === 'class_group_name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('gender')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Jenis Kelamin</span>
                    {sortField === 'gender' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('registration_type')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Jenis Pendaftaran</span>
                    {sortField === 'registration_type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('birth_date')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tempat, Tgl Lahir</span>
                    {sortField === 'birth_date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status Siswa</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dapodik_status')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status Dapodik</span>
                    {sortField === 'dapodik_status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat data siswa...</span>
                  </td>
                </tr>
              ) : displayStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Tidak ada data siswa yang sesuai filter.
                  </td>
                </tr>
              ) : (
                [...displayStudents]
                  .sort((a, b) => {
                    let valA = a[sortField] || '';
                    let valB = b[sortField] || '';
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                  })
                  .map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      <div className="font-bold text-slate-800">{student.nis}</div>
                      <div className="text-[10px] text-slate-400">NISN: {student.nisn || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {student.photo_url ? (
                          <img
                            src={student.photo_url}
                            alt={student.full_name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-black/5 ${
                            student.gender === 'P' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 hover:text-emerald-700 transition cursor-pointer" onClick={() => handleOpenEditModal(student)}>
                            {student.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{student.address || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {student.class_group_name ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
                            <Layers className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{student.class_group_name}</span>
                          </span>
                          <button
                            onClick={() => handleOpenAssignRombelModal(student)}
                            title="Pindah / Ganti Rombel"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition border border-transparent hover:border-emerald-200"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/90 px-2 py-0.5 rounded-md">
                            Belum masuk rombel
                          </span>
                          <button
                            onClick={() => handleOpenAssignRombelModal(student)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition active:scale-95"
                            title="Masukkan Siswa ke Rombel"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>+ Masukkan ke Rombel</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                        student.gender === 'L' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {student.gender === 'L' ? 'Laki-Laki' : 'Perempuan'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          (student.registration_type || '').toLowerCase().includes('pindah')
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {student.registration_type || 'Siswa Baru'}
                        </span>
                        {(student.registration_type || '').toLowerCase().includes('pindah') && student.initial_grade_name && (
                          <span className="inline-flex items-center text-[9px] font-bold text-amber-900 bg-amber-100/70 border border-amber-200/80 px-1.5 py-0.5 rounded">
                            Masuk: {student.initial_grade_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {student.birth_place ? `${student.birth_place}, ` : ''}
                      {student.birth_date ? student.birth_date.split('T')[0] : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        student.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' :
                        student.status === 'calon' ? 'bg-amber-100 text-amber-700' :
                        student.status === 'lulus' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {student.dapodik_status === 'sudah_masuk_dapodik' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Sudah Dapodik
                        </span>
                      )}
                      {student.dapodik_status === 'kendala' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Ada Kendala
                        </span>
                      )}
                      {(!student.dapodik_status || student.dapodik_status === 'belum_masuk_dapodik') && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Belum Masuk
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenCardPrintModal(student)}
                        title="Cetak Kartu Tanda Siswa (PDF)"
                        className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition inline-flex items-center justify-center border border-slate-200"
                      >
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                      </button>
                      <Link
                        to={`/akademik/students/${student.id}`}
                        className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition inline-flex items-center justify-center border border-slate-200"
                        title="Tampilkan Detail Siswa Lengkap"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleOpenGuardianModal(student)}
                        title="Kelola Orang Tua / Wali Cepat"
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(student)}
                        title="Edit Cepat"
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Siswa */}
      {modalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {/* Input Pas Foto Siswa dengan Kompresi Otomatis */}
              <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Pas Foto Siswa (Otomatis Kompres)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Format 3x4 / KTP • Max 600×800px
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Frame Pas Foto Preview */}
                  <div className="relative w-20 h-24 rounded-xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-2xs shrink-0 group">
                    {formData.photo_url ? (
                      <>
                        <img
                          src={formData.photo_url}
                          alt="Pas Foto Siswa"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          title="Hapus Pas Foto"
                          className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full shadow transition opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-[9px] font-semibold leading-tight">Belum Ada Foto</span>
                      </div>
                    )}
                    {compressingPhoto && (
                      <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1">
                        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                        <span className="text-[8px] font-bold text-emerald-800">Mengompres...</span>
                      </div>
                    )}
                  </div>

                  {/* Controls & Stat Kompresi */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                      id="student-photo-upload"
                    />
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="student-photo-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer transition active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{formData.photo_url ? 'Ganti Pas Foto' : 'Pilih / Unggah Pas Foto'}</span>
                      </label>
                      {formData.photo_url && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    {photoStats ? (
                      <div className="flex items-center gap-2 text-[10px] text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Ukuran: <strong>{photoStats.compSize}</strong>
                          {photoStats.origSize !== '-' && ` (Asli: ${photoStats.origSize} • Hemat ${photoStats.savedPct})`}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Foto otomatis dioptimasi & dikompresi sebelum disimpan agar kartu ID & sistem tetap ringan dan cepat.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nomor Induk Siswa (NIS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: 202601004"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NISN (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="10 digit nomor NISN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    placeholder="Masukkan nama lengkap siswa..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pilihan Angkatan Siswa
                  </label>
                  <select
                    value={formData.cohort_id || ''}
                    onChange={(e) => {
                      const selectedCohort = cohorts.find(c => c.id === Number(e.target.value));
                      setFormData({
                        ...formData,
                        cohort_id: e.target.value ? Number(e.target.value) : null,
                        cohort_name: selectedCohort?.name || ''
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Angkatan --</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Tahun {c.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status Siswa *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="calon">Calon</option>
                    <option value="lulus">Lulus</option>
                    <option value="pindah">Pindah</option>
                    <option value="keluar">Keluar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tahun Ajaran Pendaftaran / Aktif
                  </label>
                  <select
                    value={formData.academic_year_id || ''}
                    onChange={async (e) => {
                      const yId = e.target.value;
                      let enrolledCgId = '';
                      if (editingStudent && studentEnrollmentsHistory && studentEnrollmentsHistory.length > 0) {
                        const found = studentEnrollmentsHistory.find(en => String(en.academic_year_id) === String(yId));
                        if (found) enrolledCgId = String(found.class_group_id);
                      }
                      setFormData(prev => ({ ...prev, academic_year_id: yId, class_group_id: enrolledCgId || '' }));
                      if (yId) {
                        try {
                          const res = await api.get('/akademik/class-groups', {
                            params: { satuan_pendidikan_id: activeSchoolUnit?.id, academic_year_id: yId }
                          });
                          setAvailableClassGroups(res.data?.data || []);
                        } catch (err) {}
                      } else {
                        setAvailableClassGroups([]);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Tahun Ajaran --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        TA {ay.name} {ay.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rombongan Belajar (Rombel)
                  </label>
                  <select
                    value={formData.class_group_id || ''}
                    onChange={(e) => setFormData({ ...formData, class_group_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                  >
                    <option value="">-- Belum Masuk Rombel --</option>
                    {availableClassGroups.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Registrasi & Masuk Siswa */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jenis Registrasi *
                    </label>
                    <select
                      value={formData.registration_type}
                      onChange={(e) => setFormData({ ...formData, registration_type: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-800"
                    >
                      <option value="Siswa Baru">Siswa Baru</option>
                      <option value="Siswa Pindahan">Siswa Pindahan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tanggal Awal Masuk *
                    </label>
                    <DatePickerField
                      required
                      value={formData.enrolled_at || ''}
                      onChange={(isoVal) => setFormData({ ...formData, enrolled_at: isoVal })}
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>

                {formData.registration_type === 'Siswa Pindahan' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Kelas Pertama Masuk (Pindahan) *
                      </label>
                      <select
                        required
                        value={formData.initial_grade_level_id || ''}
                        onChange={(e) => setFormData({ ...formData, initial_grade_level_id: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold text-slate-800"
                      >
                        <option value="">-- Pilih Kelas Masuk --</option>
                        {gradeLevels.map((gl) => (
                          <option key={gl.id} value={gl.id}>
                            {gl.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nama Asal Sekolah (Opsional)
                      </label>
                      <input
                        type="text"
                        value={formData.previous_school_name}
                        onChange={(e) => setFormData({ ...formData, previous_school_name: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        placeholder="Contoh: SMP Negeri 1 / MTs..."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Alamat Sekolah Asal (Pindahan)
                      </label>
                      <input
                        type="text"
                        value={formData.previous_school_address}
                        onChange={(e) => setFormData({ ...formData, previous_school_address: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        placeholder="Alamat sekolah asal siswa pindahan..."
                      />
                    </div>
                  </div>
                )}

                {formData.registration_type !== 'Siswa Pindahan' && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Asal Sekolah (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.previous_school_name}
                      onChange={(e) => setFormData({ ...formData, previous_school_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      placeholder="Contoh: SDN 01 Depok / MI..."
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.birth_place}
                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <DatePickerField
                    value={formData.birth_date || ''}
                    onChange={(isoVal) => setFormData({ ...formData, birth_date: isoVal })}
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Alamat domisili lengkap..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kelola Orang Tua / Wali */}
      {guardianModalOpen && selectedStudentForGuardian && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Data Orang Tua / Wali: {selectedStudentForGuardian.full_name}
                </h3>
                <p className="text-[11px] text-slate-500">NIS: {selectedStudentForGuardian.nis}</p>
              </div>
              <button onClick={() => setGuardianModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Wali yang Ada */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Daftar Orang Tua / Wali Terkait</h4>
              {guardiansList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada data orang tua / wali yang dikaitkan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {guardiansList.map((g) => (
                    <div key={g.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{g.full_name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold uppercase">
                          {g.relationship}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Pekerjaan: {g.occupation || '-'}</div>
                      <div className="text-[11px] text-slate-500">Kontak: {g.phone || '-'}</div>
                      {g.is_primary_contact && (
                        <span className="inline-block text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          Kontak Utama
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Tambah Wali Cepat */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Tambah / Kaitkan Wali Baru</h4>
              <form onSubmit={handleSaveGuardian} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Nama Lengkap Wali *
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianForm.full_name}
                      onChange={(e) => setGuardianForm({ ...guardianForm, full_name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Hubungan Keluarga *
                    </label>
                    <select
                      value={guardianForm.relationship}
                      onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="ayah">Ayah</option>
                      <option value="ibu">Ibu</option>
                      <option value="wali">Wali</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Nomor Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={guardianForm.phone}
                      onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                      Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={guardianForm.occupation}
                      onChange={(e) => setGuardianForm({ ...guardianForm, occupation: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Simpan & Kaitkan Wali</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Masukkan / Pindah Siswa ke Rombel */}
      {assignRombelModalOpen && selectedStudentForRombel && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>{selectedStudentForRombel.class_group_name ? 'Pindah Rombel Siswa' : 'Masukkan Siswa ke Rombel'}</span>
              </h3>
              <button
                onClick={() => setAssignRombelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Siswa:</span>
                <span className="font-bold text-slate-800">{selectedStudentForRombel.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">NIS:</span>
                <span className="font-mono text-slate-700">{selectedStudentForRombel.nis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Rombel Saat Ini:</span>
                <span className="font-bold text-emerald-700">
                  {selectedStudentForRombel.class_group_name || 'Belum Masuk Rombel'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAssignRombel} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pilih Rombongan Belajar (Rombel) Tujuan *
                </label>
                <select
                  required
                  value={targetClassGroupId}
                  onChange={(e) => setTargetClassGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Rombel --</option>
                  {availableClassGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'}) - TA {cg.academic_year_name || ''}
                    </option>
                  ))}
                </select>
                {availableClassGroups.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Belum ada rombel yang terdaftar pada satuan pendidikan ini. Silakan buat rombel terlebih dahulu di menu Rombongan Belajar.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignRombelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRombel || !targetClassGroupId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  {savingRombel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan ke Rombel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas / Roll-over Tahun Ajaran */}
      {promoteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Proses Kenaikan Kelas / Roll-over Tahun Ajaran
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Daftarkan siswa yang dipilih ke Tahun Ajaran Baru tanpa mengubah nomor ID & NIS siswa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPromoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromote} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Ajaran Tujuan (Baru) *
                  </label>
                  <select
                    required
                    value={promoteForm.target_academic_year_id}
                    onChange={(e) => handleTargetYearChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Tahun Ajaran Baru --</option>
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        TA {ay.name} {ay.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rombel Tujuan di Tahun Baru *
                  </label>
                  <select
                    required
                    value={promoteForm.target_class_group_id}
                    onChange={(e) => setPromoteForm({ ...promoteForm, target_class_group_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Rombel Tujuan --</option>
                    {targetAcademicYearClassGroups.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (Tingkat {cg.grade_level_name || 'Kelas'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Daftar Siswa yang Dipilih */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    Pilih Siswa ({promoteForm.student_ids.length} dari {students.length} terpilih):
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {promoteForm.student_ids.length === students.length ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                  {students.map((s) => {
                    const isSelected = promoteForm.student_ids.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleStudentSelection(s.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                          isSelected ? 'bg-indigo-50/80 text-indigo-900 font-semibold' : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-800">{s.full_name}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">NIS: {s.nis}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          Rombel Asal: {s.class_group_name || 'Belum ada'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromoteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPromote || !promoteForm.target_academic_year_id || !promoteForm.target_class_group_id || !promoteForm.student_ids.length}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  {savingPromote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Proses Kenaikan Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPOR DATA SISWA EXCEL (2 OPSI TEMPLATE: SISWA BARU & EDIT DATA) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-2xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Impor & Pemutakhiran Data Siswa (Excel)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unit: <strong className="text-slate-700">{activeSchoolUnit?.name || 'Sekolah'}</strong> • Tahun Ajaran: <strong className="text-teal-700">{selectedYearName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 overflow-y-auto py-4 pr-1 text-xs custom-scrollbar grow">
              {/* Hasil Import Alert jika sudah dieksekusi */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Import Data Siswa Berhasil Diproses!</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Diterima</span>
                      <span className="text-base font-black text-slate-800">{importResult.total_received || 0}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-emerald-600 block text-[10px] uppercase font-bold">Siswa Baru</span>
                      <span className="text-base font-black text-emerald-700">+{importResult.inserted_count || 0}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-blue-600 block text-[10px] uppercase font-bold">Data Diperbarui</span>
                      <span className="text-base font-black text-blue-700">{importResult.updated_count || 0}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-amber-600 block text-[10px] uppercase font-bold">Dilewati / Contoh</span>
                      <span className="text-base font-black text-amber-700">{importResult.skipped_count || 0}</span>
                    </div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
                      <span className="font-bold block">Catatan / Peringatan Baris:</span>
                      <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* LANGKAH 1: PILIHAN UNDUH TEMPLATE */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                    1
                  </span>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Pilih & Unduh Format Template Excel
                  </h4>
                </div>
                <p className="text-slate-500 text-[11.5px] leading-relaxed">
                  Pilih salah satu dari 2 opsi template berikut sesuai kebutuhan Anda:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* OPSI A: TEMPLATE DATA MURID BARU */}
                  <div className="p-4 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/60 to-white flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-xs transition">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-md">
                          Opsi 1: Murid Baru
                        </span>
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h5 className="font-bold text-slate-800 text-xs">
                        Template Data Murid Baru (Data Kosong)
                      </h5>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Template kosong untuk menginput siswa baru. Dilengkapi <strong>1 baris contoh inputan format data lengkap</strong> (NIS, NISN, NIK, Tempat/Tgl Lahir, Orang Tua, Kontak) sebagai panduan pengisian yang valid.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadNewStudentTemplate}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Template Siswa Baru (.xlsx)</span>
                    </button>
                  </div>

                  {/* OPSI B: TEMPLATE EDIT / UPDATE DATA SISWA (BISA PER ROMBEL ATAU SEMUA ROMBEL) */}
                  <div className="p-4 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/60 to-white flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-xs transition">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider rounded-md">
                          Opsi 2: Edit & Lengkapi Data
                        </span>
                        <Edit2 className="w-4 h-4 text-indigo-600" />
                      </div>
                      <h5 className="font-bold text-slate-800 text-xs">
                        Template Edit Data Siswa (Data Terisi per Rombel / Semua Rombel)
                      </h5>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Template berisi data siswa yang sudah terdaftar pada Tahun Ajaran <strong>{selectedYearName}</strong>. Anda dapat mengunduh per rombel atau semua rombel untuk melengkapi data yang kosong.
                      </p>

                      {/* Pemilih Cakupan Rombel untuk Template Edit */}
                      <div className="space-y-1.5 p-2.5 bg-indigo-100/40 border border-indigo-200/80 rounded-xl">
                        <label className="block text-[10.5px] font-bold text-indigo-900 flex items-center justify-between">
                          <span>Pilih Cakupan Rombel:</span>
                          <span className="text-[10px] font-normal text-indigo-700 font-mono">
                            {studentsForEditTemplate.length} Siswa Terpilih
                          </span>
                        </label>
                        <select
                          value={templateRombelScope}
                          onChange={(e) => setTemplateRombelScope(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        >
                          <option value="all">
                            Semua Rombel TA {selectedYearName} ({students.length} Siswa)
                          </option>
                          {Object.entries(rombelStats.map || {}).map(([rName, stat]) => (
                            <option key={rName} value={rName}>
                              Rombel {rName} ({stat.count} Siswa: {stat.male} L, {stat.female} P)
                            </option>
                          ))}
                          {rombelStats.unassigned > 0 && (
                            <option value="belum_rombel">
                              Belum Masuk Rombel ({rombelStats.unassigned} Siswa)
                            </option>
                          )}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadUpdateStudentTemplate}
                      disabled={studentsForEditTemplate.length === 0}
                      className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        Unduh Template Edit ({templateRombelScope === 'all' ? 'Semua Rombel' : (templateRombelScope === 'belum_rombel' ? 'Belum Rombel' : `Rombel ${templateRombelScope}`)}: {studentsForEditTemplate.length} Siswa)
                      </span>
                    </button>
                  </div>
                </div>

                {/* KARTU PANDUAN REFERENSI PILIHAN ISIAN ENUM (L/P, AGAMA, STATUS, DLL) */}
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h6 className="font-bold text-slate-800 text-xs">
                          Panduan Pilihan Format Isian (Data Enum & Kategori)
                        </h6>
                        <p className="text-[10.5px] text-slate-500">
                          Setiap file Excel template otomatis menyertakan Sheet ke-2 <strong>"Panduan_Opsi_Enum"</strong>. Anda juga dapat melihat daftar pilihannya di bawah ini:
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowEnumGuideInModal(!showEnumGuideInModal)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition cursor-pointer"
                    >
                      {showEnumGuideInModal ? 'Tutup Panduan Enum ▲' : 'Buka Panduan Enum ▼'}
                    </button>
                  </div>

                  {showEnumGuideInModal && (
                    <div className="space-y-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-200">
                      {/* Filter Kategori Enum */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10.5px] font-bold text-slate-600 mr-1">Kategori:</span>
                        <button
                          type="button"
                          onClick={() => setEnumGuideCategoryFilter('all')}
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition ${
                            enumGuideCategoryFilter === 'all'
                              ? 'bg-slate-800 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Semua ({ENUM_OPTIONS_GUIDE.length + 1})
                        </button>
                        {ENUM_OPTIONS_GUIDE.map((grp) => (
                          <button
                            key={grp.field}
                            type="button"
                            onClick={() => setEnumGuideCategoryFilter(grp.field)}
                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition ${
                              enumGuideCategoryFilter === grp.field
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {grp.field}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEnumGuideCategoryFilter('Rombel')}
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition ${
                            enumGuideCategoryFilter === 'Rombel'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Rombel Aktif ({classGroupsFilter.length})
                        </button>
                      </div>

                      {/* Tabel Grid Enum Guide */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {ENUM_OPTIONS_GUIDE.filter(grp => enumGuideCategoryFilter === 'all' || enumGuideCategoryFilter === grp.field).map((grp) => (
                          <div key={grp.field} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                              <span className="font-bold text-slate-800 text-[11px]">{grp.field}</span>
                              <span className="text-[9.5px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                                Kolom: {grp.column.split('[')[0].trim()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {grp.options.map((opt) => (
                                <span
                                  key={opt.code}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded text-[10px]"
                                  title={`${opt.label}: ${opt.desc}`}
                                >
                                  <strong className="font-bold text-indigo-700">{opt.code}</strong>
                                  {opt.label !== opt.code && <span className="text-slate-500">({opt.label})</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}

                        {(enumGuideCategoryFilter === 'all' || enumGuideCategoryFilter === 'Rombel') && (
                          <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                              <span className="font-bold text-emerald-900 text-[11px]">Rombel / Kelas Aktif</span>
                              <span className="text-[9.5px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono">
                                TA {selectedYearName}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {classGroupsFilter.length > 0 ? (
                                classGroupsFilter.map((cg) => (
                                  <span
                                    key={cg.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-emerald-200 text-emerald-900 rounded text-[10px] font-bold shadow-2xs"
                                    title={`Rombel ${cg.name} (Tingkat ${cg.grade_level_name || 'Kelas'})`}
                                  >
                                    {cg.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Belum ada rombel terdaftar</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LANGKAH 2: UNGGAH FILE EXCEL */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                    2
                  </span>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Unggah File Excel (.xlsx / .xls)
                  </h4>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    importFile
                      ? 'border-teal-400 bg-teal-50/50'
                      : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="w-12 h-12 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center shadow-2xs">
                    {importFile ? <FileCheck className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>

                  {importFile ? (
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{importFile.name}</p>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">
                        Ukuran: {(importFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700 text-xs">
                        Klik di sini atau seret file spreadsheet Excel ke area ini
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* LANGKAH 3: PRATINJAU DATA & DETEKSI OTOMATIS */}
              {importRows.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                        3
                      </span>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Pratinjau Data Terbaca ({importPreviewStats.total} Baris)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                        🟢 Siswa Baru: {importPreviewStats.newCount}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200">
                        🔵 Update Data: {importPreviewStats.updateCount}
                      </span>
                      {importPreviewStats.exampleCount > 0 && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200" title="Baris contoh berlabel [CONTOH] diabaikan secara otomatis">
                          🟡 Contoh Diabaikan: {importPreviewStats.exampleCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-2.5">Tipe</th>
                          <th className="p-2.5">NIS</th>
                          <th className="p-2.5">Nama Siswa</th>
                          <th className="p-2.5">JK</th>
                          <th className="p-2.5">Tgl Lahir</th>
                          <th className="p-2.5">Rombel</th>
                          <th className="p-2.5">Nama Ayah / Ibu</th>
                          <th className="p-2.5">Alamat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importRows.map((r, i) => (
                          <tr
                            key={i}
                            className={
                              r.isExample
                                ? 'bg-amber-50/50 opacity-75'
                                : r.importType === 'update'
                                ? 'hover:bg-blue-50/30'
                                : 'hover:bg-emerald-50/30'
                            }
                          >
                            <td className="p-2.5 whitespace-nowrap">
                              {r.isExample ? (
                                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[9.5px]">
                                  Contoh (Skip)
                                </span>
                              ) : r.importType === 'update' ? (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[9.5px]">
                                  Update
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9.5px]">
                                  Baru
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-slate-700 font-semibold">{r.nis || '-'}</td>
                            <td className="p-2.5 font-bold text-slate-800 max-w-[160px] truncate">{r.full_name}</td>
                            <td className="p-2.5">{r.gender === 'P' ? 'P' : 'L'}</td>
                            <td className="p-2.5 text-slate-600 whitespace-nowrap">{r.birth_date || '-'}</td>
                            <td className="p-2.5 text-slate-700 font-semibold">{r.class_group_name || '-'}</td>
                            <td className="p-2.5 text-slate-600 max-w-[140px] truncate">
                              {r.father_name || r.mother_name ? `${r.father_name || '-'}${r.mother_name ? ` / ${r.mother_name}` : ''}` : '-'}
                            </td>
                            <td className="p-2.5 text-slate-500 max-w-[150px] truncate" title={r.address}>
                              {r.address || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <div className="text-[11px] text-slate-500">
                {importRows.length > 0 && (
                  <span>
                    Siap diproses: <strong>{importRows.filter(r => !r.isExample && r.full_name).length}</strong> siswa
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition text-xs cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={importing || importRows.filter(r => !r.isExample && r.full_name).length === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-xs transition flex items-center gap-2 text-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Import...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>
                        Mulai Impor ({importRows.filter(r => !r.isExample && r.full_name).length} Siswa)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK KARTU SISWA PDF (MULTI-LAYOUT, UKURAN KTP, QR NIPD, TEMA WARNA, ESTIMASI KERTAS) */}
      {printCardModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full p-6 shadow-2xl border border-slate-200 my-6 animate-in fade-in zoom-in-95 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Cetak Kartu Tanda Siswa / ID Card (Format PDF)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unit: <strong className="text-slate-700">{activeSchoolUnit?.name || 'Sekolah'}</strong> • Tahun Ajaran: <strong className="text-indigo-700">{selectedYearName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPrintCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2 Kolom (Kiri: Pengaturan, Kanan: Live Preview) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 overflow-y-auto pr-1 text-xs custom-scrollbar grow">
              {/* KOLOM KIRI: PENGATURAN (7 Kolom) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Pemilihan Siswa & Filter Rombel */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                        1
                      </span>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Siswa yang Dicetak ({selectedStudentIdsForCard.size} Siswa)
                      </h4>
                    </div>

                    {/* Filter Rombel di Dalam Modal */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Rombel:</span>
                      <select
                        value={cardModalRombelFilter}
                        onChange={(e) => setCardModalRombelFilter(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">Semua Rombel ({displayStudents.length})</option>
                        {classGroupsFilter.map((cg) => {
                          const count = displayStudents.filter(s => s.class_group_name === cg.name).length;
                          return (
                            <option key={cg.id || cg.name} value={cg.name}>
                              {cg.name} ({count} Siswa)
                            </option>
                          );
                        })}
                        <option value="belum_rombel">Belum Masuk Rombel</option>
                      </select>
                    </div>
                  </div>

                  {/* List Siswa dengan Checkbox */}
                  {(() => {
                    const filteredListForCard = displayStudents.filter((s) => {
                      if (cardModalRombelFilter === 'all') return true;
                      if (cardModalRombelFilter === 'belum_rombel') return !s.class_group_name;
                      return s.class_group_name === cardModalRombelFilter;
                    });

                    const allInFilteredSelected = filteredListForCard.length > 0 && filteredListForCard.every(s => selectedStudentIdsForCard.has(s.id));

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">
                            Menampilkan {filteredListForCard.length} siswa sesuai filter rombel
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllCardStudents(filteredListForCard)}
                            className="font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                          >
                            {allInFilteredSelected ? 'Batal Pilih Semua Rombel Ini' : 'Pilih Semua Rombel Ini'}
                          </button>
                        </div>

                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-2xs">
                          {filteredListForCard.map((s) => {
                            const isChecked = selectedStudentIdsForCard.has(s.id);
                            const isPreviewing = cardPreviewStudentId === s.id;

                            return (
                              <div
                                key={s.id}
                                onClick={() => handleToggleCardStudent(s.id)}
                                className={`p-2 flex items-center justify-between cursor-pointer transition ${
                                  isChecked ? 'bg-indigo-50/60 font-semibold' : 'hover:bg-slate-50'
                                } ${isPreviewing ? 'ring-1 ring-inset ring-indigo-400' : ''}`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                                  )}
                                  <span className="text-xs text-slate-800 truncate font-bold">{s.full_name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">NIS: {s.nis}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                                    {s.class_group_name || 'Belum Rombel'}
                                  </span>
                                  {isPreviewing && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold uppercase">
                                      Preview
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Ukuran Kartu Siswa (Default KTP / Standar ID Card) */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Ukuran Kartu Siswa (Default Ukuran KTP)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                        Format Dimensi Kartu:
                      </label>
                      <select
                        value={cardPrintConfig.card_size}
                        onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, card_size: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {CARD_PRINT_SIZES.map((cs) => (
                          <option key={cs.value} value={cs.value}>
                            {cs.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10.5px] text-slate-400 mt-1">
                        {CARD_PRINT_SIZES.find(cs => cs.value === cardPrintConfig.card_size)?.desc}
                      </p>
                    </div>

                    {cardPrintConfig.card_size === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                            Lebar (mm):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="40"
                            max="200"
                            value={cardPrintConfig.custom_card_width_mm}
                            onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, custom_card_width_mm: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                            Tinggi (mm):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="25"
                            max="150"
                            value={cardPrintConfig.custom_card_height_mm}
                            onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, custom_card_height_mm: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Pengaturan Kertas PDF & Margin */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                      3
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Ukuran Kertas PDF & Margin
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                        Ukuran Kertas:
                      </label>
                      <select
                        value={cardPrintConfig.paper_size}
                        onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, paper_size: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {CARD_PRINT_PAPERS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                        Orientasi Kertas:
                      </label>
                      <select
                        value={cardPrintConfig.paper_orientation}
                        onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, paper_orientation: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="portrait">Portrait (Tegak)</option>
                        <option value="landscape">Landscape (Mendatar)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                        Margin Tepi (mm):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={cardPrintConfig.margin_mm}
                        onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, margin_mm: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                        Jarak Antar Kartu (mm):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={cardPrintConfig.gap_mm}
                        onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, gap_mm: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold"
                      />
                    </div>
                  </div>

                  {/* Toggle Garis Potong Gunting */}
                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cardPrintConfig.show_cutting_lines}
                      onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, show_cutting_lines: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="font-semibold text-slate-700 text-[11.5px] flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tampilkan Garis Batas Potong Putus-Putus (✂️ Cutting Guides)</span>
                    </span>
                  </label>
                </div>

                {/* 4. Pilihan Desain & Tema Warna */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                      4
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Pilihan Desain & Tema Warna
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CARD_PRINT_THEMES.map((theme) => {
                      const isSelected = cardPrintConfig.theme === theme.value;
                      return (
                        <div
                          key={theme.value}
                          onClick={() => setCardPrintConfig({ ...cardPrintConfig, theme: theme.value })}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white shadow-sm scale-[1.01]'
                              : 'bg-white hover:bg-slate-100/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800">{theme.label.split(' ')[0]}</span>
                            <div
                              className="w-4 h-4 rounded-full border border-white shadow-xs"
                              style={{ backgroundColor: theme.primaryColor }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{theme.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Informasi yang Ditampilkan pada Kartu */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                      5
                    </span>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Informasi yang Ditampilkan pada Kartu
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { key: 'show_nis', label: 'Nomor Induk Siswa (NIS)' },
                      { key: 'show_nipd', label: 'NIPD (ID Transaksi Kantin)' },
                      { key: 'show_nisn', label: 'Nomor NISN Nasional' },
                      { key: 'show_class', label: 'Rombel / Kelas Siswa' },
                      { key: 'show_birth_info', label: 'Tempat & Tanggal Lahir' },
                      { key: 'show_gender', label: 'Jenis Kelamin' },
                      { key: 'show_academic_year', label: 'Tahun Ajaran Aktif' },
                      { key: 'show_address', label: 'Alamat Siswa' },
                      { key: 'show_qr', label: 'QR Code NIPD (Presisi)' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none bg-white p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition">
                        <input
                          type="checkbox"
                          checked={cardPrintConfig[item.key]}
                          onChange={(e) => setCardPrintConfig({ ...cardPrintConfig, [item.key]: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: LIVE INTERACTIVE PREVIEW & ESTIMASI LEMBAR PDF (5 Kolom) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-0 space-y-4">
                  {/* Card Live Preview Box */}
                  <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-md text-white space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">Live Pratinjau Desain Kartu</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {cardPrintConfig.card_size === 'custom'
                          ? `${cardPrintConfig.custom_card_width_mm} × ${cardPrintConfig.custom_card_height_mm} mm`
                          : CARD_PRINT_SIZES.find(cs => cs.value === cardPrintConfig.card_size)?.label.split('(')[1]?.replace(')', '') || '85.6 × 54 mm'}
                      </span>
                    </div>

                    {/* Selector Contoh Siswa */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] text-slate-400">Contoh Siswa:</span>
                      <select
                        value={cardPreviewStudentId || ''}
                        onChange={(e) => setCardPreviewStudentId(Number(e.target.value))}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none w-full truncate"
                      >
                        {displayStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} ({s.nis || s.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Visual Card Mockup Landscape */}
                    {(() => {
                      const prevStudent = displayStudents.find(s => s.id === cardPreviewStudentId) || displayStudents[0] || {};
                      const selectedThemeObj = CARD_PRINT_THEMES.find(t => t.value === cardPrintConfig.theme) || CARD_PRINT_THEMES[0];
                      const isFemale = String(prevStudent.gender || 'L').toUpperCase().startsWith('P');

                      return (
                        <div
                          className="w-full bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200 text-slate-900 select-none transition-all duration-200"
                          style={{ aspectRatio: '1.58 / 1' }}
                        >
                          {/* Header Mockup */}
                          <div
                            className="p-2 text-white flex items-center gap-2 relative"
                            style={{ backgroundColor: selectedThemeObj.primaryColor }}
                          >
                            <div className="w-5 h-5 rounded bg-white/20 border border-white/30 flex items-center justify-center text-[9px] font-black text-white shrink-0">
                              A
                            </div>
                            <div className="overflow-hidden leading-tight">
                              <p className="text-[9px] font-black tracking-wide truncate">
                                {(foundationProfile?.name || 'YAYASAN ALDEPOS SALAM').toUpperCase()}
                              </p>
                              <p className="text-[8px] font-semibold text-emerald-200 truncate">{activeSchoolUnit?.name || 'SMP IT ALDEPOS'}</p>
                            </div>
                            <span className="text-[7.5px] font-bold text-amber-300 absolute right-2 top-2 uppercase">
                              {cardPrintConfig.card_title}
                            </span>
                          </div>
                          <div className="h-0.5 w-full" style={{ backgroundColor: selectedThemeObj.goldColor }} />

                          {/* Body Mockup */}
                          <div className="p-2.5 flex items-center justify-between gap-2 h-[calc(100%-38px)]">
                            {/* Avatar Frame */}
                            <div
                              className="w-14 h-18 rounded-lg border flex flex-col items-center justify-center p-1 shrink-0 text-center"
                              style={{
                                backgroundColor: selectedThemeObj.badgeColor.includes('emerald') ? '#ecfdf5' : '#f8fafc',
                                borderColor: selectedThemeObj.accentColor
                              }}
                            >
                              <Users className="w-5 h-5 mb-0.5" style={{ color: selectedThemeObj.accentColor }} />
                              <span className="text-[7.5px] font-bold uppercase" style={{ color: selectedThemeObj.accentColor }}>
                                {isFemale ? 'Akhwat' : 'Ikhwan'}
                              </span>
                            </div>

                            {/* Detail Identitas */}
                            <div className="space-y-0.5 overflow-hidden grow leading-tight text-[8px]">
                              <p className="text-[10px] font-black truncate" style={{ color: selectedThemeObj.primaryColor }}>
                                {(prevStudent.full_name || 'NAMA SISWA').toUpperCase()}
                              </p>
                              <div className="w-full h-px bg-amber-400/60 my-0.5" />
                              {cardPrintConfig.show_nis && (
                                <p className="text-slate-600 font-mono">
                                  <strong>NIS:</strong> {prevStudent.nis || '-'}
                                </p>
                              )}
                              {cardPrintConfig.show_nipd && (
                                <p className="text-slate-600 font-mono">
                                  <strong>NIPD:</strong> {prevStudent.nipd || prevStudent.nis || '-'}
                                </p>
                              )}
                              {cardPrintConfig.show_nisn && prevStudent.nisn && (
                                <p className="text-slate-600 font-mono">
                                  <strong>NISN:</strong> {prevStudent.nisn}
                                </p>
                              )}
                              {cardPrintConfig.show_class && (
                                <p className="text-slate-700">
                                  <strong>Kelas:</strong> {prevStudent.class_group_name || '-'}
                                </p>
                              )}
                              {cardPrintConfig.show_birth_info && (
                                <p className="text-slate-600 truncate">
                                  <strong>TTL:</strong> {prevStudent.birth_place ? `${prevStudent.birth_place}, ` : ''}{prevStudent.birth_date ? String(prevStudent.birth_date).slice(0, 10) : '-'}
                                </p>
                              )}
                              {cardPrintConfig.show_academic_year && (
                                <p className="text-slate-600">
                                  <strong>TA:</strong> {selectedYearName}
                                </p>
                              )}
                            </div>

                            {/* QR Code Mockup NIPD */}
                            {cardPrintConfig.show_qr && (
                              <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded-lg shrink-0 shadow-2xs">
                                <QrCode className="w-10 h-10 text-slate-900" />
                                <span className="text-[6.5px] font-bold font-mono text-slate-700 mt-0.5">
                                  {prevStudent.nipd || prevStudent.nis || 'SCAN NIPD'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Estimasi Jumlah Lembar Kertas PDF */}
                  <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                      <Layout className="w-4 h-4 text-indigo-600" />
                      <span>Estimasi Lembar Cetak PDF</span>
                    </div>

                    {(() => {
                      const totalSelected = selectedStudentIdsForCard.size;
                      const paperW = cardPrintConfig.paper_orientation === 'landscape' ? 297 : 210;
                      const paperH = cardPrintConfig.paper_orientation === 'landscape' ? 210 : 297;
                      const cardW = cardPrintConfig.card_size === 'custom' ? cardPrintConfig.custom_card_width_mm : (CARD_PRINT_SIZES.find(c => c.value === cardPrintConfig.card_size)?.width_mm || 85.6);
                      const cardH = cardPrintConfig.card_size === 'custom' ? cardPrintConfig.custom_card_height_mm : (CARD_PRINT_SIZES.find(c => c.value === cardPrintConfig.card_size)?.height_mm || 54.0);
                      const margin = cardPrintConfig.margin_mm || 8;
                      const gap = cardPrintConfig.gap_mm || 3;

                      const availW = paperW - (margin * 2);
                      const availH = paperH - (margin * 2);
                      const cols = Math.max(1, Math.floor((availW + gap) / (cardW + gap)));
                      const rows = Math.max(1, Math.floor((availH + gap) / (cardH + gap)));
                      const cardsPerPage = cols * rows;
                      const totalPages = Math.ceil(Math.max(1, totalSelected) / cardsPerPage);

                      return (
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-indigo-900">
                          <div className="bg-white p-2 rounded-xl border border-indigo-100">
                            <span className="text-slate-500 block text-[9.5px]">Kapasitas / Lembar</span>
                            <span className="font-bold text-indigo-950 text-xs">
                              {cardsPerPage} Kartu ({cols} × {rows} grid)
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-indigo-100">
                            <span className="text-slate-500 block text-[9.5px]">Total Lembar PDF</span>
                            <span className="font-bold text-indigo-950 text-xs">
                              ~{totalSelected > 0 ? totalPages : 0} Lembar Kertas
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 shrink-0">
              <div className="text-[11px] text-slate-500">
                Total kartu siap dicetak:{' '}
                <strong className="text-indigo-700 font-bold">{selectedStudentIdsForCard.size}</strong> siswa
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPrintCardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition text-xs cursor-pointer grow sm:grow-0"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={generatingCardPdf || selectedStudentIdsForCard.size === 0}
                  onClick={() => handleExecuteCardPrintPdf('download')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-xs transition flex items-center justify-center gap-2 text-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed grow sm:grow-0"
                  title="Simpan file PDF ke komputer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>
                <button
                  type="button"
                  disabled={generatingCardPdf || selectedStudentIdsForCard.size === 0}
                  onClick={() => handleExecuteCardPrintPdf('open')}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-xs transition flex items-center justify-center gap-2 text-xs active:scale-95 cursor-pointer disabled:cursor-not-allowed grow sm:grow-0"
                  title="Buka PDF di tab baru dan langsung cetak"
                >
                  {generatingCardPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Membuat Dokumen PDF...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Buka & Cetak PDF ({selectedStudentIdsForCard.size} Kartu)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
