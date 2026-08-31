import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import * as XLSX from 'xlsx';
import {
  History,
  UserPlus,
  Building2,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Save,
  Plus,
  Search,
  RotateCw,
  ExternalLink,
  Layers,
  FileCheck2,
  GraduationCap,
  Calendar,
  X,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';

export default function RiwayatAkademik() {
  const { activeSchoolUnit } = useAuth();
  const [activeTab, setActiveTab] = useState('tambah_siswa'); // 'tambah_siswa' | 'struktur_historis' | 'input_rapor'

  // Global Toast / Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // -------------------------------------------------------------
  // TAB 1: TAMBAH SISWA / ALUMNI LAMA STATE
  // -------------------------------------------------------------
  const [quickStudentForm, setQuickStudentForm] = useState({
    full_name: '',
    nis: '',
    nisn: '',
    gender: 'L',
    birth_date: '',
    status: 'lulus',
    graduation_year: '',
    cohort_id: '',
    class_group_id: ''
  });
  const [savingStudent, setSavingStudent] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [cohortsList, setCohortsList] = useState([]);
  const [allClassGroups, setAllClassGroups] = useState([]);

  // -------------------------------------------------------------
  // TAB 2: STRUKTUR KELAS HISTORIS STATE
  // -------------------------------------------------------------
  const [allAcademicYears, setAllAcademicYears] = useState([]);
  const [allSemesters, setAllSemesters] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [loadingStructure, setLoadingStructure] = useState(false);

  // Shortcut Modal Buat Tahun Historis Sekaligus
  const [showBulkYearModal, setShowBulkYearModal] = useState(false);
  const [bulkYearForm, setBulkYearForm] = useState({
    name: '2020/2021',
    start_date: '2020-07-15',
    end_date: '2021-06-20',
    create_semesters: true,
    class_names_input: '7A, 7B, 8A, 8B, 9A, 9B',
    default_grade_level_id: ''
  });
  const [submittingBulkYear, setSubmittingBulkYear] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: INPUT NILAI RAPOR (MANUAL & IMPORT) STATE
  // -------------------------------------------------------------
  const [raporMode, setRaporMode] = useState('manual'); // 'manual' | 'import'
  const [selectedRaporYearId, setSelectedRaporYearId] = useState('');
  const [selectedRaporSemesterId, setSelectedRaporSemesterId] = useState('');
  const [selectedRaporClassId, setSelectedRaporClassId] = useState('');

  // Matrix Manual
  const [matrixStudents, setMatrixStudents] = useState([]);
  const [matrixSubjects, setMatrixSubjects] = useState([]);
  const [matrixScores, setMatrixScores] = useState({}); // { [studentId_subjectId]: score }
  const [matrixNotes, setMatrixNotes] = useState({}); // { [studentId]: homeroom_note }
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Import Excel
  const [importFile, setImportFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);
  const [importPreviewSummary, setImportPreviewSummary] = useState(null);
  const [importingData, setImportingData] = useState(false);
  const [importResultModal, setImportResultModal] = useState(null);

  // -------------------------------------------------------------
  // INITIAL DATA FETCH
  // -------------------------------------------------------------
  useEffect(() => {
    fetchInitialMasterData();
  }, [activeSchoolUnit]);

  const fetchInitialMasterData = async () => {
    try {
      setLoadingStructure(true);
      const params = {};
      if (activeSchoolUnit?.id) params.satuan_pendidikan_id = activeSchoolUnit.id;

      const [yRes, sRes, cgRes, cRes, glRes, subRes] = await Promise.all([
        api.get('/akademik/academic-years', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/semesters', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/class-groups', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/cohorts', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/grade-levels', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/subjects', { params }).catch(() => ({ data: { data: [] } }))
      ]);

      const years = yRes.data?.data || [];
      const semesters = sRes.data?.data || [];
      const classes = cgRes.data?.data || [];
      const cohorts = cRes.data?.data || [];
      const grades = glRes.data?.data || [];
      const subjects = subRes.data?.data || [];

      setAllAcademicYears(years);
      setAllSemesters(semesters);
      setAllClassGroups(classes);
      setCohortsList(cohorts);
      setGradeLevels(grades);
      setMatrixSubjects(subjects);

      if (grades.length > 0) {
        setBulkYearForm(prev => ({ ...prev, default_grade_level_id: grades[0].id }));
      }

      if (years.length > 0 && !selectedRaporYearId) {
        setSelectedRaporYearId(years[0].id);
      }
      if (semesters.length > 0 && !selectedRaporSemesterId) {
        const activeSem = semesters.find(s => s.is_active) || semesters[0];
        setSelectedRaporSemesterId(activeSem.id);
      }
      if (classes.length > 0 && !selectedRaporClassId) {
        setSelectedRaporClassId(classes[0].id);
      }
    } catch (err) {
      console.error('Error loading initial master data:', err);
    } finally {
      setLoadingStructure(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 1: DUPLICATE SEARCH ON INPUT
  // -------------------------------------------------------------
  useEffect(() => {
    const q = quickStudentForm.nisn || quickStudentForm.nis || quickStudentForm.full_name;
    if (!q || q.trim().length < 3) {
      setDuplicateCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicates(true);
        const res = await api.get('/akademik/students/search-quick', {
          params: {
            q: q.trim(),
            satuan_pendidikan_id: activeSchoolUnit?.id || undefined,
            limit: 5
          }
        });
        setDuplicateCandidates(res.data?.data || []);
      } catch (err) {
        // silent error for duplicate preview
      } finally {
        setCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [quickStudentForm.full_name, quickStudentForm.nisn, quickStudentForm.nis, activeSchoolUnit]);

  const handleSaveQuickStudent = async (e) => {
    e.preventDefault();
    if (!quickStudentForm.full_name.trim()) {
      setErrorMsg('Nama lengkap siswa wajib diisi');
      return;
    }

    setSavingStudent(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        ...quickStudentForm,
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        class_group_id: quickStudentForm.class_group_id ? Number(quickStudentForm.class_group_id) : undefined,
        cohort_id: quickStudentForm.cohort_id ? Number(quickStudentForm.cohort_id) : undefined
      };

      const res = await api.post('/akademik/students/quick-add-legacy', payload);
      setSuccessMsg(
        res.data?.warning
          ? `Data siswa berhasil disimpan! Catatan: ${res.data.warning}`
          : 'Data siswa riwayat / alumni berhasil ditambahkan ke database!'
      );

      // Reset form
      setQuickStudentForm({
        full_name: '',
        nis: '',
        nisn: '',
        gender: 'L',
        birth_date: '',
        status: 'lulus',
        graduation_year: '',
        cohort_id: '',
        class_group_id: ''
      });
      setDuplicateCandidates([]);
      fetchInitialMasterData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan data siswa riwayat');
    } finally {
      setSavingStudent(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: SHORTCUT BUAT TAHUN HISTORIS LENGKAP
  // -------------------------------------------------------------
  const handleCreateBulkYear = async (e) => {
    e.preventDefault();
    if (!bulkYearForm.name.trim()) {
      setErrorMsg('Nama tahun ajaran wajib diisi');
      return;
    }

    setSubmittingBulkYear(true);
    setErrorMsg('');

    try {
      const unitId = activeSchoolUnit?.id || 1;

      // 1. Buat Academic Year (is_active: false agar tidak mematikan tahun aktif berjalan)
      const yearRes = await api.post('/akademik/academic-years', {
        satuan_pendidikan_id: unitId,
        name: bulkYearForm.name.trim(),
        start_date: bulkYearForm.start_date,
        end_date: bulkYearForm.end_date,
        is_active: false
      });
      const newYearId = yearRes.data?.data?.id || yearRes.data?.id;

      // 2. Buat Semester Ganjil & Genap jika diceklis
      let semGanjilId = null;
      let semGenapId = null;
      if (bulkYearForm.create_semesters && newYearId) {
        const sem1 = await api.post('/akademik/semesters', {
          satuan_pendidikan_id: unitId,
          academic_year_id: newYearId,
          name: `Ganjil ${bulkYearForm.name.trim()}`,
          is_active: false
        }).catch(() => null);
        semGanjilId = sem1?.data?.data?.id || sem1?.data?.id;

        const sem2 = await api.post('/akademik/semesters', {
          satuan_pendidikan_id: unitId,
          academic_year_id: newYearId,
          name: `Genap ${bulkYearForm.name.trim()}`,
          is_active: false
        }).catch(() => null);
        semGenapId = sem2?.data?.data?.id || sem2?.data?.id;
      }

      // 3. Buat Rombel-rombel sekaligus dari input CSV/koma
      if (bulkYearForm.class_names_input.trim() && newYearId) {
        const classNames = bulkYearForm.class_names_input
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        for (const cName of classNames) {
          await api.post('/akademik/class-groups', {
            satuan_pendidikan_id: unitId,
            academic_year_id: newYearId,
            grade_level_id: bulkYearForm.default_grade_level_id || (gradeLevels[0]?.id || 1),
            name: cName
          }).catch(() => null);
        }
      }

      setSuccessMsg(`Tahun historis "${bulkYearForm.name}" beserta semester & rombel berhasil dibuat!`);
      setShowBulkYearModal(false);
      fetchInitialMasterData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membuat struktur tahun historis');
    } finally {
      setSubmittingBulkYear(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: LOAD MATRIX DATA UNTUK INPUT MANUAL
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab === 'input_rapor' && raporMode === 'manual' && selectedRaporClassId && selectedRaporSemesterId) {
      loadMatrixData();
    }
  }, [activeTab, raporMode, selectedRaporClassId, selectedRaporSemesterId]);

  const loadMatrixData = async () => {
    try {
      setLoadingMatrix(true);
      const [membersRes, reportsRes] = await Promise.all([
        api.get(`/akademik/class-groups/${selectedRaporClassId}/members`).catch(() => ({ data: { data: [] } })),
        api.get('/akademik/report-cards', {
          params: {
            class_group_id: selectedRaporClassId,
            semester_id: selectedRaporSemesterId
          }
        }).catch(() => ({ data: { data: [] } }))
      ]);

      const students = membersRes.data?.data || [];
      setMatrixStudents(students);

      // Load existing report cards & their subject scores
      const existingReports = reportsRes.data?.data || [];
      const scoreMap = {};
      const noteMap = {};

      for (const rep of existingReports) {
        noteMap[rep.student_id] = rep.homeroom_note || '';

        // Ambil detail nilai jika belum ada
        try {
          const det = await api.get(`/akademik/report-cards/${rep.id}`);
          const subScores = det.data?.data?.subject_scores || [];
          for (const ss of subScores) {
            scoreMap[`${rep.student_id}_${ss.subject_id}`] = ss.score;
          }
        } catch (e) {
          // ignore
        }
      }

      setMatrixScores(scoreMap);
      setMatrixNotes(noteMap);
    } catch (err) {
      console.error('Error loading matrix data:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const handleMatrixScoreChange = (studentId, subjectId, val) => {
    setMatrixScores(prev => ({
      ...prev,
      [`${studentId}_${subjectId}`]: val
    }));
  };

  const handleMatrixNoteChange = (studentId, val) => {
    setMatrixNotes(prev => ({
      ...prev,
      [studentId]: val
    }));
  };

  const handleSaveMatrix = async () => {
    if (!selectedRaporSemesterId || matrixStudents.length === 0) return;

    setSavingMatrix(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let savedCount = 0;
      for (const st of matrixStudents) {
        const studentId = st.id || st.student_id;
        const subjectScores = [];

        for (const sub of matrixSubjects) {
          const rawScore = matrixScores[`${studentId}_${sub.id}`];
          if (rawScore !== undefined && rawScore !== '' && !isNaN(rawScore)) {
            subjectScores.push({
              subject_id: sub.id,
              score: parseFloat(rawScore)
            });
          }
        }

        if (subjectScores.length > 0 || matrixNotes[studentId]) {
          await api.post('/akademik/report-cards/legacy-entry', {
            student_id: studentId,
            semester_id: Number(selectedRaporSemesterId),
            homeroom_notes: matrixNotes[studentId] || null,
            subject_scores: subjectScores
          });
          savedCount++;
        }
      }

      setSuccessMsg(`Nilai rapor berhasil disimpan untuk ${savedCount} siswa!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadMatrixData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan nilai matriks rapor');
    } finally {
      setSavingMatrix(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: IMPORT EXCEL (DOWNLOAD TEMPLATE, PARSE, PREVIEW, SUBMIT)
  // -------------------------------------------------------------
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/akademik/report-cards/import-template', {
        params: {
          class_group_id: selectedRaporClassId || undefined,
          semester_id: selectedRaporSemesterId || undefined,
          satuan_pendidikan_id: activeSchoolUnit?.id || undefined
        },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_import_rapor_${selectedRaporClassId || 'general'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setErrorMsg('Gagal mengunduh template Excel');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        setParsedRows(rawJson);

        // Lakukan matching preview awal
        let matchedCount = 0;
        let missingCount = 0;
        const enrichedRows = [];

        for (const row of rawJson) {
          const nisn = row['NISN'] || row['nisn'];
          const nis = row['NIS'] || row['nis'];
          const name = row['Nama Siswa'] || row['nama'] || row['full_name'];

          if (!name && !nisn && !nis) continue;

          // Cek di master data siswa yang sudah ada
          let match = null;
          if (nisn) {
            match = matrixStudents.find(s => s.nisn === String(nisn).trim());
          }
          if (!match && nis) {
            match = matrixStudents.find(s => s.nis === String(nis).trim());
          }
          if (!match && name) {
            match = matrixStudents.find(s => s.full_name?.toLowerCase() === String(name).trim().toLowerCase());
          }

          if (match) {
            matchedCount++;
          } else {
            missingCount++;
          }

          enrichedRows.push({
            ...row,
            _matched: !!match,
            _matchedStudent: match || null
          });
        }

        setImportPreviewSummary({
          total: enrichedRows.length,
          matched: matchedCount,
          missing: missingCount,
          rows: enrichedRows
        });
      } catch (err) {
        setErrorMsg(`Gagal memproses file Excel: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleProcessImport = async () => {
    if (!parsedRows.length || !selectedRaporSemesterId) return;

    setImportingData(true);
    setErrorMsg('');

    try {
      const res = await api.post('/akademik/report-cards/import', {
        class_group_id: selectedRaporClassId ? Number(selectedRaporClassId) : undefined,
        semester_id: Number(selectedRaporSemesterId),
        auto_create_missing_students: autoCreateMissing,
        rows: parsedRows,
        satuan_pendidikan_id: activeSchoolUnit?.id || 1
      });

      setImportResultModal(res.data?.data || res.data);
      setSuccessMsg('Proses impor nilai rapor selesai!');
      setParsedRows([]);
      setImportFile(null);
      setImportPreviewSummary(null);
      fetchInitialMasterData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengimpor nilai rapor');
    } finally {
      setImportingData(false);
    }
  };

  // Grouped Academic Years for Structure Tab
  const structureByYear = useMemo(() => {
    return allAcademicYears.map(yr => {
      const yearSemesters = allSemesters.filter(s => s.academic_year_id === yr.id);
      const yearClasses = allClassGroups.filter(c => c.academic_year_id === yr.id);
      return {
        ...yr,
        semesters: yearSemesters,
        classes: yearClasses
      };
    });
  }, [allAcademicYears, allSemesters, allClassGroups]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header Halaman */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">Riwayat & Impor Data Akademik</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Pusat Arsip & Alumni
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pendataan cepat alumni/siswa lama, struktur kelas lampau, dan input/impor nilai rapor arsip.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInitialMasterData}
          disabled={loadingStructure}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-2xs transition active:scale-95 self-start md:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loadingStructure ? 'animate-spin' : ''}`} />
          <span>Reload Data</span>
        </button>
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
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('tambah_siswa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'tambah_siswa'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>1. Tambah Siswa / Alumni Lama</span>
        </button>

        <button
          onClick={() => setActiveTab('struktur_historis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'struktur_historis'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Struktur Kelas Historis</span>
        </button>

        <button
          onClick={() => setActiveTab('input_rapor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'input_rapor'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/70'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>3. Input & Impor Nilai Rapor</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: TAMBAH SISWA / ALUMNI LAMA */}
      {/* ========================================================= */}
      {activeTab === 'tambah_siswa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input Tambah Cepat */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Formulir Cepat Siswa Riwayat / Alumni</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Jalur pendaftaran cepat untuk alumni atau siswa transfer tahun lampau. Data diset dalam mode <code>ringkas_riwayat</code> tanpa validasi ketat Dapodik saat ini.
              </p>
            </div>

            <form onSubmit={handleSaveQuickStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap Siswa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Fatih Al-Ayyubi"
                    value={quickStudentForm.full_name}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, full_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIS (Nomor Induk Siswa)</label>
                  <input
                    type="text"
                    placeholder="Opsional (auto-generate jika kosong)"
                    value={quickStudentForm.nis}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, nis: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0081234567"
                    value={quickStudentForm.nisn}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, nisn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={quickStudentForm.gender}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="L">Laki-laki (Ikhwan / Santriwan)</option>
                    <option value="P">Perempuan (Akhwat / Santriwati)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={quickStudentForm.birth_date}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, birth_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Kesiswaan</label>
                  <select
                    value={quickStudentForm.status}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  >
                    <option value="lulus">Lulus (Alumni)</option>
                    <option value="aktif">Aktif</option>
                    <option value="pindah">Pindah / Mutasi Keluar</option>
                    <option value="keluar">Keluar / Dikeluarkan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Lulus / Angkatan (Cohort)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mis. 2022"
                      value={quickStudentForm.graduation_year}
                      onChange={(e) => setQuickStudentForm({ ...quickStudentForm, graduation_year: e.target.value, cohort_id: '' })}
                      className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                    <select
                      value={quickStudentForm.cohort_id}
                      onChange={(e) => setQuickStudentForm({ ...quickStudentForm, cohort_id: e.target.value, graduation_year: '' })}
                      className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-[11px]"
                    >
                      <option value="">-- Atau Pilih Cohort --</option>
                      {cohortsList.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hubungkan ke Rombel Historis (Opsional):
                  </label>
                  <select
                    value={quickStudentForm.class_group_id}
                    onChange={(e) => setQuickStudentForm({ ...quickStudentForm, class_group_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Jangan hubungkan ke rombel sekarang --</option>
                    {allClassGroups.map(cg => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (Tahun Ajaran: {cg.academic_year_name || 'N/A'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Jika dipilih, siswa akan otomatis terdaftar di <code>student_class_enrollments</code> & riwayat rombel <code>student_class_history</code>.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition disabled:opacity-50"
                >
                  {savingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Data Siswa Riwayat</span>
                </button>
              </div>
            </form>
          </div>

          {/* Panel Deteksi Duplikasi Live */}
          <div className="space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pengecekan Duplikat Live</span>
                </h3>
                {checkingDuplicates && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sistem otomatis mencari kemiripan berdasarkan NISN, NIS, atau nama lengkap untuk mencegah data ganda.
              </p>

              {duplicateCandidates.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Ditemukan {duplicateCandidates.length} kandidat mirip:</span>
                      <p className="mt-0.5 text-amber-700">Tetap bisa disimpan (non-blocking) jika ini orang berbeda.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {duplicateCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate">{cand.full_name}</div>
                          <div className="text-[10px] text-slate-500">
                            NIS: {cand.nis || '-'} • NISN: {cand.nisn || '-'} • Status: <span className="font-semibold">{cand.status}</span>
                          </div>
                          {cand.current_class_name && (
                            <div className="text-[10px] text-indigo-600 font-semibold">
                              Rombel: {cand.current_class_name}
                            </div>
                          )}
                        </div>
                        <a
                          href={`/akademik/students/${cand.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                          title="Buka Profil"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center bg-white rounded-xl border border-slate-200/60 text-slate-400 text-[11px]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-70" />
                  <span>Tidak terdeteksi siswa dengan data identitas serupa.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STRUKTUR KELAS HISTORIS */}
      {/* ========================================================= */}
      {activeTab === 'struktur_historis' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Pohon Struktur Tahun Ajaran & Rombel Historis</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan seluruh tahun ajaran termasuk yang non-aktif/lampau untuk tujuan pengarsipan dan penempatan siswa riwayat.
              </p>
            </div>

            <button
              onClick={() => setShowBulkYearModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Struktur Tahun Historis Sekaligus</span>
            </button>
          </div>

          {/* Daftar Tahun Ajaran Lengkap */}
          <div className="space-y-4">
            {structureByYear.map((yr) => (
              <div
                key={yr.id}
                className={`bg-white rounded-2xl border transition ${
                  yr.is_active ? 'border-emerald-200 shadow-xs' : 'border-slate-200 shadow-2xs'
                }`}
              >
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        yr.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{yr.name}</span>
                        {yr.is_active ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Tahun Ajaran Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 text-slate-600 border border-slate-300">
                            Non-Aktif / Historis
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Periode: {yr.start_date || '-'} s/d {yr.end_date || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {yr.semesters.length} Semester • {yr.classes.length} Rombongan Belajar
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Semester List */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Semester Terdaftar:</span>
                    </h4>
                    {yr.semesters.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">Belum ada semester.</span>
                    ) : (
                      <div className="space-y-1.5">
                        {yr.semesters.map(s => (
                          <div
                            key={s.id}
                            className="p-2 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800">{s.name}</span>
                            {s.is_active && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                                Aktif
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rombel List */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Rombongan Belajar (Kelas):</span>
                    </h4>
                    {yr.classes.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">Belum ada rombel pada tahun ini.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {yr.classes.map(c => (
                          <span
                            key={c.id}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 text-[11px] shadow-2xs"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: INPUT & IMPOR NILAI RAPOR */}
      {/* ========================================================= */}
      {activeTab === 'input_rapor' && (
        <div className="space-y-6">
          {/* Header Panel Filter & Mode Toggle */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>Matriks Nilai Rapor & Impor Massal</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input langsung nilai akhir per mapel atau unggah spreadsheet Excel untuk rekapitulasi cepat.
                </p>
              </div>

              {/* Toggle Manual vs Import */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setRaporMode('manual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    raporMode === 'manual'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mode Input Manual
                </button>
                <button
                  onClick={() => setRaporMode('import')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    raporMode === 'import'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mode Impor Excel
                </button>
              </div>
            </div>

            {/* Filter Rombel & Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran:</label>
                <select
                  value={selectedRaporYearId}
                  onChange={(e) => {
                    setSelectedRaporYearId(e.target.value);
                    const sems = allSemesters.filter(s => String(s.academic_year_id) === String(e.target.value));
                    if (sems.length > 0) setSelectedRaporSemesterId(sems[0].id);
                    const cls = allClassGroups.filter(c => String(c.academic_year_id) === String(e.target.value));
                    if (cls.length > 0) setSelectedRaporClassId(cls[0].id);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {allAcademicYears.map(y => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? '(Aktif)' : '(Historis)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Semester:</label>
                <select
                  value={selectedRaporSemesterId}
                  onChange={(e) => setSelectedRaporSemesterId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {allSemesters
                    .filter(s => !selectedRaporYearId || String(s.academic_year_id) === String(selectedRaporYearId))
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.is_active ? '(Aktif)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rombel (Kelas):</label>
                <select
                  value={selectedRaporClassId}
                  onChange={(e) => setSelectedRaporClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                >
                  {allClassGroups
                    .filter(c => !selectedRaporYearId || String(c.academic_year_id) === String(selectedRaporYearId))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* SUBMODE A: INPUT MANUAL MATRIKS */}
          {raporMode === 'manual' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">
                    Matriks Nilai Akhir: {matrixStudents.length} Siswa Terdaftar
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Isi langsung angka nilai akhir (0-100). Predikat akan dikalkulasi otomatis saat disimpan.
                  </p>
                </div>

                <button
                  onClick={handleSaveMatrix}
                  disabled={savingMatrix || matrixStudents.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                >
                  {savingMatrix ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Nilai Matriks</span>
                </button>
              </div>

              {loadingMatrix ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
                  <span className="text-xs">Memuat data siswa & nilai mapel...</span>
                </div>
              ) : matrixStudents.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Belum ada siswa yang terdaftar di rombel ini. Daftarkan siswa terlebih dahulu.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 shadow-2xs">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center border-r border-slate-200">No</th>
                        <th className="py-3 px-3 w-28 border-r border-slate-200">NISN / NIS</th>
                        <th className="py-3 px-3 min-w-48 border-r border-slate-200">Nama Siswa</th>
                        {matrixSubjects.map(sub => (
                          <th key={sub.id} className="py-3 px-2 min-w-24 text-center border-r border-slate-200">
                            <div>{sub.name}</div>
                            <div className="text-[9px] text-slate-400 font-normal">{sub.code || `ID:${sub.id}`}</div>
                          </th>
                        ))}
                        <th className="py-3 px-3 min-w-56">Catatan Wali Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matrixStudents.map((st, idx) => {
                        const sId = st.id || st.student_id;
                        return (
                          <tr key={sId} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-100 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 border-r border-slate-100">
                              <div>{st.nisn || '-'}</div>
                              <div className="text-[10px] text-slate-400">{st.nis || ''}</div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-100">
                              {st.full_name}
                            </td>
                            {matrixSubjects.map(sub => (
                              <td key={sub.id} className="py-2 px-1 text-center border-r border-slate-100">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="-"
                                  value={matrixScores[`${sId}_${sub.id}`] !== undefined ? matrixScores[`${sId}_${sub.id}`] : ''}
                                  onChange={(e) => handleMatrixScoreChange(sId, sub.id, e.target.value)}
                                  className="w-16 px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-xs"
                                />
                              </td>
                            ))}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Catatan perkembangan..."
                                value={matrixNotes[sId] || ''}
                                onChange={(e) => handleMatrixNoteChange(sId, e.target.value)}
                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBMODE B: IMPORT EXCEL */}
          {raporMode === 'import' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Langkah 1: Unduh Template */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                      1
                    </span>
                    <span>Unduh Format Template Excel</span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Unduh file spreadsheet <code>.xlsx</code> yang sudah terkonfigurasi dengan kolom identitas dan seluruh mapel aktif rombel ini.
                  </p>

                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Template (.XLSX)</span>
                  </button>
                </div>

                {/* Langkah 2: Upload File */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                      2
                    </span>
                    <span>Unggah File Hasil Isian Nilai</span>
                  </div>

                  <label className="block p-5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-xl cursor-pointer text-center transition">
                    <UploadCloud className="w-8 h-8 text-indigo-600 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-indigo-900 block">
                      {importFile ? importFile.name : 'Klik untuk memilih file Excel (.xlsx)'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Mendukung format XLSX dengan kolom NISN, NIS, Nama, dan kolom Mapel
                    </span>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <input
                      type="checkbox"
                      id="autoCreateMissing"
                      checked={autoCreateMissing}
                      onChange={(e) => setAutoCreateMissing(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="autoCreateMissing" className="font-semibold text-slate-700 cursor-pointer">
                      Buat data siswa baru otomatis jika NISN/Nama belum ada di database
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Hasil Parsing */}
              {importPreviewSummary && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Preview Baris Data File Excel</h3>
                      <p className="text-xs text-slate-500">
                        Total {importPreviewSummary.total} baris terdeteksi • {importPreviewSummary.matched} cocok dengan siswa existing • {importPreviewSummary.missing} kandidat siswa baru
                      </p>
                    </div>

                    <button
                      onClick={handleProcessImport}
                      disabled={importingData}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                    >
                      {importingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                      <span>Proses Import ke Database</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-50 font-semibold text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">NISN / NIS</th>
                          <th className="py-2.5 px-3">Nama Siswa di File</th>
                          <th className="py-2.5 px-3">Status Pencocokan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewSummary.rows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-600">
                              {r['NISN'] || r['nisn'] || r['NIS'] || '-'}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-800">
                              {r['Nama Siswa'] || r['full_name'] || r['nama'] || '-'}
                            </td>
                            <td className="py-2 px-3">
                              {r._matched ? (
                                <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 text-[10px]">
                                  Cocok ({r._matchedStudent?.full_name})
                                </span>
                              ) : autoCreateMissing ? (
                                <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700 text-[10px]">
                                  Akan dibuat otomatis
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700 text-[10px]">
                                  Akan dilewati (Siswa tidak ada)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SHORTCUT BUAT STRUKTUR TAHUN HISTORIS SEKALIGUS */}
      {/* ========================================================= */}
      {showBulkYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Buat Struktur Tahun Historis Sekaligus</span>
              </h3>
              <button onClick={() => setShowBulkYearModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBulkYear} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Label Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mis. 2019/2020"
                  value={bulkYearForm.name}
                  onChange={(e) => setBulkYearForm({ ...bulkYearForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai:</label>
                  <input
                    type="date"
                    value={bulkYearForm.start_date}
                    onChange={(e) => setBulkYearForm({ ...bulkYearForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai:</label>
                  <input
                    type="date"
                    value={bulkYearForm.end_date}
                    onChange={(e) => setBulkYearForm({ ...bulkYearForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createSemesters"
                  checked={bulkYearForm.create_semesters}
                  onChange={(e) => setBulkYearForm({ ...bulkYearForm, create_semesters: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="createSemesters" className="font-semibold text-slate-700 cursor-pointer">
                  Buat otomatis 2 Semester (Ganjil & Genap)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama-nama Rombel Sekaligus (Pisahkan dengan koma):
                </label>
                <textarea
                  rows="3"
                  placeholder="7A, 7B, 8A, 8B, 9A, 9B"
                  value={bulkYearForm.class_names_input}
                  onChange={(e) => setBulkYearForm({ ...bulkYearForm, class_names_input: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tingkat / Jenjang Default Rombel:</label>
                <select
                  value={bulkYearForm.default_grade_level_id}
                  onChange={(e) => setBulkYearForm({ ...bulkYearForm, default_grade_level_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {gradeLevels.map(gl => (
                    <option key={gl.id} value={gl.id}>{gl.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkYearModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingBulkYear}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingBulkYear ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Eksekusi Pembuatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LAPORAN HASIL IMPORT */}
      {/* ========================================================= */}
      {importResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Ringkasan Hasil Impor Nilai Rapor</span>
              </h3>
              <button onClick={() => setImportResultModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-slate-500">Total Baris File</div>
                <div className="text-lg font-bold text-slate-800 mt-0.5">{importResultModal.total_rows}</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-emerald-700">Baris Berhasil</div>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">{importResultModal.success_count}</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="text-blue-700">Siswa Baru Dibuat</div>
                <div className="text-lg font-bold text-blue-800 mt-0.5">{importResultModal.created_students_count}</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="text-purple-700">Siswa Cocok Existing</div>
                <div className="text-lg font-bold text-purple-800 mt-0.5">{importResultModal.matched_students_count}</div>
              </div>
            </div>

            {importResultModal.errors && importResultModal.errors.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-rose-700">
                  Daftar Baris Gagal ({importResultModal.errors.length}):
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
                  {importResultModal.errors.map((errItem, ei) => (
                    <div key={ei} className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                      <span className="font-bold">Baris {errItem.row} ({errItem.name}):</span> {errItem.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setImportResultModal(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
