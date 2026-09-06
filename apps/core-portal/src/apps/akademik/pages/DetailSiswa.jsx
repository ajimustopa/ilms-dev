import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../shared/services/api';
import DatePickerField from '../../../shared/components/DatePickerField';
import {
  ArrowLeft,
  Save,
  User,
  Activity,
  Users,
  Building,
  FileCheck,
  LogOut,
  CheckCircle2,
  Plus,
  Trash2,
  Heart,
  Home,
  FileText,
  Loader2,
  AlertCircle,
  UploadCloud,
  Eye,
  Paperclip,
  ExternalLink,
  FileSpreadsheet,
  RotateCw,
  History,
  GraduationCap
} from 'lucide-react';

export default function DetailSiswa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pribadi');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cohorts List
  const [cohorts, setCohorts] = useState([]);

  // Main Form Data
  const [student, setStudent] = useState(null);
  const [formData, setFormData] = useState({
    // 1. Pribadi
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

    // Alamat
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

    // 2. Data Fisik
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

    // 3. Kelembagaan & Registrasi Masuk
    admission: {
      initial_grade_level_id: '',
      initial_class_group_id: '',
      registration_type: 'siswa_baru',
      admission_date: '',
      previous_school_name: '',
      previous_school_address: ''
    },

    // 4. Checklist Berkas & Upload Scan
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
      class_group_joined: false,
      class_group_joined_verified: false,
      teacher_socialized: false,
      teacher_socialized_verified: false,
      learning_started: false,
      learning_started_verified: false,
      data_completed: false,
      data_verified: false,
      notes: ''
    }
  });

  // Data Fisik Periodik List & Modal
  const [periodicRecords, setPeriodicRecords] = useState([]);
  const [showPeriodicModal, setShowPeriodicModal] = useState(false);
  const [newPeriodic, setNewPeriodic] = useState({
    record_date: new Date().toISOString().split('T')[0],
    period_label: '',
    height_cm: '',
    weight_kg: '',
    head_circumference_cm: '',
    notes: '',
    recorded_by: ''
  });

  // Orang Tua / Wali
  const [guardians, setGuardians] = useState([]);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [guardianForm, setGuardianForm] = useState({
    guardian_id: null,
    relationship: 'ayah',
    expense_bearer: 'ayah',
    is_primary_contact: false,
    validation_status: 'unverified',
    nik: '',
    full_name: '',
    birth_place: '',
    birth_date: '',
    education_level: '',
    occupation: '',
    income_range: '',
    special_needs: '',
    phone: '',
    email: '',
    address: ''
  });

  // Rekap Rapor DIK / DIN (6 slot: Kelas 7 sem 1-2, Kelas 8 sem 1-2, Kelas 9 sem 1-2)
  const [reportRecaps, setReportRecaps] = useState([]);

  // Mutasi / Kelulusan
  const [mutations, setMutations] = useState([]);
  const [showMutationModal, setShowMutationModal] = useState(false);
  const [mutationForm, setMutationForm] = useState({
    mutation_type: 'lulus',
    mutation_date: new Date().toISOString().split('T')[0],
    origin_or_destination_school: '',
    notes: '',
    exam_participant_number: '',
    diploma_certificate_number: '',
    skhun_number: '',
    next_school_name: '',
    transfer_reason: '',
    exit_letter_number: '',
    acceptance_letter_status: '',
    dapodik_mutation_letter_status: 'belum_diproses'
  });

  // Riwayat Rombel & Kenaikan (student_class_history)
  const [classHistory, setClassHistory] = useState([]);

  // Riwayat Rapor & Nilai Semester (report_card_history)
  const [reportCardHistory, setReportCardHistory] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);

  // File Preview Modal
  const [previewFile, setPreviewFile] = useState(null);

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
            class_group_joined: !!d.document_checklist?.class_group_joined,
            class_group_joined_verified: !!d.document_checklist?.class_group_joined_verified,
            teacher_socialized: !!d.document_checklist?.teacher_socialized,
            teacher_socialized_verified: !!d.document_checklist?.teacher_socialized_verified,
            learning_started: !!d.document_checklist?.learning_started,
            learning_started_verified: !!d.document_checklist?.learning_started_verified,
            data_completed: !!d.document_checklist?.data_completed,
            data_verified: !!d.document_checklist?.data_verified,
            notes: d.document_checklist?.notes || ''
          }
        });

        setPeriodicRecords(d.periodic_physical_records || []);
        setGuardians(d.guardians || []);
        setReportRecaps(d.report_card_recaps || []);
        setMutations(d.mutations || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data detail siswa');
    } finally {
      setLoading(false);
    }
  };

  // Helper File Upload Reader (Data URL Preview)
  const handleFileUpload = (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64 data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      callback(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Submit General Info
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
      setSuccessMsg('Data siswa dan berkas berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchStudentDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data siswa');
    } finally {
      setSaving(false);
    }
  };

  // Add Periodic Physical Record
  const handleSavePeriodic = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/akademik/students/${id}/periodic-physical`, newPeriodic);
      setShowPeriodicModal(false);
      setNewPeriodic({
        record_date: new Date().toISOString().split('T')[0],
        period_label: '',
        height_cm: '',
        weight_kg: '',
        head_circumference_cm: '',
        notes: '',
        recorded_by: ''
      });
      fetchStudentDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan data fisik periodik');
    }
  };

  const handleDeletePeriodic = async (recordId) => {
    if (confirm('Hapus catatan fisik periodik ini?')) {
      try {
        await api.delete(`/akademik/students/${id}/periodic-physical/${recordId}`);
        fetchStudentDetail();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus');
      }
    }
  };

  // Save Guardian
  const handleSaveGuardian = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/akademik/students/${id}/guardians`, guardianForm);
      setShowGuardianModal(false);
      fetchStudentDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan data orang tua/wali');
    }
  };

  const handleDeleteGuardian = async (guardianId) => {
    if (confirm('Hapus relasi orang tua/wali ini?')) {
      try {
        await api.delete(`/akademik/students/${id}/guardians/${guardianId}`);
        fetchStudentDetail();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal menghapus relasi wali');
      }
    }
  };

  // Save Report Card Recaps with Uploaded Scans
  const handleSaveReportRecaps = async () => {
    try {
      setSaving(true);
      await api.put(`/akademik/students/${id}/report-card-recaps`, { recaps: reportRecaps });
      setSuccessMsg('Kelengkapan rekap rapor dan berkas scan berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchStudentDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan rekap rapor');
    } finally {
      setSaving(false);
    }
  };

  // Save Mutation
  const handleSaveMutation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/akademik/student-mutations', {
        ...mutationForm,
        student_id: Number(id)
      });
      setShowMutationModal(false);
      fetchStudentDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan mutasi');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
        <p className="text-xs">Memuat data induk peserta didik...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'pribadi', label: '1. Identitas & Kontak Siswa', icon: User },
    { id: 'fisik', label: '2. Data Fisik & Periodik', icon: Activity },
    { id: 'ortu', label: '3. Data Orang Tua & Wali', icon: Users },
    { id: 'kelembagaan', label: '4. Registrasi & Upload Berkas', icon: Building },
    { id: 'rapor', label: '5. Rekap & Scan Rapor', icon: FileCheck },
    { id: 'kelulusan', label: '6. Kelulusan & Mutasi Keluar', icon: LogOut },
    { id: 'riwayat_rombel', label: '7. Riwayat Rombel & Kenaikan', icon: History },
    { id: 'riwayat_rapor', label: '8. Riwayat Rapor & Nilai Semester', icon: FileSpreadsheet }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/akademik/students')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
            title="Kembali ke Daftar Siswa"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-800">{student?.full_name || 'Detail Siswa'}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                NIS: {student?.nis}
              </span>
              {formData.dapodik_status === 'sudah_masuk_dapodik' && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Sudah Dapodik
                </span>
              )}
              {formData.dapodik_status === 'kendala' && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Kendala Dapodik
                </span>
              )}
              {formData.dapodik_status === 'belum_masuk_dapodik' && (
                <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Belum Dapodik
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              NISN: {student?.nisn || '-'} | NIK: {student?.nik || '-'} | KK: {student?.family_card_number || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchStudentDetail}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95"
            title="Segarkan Data dari Database"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Data</span>
          </button>

          <button
            onClick={handleSaveGeneral}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: IDENTITAS & KONTAK SISWA */}
      {activeTab === 'pribadi' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Data Pokok & Identitas Pribadi Siswa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Panggilan</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Angkatan Masuk Siswa</label>
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                >
                  <option value="">-- Pilih Angkatan --</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Tahun {c.year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. KK (Kartu Keluarga)</label>
                <input
                  type="text"
                  value={formData.family_card_number}
                  onChange={(e) => setFormData({ ...formData, family_card_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIK Siswa</label>
                <input
                  type="text"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIS *</label>
                <input
                  type="text"
                  required
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIPD</label>
                <input
                  type="text"
                  value={formData.nipd}
                  onChange={(e) => setFormData({ ...formData, nipd: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.birth_place}
                  onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                <DatePickerField
                  value={formData.birth_date || ''}
                  onChange={(isoVal) => setFormData({ ...formData, birth_date: isoVal })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. Registrasi Akta Lahir</label>
                <input
                  type="text"
                  value={formData.birth_certificate_reg_no}
                  onChange={(e) => setFormData({ ...formData, birth_certificate_reg_no: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Anak Ke-</label>
                <input
                  type="number"
                  value={formData.order_in_family}
                  onChange={(e) => setFormData({ ...formData, order_in_family: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jml Saudara Kandung</label>
                <input
                  type="number"
                  value={formData.number_of_siblings}
                  onChange={(e) => setFormData({ ...formData, number_of_siblings: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jml Saudara Tiri</label>
                <input
                  type="number"
                  value={formData.number_of_step_siblings}
                  onChange={(e) => setFormData({ ...formData, number_of_step_siblings: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jml Saudara Angkat</label>
                <input
                  type="number"
                  value={formData.number_of_adoptive_siblings}
                  onChange={(e) => setFormData({ ...formData, number_of_adoptive_siblings: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Agama</label>
                <select
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="islam">Islam</option>
                  <option value="kristen">Kristen</option>
                  <option value="katolik">Katolik</option>
                  <option value="hindu">Hindu</option>
                  <option value="buddha">Buddha</option>
                  <option value="konghucu">Konghucu</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kewarganegaraan</label>
                <input
                  type="text"
                  value={formData.citizenship}
                  onChange={(e) => setFormData({ ...formData, citizenship: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Berkebutuhan Khusus</label>
                <input
                  type="text"
                  placeholder="Tidak ada / Jenis kebutuhan"
                  value={formData.special_needs}
                  onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bahasa Sehari-hari di Rumah</label>
                <input
                  type="text"
                  placeholder="mis. Indonesia / Sunda / Jawa"
                  value={formData.primary_language}
                  onChange={(e) => setFormData({ ...formData, primary_language: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hobi</label>
                <input
                  type="text"
                  value={formData.hobby}
                  onChange={(e) => setFormData({ ...formData, hobby: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cita-cita</label>
                <input
                  type="text"
                  value={formData.ambition}
                  onChange={(e) => setFormData({ ...formData, ambition: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Dapodik</label>
                <select
                  value={formData.dapodik_status}
                  onChange={(e) => setFormData({ ...formData, dapodik_status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="belum_masuk_dapodik">Belum Masuk Dapodik</option>
                  <option value="kendala">Ada Kendala Dapodik</option>
                  <option value="sudah_masuk_dapodik">Sudah Masuk Dapodik</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Catatan Kendala Dapodik (Jika Ada)</label>
                <input
                  type="text"
                  placeholder="Keterangan perbaikan NIK/NISN atau status di dinas"
                  value={formData.dapodik_notes}
                  onChange={(e) => setFormData({ ...formData, dapodik_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Alamat Domisili & Kontak */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              <span>Alamat Tempat Tinggal & Kontak Siswa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Alamat Jalan</label>
                <input
                  type="text"
                  value={formData.student_address.street_address}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, street_address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RT</label>
                <input
                  type="text"
                  value={formData.student_address.rt}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, rt: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RW</label>
                <input
                  type="text"
                  value={formData.student_address.rw}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, rw: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Dusun</label>
                <input
                  type="text"
                  value={formData.student_address.hamlet}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, hamlet: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Desa / Kelurahan</label>
                <input
                  type="text"
                  value={formData.student_address.village}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, village: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={formData.student_address.district}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, district: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Pos</label>
                <input
                  type="text"
                  value={formData.student_address.postal_code}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, postal_code: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">E-Mail Siswa</label>
                <input
                  type="email"
                  value={formData.student_address.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    student_address: { ...formData.student_address, email: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA FISIK & PERIODIK */}
      {activeTab === 'fisik' && (
        <div className="space-y-6">
          {/* Data Fisik Pokok */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Data Fisik & Catatan Kesehatan Siswa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Golongan Darah</label>
                <select
                  value={formData.physical_data.blood_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    physical_data: { ...formData.physical_data, blood_type: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="tidak_tahu">Tidak Tahu</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Penyakit Berat yang Pernah Diderita</label>
                <input
                  type="text"
                  placeholder="mis. Asma akut, Tipes (2024), Tidak ada"
                  value={formData.physical_data.severe_disease}
                  onChange={(e) => setFormData({
                    ...formData,
                    physical_data: { ...formData.physical_data, severe_disease: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pantangan Makanan / Alergi</label>
                <input
                  type="text"
                  placeholder="mis. Seafood, Kacang tanah, Tidak ada"
                  value={formData.physical_data.dietary_restrictions}
                  onChange={(e) => setFormData({
                    ...formData,
                    physical_data: { ...formData.physical_data, dietary_restrictions: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Catatan Khusus Kesehatan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan untuk penanganan UKS atau pembina asrama"
                  value={formData.physical_data.health_notes}
                  onChange={(e) => setFormData({
                    ...formData,
                    physical_data: { ...formData.physical_data, health_notes: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Riwayat Update Fisik Periodik */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Riwayat Data Fisik Periodik (Update Rutin Semester / UKS)</span>
                </h3>
                <p className="text-xs text-slate-500">Pencatatan perkembangan tinggi dan berat badan secara berkala.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPeriodicModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Catat Fisik Baru</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-y border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Tanggal Cek</th>
                    <th className="py-2.5 px-3 font-semibold">Periode / Semester</th>
                    <th className="py-2.5 px-3 font-semibold">Tinggi (cm)</th>
                    <th className="py-2.5 px-3 font-semibold">Berat (kg)</th>
                    <th className="py-2.5 px-3 font-semibold">Petugas UKS</th>
                    <th className="py-2.5 px-3 font-semibold">Catatan</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {periodicRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Belum ada riwayat pencatatan fisik periodik.
                      </td>
                    </tr>
                  ) : (
                    periodicRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-medium">{r.record_date ? r.record_date.split('T')[0] : '-'}</td>
                        <td className="py-2 px-3">{r.period_label || '-'}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{r.height_cm} cm</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{r.weight_kg} kg</td>
                        <td className="py-2 px-3">{r.recorded_by || '-'}</td>
                        <td className="py-2 px-3 text-slate-500">{r.notes || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePeriodic(r.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA ORANG TUA & WALI */}
      {activeTab === 'ortu' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Orang Tua Kandung & Wali Siswa</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data Ayah Kandung, Ibu Kandung, Wali, Status Validasi, Kontak & Penanggung Biaya Pendidikan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGuardianForm({
                    guardian_id: null,
                    relationship: 'ayah',
                    expense_bearer: 'ayah',
                    is_primary_contact: false,
                    validation_status: 'unverified',
                    nik: '',
                    full_name: '',
                    birth_place: '',
                    birth_date: '',
                    education_level: '',
                    occupation: '',
                    income_range: '',
                    special_needs: '',
                    phone: '',
                    email: '',
                    address: ''
                  });
                  setShowGuardianModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Ortu/Wali</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guardians.map((g) => (
                <div key={g.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                        {g.relationship === 'ayah' ? 'Ayah Kandung' : g.relationship === 'ibu' ? 'Ibu Kandung' : 'Wali Murid'}
                      </span>
                      {g.validation_status === 'verified' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                          Terverifikasi
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                          Belum Validasi
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGuardianForm({
                            guardian_id: g.id,
                            relationship: g.relationship || 'ayah',
                            expense_bearer: g.expense_bearer || 'ayah',
                            is_primary_contact: !!g.is_primary_contact,
                            validation_status: g.validation_status || 'unverified',
                            nik: g.nik || '',
                            full_name: g.full_name || '',
                            birth_place: g.birth_place || '',
                            birth_date: g.birth_date ? g.birth_date.split('T')[0] : '',
                            education_level: g.education_level || '',
                            occupation: g.occupation || '',
                            income_range: g.income_range || '',
                            special_needs: g.special_needs || '',
                            phone: g.phone || '',
                            email: g.email || '',
                            address: g.address || ''
                          });
                          setShowGuardianModal(true);
                        }}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 bg-white border border-slate-200 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGuardian(g.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Nama Lengkap</div>
                      <div className="font-bold text-slate-800">{g.full_name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">NIK</div>
                      <div className="font-mono text-slate-700">{g.nik || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Tempat, Tanggal Lahir</div>
                      <div className="text-slate-700">{g.birth_place || '-'}, {g.birth_date ? g.birth_date.split('T')[0] : '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Pendidikan</div>
                      <div className="text-slate-700">{g.education_level || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Pekerjaan</div>
                      <div className="text-slate-700">{g.occupation || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Penghasilan</div>
                      <div className="text-slate-700">{g.income_range || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">No Kontak / WhatsApp</div>
                      <div className="text-slate-700">{g.phone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">E-Mail</div>
                      <div className="text-slate-700">{g.email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Berkebutuhan Khusus</div>
                      <div className="text-slate-700">{g.special_needs || 'Tidak ada'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Penanggung Biaya</div>
                      <div className="font-semibold text-emerald-700 capitalize">{g.expense_bearer || g.relationship}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KELEMBAGAAN & REGISTRASI MASUK & UPLOAD BERKAS */}
      {activeTab === 'kelembagaan' && (
        <div className="space-y-6">
          {/* Data Registrasi Masuk */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Data Kelembagaan & Registrasi Masuk Siswa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Pendaftaran *</label>
                <select
                  value={formData.admission.registration_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    admission: { ...formData.admission, registration_type: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="siswa_baru">Siswa Baru</option>
                  <option value="pindahan">Pindahan dari Sekolah Lain</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Masuk Sekolah</label>
                <DatePickerField
                  value={formData.admission?.admission_date || ''}
                  onChange={(isoVal) => setFormData({
                    ...formData,
                    admission: { ...formData.admission, admission_date: isoVal }
                  })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Terdaftar Sistem</label>
                <DatePickerField
                  value={formData.enrolled_at || ''}
                  onChange={(isoVal) => setFormData({ ...formData, enrolled_at: isoVal })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Asal Sekolah (Jika Pindahan)</label>
                <input
                  type="text"
                  placeholder="mis. SMP Negeri 1 Sukaraja"
                  value={formData.admission.previous_school_name}
                  onChange={(e) => setFormData({
                    ...formData,
                    admission: { ...formData.admission, previous_school_name: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Alamat Sekolah Asal</label>
                <input
                  type="text"
                  placeholder="Alamat lengkap sekolah asal pindahan"
                  value={formData.admission.previous_school_address}
                  onChange={(e) => setFormData({
                    ...formData,
                    admission: { ...formData.admission, previous_school_address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Kelengkapan Berkas & Unggah Dokumen Scan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Kelengkapan Berkas, Upload Scan Dokumen & Ijazah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Unggah file scan PDF atau gambar (Akta, KK, KTP Ortu, Pas Foto, dan Ijazah Sekolah Saat Ini).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {[
                { id: 'form', label: 'Formulir Pendaftaran', hasFile: true },
                { id: 'birth_cert', label: 'FC Akta Kelahiran', hasFile: true },
                { id: 'family_card', label: 'FC Kartu Keluarga (KK)', hasFile: true },
                { id: 'father_ktp', label: 'FC KTP Ayah', hasFile: true },
                { id: 'mother_ktp', label: 'FC KTP Ibu', hasFile: true },
                { id: 'ijazah', label: 'Scan Ijazah Sekolah Saat Ini / Asal', hasFile: true },
                { id: 'other_docs', label: 'Berkas Lainnya (Surat Pindah / SKKB)', hasFile: true },
                { id: 'photo_2x3', label: 'Pas Foto 2x3', hasFile: true },
                { id: 'photo_3x4', label: 'Pas Foto 3x4', hasFile: true },
                { id: 'class_group_joined', label: 'Masuk Grup Kelas (WA/Telegram)', hasFile: false },
                { id: 'teacher_socialized', label: 'Sosialisasi oleh Guru Kelas', hasFile: false },
                { id: 'learning_started', label: 'Mulai Belajar Aktif', hasFile: false },
                { id: 'data_completed', label: 'Kelengkapan Data Induk', hasFile: false }
              ].map((item) => {
                const subKey = `${item.id}_submitted`;
                const verKey = `${item.id}_verified`;
                const fileKey = `${item.id}_file_url`;
                const isSub = !!formData.document_checklist[subKey];
                const isVer = !!formData.document_checklist[verKey];
                const fileUrl = formData.document_checklist[fileKey] || '';

                return (
                  <div key={item.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSub}
                            onChange={(e) => setFormData({
                              ...formData,
                              document_checklist: { ...formData.document_checklist, [subKey]: e.target.checked }
                            })}
                            className="rounded text-emerald-600 focus:ring-0"
                          />
                          <span className="text-[11px] text-slate-600">Diserahkan</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isVer}
                            onChange={(e) => setFormData({
                              ...formData,
                              document_checklist: { ...formData.document_checklist, [verKey]: e.target.checked }
                            })}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span className="text-[11px] text-blue-700 font-bold">Verifikasi</span>
                        </label>
                      </div>
                    </div>

                    {item.hasFile && (
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer shadow-2xs">
                            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{fileUrl ? 'Ganti File Scan' : 'Unggah Scan Berkas'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, (dataUrl) => {
                                setFormData({
                                  ...formData,
                                  document_checklist: {
                                    ...formData.document_checklist,
                                    [fileKey]: dataUrl,
                                    [subKey]: true
                                  }
                                });
                              })}
                            />
                          </label>

                          {fileUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewFile({ name: item.label, url: fileUrl })}
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md inline-flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat File</span>
                            </button>
                          )}
                        </div>

                        {fileUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                document_checklist: { ...formData.document_checklist, [fileKey]: '' }
                              });
                            }}
                            className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold"
                          >
                            Hapus File
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: KELENGKAPAN REKAP & SCAN RAPOR PER SEMESTER */}
      {activeTab === 'rapor' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Kelengkapan Rekap & Upload Scan Rapor per Semester</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pemeriksaan arsip & unggah scan PDF/Gambar nilai rapor DIK (Yayasan/Pesantren) dan DIN (Dinas Pendidikan).
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveReportRecaps}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Rekap & File Scan Rapor</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-y border-slate-100 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="py-3 px-3 font-bold">Tingkat / Kelas</th>
                  <th className="py-3 px-3 font-bold">Semester</th>
                  <th className="py-3 px-3 font-bold">Rapor DIK (Pesantren/Yayasan)</th>
                  <th className="py-3 px-3 font-bold">Rapor DIN (Dinas Pendidikan)</th>
                  <th className="py-3 px-3 font-bold">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reportRecaps.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-bold text-slate-800">{item.grade_name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-600">{item.semester}</td>
                    
                    {/* Rapor DIK */}
                    <td className="py-3 px-3">
                      <div className="space-y-1.5">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.dik_status}
                            onChange={(e) => {
                              const updated = [...reportRecaps];
                              updated[idx].dik_status = e.target.checked;
                              setReportRecaps(updated);
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-0"
                          />
                          <span className={`text-[11px] font-bold ${item.dik_status ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {item.dik_status ? 'Lengkap (DIK)' : 'Belum Ada'}
                          </span>
                        </label>

                        <div className="flex items-center gap-1.5">
                          <label className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 cursor-pointer flex items-center gap-1">
                            <UploadCloud className="w-3 h-3 text-emerald-600" />
                            <span>{item.file_url_dik ? 'Ganti Scan' : 'Upload Scan DIK'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, (dataUrl) => {
                                const updated = [...reportRecaps];
                                updated[idx].file_url_dik = dataUrl;
                                updated[idx].dik_status = true;
                                setReportRecaps(updated);
                              })}
                            />
                          </label>
                          {item.file_url_dik && (
                            <button
                              type="button"
                              onClick={() => setPreviewFile({ name: `Rapor DIK - ${item.grade_name} ${item.semester}`, url: item.file_url_dik })}
                              className="p-1 text-emerald-600 hover:text-emerald-800"
                              title="Lihat Berkas Scan DIK"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Rapor DIN */}
                    <td className="py-3 px-3">
                      <div className="space-y-1.5">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.din_status}
                            onChange={(e) => {
                              const updated = [...reportRecaps];
                              updated[idx].din_status = e.target.checked;
                              setReportRecaps(updated);
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                          />
                          <span className={`text-[11px] font-bold ${item.din_status ? 'text-blue-700' : 'text-slate-400'}`}>
                            {item.din_status ? 'Lengkap (DIN)' : 'Belum Ada'}
                          </span>
                        </label>

                        <div className="flex items-center gap-1.5">
                          <label className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 cursor-pointer flex items-center gap-1">
                            <UploadCloud className="w-3 h-3 text-blue-600" />
                            <span>{item.file_url_din ? 'Ganti Scan' : 'Upload Scan DIN'}</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, (dataUrl) => {
                                const updated = [...reportRecaps];
                                updated[idx].file_url_din = dataUrl;
                                updated[idx].din_status = true;
                                setReportRecaps(updated);
                              })}
                            />
                          </label>
                          {item.file_url_din && (
                            <button
                              type="button"
                              onClick={() => setPreviewFile({ name: `Rapor DIN - ${item.grade_name} ${item.semester}`, url: item.file_url_din })}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Lihat Berkas Scan DIN"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="Catatan..."
                        value={item.notes || ''}
                        onChange={(e) => {
                          const updated = [...reportRecaps];
                          updated[idx].notes = e.target.value;
                          setReportRecaps(updated);
                        }}
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: KELULUSAN & PINDAH KELUAR */}
      {activeTab === 'kelulusan' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Riwayat Mutasi, Kelulusan & Pindah Keluar Siswa</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pencatatan data alumni/lulus sekolah, nopes ujian, ijazah, serta mutasi keluar Dapodik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMutationModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Catat Mutasi / Lulus</span>
              </button>
            </div>

            <div className="space-y-3">
              {mutations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Siswa ini berstatus aktif dan belum memiliki riwayat kelulusan atau mutasi keluar.
                </div>
              ) : (
                mutations.map((m) => (
                  <div key={m.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="px-2.5 py-0.5 rounded-md font-bold uppercase text-[11px] bg-indigo-100 text-indigo-800">
                        {m.mutation_type === 'lulus' ? 'Lulus Sekolah' : m.mutation_type === 'pindah_keluar' ? 'Pindah Keluar' : m.mutation_type}
                      </span>
                      <span className="text-slate-500 font-medium">
                        Tanggal: {m.mutation_date ? m.mutation_date.split('T')[0] : '-'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      {m.mutation_type === 'lulus' ? (
                        <>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Nopes Ujian</div>
                            <div className="font-bold text-slate-800">{m.exam_participant_number || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">No. Seri Ijazah Dinas</div>
                            <div className="font-bold text-slate-800">{m.diploma_certificate_number || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">No. Seri SKHUN Dinas</div>
                            <div className="font-bold text-slate-800">{m.skhun_number || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Sekolah Lanjutan</div>
                            <div className="font-bold text-emerald-700">{m.next_school_name || '-'}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Sekolah Tujuan</div>
                            <div className="font-bold text-rose-700">{m.origin_or_destination_school || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Alasan Pindah</div>
                            <div className="text-slate-700">{m.transfer_reason || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">No. Surat Keluar</div>
                            <div className="text-slate-700">{m.exit_letter_number || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Surat Mutasi Dapodik</div>
                            <div className="font-semibold text-slate-700 capitalize">{m.dapodik_mutation_letter_status || '-'}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: RIWAYAT ROMBEL & KENAIKAN KELAS */}
      {activeTab === 'riwayat_rombel' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>Audit Trail Riwayat Rombel & Kenaikan Siswa (student_class_history)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekam jejak historis penempatan kelas dari PSB awal, mutasi masuk, hingga promosi kenaikan kelas / kelulusan.
                </p>
              </div>
            </div>

            {classHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Belum ada catatan riwayat rombel tersimpan untuk santri ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Tahun Ajaran</th>
                      <th className="py-3 px-4">Jenjang & Rombel</th>
                      <th className="py-3 px-4">Tipe Penempatan</th>
                      <th className="py-3 px-4">Keputusan / Catatan</th>
                      <th className="py-3 px-4">Dicatat Oleh</th>
                      <th className="py-3 px-4 text-right">Waktu Pencatatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {classHistory.map((h) => {
                      let typeBadge = { text: 'Manual', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
                      if (h.enrollment_type === 'psb_placement') {
                        typeBadge = { text: 'PSB Masuk', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
                      } else if (h.enrollment_type === 'promotion') {
                        typeBadge = { text: 'Kenaikan Kelas', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                      } else if (h.enrollment_type === 'transfer') {
                        typeBadge = { text: 'Transfer / Pindah', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
                      }

                      return (
                        <tr key={h.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {h.academic_year_name || '2026/2027'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-emerald-800">
                              {h.class_group_name || `Kelas ID ${h.class_group_id}`}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{h.grade_level_name || 'Tingkat'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadge.bg}`}>
                              {typeBadge.text}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{h.decision || '-'}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {h.recorded_by || 'Sistem'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                            {h.recorded_at ? new Date(h.recorded_at).toLocaleString('id-ID') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: RIWAYAT RAPOR & NILAI SEMESTER (LINTAS TAHUN AJARAN) */}
      {activeTab === 'riwayat_rapor' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>Riwayat Rapor & Nilai Semester (Arsip Lengkap)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar seluruh lembar rapor peserta didik lintas tahun ajaran dan semester, mencakup nilai akhir mata pelajaran ter-materialisasi.
                </p>
              </div>

              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                Total: {reportCardHistory.length} Semester Terdata
              </div>
            </div>

            {reportCardHistory.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Belum ada data rapor untuk siswa ini.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Nilai rapor dapat di-generate dari menu Rapor Siswa atau diinput melalui menu Riwayat & Impor Data.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reportCardHistory.map((rc) => {
                  const isExpanded = expandedReportId === rc.id;
                  const isLegacy = !!rc.is_legacy;
                  const dataSourceLabel =
                    rc.data_source === 'bulk_import'
                      ? 'Impor Riwayat'
                      : rc.data_source === 'manual_input'
                      ? 'Input Manual'
                      : 'Digenerate Sistem';

                  return (
                    <div
                      key={rc.id}
                      className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition hover:border-indigo-200"
                    >
                      {/* Header Kartu Rapor */}
                      <div className="p-4 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-indigo-600 text-xs shadow-2xs">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-sm">{rc.semester_name}</span>
                              <span className="text-xs text-slate-500 font-semibold">({rc.academic_year_name})</span>
                              {isLegacy ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                                  Data Riwayat / Lampau
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  Tahun Berjalan
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {dataSourceLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Diterbitkan: {rc.generated_at ? new Date(rc.generated_at).toLocaleDateString('id-ID') : '-'}
                              {rc.homeroom_note && ` • Catatan: "${rc.homeroom_note}"`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {rc.file_url && (
                            <a
                              href={rc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Lihat PDF</span>
                            </a>
                          )}

                          <button
                            onClick={() => setExpandedReportId(isExpanded ? null : rc.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
                          >
                            {isExpanded ? 'Sembunyikan Nilai' : `Lihat ${rc.subject_scores?.length || 0} Nilai Mapel`}
                          </button>
                        </div>
                      </div>

                      {/* Detail Tabel Nilai Mapel (Accordion) */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-slate-100 space-y-3 animate-in fade-in">
                          <h4 className="font-bold text-xs text-slate-700">Rincian Nilai Akhir per Mata Pelajaran:</h4>
                          {rc.subject_scores && rc.subject_scores.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                                <thead className="bg-slate-50 text-slate-700 font-bold">
                                  <tr>
                                    <th className="py-2.5 px-3">Mata Pelajaran</th>
                                    <th className="py-2.5 px-3 w-20 text-center">KKM</th>
                                    <th className="py-2.5 px-3 w-24 text-center">Nilai Akhir</th>
                                    <th className="py-2.5 px-3 w-20 text-center">Predikat</th>
                                    <th className="py-2.5 px-3">Catatan Capaian Kompetensi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {rc.subject_scores.map((sc) => (
                                    <tr key={sc.id} className="hover:bg-slate-50/70">
                                      <td className="py-2.5 px-3 font-bold text-slate-800">
                                        {sc.subject_name}
                                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">({sc.subject_code})</span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center text-slate-500">{sc.kkm_snapshot || 75}</td>
                                      <td className="py-2.5 px-3 text-center font-extrabold text-indigo-700 text-sm">
                                        {sc.score}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                                          {sc.predikat || '-'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                                        {sc.notes || <span className="text-slate-400 italic">Tidak ada catatan</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-3 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                              Belum ada rincian nilai mapel yang tersimpan untuk rapor ini.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FILE SCAN */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Preview: {previewFile.name}</span>
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-50 rounded-xl my-3 min-h-[350px]">
              {previewFile.url?.startsWith('data:image') || previewFile.url?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[65vh] rounded-lg border border-slate-200"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>Format didukung: Gambar (JPG, PNG) & Dokumen PDF</span>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH DATA FISIK PERIODIK */}
      {showPeriodicModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Catat Data Fisik Periodik Baru
            </h3>
            <form onSubmit={handleSavePeriodic} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Pemeriksaan *</label>
                <DatePickerField
                  required
                  value={newPeriodic.record_date || ''}
                  onChange={(isoVal) => setNewPeriodic({ ...newPeriodic, record_date: isoVal })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Periode / Semester</label>
                <input
                  type="text"
                  placeholder="mis. Semester Ganjil 2026/2027"
                  value={newPeriodic.period_label}
                  onChange={(e) => setNewPeriodic({ ...newPeriodic, period_label: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tinggi Badan (cm) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newPeriodic.height_cm}
                    onChange={(e) => setNewPeriodic({ ...newPeriodic, height_cm: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Berat Badan (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newPeriodic.weight_kg}
                    onChange={(e) => setNewPeriodic({ ...newPeriodic, weight_kg: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Petugas UKS / Pemeriksa</label>
                <input
                  type="text"
                  value={newPeriodic.recorded_by}
                  onChange={(e) => setNewPeriodic({ ...newPeriodic, recorded_by: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={newPeriodic.notes}
                  onChange={(e) => setNewPeriodic({ ...newPeriodic, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPeriodicModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ORANG TUA / WALI */}
      {showGuardianModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 shrink-0">
              {guardianForm.guardian_id ? 'Edit Data Orang Tua / Wali' : 'Tambah Orang Tua / Wali Baru'}
            </h3>

            <form onSubmit={handleSaveGuardian} className="flex-1 overflow-y-auto space-y-3 pt-3 text-xs pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hubungan *</label>
                  <select
                    value={guardianForm.relationship}
                    onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="ayah">Ayah Kandung</option>
                    <option value="ibu">Ibu Kandung</option>
                    <option value="wali">Wali Murid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Validasi</label>
                  <select
                    value={guardianForm.validation_status}
                    onChange={(e) => setGuardianForm({ ...guardianForm, validation_status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="unverified">Belum Validasi (Data Input)</option>
                    <option value="verified">Valid / Terverifikasi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penanggung Biaya</label>
                  <select
                    value={guardianForm.expense_bearer}
                    onChange={(e) => setGuardianForm({ ...guardianForm, expense_bearer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="ayah">Ayah</option>
                    <option value="ibu">Ibu</option>
                    <option value="wali">Wali</option>
                    <option value="beasiswa">Beasiswa / Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={guardianForm.full_name}
                    onChange={(e) => setGuardianForm({ ...guardianForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIK</label>
                  <input
                    type="text"
                    value={guardianForm.nik}
                    onChange={(e) => setGuardianForm({ ...guardianForm, nik: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={guardianForm.birth_place}
                    onChange={(e) => setGuardianForm({ ...guardianForm, birth_place: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <DatePickerField
                    value={guardianForm.birth_date || ''}
                    onChange={(isoVal) => setGuardianForm({ ...guardianForm, birth_date: isoVal })}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pendidikan Terakhir</label>
                  <input
                    type="text"
                    placeholder="mis. S1 Teknik / SMA"
                    value={guardianForm.education_level}
                    onChange={(e) => setGuardianForm({ ...guardianForm, education_level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pekerjaan</label>
                  <input
                    type="text"
                    placeholder="mis. Karyawan Swasta / Wiraswasta"
                    value={guardianForm.occupation}
                    onChange={(e) => setGuardianForm({ ...guardianForm, occupation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penghasilan Rata-rata</label>
                  <input
                    type="text"
                    placeholder="mis. Rp 5.000.000 - Rp 10.000.000"
                    value={guardianForm.income_range}
                    onChange={(e) => setGuardianForm({ ...guardianForm, income_range: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Berkebutuhan Khusus</label>
                  <input
                    type="text"
                    placeholder="Tidak ada / Jenis kebutuhan"
                    value={guardianForm.special_needs}
                    onChange={(e) => setGuardianForm({ ...guardianForm, special_needs: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No Kontak / No HP</label>
                  <input
                    type="text"
                    value={guardianForm.phone}
                    onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={guardianForm.email}
                    onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={guardianForm.address}
                  onChange={(e) => setGuardianForm({ ...guardianForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGuardianModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold"
                >
                  Simpan Data Ortu/Wali
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MUTASI / KELULUSAN */}
      {showMutationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 shrink-0">
              Pencatatan Kelulusan / Mutasi Siswa
            </h3>

            <form onSubmit={handleSaveMutation} className="flex-1 overflow-y-auto space-y-3 pt-3 text-xs pr-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Mutasi *</label>
                <select
                  value={mutationForm.mutation_type}
                  onChange={(e) => setMutationForm({ ...mutationForm, mutation_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="lulus">Lulus Sekolah / Tamat</option>
                  <option value="pindah_keluar">Pindah Keluar (Mutasi ke Sekolah Lain)</option>
                  <option value="keluar">Keluar / Mengundurkan Diri</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Penetapan *</label>
                <DatePickerField
                  required
                  value={mutationForm.mutation_date || ''}
                  onChange={(isoVal) => setMutationForm({ ...mutationForm, mutation_date: isoVal })}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              {mutationForm.mutation_type === 'lulus' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Peserta Ujian</label>
                    <input
                      type="text"
                      placeholder="mis. 02-045-001-8"
                      value={mutationForm.exam_participant_number}
                      onChange={(e) => setMutationForm({ ...mutationForm, exam_participant_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Seri Ijazah Dinas</label>
                    <input
                      type="text"
                      placeholder="mis. DN-02/D-SMP/K13/26/0001234"
                      value={mutationForm.diploma_certificate_number}
                      onChange={(e) => setMutationForm({ ...mutationForm, diploma_certificate_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Seri SKHUN Dinas</label>
                    <input
                      type="text"
                      placeholder="mis. SKHUN-02/2026/001"
                      value={mutationForm.skhun_number}
                      onChange={(e) => setMutationForm({ ...mutationForm, skhun_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sekolah Lanjutan</label>
                    <input
                      type="text"
                      placeholder="mis. SMA Negeri 1 Bogor / SMA Aldepos"
                      value={mutationForm.next_school_name}
                      onChange={(e) => setMutationForm({ ...mutationForm, next_school_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sekolah Tujuan</label>
                    <input
                      type="text"
                      placeholder="Nama sekolah tujuan kepindahan"
                      value={mutationForm.origin_or_destination_school}
                      onChange={(e) => setMutationForm({ ...mutationForm, origin_or_destination_school: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alasan Pindah</label>
                    <input
                      type="text"
                      placeholder="mis. Mengikuti orang tua pindah dinas luar kota"
                      value={mutationForm.transfer_reason}
                      onChange={(e) => setMutationForm({ ...mutationForm, transfer_reason: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Surat Keluar</label>
                    <input
                      type="text"
                      placeholder="mis. 421/089/SMP-ALD/VI/2026"
                      value={mutationForm.exit_letter_number}
                      onChange={(e) => setMutationForm({ ...mutationForm, exit_letter_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Surat Mutasi Dapodik</label>
                    <select
                      value={mutationForm.dapodik_mutation_letter_status}
                      onChange={(e) => setMutationForm({ ...mutationForm, dapodik_mutation_letter_status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="belum_diproses">Belum Diproses</option>
                      <option value="dalam_proses">Dalam Proses Tarik/Mutasi</option>
                      <option value="sudah_terbit">Sudah Terbit Surat Mutasi</option>
                      <option value="selesai">Selesai / Sudah Diterima</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={mutationForm.notes}
                  onChange={(e) => setMutationForm({ ...mutationForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMutationModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
