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
  Wand2
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
  const [toast, setToast] = useState(null);
  const [activeFeedbackStudentId, setActiveFeedbackStudentId] = useState(null);

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

  // Refs untuk input auto-focus ke siswa berikutnya
  const inputRefs = useRef({});

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
        if (a.class_group_id && !item.class_groups.some(c => String(c.id) === String(a.class_group_id))) {
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
    const sub = mySubjects.find(s => String(s.id) === String(selectedSubjectId));
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
        const tpList = Array.isArray(data) ? data.filter(t => t.is_active) : [];
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
      const sessionList = Array.isArray(data) ? data : (data.items || []);
      setSessions(sessionList);

      if (!selectedSessionId && sessionList.length > 0) {
        setSelectedSessionId(String(sessionList[0].id));
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
      const memberList = Array.isArray(memberData) ? memberData : (memberData.items || []);

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

  // Handler Perubahan Nilai Sesi
  const handleSessionScoreChange = (studentId, rawValue) => {
    if (isSessionLocked) return;
    let cleanValue = rawValue.replace(/[^0-9.]/g, '');
    const maxScore = sessionDetail?.max_score || 100;
    if (cleanValue !== '' && !isNaN(cleanValue)) {
      const num = parseFloat(cleanValue);
      if (num > maxScore) cleanValue = String(maxScore);
    }
    setSessionScoresMap((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), score: cleanValue }
    }));
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
    let cleanValue = rawValue.replace(/[^0-9.]/g, '');
    if (cleanValue !== '' && !isNaN(cleanValue)) {
      const num = parseFloat(cleanValue);
      if (num > 100) cleanValue = '100';
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

  // Navigasi Cepat via Enter
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIdx = index + 1;
      if (inputRefs.current[nextIdx]) {
        inputRefs.current[nextIdx].focus();
        inputRefs.current[nextIdx].select();
      }
    }
  };

  // Simpan Nilai Sesi Massal
  const handleSaveSessionScores = async () => {
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
        title: 'Nilai Berhasil Disimpan',
        message: `Nilai ${items.length} santri pada sesi "${sessionDetail?.title || 'Asesmen'}" berhasil disimpan dan disinkronkan ke e-Rapor.`
      });
      fetchSessionScores();
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

      const res = await scoreService.saveTpScoresBulk(payload);

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
      const activeDim = attitudeDimensions.find(d => String(d.id) === String(selectedDimensionId));
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
      message: 'Nilai massal telah disalin ke seluruh santri. Klik "Simpan" untuk menyimpan ke server.'
    });
  };

  // Generate Template Deskripsi Otomatis untuk Nilai Sikap
  const handleAutoGenerateAttitudeText = (studentName) => {
    const activeDim = attitudeDimensions.find(d => String(d.id) === String(selectedDimensionId));
    const dimName = activeDim?.name || 'dimensi sikap';
    return `Ananda ${studentName} menunjukkan perkembangan yang sangat baik dan konsisten dalam ${dimName} selama kegiatan pembelajaran dan kebersamaan di madrasah.`;
  };

  // Filter Siswa Sesuai Tab Aktif
  const activeStudentList = useMemo(() => {
    if (activeTab === 'session') return sessionStudents;
    if (activeTab === 'tp') return tpStudents;
    return attitudeStudents;
  }, [activeTab, sessionStudents, tpStudents, attitudeStudents]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeStudentList;
    const q = searchQuery.toLowerCase().trim();
    return activeStudentList.filter((st) => {
      const name = (st.student_name || '').toLowerCase();
      const nis = (st.nis || st.nisn || '').toLowerCase();
      return name.includes(q) || nis.includes(q);
    });
  }, [activeStudentList, searchQuery]);

  const activeSubject = mySubjects.find(s => String(s.id) === String(selectedSubjectId));
  const activeClass = availableClasses.find(c => String(c.id) === String(selectedClassGroupId));
  const activeTp = availableTPs.find(t => String(t.id) === String(selectedTpId));
  const activeDimension = attitudeDimensions.find(d => String(d.id) === String(selectedDimensionId));

  // Current Save Action
  const handleCurrentSave = () => {
    if (activeTab === 'session') handleSaveSessionScores();
    else if (activeTab === 'tp') handleSaveTpScores();
    else if (activeTab === 'attitude') handleSaveAttitudeScores();
  };

  const isCurrentLocked = activeTab === 'session' ? isSessionLocked : false;
  const isCurrentSaving = isSaving;

  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Input Nilai Siswa"
        subtitle="Penginputan nilai sesi asesmen, ketercapaian TP, dan nilai sikap karakter yang sinkron dengan e-Rapor."
        action={
          <div className="flex items-center gap-2">
            {activeTab === 'session' && (
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleOpenCreateSession}
                className="text-xs shrink-0"
              >
                Buat Sesi Baru
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              loading={isCurrentSaving}
              disabled={filteredStudents.length === 0 || isCurrentLocked}
              onClick={handleCurrentSave}
              className="shrink-0"
            >
              Simpan Nilai
            </Button>
          </div>
        }
      />

      {/* Segmented Tabs Penilaian */}
      <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('session')}
          className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'session'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Award className="w-4 h-4" />
          Sesi Asesmen
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tp')}
          className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'tp'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-4 h-4" />
          Nilai Capaian TP
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('attitude')}
          className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition whitespace-nowrap ${
            activeTab === 'attitude'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          Nilai Sikap / Karakter
        </button>
      </div>

      {/* Bar Pemilih Konteks, Mapel, Rombel & Parameter Tab */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SelectorKonteks />

          {/* Filter Mapel & Rombel */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {activeTab !== 'attitude' && (
              <div className="min-w-[140px] max-w-[200px]">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedSessionId('');
                    setSelectedTpId('');
                  }}
                  aria-label="Pilih Mata Pelajaran"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate min-h-[44px]"
                >
                  {mySubjects.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="min-w-[120px] max-w-[170px]">
              <select
                value={selectedClassGroupId}
                onChange={(e) => {
                  setSelectedClassGroupId(e.target.value);
                  setSelectedSessionId('');
                }}
                aria-label="Pilih Rombel"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate min-h-[44px]"
              >
                {availableClasses.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TAB 1: Pemilih Sesi Penilaian */}
        {activeTab === 'session' && (
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-xs font-bold text-slate-300">
                Pilih Sesi Penilaian:
              </label>
              <button
                type="button"
                onClick={handleOpenCreateSession}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Sesi Baru
              </button>
            </div>

            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              aria-label="Pilih Sesi Penilaian"
              className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {sessions.length > 0 ? (
                sessions.map((ses) => (
                  <option key={ses.id} value={String(ses.id)}>
                    [{ses.assessment_type_name || 'Tes'}] {ses.title} • {ses.assessment_date?.split('T')[0] || ''} (Maks: {ses.max_score || 100})
                  </option>
                ))
              ) : (
                <option value="">Belum ada sesi penilaian. Klik "+ Sesi Baru" untuk membuat sesi asesmen.</option>
              )}
            </select>
          </div>
        )}

        {/* TAB 2: Pemilih Tujuan Pembelajaran (TP) */}
        {activeTab === 'tp' && (
          <div className="pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Pilih Tujuan Pembelajaran (TP):
            </label>
            <select
              value={selectedTpId}
              onChange={(e) => setSelectedTpId(e.target.value)}
              aria-label="Pilih Tujuan Pembelajaran"
              className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableTPs.length > 0 ? (
                availableTPs.map((tp) => (
                  <option key={tp.id} value={String(tp.id)}>
                    [{tp.code}] {tp.scope_material ? `(${tp.scope_material}) ` : ''}{tp.description.slice(0, 80)}...
                  </option>
                ))
              ) : (
                <option value="">Belum ada TP aktif untuk mata pelajaran ini.</option>
              )}
            </select>
          </div>
        )}

        {/* TAB 3: Pemilih Dimensi Sikap / Karakter */}
        {activeTab === 'attitude' && (
          <div className="pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Pilih Dimensi Profil Pelajar / Aspek Karakter:
            </label>
            <select
              value={selectedDimensionId}
              onChange={(e) => setSelectedDimensionId(e.target.value)}
              aria-label="Pilih Dimensi Sikap"
              className="w-full px-3 py-2.5 min-h-[44px] text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {attitudeDimensions.map((dim) => (
                <option key={dim.id} value={String(dim.id)}>
                  [{dim.code || 'DIM'}] {dim.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Header Info Kartu Konteks Aktif */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              {activeTab === 'session' ? (
                <Award className="w-5 h-5" />
              ) : activeTab === 'tp' ? (
                <Target className="w-5 h-5" />
              ) : (
                <HeartHandshake className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">
                  {activeTab === 'session'
                    ? (sessionDetail?.title || 'Sesi Asesmen')
                    : activeTab === 'tp'
                      ? (activeTp?.code ? `TP [${activeTp.code}] - ${activeTp.scope_material || 'Materi'}` : 'Penilaian TP')
                      : (activeDimension?.name || 'Dimensi Sikap')}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activeClass?.name || 'Rombel'}
                </span>
                {activeTab !== 'attitude' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    KKM: {subjectKkm}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap font-medium">
                {activeTab === 'session' && (
                  <>
                    <span>Tanggal: {sessionDetail?.assessment_date?.split('T')[0] || '-'}</span>
                    <span>Skor Maks: {sessionDetail?.max_score || 100}</span>
                  </>
                )}
                {activeTab === 'tp' && activeTp && (
                  <span>{activeTp.description}</span>
                )}
                <span>{filteredStudents.length} Santri Terdaftar</span>
              </div>
            </div>
          </div>

          {/* Tombol Isi Cepat */}
          {!isCurrentLocked && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                icon={Zap}
                onClick={() => setIsQuickFillOpen(true)}
                className="text-xs"
              >
                Isi Cepat
              </Button>
            </div>
          )}
        </div>

        {/* Banner Jika Sesi Terkunci */}
        {isCurrentLocked && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 animate-in fade-in">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Sesi Penilaian Terkunci:</strong> Nilai sesi ini telah dikunci oleh Kurikulum untuk pencetakan e-Rapor resmi (Mode Read-Only).
            </span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama atau NIS santri..."
          className="w-full pl-9 pr-4 py-2 min-h-[44px] text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* TAMPILAN KARTU INPUT SESUAI TAB AKTIF */}
      {isLoadingScores || isLoadingTpScores || isLoadingAttitude ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : fetchError ? (
        <ErrorState
          title="Gagal Memuat Nilai Siswa"
          message={fetchError}
          onRetry={activeTab === 'session' ? fetchSessionScores : activeTab === 'tp' ? fetchTpScoresData : fetchAttitudeScoresData}
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Santri"
          description="Pilih rombel atau buat sesi asesmen terlebih dahulu untuk memulai penginputan nilai."
          icon={Users}
        />
      ) : activeTab === 'session' ? (
        /* TAB 1: KARTU SESI ASESMEN */
        <div className="flex flex-col gap-3">
          {filteredStudents.map((st, idx) => {
            const sId = st.student_id;
            const entry = sessionScoresMap[sId] || { score: '', feedback: '' };
            const scoreVal = entry.score;
            const numScore = scoreVal !== '' && !isNaN(scoreVal) ? parseFloat(scoreVal) : null;
            const isPassed = numScore !== null && numScore >= subjectKkm;
            const isRemedial = numScore !== null && numScore < subjectKkm;
            const isFeedbackOpen = activeFeedbackStudentId === sId || Boolean(entry.feedback);

            return (
              <Card
                key={sId}
                className={`p-3.5 sm:p-4 bg-slate-900/70 border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition ${
                  isSessionLocked ? 'opacity-85' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-500 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                      {st.student_name ? st.student_name.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate leading-tight">
                        {st.student_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        NIS: {st.nis || st.nisn || '-'} {st.gender ? `• ${st.gender === 'L' || st.gender === 'laki-laki' ? 'L' : 'P'}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {numScore !== null && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold hidden sm:inline-block ${
                        isPassed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {isPassed ? 'Tuntas' : 'Remedial'}
                      </span>
                    )}

                    <div className="relative">
                      <input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        disabled={isSessionLocked}
                        value={scoreVal}
                        onChange={(e) => handleSessionScoreChange(sId, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        placeholder="0"
                        className={`w-16 sm:w-20 h-11 text-center font-black text-base sm:text-lg rounded-xl border focus:outline-none transition ${
                          isSessionLocked
                            ? 'bg-slate-800/60 border-slate-700 text-slate-400 cursor-not-allowed'
                            : isPassed
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 focus:ring-2 focus:ring-emerald-500'
                              : isRemedial
                                ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 focus:ring-2 focus:ring-rose-500'
                                : 'bg-slate-800 border-slate-700 text-slate-100 focus:ring-2 focus:ring-emerald-500'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isSessionLocked}
                      onClick={() => setActiveFeedbackStudentId(activeFeedbackStudentId === sId ? null : sId)}
                      aria-label={`Catatan untuk ${st.student_name}`}
                      className={`min-w-[40px] min-h-[40px] p-2 rounded-lg text-xs transition flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                        entry.feedback
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                      }`}
                      title={entry.feedback || 'Tambah catatan feedback'}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isFeedbackOpen && (
                  <div className="pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
                    <input
                      type="text"
                      disabled={isSessionLocked}
                      value={entry.feedback || ''}
                      onChange={(e) => handleSessionFeedbackChange(sId, e.target.value)}
                      placeholder={`Catatan feedback untuk ${st.student_name}...`}
                      className="w-full px-3 py-2 text-xs bg-slate-800/90 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : activeTab === 'tp' ? (
        /* TAB 2: KARTU NILAI CAPAIAN TP */
        <div className="flex flex-col gap-3">
          {filteredStudents.map((st, idx) => {
            const sId = st.student_id;
            const entry = tpScoresMap[sId] || { score: '', mastery_status: 'tercapai', notes: '' };
            const scoreVal = entry.score;
            const currentMastery = entry.mastery_status || 'tercapai';

            return (
              <Card
                key={sId}
                className="p-3.5 sm:p-4 bg-slate-900/70 border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-500 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                      {st.student_name ? st.student_name.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate leading-tight">
                        {st.student_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        NIS: {st.nis || st.nisn || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Input Skor TP */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="decimal"
                        value={scoreVal}
                        onChange={(e) => handleTpScoreChange(sId, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        placeholder="0"
                        className="w-16 sm:w-20 h-11 text-center font-black text-base sm:text-lg rounded-xl border bg-slate-800 border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Status Ketercapaian TP Chips (Touch-friendly 44px) */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'tercapai_optimal', label: 'Tercapai Optimal', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                    { id: 'tercapai', label: 'Tercapai', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
                    { id: 'cukup', label: 'Cukup', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                    { id: 'perlu_bimbingan', label: 'Perlu Bimbingan', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
                  ].map((chip) => {
                    const isSelected = currentMastery === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleTpMasteryChange(sId, chip.id)}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition whitespace-nowrap min-h-[40px] ${
                          isSelected
                            ? `${chip.color} ring-2 ring-emerald-500 font-bold shadow-sm`
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TAB 3: KARTU NILAI SIKAP & KARAKTER */
        <div className="flex flex-col gap-3">
          {filteredStudents.map((st, idx) => {
            const sId = st.student_id;
            const dimId = String(selectedDimensionId);
            const desc = attitudeScoresMap[sId]?.[dimId]?.description || '';

            return (
              <Card
                key={sId}
                className="p-3.5 sm:p-4 bg-slate-900/70 border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-500 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                      {st.student_name ? st.student_name.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate leading-tight">
                        {st.student_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        NIS: {st.nis || st.nisn || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Buat Narasi Otomatis */}
                  <button
                    type="button"
                    onClick={() => {
                      const text = handleAutoGenerateAttitudeText(st.student_name);
                      handleAttitudeDescChange(sId, dimId, text);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition min-h-[40px]"
                    title="Buat deskripsi naratif otomatis"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Template
                  </button>
                </div>

                {/* Textarea Deskripsi Capaian Sikap Santri */}
                <div className="pt-1">
                  <Textarea
                    rows={2}
                    value={desc}
                    onChange={(e) => handleAttitudeDescChange(sId, dimId, e.target.value)}
                    placeholder={`Tulis deskripsi catatan perkembangan karakter ${st.student_name} pada dimensi ${activeDimension?.name || 'ini'}...`}
                    className="w-full text-xs"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Save Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 sm:hidden">
        <Button
          variant="primary"
          size="lg"
          icon={Save}
          loading={isCurrentSaving}
          disabled={filteredStudents.length === 0 || isCurrentLocked}
          onClick={handleCurrentSave}
          className="w-full shadow-lg"
        >
          {isCurrentLocked ? 'Sesi Terkunci (Read-Only)' : 'Simpan Nilai Siswa'}
        </Button>
      </div>

      {/* Bottom Sheet Buat Sesi Baru */}
      <BottomSheet
        isOpen={isCreateSessionOpen}
        onClose={() => !isSubmittingSession && setIsCreateSessionOpen(false)}
        title="Buat Sesi Penilaian Baru"
        description={`Penilaian untuk ${activeSubject?.name || 'Mapel'} di ${activeClass?.name || 'Rombel'}`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              disabled={isSubmittingSession}
              onClick={() => setIsCreateSessionOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={isSubmittingSession}
              onClick={handleSubmitCreateSession}
              className="flex-1"
            >
              Buat Sesi Asesmen
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitCreateSession} className="space-y-4 py-1">
          <FormField
            label="Jenis Pengujian / Asesmen"
            required
            help="Tipe penilaian kurikulum merdeka"
          >
            <select
              value={sessionFormData.assessment_type_id}
              onChange={(e) => setSessionFormData({ ...sessionFormData, assessment_type_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            >
              {assessmentTypes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Judul Sesi Penilaian"
            required
            help="Contoh: Formatif 1 - SPLDV & Aljabar"
          >
            <Input
              type="text"
              value={sessionFormData.title}
              onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
              placeholder="Contoh: Ulangan Harian Bab 2"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal Asesmen" required>
              <Input
                type="date"
                value={sessionFormData.assessment_date}
                onChange={(e) => setSessionFormData({ ...sessionFormData, assessment_date: e.target.value })}
              />
            </FormField>

            <FormField label="Skor Maksimal" required>
              <Input
                type="number"
                min="10"
                max="1000"
                value={sessionFormData.max_score}
                onChange={(e) => setSessionFormData({ ...sessionFormData, max_score: e.target.value })}
                placeholder="100"
              />
            </FormField>
          </div>

          {availableTPs.length > 0 && (
            <FormField
              label="Tujuan Pembelajaran (TP) yang Diujikan"
              help="Pilih TP untuk sinkronisasi otomatis ke capaian e-Rapor"
            >
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-800/60 rounded-lg border border-slate-700">
                {availableTPs.map((tp) => {
                  const isChecked = sessionFormData.learning_objective_ids.includes(String(tp.id));
                  return (
                    <label
                      key={tp.id}
                      className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-800 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const idStr = String(tp.id);
                          if (e.target.checked) {
                            setSessionFormData({
                              ...sessionFormData,
                              learning_objective_ids: [...sessionFormData.learning_objective_ids, idStr]
                            });
                          } else {
                            setSessionFormData({
                              ...sessionFormData,
                              learning_objective_ids: sessionFormData.learning_objective_ids.filter(i => i !== idStr)
                            });
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 bg-slate-900 border-slate-700"
                      />
                      <span className="text-slate-200">
                        <strong>[{tp.code}]</strong> {tp.scope_material ? `(${tp.scope_material}) ` : ''}{tp.description.slice(0, 65)}...
                      </span>
                    </label>
                  );
                })}
              </div>
            </FormField>
          )}

          <FormField label="Catatan Tambahan (Opsional)">
            <Textarea
              rows={2}
              value={sessionFormData.notes}
              onChange={(e) => setSessionFormData({ ...sessionFormData, notes: e.target.value })}
              placeholder="Catatan pelaksanaan asesmen..."
            />
          </FormField>
        </form>
      </BottomSheet>

      {/* Bottom Sheet Quick Fill */}
      <BottomSheet
        isOpen={isQuickFillOpen}
        onClose={() => setIsQuickFillOpen(false)}
        title="Isi Nilai Cepat (Quick Fill)"
        description={`Isi nilai massal sekaligus ke seluruh santri di kelas ${activeClass?.name || ''}.`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsQuickFillOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleApplyQuickFill}
              className="flex-1"
            >
              Terapkan ke Semua
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {activeTab === 'session' && (
            <FormField
              label={`Masukkan Nilai (0 - ${sessionDetail?.max_score || 100})`}
              help="Nilai ini akan disalin ke seluruh kotak input santri."
            >
              <Input
                type="number"
                min="0"
                max={sessionDetail?.max_score || 100}
                value={quickFillScore}
                onChange={(e) => setQuickFillScore(e.target.value)}
                placeholder="Contoh: 85"
                className="text-center font-bold text-lg"
              />
            </FormField>
          )}

          {activeTab === 'tp' && (
            <>
              <FormField label="Skor Capaian TP (0 - 100)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={quickFillScore}
                  onChange={(e) => setQuickFillScore(e.target.value)}
                  placeholder="85"
                  className="text-center font-bold text-lg"
                />
              </FormField>

              <FormField label="Status Ketercapaian">
                <select
                  value={quickFillMastery}
                  onChange={(e) => setQuickFillMastery(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 min-h-[44px]"
                >
                  <option value="tercapai_optimal">Tercapai Optimal</option>
                  <option value="tercapai">Tercapai</option>
                  <option value="cukup">Cukup</option>
                  <option value="perlu_bimbingan">Perlu Bimbingan</option>
                </select>
              </FormField>
            </>
          )}

          {activeTab === 'attitude' && (
            <FormField
              label="Teks Deskripsi Sikap Massal"
              help={`Deskripsi untuk dimensi ${activeDimension?.name || 'ini'}`}
            >
              <Textarea
                rows={3}
                value={quickFillAttitudeText}
                onChange={(e) => setQuickFillAttitudeText(e.target.value)}
                placeholder={`Contoh: Menunjukkan pembiasaan yang sangat baik dalam ${activeDimension?.name || 'aspek ini'}...`}
              />
            </FormField>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
