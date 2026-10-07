import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Award,
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Save,
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  Check,
  Zap,
  Info,
  SlidersHorizontal,
  HelpCircle,
  FileCheck2,
  HeartHandshake,
  Target,
  Layers,
  Wand2,
  TrendingUp,
  Verified,
  AlertCircle,
  Send,
  Upload,
  BarChart3,
  Filter,
  X,
  Keyboard,
  Printer,
  FileSpreadsheet,
  Cloud
} from 'lucide-react';
import { useTeacherContext } from '../context/TeacherContext';
import { scoreService } from '../services/scoreService';
import PageHeader from '../components/PageHeader';
import SelectorKonteks from '../components/SelectorKonteks';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField, { Input, Select, Textarea } from '../components/FormField';
import BottomSheet from '../components/BottomSheet';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function NilaiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeContext, teachingAssignments } = useTeacherContext();

  // Active Main Tab: 'session' | 'tp' | 'attitude'
  const activeTab = searchParams.get('tab') || 'session';
  const setActiveTab = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // State Konteks Pilihan Guru
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassGroupId, setSelectedClassGroupId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(searchParams.get('session_id') || '');
  const [selectedTpId, setSelectedTpId] = useState('');
  const [selectedDimensionId, setSelectedDimensionId] = useState('');

  // Master Data
  const [sessions, setSessions] = useState([]);
  const [assessmentTypes, setAssessmentTypes] = useState([]);
  const [availableTPs, setAvailableTPs] = useState([]);
  const [attitudeDimensions, setAttitudeDimensions] = useState([]);
  const [subjectKkm, setSubjectKkm] = useState(75);

  // Data Nilai Siswa per Tab
  // 1. Tab Sesi
  const [sessionDetail, setSessionDetail] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [sessionScoresMap, setSessionScoresMap] = useState({}); // { [studentId]: { score: '', feedback: '', tp_scores: {} } }
  const [isSessionLocked, setIsSessionLocked] = useState(false);

  // 2. Tab Nilai TP
  const [tpStudents, setTpStudents] = useState([]);
  const [tpScoresMap, setTpScoresMap] = useState({}); // { [studentId]: { score: '', mastery_status: 'tercapai', notes: '' } }
  const [isLoadingTpScores, setIsLoadingTpScores] = useState(false);

  // 3. Tab Nilai Sikap / Karakter
  const [attitudeStudents, setAttitudeStudents] = useState([]);
  const [attitudeScoresMap, setAttitudeScoresMap] = useState({}); // { [studentId]: { [dimId]: { description: '' } } }
  const [isLoadingAttitude, setIsLoadingAttitude] = useState(false);

  // UI State
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'tuntas' | 'remedial' | 'empty'
  const [toast, setToast] = useState(null);
  const [activeFeedbackStudent, setActiveFeedbackStudent] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  // Form Buat Sesi Baru
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    assessment_type_id: '',
    title: '',
    assessment_date: new Date().toISOString().split('T')[0],
    max_score: 100,
    learning_objective_ids: [],
    notes: ''
  });

  // Modal Input Nilai Cepat (Quick Fill)
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);
  const [quickFillScore, setQuickFillScore] = useState('');
  const [quickFillMastery, setQuickFillMastery] = useState('tercapai');
  const [quickFillAttitudeText, setQuickFillAttitudeText] = useState('');

  // Refs untuk input spreadsheet grid: matrix [studentIndex][fieldKey]
  const inputGridRefs = useRef({});

  // 1. Ekstrak Mata Pelajaran & Rombel yang Diampu Guru
  const mySubjects = useMemo(() => {
    const map = new Map();
    teachingAssignments.forEach((a) => {
      if (a.subject_id && a.subject_name) {
        if (!map.has(String(a.subject_id))) {
          map.set(String(a.subject_id), {
            id: a.subject_id,
            name: a.subject_name,
            code: a.subject_code,
            class_groups: []
          });
        }
        const item = map.get(String(a.subject_id));
        if (a.class_group_id && !item.class_groups.some((c) => String(c.id) === String(a.class_group_id))) {
          item.class_groups.push({
            id: a.class_group_id,
            name: a.class_group_name || `Rombel #${a.class_group_id}`
          });
        }
      }
    });
    return Array.from(map.values());
  }, [teachingAssignments]);

  // Rombel yang tersedia untuk mapel yang dipilih
  const availableClasses = useMemo(() => {
    const sub = mySubjects.find((s) => String(s.id) === String(selectedSubjectId));
    if (sub && sub.class_groups.length > 0) return sub.class_groups;

    const map = new Map();
    teachingAssignments.forEach((a) => {
      if (a.class_group_id && a.class_group_name) {
        map.set(String(a.class_group_id), { id: a.class_group_id, name: a.class_group_name });
      }
    });
    return Array.from(map.values());
  }, [mySubjects, selectedSubjectId, teachingAssignments]);

  // Auto-select mapel & rombel pertama jika belum ada pilihan
  useEffect(() => {
    if (mySubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(String(mySubjects[0].id));
    }
  }, [mySubjects, selectedSubjectId]);

  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClassGroupId) {
      setSelectedClassGroupId(String(availableClasses[0].id));
    }
  }, [availableClasses, selectedClassGroupId]);

  // 2. Ambil Master Jenis Pengujian, Dimensi Sikap & KKM Mapel
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [typesRes, kkmRes, dimsRes] = await Promise.all([
          scoreService.getAssessmentTypes({ satuan_pendidikan_id: activeContext?.satuanPendidikanId }).catch(() => null),
          scoreService.getSubjectGradeKkms({
            satuan_pendidikan_id: activeContext?.satuanPendidikanId,
            academic_year_id: activeContext?.academicYearId,
            subject_id: selectedSubjectId
          }).catch(() => null),
          scoreService.getAttitudeDimensions({
            satuan_pendidikan_id: activeContext?.satuanPendidikanId,
            academic_year_id: activeContext?.academicYearId
          }).catch(() => null)
        ]);

        const types = typesRes?.data || typesRes || [];
        setAssessmentTypes(Array.isArray(types) ? types : []);

        const kkms = kkmRes?.data || kkmRes || [];
        if (Array.isArray(kkms) && kkms.length > 0) {
          setSubjectKkm(parseFloat(kkms[0].kkm) || 75);
        } else {
          setSubjectKkm(75);
        }

        const dims = dimsRes?.data || dimsRes || [];
        const dimList = Array.isArray(dims) ? dims : [];
        setAttitudeDimensions(dimList);
        if (dimList.length > 0 && !selectedDimensionId) {
          setSelectedDimensionId(String(dimList[0].id));
        }
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };
    fetchMasterData();
  }, [activeContext, selectedSubjectId, selectedDimensionId]);

  // 3. Ambil Master TP untuk Mapel Aktif
  useEffect(() => {
    const fetchTPs = async () => {
      if (!selectedSubjectId) {
        setAvailableTPs([]);
        return;
      }
      try {
        const res = await scoreService.getLearningObjectives({
          satuan_pendidikan_id: activeContext?.satuanPendidikanId,
          academic_year_id: activeContext?.academicYearId,
          subject_id: selectedSubjectId
        });
        const data = res?.data || res || [];
        const tpList = Array.isArray(data) ? data.filter((t) => t.is_active) : [];
        setAvailableTPs(tpList);
        if (tpList.length > 0 && !selectedTpId) {
          setSelectedTpId(String(tpList[0].id));
        }
      } catch (e) {
        console.error('Error fetching TPs:', e);
      }
    };
    fetchTPs();
  }, [selectedSubjectId, activeContext, selectedTpId]);

  // 4. Ambil Daftar Sesi Penilaian (Assessment Sessions)
  const fetchSessions = useCallback(async () => {
    if (!activeContext?.satuanPendidikanId || !selectedSubjectId || !selectedClassGroupId) {
      setSessions([]);
      return;
    }

    setIsLoadingSessions(true);
    try {
      const params = {
        satuan_pendidikan_id: activeContext.satuanPendidikanId,
        academic_year_id: activeContext.academicYearId,
        subject_id: selectedSubjectId,
        class_group_id: selectedClassGroupId
      };
      const res = await scoreService.getAssessmentSessions(params);
      const data = res?.data || res || [];
      const sessionList = Array.isArray(data) ? data : data.items || [];
      setSessions(sessionList);

      if (sessionList.length > 0) {
        if (!selectedSessionId || !sessionList.some((s) => String(s.id) === String(selectedSessionId))) {
          setSelectedSessionId(String(sessionList[0].id));
        }
      } else {
        setSelectedSessionId('');
        setSessionDetail(null);
        setSessionStudents([]);
      }
    } catch (err) {
      console.error('Error fetching assessment sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeContext?.satuanPendidikanId, activeContext?.academicYearId, selectedSubjectId, selectedClassGroupId, selectedSessionId]);

  useEffect(() => {
    if (activeTab === 'session') {
      fetchSessions();
    }
  }, [fetchSessions, activeTab]);

  // 5. Ambil Nilai Siswa pada Sesi Penilaian Terpilih
  const fetchSessionScores = useCallback(async () => {
    if (!selectedSessionId || activeTab !== 'session') {
      return;
    }

    setIsLoadingScores(true);
    setFetchError(null);

    try {
      const res = await scoreService.getSessionScores(selectedSessionId);
      const data = res?.data || res || {};
      const session = data.session || {};
      const studentList = data.students || [];

      setSessionDetail(session);
      setSessionStudents(studentList);
      setIsSessionLocked(Boolean(session.is_locked));

      const newScoresMap = {};
      studentList.forEach((st) => {
        const sId = st.student_id;
        newScoresMap[sId] = {
          score: st.score !== null && st.score !== undefined ? String(st.score) : '',
          feedback: st.feedback || '',
          tp_scores: st.tp_scores || {}
        };
      });
      setSessionScoresMap(newScoresMap);
    } catch (err) {
      console.error('Error fetching session scores:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat daftar nilai sesi.');
    } finally {
      setIsLoadingScores(false);
    }
  }, [selectedSessionId, activeTab]);

  useEffect(() => {
    if (activeTab === 'session') {
      fetchSessionScores();
    }
  }, [fetchSessionScores, activeTab]);

  // 6. Ambil Nilai Siswa per Tujuan Pembelajaran (TP)
  const fetchTpScoresData = useCallback(async () => {
    if (!selectedTpId || !selectedClassGroupId || !selectedSubjectId || activeTab !== 'tp') {
      return;
    }

    setIsLoadingTpScores(true);
    setFetchError(null);

    try {
      const semesterId = activeContext?.semester === 'Genap' ? 2 : 1;
      const [membersRes, tpScoresRes] = await Promise.all([
        scoreService.getClassGroupMembers(selectedClassGroupId).catch(() => null),
        scoreService.getTpScores({
          learning_objective_id: selectedTpId,
          subject_id: selectedSubjectId,
          semester_id: semesterId
        }).catch(() => null)
      ]);

      const memberData = membersRes?.data || membersRes || [];
      const memberList = Array.isArray(memberData) ? memberData : memberData.items || [];

      const tpScoreData = tpScoresRes?.data || tpScoresRes || [];
      const tpScoreList = Array.isArray(tpScoreData) ? tpScoreData : [];

      const tpMap = {};
      tpScoreList.forEach((sc) => {
        tpMap[sc.student_id] = {
          score: sc.score !== null && sc.score !== undefined ? String(sc.score) : '',
          mastery_status: sc.mastery_status || 'tercapai',
          notes: sc.notes || ''
        };
      });

      const formattedStudents = memberList.map((m) => ({
        student_id: m.student_id || m.id,
        student_name: m.student_name || m.full_name,
        nis: m.nis || m.nisn || '',
        gender: m.gender || ''
      }));

      setTpStudents(formattedStudents);

      const initialScoresMap = {};
      formattedStudents.forEach((st) => {
        const existing = tpMap[st.student_id];
        initialScoresMap[st.student_id] = {
          score: existing?.score || '',
          mastery_status: existing?.mastery_status || 'tercapai',
          notes: existing?.notes || ''
        };
      });
      setTpScoresMap(initialScoresMap);
    } catch (err) {
      console.error('Error fetching TP scores:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat data capaian TP siswa.');
    } finally {
      setIsLoadingTpScores(false);
    }
  }, [selectedTpId, selectedClassGroupId, selectedSubjectId, activeContext, activeTab]);

  useEffect(() => {
    if (activeTab === 'tp') {
      fetchTpScoresData();
    }
  }, [fetchTpScoresData, activeTab]);

  // 7. Ambil Nilai Sikap & Karakter Siswa
  const fetchAttitudeScoresData = useCallback(async () => {
    if (!selectedClassGroupId || activeTab !== 'attitude') {
      return;
    }

    setIsLoadingAttitude(true);
    setFetchError(null);

    try {
      const semesterId = activeContext?.semester === 'Genap' ? 2 : 1;
      const res = await scoreService.getAttitudeScoresMatrix({
        class_group_id: selectedClassGroupId,
        semester_id: semesterId,
        academic_year_id: activeContext?.academicYearId
      });

      const data = res?.data || res || {};
      const studentList = data.students || [];
      const rawScoresMap = data.scores_map || {};
      const dims = data.dimensions || [];

      if (dims.length > 0) {
        setAttitudeDimensions(dims);
        if (!selectedDimensionId) {
          setSelectedDimensionId(String(dims[0].id));
        }
      }

      setAttitudeStudents(studentList);

      const parsedMap = {};
      studentList.forEach((st) => {
        const sId = st.student_id;
        parsedMap[sId] = {};
        dims.forEach((d) => {
          const dimKey = String(d.id);
          parsedMap[sId][dimKey] = {
            description: rawScoresMap[sId]?.[dimKey]?.description || ''
          };
        });
      });
      setAttitudeScoresMap(parsedMap);
    } catch (err) {
      console.error('Error fetching attitude scores matrix:', err);
      setFetchError(err.response?.data?.message || err.message || 'Gagal memuat data nilai sikap siswa.');
    } finally {
      setIsLoadingAttitude(false);
    }
  }, [selectedClassGroupId, activeContext, activeTab, selectedDimensionId]);

  useEffect(() => {
    if (activeTab === 'attitude') {
      fetchAttitudeScoresData();
    }
  }, [fetchAttitudeScoresData, activeTab]);

  // Handler Perubahan Nilai Sesi dengan validasi ketat 0-100
  const handleSessionScoreChange = (studentId, rawValue, tpId = null) => {
    if (isSessionLocked) return;
    const cleanValue = rawValue.replace(/[^0-9.]/g, '');
    const maxScore = sessionDetail?.max_score || 100;

    if (cleanValue !== '' && !isNaN(cleanValue)) {
      const num = parseFloat(cleanValue);
      if (num < 0 || num > maxScore) {
        setToast({
          type: 'error',
          title: 'Format Tidak Valid',
          message: `Nilai harus berada dalam rentang 0 hingga ${maxScore}.`
        });
      }
    }

    setSessionScoresMap((prev) => {
      const current = prev[studentId] || { score: '', feedback: '', tp_scores: {} };
      if (tpId) {
        const nextTpScores = { ...(current.tp_scores || {}), [tpId]: cleanValue };
        // Otomatis hitung rata-rata TP sebagai main score jika ada TP
        const vals = Object.values(nextTpScores).filter((v) => v !== '' && !isNaN(v)).map(Number);
        const autoAvg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : current.score;
        return {
          ...prev,
          [studentId]: {
            ...current,
            score: autoAvg,
            tp_scores: nextTpScores
          }
        };
      }
      return {
        ...prev,
        [studentId]: { ...current, score: cleanValue }
      };
    });
  };

  const handleSessionFeedbackChange = (studentId, feedback) => {
    if (isSessionLocked) return;
    setSessionScoresMap((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), feedback }
    }));
  };

  // Handler Perubahan Nilai TP
  const handleTpScoreChange = (studentId, rawValue) => {
    const cleanValue = rawValue.replace(/[^0-9.]/g, '');
    if (cleanValue !== '' && !isNaN(cleanValue)) {
      const num = parseFloat(cleanValue);
      if (num < 0 || num > 100) {
        setToast({
          type: 'error',
          title: 'Format Tidak Valid',
          message: 'Nilai TP harus berada dalam rentang 0 hingga 100.'
        });
      }
    }

    let autoMastery = 'tercapai';
    if (cleanValue !== '' && !isNaN(cleanValue)) {
      const num = parseFloat(cleanValue);
      if (num >= 85) autoMastery = 'tercapai_optimal';
      else if (num >= subjectKkm) autoMastery = 'tercapai';
      else if (num >= 60) autoMastery = 'cukup';
      else autoMastery = 'perlu_bimbingan';
    }

    setTpScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        score: cleanValue,
        mastery_status: autoMastery
      }
    }));
  };

  const handleTpMasteryChange = (studentId, status) => {
    setTpScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        mastery_status: status
      }
    }));
  };

  const handleTpNotesChange = (studentId, notes) => {
    setTpScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        notes
      }
    }));
  };

  // Handler Perubahan Nilai Sikap
  const handleAttitudeDescChange = (studentId, dimensionId, desc) => {
    setAttitudeScoresMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [dimensionId]: {
          description: desc
        }
      }
    }));
  };

  // Navigasi Keyboard Spreadsheet Grid (Enter / Down Arrow pindah baris ke bawah, Up Arrow ke atas)
  const handleGridKeyDown = (e, rowIndex, colKey) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const targetRow = rowIndex + 1;
      const nextInput = inputGridRefs.current[`${targetRow}_${colKey}`];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const targetRow = rowIndex - 1;
      const prevInput = inputGridRefs.current[`${targetRow}_${colKey}`];
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // Metrik Statistik Penilaian Live (4 Stat Cards)
  const sessionStats = useMemo(() => {
    if (activeTab === 'session') {
      const total = sessionStudents.length;
      if (total === 0) return { avg: 0, tuntasCount: 0, tuntasPct: 0, remedialCount: 0, remedialPct: 0, filledCount: 0, filledPct: 0 };

      let sum = 0;
      let filled = 0;
      let tuntas = 0;
      let remedial = 0;

      sessionStudents.forEach((st) => {
        const entry = sessionScoresMap[st.student_id];
        if (entry && entry.score !== '' && !isNaN(entry.score)) {
          const num = parseFloat(entry.score);
          sum += num;
          filled++;
          if (num >= subjectKkm) {
            tuntas++;
          } else {
            remedial++;
          }
        }
      });

      const avg = filled > 0 ? (sum / filled).toFixed(1) : 0;
      const tuntasPct = total > 0 ? Math.round((tuntas / total) * 100) : 0;
      const remedialPct = total > 0 ? Math.round((remedial / total) * 100) : 0;
      const filledPct = total > 0 ? Math.round((filled / total) * 100) : 0;

      return { avg, tuntasCount: tuntas, tuntasPct, remedialCount: remedial, remedialPct, filledCount: filled, filledPct };
    }

    if (activeTab === 'tp') {
      const total = tpStudents.length;
      if (total === 0) return { avg: 0, tuntasCount: 0, tuntasPct: 0, remedialCount: 0, remedialPct: 0, filledCount: 0, filledPct: 0 };

      let sum = 0;
      let filled = 0;
      let tuntas = 0;
      let remedial = 0;

      tpStudents.forEach((st) => {
        const entry = tpScoresMap[st.student_id];
        if (entry && entry.score !== '' && !isNaN(entry.score)) {
          const num = parseFloat(entry.score);
          sum += num;
          filled++;
          if (num >= subjectKkm) tuntas++;
          else remedial++;
        }
      });

      const avg = filled > 0 ? (sum / filled).toFixed(1) : 0;
      const tuntasPct = total > 0 ? Math.round((tuntas / total) * 100) : 0;
      const remedialPct = total > 0 ? Math.round((remedial / total) * 100) : 0;
      const filledPct = total > 0 ? Math.round((filled / total) * 100) : 0;

      return { avg, tuntasCount: tuntas, tuntasPct, remedialCount: remedial, remedialPct, filledCount: filled, filledPct };
    }

    // Tab Sikap
    const total = attitudeStudents.length;
    let filled = 0;
    attitudeStudents.forEach((st) => {
      const desc = attitudeScoresMap[st.student_id]?.[selectedDimensionId]?.description;
      if (desc && desc.trim() !== '') filled++;
    });
    const filledPct = total > 0 ? Math.round((filled / total) * 100) : 0;
    return { avg: '-', tuntasCount: filled, tuntasPct: filledPct, remedialCount: total - filled, remedialPct: 100 - filledPct, filledCount: filled, filledPct };
  }, [activeTab, sessionStudents, sessionScoresMap, tpStudents, tpScoresMap, attitudeStudents, attitudeScoresMap, selectedDimensionId, subjectKkm]);

  // Filter Siswa Berdasarkan Search Query & Filter Pills Status
  const filteredSessionStudents = useMemo(() => {
    return sessionStudents.filter((st) => {
      const matchSearch =
        !searchQuery.trim() ||
        st.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(st.nis || '').includes(searchQuery) ||
        String(st.nisn || '').includes(searchQuery);

      if (!matchSearch) return false;

      const entry = sessionScoresMap[st.student_id];
      const hasScore = entry && entry.score !== '' && !isNaN(entry.score);
      const numScore = hasScore ? parseFloat(entry.score) : null;

      if (filterStatus === 'tuntas') return hasScore && numScore >= subjectKkm;
      if (filterStatus === 'remedial') return hasScore && numScore < subjectKkm;
      if (filterStatus === 'empty') return !hasScore;
      return true;
    });
  }, [sessionStudents, searchQuery, filterStatus, sessionScoresMap, subjectKkm]);

  // Simpan Nilai Sesi Massal (Draft)
  const handleSaveSessionScores = async (isFinalSubmit = false) => {
    if (!selectedSessionId || sessionStudents.length === 0) return;
    if (isSessionLocked) {
      setToast({
        type: 'warning',
        title: 'Sesi Terkunci',
        message: 'Sesi penilaian ini telah dikunci oleh Kurikulum dan tidak dapat diubah.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const items = sessionStudents.map((st) => {
        const sId = st.student_id;
        const entry = sessionScoresMap[sId] || { score: '', feedback: '', tp_scores: {} };
        const numScore = entry.score !== '' && !isNaN(entry.score) ? parseFloat(entry.score) : null;
        return {
          student_id: sId,
          score: numScore,
          feedback: entry.feedback ? entry.feedback.trim() : null,
          tp_scores: entry.tp_scores
        };
      });

      await scoreService.saveSessionScoresBulk(selectedSessionId, { items });

      setToast({
        type: 'success',
        title: isFinalSubmit ? 'Nilai Berhasil Disubmit ke Kurikulum' : 'Draft Nilai Disimpan',
        message: `Nilai ${items.length} santri pada sesi "${sessionDetail?.title || 'Asesmen'}" berhasil disimpan dan disinkronkan ke e-Rapor.`
      });
      fetchSessionScores();
      setIsConfirmSubmitOpen(false);
    } catch (err) {
      console.error('Error saving session scores:', err);
      setToast({
        type: 'error',
        title: 'Gagal Menyimpan Nilai',
        message: err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan nilai siswa.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Simpan Nilai Capaian TP Massal
  const handleSaveTpScores = async () => {
    if (!selectedTpId || tpStudents.length === 0) return;

    setIsSaving(true);
    try {
      const semesterId = activeContext?.semester === 'Genap' ? 2 : 1;
      const items = tpStudents.map((st) => {
        const sId = st.student_id;
        const entry = tpScoresMap[sId] || { score: '', mastery_status: 'tercapai', notes: '' };
        const numScore = entry.score !== '' && !isNaN(entry.score) ? parseFloat(entry.score) : null;
        return {
          student_id: sId,
          score: numScore,
          mastery_status: entry.mastery_status || 'tercapai',
          notes: entry.notes ? entry.notes.trim() : null
        };
      });

      const payload = {
        learning_objective_id: Number(selectedTpId),
        subject_id: Number(selectedSubjectId),
        semester_id: semesterId,
        items
      };

      await scoreService.saveTpScoresBulk(payload);

      setToast({
        type: 'success',
        title: 'Nilai Capaian TP Tersimpan',
        message: `Capaian TP untuk ${items.length} santri berhasil disimpan ke database e-Rapor.`
      });
      fetchTpScoresData();
    } catch (err) {
      console.error('Error saving TP scores:', err);
      setToast({
        type: 'error',
        title: 'Gagal Menyimpan Capaian TP',
        message: err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan nilai TP siswa.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Simpan Nilai Sikap Massal
  const handleSaveAttitudeScores = async () => {
    if (attitudeStudents.length === 0 || !selectedClassGroupId) return;

    setIsSaving(true);
    try {
      const semesterId = activeContext?.semester === 'Genap' ? 2 : 1;
      const items = [];

      attitudeStudents.forEach((st) => {
        const sId = st.student_id;
        attitudeDimensions.forEach((dim) => {
          const dimId = String(dim.id);
          const desc = attitudeScoresMap[sId]?.[dimId]?.description || '';
          if (desc.trim() !== '') {
            items.push({
              student_id: sId,
              dimension_id: Number(dim.id),
              aspect: dim.name,
              description: desc.trim()
            });
          }
        });
      });

      const payload = {
        class_group_id: Number(selectedClassGroupId),
        semester_id: semesterId,
        academic_year_id: activeContext?.academicYearId ? Number(activeContext.academicYearId) : null,
        items
      };

      await scoreService.saveAttitudeScoresBulk(payload);

      setToast({
        type: 'success',
        title: 'Nilai Sikap Tersimpan',
        message: `Nilai deskripsi sikap karakter ${attitudeStudents.length} santri berhasil disimpan ke e-Rapor.`
      });
      fetchAttitudeScoresData();
    } catch (err) {
      console.error('Error saving attitude scores:', err);
      setToast({
        type: 'error',
        title: 'Gagal Menyimpan Nilai Sikap',
        message: err.response?.data?.message || err.message || 'Terjadi kesalahan saat menyimpan nilai sikap.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Form Buat Sesi Baru
  const handleOpenCreateSession = () => {
    setSessionFormData({
      assessment_type_id: assessmentTypes[0]?.id ? String(assessmentTypes[0].id) : '',
      title: '',
      assessment_date: new Date().toISOString().split('T')[0],
      max_score: 100,
      learning_objective_ids: availableTPs.length > 0 ? [String(availableTPs[0].id)] : [],
      notes: ''
    });
    setIsCreateSessionOpen(true);
  };

  const handleSubmitCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionFormData.title.trim() || !sessionFormData.assessment_type_id) {
      setToast({
        type: 'error',
        title: 'Form Belum Lengkap',
        message: 'Judul sesi dan jenis pengujian wajib diisi.'
      });
      return;
    }

    setIsSubmittingSession(true);
    try {
      const payload = {
        satuan_pendidikan_id: Number(activeContext?.satuanPendidikanId),
        academic_year_id: Number(activeContext?.academicYearId),
        semester_id: activeContext?.semester === 'Genap' ? 2 : 1,
        class_group_id: Number(selectedClassGroupId),
        subject_id: Number(selectedSubjectId),
        assessment_type_id: Number(sessionFormData.assessment_type_id),
        title: sessionFormData.title.trim(),
        assessment_date: sessionFormData.assessment_date,
        max_score: parseFloat(sessionFormData.max_score) || 100,
        learning_objective_ids: sessionFormData.learning_objective_ids.map(Number),
        notes: sessionFormData.notes ? sessionFormData.notes.trim() : null
      };

      const res = await scoreService.createAssessmentSession(payload);
      const newSession = res?.data || res;

      setToast({
        type: 'success',
        title: 'Sesi Dibuat',
        message: `Sesi penilaian "${sessionFormData.title}" berhasil dibuat.`
      });

      setIsCreateSessionOpen(false);
      await fetchSessions();
      if (newSession?.id) {
        setSelectedSessionId(String(newSession.id));
      }
    } catch (err) {
      console.error('Error creating assessment session:', err);
      setToast({
        type: 'error',
        title: 'Gagal Membuat Sesi',
        message: err.response?.data?.message || err.message || 'Gagal menambahkan sesi penilaian.'
      });
    } finally {
      setIsSubmittingSession(false);
    }
  };

  // Quick Fill Handlers
  const handleApplyQuickFill = () => {
    if (activeTab === 'session') {
      if (quickFillScore === '' || isNaN(quickFillScore)) return;
      const numVal = Math.min(sessionDetail?.max_score || 100, Math.max(0, parseFloat(quickFillScore)));

      setSessionScoresMap((prev) => {
        const updated = { ...prev };
        sessionStudents.forEach((st) => {
          updated[st.student_id] = {
            ...(updated[st.student_id] || {}),
            score: String(numVal)
          };
        });
        return updated;
      });
    } else if (activeTab === 'tp') {
      const numVal = quickFillScore !== '' && !isNaN(quickFillScore) ? String(parseFloat(quickFillScore)) : '';
      setTpScoresMap((prev) => {
        const updated = { ...prev };
        tpStudents.forEach((st) => {
          updated[st.student_id] = {
            ...(updated[st.student_id] || {}),
            score: numVal,
            mastery_status: quickFillMastery
          };
        });
        return updated;
      });
    } else if (activeTab === 'attitude') {
      const activeDim = attitudeDimensions.find((d) => String(d.id) === String(selectedDimensionId));
      const dimName = activeDim?.name || 'Sikap dan Karakter';
      const text = quickFillAttitudeText.trim() || `Menunjukkan pembiasaan dan integritas yang sangat baik dalam dimensi ${dimName}.`;

      setAttitudeScoresMap((prev) => {
        const updated = { ...prev };
        attitudeStudents.forEach((st) => {
          if (!updated[st.student_id]) updated[st.student_id] = {};
          updated[st.student_id][selectedDimensionId] = {
            description: text
          };
        });
        return updated;
      });
    }

    setIsQuickFillOpen(false);
    setToast({
      type: 'info',
      title: 'Nilai Cepat Diterapkan',
      message: 'Nilai massal telah disalin ke seluruh santri. Klik "Simpan Draft" untuk menyimpan ke server.'
    });
  };

  // Nama Mapel & Rombel Terpilih
  const currentSubject = mySubjects.find((s) => String(s.id) === String(selectedSubjectId));
  const currentClass = availableClasses.find((c) => String(c.id) === String(selectedClassGroupId));
  const currentSession = sessions.find((s) => String(s.id) === String(selectedSessionId));

  return (
    <div className="space-y-6 pb-28">
      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* HEADER UTAMA & KKTP BADGE */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="hover:text-emerald-600 transition-colors cursor-pointer">Akademik & KBM</span>
          <span>/</span>
          <span className="hover:text-emerald-600 transition-colors cursor-pointer">Asesmen Pembelajaran</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">Penilaian Siswa</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {currentSession ? currentSession.title : 'Penilaian Siswa (e-Nilai)'}
              </h1>
              {/* Badge KKTP */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm">
                <span>🎯</span>
                <span>KKTP: {subjectKkm.toFixed(1)}</span>
              </div>
              {/* Badge Status Pengujian */}
              {isSessionLocked ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Status: Terkunci</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Status: Aktif {currentSession?.weight_percentage ? `• Bobot: ${currentSession.weight_percentage}%` : ''}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Pengisian nilai sumatif berbasis Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) dan sinkronisasi otomatis ke e-Rapor Kurikulum Merdeka.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'session' && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={handleOpenCreateSession}
              >
                + Buat Sesi Asesmen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={Wand2}
              onClick={() => setIsQuickFillOpen(true)}
            >
              Isi Cepat
            </Button>
          </div>
        </div>
      </div>

      {/* 4 METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Rata-Rata Nilai Kelas */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rata-Rata Nilai Kelas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {sessionStats.avg}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  Target: {subjectKkm}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Ambang Batas Minimum</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">KKTP {subjectKkm.toFixed(1)}</span>
          </div>
        </div>

        {/* Card 2: Ketuntasan (>= KKTP) */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-600"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tingkat Ketuntasan</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {sessionStats.tuntasCount}
                </span>
                <span className="text-sm text-slate-500">Santri</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  {sessionStats.tuntasPct}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Verified className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${sessionStats.tuntasPct}%` }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Memenuhi Standar</span>
              <span>Target Kurikulum: 85%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Perlu Remedial */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perlu Remedial</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">Tindakan</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                  {sessionStats.remedialCount}
                </span>
                <span className="text-sm text-slate-500">Santri</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                  {sessionStats.remedialPct}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Batas tindak lanjut</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">H-4 Penguncian</span>
          </div>
        </div>

        {/* Card 4: Progres Kelengkapan Nilai */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-indigo-500"></div>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progres Input Nilai</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                  {sessionStats.filledCount}
                </span>
                <span className="text-sm text-slate-500">/ {sessionStudents.length || tpStudents.length || attitudeStudents.length} Santri</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                  {sessionStats.filledPct}%
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${sessionStats.filledPct}%` }}></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {sessionStudents.length - sessionStats.filledCount} Santri Belum Lengkap
              </span>
              <span>Draft Disimpan</span>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER STATUS: GEMBOK TERKUNCI vs INFO AKTIF */}
      {isSessionLocked ? (
        <div className="rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 p-4 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                  Sesi Penilaian Terkunci oleh Waka Kurikulum
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold">
                  Read-Only
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                Verifikasi nilai rapor sedang berlangsung atau sesi telah difinalisasi. Semua input nilai dalam mode pratinjau (read-only). Hubungi tim Kurikulum untuk mengajukan pembukaan kunci edit.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-800 dark:text-slate-200">
              <span className="font-bold text-amber-800 dark:text-amber-300 mr-1">Sesi Penilaian Aktif:</span>
              Mode input spreadsheet grid aktif. Gunakan tombol <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">Enter</kbd> atau <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">↓</kbd> untuk berpindah cepat antar-santri.
            </div>
          </div>
        </div>
      )}

      {/* 3 TAB PENILAIAN TERPADU */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        <button
          onClick={() => setActiveTab('session')}
          className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'session'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Nilai Asesmen</span>
        </button>
        <button
          onClick={() => setActiveTab('tp')}
          className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'tp'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Capaian TP</span>
        </button>
        <button
          onClick={() => setActiveTab('attitude')}
          className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'attitude'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>Sikap & Karakter</span>
        </button>
      </div>

      {/* STICKY FILTER TOOLBAR & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        {/* Desktop Filter Row */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Mapel */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {mySubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Rombel */}
            <select
              value={selectedClassGroupId}
              onChange={(e) => setSelectedClassGroupId(e.target.value)}
              className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Tab 1 Sesi Selector */}
            {activeTab === 'session' && (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="h-9 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-pointer max-w-xs truncate"
              >
                {sessions.length === 0 ? (
                  <option value="">Belum Ada Sesi Penilaian</option>
                ) : (
                  sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.assessment_type_name || 'Asesmen'})
                    </option>
                  ))
                )}
              </select>
            )}

            {/* Tab 2 TP Selector */}
            {activeTab === 'tp' && (
              <select
                value={selectedTpId}
                onChange={(e) => setSelectedTpId(e.target.value)}
                className="h-9 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-pointer max-w-sm truncate"
              >
                {availableTPs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.description}
                  </option>
                ))}
              </select>
            )}

            {/* Tab 3 Dimensi Sikap Selector */}
            {activeTab === 'attitude' && (
              <select
                value={selectedDimensionId}
                onChange={(e) => setSelectedDimensionId(e.target.value)}
                className="h-9 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none cursor-pointer max-w-xs truncate"
              >
                {attitudeDimensions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari santri / NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Mobile Filter Summary Button */}
        <div className="md:hidden flex items-center justify-between gap-2">
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex-1 flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-center gap-2 truncate">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="truncate">{currentSubject?.name || 'Pilih Mapel'} • {currentClass?.name || 'Rombel'}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold">Ubah</span>
          </button>
        </div>

        {/* Sub-row: Filter Pills & Keyboard Hints */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-xs text-slate-500 mr-1 shrink-0">Tampilkan:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Semua ({sessionStudents.length})
            </button>
            <button
              onClick={() => setFilterStatus('tuntas')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                filterStatus === 'tuntas'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tuntas ({sessionStats.tuntasCount})
            </button>
            <button
              onClick={() => setFilterStatus('remedial')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                filterStatus === 'remedial'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Remedial ({sessionStats.remedialCount})
            </button>
            <button
              onClick={() => setFilterStatus('empty')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                filterStatus === 'empty'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Belum Lengkap ({sessionStudents.length - sessionStats.filledCount})
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            <Keyboard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pintasan Grid:</span>
            <span><kbd className="px-1 py-0.2 bg-white dark:bg-slate-900 rounded border font-mono text-[10px]">Enter</kbd> / <kbd className="px-1 py-0.2 bg-white dark:bg-slate-900 rounded border font-mono text-[10px]">↓</kbd> Baris Berikutnya</span>
            <span>•</span>
            <span><kbd className="px-1 py-0.2 bg-white dark:bg-slate-900 rounded border font-mono text-[10px]">Tab</kbd> Kolom</span>
          </div>
        </div>
      </div>

      {/* CONTENT PER TAB */}
      {/* 1. TAB NILAI ASESMEN (SESI PENGUJIAN) */}
      {activeTab === 'session' && (
        <>
          {isLoadingScores || isLoadingSessions ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : fetchError ? (
            <ErrorState
              title="Gagal Memuat Nilai Asesmen"
              message={fetchError}
              onRetry={fetchSessionScores}
            />
          ) : sessionStudents.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Belum Ada Sesi Penilaian"
              message="Belum ada sesi penilaian (Formatif / STS / SAS) yang dibuat untuk mata pelajaran dan rombel ini."
              actionText="+ Buat Sesi Penilaian Baru"
              onAction={handleOpenCreateSession}
            />
          ) : (
            <>
              {/* DESKTOP SPREADSHEET-LIKE GRADING GRID */}
              <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <th className="py-3 px-3 w-12 text-center">NO</th>
                        <th className="py-3 px-3 w-32">NISN</th>
                        <th className="py-3 px-4 min-w-[220px]">NAMA SANTRI</th>
                        {/* Dynamic TP Columns if available */}
                        {sessionDetail?.learning_objectives && sessionDetail.learning_objectives.length > 0 ? (
                          sessionDetail.learning_objectives.map((tp, tpIdx) => (
                            <th key={tp.id} className="py-3 px-2 w-28 text-center bg-slate-100/70 dark:bg-slate-800/50">
                              <div className="flex flex-col items-center">
                                <span>{tp.code}</span>
                                <span className="text-[10px] text-slate-500 font-normal truncate max-w-[100px]">{tp.description}</span>
                              </div>
                            </th>
                          ))
                        ) : null}
                        <th className="py-3 px-3 w-32 text-center bg-emerald-50/80 dark:bg-emerald-950/40">
                          <div className="flex flex-col items-center">
                            <span className="text-emerald-900 dark:text-emerald-200">NILAI AKHIR</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Maks {sessionDetail?.max_score || 100}</span>
                          </div>
                        </th>
                        <th className="py-3 px-3 w-36 text-center">STATUS KKTP</th>
                        <th className="py-3 px-4 min-w-[240px]">CATATAN / FEEDBACK</th>
                        <th className="py-3 px-3 w-28 text-center">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredSessionStudents.map((st, idx) => {
                        const entry = sessionScoresMap[st.student_id] || { score: '', feedback: '', tp_scores: {} };
                        const hasScore = entry.score !== '' && !isNaN(entry.score);
                        const numScore = hasScore ? parseFloat(entry.score) : null;
                        const isTuntas = hasScore && numScore >= subjectKkm;
                        const isRemedial = hasScore && numScore < subjectKkm;
                        const isInvalid = hasScore && (numScore < 0 || numScore > (sessionDetail?.max_score || 100));

                        return (
                          <tr
                            key={st.student_id}
                            className={`transition-colors ${
                              isRemedial
                                ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {st.nisn || st.nis || '-'}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {st.student_name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {st.gender === 'L' ? 'Ikhwan' : 'Akhwat'} • NIS: {st.nis || '-'}
                                </span>
                              </div>
                            </td>

                            {/* TP Input Sub-Columns if available */}
                            {sessionDetail?.learning_objectives && sessionDetail.learning_objectives.length > 0 ? (
                              sessionDetail.learning_objectives.map((tp) => (
                                <td key={tp.id} className="py-2 px-2 text-center">
                                  <input
                                    ref={(el) => {
                                      inputGridRefs.current[`${idx}_tp_${tp.id}`] = el;
                                    }}
                                    type="text"
                                    disabled={isSessionLocked}
                                    value={entry.tp_scores?.[tp.id] ?? ''}
                                    onChange={(e) => handleSessionScoreChange(st.student_id, e.target.value, tp.id)}
                                    onKeyDown={(e) => handleGridKeyDown(e, idx, `tp_${tp.id}`)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-16 h-8 text-center font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                                  />
                                </td>
                              ))
                            ) : null}

                            {/* Final Main Score Input */}
                            <td className="py-2 px-3 text-center bg-emerald-50/30 dark:bg-emerald-950/20">
                              <input
                                ref={(el) => {
                                  inputGridRefs.current[`${idx}_main`] = el;
                                }}
                                type="text"
                                disabled={isSessionLocked}
                                value={entry.score}
                                onChange={(e) => handleSessionScoreChange(st.student_id, e.target.value)}
                                onKeyDown={(e) => handleGridKeyDown(e, idx, 'main')}
                                onFocus={(e) => e.target.select()}
                                placeholder="--"
                                className={`w-16 h-8 text-center font-mono font-bold rounded focus:outline-none transition-all ${
                                  isInvalid
                                    ? 'border-2 border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-300'
                                    : isRemedial
                                    ? 'border border-rose-300 bg-rose-50/80 text-rose-700 font-extrabold focus:border-rose-500'
                                    : hasScore
                                    ? 'border border-emerald-300 bg-emerald-50/50 text-emerald-800 font-bold focus:border-emerald-600'
                                    : 'border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-500 focus:border-emerald-600'
                                } disabled:opacity-60 disabled:cursor-not-allowed`}
                              />
                            </td>

                            {/* Status KKTP Badge */}
                            <td className="py-2.5 px-3 text-center">
                              {isInvalid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                                  <span>✕</span> Format Salah
                                </span>
                              ) : isTuntas ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                                  <span>✓</span> Tuntas (+{(numScore - subjectKkm).toFixed(1)})
                                </span>
                              ) : isRemedial ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[11px]">
                                  <span>⚠️</span> Remedial (-{(subjectKkm - numScore).toFixed(1)})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
                                  <span>⏳</span> Draf / Belum
                                </span>
                              )}
                            </td>

                            {/* Feedback Catatan */}
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 text-xs truncate max-w-xs">
                              {entry.feedback ? (
                                <span title={entry.feedback}>{entry.feedback}</span>
                              ) : (
                                <span className="text-slate-400 italic">Belum ada catatan khusus</span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => setActiveFeedbackStudent(st)}
                                className="px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded transition-colors"
                              >
                                {entry.feedback ? 'Ubah Catatan' : '+ Catatan'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Summary Bar */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Menampilkan <strong>{filteredSessionStudents.length}</strong> dari <strong>{sessionStudents.length}</strong> santri</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Cloud className="w-4 h-4" />
                      <span>Otomatis sinkronisasi ke e-Rapor</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* MOBILE CARD STACK VIEW */}
              <div className="md:hidden space-y-3">
                {filteredSessionStudents.map((st, idx) => {
                  const entry = sessionScoresMap[st.student_id] || { score: '', feedback: '', tp_scores: {} };
                  const hasScore = entry.score !== '' && !isNaN(entry.score);
                  const numScore = hasScore ? parseFloat(entry.score) : null;
                  const isTuntas = hasScore && numScore >= subjectKkm;
                  const isRemedial = hasScore && numScore < subjectKkm;
                  const isInvalid = hasScore && (numScore < 0 || numScore > (sessionDetail?.max_score || 100));

                  const initials = st.student_name
                    ? st.student_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                    : 'ST';

                  return (
                    <div
                      key={st.student_id}
                      className={`p-4 rounded-xl border transition-all ${
                        isRemedial
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            isRemedial
                              ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {st.student_name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              NISN: {st.nisn || st.nis || '-'}
                            </p>
                            <div className="mt-1">
                              {isInvalid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px]">
                                  Format Salah
                                </span>
                              ) : isTuntas ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px]">
                                  Tuntas ({numScore})
                                </span>
                              ) : isRemedial ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                                  Remedial ({numScore})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                  Belum Diisi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Touch-Friendly Score Input */}
                        <div className="flex flex-col items-end shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={isSessionLocked}
                            value={entry.score}
                            onChange={(e) => handleSessionScoreChange(st.student_id, e.target.value)}
                            placeholder="--"
                            className={`w-16 h-11 text-center font-mono text-base font-bold rounded-lg focus:outline-none transition-all ${
                              isInvalid
                                ? 'border-2 border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-300'
                                : isRemedial
                                ? 'border border-rose-300 bg-rose-100/50 text-rose-700 font-extrabold focus:border-rose-500'
                                : hasScore
                                ? 'border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold focus:border-emerald-600'
                                : 'border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 focus:border-emerald-600'
                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                          />
                          <span className={`text-[10px] mt-1 font-semibold ${
                            isRemedial ? 'text-rose-600' : isTuntas ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {isTuntas ? `+${(numScore - subjectKkm).toFixed(1)} KKTP` : isRemedial ? `-${(subjectKkm - numScore).toFixed(1)} KKTP` : 'Maks 100'}
                          </span>
                        </div>
                      </div>

                      {/* Catatan Per Siswa */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="text-slate-500 truncate max-w-[200px]">
                          {entry.feedback ? (
                            <span className="italic">"{entry.feedback}"</span>
                          ) : (
                            <span className="text-slate-400">Tidak ada catatan</span>
                          )}
                        </div>
                        <button
                          onClick={() => setActiveFeedbackStudent(st)}
                          className="text-emerald-600 font-semibold hover:underline"
                        >
                          {entry.feedback ? 'Edit Catatan' : '+ Catatan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* 2. TAB NILAI CAPAIAN TP (TUJUAN PEMBELAJARAN) */}
      {activeTab === 'tp' && (
        <div className="space-y-4">
          {isLoadingTpScores ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : tpStudents.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Belum Ada Data Tujuan Pembelajaran"
              message="Belum ada Tujuan Pembelajaran yang terdaftar untuk mata pelajaran ini."
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      <th className="py-3 px-3 w-12 text-center">NO</th>
                      <th className="py-3 px-3 w-32">NISN</th>
                      <th className="py-3 px-4 min-w-[220px]">NAMA SANTRI</th>
                      <th className="py-3 px-3 w-28 text-center">NILAI TP</th>
                      <th className="py-3 px-4 w-48 text-center">STATUS KETERCAPAIAN</th>
                      <th className="py-3 px-4 min-w-[240px]">DESKRIPSI KETERCAPAIAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {tpStudents.map((st, idx) => {
                      const entry = tpScoresMap[st.student_id] || { score: '', mastery_status: 'tercapai', notes: '' };
                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {st.nis || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {st.student_name}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="text"
                              value={entry.score}
                              onChange={(e) => handleTpScoreChange(st.student_id, e.target.value)}
                              placeholder="--"
                              className="w-16 h-8 text-center font-mono font-bold border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-4 text-center">
                            <select
                              value={entry.mastery_status}
                              onChange={(e) => handleTpMasteryChange(st.student_id, e.target.value)}
                              className="h-8 px-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none"
                            >
                              <option value="tercapai_optimal">Tercapai Optimal</option>
                              <option value="tercapai">Tercapai</option>
                              <option value="cukup">Cukup</option>
                              <option value="perlu_bimbingan">Perlu Bimbingan</option>
                            </select>
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={entry.notes}
                              onChange={(e) => handleTpNotesChange(st.student_id, e.target.value)}
                              placeholder="Catatan perkembangan khusus..."
                              className="w-full h-8 px-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB NILAI SIKAP & KARAKTER */}
      {activeTab === 'attitude' && (
        <div className="space-y-4">
          {isLoadingAttitude ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 space-y-3">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : attitudeStudents.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title="Belum Ada Data Rombel"
              message="Pilih rombongan belajar untuk mengisi nilai sikap dan karakter santri."
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      <th className="py-3 px-3 w-12 text-center">NO</th>
                      <th className="py-3 px-3 w-32">NISN</th>
                      <th className="py-3 px-4 min-w-[220px]">NAMA SANTRI</th>
                      <th className="py-3 px-4">DESKRIPSI CAPAIAN SIKAP & PEMBIASAAN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {attitudeStudents.map((st, idx) => {
                      const descVal = attitudeScoresMap[st.student_id]?.[selectedDimensionId]?.description || '';
                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {st.nis || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                            {st.student_name}
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={descVal}
                              onChange={(e) => handleAttitudeDescChange(st.student_id, selectedDimensionId, e.target.value)}
                              placeholder={`Contoh: Menunjukkan integritas dan kedisiplinan yang sangat baik dalam dimensi ${
                                attitudeDimensions.find((d) => String(d.id) === String(selectedDimensionId))?.name || 'Sikap'
                              }...`}
                              className="w-full h-8 px-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 md:bottom-4 left-0 right-0 z-30 px-4 max-w-[1440px] mx-auto pointer-events-none">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
          {/* Status Left */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CloudCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Status: {sessionStats.filledCount} dari {sessionStudents.length || tpStudents.length || attitudeStudents.length} Nilai Terinput
                </span>
                {sessionStats.remedialCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                    {sessionStats.remedialCount} Remedial
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Tersinkronisasi langsung ke database rapor pusat Yayasan Aldepos.
              </p>
            </div>
          </div>

          {/* Action Buttons Right */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Tombol Simpan Draft (Amber) */}
            <Button
              variant="outline"
              size="md"
              icon={Save}
              disabled={isSaving || isSessionLocked}
              loading={isSaving}
              onClick={() => {
                if (activeTab === 'session') handleSaveSessionScores(false);
                else if (activeTab === 'tp') handleSaveTpScores();
                else if (activeTab === 'attitude') handleSaveAttitudeScores();
              }}
              className="border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              Simpan Draft
            </Button>

            {/* Tombol Submit Final ke Kurikulum (Emerald) */}
            {activeTab === 'session' && (
              <Button
                variant="primary"
                size="md"
                icon={isSessionLocked ? Lock : Send}
                disabled={isSaving || isSessionLocked || sessionStudents.length === 0}
                onClick={() => setIsConfirmSubmitOpen(true)}
              >
                {isSessionLocked ? 'Nilai Telah Dikunci' : 'Submit ke Kurikulum'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL / DRAWER FILTER MOBILE */}
      <BottomSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Konteks Penilaian"
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              {mySubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rombongan Belajar</label>
            <select
              value={selectedClassGroupId}
              onChange={(e) => setSelectedClassGroupId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {activeTab === 'session' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sesi Penilaian</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL QUICK FILL (INPUT MASSAL CEPAT) */}
      <BottomSheet
        isOpen={isQuickFillOpen}
        onClose={() => setIsQuickFillOpen(false)}
        title="Input Nilai Cepat (Quick Fill)"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Nilai yang Anda masukkan di bawah ini akan diterapkan secara serempak ke seluruh santri di kelas ini sebagai nilai dasar.
          </p>

          {activeTab === 'session' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nilai Massal (0 - 100)</label>
              <input
                type="number"
                min="0"
                max={sessionDetail?.max_score || 100}
                value={quickFillScore}
                onChange={(e) => setQuickFillScore(e.target.value)}
                placeholder="Contoh: 85"
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold"
              />
            </div>
          )}

          {activeTab === 'tp' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nilai TP (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quickFillScore}
                  onChange={(e) => setQuickFillScore(e.target.value)}
                  placeholder="Contoh: 80"
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Ketercapaian</label>
                <select
                  value={quickFillMastery}
                  onChange={(e) => setQuickFillMastery(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                >
                  <option value="tercapai_optimal">Tercapai Optimal</option>
                  <option value="tercapai">Tercapai</option>
                  <option value="cukup">Cukup</option>
                  <option value="perlu_bimbingan">Perlu Bimbingan</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'attitude' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Sikap Standar</label>
              <textarea
                rows={3}
                value={quickFillAttitudeText}
                onChange={(e) => setQuickFillAttitudeText(e.target.value)}
                placeholder="Menunjukkan pembiasaan akhlak terpuji dan kedisiplinan yang sangat baik..."
                className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs leading-relaxed"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setIsQuickFillOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={handleApplyQuickFill}
            >
              Terapkan ke Semua
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* MODAL FEEDBACK CATATAN PER SISWA */}
      <BottomSheet
        isOpen={Boolean(activeFeedbackStudent)}
        onClose={() => setActiveFeedbackStudent(null)}
        title={`Catatan: ${activeFeedbackStudent?.student_name || 'Santri'}`}
      >
        {activeFeedbackStudent && (
          <div className="space-y-4 p-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Catatan atau feedback deskriptif ini akan disinkronkan ke lembar e-Rapor Kurikulum Merdeka.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi / Catatan Pembimbingan
              </label>
              <textarea
                rows={4}
                value={sessionScoresMap[activeFeedbackStudent.student_id]?.feedback || ''}
                onChange={(e) => handleSessionFeedbackChange(activeFeedbackStudent.student_id, e.target.value)}
                placeholder="Contoh: Menunjukkan pemahaman konsep aljabar yang sangat baik, perlu penguatan pada soal cerita segitiga..."
                className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs leading-relaxed"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setActiveFeedbackStudent(null)}
              >
                Simpan Catatan
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* MODAL BUAT SESI PENILAIAN BARU */}
      <BottomSheet
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
        title="Buat Sesi Penilaian Baru"
      >
        <form onSubmit={handleSubmitCreateSession} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Jenis Pengujian *
            </label>
            <select
              required
              value={sessionFormData.assessment_type_id}
              onChange={(e) => setSessionFormData({ ...sessionFormData, assessment_type_id: e.target.value })}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              <option value="">-- Pilih Jenis Pengujian --</option>
              {assessmentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Bobot: {t.weight_percentage}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Sesi Penilaian *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Formatif 1 - Pola Bilangan / STS Ganjil"
              value={sessionFormData.title}
              onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                required
                value={sessionFormData.assessment_date}
                onChange={(e) => setSessionFormData({ ...sessionFormData, assessment_date: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Skor Maksimal
              </label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={sessionFormData.max_score}
                onChange={(e) => setSessionFormData({ ...sessionFormData, max_score: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Lingkup Pengujian
            </label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan mengenai materi asesmen..."
              value={sessionFormData.notes}
              onChange={(e) => setSessionFormData({ ...sessionFormData, notes: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => setIsCreateSessionOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              loading={isSubmittingSession}
            >
              Buat Sesi
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* DIALOG KONFIRMASI SUBMIT FINAL */}
      <ConfirmDialog
        isOpen={isConfirmSubmitOpen}
        onClose={() => setIsConfirmSubmitOpen(false)}
        onConfirm={() => handleSaveSessionScores(true)}
        title="Submit Nilai ke Kurikulum?"
        message={`Apakah Anda yakin ingin mengirim nilai untuk ${sessionStudents.length} santri pada sesi "${sessionDetail?.title || 'Asesmen'}"? Nilai yang disubmit akan diproses ke leger e-Rapor.`}
        confirmText="Ya, Submit Nilai"
        cancelText="Batal"
        loading={isSaving}
      />
    </div>
  );
}
