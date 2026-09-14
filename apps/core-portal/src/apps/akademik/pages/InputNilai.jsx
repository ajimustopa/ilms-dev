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
  FileText,
  History,
  Clock,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Search,
  HeartHandshake,
  Compass,
  MessageSquare,
  Smile,
  Settings,
  Tag,
  CheckSquare
} from 'lucide-react';

function CustomFilterSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  searchable = false,
  colorScheme = 'slate',
  minWidth = 'min-w-[160px]'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(q) ||
        opt.sublabel?.toLowerCase().includes(q) ||
        opt.badge?.toLowerCase().includes(q)
    );
  }, [options, search]);

  const colorStyles = {
    slate: {
      button: 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400',
      iconBox: 'bg-slate-100 text-slate-600',
      activeItem: 'bg-slate-100 text-slate-950 font-bold',
      tag: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    indigo: {
      button: 'bg-white hover:bg-indigo-50/40 border-indigo-200 text-indigo-950 focus:border-indigo-400 shadow-xs',
      iconBox: 'bg-indigo-50 text-indigo-700',
      activeItem: 'bg-indigo-50 text-indigo-950 font-bold',
      tag: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    teal: {
      button: 'bg-white hover:bg-emerald-50/40 border-emerald-200 text-emerald-950 focus:border-emerald-400 shadow-xs',
      iconBox: 'bg-emerald-50 text-emerald-700',
      activeItem: 'bg-emerald-50 text-emerald-950 font-bold',
      tag: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    amber: {
      button: 'bg-white hover:bg-amber-50/40 border-amber-300 text-amber-950 focus:border-amber-400 shadow-xs',
      iconBox: 'bg-amber-50 text-amber-800',
      activeItem: 'bg-amber-50 text-amber-950 font-bold',
      tag: 'bg-amber-100 text-amber-900 border-amber-200'
    }
  }[colorScheme] || colorStyles.slate;

  return (
    <div className={`relative ${minWidth}`} ref={ref}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all duration-150 ${
          colorStyles.button
        } ${isOpen ? 'ring-2 ring-emerald-500/20 shadow-md border-emerald-500' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 text-left">
          {Icon && (
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorStyles.iconBox}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
              {label}
            </div>
            <div className="font-black text-slate-800 text-xs truncate flex items-center gap-1.5 mt-0.5">
              <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
              {selectedOption?.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] w-full max-w-[340px] bg-white rounded-xl border border-slate-200 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
          {searchable && options.length > 4 && (
            <div className="p-1">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Cari ${label.toLowerCase()}...`}
                  autoFocus
                  className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs font-medium">
                Tidak ada pilihan yang cocok
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition ${
                      isSelected
                        ? colorStyles.activeItem
                        : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border ${
                            opt.badge === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  // Modal Simpan Nilai Rapor & Rekam Riwayat
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({
    method: 'manual', // 'manual' | 'calculated_from_components'
    version_label: '',
    notes: ''
  });

  // Modal Riwayat & Versi Penginputan Nilai Rapor
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ----------------------------------------------------
  // TAB 4 SUB-TABS (Akademik, Sikap, Pramuka, Catatan Wali Kelas)
  // ----------------------------------------------------
  const [reportSubTab, setReportSubTab] = useState('academic'); // 'academic' | 'attitude' | 'scout' | 'homeroom_notes'

  // Sub-Tab 2: Dimensi Sikap & Nilai Sikap
  const [attitudeDimensions, setAttitudeDimensions] = useState([]);
  const [activeDimensionId, setActiveDimensionId] = useState('');
  const [dimensionModalOpen, setDimensionModalOpen] = useState(false);
  const [dimensionForm, setDimensionForm] = useState({ id: null, code: '', name: '', description: '', order_index: 1 });
  const [editingDimension, setEditingDimension] = useState(null);
  const [attitudeItems, setAttitudeItems] = useState([]); // [{ student_id, student_name, nis, scores: { [dimId]: { id, aspect, description } } }]
  const [loadingAttitude, setLoadingAttitude] = useState(false);
  const [savingAttitude, setSavingAttitude] = useState(false);

  // Sub-Tab 3: Nilai Ekstrakurikuler (Pilihan Dropdown Ekskul)
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [selectedExtraId, setSelectedExtraId] = useState('');
  const [extraScoresList, setExtraScoresList] = useState([]); // [{ student_id, student_name, nis, predicate: 'Baik', description: '' }]
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [savingExtra, setSavingExtra] = useState(false);

  // Sub-Tab 4: Catatan Wali Kelas
  const [homeroomNotesList, setHomeroomNotesList] = useState([]); // [{ student_id, student_name, nis, homeroom_note: '' }]
  const [loadingHomeroom, setLoadingHomeroom] = useState(false);
  const [savingHomeroom, setSavingHomeroom] = useState(false);

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
      fetchAttitudeDimensions();
      fetchExtracurriculars();
    }
  }, [selectedAcademicYearId]);

  useEffect(() => {
    if (selectedSubjectId && selectedSemesterId && selectedClassId) {
      fetchLearningObjectives();
    }
  }, [selectedSubjectId, selectedSemesterId, selectedClassId]);

  useEffect(() => {
    if (activeTab === 'report_processor' && reportSubTab === 'extracurricular' && selectedClassId && selectedSemesterId && selectedExtraId) {
      fetchExtraScores();
    }
  }, [activeTab, reportSubTab, selectedClassId, selectedSemesterId, selectedExtraId]);

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
      if (selectedClassId && selectedSemesterId) {
        if (reportSubTab === 'academic' && selectedSubjectId) {
          fetchReportProcessorData();
        } else if (reportSubTab === 'attitude') {
          fetchAttitudeScoresMatrix();
        } else if (reportSubTab === 'extracurricular') {
          if (selectedExtraId) {
            fetchExtraScores();
          } else {
            fetchExtracurriculars();
          }
        } else if (reportSubTab === 'homeroom_notes') {
          fetchHomeroomNotes();
        }
      }
    } else if (activeTab === 'ledger_print') {
      if (selectedClassId && selectedSemesterId) {
        fetchLeger();
      }
    }
  }, [activeTab, reportSubTab, selectedClassId, selectedSubjectId, selectedSemesterId, selectedAcademicYearId]);

  // ----------------------------------------------------
  // FETCHERS
  // ----------------------------------------------------
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const unitId = activeSchoolUnit?.id || 1;
      const [ayRes, typeRes] = await Promise.all([
        api.get('/akademik/academic-years', { params: { satuan_pendidikan_id: unitId } }),
        api.get('/akademik/assessment-types', { params: { satuan_pendidikan_id: unitId } })
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
      fetchReportScoreHistory();
    } catch (err) {
      console.error('Error loading report processor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportScoreHistory = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedSemesterId) return;
    try {
      setLoadingHistory(true);
      const res = await api.get('/akademik/scores/report-history', {
        params: {
          class_group_id: selectedClassId,
          subject_id: selectedSubjectId,
          semester_id: selectedSemesterId
        }
      });
      setHistoryList(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching report history:', err);
    } finally {
      setLoadingHistory(false);
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
  // SUB-TAB 2: DIMENSI SIKAP & NILAI SIKAP HANDLERS
  // ----------------------------------------------------
  const fetchAttitudeDimensions = async () => {
    try {
      const res = await api.get('/akademik/attitude-dimensions', {
        params: {
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId
        }
      });
      const dims = res.data?.data || [];
      setAttitudeDimensions(dims);
      if (dims.length > 0 && (!activeDimensionId || !dims.find(d => String(d.id) === String(activeDimensionId)))) {
        setActiveDimensionId(String(dims[0].id));
      }
      return dims;
    } catch (err) {
      console.error('Error fetching attitude dimensions:', err);
      return [];
    }
  };

  const fetchAttitudeScoresMatrix = async () => {
    if (!selectedClassId || !selectedSemesterId) return;
    try {
      setLoadingAttitude(true);
      const res = await api.get('/akademik/attitude-scores/matrix', {
        params: {
          class_group_id: selectedClassId,
          semester_id: selectedSemesterId,
          academic_year_id: selectedAcademicYearId
        }
      });
      const data = res.data?.data;
      if (data) {
        setAttitudeDimensions(data.dimensions || []);
        if (data.dimensions?.length > 0 && (!activeDimensionId || !data.dimensions.find(d => String(d.id) === String(activeDimensionId)))) {
          setActiveDimensionId(String(data.dimensions[0].id));
        }
        const items = (data.students || []).map(st => ({
          student_id: st.student_id,
          student_name: st.student_name,
          nis: st.nis,
          scores: data.scores_map?.[st.student_id] || {}
        }));
        setAttitudeItems(items);
      }
    } catch (err) {
      console.error('Error fetching attitude scores matrix:', err);
    } finally {
      setLoadingAttitude(false);
    }
  };

  const handleOpenAddDimension = () => {
    setEditingDimension(null);
    setDimensionForm({
      id: null,
      code: `DIM-${attitudeDimensions.length + 1}`,
      name: '',
      description: '',
      order_index: attitudeDimensions.length + 1
    });
    setDimensionModalOpen(true);
  };

  const handleOpenEditDimension = (dim) => {
    setEditingDimension(dim);
    setDimensionForm({
      id: dim.id,
      code: dim.code || '',
      name: dim.name || '',
      description: dim.description || '',
      order_index: dim.order_index || 1
    });
    setDimensionModalOpen(true);
  };

  const handleSaveDimensionForm = async (e) => {
    e.preventDefault();
    if (!dimensionForm.name.trim()) return;
    try {
      if (editingDimension) {
        await api.put(`/akademik/attitude-dimensions/${editingDimension.id}`, dimensionForm);
        setSuccessMsg('Dimensi sikap berhasil diperbarui!');
      } else {
        await api.post('/akademik/attitude-dimensions', {
          ...dimensionForm,
          satuan_pendidikan_id: activeSchoolUnit?.id || 1,
          academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : null
        });
        setSuccessMsg('Dimensi sikap baru berhasil ditambahkan!');
      }
      setDimensionModalOpen(false);
      fetchAttitudeDimensions();
      fetchAttitudeScoresMatrix();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan dimensi sikap');
    }
  };

  const handleDeleteDimension = async (id) => {
    if (!window.confirm('Yakin ingin menghapus dimensi sikap ini?')) return;
    try {
      await api.delete(`/akademik/attitude-dimensions/${id}`);
      setSuccessMsg('Dimensi sikap berhasil dihapus!');
      fetchAttitudeDimensions();
      fetchAttitudeScoresMatrix();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus dimensi sikap');
    }
  };

  const handleAutoFillAttitudeDescriptions = () => {
    const activeDim = attitudeDimensions.find(d => String(d.id) === String(activeDimensionId));
    const dimName = activeDim?.name || 'Sikap dan Karakter';
    const updated = attitudeItems.map(st => {
      const existing = st.scores?.[activeDimensionId]?.description;
      const desc = existing || `Menunjukkan sikap yang sangat baik dan konsisten dalam ${dimName.toLowerCase()}.`;
      return {
        ...st,
        scores: {
          ...st.scores,
          [activeDimensionId]: {
            ...(st.scores?.[activeDimensionId] || {}),
            aspect: dimName,
            description: desc
          }
        }
      };
    });
    setAttitudeItems(updated);
    setSuccessMsg(`Narasi sikap untuk dimensi "${dimName}" berhasil diisi otomatis!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveAttitudeScores = async () => {
    if (attitudeItems.length === 0 || !selectedClassId || !selectedSemesterId) return;
    try {
      setSavingAttitude(true);
      setErrorMsg('');
      const payloadItems = [];
      attitudeItems.forEach(st => {
        attitudeDimensions.forEach(dim => {
          const desc = st.scores?.[dim.id]?.description ?? '';
          payloadItems.push({
            student_id: st.student_id,
            dimension_id: dim.id,
            aspect: dim.name,
            description: desc
          });
        });
      });

      await api.post('/akademik/attitude-scores/bulk', {
        class_group_id: Number(selectedClassId),
        semester_id: Number(selectedSemesterId),
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : null,
        items: payloadItems
      });

      setSuccessMsg('Seluruh nilai deskripsi sikap siswa berhasil disimpan!');
      fetchAttitudeScoresMatrix();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan nilai sikap');
    } finally {
      setSavingAttitude(false);
    }
  };

  // ----------------------------------------------------
  // SUB-TAB 3: NILAI EKSTRAKURIKULER HANDLERS
  // ----------------------------------------------------
  const fetchExtracurriculars = async () => {
    try {
      const res = await api.get('/akademik/extracurriculars', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id || 1 }
      });
      const extras = res.data?.data || [];
      setExtracurriculars(extras);
      if (extras.length > 0 && (!selectedExtraId || !extras.find(e => String(e.id) === String(selectedExtraId)))) {
        setSelectedExtraId(String(extras[0].id));
      }
      return extras;
    } catch (err) {
      console.error('Error fetching extracurriculars:', err);
      return [];
    }
  };

  const buildDefaultExtraNarrative = (extraName, pred) => {
    if (pred === 'Amat Baik') {
      return `Sangat aktif, bersemangat, dan menunjukkan perkembangan keterampilan yang luar biasa dalam kegiatan ekstrakurikuler ${extraName}.`;
    }
    if (pred === 'Baik') {
      return `Aktif, tertib, dan mampu mengikuti seluruh program latihan ekstrakurikuler ${extraName} dengan baik.`;
    }
    if (pred === 'Cukup') {
      return `Cukup mampu mengikuti kegiatan ekstrakurikuler ${extraName} dan perlu peningkatan kehadiran serta keaktifan berlatih.`;
    }
    return `Kurang aktif dan perlu pembinaan lebih lanjut dalam kegiatan ekstrakurikuler ${extraName}.`;
  };

  const fetchExtraScores = async () => {
    if (!selectedClassId || !selectedSemesterId) return;
    try {
      setLoadingExtra(true);

      // Ambil nilai ekskul yang tersimpan
      let existingScores = [];
      if (selectedExtraId) {
        const scoreRes = await api.get('/akademik/extracurricular-scores', {
          params: {
            extracurricular_id: selectedExtraId,
            semester_id: selectedSemesterId
          }
        }).catch(() => null);
        existingScores = scoreRes?.data?.data || [];
      }

      const scoreMap = {};
      existingScores.forEach(sc => {
        scoreMap[sc.student_id] = sc;
      });

      // Ambil siswa rombel kelas terpilih
      let studentsList = [];
      if (attitudeItems.length > 0) {
        studentsList = attitudeItems.map(st => ({ student_id: st.student_id, student_name: st.student_name, nis: st.nis }));
      } else if (reportItems.length > 0) {
        studentsList = reportItems.map(st => ({ student_id: st.student_id, student_name: st.student_name, nis: st.nis }));
      } else {
        const matrixRes = await api.get('/akademik/attitude-scores/matrix', {
          params: { class_group_id: selectedClassId, semester_id: selectedSemesterId }
        }).catch(() => null);
        studentsList = matrixRes?.data?.data?.students || [];
      }

      const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId));
      const extraName = activeExtra?.name || 'Ekstrakurikuler';

      const items = studentsList.map(st => {
        const sc = scoreMap[st.student_id];
        const pred = sc?.predicate || 'Baik';
        return {
          student_id: st.student_id,
          student_name: st.student_name,
          nis: st.nis,
          predicate: pred,
          description: sc?.description || buildDefaultExtraNarrative(extraName, pred)
        };
      });

      setExtraScoresList(items);
    } catch (err) {
      console.error('Error fetching extracurricular scores:', err);
    } finally {
      setLoadingExtra(false);
    }
  };

  const handleAutoGenerateExtraDescriptions = () => {
    const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId));
    const extraName = activeExtra?.name || 'Ekstrakurikuler';
    const updated = extraScoresList.map(item => ({
      ...item,
      description: buildDefaultExtraNarrative(extraName, item.predicate)
    }));
    setExtraScoresList(updated);
    setSuccessMsg(`Narasi kegiatan ekstrakurikuler "${extraName}" berhasil di-generate otomatis sesuai predikat!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveExtraScores = async () => {
    if (extraScoresList.length === 0 || !selectedClassId || !selectedSemesterId || !selectedExtraId) {
      setErrorMsg('Pilih ekstrakurikuler dan pastikan data siswa tersedia');
      return;
    }
    try {
      setSavingExtra(true);
      setErrorMsg('');
      await api.post('/akademik/extracurricular-scores/bulk', {
        extracurricular_id: Number(selectedExtraId),
        class_group_id: Number(selectedClassId),
        semester_id: Number(selectedSemesterId),
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : null,
        satuan_pendidikan_id: activeSchoolUnit?.id || 1,
        items: extraScoresList.map(it => ({
          student_id: it.student_id,
          predicate: it.predicate,
          score: it.predicate === 'Amat Baik' ? 95 : it.predicate === 'Baik' ? 85 : it.predicate === 'Cukup' ? 75 : 60,
          description: it.description
        }))
      });
      const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId));
      setSuccessMsg(`Nilai ekstrakurikuler "${activeExtra?.name || ''}" berhasil disimpan!`);
      fetchExtraScores();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan nilai ekstrakurikuler');
    } finally {
      setSavingExtra(false);
    }
  };

  // ----------------------------------------------------
  // SUB-TAB 4: CATATAN WALI KELAS HANDLERS
  // ----------------------------------------------------
  const fetchHomeroomNotes = async () => {
    if (!selectedClassId || !selectedSemesterId) return;
    try {
      setLoadingHomeroom(true);
      const res = await api.get('/akademik/homeroom-notes', {
        params: {
          class_group_id: selectedClassId,
          semester_id: selectedSemesterId
        }
      });
      const data = res.data?.data;
      if (data) {
        const items = (data.students || []).map(st => ({
          student_id: st.student_id,
          student_name: st.student_name,
          nis: st.nis,
          homeroom_note: data.notes_map?.[st.student_id] || ''
        }));
        setHomeroomNotesList(items);
      }
    } catch (err) {
      console.error('Error fetching homeroom notes:', err);
    } finally {
      setLoadingHomeroom(false);
    }
  };

  const handleSaveHomeroomNotes = async () => {
    if (homeroomNotesList.length === 0 || !selectedClassId || !selectedSemesterId) return;
    try {
      setSavingHomeroom(true);
      setErrorMsg('');
      await api.post('/akademik/homeroom-notes/bulk', {
        class_group_id: Number(selectedClassId),
        semester_id: Number(selectedSemesterId),
        academic_year_id: selectedAcademicYearId ? Number(selectedAcademicYearId) : null,
        items: homeroomNotesList.map(it => ({
          student_id: it.student_id,
          homeroom_note: it.homeroom_note
        }))
      });
      setSuccessMsg('Catatan wali kelas berhasil disimpan!');
      fetchHomeroomNotes();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan catatan wali kelas');
    } finally {
      setSavingHomeroom(false);
    }
  };

  const handleApplyHomeroomTemplate = (idx, templateText) => {
    const updated = [...homeroomNotesList];
    updated[idx].homeroom_note = templateText;
    setHomeroomNotesList(updated);
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

  // Kalkulasi & Generate Nilai dari Bobot Komponen Pengujian
  const handleCalculateFromComponents = () => {
    if (!recapData || reportItems.length === 0) return;
    const targetKkm = recapData?.kkm || 75;
    const tps = recapData?.learning_objectives || learningObjectives || [];

    const updated = reportItems.map(item => {
      const calcFinal = item.calculated_final !== null && item.calculated_final !== undefined
        ? item.calculated_final
        : item.final_score;
      
      let predicate = 'C';
      if (calcFinal >= 90) predicate = 'A';
      else if (calcFinal >= 80) predicate = 'B';
      else if (calcFinal >= 70) predicate = 'C';
      else predicate = 'D';

      const narrative = buildAutoCompetencyDescription(item.tp_scores || {}, tps, targetKkm);

      return {
        ...item,
        final_score: calcFinal,
        predicate,
        competency_description: narrative || item.competency_description
      };
    });

    setReportItems(updated);
    setSaveForm(prev => ({ ...prev, method: 'calculated_from_components' }));
    setSuccessMsg('Nilai akhir berhasil dihitung otomatis dari bobot jenis pengujian!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Buka Modal Konfirmasi Simpan & Catatan User
  const handleOpenSaveModal = (defaultMethod = 'manual') => {
    const nextVer = historyList.length + 1;
    setSaveForm({
      method: defaultMethod,
      version_label: `Versi ${nextVer} (${defaultMethod === 'calculated_from_components' ? 'Otomatis Terbobot' : 'Input Manual'})`,
      notes: defaultMethod === 'calculated_from_components'
        ? 'Generate otomatis dari bobot ujian dan capaian TP'
        : 'Input manual nilai akhir rapor dan narasi capaian'
    });
    setSaveModalOpen(true);
  };

  const handleConfirmSaveReport = async () => {
    if (reportItems.length === 0) return;
    setProcessingReport(true);
    setErrorMsg('');
    try {
      const payload = {
        class_group_id: Number(selectedClassId),
        subject_id: Number(selectedSubjectId),
        semester_id: Number(selectedSemesterId),
        academic_year_id: Number(selectedAcademicYearId),
        method: saveForm.method,
        version_label: saveForm.version_label,
        notes: saveForm.notes,
        items: reportItems.map(item => ({
          student_id: item.student_id,
          final_score: item.final_score !== '' ? parseFloat(item.final_score) : null,
          predicate: item.predicate,
          tp_scores: item.tp_scores,
          type_scores: item.type_scores,
          competency_description: item.competency_description
        }))
      };

      await api.post('/akademik/scores/process-report', payload);
      setSuccessMsg(`Nilai akhir rapor (${saveForm.version_label}) berhasil disimpan ke riwayat & ditetapkan aktif!`);
      setSaveModalOpen(false);
      fetchReportProcessorData();
      fetchReportScoreHistory();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan pengolahan nilai rapor');
    } finally {
      setProcessingReport(false);
    }
  };

  // Aksi Riwayat Versi Nilai
  const handleActivateHistoryVersion = async (historyId) => {
    try {
      const res = await api.post(`/akademik/scores/report-history/${historyId}/activate`);
      setSuccessMsg(res.data?.message || 'Versi nilai berhasil diaktifkan!');
      fetchReportScoreHistory();
      fetchReportProcessorData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan versi nilai');
    }
  };

  const handleToggleHistoryVersion = async (historyId) => {
    try {
      const res = await api.patch(`/akademik/scores/report-history/${historyId}/toggle`);
      setSuccessMsg(res.data?.message || 'Status versi nilai berhasil diubah!');
      fetchReportScoreHistory();
      fetchReportProcessorData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengubah status versi nilai');
    }
  };

  const handleDeleteHistoryVersion = async (historyId) => {
    if (!confirm('Yakin ingin menghapus riwayat versi nilai ini?')) return;
    try {
      await api.delete(`/akademik/scores/report-history/${historyId}`);
      setSuccessMsg('Riwayat versi nilai berhasil dihapus!');
      fetchReportScoreHistory();
      if (selectedHistoryDetail?.id === historyId) setSelectedHistoryDetail(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus riwayat versi');
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

  // Unduh Format Spreadsheet Nilai Sikap
  const handleDownloadAttitudeTemplate = () => {
    const activeDim = attitudeDimensions.find(d => String(d.id) === String(activeDimensionId)) || attitudeDimensions[0];
    if (!activeDim) {
      alert('Dimensi sikap belum tersedia.');
      return;
    }

    const aoa = [
      ['TEMPLATE IMPORT NILAI SIKAP & KARAKTER (PROFIL PELAJAR PANCASILA)'],
      [`Tahun Ajaran: ${academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || '-'} | Rombel: ${activeClassName} | Semester: ${activeSemesterName}`],
      [`Dimensi Sikap: [${activeDim.code || 'DIM'}] ${activeDim.name}`],
      ['PETUNJUK: Jangan ubah kolom ID_SISWA, NIS, atau NAMA_SISWA. Isikan deskripsi capaian sikap siswa pada kolom DESKRIPSI_SIKAP.'],
      [],
      ['NO', 'ID_SISWA', 'NIS', 'NAMA_SISWA', 'KODE_DIMENSI', 'NAMA_DIMENSI', 'DESKRIPSI_SIKAP']
    ];

    attitudeItems.forEach((item, idx) => {
      const desc = item.scores?.[activeDim.id]?.description || '';
      aoa.push([
        idx + 1,
        item.student_id,
        item.nis || '',
        item.student_name,
        activeDim.code || '',
        activeDim.name || '',
        desc
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 16 },
      { wch: 35 },
      { wch: 65 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai_Sikap');
    const cleanDim = (activeDim.name || 'Dimensi').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanClass = activeClassName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Template_Nilai_Sikap_${cleanDim}_${cleanClass}_${activeSemesterName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Unduh Format Spreadsheet Nilai Ekstrakurikuler
  const handleDownloadExtraTemplate = () => {
    const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId)) || extracurriculars[0];
    if (!activeExtra) {
      alert('Pilih ekstrakurikuler terlebih dahulu.');
      return;
    }

    const aoa = [
      ['TEMPLATE IMPORT NILAI EKSTRAKURIKULER'],
      [`Tahun Ajaran: ${academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || '-'} | Rombel: ${activeClassName} | Semester: ${activeSemesterName}`],
      [`Kegiatan Ekstrakurikuler: ${activeExtra.name} ${activeExtra.coach_name ? `(Pembina: ${activeExtra.coach_name})` : ''}`],
      ['PETUNJUK: Pilihan PREDIKAT: Amat Baik / Baik / Cukup / Kurang. Kolom DESKRIPSI_CAPAIAN berisi narasi keaktifan.'],
      [],
      ['NO', 'ID_SISWA', 'NIS', 'NAMA_SISWA', 'NAMA_EKSTRAKURIKULER', 'PREDIKAT', 'DESKRIPSI_CAPAIAN']
    ];

    extraScoresList.forEach((item, idx) => {
      aoa.push([
        idx + 1,
        item.student_id,
        item.nis || '',
        item.student_name,
        activeExtra.name || '',
        item.predicate || 'Baik',
        item.description || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 25 },
      { wch: 14 },
      { wch: 65 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai_Ekskul');
    const cleanExtra = (activeExtra.name || 'Ekskul').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanClass = activeClassName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Template_Nilai_Ekskul_${cleanExtra}_${cleanClass}_${activeSemesterName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Unduh Format Spreadsheet Catatan Wali Kelas
  const handleDownloadHomeroomTemplate = () => {
    const aoa = [
      ['TEMPLATE IMPORT CATATAN WALI KELAS UNTUK BUKU RAPOR'],
      [`Tahun Ajaran: ${academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || '-'} | Rombel: ${activeClassName} | Semester: ${activeSemesterName}`],
      [`Wali Kelas: ${classes.find(c => String(c.id) === String(selectedClassId))?.homeroom_teacher_name || '-'}`],
      ['PETUNJUK: Jangan ubah kolom ID_SISWA, NIS, atau NAMA_SISWA. Isikan motivasi/catatan pada kolom CATATAN_WALI_KELAS.'],
      [],
      ['NO', 'ID_SISWA', 'NIS', 'NAMA_SISWA', 'CATATAN_WALI_KELAS']
    ];

    homeroomNotesList.forEach((item, idx) => {
      aoa.push([
        idx + 1,
        item.student_id,
        item.nis || '',
        item.student_name,
        item.homeroom_note || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 75 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan_Wali_Kelas');
    const cleanClass = activeClassName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Template_Catatan_Wali_Kelas_${cleanClass}_${activeSemesterName.replace(/\s+/g, '_')}.xlsx`;
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
          rowJoined.includes('ROMBONGAN BELAJAR') ||
          rowJoined.includes('KEGIATAN EKSTRAKURIKULER') ||
          rowJoined.includes('DIMENSI SIKAP') ||
          rowJoined.includes('WALI KELAS')
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
      const predikatIdx = headers.findIndex(h => /PREDIKAT|PREDICATE|^NILAI$/i.test(h));
      const catatanIdx = headers.findIndex(h => /CATATAN|WALI|NOTE|MOTIVASI|PESAN/i.test(h));

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
      } else if (importTargetType === 'attitude') {
        const parsed = [];
        let matched = 0;
        const activeDim = attitudeDimensions.find(d => String(d.id) === String(activeDimensionId)) || attitudeDimensions[0];

        dataRows.forEach(row => {
          if (!row || row.filter(Boolean).length === 0) return;
          const rawId = idSiswaIdx !== -1 && row[idSiswaIdx] !== '' ? String(row[idSiswaIdx]).trim() : null;
          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawNama = namaIdx !== -1 ? String(row[namaIdx] || '').trim() : '';

          if (!rawId && !rawNis && !rawNama) return;

          let item = null;
          if (rawId) item = attitudeItems.find(r => String(r.student_id).trim() === rawId);
          if (!item && rawNis) item = attitudeItems.find(r => String(r.nis || '').trim() === rawNis);
          if (!item && rawNama) {
            const cleanInputName = normalizeStr(rawNama);
            item = attitudeItems.find(r => normalizeStr(r.student_name) === cleanInputName);
            if (!item) {
              item = attitudeItems.find(r => normalizeStr(r.student_name).includes(cleanInputName) || cleanInputName.includes(normalizeStr(r.student_name)));
            }
          }

          if (item) {
            matched++;
            const desc = deskripsiIdx !== -1 && row[deskripsiIdx] ? String(row[deskripsiIdx]).trim() : '';
            parsed.push({
              student_id: item.student_id,
              nis: item.nis,
              student_name: item.student_name,
              description: desc,
              status: 'matched'
            });
          } else {
            parsed.push({
              student_id: null,
              nis: rawNis,
              student_name: rawNama || 'Tidak Ditemukan',
              description: '',
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
      } else if (importTargetType === 'extracurricular') {
        const parsed = [];
        let matched = 0;
        const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId)) || extracurriculars[0];

        dataRows.forEach(row => {
          if (!row || row.filter(Boolean).length === 0) return;
          const rawId = idSiswaIdx !== -1 && row[idSiswaIdx] !== '' ? String(row[idSiswaIdx]).trim() : null;
          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawNama = namaIdx !== -1 ? String(row[namaIdx] || '').trim() : '';

          if (!rawId && !rawNis && !rawNama) return;

          let item = null;
          if (rawId) item = extraScoresList.find(r => String(r.student_id).trim() === rawId);
          if (!item && rawNis) item = extraScoresList.find(r => String(r.nis || '').trim() === rawNis);
          if (!item && rawNama) {
            const cleanInputName = normalizeStr(rawNama);
            item = extraScoresList.find(r => normalizeStr(r.student_name) === cleanInputName);
            if (!item) {
              item = extraScoresList.find(r => normalizeStr(r.student_name).includes(cleanInputName) || cleanInputName.includes(normalizeStr(r.student_name)));
            }
          }

          if (item) {
            matched++;
            let pred = predikatIdx !== -1 && row[predikatIdx] ? String(row[predikatIdx]).trim() : item.predicate;
            if (pred && ['A', 'SB', 'SANGAT BAIK', 'AMAT BAIK'].includes(pred.toUpperCase())) pred = 'Amat Baik';
            else if (pred && ['B', 'BAIK'].includes(pred.toUpperCase())) pred = 'Baik';
            else if (pred && ['C', 'CUKUP'].includes(pred.toUpperCase())) pred = 'Cukup';
            else if (pred && ['D', 'K', 'KURANG'].includes(pred.toUpperCase())) pred = 'Kurang';

            const desc = deskripsiIdx !== -1 && row[deskripsiIdx] ? String(row[deskripsiIdx]).trim() : (item.description || buildDefaultExtraNarrative(activeExtra?.name || 'Ekstrakurikuler', pred));

            parsed.push({
              student_id: item.student_id,
              nis: item.nis,
              student_name: item.student_name,
              predicate: pred || 'Baik',
              description: desc,
              status: 'matched'
            });
          } else {
            parsed.push({
              student_id: null,
              nis: rawNis,
              student_name: rawNama || 'Tidak Ditemukan',
              predicate: 'Baik',
              description: '',
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
      } else if (importTargetType === 'homeroom_notes') {
        const parsed = [];
        let matched = 0;

        dataRows.forEach(row => {
          if (!row || row.filter(Boolean).length === 0) return;
          const rawId = idSiswaIdx !== -1 && row[idSiswaIdx] !== '' ? String(row[idSiswaIdx]).trim() : null;
          const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
          const rawNama = namaIdx !== -1 ? String(row[namaIdx] || '').trim() : '';

          if (!rawId && !rawNis && !rawNama) return;

          let item = null;
          if (rawId) item = homeroomNotesList.find(r => String(r.student_id).trim() === rawId);
          if (!item && rawNis) item = homeroomNotesList.find(r => String(r.nis || '').trim() === rawNis);
          if (!item && rawNama) {
            const cleanInputName = normalizeStr(rawNama);
            item = homeroomNotesList.find(r => normalizeStr(r.student_name) === cleanInputName);
            if (!item) {
              item = homeroomNotesList.find(r => normalizeStr(r.student_name).includes(cleanInputName) || cleanInputName.includes(normalizeStr(r.student_name)));
            }
          }

          if (item) {
            matched++;
            const note = catatanIdx !== -1 && row[catatanIdx] ? String(row[catatanIdx]).trim() : (deskripsiIdx !== -1 && row[deskripsiIdx] ? String(row[deskripsiIdx]).trim() : '');
            parsed.push({
              student_id: item.student_id,
              nis: item.nis,
              student_name: item.student_name,
              homeroom_note: note,
              status: 'matched'
            });
          } else {
            parsed.push({
              student_id: null,
              nis: rawNis,
              student_name: rawNama || 'Tidak Ditemukan',
              homeroom_note: '',
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
    } else if (importTargetType === 'attitude') {
      const activeDim = attitudeDimensions.find(d => String(d.id) === String(activeDimensionId)) || attitudeDimensions[0];
      setAttitudeItems(prev => {
        return prev.map(item => {
          const match = matchedRows.find(m => String(m.student_id) === String(item.student_id));
          if (!match || !activeDim) return item;
          return {
            ...item,
            scores: {
              ...(item.scores || {}),
              [activeDim.id]: {
                ...(item.scores?.[activeDim.id] || {}),
                aspect: activeDim.name || 'Dimensi Sikap',
                description: match.description !== undefined && match.description !== '' ? match.description : item.scores?.[activeDim.id]?.description || ''
              }
            }
          };
        });
      });
      setSuccessMsg(`Berhasil mengimpor nilai sikap untuk ${matchedRows.length} siswa pada dimensi "${activeDim?.name}"!`);
    } else if (importTargetType === 'extracurricular') {
      const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId)) || extracurriculars[0];
      setExtraScoresList(prev => {
        return prev.map(item => {
          const match = matchedRows.find(m => String(m.student_id) === String(item.student_id));
          if (!match) return item;
          return {
            ...item,
            predicate: match.predicate || item.predicate,
            description: match.description || item.description
          };
        });
      });
      setSuccessMsg(`Berhasil mengimpor nilai ekstrakurikuler untuk ${matchedRows.length} siswa pada kegiatan "${activeExtra?.name}"!`);
    } else if (importTargetType === 'homeroom_notes') {
      setHomeroomNotesList(prev => {
        return prev.map(item => {
          const match = matchedRows.find(m => String(m.student_id) === String(item.student_id));
          if (!match) return item;
          return {
            ...item,
            homeroom_note: match.homeroom_note !== undefined && match.homeroom_note !== '' ? match.homeroom_note : item.homeroom_note
          };
        });
      });
      setSuccessMsg(`Berhasil mengimpor catatan wali kelas untuk ${matchedRows.length} siswa!`);
    }

    setImportModalOpen(false);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Active Subject & Class Labels
  const activeClassName = classes.find(c => String(c.id) === String(selectedClassId))?.name || 'Pilih Rombel';
  const activeSubjectName = subjects.find(s => String(s.id) === String(selectedSubjectId))?.name || 'Pilih Mapel';
  const activeSemesterName = semesters.find(s => String(s.id) === String(selectedSemesterId))?.name || 'Semester';

  const academicYearOptions = useMemo(() => {
    return academicYears.map(y => ({
      value: String(y.id),
      label: y.name,
      badge: y.is_active ? 'Aktif' : null,
      sublabel: y.start_date && y.end_date ? `${y.start_date.split('T')[0]} s/d ${y.end_date.split('T')[0]}` : null
    }));
  }, [academicYears]);

  const semesterOptions = useMemo(() => {
    return semesters.map(s => ({
      value: String(s.id),
      label: s.name,
      badge: s.is_active ? 'Aktif' : null,
      sublabel: s.academic_year_name || null
    }));
  }, [semesters]);

  const classOptions = useMemo(() => {
    return classes.map(c => ({
      value: String(c.id),
      label: c.name,
      sublabel: c.homeroom_teacher_name ? `Wali: ${c.homeroom_teacher_name}` : (c.grade_level_name || null),
      badge: c.grade_level_name || null
    }));
  }, [classes]);

  const subjectOptions = useMemo(() => {
    return subjects.map(s => ({
      value: String(s.id),
      label: s.name,
      badge: s.code || null,
      sublabel: s.category ? `Kategori: ${s.category}` : null
    }));
  }, [subjects]);

  const extracurricularOptions = useMemo(() => {
    return extracurriculars.map(e => ({
      value: String(e.id),
      label: e.name,
      badge: e.category || 'Ekskul',
      sublabel: e.coach_name ? `Pembina: ${e.coach_name}` : null
    }));
  }, [extracurriculars]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Input Nilai Mata Pelajaran (Mapel)</span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold uppercase tracking-wider">
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shadow-teal-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jenis Pengujian</span>
            </button>
          )}

          {activeTab === 'assessment_sessions' && (
            <button
              onClick={handleOpenAddSession}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 shadow-teal-600/20"
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
                type="button"
                onClick={() => setHistoryModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition active:scale-95 shadow-2xs"
                title="Buka riwayat versi penginputan nilai rapor"
              >
                <History className="w-4 h-4 text-indigo-600" />
                <span>Riwayat & Versi</span>
                {historyList.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-black">
                    {historyList.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleCalculateFromComponents}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl transition active:scale-95"
                title="Hitung nilai akhir secara otomatis dari bobot ujian/tugas"
              >
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Hitung dari Bobot</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateAllNarratives}
                className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition active:scale-95"
                title="Generate otomatis narasi capaian tertinggi & terendah berbasis Tujuan Pembelajaran (TP)"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Auto Narasi TP</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenSaveModal('manual')}
                disabled={processingReport || reportItems.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Nilai Rapor</span>
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
                  ? 'bg-emerald-600 text-white shadow-md shadow-teal-600/20'
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
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Tahun Ajaran */}
            <CustomFilterSelect
              icon={Calendar}
              label="Tahun Ajaran"
              value={selectedAcademicYearId}
              onChange={setSelectedAcademicYearId}
              options={academicYearOptions}
              placeholder="Pilih TA"
              colorScheme="slate"
              minWidth="min-w-[170px]"
            />

            {/* Semester */}
            <CustomFilterSelect
              icon={Layers}
              label="Semester"
              value={selectedSemesterId}
              onChange={setSelectedSemesterId}
              options={semesterOptions}
              placeholder="Pilih Semester"
              colorScheme="slate"
              minWidth="min-w-[170px]"
            />

            {/* Rombel / Kelas */}
            <CustomFilterSelect
              icon={Users}
              label="Rombel / Kelas"
              value={selectedClassId}
              onChange={setSelectedClassId}
              options={classOptions}
              placeholder="Pilih Rombel"
              searchable={true}
              colorScheme="indigo"
              minWidth="min-w-[190px]"
            />

            {/* Mata Pelajaran (Kecuali Tab 5 Leger) */}
            {activeTab !== 'ledger_print' && (
              <CustomFilterSelect
                icon={BookOpen}
                label="Mata Pelajaran"
                value={selectedSubjectId}
                onChange={setSelectedSubjectId}
                options={subjectOptions}
                placeholder="Pilih Mapel"
                searchable={true}
                colorScheme="teal"
                minWidth="min-w-[240px]"
              />
            )}
          </div>

          <div className="text-right hidden lg:block">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Konfigurasi Aktif
            </span>
            <span className="text-xs font-black text-slate-800">
              {activeClassName} • {activeSemesterName}
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
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4 w-28">Kode</th>
                  <th className="py-3 px-4">Nama Jenis Pengujian</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 w-32 text-center">Ruang Lingkup</th>
                  <th className="py-3 px-4 w-32 text-center bg-emerald-50/60 font-black text-emerald-900">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
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
                      <td className="py-3.5 px-4 text-center bg-emerald-50/30">
                        <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-black text-xs shadow-2xs">
                          {type.weight_percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditType(type)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">
                  Daftar Sesi Pengujian & Tugas: <span className="text-emerald-700">{activeSubjectName}</span> ({activeClassName})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Setiap jenis penilaian dapat dilaksanakan berkali-kali per Tujuan Pembelajaran (TP). Klik tombol <strong>Input Nilai Siswa</strong> untuk mengisi skor.
                </p>
              </div>
              <button
                onClick={handleOpenAddSession}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-2xs"
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
                  <th className="py-3 px-4 w-28 text-center bg-emerald-50/50">Rata-Rata</th>
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
                              <span key={tp.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-mono font-bold" title={tp.description}>
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
                      <td className="py-3.5 px-4 text-center bg-emerald-50/30 font-black text-emerald-800">
                        {session.average_score !== null ? `${session.average_score}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSessionScoring(session.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-2xs inline-flex items-center gap-1"
                          title="Input Nilai Siswa untuk Sesi Ini"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Input Nilai</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditSession(session)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
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
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Matriks Nilai Rombel:</span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">{activeClassName}</span>
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
                <Download className="w-3.5 h-3.5 text-emerald-600" />
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
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
                      className="py-2 px-3 text-center bg-emerald-50/70 border-r border-emerald-200 text-emerald-950 font-black"
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

                  <th rowSpan={2} className="py-3 px-4 text-center bg-emerald-600 text-white font-black w-28">
                    Estimasi NA
                  </th>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-100/70 text-[11px]">
                  {/* Sub-header TP Codes */}
                  {recapData?.learning_objectives?.map(tp => (
                    <th key={tp.id} className="py-2 px-3 text-center font-mono font-bold text-emerald-900 border-r border-slate-200" title={tp.description}>
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
                                  isPass ? 'text-emerald-900 bg-emerald-50' : 'text-rose-700 bg-rose-50'
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
                        <td className="py-2.5 px-4 text-center bg-emerald-50/40 font-black text-emerald-900 text-xs">
                          {estimatedFinal !== null && estimatedFinal !== undefined ? (
                            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-black text-xs shadow-2xs">
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
      {/* 4. TAB 4: PENGOLAHAN NILAI RAPOR, SIKAP, PRAMUKA & CATATAN */}
      {/* ======================================================== */}
      {activeTab === 'report_processor' && (
        <div className="space-y-4">
          {/* Sub-Tab Navigation Bar */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setReportSubTab('academic')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                reportSubTab === 'academic'
                  ? 'bg-emerald-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Nilai Mapel & Narasi TP</span>
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab('attitude')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                reportSubTab === 'attitude'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>2. Nilai Sikap & Karakter (Dimensi Sikap)</span>
              {attitudeDimensions.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  reportSubTab === 'attitude' ? 'bg-white text-amber-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {attitudeDimensions.length} Dimensi
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab('extracurricular')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                reportSubTab === 'extracurricular'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>3. Nilai Ekstrakurikuler</span>
              {extracurriculars.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  reportSubTab === 'extracurricular' ? 'bg-white text-indigo-900' : 'bg-indigo-100 text-indigo-900'
                }`}>
                  {extracurriculars.length} Ekskul
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setReportSubTab('homeroom_notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                reportSubTab === 'homeroom_notes'
                  ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>4. Catatan Wali Kelas</span>
            </button>
          </div>

          {/* ---------------------------------------------------- */}
          {/* 4.1 SUB-TAB 1: NILAI MAPEL & NARASI TP */}
          {/* ---------------------------------------------------- */}
          {reportSubTab === 'academic' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-indigo-50 to-amber-50 border border-emerald-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
                <div>
                  <span className="font-black text-emerald-950 text-sm block flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Pengolahan Nilai Akhir & Narasi Capaian Mata Pelajaran</span>
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Mapel: <strong>{activeSubjectName}</strong> • Rombel: <strong>{activeClassName}</strong> • Semester: <strong>{activeSemesterName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5 active:scale-95"
                    title="Buka riwayat versi penginputan nilai rapor"
                  >
                    <History className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Riwayat & Versi Nilai</span>
                    {historyList.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-black">
                        {historyList.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCalculateFromComponents}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5 active:scale-95"
                    title="Kalkulasi nilai akhir dari bobot jenis pengujian"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Hitung dari Bobot Komponen</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadReportTemplate}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unduh format spreadsheet Excel (.xlsx) nilai rapor & deskripsi capaian"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerFileInput('report')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unggah spreadsheet untuk update nilai rapor & deskripsi sekaligus"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAllNarratives}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto Narasi TP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSaveModal('manual')}
                    disabled={processingReport || reportItems.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Nilai Rapor</span>
                  </button>
                </div>
              </div>

              {/* Active Version Info Banner */}
              {(() => {
                const activeVersion = historyList.find(h => h.is_active);
                if (!activeVersion) return null;
                return (
                  <div className="p-3.5 bg-emerald-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-emerald-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-300">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-white">Versi Rapor Aktif: {activeVersion.version_label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeVersion.method === 'calculated_from_components' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-amber-500/30 text-amber-200'
                          }`}>
                            {activeVersion.method === 'calculated_from_components' ? 'Otomatis Terbobot' : 'Input Manual'}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-200 mt-0.5">
                          Catatan: <em>{activeVersion.user_notes || 'Tanpa keterangan'}</em> • Disimpan oleh <strong>{activeVersion.recorded_by_name || 'Staf'}</strong> ({new Date(activeVersion.created_at).toLocaleString('id-ID')})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setHistoryModalOpen(true)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <History className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Kelola Versi</span>
                    </button>
                  </div>
                );
              })()}

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-24">NIS</th>
                      <th className="py-3 px-4 w-48">Nama Siswa</th>
                      <th className="py-3 px-4 w-28 text-center bg-emerald-50 font-black text-emerald-900">
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
                            <td className="py-3 px-4 text-center bg-emerald-50/30">
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
                                className={`w-20 px-2 py-1.5 text-center text-xs font-black rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                                  isPass
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              />
                            </td>

                            {/* Predikat */}
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                item.predicate === 'A' ? 'bg-emerald-100 text-emerald-900' :
                                item.predicate === 'B' ? 'bg-emerald-100 text-emerald-900' :
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
                                className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed text-slate-800"
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

          {/* ---------------------------------------------------- */}
          {/* 4.2 SUB-TAB 2: NILAI SIKAP & KARAKTER (DIMENSI SIKAP) */}
          {/* ---------------------------------------------------- */}
          {reportSubTab === 'attitude' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-50 to-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
                <div>
                  <span className="font-black text-amber-950 text-sm block flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-amber-600" />
                    <span>Penilaian Sikap & Karakter (Profil Pelajar Pancasila / Dimensi Sikap)</span>
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Tahun Ajaran: <strong>{academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || 'Aktif'}</strong> • Rombel: <strong>{activeClassName}</strong> • Nilai sikap berupa deskripsi naratif per dimensi sikap.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAddDimension}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kelola Dimensi Sikap TA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadAttitudeTemplate}
                    disabled={attitudeItems.length === 0}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unduh format spreadsheet Excel (.xlsx) penilaian sikap"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-600" />
                    <span>Unduh Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerFileInput('attitude')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unggah spreadsheet untuk update nilai deskripsi sikap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoFillAttitudeDescriptions}
                    disabled={attitudeItems.length === 0 || attitudeDimensions.length === 0}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Isi Narasi Dimensi Ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAttitudeScores}
                    disabled={savingAttitude || attitudeItems.length === 0}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    {savingAttitude ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Simpan Nilai Sikap</span>
                  </button>
                </div>
              </div>

              {/* Dimension Selector Pills */}
              <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 px-3 uppercase tracking-wider shrink-0">
                  Pilih Dimensi:
                </span>
                {attitudeDimensions.map((dim, idx) => {
                  const isSelected = String(dim.id) === String(activeDimensionId);
                  return (
                    <button
                      key={dim.id}
                      type="button"
                      onClick={() => setActiveDimensionId(String(dim.id))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                        isSelected ? 'bg-white text-amber-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[200px]">{dim.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Dimension Description Banner */}
              {(() => {
                const activeDim = attitudeDimensions.find(d => String(d.id) === String(activeDimensionId));
                if (!activeDim) return null;
                return (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <strong>Dimensi Aktif: {activeDim.name}</strong>
                        {activeDim.description && <span className="text-amber-700 ml-1.5">({activeDim.description})</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDimension(activeDim)}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Dimensi</span>
                    </button>
                  </div>
                );
              })()}

              {/* Table Attitude Scores */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-24">NIS</th>
                      <th className="py-3 px-4 w-48">Nama Siswa</th>
                      <th className="py-3 px-4 min-w-[380px]">
                        Deskripsi Capaian Sikap & Karakter (Dimensi: {attitudeDimensions.find(d => String(d.id) === String(activeDimensionId))?.name || 'Aktif'})
                      </th>
                      <th className="py-3 px-4 w-32 text-center">Status Terisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loadingAttitude ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                          <span>Memuat data nilai sikap siswa...</span>
                        </td>
                      </tr>
                    ) : attitudeItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          Belum ada siswa pada rombel ini.
                        </td>
                      </tr>
                    ) : (
                      attitudeItems.map((st, idx) => {
                        const currentDesc = st.scores?.[activeDimensionId]?.description || '';
                        const isFilled = currentDesc.trim().length > 0;

                        return (
                          <tr key={st.student_id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{st.nis || '-'}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{st.student_name}</td>
                            
                            {/* Live Textarea Deskripsi Sikap */}
                            <td className="py-3 px-4">
                              <textarea
                                rows={2}
                                value={currentDesc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...attitudeItems];
                                  const activeDim = attitudeDimensions.find(d => String(d.id) === String(activeDimensionId));
                                  updated[idx].scores = {
                                    ...updated[idx].scores,
                                    [activeDimensionId]: {
                                      ...(updated[idx].scores?.[activeDimensionId] || {}),
                                      aspect: activeDim?.name || 'Dimensi Sikap',
                                      description: val
                                    }
                                  };
                                  setAttitudeItems(updated);
                                }}
                                placeholder={`Tuliskan narasi perkembangan sikap ${st.student_name} pada dimensi ini...`}
                                className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed text-slate-800"
                              />
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isFilled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                                  <Check className="w-3 h-3" />
                                  <span>Terisi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-medium text-[11px]">
                                  <span>Kosong</span>
                                </span>
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

          {/* ---------------------------------------------------- */}
          {/* 4.3 SUB-TAB 3: NILAI EKSTRAKURIKULER */}
          {/* ---------------------------------------------------- */}
          {reportSubTab === 'extracurricular' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-indigo-50 to-emerald-50 border border-indigo-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs shadow-xs">
                <div>
                  <span className="font-black text-indigo-950 text-sm block flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span>Penilaian Ekstrakurikuler Siswa untuk Buku Rapor</span>
                  </span>
                  <p className="text-[11px] text-indigo-800 mt-0.5">
                    Rombel: <strong>{activeClassName}</strong> • Semester: <strong>{activeSemesterName}</strong> • Pilih ekstrakurikuler di bawah ini untuk menilai siswa.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadExtraTemplate}
                    disabled={extraScoresList.length === 0 || !selectedExtraId}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unduh format spreadsheet Excel (.xlsx) penilaian ekstrakurikuler"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Unduh Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerFileInput('extracurricular')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unggah spreadsheet untuk update nilai predikat & deskripsi ekstrakurikuler"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoGenerateExtraDescriptions}
                    disabled={extraScoresList.length === 0 || !selectedExtraId}
                    className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-sm transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto Narasi Sesuai Predikat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveExtraScores}
                    disabled={savingExtra || extraScoresList.length === 0 || !selectedExtraId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    {savingExtra ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Simpan Nilai Ekstrakurikuler</span>
                  </button>
                </div>
              </div>

              {/* Selector Ekstrakurikuler Dropdown */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    Pilih Ekstrakurikuler:
                  </span>
                  <CustomFilterSelect
                    icon={Compass}
                    label="Ekstrakurikuler"
                    value={selectedExtraId}
                    onChange={(val) => {
                      setSelectedExtraId(val);
                    }}
                    options={extracurricularOptions}
                    placeholder="Pilih Ekstrakurikuler"
                    searchable={true}
                    colorScheme="indigo"
                    minWidth="min-w-[260px] flex-1 max-w-md"
                  />
                </div>

                {(() => {
                  const activeExtra = extracurriculars.find(e => String(e.id) === String(selectedExtraId));
                  if (!activeExtra) return null;
                  return (
                    <div className="flex items-center gap-2 text-xs text-indigo-900 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 shrink-0">
                      <span className="font-bold">{activeExtra.name}</span>
                      {activeExtra.category && (
                        <span className="px-2 py-0.5 bg-indigo-200/70 text-indigo-950 rounded-md text-[10px] font-bold">
                          {activeExtra.category}
                        </span>
                      )}
                      {activeExtra.coach_name && (
                        <span className="text-slate-500 text-[11px]">
                          (Pembina: {activeExtra.coach_name})
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Table Extra Scores */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-24">NIS</th>
                      <th className="py-3 px-4 w-48">Nama Siswa</th>
                      <th className="py-3 px-4 w-36 text-center bg-indigo-50 font-black text-indigo-900">
                        Predikat Ekskul *
                      </th>
                      <th className="py-3 px-4 min-w-[360px]">
                        Deskripsi Capaian Ekstrakurikuler ({extracurriculars.find(e => String(e.id) === String(selectedExtraId))?.name || 'Ekskul'})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loadingExtra ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                          <span>Memuat nilai ekstrakurikuler siswa...</span>
                        </td>
                      </tr>
                    ) : extraScoresList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          {extracurriculars.length === 0
                            ? 'Belum ada data master ekstrakurikuler pada unit ini.'
                            : 'Belum ada data siswa untuk diolah.'}
                        </td>
                      </tr>
                    ) : (
                      extraScoresList.map((item, idx) => (
                        <tr key={item.student_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{item.nis || '-'}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{item.student_name}</td>

                          {/* Predikat Ekstrakurikuler */}
                          <td className="py-3 px-4 text-center bg-indigo-50/30">
                            <select
                              value={item.predicate}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...extraScoresList];
                                updated[idx].predicate = val;
                                const activeExtra = extracurriculars.find(ex => String(ex.id) === String(selectedExtraId));
                                updated[idx].description = buildDefaultExtraNarrative(activeExtra?.name || 'Ekstrakurikuler', val);
                                setExtraScoresList(updated);
                              }}
                              className="px-3 py-1.5 text-xs font-black rounded-lg border border-indigo-200 bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                            >
                              <option value="Amat Baik">Amat Baik</option>
                              <option value="Baik">Baik</option>
                              <option value="Cukup">Cukup</option>
                              <option value="Kurang">Kurang</option>
                            </select>
                          </td>

                          {/* Deskripsi Capaian Ekstrakurikuler */}
                          <td className="py-3 px-4">
                            <textarea
                              rows={2}
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...extraScoresList];
                                updated[idx].description = e.target.value;
                                setExtraScoresList(updated);
                              }}
                              placeholder={`Deskripsi capaian dan keaktifan kegiatan ${extracurriculars.find(e => String(e.id) === String(selectedExtraId))?.name || 'ekstrakurikuler'}...`}
                              className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed text-slate-800"
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

          {/* ---------------------------------------------------- */}
          {/* 4.4 SUB-TAB 4: CATATAN WALI KELAS */}
          {/* ---------------------------------------------------- */}
          {reportSubTab === 'homeroom_notes' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50 border border-slate-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
                <div>
                  <span className="font-black text-slate-900 text-sm block flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>Catatan Wali Kelas untuk Buku Rapor Siswa</span>
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Rombel: <strong>{activeClassName}</strong> • Wali Kelas: <strong>{classes.find(c => String(c.id) === String(selectedClassId))?.homeroom_teacher_name || '-'}</strong> • Catatan motivasi dan saran pengembangan bagi siswa.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadHomeroomTemplate}
                    disabled={homeroomNotesList.length === 0}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unduh format spreadsheet Excel (.xlsx) catatan wali kelas"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerFileInput('homeroom_notes')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                    title="Unggah spreadsheet untuk update catatan wali kelas"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveHomeroomNotes}
                    disabled={savingHomeroom || homeroomNotesList.length === 0}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    {savingHomeroom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Simpan Catatan Wali Kelas</span>
                  </button>
                </div>
              </div>

              {/* Quick Template Suggestion Chips */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Template Cepat Catatan Wali Kelas (Klik untuk terapkan ke siswa yang kosong):
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    'Tingkatkan kedisiplinan dan pertahankan prestasimu di semester depan!',
                    'Terus asah bakat dan kreativitasmu, jangan mudah menyerah!',
                    'Perbanyak membaca buku dan aktif berdiskusi dalam kelompok belajar.',
                    'Prestasi yang sangat membanggakan, teruslah menjadi teladan bagi teman-teman!',
                    'Perlu meningkatkan kehadiran dan keaktifan dalam menyelesaikan tugas-tugas kelas.'
                  ].map((tpl, tIdx) => (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => {
                        const updated = homeroomNotesList.map(item => ({
                          ...item,
                          homeroom_note: item.homeroom_note ? item.homeroom_note : tpl
                        }));
                        setHomeroomNotesList(updated);
                        setSuccessMsg('Template catatan diterapkan pada kolom yang masih kosong!');
                        setTimeout(() => setSuccessMsg(''), 3000);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium transition text-left"
                    >
                      "{tpl}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Homeroom Notes */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-24">NIS</th>
                      <th className="py-3 px-4 w-48">Nama Siswa</th>
                      <th className="py-3 px-4 min-w-[380px]">
                        Catatan & Motivasi Wali Kelas untuk Rapor
                      </th>
                      <th className="py-3 px-4 w-36 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loadingHomeroom ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                          <span>Memuat catatan wali kelas...</span>
                        </td>
                      </tr>
                    ) : homeroomNotesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                          Belum ada data siswa untuk diolah.
                        </td>
                      </tr>
                    ) : (
                      homeroomNotesList.map((item, idx) => (
                        <tr key={item.student_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{item.nis || '-'}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{item.student_name}</td>

                          {/* Live Textarea Catatan */}
                          <td className="py-3 px-4">
                            <textarea
                              rows={2}
                              value={item.homeroom_note}
                              onChange={(e) => {
                                const updated = [...homeroomNotesList];
                                updated[idx].homeroom_note = e.target.value;
                                setHomeroomNotesList(updated);
                              }}
                              placeholder="Tuliskan catatan wali kelas untuk lembar rapor siswa..."
                              className="w-full p-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:outline-none leading-relaxed text-slate-800"
                            />
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleApplyHomeroomTemplate(idx, 'Pertahankan prestasimu dan teruslah bersemangat dalam belajar!')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition w-full"
                            >
                              + Motivasi Positif
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAB 5: BUKU NILAI (LEGER) & CETAK RAPOR */}
      {/* ======================================================== */}
      {activeTab === 'ledger_print' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
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
                    <th className="py-3 px-3 text-center bg-emerald-50 font-black text-emerald-950 w-20">Rata2</th>
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
                        <td className="py-2.5 px-3 text-center bg-emerald-50/30 font-black text-emerald-900">{st.average_score}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleOpenStudentReportPreview(st)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 w-full"
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
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
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
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
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-800"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 font-bold"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                            isSelected ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-700'
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
                            className="rounded text-emerald-600 focus:ring-0 mt-0.5 w-3.5 h-3.5"
                          />
                          <div>
                            <span className="font-mono text-emerald-700 font-black mr-1.5">{tp.code}</span>
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
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
          <div className="bg-white rounded-xl max-w-5xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Input Nilai: {activeSessionDetail.session?.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Jenis: <strong className="text-indigo-700">{activeSessionDetail.session?.assessment_type_name}</strong> • Mapel: <strong className="text-emerald-700">{activeSubjectName}</strong> • Rombel: <strong className="text-slate-800">{activeClassName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadSessionTemplate}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-1.5"
                  title="Unduh template spreadsheet Excel (.xlsx) dengan daftar siswa rombel ini"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
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
                        <th key={tp.id} className="py-2.5 px-3 text-center bg-emerald-50 font-black text-emerald-900 w-28" title={tp.description}>
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
                            <td key={tp.id} className="py-2 px-3 text-center bg-emerald-50/20">
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
                                className="w-16 px-2 py-1 text-center font-black text-emerald-900 bg-white border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
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
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
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
                <span className="font-black text-sm text-emerald-800">{previewStudentReport.average_score}</span>
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-1.5"
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
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in">
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
                    File: <strong className="text-slate-800">{importFileName}</strong> • Target: <strong className="text-emerald-700 uppercase">{importTargetType === 'session' ? 'Sesi Penilaian' : importTargetType === 'recap' ? 'Matriks Nilai' : 'Nilai Rapor'}</strong>
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
                    <th className="py-2 px-3 text-center w-40">
                      {importTargetType === 'attitude' ? 'Deskripsi Sikap' :
                       importTargetType === 'extracurricular' ? 'Predikat / Deskripsi' :
                       importTargetType === 'homeroom_notes' ? 'Catatan Wali Kelas' :
                       'Nilai / Skor'}
                    </th>
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
                        {importTargetType === 'attitude' ? (
                          <span className="text-[11px] text-amber-900 line-clamp-1 max-w-[220px] mx-auto block text-left" title={r.description}>
                            {r.description || '-'}
                          </span>
                        ) : importTargetType === 'extracurricular' ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded font-black text-[10px]">
                              {r.predicate || 'Baik'}
                            </span>
                            {r.description && (
                              <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[150px]" title={r.description}>
                                {r.description}
                              </span>
                            )}
                          </div>
                        ) : importTargetType === 'homeroom_notes' ? (
                          <span className="text-[11px] text-slate-800 line-clamp-1 max-w-[220px] mx-auto block text-left" title={r.homeroom_note}>
                            {r.homeroom_note || '-'}
                          </span>
                        ) : r.score !== null && r.score !== undefined ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded font-black">
                            {r.score}
                          </span>
                        ) : r.final_score !== null && r.final_score !== undefined ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded font-black">
                            {r.final_score}
                          </span>
                        ) : r.tp_averages && Object.keys(r.tp_averages).length > 0 ? (
                          <span className="text-[11px] text-emerald-800">
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan {importStats.matchedCount} Nilai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: KONFIRMASI SIMPAN NILAI RAPOR & REKAM RIWAYAT */}
      {/* ======================================================== */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Save className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Simpan & Kunci Nilai Rapor</h3>
                  <p className="text-[11px] text-slate-500">Rekam riwayat versi penginputan nilai rapor semester ini</p>
                </div>
              </div>
              <button onClick={() => setSaveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Metode Penginputan Nilai</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveForm({ ...saveForm, method: 'manual' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      saveForm.method === 'manual'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-black text-xs">Input Manual</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Nilai dan narasi diinput atau disesuaikan secara langsung oleh guru/staf.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveForm({ ...saveForm, method: 'calculated_from_components' })}
                    className={`p-3 rounded-xl border text-left transition ${
                      saveForm.method === 'calculated_from_components'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-black text-xs">Otomatis Terbobot</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight block">
                      Dihasilkan dari rata-rata nilai harian, ulangan, dan ujian sesuai bobot.
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama / Label Versi</label>
                <input
                  type="text"
                  value={saveForm.version_label}
                  onChange={(e) => setSaveForm({ ...saveForm, version_label: e.target.value })}
                  placeholder="misal: Versi 1 (Final Semester), Versi Perbaikan Remedial"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan / Catatan Penginputan *</label>
                <textarea
                  rows={3}
                  value={saveForm.notes}
                  onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
                  placeholder="Tuliskan keterangan penginputan nilai ini (misal: Nilai rapor semester 1 santri angkatan 2019)..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-800 leading-relaxed"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-600 font-medium">
                <span>Jumlah Siswa yang Disimpan:</span>
                <strong className="text-emerald-800 font-black">{reportItems.length} Siswa</strong>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveReport}
                  disabled={processingReport}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition active:scale-95"
                >
                  {processingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Versi Nilai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: RIWAYAT & VERSI PENGINPUTAN NILAI RAPOR */}
      {/* ======================================================== */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Riwayat & Versi Penginputan Nilai Rapor</h3>
                  <p className="text-[11px] text-slate-500">
                    Daftar seluruh versi penginputan nilai untuk kelas <strong>{activeClassName}</strong> • Mapel <strong>{subjects.find(s => String(s.id) === String(selectedSubjectId))?.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History List Content */}
            <div className="overflow-y-auto space-y-3 pr-1 grow">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <span>Memuat riwayat penginputan nilai...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Belum ada riwayat penginputan nilai yang tersimpan untuk kelas dan mapel ini.</p>
                </div>
              ) : (
                historyList.map((h) => (
                  <div
                    key={h.id}
                    className={`p-4 rounded-xl border transition ${
                      h.is_active
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs">{h.version_label}</span>
                          {h.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Versi Aktif (Rapor Resmi)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                              Nonaktif
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            h.method === 'calculated_from_components'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {h.method === 'calculated_from_components' ? 'Otomatis Terbobot' : 'Input Manual'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium">
                          {h.user_notes || 'Tanpa catatan khusus'}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium pt-1">
                          <span>Penginput: <strong>{h.recorded_by_name || 'Staf'}</strong></span>
                          <span>•</span>
                          <span>Waktu: <strong>{new Date(h.created_at).toLocaleString('id-ID')}</strong></span>
                          <span>•</span>
                          <span>Snapshot: <strong>{h.student_count || 0} Siswa</strong></span>
                        </div>
                      </div>

                      {/* Actions per Version */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        {!h.is_active ? (
                          <button
                            type="button"
                            onClick={() => handleActivateHistoryVersion(h.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1"
                            title="Tetapkan versi ini sebagai nilai rapor resmi aktif"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Tetapkan Aktif</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleHistoryVersion(h.id)}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl font-bold text-xs transition flex items-center gap-1"
                            title="Nonaktifkan versi nilai ini"
                          >
                            <ToggleRight className="w-3.5 h-3.5" />
                            <span>Nonaktifkan</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryVersion(h.id)}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                          title="Hapus versi ini dari riwayat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs">
              <span className="text-[11px] text-slate-500">
                Total Tersimpan: <strong>{historyList.length}</strong> Versi
              </span>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: KELOLA DIMENSI SIKAP PER TAHUN AJARAN */}
      {/* ======================================================== */}
      {dimensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingDimension ? 'Edit Dimensi Sikap' : 'Kelola Dimensi Sikap TA'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tahun Ajaran: <strong>{academicYears.find(y => String(y.id) === String(selectedAcademicYearId))?.name || 'Aktif'}</strong> • Profil Pelajar Pancasila
                  </p>
                </div>
              </div>
              <button onClick={() => setDimensionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Existing Dimensions */}
            {!editingDimension && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Dimensi Terkonfigurasi ({attitudeDimensions.length}):
                  </span>
                </div>
                {attitudeDimensions.map((dim, idx) => (
                  <div key={dim.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {dim.order_index || idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{dim.name}</span>
                        {dim.code && <span className="text-[10px] text-slate-400 font-mono">Kode: {dim.code}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditDimension(dim)}
                        className="p-1.5 hover:bg-white text-slate-600 hover:text-amber-700 rounded-lg transition"
                        title="Edit Dimensi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDimension(dim.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        title="Hapus Dimensi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form Input / Edit Dimensi */}
            <form onSubmit={handleSaveDimensionForm} className="space-y-3 pt-2 border-t border-slate-100 shrink-0">
              <span className="text-xs font-black text-slate-800 block">
                {editingDimension ? 'Form Edit Dimensi Sikap' : '+ Tambah Dimensi Sikap Baru'}
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Kode</label>
                  <input
                    type="text"
                    value={dimensionForm.code}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, code: e.target.value })}
                    placeholder="DIM-1"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Urutan</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={dimensionForm.order_index}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, order_index: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Nama Dimensi Sikap *</label>
                  <input
                    type="text"
                    required
                    value={dimensionForm.name}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, name: e.target.value })}
                    placeholder="Contoh: Beriman, Bertakwa kepada Tuhan YME dan Berakhlak Mulia"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-800"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Keterangan / Indikator (Opsional)</label>
                  <textarea
                    rows={2}
                    value={dimensionForm.description}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, description: e.target.value })}
                    placeholder="Deskripsi singkat indikator sikap dimensi ini..."
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {editingDimension && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDimension(null);
                      setDimensionForm({ id: null, code: `DIM-${attitudeDimensions.length + 1}`, name: '', description: '', order_index: attitudeDimensions.length + 1 });
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold"
                  >
                    Batal Edit
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setDimensionModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingDimension ? 'Perbarui Dimensi' : 'Simpan Dimensi'}</span>
                  </button>
                </div>
              </div>
            </form>
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
