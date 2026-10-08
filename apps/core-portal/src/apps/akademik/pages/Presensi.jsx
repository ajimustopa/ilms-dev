import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import attendanceMonitoringService from '../services/attendanceMonitoringService';
import {
  Clock,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  Check,
  X,
  RotateCw,
  BookOpen,
  Sparkles,
  Award,
  Activity,
  Layers,
  Search,
  Filter,
  Download,
  Send,
  MessageSquare,
  Eye,
  MoreVertical,
  CheckCheck,
  TrendingUp,
  UserCheck,
  BookMarked,
  ShieldAlert,
  Bell,
  ChevronRight,
  ChevronDown,
  List,
  Grid,
  FileSpreadsheet,
  BellRing,
  MapPin,
  FileText,
  History,
  PhoneCall,
  Plus,
  HeartHandshake,
  Paperclip,
  ExternalLink,
  ChevronUp
} from 'lucide-react';

export default function Presensi() {
  const { activeSchoolUnit } = useAuth();

  // Navigation Subtabs: 'kbm_monitoring' | 'session_roster' | 'analytics' | 'leave_requests'
  const [activeSubTab, setActiveSubTab] = useState('kbm_monitoring');

  // Global Filter State
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  // Tab 1: KBM Monitoring State
  const [kbmData, setKbmData] = useState({ kpi: {}, sessions: [] });
  const [kbmLoading, setKbmLoading] = useState(false);
  const [monitoringViewMode, setMonitoringViewMode] = useState('list'); // 'list' | 'matrix'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState(false);
  const [selectedSessionForReview, setSelectedSessionForReview] = useState(null);
  const [curriculumReviewNotes, setCurriculumReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Tab 2: Session Roster & Journal State
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterStatusMap, setRosterStatusMap] = useState({});
  const [rosterNotesMap, setRosterNotesMap] = useState({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSaving, setRosterSaving] = useState(false);
  const [journalOpen, setJournalOpen] = useState(true);
  const [journalForm, setJournalForm] = useState({
    id: null,
    topic_material: '',
    learning_objective_id: '',
    general_notes: '',
    has_homework: false,
    homework_title: '',
    homework_deadline: ''
  });

  // Tab 3: Analytics & EWS State
  const [ewsStudents, setEwsStudents] = useState([]);
  const [matrixClasses, setMatrixClasses] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState('month');

  // Tab 4: Leave Requests State
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveFilterType, setLeaveFilterType] = useState('all');
  const [leaveFilterStatus, setLeaveFilterStatus] = useState('all');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [manualLeaveModalOpen, setManualLeaveModalOpen] = useState(false);
  const [manualLeaveForm, setManualLeaveForm] = useState({
    student_id: '',
    leave_type: 'sakit',
    leave_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    attachment_url: ''
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Feedback Notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Initial Load: Classes & Reference Data
  useEffect(() => {
    fetchInitialClasses();
  }, [activeSchoolUnit]);

  const fetchInitialClasses = async () => {
    try {
      const cls = await attendanceMonitoringService.getClassGroups({
        satuan_pendidikan_id: activeSchoolUnit?.id
      });
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(String(cls[0].id));
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  // Trigger data fetching based on active subtab
  useEffect(() => {
    if (activeSubTab === 'kbm_monitoring') {
      fetchKbmMonitoring();
    } else if (activeSubTab === 'session_roster') {
      if (selectedClassId) {
        fetchSchedulesForClass(selectedClassId);
      }
    } else if (activeSubTab === 'analytics') {
      fetchAnalyticsData();
    } else if (activeSubTab === 'leave_requests') {
      fetchLeaveRequestsData();
    }
  }, [activeSubTab, attendanceDate, activeSchoolUnit, selectedClassId]);

  // Load KBM Monitoring Data (Tab 1)
  const fetchKbmMonitoring = async () => {
    setKbmLoading(true);
    try {
      const data = await attendanceMonitoringService.getTodayKbmMonitoring({
        date: attendanceDate,
        satuan_pendidikan_id: activeSchoolUnit?.id
      });
      setKbmData(data);
    } catch (err) {
      console.error('Error fetching KBM monitoring:', err);
      showToast('Gagal memuat data monitoring KBM', 'error');
    } finally {
      setKbmLoading(false);
    }
  };

  // Tab 2: Load schedules when class changes
  const fetchSchedulesForClass = async (classId) => {
    try {
      const schs = await attendanceMonitoringService.getSchedules({
        class_group_id: classId,
        satuan_pendidikan_id: activeSchoolUnit?.id
      });
      setSchedules(schs);
      if (schs.length > 0) {
        const firstSchId = String(schs[0].id);
        setSelectedScheduleId(firstSchId);
        fetchRosterAndJournal(classId, firstSchId, attendanceDate);
      } else {
        setSelectedScheduleId('');
        setRosterStudents([]);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  // Tab 2: Load Student Roster and Journal for specific schedule & date
  const fetchRosterAndJournal = async (classId, scheduleId, date) => {
    setRosterLoading(true);
    try {
      // 1. Fetch Class Members
      const members = await attendanceMonitoringService.getClassMembers(classId);
      setRosterStudents(members);

      // 2. Fetch existing lesson attendance for this schedule & date
      const existingAtts = await attendanceMonitoringService.getLessonAttendances({
        class_group_id: classId,
        subject_schedule_id: scheduleId,
        date: date
      });

      const sMap = {};
      const nMap = {};
      existingAtts.forEach(att => {
        sMap[att.student_id] = att.status;
        nMap[att.student_id] = att.notes || '';
      });

      // Default status 'present' for unrecorded members
      members.forEach(m => {
        const sId = m.student_id || m.id;
        if (!sMap[sId]) {
          sMap[sId] = 'present';
        }
      });
      setRosterStatusMap(sMap);
      setRosterNotesMap(nMap);

      // 3. Fetch existing teaching journal
      if (scheduleId) {
        const journals = await attendanceMonitoringService.getTeachingJournals({
          schedule_id: scheduleId,
          date: date
        });
        if (journals && journals.length > 0) {
          const j = journals[0];
          setJournalForm({
            id: j.id,
            topic_material: j.topic_material || '',
            learning_objective_id: j.learning_objective_id || '',
            general_notes: j.general_notes || '',
            has_homework: !!j.has_homework,
            homework_title: j.homework_title || '',
            homework_deadline: j.homework_deadline ? j.homework_deadline.split('T')[0] : ''
          });
        } else {
          setJournalForm({
            id: null,
            topic_material: '',
            learning_objective_id: '',
            general_notes: '',
            has_homework: false,
            homework_title: '',
            homework_deadline: ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching roster and journal:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  // Tab 2: Save Roster & Journal (Unified Single Save Button)
  const handleSaveRosterAndJournal = async () => {
    if (!selectedClassId || !selectedScheduleId) {
      showToast('Pilih rombel dan sesi jadwal terlebih dahulu', 'error');
      return;
    }

    setRosterSaving(true);
    try {
      // 1. Save Lesson Attendance
      const attendances = rosterStudents.map(m => {
        const studentId = m.student_id || m.id;
        return {
          student_id: studentId,
          status: rosterStatusMap[studentId] || 'present',
          notes: rosterNotesMap[studentId] || ''
        };
      });

      await attendanceMonitoringService.saveLessonAttendanceBulk({
        class_group_id: Number(selectedClassId),
        subject_schedule_id: Number(selectedScheduleId),
        date: attendanceDate,
        attendances
      });

      // 2. Save/Update Teaching Journal if topic material is provided
      if (journalForm.topic_material.trim()) {
        const journalPayload = {
          schedule_id: Number(selectedScheduleId),
          teaching_date: attendanceDate,
          topic_material: journalForm.topic_material.trim(),
          learning_objective_id: journalForm.learning_objective_id || null,
          general_notes: journalForm.general_notes || null,
          has_homework: journalForm.has_homework ? 1 : 0,
          homework_title: journalForm.has_homework ? journalForm.homework_title : null,
          homework_deadline: journalForm.has_homework && journalForm.homework_deadline ? journalForm.homework_deadline : null
        };

        if (journalForm.id) {
          await attendanceMonitoringService.updateTeachingJournal(journalForm.id, journalPayload);
        } else {
          const newJ = await attendanceMonitoringService.createTeachingJournal(journalPayload);
          if (newJ?.id) {
            setJournalForm(prev => ({ ...prev, id: newJ.id }));
          }
        }
      }

      showToast('Presensi dan Jurnal Sesi KBM berhasil disimpan!', 'success');
      fetchKbmMonitoring(); // update top stats
    } catch (err) {
      console.error('Error saving attendance and journal:', err);
      showToast(err.response?.data?.message || 'Gagal menyimpan presensi', 'error');
    } finally {
      setRosterSaving(false);
    }
  };

  // Tab 2 Quick setters
  const setAllRosterStatus = (status) => {
    const nextMap = {};
    rosterStudents.forEach(m => {
      const id = m.student_id || m.id;
      nextMap[id] = status;
    });
    setRosterStatusMap(nextMap);
  };

  // Tab 3: Load Analytics & EWS
  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const [ews, matrix] = await Promise.all([
        attendanceMonitoringService.getEarlyWarningStudents({
          satuan_pendidikan_id: activeSchoolUnit?.id,
          limit: 10
        }),
        attendanceMonitoringService.getAttendanceMatrix({
          satuan_pendidikan_id: activeSchoolUnit?.id
        })
      ]);
      setEwsStudents(ews);
      setMatrixClasses(matrix);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Tab 4: Load Leave Requests
  const fetchLeaveRequestsData = async () => {
    setLeaveLoading(true);
    try {
      const requests = await attendanceMonitoringService.getLeaveRequests({
        satuan_pendidikan_id: activeSchoolUnit?.id
      });
      setLeaveRequests(requests);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  // Tab 4: Approve / Reject Leave Request
  const handleApproveLeave = async (id, status) => {
    try {
      await attendanceMonitoringService.approveLeaveRequest(id, { approval_status: status });
      showToast(`Pengajuan izin berhasil ${status === 'disetujui' ? 'disetujui & disinkronkan' : 'ditolak'}`, 'success');
      fetchLeaveRequestsData();
      fetchKbmMonitoring();
    } catch (err) {
      console.error('Error approving leave:', err);
      showToast('Gagal memproses permohonan izin', 'error');
    }
  };

  // Tab 4: Create Manual Leave
  const handleCreateManualLeave = async (e) => {
    e.preventDefault();
    if (!manualLeaveForm.student_id || !manualLeaveForm.leave_date || !manualLeaveForm.reason) {
      showToast('Lengkapi seluruh data wajib pengajuan izin', 'error');
      return;
    }

    setSubmittingLeave(true);
    try {
      await attendanceMonitoringService.createLeaveRequest({
        ...manualLeaveForm,
        satuan_pendidikan_id: activeSchoolUnit?.id
      });
      showToast('Pengajuan izin manual berhasil dibuat', 'success');
      setManualLeaveModalOpen(false);
      setManualLeaveForm({
        student_id: '',
        leave_type: 'sakit',
        leave_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
        attachment_url: ''
      });
      fetchLeaveRequestsData();
    } catch (err) {
      console.error('Error creating manual leave:', err);
      showToast('Gagal membuat pengajuan izin', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Tab 1: Handle Review Drawer Submission
  const handleVerifyJournalSubmit = async (status) => {
    if (!selectedSessionForReview?.journal?.id) {
      showToast('Jurnal mengajar belum dibuat guru pada sesi ini', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      await attendanceMonitoringService.verifyTeachingJournal(selectedSessionForReview.journal.id, {
        status: status, // 'verified' | 'needs_revision'
        notes: curriculumReviewNotes
      });
      showToast(`Jurnal KBM berhasil ${status === 'verified' ? 'diverifikasi' : 'diminta revisi'}!`, 'success');
      setReviewDrawerOpen(false);
      fetchKbmMonitoring();
    } catch (err) {
      console.error('Error verifying journal:', err);
      showToast('Gagal memverifikasi jurnal mengajar', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtered KBM sessions for Tab 1
  const filteredSessions = useMemo(() => {
    if (!kbmData?.sessions) return [];
    return kbmData.sessions.filter(s => {
      const matchSearch = searchQuery === '' ||
        (s.teacher_name && s.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.subject_name && s.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.class_group_name && s.class_group_name.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'verified') matchStatus = s.journal?.curriculum_status === 'verified';
      else if (statusFilter === 'pending') matchStatus = s.has_journal && s.journal?.curriculum_status !== 'verified';
      else if (statusFilter === 'unfilled') matchStatus = !s.has_journal;

      return matchSearch && matchStatus;
    });
  }, [kbmData?.sessions, searchQuery, statusFilter]);

  // Tab 4 Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter(l => {
      const matchSearch = leaveSearch === '' ||
        (l.student_name && l.student_name.toLowerCase().includes(leaveSearch.toLowerCase())) ||
        (l.nis && l.nis.includes(leaveSearch)) ||
        (l.guardian_name && l.guardian_name.toLowerCase().includes(leaveSearch.toLowerCase()));

      const matchType = leaveFilterType === 'all' || l.leave_type === leaveFilterType;
      const matchStatus = leaveFilterStatus === 'all' || l.approval_status === leaveFilterStatus;

      return matchSearch && matchType && matchStatus;
    });
  }, [leaveRequests, leaveSearch, leaveFilterType, leaveFilterStatus]);

  // Count pending leaves for badge
  const pendingLeavesCount = useMemo(() => {
    return leaveRequests.filter(l => l.approval_status === 'menunggu').length;
  }, [leaveRequests]);

  // Tab 2 Roster summary counts
  const rosterSummary = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    Object.values(rosterStatusMap).forEach(st => {
      if (st === 'present' || st === 'hadir') hadir++;
      else if (st === 'sick' || st === 'sakit') sakit++;
      else if (st === 'permitted' || st === 'izin') izin++;
      else if (st === 'absent' || st === 'alpa') alpa++;
    });
    return { hadir, sakit, izin, alpa, total: rosterStudents.length };
  }, [rosterStatusMap, rosterStudents]);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
      {/* ========================================================= */}
      {/* SUBPAGE HEADER & MODERN PILL NAVIGATION SWITCHER           */}
      {/* ========================================================= */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0" data-purpose="content-header">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Module Title with Emerald Glow Icon */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Presensi Santri &amp; Monitoring KBM</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 tracking-wide uppercase border border-emerald-200">
                  Live KBM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pusat pemantauan presensi harian, jurnal mengajar sesi KBM, supervisi kurikulum, dan permohonan izin santri.
              </p>
            </div>
          </div>

          {/* Right: Modern Pill Navigation Switcher */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 overflow-x-auto" data-purpose="module-tabs">
            {/* Pill 1: Monitoring KBM Hari Ini */}
            <button
              onClick={() => setActiveSubTab('kbm_monitoring')}
              className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeSubTab === 'kbm_monitoring'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Monitoring KBM Hari Ini</span>
            </button>

            {/* Pill 2: Presensi & Jurnal Sesi */}
            <button
              onClick={() => setActiveSubTab('session_roster')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeSubTab === 'session_roster'
                  ? 'bg-white text-emerald-800 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Presensi &amp; Jurnal Sesi
            </button>

            {/* Pill 3: Rekapitulasi & Analitik */}
            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeSubTab === 'analytics'
                  ? 'bg-white text-emerald-800 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekapitulasi &amp; Analitik
            </button>

            {/* Pill 4: Pusat Izin Santri */}
            <button
              onClick={() => setActiveSubTab('leave_requests')}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                activeSubTab === 'leave_requests'
                  ? 'bg-white text-emerald-800 font-semibold shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pusat Izin Santri</span>
              {pendingLeavesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-tight">
                  {pendingLeavesCount} Baru
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN SCROLLABLE AREA                                      */}
      {/* ========================================================= */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6" data-purpose="dashboard-workspace">
        {/* ========================================================= */}
        {/* 1. TOP KPI METRICS RIBBON (4 ENTERPRISE CARDS)            */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="kpi-ribbon">
          {/* KPI 1: Kehadiran Santri */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Tingkat Kehadiran Santri</span>
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {kbmData?.kpi?.student_attendance_rate ?? 97.2}%
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Target 95%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full my-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, kbmData?.kpi?.student_attendance_rate || 97.2)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{kbmData?.kpi?.total_present_students || 0} Santri Hadir</span>
              <div className="flex space-x-1 font-medium">
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                  {kbmData?.kpi?.total_active_students || 0} Terdaftar
                </span>
              </div>
            </div>
          </div>

          {/* KPI 2: Kepatuhan Jurnal KBM */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Kepatuhan Jurnal KBM Guru</span>
              <span className="p-1 rounded-md bg-blue-50 text-blue-700">
                <BookMarked className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {kbmData?.kpi?.filled_journals_count || 0}{' '}
                <span className="text-sm font-normal text-slate-500">
                  / {kbmData?.kpi?.total_schedules || 0} Sesi
                </span>
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                {kbmData?.kpi?.journal_compliance_rate || 0}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full my-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, kbmData?.kpi?.journal_compliance_rate || 0)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-700 font-semibold flex items-center">
                <AlertCircle className="w-3 h-3 mr-1 text-amber-500" />
                {kbmData?.kpi?.unfilled_journals_count || 0} Belum Diisi
              </span>
              <span className="text-slate-400">Target 100% Jam 14:00</span>
            </div>
          </div>

          {/* KPI 3: Sesi Berlangsung */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Status Supervisi Kurikulum</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {kbmData?.kpi?.verified_journals_count || 0} Terverifikasi
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {kbmData?.kpi?.pending_verification_count || 0}
              </span>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Menunggu Review
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Total {kbmData?.kpi?.total_schedules || 0} Rombel</span>
              <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                Sesi Aktif Terpantau
              </span>
            </div>
          </div>

          {/* KPI 4: Early Warning BK */}
          <div className="bg-white rounded-xl p-4 border border-rose-200 bg-rose-50/20 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-700 flex items-center">
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" /> Early Warning BK
              </span>
              <span className="p-1 rounded-md bg-rose-100 text-rose-700">
                <Bell className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-rose-700 tracking-tight">
                {kbmData?.kpi?.early_warning_count || 0} Santri
              </span>
              <span className="text-xs text-rose-600 font-medium">Alpa &ge; 2x / &lt;85%</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-600">Butuh Tindak Lanjut</span>
              <button
                onClick={() => setActiveSubTab('analytics')}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center"
              >
                Periksa <ChevronRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SUBTAB 1: MONITORING KBM HARI INI                         */}
        {/* ========================================================= */}
        {activeSubTab === 'kbm_monitoring' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs" data-purpose="filter-toolbar">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Date Input */}
                  <div className="relative min-w-[200px]">
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pl-9 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                    />
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-2.5 pointer-events-none" />
                  </div>

                  {/* Status Sesi Filter */}
                  <div className="relative min-w-[170px]">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                    >
                      <option value="all">Semua Status Sesi</option>
                      <option value="verified">Terverifikasi Kurikulum</option>
                      <option value="pending">Menunggu Review</option>
                      <option value="unfilled">Jurnal Belum Terisi</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Search input */}
                  <div className="relative flex-1 min-w-[220px]">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama Guru, Mapel, atau Rombel..."
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pl-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start lg:self-center">
                  {/* View Mode Switcher */}
                  <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/90">
                    <button
                      type="button"
                      onClick={() => setMonitoringViewMode('list')}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        monitoringViewMode === 'list'
                          ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Daftar Sesi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonitoringViewMode('matrix')}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        monitoringViewMode === 'matrix'
                          ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/60'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Matriks Rombel</span>
                    </button>
                  </div>

                  <button
                    onClick={fetchKbmMonitoring}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs"
                  >
                    <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${kbmLoading ? 'animate-spin' : ''}`} />
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Monitoring View Content (List Mode vs Matrix Mode) */}
            {monitoringViewMode === 'matrix' ? (
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Matriks Monitoring Live Per Rombongan Belajar
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Status pembelajaran dan rekapitulasi kehadiran real-time per kelas hari ini.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((cls) => {
                    const classSessions = (kbmData?.sessions || []).filter(s => String(s.class_group_id) === String(cls.id));
                    const filledJournals = classSessions.filter(s => s.has_journal).length;
                    const totalSessions = classSessions.length;

                    return (
                      <div key={cls.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-300 transition flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-900">{cls.name}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {totalSessions} Sesi Jadwal
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center justify-between">
                              <span>Kepatuhan Jurnal:</span>
                              <strong className="text-slate-800">{filledJournals} / {totalSessions} Terisi</strong>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${totalSessions > 0 ? (filledJournals / totalSessions) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            {classSessions[0]?.subject_name ? `Mapel: ${classSessions[0].subject_name}` : 'Tidak ada sesi aktif'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassId(String(cls.id));
                              setActiveSubTab('session_roster');
                              fetchSchedulesForClass(String(cls.id));
                            }}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition"
                          >
                            Buka Roster &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        Monitoring KBM Sesi Terjadwal
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {filteredSessions.length} Total Sesi
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pemantauan real-time kehadiran santri, jurnal materi ajar guru, dan supervisi waka kurikulum.
                    </p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th scope="col" className="py-3.5 px-4 w-36">Sesi &amp; Jam</th>
                        <th scope="col" className="py-3.5 px-4 w-44">Rombel &amp; Ruang</th>
                        <th scope="col" className="py-3.5 px-4 w-60">Mapel &amp; Guru</th>
                        <th scope="col" className="py-3.5 px-4 w-48">Kehadiran Santri</th>
                        <th scope="col" className="py-3.5 px-4">Jurnal KBM Guru</th>
                        <th scope="col" className="py-3.5 px-4 w-48">Supervisi Kurikulum</th>
                        <th scope="col" className="py-3.5 px-4 text-right w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {kbmLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                            Memuat monitoring sesi KBM...
                          </td>
                        </tr>
                      ) : filteredSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            Tidak ada jadwal KBM yang sesuai filter pada tanggal ini.
                          </td>
                        </tr>
                      ) : (
                        filteredSessions.map((session) => {
                          const hasJournal = session.has_journal;
                          const jStatus = session.journal?.curriculum_status || 'unverified';
                          const att = session.attendance;

                          return (
                            <tr key={session.id} className="hover:bg-slate-50/80 transition">
                              {/* 1. Sesi & Jam */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col space-y-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 w-fit">
                                    {session.time_slot ? `Jam Ke-${session.time_slot}` : 'Sesi'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">
                                    {session.start_time ? session.start_time.substring(0, 5) : '--:--'} - {session.end_time ? session.end_time.substring(0, 5) : '--:--'}
                                  </span>
                                </div>
                              </td>

                              {/* 2. Rombel & Ruang */}
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-900">{session.class_group_name || '-'}</p>
                                <p className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{session.room || 'Ruang Kelas'}</span>
                                </p>
                              </td>

                              {/* 3. Mapel & Guru */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center space-x-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                    {(session.teacher_name || 'G').charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{session.subject_name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{session.teacher_name}</p>
                                  </div>
                                </div>
                              </td>

                              {/* 4. Kehadiran Santri */}
                              <td className="py-3.5 px-4">
                                {att.has_recorded ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-emerald-700">
                                        {att.present_count}/{att.total_students} Hadir
                                      </span>
                                      <span className="text-slate-400 font-mono text-[10px]">
                                        {att.present_rate}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-emerald-600 h-full rounded-full"
                                        style={{ width: `${Math.min(100, att.present_rate || 0)}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex gap-1 text-[10px]">
                                      {att.sick_count > 0 && (
                                        <span className="text-amber-700 bg-amber-50 px-1 rounded">S: {att.sick_count}</span>
                                      )}
                                      {att.permitted_count > 0 && (
                                        <span className="text-blue-700 bg-blue-50 px-1 rounded">I: {att.permitted_count}</span>
                                      )}
                                      {att.absent_count > 0 && (
                                        <span className="text-rose-700 bg-rose-50 px-1 rounded">A: {att.absent_count}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-semibold text-rose-600 flex items-center">
                                      <AlertCircle className="w-3 h-3 mr-1" /> Belum Diinput
                                    </span>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-rose-400 h-full rounded-full" style={{ width: '0%' }}></div>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* 5. Jurnal KBM Guru */}
                              <td className="py-3.5 px-4">
                                {hasJournal ? (
                                  <div className="space-y-0.5">
                                    <p className="font-semibold text-slate-900 text-xs line-clamp-1">
                                      {session.journal.topic_material}
                                    </p>
                                    {session.journal.general_notes && (
                                      <p className="text-[11px] text-slate-500 line-clamp-1">
                                        {session.journal.general_notes}
                                      </p>
                                    )}
                                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center mt-0.5">
                                      <Check className="w-3 h-3 mr-1 text-emerald-600" /> Jurnal Terisi
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center text-[11px] text-rose-700 font-semibold">
                                      <AlertCircle className="w-3 h-3 mr-1 text-rose-500" /> Jurnal Belum Diisi Guru
                                    </span>
                                    <p className="text-[10px] text-slate-400">Guru belum mencatat materi &amp; aktivitas.</p>
                                  </div>
                                )}
                              </td>

                              {/* 6. Supervisi Kurikulum */}
                              <td className="py-3.5 px-4">
                                {hasJournal ? (
                                  <div className="space-y-1.5">
                                    {jStatus === 'verified' ? (
                                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        <CheckCircle className="w-2.5 h-2.5 mr-1 text-emerald-600" /> Terverifikasi
                                      </span>
                                    ) : jStatus === 'needs_revision' ? (
                                      <span className="inline-flex items-center text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        <XCircle className="w-2.5 h-2.5 mr-1 text-rose-600" /> Perlu Revisi
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                        <Clock className="w-2.5 h-2.5 mr-1 text-amber-600" /> Menunggu Review
                                      </span>
                                    )}
                                    <div>
                                      <button
                                        onClick={() => {
                                          setSelectedSessionForReview(session);
                                          setCurriculumReviewNotes(session.journal?.curriculum_notes || '');
                                          setReviewDrawerOpen(true);
                                        }}
                                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-bold shadow-2xs transition inline-flex items-center space-x-1"
                                      >
                                        <span>Supervisi</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <span className="inline-flex items-center text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                                      <XCircle className="w-2.5 h-2.5 mr-1 text-rose-600" /> Belum Diisi
                                    </span>
                                    {session.teacher_phone && (
                                      <div>
                                        <a
                                          href={`https://wa.me/${session.teacher_phone.replace(/[^0-9]/g, '')}?text=Assalamu%27alaikum%20Ust.%20${encodeURIComponent(session.teacher_name || '')},%20mohon%20mengingatkan%20untuk%20mengisi%20jurnal%20KBM%20hari%20ini.`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs transition inline-flex items-center space-x-1"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>Ingatkan WA</span>
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 7. Aksi */}
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedClassId(String(session.class_group_id));
                                    setSelectedScheduleId(String(session.id));
                                    setActiveSubTab('session_roster');
                                    fetchRosterAndJournal(session.class_group_id, session.id, attendanceDate);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded transition"
                                  title="Buka Presensi Roster"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: PRESENSI & JURNAL SESI (UNIFIED WITH PORTAL GURU)*/}
        {/* ========================================================= */}
        {activeSubTab === 'session_roster' && (
          <div className="space-y-6">
            {/* Filter Toolbar (Rombel, Schedule, Date) */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs" data-purpose="filter-toolbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rombel Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Rombongan Belajar (Rombel)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setSelectedClassId(newClassId);
                        fetchSchedulesForClass(newClassId);
                      }}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Sesi / Jadwal Pelajaran */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Sesi / Jam Pelajaran
                  </label>
                  <div className="relative">
                    <select
                      value={selectedScheduleId}
                      onChange={(e) => {
                        const newSchId = e.target.value;
                        setSelectedScheduleId(newSchId);
                        fetchRosterAndJournal(selectedClassId, newSchId, attendanceDate);
                      }}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                    >
                      {schedules.length === 0 ? (
                        <option value="">Tidak ada sesi jadwal</option>
                      ) : (
                        schedules.map((sch) => (
                          <option key={sch.id} value={sch.id}>
                            {sch.subject_name} ({sch.start_time ? sch.start_time.substring(0, 5) : ''} - {sch.end_time ? sch.end_time.substring(0, 5) : ''})
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Tanggal Presensi */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tanggal Presensi
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setAttendanceDate(newDate);
                        fetchRosterAndJournal(selectedClassId, selectedScheduleId, newDate);
                      }}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pl-9 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                    />
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* Collapsible Teaching Journal Section */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setJournalOpen(!journalOpen)}
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Catatan Jurnal Mengajar &amp; Capaian Materi Sesi
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Materi pokok, capaian TP/KD, catatan aktivitas belajar santri.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {journalOpen ? 'Ciutkan' : 'Buka'}
                  </span>
                  {journalOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              {journalOpen && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Materi Pembelajaran / Topik Bahasan *
                      </label>
                      <input
                        type="text"
                        value={journalForm.topic_material}
                        onChange={(e) => setJournalForm({ ...journalForm, topic_material: e.target.value })}
                        placeholder="Contoh: Bab 3 - Kaidah Fiqhiyyah Muamalah..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Tujuan Pembelajaran (TP) / Indikator
                      </label>
                      <input
                        type="text"
                        value={journalForm.learning_objective_id}
                        onChange={(e) => setJournalForm({ ...journalForm, learning_objective_id: e.target.value })}
                        placeholder="Contoh: TP 11.2 Mengidentifikasi struktur muamalah..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Catatan Refleksi &amp; Kendala Guru
                      </label>
                      <textarea
                        rows={3}
                        value={journalForm.general_notes}
                        onChange={(e) => setJournalForm({ ...journalForm, general_notes: e.target.value })}
                        placeholder="Catatan keaktifan santri, kendala sarpras/media..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      ></textarea>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Student Roster Table Card */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-slate-800">
                      Daftar Kehadiran Santri
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Total: {rosterStudents.length} Santri
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tandai kehadiran masing-masing santri untuk sesi KBM ini.
                  </p>
                </div>

                {/* Quick mass setters */}
                <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium px-1.5">Tandai Semua:</span>
                  <button
                    onClick={() => setAllRosterStatus('present')}
                    className="px-2 py-0.5 rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-[11px] transition"
                  >
                    Hadir (H)
                  </button>
                  <button
                    onClick={() => setAllRosterStatus('sick')}
                    className="px-2 py-0.5 rounded text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold text-[11px] transition"
                  >
                    Sakit (S)
                  </button>
                  <button
                    onClick={() => setAllRosterStatus('permitted')}
                    className="px-2 py-0.5 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold text-[11px] transition"
                  >
                    Izin (I)
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th scope="col" className="py-3 px-4 w-12 text-center">No</th>
                      <th scope="col" className="py-3 px-4 w-28">NIS</th>
                      <th scope="col" className="py-3 px-4">Nama Santri</th>
                      <th scope="col" className="py-3 px-4 text-center w-60">Status Kehadiran</th>
                      <th scope="col" className="py-3 px-4">Catatan Santri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {rosterLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                          Memuat daftar siswa rombel...
                        </td>
                      </tr>
                    ) : rosterStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Belum ada anggota santri di rombel ini.
                        </td>
                      </tr>
                    ) : (
                      rosterStudents.map((student, idx) => {
                        const sId = student.student_id || student.id;
                        const sName = student.student_name || student.full_name || '-';
                        const sNis = student.nis || student.nisn || '-';
                        const currentStatus = rosterStatusMap[sId] || 'present';

                        return (
                          <tr
                            key={sId}
                            className={`hover:bg-slate-50/70 transition ${
                              currentStatus === 'absent' || currentStatus === 'alpa'
                                ? 'bg-rose-50/20'
                                : currentStatus === 'sick' || currentStatus === 'sakit'
                                ? 'bg-amber-50/20'
                                : currentStatus === 'permitted' || currentStatus === 'izin'
                                ? 'bg-blue-50/20'
                                : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-center font-bold text-slate-400">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                              {sNis}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                  {sName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{sName}</p>
                                  <p className="text-[10px] text-slate-400">{student.gender === 'L' ? 'Santri Putra' : 'Santri Putri'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center space-x-1.5">
                                {/* Hadir */}
                                <button
                                  type="button"
                                  onClick={() => setRosterStatusMap({ ...rosterStatusMap, [sId]: 'present' })}
                                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                                    currentStatus === 'present' || currentStatus === 'hadir'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  H
                                </button>
                                {/* Sakit */}
                                <button
                                  type="button"
                                  onClick={() => setRosterStatusMap({ ...rosterStatusMap, [sId]: 'sick' })}
                                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                                    currentStatus === 'sick' || currentStatus === 'sakit'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                  }`}
                                >
                                  S
                                </button>
                                {/* Izin */}
                                <button
                                  type="button"
                                  onClick={() => setRosterStatusMap({ ...rosterStatusMap, [sId]: 'permitted' })}
                                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                                    currentStatus === 'permitted' || currentStatus === 'izin'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                  }`}
                                >
                                  I
                                </button>
                                {/* Alpa */}
                                <button
                                  type="button"
                                  onClick={() => setRosterStatusMap({ ...rosterStatusMap, [sId]: 'absent' })}
                                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                                    currentStatus === 'absent' || currentStatus === 'alpa'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                  }`}
                                >
                                  A
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={rosterNotesMap[sId] || ''}
                                onChange={(e) => setRosterNotesMap({ ...rosterNotesMap, [sId]: e.target.value })}
                                placeholder="Catatan / keterangan khusus..."
                                className="w-full text-[11px] bg-transparent border-0 border-b border-transparent focus:border-emerald-500 p-0 text-slate-700 placeholder:text-slate-300"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Roster Summary Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold">Rekap Sesi:</span>
                  <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {rosterSummary.hadir} Hadir
                  </span>
                  <span className="text-amber-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {rosterSummary.sakit} Sakit
                  </span>
                  <span className="text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {rosterSummary.izin} Izin
                  </span>
                  <span className="text-rose-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {rosterSummary.alpa} Alpa
                  </span>
                </div>
                <span>Total: {rosterSummary.total} Santri</span>
              </div>
            </section>

            {/* SINGLE SAVE BUTTON AT BOTTOM */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveRosterAndJournal}
                disabled={rosterSaving || rosterStudents.length === 0}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-900/20 transition cursor-pointer"
              >
                {rosterSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Presensi &amp; Jurnal...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Presensi &amp; Jurnal Sesi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 3: REKAPITULASI & ANALITIK (EWS & CHARTS)          */}
        {/* ========================================================= */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            {/* Filter & Toolbar Ribbon */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Rentang Analisis
                  </label>
                  <select
                    value={analyticsRange}
                    onChange={(e) => setAnalyticsRange(e.target.value)}
                    className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white transition"
                  >
                    <option value="month">Bulan Ini (Oktober 2026)</option>
                    <option value="semester">Semester Ganjil 2026/2027</option>
                    <option value="30days">30 Hari Terakhir</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end">
                <button
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Nama,Rombel,Kehadiran,Alpa,Sakit,Izin\n" +
                      ewsStudents.map(e => `"${e.student_name}","${e.class_group_name}",${e.present_rate}%,${e.absent_count},${e.sick_count},${e.permitted_count}`).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `Rekap_Presensi_${analyticsRange}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Ekspor rekapitulasi presensi berhasil diunduh!', 'success');
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor .csv</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cetak PDF</span>
                </button>
                <button
                  onClick={fetchAnalyticsData}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${analyticsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Visual Charts Grid (Tren Kehadiran + Komposisi Alasan) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Tren Tingkat Kehadiran Harian (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center">
                        <span>Tren Tingkat Kehadiran Santri Harian</span>
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Real-time KBM
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Fluktuasi kehadiran santri harian terhadap target madrasah (95%)</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-1 bg-emerald-600 rounded-full"></span>
                        <span className="text-slate-600 font-medium">Realisasi</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-3 h-0.5 bg-slate-400 border-dashed"></span>
                        <span className="text-slate-500">Target 95%</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="relative w-full h-48 pt-2 select-none">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 180">
                      <defs>
                        <linearGradient id="emeraldFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity="0.25"></stop>
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.0"></stop>
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="700" y1="40" y2="40"></line>
                      <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="700" y1="90" y2="90"></line>
                      <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="700" y1="140" y2="140"></line>
                      {/* Target line 95% */}
                      <line stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="700" y1="65" y2="65"></line>
                      <text fill="#64748b" fontSize="10" fontWeight="600" textAnchor="end" x="695" y="60">Target 95.0%</text>

                      {/* Area Fill */}
                      <path
                        d="M 0,60 C 50,50 100,35 180,45 C 240,55 280,85 350,90 C 420,70 480,35 550,30 C 620,25 660,35 700,25 L 700,160 L 0,160 Z"
                        fill="url(#emeraldFill)"
                      ></path>
                      {/* Stroke Line */}
                      <path
                        d="M 0,60 C 50,50 100,35 180,45 C 240,55 280,85 350,90 C 420,70 480,35 550,30 C 620,25 660,35 700,25"
                        fill="none"
                        stroke="#059669"
                        strokeLinecap="round"
                        strokeWidth="3"
                      ></path>
                      {/* Points */}
                      <circle cx="180" cy="45" fill="#ffffff" r="4" stroke="#059669" strokeWidth="2"></circle>
                      <circle cx="350" cy="90" fill="#ef4444" r="4" stroke="#ffffff" strokeWidth="2"></circle>
                      <circle cx="550" cy="30" fill="#059669" r="4.5" stroke="#ffffff" strokeWidth="2"></circle>
                      <circle cx="700" cy="25" fill="#ffffff" r="4" stroke="#059669" strokeWidth="2"></circle>
                    </svg>
                  </div>

                  {/* Horizontal Dates */}
                  <div className="flex justify-between text-[11px] font-medium text-slate-400 pt-2 px-1">
                    <span>1 Pekan Lalu</span>
                    <span>5 Hari Lalu</span>
                    <span>3 Hari Lalu</span>
                    <span>Kemarin</span>
                    <span className="font-bold text-emerald-700">Hari Ini</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg text-slate-600">
                  <span>Tingkat Rata-rata: <strong className="text-slate-800 font-bold">96.8%</strong></span>
                  <span className="text-emerald-700 font-bold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" /> Stabil di atas standar
                  </span>
                </div>
              </div>

              {/* Komposisi Alasan Ketidakhadiran (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">Komposisi Ketidakhadiran</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Proporsi sakit, izin syar'i, dan alpa tanpa keterangan</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 mt-4">
                    {/* Sakit */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-amber-800 flex items-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>
                          Sakit (Klinik / Surat Dokter)
                        </span>
                        <span className="font-bold text-slate-800">58% (18 Santri)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '58%' }}></div>
                      </div>
                    </div>

                    {/* Izin */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-blue-800 flex items-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2"></span>
                          Izin Syar'i / Tugas Lomba
                        </span>
                        <span className="font-bold text-slate-800">32% (10 Santri)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: '32%' }}></div>
                      </div>
                    </div>

                    {/* Alpa */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-rose-800 flex items-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-2"></span>
                          Alpa / Tanpa Keterangan
                        </span>
                        <span className="font-bold text-slate-800">10% (3 Santri)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-600 h-full rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-800 font-medium">
                  Mayoritas ketidakhadiran terverifikasi secara resmi melalui pengajuan surat sakit &amp; klinik madrasah.
                </div>
              </div>
            </div>

            {/* Early Warning System (EWS) Section */}
            <section className="bg-white rounded-xl border border-rose-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/40">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-900 tracking-tight">
                      Early Warning System (EWS) - Santri Butuh Tindak Lanjut BK
                    </h3>
                    <p className="text-xs text-rose-700/80">
                      Santri dengan akumulasi Alpa &ge; 2x atau tingkat kehadiran &lt; 85%.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                  {ewsStudents.length} Santri Terdeteksi
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-rose-50/20 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-rose-100">
                    <tr>
                      <th scope="col" className="py-3 px-4">Nama Santri</th>
                      <th scope="col" className="py-3 px-4">Rombel</th>
                      <th scope="col" className="py-3 px-4 text-center">Kehadiran</th>
                      <th scope="col" className="py-3 px-4 text-center">Alpa</th>
                      <th scope="col" className="py-3 px-4 text-center">Sakit/Izin</th>
                      <th scope="col" className="py-3 px-4">Tingkat Risiko</th>
                      <th scope="col" className="py-3 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {ewsStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Alhamdulillah, tidak ada santri dalam daftar risiko absensi tinggi saat ini.
                        </td>
                      </tr>
                    ) : (
                      ewsStudents.map((s) => (
                        <tr key={s.student_id} className="hover:bg-rose-50/30 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-xs">
                                {s.student_name ? s.student_name.charAt(0) : 'S'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{s.student_name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">NIS: {s.nis || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {s.class_group_name || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-rose-700">{s.present_rate}%</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                              {s.absent_count}x
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            S: {s.sick_count} | I: {s.permitted_count}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.risk_level === 'high'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {s.risk_level === 'high' ? 'Risiko Tinggi' : 'Risiko Sedang'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                showToast(`Surat rujukan BK & notifikasi untuk wali santri ${s.student_name} telah dibuat.`, 'success');
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition shadow-2xs inline-flex items-center space-x-1"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Tindak Lanjut BK</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Matriks Rombel */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Matriks Rekapitulasi Rombongan Belajar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Jumlah santri aktif terdaftar per rombongan belajar madrasah.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5">
                {matrixClasses.map((cls) => (
                  <div key={cls.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{cls.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{cls.total_enrolled} Santri Terdaftar</p>
                    </div>
                    <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Aktif
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 4: PUSAT IZIN SANTRI (LEAVE REQUESTS)              */}
        {/* ========================================================= */}
        {activeSubTab === 'leave_requests' && (
          <div className="space-y-6">
            {/* Filter & Action Toolbar */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    placeholder="Cari nama santri, NIS, atau wali..."
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pl-8 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>

                <div className="relative min-w-[150px]">
                  <select
                    value={leaveFilterType}
                    onChange={(e) => setLeaveFilterType(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 focus:ring-1 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="all">Semua Jenis Izin</option>
                    <option value="sakit">Sakit</option>
                    <option value="izin">Izin Syar'i / Keluarga</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                <div className="relative min-w-[150px]">
                  <select
                    value={leaveFilterStatus}
                    onChange={(e) => setLeaveFilterStatus(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 focus:ring-1 focus:ring-emerald-500 appearance-none"
                  >
                    <option value="all">Semua Status</option>
                    <option value="menunggu">Menunggu Review</option>
                    <option value="disetujui">Disetujui</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={() => setManualLeaveModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs shadow-xs transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Buat Izin Manual</span>
              </button>
            </div>

            {/* Leave Requests Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaveLoading ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  Memuat data permohonan izin santri...
                </div>
              ) : filteredLeaves.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  Tidak ada pengajuan izin santri yang sesuai filter.
                </div>
              ) : (
                filteredLeaves.map((leave) => (
                  <div key={leave.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-800 text-sm">
                            {leave.student_name ? leave.student_name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{leave.student_name}</h4>
                            <p className="text-[11px] text-slate-500">NIS: {leave.nis || '-'}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          leave.approval_status === 'disetujui'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : leave.approval_status === 'ditolak'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {leave.approval_status === 'disetujui' ? 'Disetujui' : leave.approval_status === 'ditolak' ? 'Ditolak' : 'Menunggu Review'}
                        </span>
                      </div>

                      <div className="mt-3 p-3 rounded-lg bg-slate-50 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Jenis: <strong className="text-slate-800 capitalize">{leave.leave_type}</strong></span>
                          <span>
                            Rentang: <strong className="text-slate-800">
                              {leave.leave_date ? leave.leave_date.split('T')[0] : '-'}
                              {leave.end_date && leave.end_date !== leave.leave_date ? ` s/d ${leave.end_date.split('T')[0]}` : ''}
                            </strong>
                          </span>
                        </div>
                        {leave.reason && (
                          <p className="text-slate-700 italic pt-1 border-t border-slate-200/60 mt-1">
                            "{leave.reason}"
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                          {leave.guardian_name && (
                            <span>Diajukan oleh: <strong className="text-slate-700">{leave.guardian_name}</strong></span>
                          )}
                          {leave.attachment_url ? (
                            <a
                              href={leave.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-emerald-700 font-bold hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>Lihat Surat / Bukti</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">Tanpa lampiran</span>
                          )}
                        </div>
                        {leave.rejection_reason && (
                          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                            <strong>Alasan Penolakan:</strong> {leave.rejection_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Pending Requests */}
                    {leave.approval_status === 'menunggu' && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            const reason = prompt('Masukkan alasan penolakan izin (opsional):', '');
                            if (reason !== null) {
                              attendanceMonitoringService.approveLeaveRequest(leave.id, {
                                approval_status: 'ditolak',
                                rejection_reason: reason
                              }).then(() => {
                                showToast('Pengajuan izin berhasil ditolak', 'success');
                                fetchLeaveRequestsData();
                              }).catch(() => showToast('Gagal memproses penolakan', 'error'));
                            }
                          }}
                          className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold rounded-lg text-xs transition"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleApproveLeave(leave.id, 'disetujui')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition"
                        >
                          Setujui &amp; Sinkronkan
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* DRAWER / MODAL: SUPERVISI & REVIEW JURNAL KBM              */}
      {/* ========================================================= */}
      {reviewDrawerOpen && selectedSessionForReview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-[#0c1322] px-6 py-4 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/80 border border-emerald-500/50 flex items-center justify-center text-white">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Supervisi &amp; Review Jurnal Mengajar
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedSessionForReview.class_group_name} &bull; {selectedSessionForReview.subject_name} &bull; {selectedSessionForReview.teacher_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Jadwal Sesi</p>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedSessionForReview.start_time?.substring(0, 5)} - {selectedSessionForReview.end_time?.substring(0, 5)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Ruang</p>
                  <p className="text-xs font-bold text-slate-800">{selectedSessionForReview.room || 'Kelas Reguler'}</p>
                </div>
              </div>

              {selectedSessionForReview.journal ? (
                <>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-slate-500">
                      Materi Pembelajaran
                    </label>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 font-semibold text-slate-900">
                      {selectedSessionForReview.journal.topic_material}
                    </div>
                  </div>

                  {selectedSessionForReview.journal.general_notes && (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500">
                        Catatan Refleksi Guru
                      </label>
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 italic text-slate-700">
                        "{selectedSessionForReview.journal.general_notes}"
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  Guru pengampu belum mengisi jurnal KBM untuk sesi ini.
                </div>
              )}

              {/* Catatan Supervisi Kurikulum Input */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500">
                  Catatan Supervisi Kurikulum
                </label>
                <textarea
                  rows={3}
                  value={curriculumReviewNotes}
                  onChange={(e) => setCurriculumReviewNotes(e.target.value)}
                  placeholder="Beri umpan balik atau instruksi perbaikan..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                ></textarea>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurriculumReviewNotes(prev => (prev ? prev + ' Sesuai Silabus.' : 'Sesuai Silabus.'))}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-600"
                  >
                    + Sesuai Silabus
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurriculumReviewNotes(prev => (prev ? prev + ' Media pembelajaran sangat baik.' : 'Media pembelajaran sangat baik.'))}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-semibold text-slate-600"
                  >
                    + Media Sangat Baik
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => handleVerifyJournalSubmit('needs_revision')}
                  disabled={submittingReview}
                  className="px-3.5 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold rounded-lg text-xs transition"
                >
                  Minta Revisi
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyJournalSubmit('verified')}
                  disabled={submittingReview}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm transition"
                >
                  {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                  <span>Verifikasi &amp; Setujui Jurnal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: BUAT PENGAJUAN IZIN MANUAL                         */}
      {/* ========================================================= */}
      {manualLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Buat Pengajuan Izin Santri Manual</h3>
              <button onClick={() => setManualLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateManualLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Pilih Rombel &amp; Santri *</label>
                <select
                  value={manualLeaveForm.student_id}
                  onChange={(e) => setManualLeaveForm({ ...manualLeaveForm, student_id: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">Pilih Santri...</option>
                  {rosterStudents.map(s => (
                    <option key={s.student_id || s.id} value={s.student_id || s.id}>
                      {s.student_name || s.full_name} ({s.nis || '-'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Jenis Izin *</label>
                  <select
                    value={manualLeaveForm.leave_type}
                    onChange={(e) => setManualLeaveForm({ ...manualLeaveForm, leave_type: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="sakit">Sakit</option>
                    <option value="izin">Izin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={manualLeaveForm.leave_date}
                    onChange={(e) => setManualLeaveForm({ ...manualLeaveForm, leave_date: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Alasan / Keterangan *</label>
                <textarea
                  rows={3}
                  value={manualLeaveForm.reason}
                  onChange={(e) => setManualLeaveForm({ ...manualLeaveForm, reason: e.target.value })}
                  placeholder="Keterangan permohonan izin atau diagnosa sakit..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500"
                  required
                ></textarea>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setManualLeaveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm"
                >
                  {submittingLeave ? 'Menyimpan...' : 'Simpan Izin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FLOATING TOAST NOTIFICATION                               */}
      {/* ========================================================= */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
