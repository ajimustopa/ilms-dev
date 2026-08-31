import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../../../shared/services/api';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Layers,
  Calendar,
  Save,
  Calculator,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
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
  Upload,
  FileUp,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Printer,
  Award,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  ClipboardList,
  FileText
} from 'lucide-react';

export default function InputNilai() {
  const { activeSchoolUnit, user } = useAuth();
  const fileInputRef = useRef(null);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('assessment_types'); 
  // 'assessment_types' | 'assessment_sessions' | 'recap_matrix' | 'report_processor' | 'ledger_print'

  // Master Filters State
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [learningObjectives, setLearningObjectives] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ----------------------------------------------------
  // SPREADSHEET IMPORT STATE
  // ----------------------------------------------------
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTargetType, setImportTargetType] = useState('session'); // 'session' | 'recap' | 'report'
  const [importFileName, setImportFileName] = useState('');
  const [importParsedRows, setImportParsedRows] = useState([]);
  const [importStats, setImportStats] = useState({ totalRows: 0, matchedCount: 0, unmatchedCount: 0 });
  const [importErrors, setImportErrors] = useState([]);

  // ----------------------------------------------------
  // TAB 1: JENIS PENGUJIAN & BOBOT RAPOR STATE
  // ----------------------------------------------------
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    weight_percentage: 30,
    is_tp_based: true,
    order_index: 1
  });

  // ----------------------------------------------------
  // TAB 2: PELAKSANAAN SESI PENILAIAN STATE
  // ----------------------------------------------------
  const [assessmentSessions, setAssessmentSessions] = useState([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    assessment_type_id: '',
    assessment_date: new Date().toISOString().split('T')[0],
    learning_objective_ids: [],
    max_score: 100,
    notes: ''
  });

  // Modal Input Nilai per Sesi
  const [sessionScoreModalOpen, setSessionScoreModalOpen] = useState(false);
  const [activeSessionDetail, setActiveSessionDetail] = useState(null);
  const [sessionScoresMap, setSessionScoresMap] = useState({}); // { [student_id]: { score, feedback, tp_scores: { [tp_id]: score } } }

  // ----------------------------------------------------
  // TAB 3: REKAP MATRIKS NILAI PER TP & JENIS UJIAN STATE
  // ----------------------------------------------------
  const [recapData, setRecapData] = useState(null);
  const [recapMatrixEdit, setRecapMatrixEdit] = useState({}); // { [student_id]: { tp_averages: {}, type_averages: {} } }

  // ----------------------------------------------------
  // TAB 4: PENGOLAHAN NILAI RAPOR & DESKRIPSI TP STATE
  // ----------------------------------------------------
  const [reportItems, setReportItems] = useState([]); // [{ student_id, student_name, nis, final_score, tp_scores, type_scores, competency_description, predicate }]
  const [processingReport, setProcessingReport] = useState(false);

  // ----------------------------------------------------
  // TAB 5: BUKU NILAI (LEGER) & CETAK RAPOR STATE
  // ----------------------------------------------------
  const [legerData, setLegerData] = useState(null);
  const [previewStudentReport, setPreviewStudentReport] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchInitialData();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchSemesters();
      fetchClasses();
      fetchSubjects();
    }
  }, [selectedAcademicYearId]);

  useEffect(() => {
    if (selectedSubjectId && selectedSemesterId && selectedClassId) {
      fetchLearningObjectives();
    }
  }, [selectedSubjectId, selectedSemesterId, selectedClassId]);

  // Tab change reactive fetching
  useEffect(() => {
    if (activeTab === 'assessment_types') {
      fetchAssessmentTypes();
    } else if (activeTab === 'assessment_sessions') {
      if (selectedClassId && selectedSubjectId && selectedSemesterId) {
        fetchAssessmentSessions();
      }
    } else if (activeTab === 'recap_matrix') {
      if (selectedClassId && selectedSubjectId && selectedSemesterId) {
        fetchRecapMatrix();
      }
    } else if (activeTab === 'report_processor') {
      if (selectedClassId && selectedSubjectId && selectedSemesterId) {
        fetchReportProcessorData();
      }
    } else if (activeTab === 'ledger_print') {
      if (selectedClassId && selectedSemesterId) {
        fetchLeger();
      }
    }
  }, [activeTab, selectedClassId, selectedSubjectId, selectedSemesterId, selectedAcademicYearId]);

  // ----------------------------------------------------
  // FETCHERS
  // ----------------------------------------------------
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [ayRes, typeRes] = await Promise.all([
        api.get('/akademik/academic-years'),
        api.get('/akademik/assessment-types', { params: { satuan_pendidikan_id: activeSchoolUnit?.id || 1 } })
      ]);

      const ays = ayRes.data?.data || [];
      setAcademicYears(ays);
      setAssessmentTypes(typeRes.data?.data || []);

      const activeAy = ays.find(y => y.is_active) || ays[0];
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
      const res = await api.get('/akademik/semesters', {
        params: { academic_year_id: selectedAcademicYearId }
      });
      const sems = res.data?.data || [];
      setSemesters(sems);
      const activeSem = sems.find(s => s.is_active) || sems[0];
      if (activeSem) setSelectedSemesterId(String(activeSem.id));
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/akademik/class-groups', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          type: 'reguler'
        }
      });
      const allCls = res.data?.data || [];
      // Pastikan rombel ekskul disaring keluar dari Input Nilai Mapel
      const regularCls = allCls.filter(c => c.type !== 'ekskul' && !c.extracurricular_id && !c.is_ekskul);
      setClasses(regularCls);
      if (regularCls.length > 0) setSelectedClassId(String(regularCls[0].id));
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/akademik/subjects', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id || 1 }
      });
      const subs = res.data?.data || [];
      setSubjects(subs);
      if (subs.length > 0) setSelectedSubjectId(String(subs[0].id));
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchLearningObjectives = async () => {
    try {
      const currentClass = classes.find(c => String(c.id) === String(selectedClassId));
      const res = await api.get('/akademik/learning-objectives', {
        params: {
          subject_id: selectedSubjectId,
          semester_id: selectedSemesterId,
          grade_level_id: currentClass?.grade_level_id
        }
      });
      setLearningObjectives(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching TPs:', err);
    }
  };

  const fetchAssessmentTypes = async () => {
    try {
      const res = await api.get('/akademik/assessment-types', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id || 1 }
      });
      setAssessmentTypes(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching assessment types:', err);
    }
  };

  const fetchAssessmentSessions = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await api.get('/akademik/assessment-sessions', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId,
          semester_id: selectedSemesterId,
          class_group_id: selectedClassId,
          subject_id: selectedSubjectId
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
    if (!selectedClassId || !selectedSubjectId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await api.get('/akademik/scores/recap-matrix', {
        params: {
          class_group_id: selectedClassId,
          subject_id: selectedSubjectId,
          semester_id: selectedSemesterId,
          satuan_pendidikan_id: activeSchoolUnit?.id || 1
        }
      });
      const data = res.data?.data;
      setRecapData(data);
      // Inisialisasi editable matrix
      const initialEdit = {};
      if (data?.matrix) {
        Object.entries(data.matrix).forEach(([sId, m]) => {
          initialEdit[sId] = {
            tp_averages: { ...(m.tp_averages || {}) },
            type_averages: { ...(m.type_averages || {}) }
          };
        });
      }
      setRecapMatrixEdit(initialEdit);
    } catch (err) {
      console.error('Error fetching recap matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportProcessorData = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await api.get('/akademik/scores/recap-matrix', {
        params: {
          class_group_id: selectedClassId,
          subject_id: selectedSubjectId,
          semester_id: selectedSemesterId,
          satuan_pendidikan_id: activeSchoolUnit?.id || 1
        }
      });
      const data = res.data?.data;
      if (!data) return;

      const targetKkm = data.kkm || 75;
      const tps = data.learning_objectives || [];
      const types = data.assessment_types || [];

      // Siapkan baris laporan per siswa
      const items = (data.students || []).map(st => {
        const m = data.matrix?.[st.student_id] || {};
        const storedFinal = m.stored_final;
        const calcFinal = m.calculated_final;
        const currentFinal = storedFinal !== null && storedFinal !== undefined ? storedFinal : calcFinal;

        // Auto-generate narasi jika belum ada
        let narrative = m.competency_description;
        if (!narrative) {
          narrative = buildAutoCompetencyDescription(m.tp_averages || {}, tps, targetKkm);
        }

        let predicate = 'C';
        if (currentFinal >= 90) predicate = 'A';
        else if (currentFinal >= 80) predicate = 'B';
        else if (currentFinal >= 70) predicate = 'C';
        else predicate = 'D';

        return {
          student_id: st.student_id,
          student_name: st.student_name,
          nis: st.nis,
          final_score: currentFinal !== null ? currentFinal : '',
          calculated_final: calcFinal,
          stored_final: storedFinal,
          predicate,
          tp_scores: m.tp_averages || {},
          type_scores: m.type_averages || {},
          competency_description: narrative || '',
          is_locked: false
        };
      });

      setReportItems(items);
    } catch (err) {
      console.error('Error loading report processor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeger = async () => {
    if (!selectedClassId || !selectedSemesterId) return;
    try {
      setLoading(true);
      const res = await api.get('/akademik/scores/leger', {
        params: {
          class_group_id: selectedClassId,
          semester_id: selectedSemesterId
        }
      });
      setLegerData(res.data?.data);
    } catch (err) {
      console.error('Error fetching leger:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // HELPER: Auto-Generate Narrative Template Kurikulum Merdeka
  // Template: "Mencapai kompetensi dengan sangat baik dalam .... Perlu peningkatan dalam ..."
  // ----------------------------------------------------
  const buildAutoCompetencyDescription = (tpScoresMap, tpsList, kkmVal = 75) => {
    const validTpEntries = [];
    tpsList.forEach(tp => {
      const score = tpScoresMap[tp.id];
      if (score !== null && score !== undefined && score !== '' && !isNaN(score)) {
        validTpEntries.push({
          id: tp.id,
          code: tp.code,
          description: tp.description || tp.code,
          score: parseFloat(score)
        });
      }
    });

    if (validTpEntries.length === 0) {
      return '';
    }

    // Urutkan dari tertinggi ke terendah
    validTpEntries.sort((a, b) => b.score - a.score);

    const highest = validTpEntries[0];
    const lowest = validTpEntries[validTpEntries.length - 1];

    const sentences = [];

    // Capaian Tertinggi
    if (highest && highest.score >= kkmVal) {
      sentences.push(`Mencapai kompetensi dengan sangat baik dalam ${highest.description}.`);
    } else if (highest) {
      sentences.push(`Menunjukkan penguasaan dalam ${highest.description}.`);
    }

    // Perlu Peningkatan
    if (lowest && (lowest.id !== highest.id || lowest.score < kkmVal)) {
      if (lowest.score < kkmVal) {
        sentences.push(`Perlu peningkatan dan pendampingan dalam ${lowest.description}.`);
      } else if (validTpEntries.length > 1) {
        sentences.push(`Perlu peningkatan dalam ${lowest.description}.`);
      }
    }

    return sentences.join(' ');
  };

  // ----------------------------------------------------
  // HANDLERS TAB 1: JENIS PENGUJIAN
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
      is_tp_based: true,
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
      setErrorMsg('Nama dan kode jenis pengujian wajib diisi');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        academic_year_id: selectedAcademicYearId,
        ...typeForm
      };

      if (editingType) {
        await api.put(`/akademik/assessment-types/${editingType.id}`, payload);
        setSuccessMsg('Jenis pengujian berhasil diperbarui!');
      } else {
        await api.post('/akademik/assessment-types', payload);
        setSuccessMsg('Jenis pengujian baru berhasil ditambahkan!');
      }

      setTypeModalOpen(false);
      fetchAssessmentTypes();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan jenis pengujian');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = async (id, name) => {
    if (!window.confirm(`Hapus jenis pengujian "${name}"? Seluruh sesi dan nilai terkait jenis ini akan ikut terhapus.`)) {
      return;
    }

    try {
      await api.delete(`/akademik/assessment-types/${id}`);
      setSuccessMsg(`Jenis pengujian "${name}" berhasil dihapus.`);
      fetchAssessmentTypes();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus jenis pengujian');
    }
  };

  // ----------------------------------------------------
  // HANDLERS TAB 2: SESI PENILAIAN & INPUT NILAI
  // ----------------------------------------------------
  const handleOpenAddSession = () => {
    setEditingSession(null);
    setSessionForm({
      title: '',
      assessment_type_id: assessmentTypes[0]?.id || '',
      assessment_date: new Date().toISOString().split('T')[0],
      learning_objective_ids: learningObjectives.length > 0 ? [learningObjectives[0].id] : [],
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
      learning_objective_ids: session.learning_objective_ids || [],
      max_score: session.max_score || 100,
      notes: session.notes || ''
    });
    setSessionModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.title.trim() || !sessionForm.assessment_type_id) {
      setErrorMsg('Judul sesi dan jenis pengujian wajib dipilih');
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
        subject_id: selectedSubjectId,
        ...sessionForm
      };

      if (editingSession) {
        await api.put(`/akademik/assessment-sessions/${editingSession.id}`, payload);
        setSuccessMsg('Sesi penilaian berhasil diperbarui!');
      } else {
        await api.post('/akademik/assessment-sessions', payload);
        setSuccessMsg('Sesi penilaian baru berhasil dibuat!');
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

  // Input Nilai Sesi Modal
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
          tp_scores: { ...(st.tp_scores || {}) }
        };
      });
      setSessionScoresMap(sMap);
      setSessionScoreModalOpen(true);
    } catch (err) {
      setErrorMsg('Gagal memuat data nilai sesi ujian');
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
        feedback: data.feedback,
        tp_scores: data.tp_scores
      }));

      await api.post(`/akademik/assessment-sessions/${activeSessionDetail.session.id}/scores`, { items });
      setSuccessMsg('Nilai siswa pada sesi penilaian berhasil disimpan & disinkronkan!');
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
  // HANDLERS TAB 3: REKAP MATRIKS NILAI
  // ----------------------------------------------------
  const handleAutoAverageRecap = () => {
    if (!recapData) return;
    const newEdit = {};
    (recapData.students || []).forEach(st => {
      const sId = st.student_id;
      const m = recapData.matrix?.[sId] || {};
      newEdit[sId] = {
        tp_averages: { ...(m.tp_averages || {}) },
        type_averages: { ...(m.type_averages || {}) }
      };
    });
    setRecapMatrixEdit(newEdit);
    setSuccessMsg('Rata-rata nilai per TP dan Jenis Pengujian berhasil dikalkulasi ulang!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ----------------------------------------------------
  // HANDLERS TAB 4: PENGOLAHAN NILAI RAPOR & DESKRIPSI TP
  // ----------------------------------------------------
  const handleGenerateAllNarratives = () => {
    const targetKkm = recapData?.kkm || 75;
    const tps = recapData?.learning_objectives || learningObjectives || [];

    const updated = reportItems.map(item => {
      const generated = buildAutoCompetencyDescription(item.tp_scores || {}, tps, targetKkm);
      return {
        ...item,
        competency_description: generated || item.competency_description
      };
    });

    setReportItems(updated);
    setSuccessMsg('Deskripsi naratif capaian kompetensi berhasil di-generate untuk seluruh siswa!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveProcessedReport = async () => {
    if (reportItems.length === 0) return;
    setProcessingReport(true);
    setErrorMsg('');
    try {
      const payload = {
        class_group_id: Number(selectedClassId),
        subject_id: Number(selectedSubjectId),
        semester_id: Number(selectedSemesterId),
        academic_year_id: Number(selectedAcademicYearId),
        items: reportItems.map(item => ({
          student_id: item.student_id,
          final_score: item.final_score !== '' ? parseFloat(item.final_score) : null,
          tp_scores: item.tp_scores,
          competency_description: item.competency_description
        }))
      };

      await api.post('/akademik/scores/process-report', payload);
      setSuccessMsg('Nilai akhir rapor dan deskripsi capaian kompetensi berhasil disimpan dan dikunci!');
      fetchReportProcessorData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan pengolahan nilai rapor');
    } finally {
      setProcessingReport(false);
    }
  };

  // 5. Cetak Leger & Preview Rapor Siswa (Tab 5)
  const handlePrintLeger = () => {
    window.print();
  };

  const handleOpenStudentReportPreview = (student) => {
    setPreviewStudentReport(student);
    setReportModalOpen(true);
  };

  // ----------------------------------------------------
  // SPREADSHEET TEMPLATES & IMPORT HANDLERS
  // ----------------------------------------------------
  
  // 1. Download Template Sesi Penilaian
  const handleDownloadSessionTemplate = () => {
    if (!activeSessionDetail || !activeSessionDetail.session) return;
    const session = activeSessionDetail.session;
    const tps = session.learning_objectives || [];
    const students = activeSessionDetail.students || [];

    const aoa = [
      ['TEMPLATE NILAI SESI PENILAIAN'],
      ['Satuan Pendidikan', activeSchoolUnit?.name || 'Sekolah'],
      ['Tahun Ajaran', academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || ''],
      ['Semester', activeSemesterName],
      ['Rombongan Belajar', activeClassName],
      ['Mata Pelajaran', activeSubjectName],
      ['Judul Sesi Penilaian', session.title],
      ['Jenis Pengujian', session.assessment_type_name || ''],
      ['Tanggal Pelaksanaan', session.assessment_date ? session.assessment_date.split('T')[0] : ''],
      ['Skor Maksimal', session.max_score || 100],
      ['Petunjuk Pengisian', 'Isi nilai siswa pada kolom nilai (0-100). Jangan mengubah nilai kolom ID_SISWA atau NIS.'],
      []
    ];

    const tableHeader = ['NO', 'ID_SISWA', 'NIS', 'NAMA_SISWA'];
    if (tps.length > 0) {
      tps.forEach(tp => {
        tableHeader.push(`${tp.code} (0-100)`);
      });
    }
    tableHeader.push('SKOR_TOTAL');
    tableHeader.push('FEEDBACK_CATATAN');
    aoa.push(tableHeader);

    students.forEach((st, idx) => {
      const studentData = sessionScoresMap[st.student_id] || { score: '', feedback: '', tp_scores: {} };
      const row = [
        idx + 1,
        st.student_id,
        st.nis || '',
        st.student_name
      ];
      if (tps.length > 0) {
        tps.forEach(tp => {
          const val = studentData.tp_scores?.[tp.id];
          row.push(val !== undefined && val !== '' && val !== null ? Number(val) : '');
        });
      }
      row.push(studentData.score !== undefined && studentData.score !== '' && studentData.score !== null ? Number(studentData.score) : '');
      row.push(studentData.feedback || '');
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = [{ wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 32 }];
    if (tps.length > 0) {
      tps.forEach(() => colWidths.push({ wch: 16 }));
    }
    colWidths.push({ wch: 14 });
    colWidths.push({ wch: 35 });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai_Sesi');

    const cleanTitle = (session.title || 'Sesi').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanSubject = activeSubjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanClass = activeClassName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Template_Nilai_${cleanSubject}_${cleanClass}_${cleanTitle}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 2. Download Template Matriks Nilai (Tab 3)
  const handleDownloadRecapTemplate = () => {
    if (!recapData || !recapData.students) return;
    const tps = recapData.learning_objectives || [];
    const types = recapData.assessment_types || [];
    const students = recapData.students || [];

    const aoa = [
      ['TEMPLATE REKAP MATRIKS NILAI MATA PELAJARAN'],
      ['Satuan Pendidikan', activeSchoolUnit?.name || 'Sekolah'],
      ['Tahun Ajaran', academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || ''],
      ['Semester', activeSemesterName],
      ['Rombongan Belajar', activeClassName],
      ['Mata Pelajaran', activeSubjectName],
      ['Standar KKM', recapData.kkm || 75],
      ['Petunjuk Pengisian', 'Isi nilai rata-rata TP dan Jenis Penilaian (0-100). Jangan mengubah kolom ID_SISWA atau NIS.'],
      []
    ];

    const tableHeader = ['NO', 'ID_SISWA', 'NIS', 'NAMA_SISWA'];
    tps.forEach(tp => {
      tableHeader.push(`TP_${tp.code}_[ID:${tp.id}]`);
    });
    types.forEach(type => {
      tableHeader.push(`JENIS_${type.code}_[ID:${type.id}]`);
    });
    aoa.push(tableHeader);

    students.forEach((st, idx) => {
      const sId = st.student_id;
      const m = recapData.matrix?.[sId] || {};
      const row = [
        idx + 1,
        sId,
        st.nis || '',
        st.student_name
      ];
      tps.forEach(tp => {
        const val = m.tp_averages?.[tp.id];
        row.push(val !== undefined && val !== null ? Number(val) : '');
      });
      types.forEach(type => {
        const val = m.type_averages?.[type.id];
        row.push(val !== undefined && val !== null ? Number(val) : '');
      });
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = [{ wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 32 }];
    tps.forEach(() => colWidths.push({ wch: 18 }));
    types.forEach(() => colWidths.push({ wch: 18 }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriks_Nilai');

    const cleanSubject = activeSubjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanClass = activeClassName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Template_Matriks_Nilai_${cleanSubject}_${cleanClass}_${activeSemesterName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 3. Download Template Nilai Rapor & Deskripsi TP (Tab 4)
  const handleDownloadReportTemplate = () => {
    if (reportItems.length === 0) return;
    const aoa = [
      ['TEMPLATE NILAI AKHIR RAPOR & NARASI CAPAIAN TP'],
      ['Satuan Pendidikan', activeSchoolUnit?.name || 'Sekolah'],
      ['Tahun Ajaran', academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || ''],
      ['Semester', activeSemesterName],
      ['Rombongan Belajar', activeClassName],
      ['Mata Pelajaran', activeSubjectName],
      ['Petunjuk Pengisian', 'Isi Nilai Akhir Rapor (0-100) dan Deskripsi Capaian Kompetensi Rapor.'],
      []
    ];

    const tableHeader = ['NO', 'ID_SISWA', 'NIS', 'NAMA_SISWA', 'NILAI_AKHIR', 'PREDIKAT', 'DESKRIPSI_CAPAIAN_RAPOR'];
    aoa.push(tableHeader);

    reportItems.forEach((item, idx) => {
      aoa.push([
        idx + 1,
        item.student_id,
        item.nis || '',
        item.student_name,
        item.final_score !== '' && item.final_score !== null ? Number(item.final_score) : '',
        item.predicate || '',
        item.competency_description || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 14 },
      { wch: 10 },
      { wch: 65 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai_Rapor');

    const cleanSubject = activeSubjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanClass = activeClassName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Template_Nilai_Rapor_${cleanSubject}_${cleanClass}_${activeSemesterName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Trigger File Input Selector
  const handleTriggerFileInput = (targetType) => {
    setImportTargetType(targetType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process Uploaded Spreadsheet File
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportErrors([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (!rawRows || rawRows.length === 0) {
        alert('File spreadsheet kosong atau tidak memiliki data yang valid.');
        return;
      }

      // Cari baris header tabel yang tepat (menghindari baris metadata/petunjuk di atas)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(30, rawRows.length); i++) {
        const row = rawRows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        const rowCellsUpper = row.map(cell => String(cell || '').trim().toUpperCase());
        const rowJoined = rowCellsUpper.join(' | ');

        // Lewati baris judul file atau petunjuk
        if (
          rowJoined.startsWith('TEMPLATE') ||
          rowJoined.includes('PETUNJUK PENGISIAN') ||
          rowJoined.includes('SATUAN PENDIDIKAN') ||
          rowJoined.includes('TAHUN AJARAN') ||
          rowJoined.includes('ROMBONGAN BELAJAR')
        ) {
          continue;
        }

        const hasNama = rowCellsUpper.some(c => c.includes('NAMA') || c.includes('STUDENT'));
        const hasIdOrNisOrNo = rowCellsUpper.some(c => c.includes('NIS') || c.includes('ID_SISWA') || c.includes('ID SISWA') || c === 'NO' || c === 'NO.');

        if (hasNama && hasIdOrNisOrNo) {
          headerRowIndex = i;
          break;
        }

        if (rowCellsUpper.some(c => c === 'NAMA' || c === 'NAMA_SISWA' || c === 'NAMA SISWA' || c === 'NAMA LENGKAP')) {
          headerRowIndex = i;
          break;
        }
      }

      // Fallback jika headerRowIndex tidak ditemukan: gunakan baris pertama yang memiliki > 2 kolom
      if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(15, rawRows.length); i++) {
          if (rawRows[i] && rawRows[i].filter(Boolean).length >= 3) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        alert('Tidak dapat menemukan baris kolom tabel (ID_SISWA / NIS / NAMA_SISWA) pada spreadsheet.');
        return;
      }

      const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
      const dataRows = rawRows.slice(headerRowIndex + 1);

      // Cari index kolom-kolom kunci
      const idSiswaIdx = headers.findIndex(h => /ID_SISWA|STUDENT_ID|ID SISWA|ID_STUDENT|^ID$/i.test(h));
      const nisIdx = headers.findIndex(h => /^NISN?$|NO INDUK|NOMOR INDUK/i.test(h));
      const namaIdx = headers.findIndex(h => /NAMA|STUDENT_NAME|STUDENT/i.test(h));
      const skorTotalIdx = headers.findIndex(h => /SKOR_TOTAL|SKOR TOTAL|NILAI_AKHIR|NILAI AKHIR|^SKOR$|^TOTAL$|^NILAI$/i.test(h));
      const feedbackIdx = headers.findIndex(h => /FEEDBACK|CATATAN|KETERANGAN/i.test(h));
      const deskripsiIdx = headers.findIndex(h => /DESKRIPSI|NARASI|CAPAIAN/i.test(h));

      // Normalisasi helper untuk nama
      const normalizeStr = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Parsing sesuai Target Type
      if (importTargetType === 'session') {
        const targetStudents = activeSessionDetail?.students || [];
        const sessionTps = activeSessionDetail?.session?.learning_objectives || [];

        // Petakan index kolom TP
        const tpColMap = {};
        sessionTps.forEach(tp => {
          const tpIdx = headers.findIndex(h => {
            const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            const codeClean = tp.code.toLowerCase().replace(/[^a-z0-9]/g, '');
            return hClean.includes(codeClean) || hClean.includes(`id${tp.id}`);
          });
          if (tpIdx !== -1) tpColMap[tp.id] = tpIdx;
        });

        const parsed = [];
        let matched = 0;

        dataRows.forEach(row => {
          if (!row || row.filter(Boolean).length === 0) return;
          const rawId = idSiswaIdx !== -1 && row[idSiswaIdx] !== '' ? String(row[idSiswaIdx]).trim() : null;
          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawNama = namaIdx !== -1 ? String(row[namaIdx] || '').trim() : '';

          if (!rawId && !rawNis && !rawNama) return;

          // Match student
          let student = null;
          if (rawId) {
            student = targetStudents.find(s => String(s.student_id).trim() === rawId);
          }
          if (!student && rawNis) {
            student = targetStudents.find(s => String(s.nis || '').trim() === rawNis);
          }
          if (!student && rawNama) {
            const cleanInputName = normalizeStr(rawNama);
            student = targetStudents.find(s => normalizeStr(s.student_name) === cleanInputName);
            if (!student) {
              student = targetStudents.find(s => normalizeStr(s.student_name).includes(cleanInputName) || cleanInputName.includes(normalizeStr(s.student_name)));
            }
          }

          if (student) {
            matched++;
            const tpScores = {};
            sessionTps.forEach(tp => {
              const colIdx = tpColMap[tp.id];
              if (colIdx !== undefined && row[colIdx] !== undefined && row[colIdx] !== '') {
                const num = parseFloat(row[colIdx]);
                if (!isNaN(num)) tpScores[tp.id] = Math.min(100, Math.max(0, num));
              }
            });

            let finalScore = null;
            if (skorTotalIdx !== -1 && row[skorTotalIdx] !== undefined && row[skorTotalIdx] !== '') {
              const num = parseFloat(row[skorTotalIdx]);
              if (!isNaN(num)) finalScore = Math.min(100, Math.max(0, num));
            } else if (Object.keys(tpScores).length > 0) {
              const vals = Object.values(tpScores);
              finalScore = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
            }

            const feedback = feedbackIdx !== -1 && row[feedbackIdx] ? String(row[feedbackIdx]).trim() : '';

            parsed.push({
              student_id: student.student_id,
              nis: student.nis,
              student_name: student.student_name,
              score: finalScore,
              tp_scores: tpScores,
              feedback,
              status: 'matched'
            });
          } else {
            parsed.push({
              student_id: null,
              nis: rawNis,
              student_name: rawNama || 'Tidak Ditemukan',
              score: skorTotalIdx !== -1 && row[skorTotalIdx] !== '' ? row[skorTotalIdx] : null,
              tp_scores: {},
              feedback: '',
              status: 'unmatched'
            });
          }
        });

        setImportParsedRows(parsed);
        setImportStats({
          totalRows: parsed.length,
          matchedCount: matched,
          unmatchedCount: parsed.length - matched
        });
        setImportModalOpen(true);
      } else if (importTargetType === 'recap') {
        const targetStudents = recapData?.students || [];
        const tps = recapData?.learning_objectives || [];
        const types = recapData?.assessment_types || [];

        const tpColMap = {};
        tps.forEach(tp => {
          const idx = headers.findIndex(h => {
            const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            const codeClean = tp.code.toLowerCase().replace(/[^a-z0-9]/g, '');
            return hClean.includes(`id${tp.id}`) || hClean.includes(`tp${codeClean}`) || hClean === codeClean;
          });
          if (idx !== -1) tpColMap[tp.id] = idx;
        });

        const typeColMap = {};
        types.forEach(t => {
          const idx = headers.findIndex(h => {
            const hClean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            const codeClean = t.code.toLowerCase().replace(/[^a-z0-9]/g, '');
            return hClean.includes(`id${t.id}`) || hClean.includes(`jenis${codeClean}`) || hClean === codeClean;
          });
          if (idx !== -1) typeColMap[t.id] = idx;
        });

        const parsed = [];
        let matched = 0;

        dataRows.forEach(row => {
          if (!row || row.filter(Boolean).length === 0) return;
          const rawId = idSiswaIdx !== -1 && row[idSiswaIdx] !== '' ? String(row[idSiswaIdx]).trim() : null;
          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawNama = namaIdx !== -1 ? String(row[namaIdx] || '').trim() : '';

          if (!rawId && !rawNis && !rawNama) return;

          let student = null;
          if (rawId) student = targetStudents.find(s => String(s.student_id).trim() === rawId);
          if (!student && rawNis) student = targetStudents.find(s => String(s.nis || '').trim() === rawNis);
          if (!student && rawNama) {
            const cleanInputName = normalizeStr(rawNama);
            student = targetStudents.find(s => normalizeStr(s.student_name) === cleanInputName);
            if (!student) {
              student = targetStudents.find(s => normalizeStr(s.student_name).includes(cleanInputName) || cleanInputName.includes(normalizeStr(s.student_name)));
            }
          }

          if (student) {
            matched++;
            const tpAvgs = {};
            tps.forEach(tp => {
              const colIdx = tpColMap[tp.id];
              if (colIdx !== undefined && row[colIdx] !== undefined && row[colIdx] !== '') {
                const num = parseFloat(row[colIdx]);
                if (!isNaN(num)) tpAvgs[tp.id] = Math.min(100, Math.max(0, num));
              }
            });

            const typeAvgs = {};
            types.forEach(t => {
              const colIdx = typeColMap[t.id];
              if (colIdx !== undefined && row[colIdx] !== undefined && row[colIdx] !== '') {
                const num = parseFloat(row[colIdx]);
                if (!isNaN(num)) typeAvgs[t.id] = Math.min(100, Math.max(0, num));
              }
            });

            parsed.push({
              student_id: student.student_id,
              nis: student.nis,
              student_name: student.student_name,
              tp_averages: tpAvgs,
              type_averages: typeAvgs,
              status: 'matched'
            });
          } else {
            parsed.push({
              student_id: null,
              nis: rawNis,
              student_name: rawNama || 'Tidak Ditemukan',
              tp_averages: {},
              type_averages: {},
              status: 'unmatched'
            });
          }
        });

        setImportParsedRows(parsed);
        setImportStats({
          totalRows: parsed.length,
          matchedCount: matched,
          unmatchedCount: parsed.length - matched
        });
        setImportModalOpen(true);
      } else if (importTargetType === 'report') {
        const parsed = [];
        let matched = 0;

        dataRows.forEach(row => {
          if (!row || row.filter(Boolean).length === 0) return;
          const rawId = idSiswaIdx !== -1 && row[idSiswaIdx] !== '' ? String(row[idSiswaIdx]).trim() : null;
          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawNama = namaIdx !== -1 ? String(row[namaIdx] || '').trim() : '';

          if (!rawId && !rawNis && !rawNama) return;

          let item = null;
          if (rawId) item = reportItems.find(r => String(r.student_id).trim() === rawId);
          if (!item && rawNis) item = reportItems.find(r => String(r.nis || '').trim() === rawNis);
          if (!item && rawNama) {
            const cleanInputName = normalizeStr(rawNama);
            item = reportItems.find(r => normalizeStr(r.student_name) === cleanInputName);
            if (!item) {
              item = reportItems.find(r => normalizeStr(r.student_name).includes(cleanInputName) || cleanInputName.includes(normalizeStr(r.student_name)));
            }
          }

          if (item) {
            matched++;
            let finalVal = item.final_score;
            if (skorTotalIdx !== -1 && row[skorTotalIdx] !== undefined && row[skorTotalIdx] !== '') {
              const num = parseFloat(row[skorTotalIdx]);
              if (!isNaN(num)) finalVal = Math.min(100, Math.max(0, num));
            }

            const narrative = deskripsiIdx !== -1 && row[deskripsiIdx] ? String(row[deskripsiIdx]).trim() : item.competency_description;

            parsed.push({
              student_id: item.student_id,
              nis: item.nis,
              student_name: item.student_name,
              final_score: finalVal,
              competency_description: narrative,
              status: 'matched'
            });
          } else {
            parsed.push({
              student_id: null,
              nis: rawNis,
              student_name: rawNama || 'Tidak Ditemukan',
              final_score: null,
              competency_description: '',
              status: 'unmatched'
            });
          }
        });

        setImportParsedRows(parsed);
        setImportStats({
          totalRows: parsed.length,
          matchedCount: matched,
          unmatchedCount: parsed.length - matched
        });
        setImportModalOpen(true);
      }
    } catch (err) {
      console.error('Error parsing spreadsheet:', err);
      alert('Terjadi kesalahan saat membaca file spreadsheet: ' + err.message);
    }
  };

  // Apply Imported Data into Forms/State
  const handleApplyImport = () => {
    const matchedRows = importParsedRows.filter(r => r.status === 'matched');
    if (matchedRows.length === 0) {
      alert('Tidak ada data siswa yang cocok untuk diterapkan.');
      return;
    }

    if (importTargetType === 'session') {
      setSessionScoresMap(prev => {
        const updated = { ...prev };
        matchedRows.forEach(row => {
          const curr = updated[row.student_id] || { score: '', feedback: '', tp_scores: {} };
          updated[row.student_id] = {
            score: row.score !== null ? row.score : curr.score,
            feedback: row.feedback || curr.feedback,
            tp_scores: { ...(curr.tp_scores || {}), ...(row.tp_scores || {}) }
          };
        });
        return updated;
      });
      setSuccessMsg(`Berhasil mengimpor nilai untuk ${matchedRows.length} siswa pada sesi penilaian!`);
    } else if (importTargetType === 'recap') {
      setRecapMatrixEdit(prev => {
        const updated = { ...prev };
        matchedRows.forEach(row => {
          const curr = updated[row.student_id] || { tp_averages: {}, type_averages: {} };
          updated[row.student_id] = {
            tp_averages: { ...(curr.tp_averages || {}), ...(row.tp_averages || {}) },
            type_averages: { ...(curr.type_averages || {}), ...(row.type_averages || {}) }
          };
        });
        return updated;
      });
      setSuccessMsg(`Berhasil mengimpor matriks nilai untuk ${matchedRows.length} siswa!`);
    } else if (importTargetType === 'report') {
      setReportItems(prev => {
        return prev.map(item => {
          const match = matchedRows.find(m => String(m.student_id) === String(item.student_id));
          if (!match) return item;

          const finalScore = match.final_score !== null ? match.final_score : item.final_score;
          const num = parseFloat(finalScore) || 0;
          let predicate = 'C';
          if (num >= 90) predicate = 'A';
          else if (num >= 80) predicate = 'B';
          else if (num >= 70) predicate = 'C';
          else predicate = 'D';

          return {
            ...item,
            final_score: finalScore,
            predicate,
            competency_description: match.competency_description || item.competency_description
          };
        });
      });
      setSuccessMsg(`Berhasil mengimpor nilai rapor & narasi untuk ${matchedRows.length} siswa!`);
    }

    setImportModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Active Subject & Class Labels
  const activeClassName = classes.find(c => String(c.id) === String(selectedClassId))?.name || 'Pilih Rombel';
  const activeSubjectName = subjects.find(s => String(s.id) === String(selectedSubjectId))?.name || 'Pilih Mapel';
  const activeSemesterName = semesters.find(s => String(s.id) === String(selectedSemesterId))?.name || 'Semester';

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Input Nilai Mata Pelajaran (Mapel)</span>
              <span className="text-[10px] px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-bold uppercase tracking-wider">
                Kurikulum Merdeka
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola jenis pengujian, sesi penilaian berulang per TP, rekapitulasi rata-rata, hingga generate nilai rapor & narasi capaian mata pelajaran.
            </p>
          </div>
        </div>

        {/* Global Toolbar Action */}
        <div className="flex items-center gap-2">
          {activeTab === 'assessment_types' && (
            <button
              onClick={handleOpenAddType}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Pengujian</span>
            </button>
          )}

          {activeTab === 'assessment_sessions' && (
            <button
              onClick={handleOpenAddSession}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Sesi Ujian / Tugas</span>
            </button>
          )}

          {activeTab === 'recap_matrix' && (
            <button
              onClick={handleAutoAverageRecap}
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
                title="Generate otomatis narasi capaian tertinggi & terendah berbasis Tujuan Pembelajaran (TP)"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Auto-Generate Narasi TP</span>
              </button>
              <button
                onClick={handleSaveProcessedReport}
                disabled={processingReport || reportItems.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
              >
                {processingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan & Kunci Nilai Rapor</span>
              </button>
            </>
          )}

          {activeTab === 'ledger_print' && (
            <button
              onClick={handlePrintLeger}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh Leger</span>
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
          { id: 'assessment_types', label: '1. Jenis Pengujian & Bobot (%)', icon: SlidersHorizontal },
          { id: 'assessment_sessions', label: '2. Pelaksanaan Sesi Penilaian', icon: Calendar },
          { id: 'recap_matrix', label: '3. Rekap Matriks Nilai & TP', icon: Layers },
          { id: 'report_processor', label: '4. Pengolahan Nilai Rapor & Narasi TP', icon: Sparkles },
          { id: 'ledger_print', label: '5. Buku Nilai (Leger) & Cetak Rapor', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
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

            {/* Rombel / Kelas */}
            <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-200 px-3 py-1.5 rounded-xl">
              <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-900">Rombel:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs bg-transparent font-bold text-indigo-950 focus:outline-none cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Mata Pelajaran (Kecuali Tab 5 Leger yang mencakup semua mapel) */}
            {activeTab !== 'ledger_print' && (
              <div className="flex items-center gap-1.5 bg-teal-50/70 border border-teal-200 px-3 py-1.5 rounded-xl">
                <BookOpen className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="text-[11px] font-bold text-teal-900">Mapel:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="text-xs bg-transparent font-bold text-teal-950 focus:outline-none cursor-pointer"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || '-'})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-medium block">
              Konfigurasi Aktif: <strong>{activeClassName}</strong> • <strong>{activeSemesterName}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TAB 1: MASTER JENIS PENGUJIAN & BOBOT NILAI RAPOR */}
      {/* ======================================================== */}
      {activeTab === 'assessment_types' && (
        <div className="space-y-4">
          {/* Summary Bobot Bar */}
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
                  Total Akumulasi Bobot Rapor: {totalWeight}%
                </span>
                <span className="text-[11px] opacity-80">
                  {totalWeight === 100
                    ? '✓ Total bobot pas 100%. Rumus kalkulasi Nilai Akhir Rapor siap digunakan.'
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

          {/* Table Assessment Types */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">Kode</th>
                  <th className="py-3 px-4">Nama Jenis Pengujian</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 w-32 text-center">Ruang Lingkup</th>
                  <th className="py-3 px-4 w-32 text-center bg-teal-50/60 font-black text-teal-900">
                    Bobot Rapor (%)
                  </th>
                  <th className="py-3 px-4 text-right w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assessmentTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      Belum ada jenis pengujian yang dikonfigurasi. Klik "+ Tambah Jenis Pengujian" di atas.
                    </td>
                  </tr>
                ) : (
                  assessmentTypes.map((type, idx) => (
                    <tr key={type.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                        <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 rounded-md">
                          {type.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{type.name}</td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">{type.description || '-'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          type.is_tp_based
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {type.is_tp_based ? 'Per Tujuan Pembelajaran (TP)' : 'Sumatif Global'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-teal-50/30">
                        <span className="px-3 py-1 bg-teal-600 text-white rounded-lg font-black text-xs shadow-2xs">
                          {type.weight_percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditType(type)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title="Edit Jenis Pengujian"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id, type.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Jenis Pengujian"
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
      {/* 2. TAB 2: PELAKSANAAN SESI PENILAIAN */}
      {/* ======================================================== */}
      {activeTab === 'assessment_sessions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">
                  Daftar Sesi Pengujian & Tugas: <span className="text-teal-700">{activeSubjectName}</span> ({activeClassName})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Setiap jenis penilaian dapat dilaksanakan berkali-kali per Tujuan Pembelajaran (TP). Klik tombol <strong>Input Nilai Siswa</strong> untuk mengisi skor.
                </p>
              </div>
              <button
                onClick={handleOpenAddSession}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-2xs"
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
                  <th className="py-3 px-4 min-w-[220px]">Tujuan Pembelajaran (TP) yang Diujikan</th>
                  <th className="py-3 px-4 w-28 text-center">Siswa Dinilai</th>
                  <th className="py-3 px-4 w-28 text-center bg-teal-50/50">Rata-Rata</th>
                  <th className="py-3 px-4 text-right w-48">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {assessmentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      Belum ada sesi penilaian yang dibuat untuk mapel & rombel ini. Klik tombol <strong>+ Sesi Baru</strong> untuk membuat pengujian pertama.
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
                      <td className="py-3.5 px-4">
                        {session.learning_objectives && session.learning_objectives.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {session.learning_objectives.map(tp => (
                              <span key={tp.id} className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[10px] font-mono font-bold" title={tp.description}>
                                {tp.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Semua TP / Global</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[11px]">
                          {session.scored_students_count} Siswa
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-teal-50/30 font-black text-teal-800">
                        {session.average_score !== null ? `${session.average_score}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSessionScoring(session.id)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs transition shadow-2xs inline-flex items-center gap-1"
                          title="Input Nilai Siswa untuk Sesi Ini"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Input Nilai</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSession(session)}
                          className="p-1 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                          title="Edit Pengaturan Sesi"
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
      {/* 3. TAB 3: REKAP MATRIKS NILAI PER TP & JENIS UJIAN */}
      {/* ======================================================== */}
      {activeTab === 'recap_matrix' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Matriks Nilai Rombel:</span>
              <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded font-bold">{activeClassName}</span>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">{activeSubjectName}</span>
              <span className="text-slate-400">• Standar KKM: <b>{recapData?.kkm || 75}</b></span>
            </div>
            
            {/* Action Buttons: Template & Import */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadRecapTemplate}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                title="Unduh format spreadsheet Excel (.xlsx) untuk rekap nilai TP dan Jenis Ujian rombel ini"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Unduh Template Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleTriggerFileInput('recap')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                title="Unggah spreadsheet nilai untuk mengisi matriks secara otomatis"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Nilai Spreadsheet</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th rowSpan={2} className="py-3 px-4 w-12 text-center border-r border-slate-200">No</th>
                  <th rowSpan={2} className="py-3 px-4 w-24 border-r border-slate-200">NIS</th>
                  <th rowSpan={2} className="py-3 px-4 min-w-[180px] border-r border-slate-200">Nama Siswa</th>
                  
                  {/* Header Kolom Tujuan Pembelajaran (TP) */}
                  {recapData?.learning_objectives && recapData.learning_objectives.length > 0 && (
                    <th
                      colSpan={recapData.learning_objectives.length}
                      className="py-2 px-3 text-center bg-teal-50/70 border-r border-teal-200 text-teal-950 font-black"
                    >
                      Rata-Rata Nilai per Tujuan Pembelajaran (TP)
                    </th>
                  )}

                  {/* Header Kolom Jenis Pengujian */}
                  {recapData?.assessment_types && recapData.assessment_types.length > 0 && (
                    <th
                      colSpan={recapData.assessment_types.length}
                      className="py-2 px-3 text-center bg-indigo-50/70 border-r border-indigo-200 text-indigo-950 font-black"
                    >
                      Rata-Rata per Jenis Penilaian (Bobot %)
                    </th>
                  )}

                  <th rowSpan={2} className="py-3 px-4 text-center bg-teal-600 text-white font-black w-28">
                    Estimasi NA
                  </th>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-100/70 text-[11px]">
                  {/* Sub-header TP Codes */}
                  {recapData?.learning_objectives?.map(tp => (
                    <th key={tp.id} className="py-2 px-3 text-center font-mono font-bold text-teal-900 border-r border-slate-200" title={tp.description}>
                      {tp.code}
                    </th>
                  ))}

                  {/* Sub-header Jenis Ujian */}
                  {recapData?.assessment_types?.map(type => (
                    <th key={type.id} className="py-2 px-3 text-center font-bold text-indigo-900 border-r border-slate-200" title={type.description}>
                      {type.code} ({type.weight_percentage}%)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {!recapData?.students || recapData.students.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada siswa terdaftar di rombel ini.
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

                        {/* Nilai per TP */}
                        {recapData.learning_objectives?.map(tp => {
                          const val = m.tp_averages?.[tp.id];
                          const targetKkm = recapData.kkm || 75;
                          const isPass = val !== null && val !== undefined && val >= targetKkm;

                          return (
                            <td key={tp.id} className="py-2 px-3 text-center border-r border-slate-100">
                              {val !== null && val !== undefined ? (
                                <span className={`px-2 py-0.5 rounded font-black text-xs ${
                                  isPass ? 'text-teal-900 bg-teal-50' : 'text-rose-700 bg-rose-50'
                                }`}>
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}

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
                        <td className="py-2.5 px-4 text-center bg-teal-50/40 font-black text-teal-900 text-xs">
                          {estimatedFinal !== null && estimatedFinal !== undefined ? (
                            <span className="px-2.5 py-1 bg-teal-600 text-white rounded-lg font-black text-xs shadow-2xs">
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
      {/* 4. TAB 4: PENGOLAHAN NILAI RAPOR & DESKRIPSI CAPAIAN TP */}
      {/* ======================================================== */}
      {activeTab === 'report_processor' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-teal-50 via-indigo-50 to-amber-50 border border-teal-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
            <div>
              <span className="font-black text-teal-950 text-sm block flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Pengolahan Nilai Akhir & Narasi Capaian Rapor</span>
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Nilai Akhir Rapor dihitung dari bobot jenis pengujian. Deskripsi dirumuskan otomatis berdasarkan capaian TP tertinggi & terendah pada semester terpilih.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadReportTemplate}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                title="Unduh format spreadsheet Excel (.xlsx) nilai rapor & deskripsi capaian"
              >
                <Download className="w-3.5 h-3.5 text-teal-600" />
                <span>Unduh Template Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleTriggerFileInput('report')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                title="Unggah spreadsheet untuk update nilai rapor & deskripsi sekaligus"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Spreadsheet</span>
              </button>
              <button
                onClick={handleGenerateAllNarratives}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Generate Narasi TP</span>
              </button>
              <button
                onClick={handleSaveProcessedReport}
                disabled={processingReport || reportItems.length === 0}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                {processingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan & Kunci Nilai</span>
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
                  <th className="py-3 px-4 w-28 text-center bg-teal-50 font-black text-teal-900">
                    Nilai Akhir (NA) *
                  </th>
                  <th className="py-3 px-4 w-20 text-center">Predikat</th>
                  <th className="py-3 px-4 min-w-[320px]">
                    Deskripsi Capaian Kompetensi Rapor (Bisa Diedit Manual)
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
                  reportItems.map((item, idx) => {
                    const targetKkm = recapData?.kkm || 75;
                    const numFinal = parseFloat(item.final_score) || 0;
                    const isPass = numFinal >= targetKkm;

                    return (
                      <tr key={item.student_id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{item.nis || '-'}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.student_name}</td>
                        
                        {/* Input Nilai Akhir */}
                        <td className="py-3 px-4 text-center bg-teal-50/30">
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
                              if (n >= 90) updated[idx].predicate = 'A';
                              else if (n >= 80) updated[idx].predicate = 'B';
                              else if (n >= 70) updated[idx].predicate = 'C';
                              else updated[idx].predicate = 'D';
                              setReportItems(updated);
                            }}
                            className={`w-20 px-2 py-1.5 text-center text-xs font-black rounded-lg border focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                              isPass
                                ? 'bg-teal-600 text-white border-teal-700'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          />
                        </td>

                        {/* Predikat */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                            item.predicate === 'A' ? 'bg-emerald-100 text-emerald-900' :
                            item.predicate === 'B' ? 'bg-teal-100 text-teal-900' :
                            item.predicate === 'C' ? 'bg-amber-100 text-amber-900' :
                            'bg-rose-100 text-rose-900'
                          }`}>
                            {item.predicate}
                          </span>
                        </td>

                        {/* Live Text Area Narasi */}
                        <td className="py-3 px-4">
                          <textarea
                            rows={2}
                            value={item.competency_description}
                            onChange={(e) => {
                              const updated = [...reportItems];
                              updated[idx].competency_description = e.target.value;
                              setReportItems(updated);
                            }}
                            placeholder="Contoh: Mencapai kompetensi dengan sangat baik dalam ... Perlu peningkatan dalam ..."
                            className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed text-slate-800"
                          />
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
      {/* 5. TAB 5: BUKU NILAI (LEGER) & CETAK RAPOR */}
      {/* ======================================================== */}
      {activeTab === 'ledger_print' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                  Buku Nilai / Leger Nilai Kelas: {legerData?.class_group?.name || activeClassName}
                </h3>
                <p className="text-xs text-slate-500">
                  Tahun Ajaran: <strong>{legerData?.semester?.academic_year_name || 'Aktif'}</strong> • Semester: <strong>{legerData?.semester?.name || activeSemesterName}</strong> • Wali Kelas: <strong>{legerData?.class_group?.homeroom_teacher_name || '-'}</strong>
                </p>
              </div>
              <button
                onClick={handlePrintLeger}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Leger</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center border-r border-slate-200">Pkt</th>
                    <th className="py-3 px-3 w-20 border-r border-slate-200">NIS</th>
                    <th className="py-3 px-3 min-w-[160px] border-r border-slate-200">Nama Siswa</th>
                    {legerData?.subjects?.map(sub => (
                      <th key={sub.id} className="py-2.5 px-2 text-center font-bold text-slate-800 border-r border-slate-200" title={sub.name}>
                        {sub.code || sub.name}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center bg-indigo-50 font-black text-indigo-950 w-20">Total</th>
                    <th className="py-3 px-3 text-center bg-teal-50 font-black text-teal-950 w-20">Rata2</th>
                    <th className="py-3 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!legerData?.students || legerData.students.length === 0 ? (
                    <tr>
                      <td colSpan={25} className="py-10 text-center text-slate-400 text-xs">
                        Belum ada data nilai yang diproses untuk rombel ini.
                      </td>
                    </tr>
                  ) : (
                    legerData.students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 text-center border-r border-slate-100">
                          <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                            st.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            st.rank === 2 ? 'bg-slate-200 text-slate-800' :
                            st.rank === 3 ? 'bg-amber-50 text-amber-800' :
                            'text-slate-500'
                          }`}>
                            #{st.rank}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] border-r border-slate-100">{st.nis || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">{st.student_name}</td>
                        
                        {legerData.subjects?.map(sub => {
                          const val = st.scores?.[sub.id];
                          return (
                            <td key={sub.id} className="py-2.5 px-2 text-center border-r border-slate-100 font-bold text-slate-700">
                              {val !== null && val !== undefined ? val : '-'}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-center bg-indigo-50/30 font-black text-indigo-950">{st.total_score}</td>
                        <td className="py-2.5 px-3 text-center bg-teal-50/30 font-black text-teal-900">{st.average_score}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenStudentReportPreview(st)}
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 w-full"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Rapor</span>
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

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* Modal 1: Tambah / Edit Jenis Pengujian */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">
                {editingType ? 'Edit Jenis Pengujian' : 'Tambah Jenis Pengujian Baru'}
              </h3>
              <button onClick={() => setTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Jenis Pengujian *</label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Contoh: Formatif (Tugas Harian), Sumatif Tengah Semester (STS)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-800"
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
                    placeholder="misal: FORMATIF, STS, SAS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bobot Nilai Rapor (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={typeForm.weight_percentage}
                    onChange={(e) => setTypeForm({ ...typeForm, weight_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-teal-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Model Ruang Lingkup Penilaian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTypeForm({ ...typeForm, is_tp_based: true })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      typeForm.is_tp_based
                        ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Per Tujuan Pembelajaran (TP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeForm({ ...typeForm, is_tp_based: false })}
                    className={`py-2 px-3 rounded-xl font-bold text-xs border transition ${
                      !typeForm.is_tp_based
                        ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Sumatif Global (Non-TP)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Deskripsi / Keterangan</label>
                <textarea
                  rows={2}
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Keterangan pengujian..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Jenis Pengujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Buat / Edit Sesi Penilaian */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">
                {editingSession ? 'Edit Sesi Penilaian' : 'Buat Sesi Ujian / Tugas Baru'}
              </h3>
              <button onClick={() => setSessionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Pengujian *</label>
                <select
                  required
                  value={sessionForm.assessment_type_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, assessment_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-bold text-slate-800"
                >
                  <option value="">-- Pilih Jenis Pengujian --</option>
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
                  placeholder="Contoh: Formatif 1 - Pola Bilangan, Ulangan Bab 2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-800 font-bold"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-teal-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-Select Tujuan Pembelajaran (TP) yang Diujikan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Tujuan Pembelajaran (TP) yang Diujikan:
                </label>
                {learningObjectives.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic p-2 bg-slate-50 rounded-lg">
                    Belum ada master TP untuk mapel & semester ini. Nilai sesi akan dihitung sebagai nilai sesi global.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-xl space-y-1.5 bg-slate-50/50">
                    {learningObjectives.map(tp => {
                      const isSelected = (sessionForm.learning_objective_ids || []).includes(tp.id);
                      return (
                        <label
                          key={tp.id}
                          className={`flex items-start gap-2 p-2 rounded-lg text-xs cursor-pointer transition border ${
                            isSelected ? 'bg-teal-50 border-teal-300 text-teal-950 font-bold' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const current = sessionForm.learning_objective_ids || [];
                              const updated = checked ? [...current, tp.id] : current.filter(id => id !== tp.id);
                              setSessionForm({ ...sessionForm, learning_objective_ids: updated });
                            }}
                            className="rounded text-teal-600 focus:ring-0 mt-0.5 w-3.5 h-3.5"
                          />
                          <div>
                            <span className="font-mono text-teal-700 font-black mr-1.5">{tp.code}</span>
                            <span className="text-[11px] font-normal">{tp.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  placeholder="Catatan pelaksanaan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Sesi Ujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Input Nilai Siswa per Sesi */}
      {sessionScoreModalOpen && activeSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Input Nilai: {activeSessionDetail.session?.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Jenis: <strong className="text-indigo-700">{activeSessionDetail.session?.assessment_type_name}</strong> • Mapel: <strong className="text-teal-700">{activeSubjectName}</strong> • Rombel: <strong className="text-slate-800">{activeClassName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadSessionTemplate}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                  title="Unduh template spreadsheet Excel (.xlsx) dengan daftar siswa rombel ini"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600" />
                  <span>Unduh Template</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerFileInput('session')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                  title="Import nilai siswa dari file Excel / CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>
                <button onClick={() => setSessionScoreModalOpen(false)} className="text-slate-400 hover:text-slate-600 ml-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSessionScores} className="flex-1 overflow-hidden flex flex-col space-y-3">
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3 w-24">NIS</th>
                      <th className="py-3 px-3 min-w-[180px]">Nama Siswa</th>
                      
                      {/* Kolom per TP jika sesi ini menguji TP spesifik */}
                      {activeSessionDetail.session?.learning_objectives?.map(tp => (
                        <th key={tp.id} className="py-2.5 px-3 text-center bg-teal-50 font-black text-teal-900 w-28" title={tp.description}>
                          {tp.code} (0-100)
                        </th>
                      ))}

                      <th className="py-3 px-3 text-center bg-indigo-50 font-black text-indigo-900 w-28">
                        Skor Total Sesi
                      </th>
                      <th className="py-3 px-3 min-w-[200px]">Feedback / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeSessionDetail.students?.map((st, idx) => {
                      const studentData = sessionScoresMap[st.student_id] || { score: '', feedback: '', tp_scores: {} };
                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{st.nis || '-'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{st.student_name}</td>

                          {/* Inputs per TP */}
                          {activeSessionDetail.session?.learning_objectives?.map(tp => (
                            <td key={tp.id} className="py-2 px-3 text-center bg-teal-50/20">
                              <input
                                type="number"
                                min="0"
                                max={activeSessionDetail.session?.max_score || 100}
                                step="any"
                                value={studentData.tp_scores?.[tp.id] !== undefined ? studentData.tp_scores[tp.id] : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSessionScoresMap(prev => {
                                    const currSt = prev[st.student_id] || { score: '', feedback: '', tp_scores: {} };
                                    const updatedTp = { ...(currSt.tp_scores || {}), [tp.id]: val };
                                    
                                    // Auto-calculate skor rata-rata sesi jika ada multiple TP
                                    const validVals = Object.values(updatedTp).filter(v => v !== '' && !isNaN(v)).map(Number);
                                    const autoAvg = validVals.length > 0 ? parseFloat((validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(2)) : currSt.score;

                                    return {
                                      ...prev,
                                      [st.student_id]: {
                                        ...currSt,
                                        score: autoAvg,
                                        tp_scores: updatedTp
                                      }
                                    };
                                  });
                                }}
                                className="w-16 px-2 py-1 text-center font-black text-teal-900 bg-white border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="0"
                              />
                            </td>
                          ))}

                          {/* Input Total Sesi */}
                          <td className="py-2 px-3 text-center bg-indigo-50/20">
                            <input
                              type="number"
                              min="0"
                              max={activeSessionDetail.session?.max_score || 100}
                              step="any"
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
                              className="w-20 px-2 py-1 text-center font-black text-indigo-950 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder="0"
                            />
                          </td>

                          {/* Feedback */}
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
                              placeholder="Catatan guru..."
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Nilai Sesi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Pratinjau Lembar Rapor Siswa */}
      {reportModalOpen && previewStudentReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Pratinjau Rapor: {previewStudentReport.student_name}
                </h3>
                <p className="text-xs text-slate-500">
                  NIS: <strong>{previewStudentReport.nis}</strong> • Rombel: <strong>{activeClassName}</strong> • Peringkat Kelas: <strong>#{previewStudentReport.rank}</strong>
                </p>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">Rata-Rata Nilai Akhir:</span>
                <span className="font-black text-sm text-teal-800">{previewStudentReport.average_score}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">Total Akumulasi Nilai:</span>
                <span className="font-black text-sm text-indigo-900">{previewStudentReport.total_score}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Peringkat Kelas:</span>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded font-black">
                  Peringkat #{previewStudentReport.rank}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Rapor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: PRATINJAU & KONFIRMASI IMPORT SPREADSHEET */}
      {/* ======================================================== */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Pratinjau Hasil Import Spreadsheet
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    File: <strong className="text-slate-800">{importFileName}</strong> • Target: <strong className="text-teal-700 uppercase">{importTargetType === 'session' ? 'Sesi Penilaian' : importTargetType === 'recap' ? 'Matriks Nilai' : 'Nilai Rapor'}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statistik Ringkasan */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Baris File</span>
                <span className="text-base font-black text-slate-800">{importStats.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Siswa Cocok</span>
                <span className="text-base font-black text-emerald-800">{importStats.matchedCount} Siswa</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Tidak Cocok</span>
                <span className="text-base font-black text-amber-800">{importStats.unmatchedCount} Baris</span>
              </div>
            </div>

            {/* Tabel Pratinjau Baris Siswa */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3 w-24">NIS</th>
                    <th className="py-2 px-3">Nama Siswa</th>
                    <th className="py-2 px-3 text-center w-28">Nilai / Skor</th>
                    <th className="py-2 px-3 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importParsedRows.map((r, idx) => (
                    <tr key={idx} className={r.status === 'matched' ? 'hover:bg-slate-50/70' : 'bg-rose-50/40 text-rose-800'}>
                      <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-[11px]">{r.nis || '-'}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r.student_name}
                      </td>
                      <td className="py-2 px-3 text-center font-black">
                        {r.score !== null && r.score !== undefined ? (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 rounded font-black">
                            {r.score}
                          </span>
                        ) : r.final_score !== null && r.final_score !== undefined ? (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-900 border border-teal-200 rounded font-black">
                            {r.final_score}
                          </span>
                        ) : r.tp_averages && Object.keys(r.tp_averages).length > 0 ? (
                          <span className="text-[11px] text-teal-800">
                            {Object.keys(r.tp_averages).length} TP Terisi
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {r.status === 'matched' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            Cocok
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                            Tidak Ditemukan
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <p className="text-slate-500 text-[11px]">
                * Klik <b>"Terapkan Nilai ke Form"</b> untuk memasukkan nilai ke dalam halaman. Anda tetap dapat mereview dan mengedit sebelum menyimpan ke server.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyImport}
                  disabled={importStats.matchedCount === 0}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan {importStats.matchedCount} Nilai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Spreadsheet Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
    </div>
  );
}
