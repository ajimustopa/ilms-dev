import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../../shared/services/api';
import DatePickerField from '../../../shared/components/DatePickerField';
import {
  ArrowLeft,
  Printer,
  Edit3,
  User,
  Users,
  Home,
  Heart,
  Activity,
  FileText,
  FileCheck2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building2,
  GraduationCap,
  Layers,
  Award,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  History,
  Sparkles,
  Clock,
  RotateCw,
  Loader2,
  School,
  Save,
  X,
  UserCheck,
  HeartHandshake,
  Paperclip,
  BookmarkCheck,
  Check,
  Compass,
  FileSpreadsheet,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2
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

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateStr);
  }
}

export default function DetailSiswa() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [periodicRecords, setPeriodicRecords] = useState([]);
  const [classHistory, setClassHistory] = useState([]);
  const [reportCardHistory, setReportCardHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mode Edit vs Mode Lembar Kertas Biodata (Default Lembar Kertas)
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cohorts, setCohorts] = useState([]);

  // Active Section Navigation Tab
  const [activeSection, setActiveSection] = useState('all');

  // Preview Document Modal
  const [previewFile, setPreviewFile] = useState(null);

  // Form State for Edit Mode
  const [formData, setFormData] = useState({
    cohort_id: '',
    cohort_name: '',
    nis: '',
    nisn: '',
    nipd: '',
    family_card_number: '',
    nik: '',
    full_name: '',
    nickname: '',
    gender: 'L',
    birth_place: '',
    birth_date: '',
    birth_certificate_reg_no: '',
    order_in_family: '',
    number_of_siblings: '',
    number_of_step_siblings: '',
    number_of_adoptive_siblings: '',
    religion: 'islam',
    citizenship: 'WNI',
    special_needs: '',
    primary_language: '',
    hobby: '',
    ambition: '',
    status: 'aktif',
    dapodik_status: 'belum_masuk_dapodik',
    dapodik_notes: '',
    enrolled_at: '',
    photo_url: '',

    student_address: {
      street_address: '',
      rt: '',
      rw: '',
      hamlet: '',
      village: '',
      district: '',
      postal_code: '',
      email: ''
    },

    physical_data: {
      height_cm: '',
      weight_kg: '',
      head_circumference_cm: '',
      blood_type: 'tidak_tahu',
      severe_disease: '',
      dietary_restrictions: '',
      health_notes: '',
      medical_history: ''
    },

    admission: {
      initial_grade_level_id: '',
      initial_class_group_id: '',
      registration_type: 'siswa_baru',
      admission_date: '',
      previous_school_name: '',
      previous_school_address: ''
    },

    document_checklist: {
      form_submitted: false,
      form_verified: false,
      form_file_url: '',
      birth_cert_submitted: false,
      birth_cert_verified: false,
      birth_cert_file_url: '',
      family_card_submitted: false,
      family_card_verified: false,
      family_card_file_url: '',
      father_ktp_submitted: false,
      father_ktp_verified: false,
      father_ktp_file_url: '',
      mother_ktp_submitted: false,
      mother_ktp_verified: false,
      mother_ktp_file_url: '',
      other_docs_submitted: false,
      other_docs_verified: false,
      other_docs_file_url: '',
      photo_2x3_submitted: false,
      photo_2x3_verified: false,
      photo_2x3_file_url: '',
      photo_3x4_submitted: false,
      photo_3x4_verified: false,
      photo_3x4_file_url: '',
      ijazah_submitted: false,
      ijazah_verified: false,
      ijazah_file_url: '',
      notes: ''
    }
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

  useEffect(() => {
    fetchStudentDetail();
  }, [id]);

  const fetchStudentDetail = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [res, cRes, hRes, rcRes] = await Promise.all([
        api.get(`/akademik/students/${id}`),
        api.get('/akademik/cohorts').catch(() => ({ data: { data: [] } })),
        api.get(`/akademik/students/${id}/class-history`).catch(() => ({ data: { data: [] } })),
        api.get(`/akademik/students/${id}/report-card-history`).catch(() => ({ data: { data: { report_cards: [] } } }))
      ]);

      setCohorts(cRes.data?.data || []);
      setClassHistory(hRes.data?.data || []);
      setReportCardHistory(rcRes.data?.data?.report_cards || rcRes.data?.report_cards || []);

      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        setStudent(d);
        setGuardians(d.guardians || []);
        setPeriodicRecords(d.periodic_physical_records || []);

        setFormData({
          cohort_id: d.cohort_id || '',
          cohort_name: d.cohort_name || '',
          nis: d.nis || '',
          nisn: d.nisn || '',
          nipd: d.nipd || '',
          family_card_number: d.family_card_number || '',
          nik: d.nik || '',
          full_name: d.full_name || '',
          nickname: d.nickname || '',
          gender: d.gender || 'L',
          birth_place: d.birth_place || '',
          birth_date: d.birth_date ? d.birth_date.split('T')[0] : '',
          birth_certificate_reg_no: d.birth_certificate_reg_no || '',
          order_in_family: d.order_in_family || '',
          number_of_siblings: d.number_of_siblings || '',
          number_of_step_siblings: d.number_of_step_siblings || '',
          number_of_adoptive_siblings: d.number_of_adoptive_siblings || '',
          religion: d.religion || 'islam',
          citizenship: d.citizenship || 'WNI',
          special_needs: d.special_needs || '',
          primary_language: d.primary_language || '',
          hobby: d.hobby || '',
          ambition: d.ambition || '',
          status: d.status || 'aktif',
          dapodik_status: d.dapodik_status || 'belum_masuk_dapodik',
          dapodik_notes: d.dapodik_notes || '',
          enrolled_at: d.enrolled_at ? d.enrolled_at.split('T')[0] : '',
          photo_url: d.photo_url || d.document_checklist?.photo_3x4_file_url || '',

          student_address: {
            street_address: d.student_address?.street_address || '',
            rt: d.student_address?.rt || '',
            rw: d.student_address?.rw || '',
            hamlet: d.student_address?.hamlet || '',
            village: d.student_address?.village || '',
            district: d.student_address?.district || '',
            postal_code: d.student_address?.postal_code || '',
            email: d.student_address?.email || ''
          },

          physical_data: {
            height_cm: d.physical_data?.height_cm || '',
            weight_kg: d.physical_data?.weight_kg || '',
            head_circumference_cm: d.physical_data?.head_circumference_cm || '',
            blood_type: d.physical_data?.blood_type || 'tidak_tahu',
            severe_disease: d.physical_data?.severe_disease || '',
            dietary_restrictions: d.physical_data?.dietary_restrictions || '',
            health_notes: d.physical_data?.health_notes || '',
            medical_history: d.physical_data?.medical_history || ''
          },

          admission: {
            initial_grade_level_id: d.admission?.initial_grade_level_id || '',
            initial_class_group_id: d.admission?.initial_class_group_id || '',
            registration_type: d.admission?.registration_type || 'siswa_baru',
            admission_date: d.admission?.admission_date ? d.admission.admission_date.split('T')[0] : '',
            previous_school_name: d.admission?.previous_school_name || '',
            previous_school_address: d.admission?.previous_school_address || ''
          },

          document_checklist: {
            form_submitted: !!d.document_checklist?.form_submitted,
            form_verified: !!d.document_checklist?.form_verified,
            form_file_url: d.document_checklist?.form_file_url || '',
            birth_cert_submitted: !!d.document_checklist?.birth_cert_submitted,
            birth_cert_verified: !!d.document_checklist?.birth_cert_verified,
            birth_cert_file_url: d.document_checklist?.birth_cert_file_url || '',
            family_card_submitted: !!d.document_checklist?.family_card_submitted,
            family_card_verified: !!d.document_checklist?.family_card_verified,
            family_card_file_url: d.document_checklist?.family_card_file_url || '',
            father_ktp_submitted: !!d.document_checklist?.father_ktp_submitted,
            father_ktp_verified: !!d.document_checklist?.father_ktp_verified,
            father_ktp_file_url: d.document_checklist?.father_ktp_file_url || '',
            mother_ktp_submitted: !!d.document_checklist?.mother_ktp_submitted,
            mother_ktp_verified: !!d.document_checklist?.mother_ktp_verified,
            mother_ktp_file_url: d.document_checklist?.mother_ktp_file_url || '',
            other_docs_submitted: !!d.document_checklist?.other_docs_submitted,
            other_docs_verified: !!d.document_checklist?.other_docs_verified,
            other_docs_file_url: d.document_checklist?.other_docs_file_url || '',
            photo_2x3_submitted: !!d.document_checklist?.photo_2x3_submitted,
            photo_2x3_verified: !!d.document_checklist?.photo_2x3_verified,
            photo_2x3_file_url: d.document_checklist?.photo_2x3_file_url || '',
            photo_3x4_submitted: !!d.document_checklist?.photo_3x4_submitted,
            photo_3x4_verified: !!d.document_checklist?.photo_3x4_verified,
            photo_3x4_file_url: d.document_checklist?.photo_3x4_file_url || '',
            ijazah_submitted: !!d.document_checklist?.ijazah_submitted,
            ijazah_verified: !!d.document_checklist?.ijazah_verified,
            ijazah_file_url: d.document_checklist?.ijazah_file_url || '',
            notes: d.document_checklist?.notes || ''
          }
        });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data detail siswa');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        ...formData,
        order_in_family: formData.order_in_family ? Number(formData.order_in_family) : null,
        number_of_siblings: formData.number_of_siblings ? Number(formData.number_of_siblings) : null,
        number_of_step_siblings: formData.number_of_step_siblings ? Number(formData.number_of_step_siblings) : null,
        number_of_adoptive_siblings: formData.number_of_adoptive_siblings ? Number(formData.number_of_adoptive_siblings) : null,
        physical_data: {
          ...formData.physical_data,
          height_cm: formData.physical_data.height_cm ? Number(formData.physical_data.height_cm) : null,
          weight_kg: formData.physical_data.weight_kg ? Number(formData.physical_data.weight_kg) : null,
          head_circumference_cm: formData.physical_data.head_circumference_cm ? Number(formData.physical_data.head_circumference_cm) : null
        }
      };

      await api.put(`/akademik/students/${id}`, payload);
      setSuccessMsg('Perubahan data siswa berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3500);
      setIsEditMode(false);
      fetchStudentDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-semibold">Memuat Lembar Biodata Siswa...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Data Siswa Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">{errorMsg || 'Data siswa yang Anda minta tidak tersedia atau telah dihapus.'}</p>
        <Link
          to="/akademik/students"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Siswa</span>
        </Link>
      </div>
    );
  }

  const age = calculateAge(student.birth_date);
  const father = guardians.find((g) => g.relationship === 'ayah');
  const mother = guardians.find((g) => g.relationship === 'ibu');
  const otherGuardians = guardians.filter((g) => g.relationship !== 'ayah' && g.relationship !== 'ibu');

  // Documents list for rendering
  const docItems = [
    { key: 'form', name: 'Formulir Pendaftaran', submitted: formData.document_checklist.form_submitted, verified: formData.document_checklist.form_verified, url: formData.document_checklist.form_file_url },
    { key: 'birth_cert', name: 'Akta Kelahiran', submitted: formData.document_checklist.birth_cert_submitted, verified: formData.document_checklist.birth_cert_verified, url: formData.document_checklist.birth_cert_file_url },
    { key: 'family_card', name: 'Kartu Keluarga (KK)', submitted: formData.document_checklist.family_card_submitted, verified: formData.document_checklist.family_card_verified, url: formData.document_checklist.family_card_file_url },
    { key: 'father_ktp', name: 'KTP Ayah Kandung', submitted: formData.document_checklist.father_ktp_submitted, verified: formData.document_checklist.father_ktp_verified, url: formData.document_checklist.father_ktp_file_url },
    { key: 'mother_ktp', name: 'KTP Ibu Kandung', submitted: formData.document_checklist.mother_ktp_submitted, verified: formData.document_checklist.mother_ktp_verified, url: formData.document_checklist.mother_ktp_file_url },
    { key: 'photo_3x4', name: 'Pas Foto Siswa (3x4)', submitted: formData.document_checklist.photo_3x4_submitted, verified: formData.document_checklist.photo_3x4_verified, url: formData.document_checklist.photo_3x4_file_url },
    { key: 'ijazah', name: 'Ijazah / SKL Asal', submitted: formData.document_checklist.ijazah_submitted, verified: formData.document_checklist.ijazah_verified, url: formData.document_checklist.ijazah_file_url },
    { key: 'other_docs', name: 'Dokumen / Piagam Lainnya', submitted: formData.document_checklist.other_docs_submitted, verified: formData.document_checklist.other_docs_verified, url: formData.document_checklist.other_docs_file_url },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Action Bar (Non-printable Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/akademik/students"
            className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl shadow-2xs transition flex items-center gap-1.5 font-bold text-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Kembali ke Data Siswa</span>
          </Link>
          <div className="h-5 w-[1px] bg-slate-300 hidden sm:block"></div>
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Profil Resmi Siswa
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95"
            title="Cetak Lembar Biodata Resmi"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Biodata</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 ${
              isEditMode
                ? 'bg-slate-800 text-white hover:bg-slate-900 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
            }`}
          >
            {isEditMode ? (
              <>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Lihat Format Kertas</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Edit Data Siswa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {/* Quick Jump Section Bar (Only in Paper View) */}
      {!isEditMode && (
        <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto custom-scrollbar print:hidden">
          {[
            { key: 'all', label: 'Semua Bagian', icon: Layers },
            { key: 'identitas', label: '1. Identitas Pribadi', icon: UserCheck },
            { key: 'alamat', label: '2. Alamat & Kontak', icon: Home },
            { key: 'kelembagaan', label: '3. Kelembagaan & Masuk', icon: School },
            { key: 'fisik', label: '4. Fisik & Kesehatan', icon: Heart },
            { key: 'keluarga', label: '5. Orang Tua & Wali', icon: Users },
            { key: 'dokumen', label: '6. Berkas & Dokumen', icon: FileCheck2 },
            { key: 'riwayat', label: '7. Riwayat Rombel & Rapor', icon: History }
          ].map((sec) => {
            const Icon = sec.icon;
            const isAct = activeSection === sec.key;
            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveSection(sec.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  isAct
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📄 LEMBAR BIODATA KERTAS RESMI (PAPER VIEW MODE - TANPA INPUTAN TOMBOL)   */}
      {/* ========================================================================= */}
      {!isEditMode ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden relative print:shadow-none print:border-none print:m-0 print:p-0">
          {/* Header Kop Dokumen / Hero Siswa */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 relative overflow-hidden">
            {/* Background Aesthetic Watermark */}
            <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 -mb-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Avatar / Foto Siswa */}
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-white/20 text-white flex flex-col items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shrink-0 overflow-hidden relative">
                  {(formData.photo_url || student.photo_url || formData.document_checklist?.photo_3x4_file_url) ? (
                    <img
                      src={formData.photo_url || student.photo_url || formData.document_checklist?.photo_3x4_file_url}
                      alt={student.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{student.full_name?.charAt(0) || 'S'}</span>
                  )}
                  <span className="absolute bottom-1 px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-bold uppercase tracking-wider text-white">
                    {student.gender === 'L' ? 'Ikhwan' : 'Akhwat'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    <span>Lembar Biodata Induk Santri / Siswa</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {student.full_name}
                  </h1>
                  <p className="text-xs text-slate-300 font-medium">
                    Nama Panggilan: <strong className="text-white font-bold">{student.nickname || '-'}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[11px] font-mono font-bold border border-white/10">
                      NIS: {student.nis || '-'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-200 text-[11px] font-mono font-bold border border-white/10">
                      NISN: {student.nisn || '-'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      student.status === 'aktif' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rombel & Dapodik Info Widget */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl space-y-2.5 shrink-0 self-start md:self-auto min-w-[220px]">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-300">Rombel Aktif</span>
                  <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/30">
                    {student.class_group_name || 'Belum di-plot'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-300">Angkatan</span>
                  <span className="font-bold text-white">{student.cohort_name || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-300">Status Dapodik</span>
                  <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                    student.dapodik_status === 'sudah_masuk_dapodik'
                      ? 'bg-indigo-400/30 text-indigo-200 border border-indigo-300/40'
                      : 'bg-amber-400/30 text-amber-200 border border-amber-300/40'
                  }`}>
                    {student.dapodik_status?.replace(/_/g, ' ') || 'Belum Masuk'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Isi Dokumen (Segmentasi Kertas Rapi & Berwarna) */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* ========================================================================= */}
            {/* 1. SEGMEN IDENTITAS DIRI & BIODATA PRIBADI (EMERALD THEME)                */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'identitas') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-emerald-500/30">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-emerald-950">
                      1. Identitas Diri & Biodata Pribadi
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Data kependudukan, akta kelahiran, dan profil pribadi siswa
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nama Lengkap Sesuai Ijazah/Akta</span>
                    <span className="text-xs font-black text-slate-800">{student.full_name || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nama Panggilan</span>
                    <span className="text-xs font-bold text-slate-800">{student.nickname || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Jenis Kelamin</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      student.gender === 'L' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {student.gender === 'L' ? 'Laki-Laki (Ikhwan)' : 'Perempuan (Akhwat)'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nomor Induk Siswa (NIS)</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{student.nis || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">NISN (Nasional)</span>
                    <span className="text-xs font-mono font-bold text-emerald-800">{student.nisn || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">NIPD</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{student.nipd || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">NIK (No. KTP/KIA)</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{student.nik || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nomor Kartu Keluarga (KK)</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{student.family_card_number || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">No. Registrasi Akta Lahir</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{student.birth_certificate_reg_no || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Tempat & Tanggal Lahir</span>
                    <span className="text-xs font-bold text-slate-800">
                      {student.birth_place || '-'}, {formatDateIndo(student.birth_date)} {age ? `(${age} tahun)` : ''}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Agama</span>
                    <span className="text-xs font-bold text-slate-800 capitalize">{student.religion || 'Islam'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Kewarganegaraan</span>
                    <span className="text-xs font-bold text-slate-800">{student.citizenship || 'WNI'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Posisi dalam Keluarga</span>
                    <span className="text-xs font-bold text-slate-800">
                      Anak ke-{student.order_in_family || '1'} dari {student.number_of_siblings || '1'} bersaudara
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Bahasa Sehari-hari</span>
                    <span className="text-xs font-bold text-slate-800">{student.primary_language || 'Bahasa Indonesia'}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Hobi & Cita-cita</span>
                    <span className="text-xs font-bold text-slate-800">
                      {student.hobby || '-'} / {student.ambition || '-'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 2. SEGMEN ALAMAT TEMPAT TINGGAL & KONTAK (SKY THEME)                      */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'alamat') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-sky-500/30">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-sky-950">
                      2. Alamat Tempat Tinggal & Kontak
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Domisili santri/siswa dan koordinat alamat rumah
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Jalan / Alamat Lengkap</span>
                    <span className="text-xs font-bold text-slate-800">{student.student_address?.street_address || student.address || '-'}</span>
                  </div>
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">RT / RW</span>
                    <span className="text-xs font-bold text-slate-800">{student.student_address?.rt || '-'}/{student.student_address?.rw || '-'}</span>
                  </div>
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Dusun / Lingkungan</span>
                    <span className="text-xs font-bold text-slate-800">{student.student_address?.hamlet || '-'}</span>
                  </div>
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Desa / Kelurahan</span>
                    <span className="text-xs font-bold text-slate-800">{student.student_address?.village || '-'}</span>
                  </div>
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Kecamatan</span>
                    <span className="text-xs font-bold text-slate-800">{student.student_address?.district || '-'}</span>
                  </div>
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Kode Pos</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{student.student_address?.postal_code || '-'}</span>
                  </div>
                  <div className="p-3 bg-sky-50/40 rounded-xl border border-sky-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Email Kontak</span>
                    <span className="text-xs font-bold text-sky-800">{student.student_address?.email || '-'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 3. SEGMEN KELEMBAGAAN & RIWAYAT MASUK (INDIGO THEME)                      */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'kelembagaan') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-indigo-500/30">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-indigo-950">
                      3. Kelembagaan & Riwayat Pendaftaran
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Satuan pendidikan, status penerimaan, dan asal sekolah sebelumnya
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Satuan Pendidikan</span>
                    <span className="text-xs font-black text-indigo-950">{student.satuan_pendidikan_name || student.school_unit_name || 'Satuan Aldepos'}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Angkatan / Cohort</span>
                    <span className="text-xs font-bold text-slate-800">{student.cohort_name || '-'}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Jenis Pendaftaran</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      (student.admission?.registration_type || student.registration_type || '').toLowerCase().includes('pindah')
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {student.admission?.registration_type || student.registration_type || 'Siswa Baru'}
                    </span>
                  </div>
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Tanggal Diterima Masuk</span>
                    <span className="text-xs font-bold text-slate-800">{formatDateIndo(student.admission?.admission_date || student.enrolled_at)}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Asal Sekolah Sebelumnya</span>
                    <span className="text-xs font-bold text-slate-800">{student.admission?.previous_school_name || student.previous_school_name || 'Tidak Ada (Siswa Baru)'}</span>
                    {student.admission?.previous_school_address && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">{student.admission.previous_school_address}</span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 4. SEGMEN DATA FISIK & KESEHATAN (ROSE THEME)                             */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'fisik') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-rose-500/30">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-rose-950">
                      4. Data Fisik & Riwayat Kesehatan
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Pengukuran antropometri tubuh, golongan darah, dan catatan medis
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tinggi Badan</span>
                    <span className="text-lg font-black text-rose-950">{student.physical_data?.height_cm || '-'}</span>
                    <span className="text-[10px] text-slate-400 ml-1">cm</span>
                  </div>
                  <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Berat Badan</span>
                    <span className="text-lg font-black text-rose-950">{student.physical_data?.weight_kg || '-'}</span>
                    <span className="text-[10px] text-slate-400 ml-1">kg</span>
                  </div>
                  <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lingkar Kepala</span>
                    <span className="text-lg font-black text-rose-950">{student.physical_data?.head_circumference_cm || '-'}</span>
                    <span className="text-[10px] text-slate-400 ml-1">cm</span>
                  </div>
                  <div className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Golongan Darah</span>
                    <span className="text-lg font-black text-rose-950 uppercase">{student.physical_data?.blood_type || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-rose-50/30 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Riwayat Penyakit Berat</span>
                    <span className="text-xs font-bold text-slate-800">{student.physical_data?.severe_disease || 'Tidak Ada Riwayat Berat'}</span>
                  </div>
                  <div className="p-3 bg-rose-50/30 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Alergi / Pantangan Makanan</span>
                    <span className="text-xs font-bold text-slate-800">{student.physical_data?.dietary_restrictions || 'Tidak Ada Pantangan'}</span>
                  </div>
                </div>

                {/* Tabel Riwayat Pengukuran Periodik jika ada */}
                {periodicRecords.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                      Log Pengukuran Fisik Periodik
                    </span>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Tanggal Catat</th>
                            <th className="py-2.5 px-3">Periode</th>
                            <th className="py-2.5 px-3 text-center">Tinggi</th>
                            <th className="py-2.5 px-3 text-center">Berat</th>
                            <th className="py-2.5 px-3 text-center">Lingkar Kepala</th>
                            <th className="py-2.5 px-3">Petugas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {periodicRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono">{formatDateIndo(rec.record_date)}</td>
                              <td className="py-2 px-3 font-bold text-slate-700">{rec.period_label || '-'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">{rec.height_cm ? `${rec.height_cm} cm` : '-'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">{rec.weight_kg ? `${rec.weight_kg} kg` : '-'}</td>
                              <td className="py-2 px-3 text-center font-bold text-slate-800">{rec.head_circumference_cm ? `${rec.head_circumference_cm} cm` : '-'}</td>
                              <td className="py-2 px-3 text-slate-500">{rec.recorded_by || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ========================================================================= */}
            {/* 5. SEGMEN ORANG TUA & WALI (AMBER THEME)                                  */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'keluarga') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-amber-500/30">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-amber-950">
                      5. Data Orang Tua & Wali
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Biodata ayah kandung, ibu kandung, serta wali siswa
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kartu Ayah Kandung */}
                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/90 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-700" />
                        Ayah Kandung
                      </span>
                      {father?.is_primary_contact && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                          Kontak Utama
                        </span>
                      )}
                    </div>
                    {father ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Nama Lengkap</span>
                          <span className="font-black text-slate-800 text-sm">{father.full_name || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">NIK</span>
                            <span className="font-mono font-bold text-slate-700">{father.nik || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pendidikan</span>
                            <span className="font-bold text-slate-700">{father.education_level || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pekerjaan</span>
                            <span className="font-bold text-slate-700">{father.occupation || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Penghasilan</span>
                            <span className="font-bold text-emerald-800">{father.income_range || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">No. Telp / WhatsApp</span>
                          <span className="font-mono font-bold text-slate-800">{father.phone || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 text-xs italic">
                        Belum ada data ayah kandung terdaftar.
                      </div>
                    )}
                  </div>

                  {/* Kartu Ibu Kandung */}
                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/90 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-700" />
                        Ibu Kandung
                      </span>
                      {mother?.is_primary_contact && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                          Kontak Utama
                        </span>
                      )}
                    </div>
                    {mother ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Nama Lengkap</span>
                          <span className="font-black text-slate-800 text-sm">{mother.full_name || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">NIK</span>
                            <span className="font-mono font-bold text-slate-700">{mother.nik || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pendidikan</span>
                            <span className="font-bold text-slate-700">{mother.education_level || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pekerjaan</span>
                            <span className="font-bold text-slate-700">{mother.occupation || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Penghasilan</span>
                            <span className="font-bold text-emerald-800">{mother.income_range || '-'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">No. Telp / WhatsApp</span>
                          <span className="font-mono font-bold text-slate-800">{mother.phone || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 text-xs italic">
                        Belum ada data ibu kandung terdaftar.
                      </div>
                    )}
                  </div>
                </div>

                {/* Wali Tambahan jika ada */}
                {otherGuardians.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <span className="text-xs font-black uppercase text-slate-700 block">Wali Lainnya</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {otherGuardians.map((g) => (
                        <div key={g.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{g.full_name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold capitalize">
                              {g.relationship}
                            </span>
                          </div>
                          <p className="text-slate-500 font-mono text-[11px]">{g.phone || '-'}</p>
                          <p className="text-slate-500 text-[11px]">{g.address || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ========================================================================= */}
            {/* 6. SEGMEN KELENGKAPAN BERKAS & SCAN DOKUMEN (TEAL THEME)                  */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'dokumen') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-teal-500/30">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-teal-950">
                      6. Kelengkapan Berkas & Dokumen Persyaratan
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Status penyerahan berkas fisik dan tautan berkas digital
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {docItems.map((doc) => (
                    <div
                      key={doc.key}
                      className={`p-3 rounded-2xl border transition flex flex-col justify-between ${
                        doc.verified
                          ? 'bg-emerald-50/60 border-emerald-200/90 text-emerald-950'
                          : doc.submitted
                          ? 'bg-sky-50/60 border-sky-200/90 text-sky-950'
                          : 'bg-slate-50/60 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate" title={doc.name}>
                            {doc.name}
                          </span>
                          {doc.verified ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : doc.submitted ? (
                            <Check className="w-4 h-4 text-sky-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                        </div>

                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            doc.verified
                              ? 'bg-emerald-200 text-emerald-900'
                              : doc.submitted
                              ? 'bg-sky-200 text-sky-900'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {doc.verified ? 'Terverifikasi' : doc.submitted ? 'Diserahkan' : 'Belum Ada'}
                          </span>
                        </div>
                      </div>

                      {doc.url && (
                        <div className="pt-2 mt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setPreviewFile({ url: doc.url, name: doc.name })}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Scan Berkas</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* 7. SEGMEN RIWAYAT KELAS & RAPOR (VIOLET THEME)                            */}
            {/* ========================================================================= */}
            {(activeSection === 'all' || activeSection === 'riwayat') && (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b-2 border-violet-500/30">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center font-bold">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-violet-950">
                      7. Riwayat Rombongan Belajar & Rekap Rapor
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Rekam jejak kelas dan histori akademik semesteran
                    </p>
                  </div>
                </div>

                {classHistory.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3.5">Tahun Ajaran</th>
                          <th className="py-2.5 px-3.5">Tingkat</th>
                          <th className="py-2.5 px-3.5">Nama Rombel</th>
                          <th className="py-2.5 px-3.5">Wali Kelas</th>
                          <th className="py-2.5 px-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classHistory.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3.5 font-bold text-slate-800">{item.academic_year_name || '-'}</td>
                            <td className="py-2.5 px-3.5 text-slate-600">{item.grade_level_name || '-'}</td>
                            <td className="py-2.5 px-3.5 font-bold text-emerald-800">{item.class_group_name || '-'}</td>
                            <td className="py-2.5 px-3.5 text-slate-600">{item.homeroom_teacher_name || '-'}</td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                {item.status || 'aktif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                    Belum ada catatan riwayat kelas lampau.
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Footer Dokumen Lembar Cetak */}
          <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">Sistem Informasi Akademik Yayasan Aldepos</p>
              <p className="text-[11px] text-slate-400">Dicetak secara otomatis dari database sistem terpadu.</p>
            </div>
            <div className="text-right">
              <p className="text-[11px]">Tanggal Cetak / Akses:</p>
              <p className="font-mono font-bold text-slate-700">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ✏️ FORM MODE EDIT DATA SISWA (HANYA KETIKA TOMBOL EDIT DIKLIK)           */
        /* ========================================================================= */
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">Edit Data Siswa: {student.full_name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Fields: Identitas Diri */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>1. Biodata Pribadi</span>
            </h3>

            {/* Pas Foto Siswa dengan Kompresi Otomatis */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Pas Foto Siswa (Otomatis Kompresi)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Format 3x4 / KTP • Max 600×800px
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative w-20 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center overflow-hidden shadow-2xs shrink-0 group">
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

                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                    id="detail-student-photo-upload"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="detail-student-photo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer transition active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formData.photo_url ? 'Ganti Pas Foto' : 'Pilih / Unggah Pas Foto'}</span>
                    </label>
                    {formData.photo_url && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  {photoStats ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Ukuran: <strong>{photoStats.compSize}</strong>
                        {photoStats.origSize !== '-' && ` (Asli: ${photoStats.origSize} • Hemat ${photoStats.savedPct})`}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Foto otomatis dikompresi ke format JPEG optimal sebelum disimpan untuk menjaga performa cepat dan cetak kartu tajam.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Panggilan</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="L">Laki-Laki (Ikhwan)</option>
                  <option value="P">Perempuan (Akhwat)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">NIS *</label>
                <input
                  type="text"
                  required
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">NISN</label>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">NIK</label>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.birth_place}
                  onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <DatePickerField
                  label="Tanggal Lahir"
                  value={formData.birth_date}
                  onChange={(val) => setFormData({ ...formData, birth_date: val })}
                  accentColor="emerald"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Status Siswa</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 capitalize"
                >
                  <option value="aktif">Aktif</option>
                  <option value="calon">Calon</option>
                  <option value="lulus">Lulus</option>
                  <option value="pindah">Pindah</option>
                  <option value="keluar">Keluar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Fields: Alamat */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span>2. Alamat & Kontak</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Alamat Lengkap / Jalan</label>
                <input
                  type="text"
                  value={formData.student_address?.street_address || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, street_address: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={formData.student_address?.district || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, district: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Data'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal Preview Berkas / Scan Dokumen */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Preview Berkas: {previewFile.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {previewFile.url.startsWith('data:image') || previewFile.url.includes('.jpg') || previewFile.url.includes('.png') || previewFile.url.includes('.jpeg') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-h-[60vh] object-contain rounded-lg shadow-sm" />
              ) : (
                <iframe src={previewFile.url} title={previewFile.name} className="w-full h-96 rounded-lg" />
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
