import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Award,
  Calendar,
  Save,
  Calculator,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  RotateCw,
  Target,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Printer,
  BarChart3,
  CheckCircle2,
  Activity,
  Layers,
  FileText
} from 'lucide-react';

export default function InputNilaiEkstrakurikuler() {
  const { activeSchoolUnit } = useAuth();

  // Navigation Tabs (Identik 5 Tab dengan Input Nilai Mapel)
  const [activeTab, setActiveTab] = useState('assessment_types');
  // 'assessment_types' | 'assessment_sessions' | 'recap_matrix' | 'report_processor' | 'ledger_print'

  // Master Filters State
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  
  // KHUSUS EKSKUL: Rombel Ekstrakurikuler & Kegiatan Ekstrakurikuler
  const [ekskulClasses, setEkskulClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [selectedExtraId, setSelectedExtraId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ----------------------------------------------------
  // TAB 1: JENIS PENGUJIAN EKSKUL & BOBOT RAPOR STATE
  // ----------------------------------------------------
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    weight_percentage: 30,
    is_tp_based: false,
    order_index: 1
  });

  // ----------------------------------------------------
  // TAB 2: PELAKSANAAN SESI PENILAIAN EKSKUL STATE
  // ----------------------------------------------------
  const [assessmentSessions, setAssessmentSessions] = useState([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    assessment_type_id: '',
    assessment_date: new Date().toISOString().split('T')[0],
    max_score: 100,
    notes: ''
  });

  // Modal Input Nilai per Sesi
  const [sessionScoreModalOpen, setSessionScoreModalOpen] = useState(false);
  const [activeSessionDetail, setActiveSessionDetail] = useState(null);
  const [sessionScoresMap, setSessionScoresMap] = useState({}); // { [student_id]: { score, feedback, tp_scores: {} } }

  // ----------------------------------------------------
  // TAB 3: REKAP MATRIKS NILAI EKSKUL STATE
  // ----------------------------------------------------
  const [recapData, setRecapData] = useState(null);

  // ----------------------------------------------------
  // TAB 4: PENGOLAHAN NILAI RAPOR & NARASI CAPAIAN EKSKUL STATE
  // ----------------------------------------------------
  const [reportItems, setReportItems] = useState([]); // [{ student_id, student_name, nis, final_score, predicate, description }]
  const [processingReport, setProcessingReport] = useState(false);

  // ----------------------------------------------------
  // TAB 5: BUKU NILAI (LEGER) EKSKUL & CETAK RAPOR STATE
  // ----------------------------------------------------
  const [previewStudentReport, setPreviewStudentReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchInitialData();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchSemesters();
      fetchEkskulClasses();
      fetchExtracurriculars();
    }
  }, [selectedAcademicYearId]);

  // Tab change reactive fetching
  useEffect(() => {
    if (activeTab === 'assessment_types') {
      fetchAssessmentTypes();
    } else if (activeTab === 'assessment_sessions') {
      if (selectedClassId && selectedExtraId && selectedSemesterId) {
        fetchAssessmentSessions();
      }
    } else if (activeTab === 'recap_matrix') {
      if (selectedClassId && selectedExtraId && selectedSemesterId) {
        fetchRecapMatrix();
      }
    } else if (activeTab === 'report_processor') {
      if (selectedClassId && selectedExtraId && selectedSemesterId) {
        fetchReportProcessorData();
      }
    }
  }, [activeTab, selectedClassId, selectedExtraId, selectedSemesterId, selectedAcademicYearId]);

  // Auto-sync selectedExtraId ketika rombel ekskul berubah jika rombel tersebut sudah memiliki extracurricular_id
  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    const matchedClass = ekskulClasses.find(c => String(c.id) === String(classId));
    if (matchedClass?.extracurricular_id) {
      setSelectedExtraId(String(matchedClass.extracurricular_id));
    }
  };

  // ----------------------------------------------------
  // FETCHERS
  // ----------------------------------------------------
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const unitId = activeSchoolUnit?.id || 1;
      const [ayRes, typeRes] = await Promise.all([
        api.get('/akademik/academic-years', { params: { satuan_pendidikan_id: unitId } }),
        api.get('/akademik/assessment-types', {
          params: {
            satuan_pendidikan_id: unitId,
            category: 'ekskul'
          }
        })
      ]);

      const ays = ayRes.data?.data || [];
      const uniqueAys = Array.from(new Map(ays.map(y => [y.id, y])).values());
      setAcademicYears(uniqueAys);
      setAssessmentTypes(typeRes.data?.data || []);

      const activeAy = uniqueAys.find(y => y.is_active) || uniqueAys[0];
      if (activeAy) {
        setSelectedAcademicYearId(String(activeAy.id));
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSemesters = async () => {
    try {
      const unitId = activeSchoolUnit?.id || 1;
      const res = await api.get('/akademik/semesters', {
        params: {
          satuan_pendidikan_id: unitId,
          academic_year_id: selectedAcademicYearId
        }
      });
      const sems = res.data?.data || [];
      const uniqueSems = Array.from(new Map(sems.map(s => [s.id, s])).values());
      setSemesters(uniqueSems);
      const activeSem = uniqueSems.find(s => s.is_active) || uniqueSems[0];
      if (activeSem) setSelectedSemesterId(String(activeSem.id));
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  };

  // Hanya ambil Rombel Ekstrakurikuler
  const fetchEkskulClasses = async () => {
    try {
      const res = await api.get('/akademik/class-groups', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId
        }
      });
      const allCls = res.data?.data || [];
      // Saring hanya rombel bertipe ekstrakurikuler
      const filteredEkskulCls = allCls.filter(c => c.type === 'ekstrakurikuler' || Boolean(c.extracurricular_id));
      setEkskulClasses(filteredEkskulCls);
      if (filteredEkskulCls.length > 0) {
        const firstCls = filteredEkskulCls[0];
        setSelectedClassId(String(firstCls.id));
        if (firstCls.extracurricular_id) {
          setSelectedExtraId(String(firstCls.extracurricular_id));
        }
      }
    } catch (err) {
      console.error('Error fetching ekskul classes:', err);
    }
  };

  // Hanya ambil Daftar Kegiatan Ekstrakurikuler untuk referensi nama
  const fetchExtracurriculars = async () => {
    try {
      const res = await api.get('/akademik/extracurriculars', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id || 1 }
      });
      const extras = res.data?.data || [];
      setExtracurriculars(extras);
    } catch (err) {
      console.error('Error fetching extracurriculars:', err);
    }
  };

  const fetchAssessmentTypes = async () => {
    try {
      const res = await api.get('/akademik/assessment-types', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          category: 'ekskul'
        }
      });
      setAssessmentTypes(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching assessment types:', err);
    }
  };

  const fetchAssessmentSessions = async () => {
    if (!selectedClassId || !selectedExtraId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await api.get('/akademik/assessment-sessions', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          semester_id: selectedSemesterId,
          class_group_id: selectedClassId,
          extracurricular_id: selectedExtraId
        }
      });
      setAssessmentSessions(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecapMatrix = async () => {
    if (!selectedClassId || !selectedExtraId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await api.get('/akademik/scores/recap-matrix', {
        params: {
          class_group_id: selectedClassId,
          extracurricular_id: selectedExtraId,
          semester_id: selectedSemesterId,
          satuan_pendidikan_id: activeSchoolUnit?.id || 1
        }
      });
      setRecapData(res.data?.data);
    } catch (err) {
      console.error('Error fetching recap matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportProcessorData = async () => {
    if (!selectedClassId || !selectedExtraId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const [recapRes, scoreRes] = await Promise.all([
        api.get('/akademik/scores/recap-matrix', {
          params: {
            class_group_id: selectedClassId,
            extracurricular_id: selectedExtraId,
            semester_id: selectedSemesterId,
            satuan_pendidikan_id: activeSchoolUnit?.id || 1
          }
        }),
        api.get('/akademik/extracurricular-scores', {
          params: {
            extracurricular_id: selectedExtraId,
            semester_id: selectedSemesterId
          }
        })
      ]);

      const data = recapRes.data?.data;
      const existingSavedScores = scoreRes.data?.data || [];
      const scoreMap = {};
      existingSavedScores.forEach(sc => {
        scoreMap[sc.student_id] = sc;
      });

      const extraName = extracurriculars.find(e => String(e.id) === String(selectedExtraId))?.name || 'Ekstrakurikuler';

      const items = (data?.students || []).map(st => {
        const m = data?.matrix?.[st.student_id] || {};
        const saved = scoreMap[st.student_id];
        const calcFinal = m.calculated_final !== null ? m.calculated_final : 85;
        const currentFinal = saved?.score !== null && saved?.score !== undefined ? saved.score : calcFinal;

        let predicate = saved?.predicate;
        if (!predicate) {
          if (currentFinal >= 90) predicate = 'Sangat Baik';
          else if (currentFinal >= 80) predicate = 'Baik';
          else if (currentFinal >= 70) predicate = 'Cukup';
          else predicate = 'Kurang';
        }

        let narrative = saved?.description;
        if (!narrative) {
          narrative = buildAutoExtraNarrative(extraName, predicate);
        }

        return {
          student_id: st.student_id,
          student_name: st.student_name,
          nis: st.nis,
          final_score: currentFinal !== null ? currentFinal : 85,
          predicate,
          description: narrative || '',
          notes: saved?.notes || ''
        };
      });

      setReportItems(items);
    } catch (err) {
      console.error('Error fetching report processor data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper Auto-Generate Narasi Ekskul
  const buildAutoExtraNarrative = (extraName, predicate) => {
    if (predicate === 'Sangat Baik') {
      return `Sangat aktif dan menunjukkan keterampilan serta kedisiplinan yang sangat baik dalam mengikuti kegiatan ${extraName}.`;
    } else if (predicate === 'Baik') {
      return `Aktif dan menunjukkan perkembangan kemampuan yang baik dalam mengikuti kegiatan ${extraName}.`;
    } else if (predicate === 'Cukup') {
      return `Cukup aktif dalam kegiatan ${extraName}, perlu peningkatan kehadiran dan keaktifan latihan.`;
    } else {
      return `Perlu bimbingan dan peningkatan kehadiran secara konsisten dalam kegiatan ${extraName}.`;
    }
  };

  // ----------------------------------------------------
  // HANDLERS TAB 1: JENIS PENGUJIAN EKSKUL
  // ----------------------------------------------------
  const totalWeight = useMemo(() => {
    return assessmentTypes.reduce((acc, curr) => acc + (parseFloat(curr.weight_percentage) || 0), 0);
  }, [assessmentTypes]);

  const handleOpenAddType = () => {
    setEditingType(null);
    setTypeForm({
      name: '',
      code: '',
      description: '',
      weight_percentage: Math.max(0, 100 - totalWeight),
      is_tp_based: false,
      order_index: assessmentTypes.length + 1
    });
    setTypeModalOpen(true);
  };

  const handleOpenEditType = (type) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      code: type.code,
      description: type.description || '',
      weight_percentage: type.weight_percentage,
      is_tp_based: type.is_tp_based,
      order_index: type.order_index
    });
    setTypeModalOpen(true);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    if (!typeForm.name.trim() || !typeForm.code.trim()) {
      setErrorMsg('Nama dan kode jenis penilaian wajib diisi');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedAcademicYearId,
        category: 'ekskul',
        ...typeForm
      };

      if (editingType) {
        await api.put(`/akademik/assessment-types/${editingType.id}`, payload);
        setSuccessMsg('Jenis penilaian ekstrakurikuler berhasil diperbarui!');
      } else {
        await api.post('/akademik/assessment-types', payload);
        setSuccessMsg('Jenis penilaian ekstrakurikuler baru berhasil ditambahkan!');
      }

      setTypeModalOpen(false);
      fetchAssessmentTypes();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan jenis penilaian');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (id, name) => {
    if (!window.confirm(`Hapus jenis penilaian "${name}"? Seluruh sesi dan nilai terkait jenis ini akan ikut terhapus.`)) {
      return;
    }

    try {
      await api.delete(`/akademik/assessment-types/${id}`);
      setSuccessMsg(`Jenis penilaian "${name}" berhasil dihapus.`);
      fetchAssessmentTypes();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus jenis penilaian');
    }
  };

  // ----------------------------------------------------
  // HANDLERS TAB 2: SESI PENILAIAN EKSKUL
  // ----------------------------------------------------
  const handleOpenAddSession = () => {
    setEditingSession(null);
    setSessionForm({
      title: '',
      assessment_type_id: assessmentTypes[0]?.id || '',
      assessment_date: new Date().toISOString().split('T')[0],
      max_score: 100,
      notes: ''
    });
    setSessionModalOpen(true);
  };

  const handleOpenEditSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      title: session.title,
      assessment_type_id: session.assessment_type_id,
      assessment_date: session.assessment_date ? session.assessment_date.split('T')[0] : '',
      max_score: session.max_score || 100,
      notes: session.notes || ''
    });
    setSessionModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.title.trim() || !sessionForm.assessment_type_id) {
      setErrorMsg('Judul sesi dan jenis penilaian wajib dipilih');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedAcademicYearId,
        semester_id: selectedSemesterId,
        class_group_id: selectedClassId,
        extracurricular_id: selectedExtraId,
        ...sessionForm
      };

      if (editingSession) {
        await api.put(`/akademik/assessment-sessions/${editingSession.id}`, payload);
        setSuccessMsg('Sesi penilaian ekstrakurikuler berhasil diperbarui!');
      } else {
        await api.post('/akademik/assessment-sessions', payload);
        setSuccessMsg('Sesi penilaian ekstrakurikuler baru berhasil dibuat!');
      }

      setSessionModalOpen(false);
      fetchAssessmentSessions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan sesi penilaian');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (id, title) => {
    if (!window.confirm(`Hapus sesi penilaian "${title}" beserta seluruh nilai siswa di dalamnya?`)) {
      return;
    }

    try {
      await api.delete(`/akademik/assessment-sessions/${id}`);
      setSuccessMsg(`Sesi penilaian "${title}" berhasil dihapus.`);
      fetchAssessmentSessions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus sesi penilaian');
    }
  };

  // Modal Input Nilai Sesi Ekskul
  const handleOpenSessionScoring = async (sessionId) => {
    try {
      setLoading(true);
      const res = await api.get(`/akademik/assessment-sessions/${sessionId}/scores`);
      const data = res.data?.data;
      setActiveSessionDetail(data);

      const sMap = {};
      (data.students || []).forEach(st => {
        sMap[st.student_id] = {
          score: st.score !== null ? st.score : '',
          feedback: st.feedback || '',
          tp_scores: {}
        };
      });
      setSessionScoresMap(sMap);
      setSessionScoreModalOpen(true);
    } catch (err) {
      setErrorMsg('Gagal memuat data nilai sesi pengujian');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSessionScores = async (e) => {
    e.preventDefault();
    if (!activeSessionDetail?.session?.id) return;

    setSaving(true);
    setErrorMsg('');
    try {
      const items = Object.entries(sessionScoresMap).map(([studentId, data]) => ({
        student_id: Number(studentId),
        score: data.score !== '' && data.score !== null ? parseFloat(data.score) : null,
        feedback: data.feedback
      }));

      await api.post(`/akademik/assessment-sessions/${activeSessionDetail.session.id}/scores`, { items });
      setSuccessMsg('Nilai siswa pada sesi penilaian ekstrakurikuler berhasil disimpan!');
      setSessionScoreModalOpen(false);
      fetchAssessmentSessions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan nilai sesi');
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // HANDLERS TAB 4: PENGOLAHAN RAPOR EKSKUL
  // ----------------------------------------------------
  const handleGenerateAllNarratives = () => {
    const extraName = extracurriculars.find(e => String(e.id) === String(selectedExtraId))?.name || 'Ekstrakurikuler';
    const updated = reportItems.map(item => {
      const narrative = buildAutoExtraNarrative(extraName, item.predicate);
      return { ...item, description: narrative };
    });
    setReportItems(updated);
    setSuccessMsg('Narasi capaian rapor berhasil di-generate otomatis untuk seluruh anggota!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveProcessedReport = async () => {
    if (reportItems.length === 0) return;
    setProcessingReport(true);
    setErrorMsg('');
    try {
      const payload = {
        extracurricular_id: Number(selectedExtraId),
        academic_year_id: Number(selectedAcademicYearId),
        semester_id: Number(selectedSemesterId),
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        items: reportItems.map(item => ({
          student_id: item.student_id,
          predicate: item.predicate,
          score: item.final_score !== '' ? parseFloat(item.final_score) : null,
          description: item.description,
          notes: item.notes
        }))
      };

      await api.post('/akademik/extracurricular-scores/bulk', payload);
      setSuccessMsg('Nilai akhir rapor dan narasi capaian ekstrakurikuler berhasil disimpan!');
      fetchReportProcessorData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan nilai rapor ekstrakurikuler');
    } finally {
      setProcessingReport(false);
    }
  };

  const activeClassName = ekskulClasses.find(c => String(c.id) === String(selectedClassId))?.name || 'Pilih Rombel Ekskul';
  const activeExtraName = extracurriculars.find(e => String(e.id) === String(selectedExtraId))?.name || 'Pilih Ekstrakurikuler';
  const activeSemesterName = semesters.find(s => String(s.id) === String(selectedSemesterId))?.name || 'Semester';

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Input Nilai Ekstrakurikuler</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold uppercase tracking-wider">
                Kegiatan Non-Akademik
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola jenis penilaian ekstrakurikuler, sesi ujian/latihan, rekapitulasi rata-rata, hingga generate predikat & narasi capaian rapor.
            </p>
          </div>
        </div>

        {/* Global Toolbar Action */}
        <div className="flex items-center gap-2">
          {activeTab === 'assessment_types' && (
            <button
              onClick={handleOpenAddType}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Penilaian Ekskul</span>
            </button>
          )}

          {activeTab === 'assessment_sessions' && (
            <button
              onClick={handleOpenAddSession}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Sesi Ujian / Latihan</span>
            </button>
          )}

          {activeTab === 'recap_matrix' && (
            <button
              onClick={fetchRecapMatrix}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition active:scale-95"
            >
              <Calculator className="w-4 h-4 text-indigo-600" />
              <span>Hitung Rata-Rata Otomatis</span>
            </button>
          )}

          {activeTab === 'report_processor' && (
            <>
              <button
                onClick={handleGenerateAllNarratives}
                className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Auto-Generate Narasi Ekskul</span>
              </button>
              <button
                onClick={handleSaveProcessedReport}
                disabled={processingReport || reportItems.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
              >
                {processingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan & Kunci Nilai Rapor Ekskul</span>
              </button>
            </>
          )}

          {activeTab === 'ledger_print' && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh Leger Ekskul</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 shadow-2xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* 5 Tab Navigasi Utama */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        {[
          { id: 'assessment_types', label: '1. Jenis Penilaian & Bobot (%)', icon: SlidersHorizontal },
          { id: 'assessment_sessions', label: '2. Pelaksanaan Sesi Penilaian', icon: Calendar },
          { id: 'recap_matrix', label: '3. Rekap Matriks Nilai Ekskul', icon: Layers },
          { id: 'report_processor', label: '4. Pengolahan Nilai Rapor & Narasi', icon: Sparkles },
          { id: 'ledger_print', label: '5. Buku Nilai (Leger) & Cetak', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar (Kecuali Tab 1 yang merupakan Master Config) */}
      {activeTab !== 'assessment_types' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Tahun Ajaran */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500">TA:</span>
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500">Semester:</span>
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {semesters.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Aktif)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Pilihan Rombel Ekstrakurikuler */}
            <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 px-3 py-1.5 rounded-xl">
              <Users className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span className="text-[11px] font-bold text-amber-950">Rombel Ekskul:</span>
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="text-xs bg-transparent font-black text-amber-950 focus:outline-none cursor-pointer"
              >
                {ekskulClasses.length === 0 ? (
                  <option value="">Tidak ada rombel ekskul</option>
                ) : (
                  ekskulClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                )}
              </select>
            </div>

            {/* Ekstrakurikuler Terkait (Otomatis dari Rombel) */}
            <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200 px-3 py-1.5 rounded-xl">
              <Activity className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-900">Ekstrakurikuler:</span>
              <span className="text-xs font-black text-indigo-950">
                {activeExtraName || 'Otomatis terhubung'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-medium block">
              Rombel: <strong>{activeClassName}</strong> • Ekskul: <strong>{activeExtraName}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TAB 1: MASTER JENIS PENGUJIAN & BOBOT EKSKUL */}
      {/* ======================================================== */}
      {activeTab === 'assessment_types' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
            totalWeight === 100
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                totalWeight === 100 ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {totalWeight === 100 ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-black text-sm block">
                  Total Akumulasi Bobot Nilai Ekskul: {totalWeight}%
                </span>
                <span className="text-[11px] opacity-80">
                  {totalWeight === 100
                    ? '✓ Total bobot pas 100%. Rumus kalkulasi Nilai Akhir Ekstrakurikuler siap digunakan.'
                    : `⚠️ Total bobot saat ini ${totalWeight}%. Sesuaikan bobot persentase agar tepat 100%.`}
                </span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-xl font-black text-xs self-start sm:self-auto ${
              totalWeight === 100 ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
            }`}>
              {totalWeight === 100 ? '100% Sempurna' : `Sisa ${100 - totalWeight}%`}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">Kode</th>
                  <th className="py-3 px-4">Nama Jenis Penilaian</th>
                  <th className="py-3 px-4">Deskripsi / Aspek Penilaian</th>
                  <th className="py-3 px-4 w-36 text-center bg-amber-50/60 font-black text-amber-900">
                    Bobot Nilai (%)
                  </th>
                  <th className="py-3 px-4 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assessmentTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                      Belum ada jenis penilaian ekstrakurikuler. Klik "+ Tambah Jenis Penilaian Ekskul" di atas.
                    </td>
                  </tr>
                ) : (
                  assessmentTypes.map((type, idx) => (
                    <tr key={type.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                        <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md">
                          {type.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{type.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">{type.description || '-'}</td>
                      <td className="py-3.5 px-4 text-center bg-amber-50/30">
                        <span className="px-3 py-1 bg-amber-600 text-white rounded-lg font-black text-xs shadow-2xs">
                          {type.weight_percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditType(type)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id, type.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TAB 2: PELAKSANAAN SESI PENILAIAN EKSKUL */}
      {/* ======================================================== */}
      {activeTab === 'assessment_sessions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">
                  Daftar Sesi Ujian & Latihan: <span className="text-amber-900 font-black">{activeExtraName}</span> ({activeClassName})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pelaksanaan sesi latihan/ujian berkala untuk anggota rombel ekstrakurikuler. Klik tombol <strong>Input Nilai Siswa</strong> untuk mengisi skor.
                </p>
              </div>
              <button
                onClick={handleOpenAddSession}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Sesi Baru</span>
              </button>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">Tanggal</th>
                  <th className="py-3 px-4 w-36">Jenis Penilaian</th>
                  <th className="py-3 px-4 min-w-[200px]">Judul Sesi Penilaian</th>
                  <th className="py-3 px-4 w-28 text-center">Siswa Dinilai</th>
                  <th className="py-3 px-4 w-28 text-center bg-amber-50/50">Rata-Rata</th>
                  <th className="py-3 px-4 text-right w-48">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assessmentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Belum ada sesi penilaian untuk rombel ekskul ini. Klik tombol <strong>+ Sesi Baru</strong> untuk membuat pengujian pertama.
                    </td>
                  </tr>
                ) : (
                  assessmentSessions.map((session, idx) => (
                    <tr key={session.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                        {session.assessment_date ? session.assessment_date.split('T')[0] : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[10px]">
                          {session.assessment_type_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{session.title}</div>
                        {session.notes && <div className="text-[10px] text-slate-400 font-normal">{session.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[11px]">
                          {session.scored_students_count} Siswa
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-amber-50/30 font-black text-amber-900">
                        {session.average_score !== null ? `${session.average_score}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSessionScoring(session.id)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition shadow-2xs inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Input Nilai</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSession(session)}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Sesi"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id, session.title)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Sesi"
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
      )}

      {/* ======================================================== */}
      {/* 3. TAB 3: REKAP MATRIKS NILAI EKSKUL */}
      {/* ======================================================== */}
      {activeTab === 'recap_matrix' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Matriks Nilai Rombel Ekskul:</span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">{activeClassName}</span>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">{activeExtraName}</span>
            </div>
            <span className="text-slate-500 italic text-[11px]">
              * Nilai dihitung dari rata-rata sesi latihan/ujian ekstrakurikuler yang telah dilaksanakan.
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center border-r border-slate-200">No</th>
                  <th className="py-3 px-4 w-24 border-r border-slate-200">NIS</th>
                  <th className="py-3 px-4 min-w-[200px] border-r border-slate-200">Nama Siswa</th>
                  
                  {/* Kolom per Jenis Penilaian Ekskul */}
                  {recapData?.assessment_types?.map(type => (
                    <th key={type.id} className="py-3 px-3 text-center bg-indigo-50/70 border-r border-indigo-200 text-indigo-950 font-black">
                      {type.name} ({type.weight_percentage}%)
                    </th>
                  ))}

                  <th className="py-3 px-4 text-center bg-amber-600 text-white font-black w-28">
                    Estimasi NA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {!recapData?.students || recapData.students.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada siswa terdaftar di rombel ekstrakurikuler ini.
                    </td>
                  </tr>
                ) : (
                  recapData.students.map((student, idx) => {
                    const sId = student.student_id;
                    const m = recapData.matrix?.[sId] || {};
                    const estimatedFinal = m.calculated_final;

                    return (
                      <tr key={sId} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4 text-center text-slate-500 font-bold border-r border-slate-100">{idx + 1}</td>
                        <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px] border-r border-slate-100">{student.nis || '-'}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {student.student_name}
                        </td>

                        {/* Nilai per Jenis Pengujian */}
                        {recapData.assessment_types?.map(type => {
                          const val = m.type_averages?.[type.id];
                          return (
                            <td key={type.id} className="py-2 px-3 text-center border-r border-slate-100 bg-indigo-50/20">
                              {val !== null && val !== undefined ? (
                                <span className="px-2 py-0.5 rounded font-black text-xs text-indigo-900 bg-indigo-50">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Estimasi Nilai Akhir */}
                        <td className="py-2.5 px-4 text-center bg-amber-50/40 font-black text-amber-900 text-xs">
                          {estimatedFinal !== null && estimatedFinal !== undefined ? (
                            <span className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-black text-xs shadow-2xs">
                              {estimatedFinal}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TAB 4: PENGOLAHAN NILAI RAPOR & NARASI CAPAIAN EKSKUL */}
      {/* ======================================================== */}
      {activeTab === 'report_processor' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-50 via-indigo-50 to-teal-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
            <div>
              <span className="font-black text-amber-950 text-sm block flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Pengolahan Nilai Akhir & Narasi Capaian Rapor Ekstrakurikuler</span>
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Nilai Akhir Rapor dihitung dari bobot jenis penilaian. Deskripsi dirumuskan secara otomatis untuk dicetak pada Buku Rapor Semester.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateAllNarratives}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate Narasi Ekskul</span>
              </button>
              <button
                onClick={handleSaveProcessedReport}
                disabled={processingReport || reportItems.length === 0}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                {processingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan & Kunci Nilai Rapor</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-24">NIS</th>
                  <th className="py-3 px-4 w-48">Nama Siswa</th>
                  <th className="py-3 px-4 w-28 text-center bg-amber-50 font-black text-amber-900">
                    Nilai Akhir (NA) *
                  </th>
                  <th className="py-3 px-4 w-36 text-center">Predikat *</th>
                  <th className="py-3 px-4 min-w-[320px]">
                    Deskripsi Capaian Rapor (Narasi Ekskul)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reportItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada data siswa untuk diolah.
                    </td>
                  </tr>
                ) : (
                  reportItems.map((item, idx) => (
                    <tr key={item.student_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{item.nis || '-'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.student_name}</td>
                      
                      {/* Input Nilai Akhir */}
                      <td className="py-3 px-4 text-center bg-amber-50/30">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.final_score}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...reportItems];
                            updated[idx].final_score = val;
                            const n = parseFloat(val) || 0;
                            if (n >= 90) updated[idx].predicate = 'Sangat Baik';
                            else if (n >= 80) updated[idx].predicate = 'Baik';
                            else if (n >= 70) updated[idx].predicate = 'Cukup';
                            else updated[idx].predicate = 'Kurang';
                            setReportItems(updated);
                          }}
                          className="w-20 px-2 py-1.5 text-center text-xs font-black rounded-lg border bg-amber-600 text-white border-amber-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* Predikat Dropdown */}
                      <td className="py-3 px-4 text-center">
                        <select
                          value={item.predicate || 'Baik'}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...reportItems];
                            updated[idx].predicate = val;
                            setReportItems(updated);
                          }}
                          className={`w-32 px-2 py-1 text-xs font-black rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                            item.predicate === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                            item.predicate === 'Baik' ? 'bg-teal-100 text-teal-900 border-teal-300' :
                            item.predicate === 'Cukup' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                            'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          <option value="Sangat Baik">Sangat Baik (A)</option>
                          <option value="Baik">Baik (B)</option>
                          <option value="Cukup">Cukup (C)</option>
                          <option value="Kurang">Kurang (D)</option>
                        </select>
                      </td>

                      {/* Live Text Area Narasi */}
                      <td className="py-3 px-4">
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...reportItems];
                            updated[idx].description = e.target.value;
                            setReportItems(updated);
                          }}
                          placeholder="Deskripsi capaian rapor..."
                          className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed text-slate-800"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB 5: BUKU NILAI (LEGER) & CETAK RAPOR EKSKUL */}
      {/* ======================================================== */}
      {activeTab === 'ledger_print' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                  Buku Nilai / Leger Rombel Ekstrakurikuler: {activeClassName}
                </h3>
                <p className="text-xs text-slate-500">
                  Kegiatan: <strong>{activeExtraName}</strong> • Semester: <strong>{activeSemesterName}</strong>
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Leger Ekskul</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-200">No</th>
                    <th className="py-3 px-3 w-24 border-r border-slate-200">NIS</th>
                    <th className="py-3 px-3 min-w-[200px] border-r border-slate-200">Nama Siswa</th>
                    <th className="py-3 px-3 text-center bg-amber-50 font-black text-amber-950 w-28 border-r border-slate-200">
                      Nilai Akhir
                    </th>
                    <th className="py-3 px-3 text-center w-32 border-r border-slate-200">Predikat</th>
                    <th className="py-3 px-3 min-w-[300px]">Deskripsi Capaian Rapor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                        Belum ada data nilai ekstrakurikuler yang diolah.
                      </td>
                    </tr>
                  ) : (
                    reportItems.map((st, idx) => (
                      <tr key={st.student_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-bold border-r border-slate-100">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] border-r border-slate-100">{st.nis || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">{st.student_name}</td>
                        <td className="py-2.5 px-3 text-center bg-amber-50/30 font-black text-amber-900 border-r border-slate-100">
                          {st.final_score}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-100">
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] ${
                            st.predicate === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-900' :
                            st.predicate === 'Baik' ? 'bg-teal-100 text-teal-900' :
                            st.predicate === 'Cukup' ? 'bg-amber-100 text-amber-900' :
                            'bg-rose-100 text-rose-900'
                          }`}>
                            {st.predicate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 leading-relaxed">
                          {st.description || '-'}
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

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* Modal 1: Tambah / Edit Jenis Penilaian Ekskul */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">
                {editingType ? 'Edit Jenis Penilaian Ekskul' : 'Tambah Jenis Penilaian Ekskul'}
              </h3>
              <button onClick={() => setTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Jenis Penilaian *</label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Contoh: Kehadiran & Keaktifan Latihan, Praktik / Unjuk Bakat"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kode / Singkatan *</label>
                  <input
                    type="text"
                    required
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                    placeholder="misal: KEHADIRAN, PRAKTIK"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bobot Nilai (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={typeForm.weight_percentage}
                    onChange={(e) => setTypeForm({ ...typeForm, weight_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-amber-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Deskripsi / Aspek Penilaian</label>
                <textarea
                  rows={2}
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Keterangan penilaian..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Buat / Edit Sesi Penilaian Ekskul */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">
                {editingSession ? 'Edit Sesi Penilaian Ekskul' : 'Buat Sesi Ujian / Latihan Baru'}
              </h3>
              <button onClick={() => setSessionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Penilaian *</label>
                <select
                  required
                  value={sessionForm.assessment_type_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, assessment_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-800"
                >
                  <option value="">-- Pilih Jenis Penilaian --</option>
                  {assessmentTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code} - {t.weight_percentage}%)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Judul Sesi Penilaian *</label>
                <input
                  type="text"
                  required
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  placeholder="Contoh: Latihan Rutin Babak 1, Uji Kecakapan / Kenaikan Sabuk"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Pelaksanaan *</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.assessment_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, assessment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Skor Maksimal</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={sessionForm.max_score}
                    onChange={(e) => setSessionForm({ ...sessionForm, max_score: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-amber-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  placeholder="Catatan pelaksanaan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Sesi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Input Nilai Sesi Ekskul Siswa */}
      {sessionScoreModalOpen && activeSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Input Nilai Sesi: {activeSessionDetail.session?.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Kegiatan: <strong className="text-amber-700">{activeExtraName}</strong> • Rombel: <strong className="text-slate-800">{activeClassName}</strong>
                </p>
              </div>
              <button onClick={() => setSessionScoreModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSessionScores} className="flex-1 overflow-hidden flex flex-col space-y-3">
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3 w-24">NIS</th>
                      <th className="py-3 px-3 min-w-[200px]">Nama Siswa</th>
                      <th className="py-3 px-3 text-center bg-amber-50 font-black text-amber-900 w-28">
                        Skor Sesi (0-100)
                      </th>
                      <th className="py-3 px-3 min-w-[200px]">Catatan / Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeSessionDetail.students?.map((st, idx) => {
                      const studentData = sessionScoresMap[st.student_id] || { score: '', feedback: '' };
                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{st.nis || '-'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{st.student_name}</td>
                          <td className="py-2 px-3 text-center bg-amber-50/20">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={studentData.score !== undefined ? studentData.score : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSessionScoresMap(prev => ({
                                  ...prev,
                                  [st.student_id]: {
                                    ...(prev[st.student_id] || {}),
                                    score: val
                                  }
                                }));
                              }}
                              className="w-20 px-2 py-1 text-center font-black text-amber-950 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={studentData.feedback || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSessionScoresMap(prev => ({
                                  ...prev,
                                  [st.student_id]: {
                                    ...(prev[st.student_id] || {}),
                                    feedback: val
                                  }
                                }));
                              }}
                              placeholder="Catatan keaktifan..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSessionScoreModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Nilai Sesi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
