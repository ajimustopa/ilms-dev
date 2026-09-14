import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../shared/store/AuthContext';
import { useManajemenTheme } from '../theme';
import api from '../../../shared/services/api';
import GanttTimelineView from '../components/GanttTimelineView';
import DatePickerField, { isoToDmy, dmyToIso } from '../components/shared/DatePickerField';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import {
  CheckSquare,
  Briefcase,
  Layers,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  List,
  Kanban,
  BarChart2,
  MessageSquare,
  Send,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  User,
  Tag,
  Sparkles,
  Search,
  SlidersHorizontal,
  FolderKanban,
  Check,
  RefreshCw,
  Percent,
  X,
  Building2,
  School,
  Save,
  Edit3,
  FileText,
  CalendarRange,
  RotateCcw
} from 'lucide-react';

// Helper: Format tanggal ISO mentah ke format Indonesia yang mudah dibaca
const formatHumanDate = (dateVal) => {
  if (!dateVal) return '-';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = d.getDate();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function TaskProjectHub() {
  const { user, schoolUnits, activeSchoolUnit } = useAuth();
  const { theme, isDark } = useManajemenTheme();

  // Context: Tingkat Yayasan vs Satuan Pendidikan + Tahun Ajaran (Tersimpan di localStorage)
  const [contextType, setContextType] = useState(() => {
    return localStorage.getItem('aldepos_task_hub_context_type') || 'foundation';
  });
  const [selectedUnitId, setSelectedUnitId] = useState(() => {
    const saved = localStorage.getItem('aldepos_task_hub_unit_id');
    return saved ? Number(saved) : (activeSchoolUnit?.id || (schoolUnits?.[0]?.id || 1));
  });
  const [academicYear, setAcademicYear] = useState(() => {
    return localStorage.getItem('aldepos_task_hub_academic_year') || '2026/2027';
  });

  // Source Context: 'program' | 'project'
  const [contextSource, setContextSource] = useState(() => {
    return localStorage.getItem('aldepos_task_hub_context_source') || 'program';
  });
  const [selectedProgramId, setSelectedProgramId] = useState(() => {
    return localStorage.getItem('aldepos_task_hub_program_id') || 'all';
  });
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return localStorage.getItem('aldepos_task_hub_project_id') || 'all';
  });

  // View Mode: 'list' | 'kanban' | 'gantt' | 'calendar' | 'bucket'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('aldepos_task_hub_view_mode') || 'kanban';
  });

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    avg_progress_percent: 0,
  });

  // Source options
  const [programsList, setProgramsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Memoized Searchable Select Options
  const programOptions = useMemo(() => {
    return [
      {
        value: 'all',
        label: '✨ Semua Program RKT (Gabungan Seluruh Tugas)',
        badge: `${programsList.length} Program`,
        badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        sublabel: 'Tampilkan semua tugas langkah kegiatan',
      },
      ...programsList.map((p) => ({
        value: p.id,
        label: `${p.code || ''} - ${p.name || ''}`,
        badge: p.is_flagship ? '⭐ Unggulan' : null,
        sublabel: p.category_name || (p.domain_name ? `Bidang: ${p.domain_name}` : null),
      })),
    ];
  }, [programsList]);

  const projectOptions = useMemo(() => {
    return [
      {
        value: 'all',
        label: '✨ Semua Proyek Generik (Gabungan Seluruh Tugas)',
        badge: `${projectsList.length} Proyek`,
        badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      },
      ...projectsList.map((pr) => ({
        value: pr.id,
        label: pr.name || `Proyek #${pr.id}`,
        badge: pr.status?.toUpperCase(),
        badgeClass: pr.status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300',
        sublabel: pr.description ? pr.description.slice(0, 40) + '...' : null,
      })),
    ];
  }, [projectsList]);

  // Opsi Dropdown Tag / Tipe Tugas (Konsisten dengan RKT Planning)
  const tagOptions = useMemo(() => [
    { value: 'kegiatan_utama', label: 'Kegiatan Utama', badge: 'Utama', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-primary' },
    { value: 'rapat', label: 'Rapat Koordinasi', badge: 'Rapat', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-amber' },
    { value: 'dokumen', label: 'Penyusunan Dokumen', badge: 'Dokumen', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-cyan' },
    { value: 'pengadaan', label: 'Pengadaan Logistik', badge: 'Pengadaan', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-emerald' },
    { value: 'sosialisasi', label: 'Sosialisasi / Workshop', badge: 'Sosialisasi', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-violet' },
    { value: 'koordinasi', label: 'Koordinasi Eksternal', badge: 'Koordinasi', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-blue' },
    { value: 'dokumentasi', label: 'Dokumentasi & Laporan', badge: 'Laporan', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-rose' },
    { value: 'lainnya', label: 'Lainnya', badge: 'Lainnya', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-slate' },
  ], []);

  // Opsi Dropdown Status Pelaksanaan
  const statusOptions = useMemo(() => [
    { value: 'planned', label: 'Planned (Direncanakan)', badge: 'Planned', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-slate' },
    { value: 'in_progress', label: 'In Progress (Berjalan)', badge: 'In Progress', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-amber' },
    { value: 'completed', label: 'Completed (Selesai)', badge: 'Completed', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-emerald' },
    { value: 'cancelled', label: 'Cancelled (Dibatalkan)', badge: 'Cancelled', badgeClass: 'px-1.5 py-0.5 rounded text-[9px] font-bold mj-badge-rose' },
  ], []);

  // Opsi Pegawai untuk PIC Pelaksana (Multi-Select)
  const employeeOptions = useMemo(() => {
    return employees.map((emp) => ({
      value: emp.id,
      label: emp.full_name || emp.name || `Pegawai #${emp.id}`,
      sublabel: emp.nip ? `NIP: ${emp.nip}` : (emp.position_name || emp.role_name || ''),
    }));
  }, [employees]);

  // Tasks & Activities Data
  const [tasksList, setTasksList] = useState([]);
  const [bucketData, setBucketData] = useState({ overdue: [], today: [], tomorrow: [], this_week: [] });
  const [ganttData, setGanttData] = useState([]);
  const [currentAwpId, setCurrentAwpId] = useState(null);

  // Selected item for right detail drawer
  const [selectedItem, setSelectedItem] = useState(null);

  // Edit State for Right Detail Drawer
  const [isEditingDrawerItem, setIsEditingDrawerItem] = useState(false);
  const [editDrawerForm, setEditDrawerForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    progress_percent: 0,
    status: 'planned',
    assignee_employee_ids: [],
    document_link: '',
    notes: '',
  });
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);

  // Create Task / Activity Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    source_type: 'activity', // 'activity' (Program RKT) | 'task' (Proyek)
    program_id: '',
    project_id: '',
    title: '',
    tag: 'kegiatan_utama',
    date_mode: 'range',
    start_date: '',
    end_date: '',
    status: 'planned',
    progress_percent: 0,
    assignee_employee_ids: [],
    document_link: '',
    notes: '',
  });

  // Helper konversi tanggal ke string 'YYYY-MM-DD' lokal tanpa geser timezone UTC
  const toLocalYMD = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return trimmed.slice(0, 10);
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const openCreateModal = (defaultProgId = null, defaultProjId = null, defaultStatus = 'planned') => {
    const isProg = contextSource === 'program';
    const initProgId = defaultProgId || (selectedProgramId !== 'all' ? selectedProgramId : programsList[0]?.id || '');
    const initProjId = defaultProjId || (selectedProjectId !== 'all' ? selectedProjectId : projectsList[0]?.id || '');

    const initialProgress =
      defaultStatus === 'done' || defaultStatus === 'completed'
        ? 100
        : defaultStatus === 'in_progress'
        ? 25
        : 0;

    const now = new Date();
    const todayStr = toLocalYMD(now);
    const nextWeekStr = toLocalYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

    setCreateForm({
      source_type: isProg ? 'activity' : 'task',
      program_id: String(initProgId || ''),
      project_id: String(initProjId || ''),
      title: '',
      tag: 'kegiatan_utama',
      date_mode: 'range',
      start_date: todayStr,
      end_date: nextWeekStr,
      status: defaultStatus || 'planned',
      progress_percent: initialProgress,
      assignee_employee_ids: [],
      document_link: '',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  // Sync edit form when selectedItem changes (Menggunakan toLocalYMD agar tanggal tidak bergeser -1 hari)
  useEffect(() => {
    if (selectedItem) {
      let empIds = [];
      if (Array.isArray(selectedItem.assignee_employee_ids)) {
        empIds = selectedItem.assignee_employee_ids.map(Number).filter(Boolean);
      } else if (selectedItem.assignee_employee_id) {
        empIds = [Number(selectedItem.assignee_employee_id)];
      }

      setEditDrawerForm({
        title: selectedItem.title || selectedItem.name || '',
        start_date: toLocalYMD(selectedItem.start_date || selectedItem.activity_date),
        end_date: toLocalYMD(selectedItem.end_date || selectedItem.due_date),
        progress_percent: selectedItem.progress_percent || 0,
        status: selectedItem.status || (selectedItem.item_type === 'activity' ? 'planned' : 'todo'),
        assignee_employee_ids: empIds,
        document_link: selectedItem.document_link || '',
        notes: selectedItem.notes || selectedItem.description || '',
      });
      setIsEditingDrawerItem(false);
    }
  }, [selectedItem?.id, selectedItem?.raw_id]);

  // Handler Simpan Tugas / Aktivitas Baru
  const handleCreateTask = async (e) => {
    if (e) e.preventDefault();
    if (!createForm.title?.trim()) {
      alert('Mohon masukkan judul tugas / aktivitas!');
      return;
    }

    setIsSavingCreate(true);
    try {
      const sDate = createForm.start_date || createForm.activity_date || null;
      const eDate = createForm.date_mode === 'single' ? sDate : (createForm.end_date || sDate);

      const assigneeIds = Array.isArray(createForm.assignee_employee_ids)
        ? createForm.assignee_employee_ids.map(Number).filter(Boolean)
        : (createForm.assignee_employee_id ? [Number(createForm.assignee_employee_id)] : []);

      if (createForm.source_type === 'activity') {
        const targetProgId = createForm.program_id || (selectedProgramId !== 'all' ? selectedProgramId : programsList[0]?.id);
        if (!targetProgId) {
          alert('Mohon pilih Program RKT tujuan!');
          setIsSavingCreate(false);
          return;
        }

        let awpId = currentAwpId;
        if (!awpId) {
          // Cari AWP ID jika belum tersimpan
          const unitParam = contextType === 'foundation' ? 'is_foundation=true' : `school_unit_id=${selectedUnitId}`;
          const currentAwpRes = await api.get(`/manajemen/annual-work-plans/current?${unitParam}&academic_year=${encodeURIComponent(academicYear)}`).catch(() => null);
          if (currentAwpRes?.data?.data?.id) {
            awpId = currentAwpRes.data.data.id;
            setCurrentAwpId(awpId);
          }
        }

        const actPayload = {
          annual_work_plan_id: awpId ? Number(awpId) : 1,
          rips_program_id: Number(targetProgId),
          title: createForm.title.trim(),
          tag: createForm.tag || 'kegiatan_utama',
          start_date: sDate,
          end_date: eDate,
          activity_date: sDate,
          status: createForm.status || 'planned',
          progress_percent: Number(createForm.progress_percent) || 0,
          assignee_employee_ids: assigneeIds,
          assignee_employee_id: assigneeIds[0] || null,
          document_link: createForm.document_link || null,
          notes: createForm.notes || null,
        };

        const res = await api.post('/manajemen/work-plan-activities', actPayload);
        if (res.data?.success) {
          setIsCreateModalOpen(false);
          await fetchTasksData();
          await fetchInitialData();
        } else {
          alert(res.data?.message || 'Gagal menambahkan aktivitas RKT baru');
        }
      } else {
        // Project Task
        const targetProjId = createForm.project_id || (selectedProjectId !== 'all' ? selectedProjectId : projectsList[0]?.id);
        if (!targetProjId) {
          alert('Mohon pilih Proyek tujuan!');
          setIsSavingCreate(false);
          return;
        }

        const taskStatus = createForm.status === 'completed' ? 'done' : (createForm.status === 'planned' ? 'todo' : createForm.status);

        const taskPayload = {
          project_id: Number(targetProjId),
          title: createForm.title.trim(),
          start_date: sDate,
          due_date: eDate,
          status: taskStatus,
          progress_percent: Number(createForm.progress_percent) || 0,
          assignee_employee_ids: assigneeIds,
          assignee_employee_id: assigneeIds[0] || null,
          description: createForm.notes || null,
        };

        const res = await api.post('/manajemen/tasks', taskPayload);
        if (res.data?.success) {
          setIsCreateModalOpen(false);
          await fetchTasksData();
          await fetchInitialData();
        } else {
          alert(res.data?.message || 'Gagal menambahkan tugas proyek');
        }
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert(err.response?.data?.message || 'Terjadi kesalahan saat membuat tugas baru');
    } finally {
      setIsSavingCreate(false);
    }
  };

  // Save changes from right drawer
  const handleSaveDrawerEdit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedItem) return;

    if (!editDrawerForm.title?.trim()) {
      alert('Judul tugas/aktivitas tidak boleh kosong!');
      return;
    }

    setIsSavingDrawer(true);
    try {
      const isActivity =
        selectedItem.item_type === 'activity' ||
        Boolean(selectedItem.program_id && !selectedItem.project_id);

      let rawId = selectedItem.raw_id;
      if (rawId === undefined || rawId === null) {
        const idStr = String(selectedItem.id || '');
        const matched = idStr.match(/\d+/);
        rawId = matched ? parseInt(matched[0], 10) : selectedItem.id;
      } else if (typeof rawId === 'string' && !/^\d+$/.test(rawId)) {
        const matched = rawId.match(/\d+/);
        rawId = matched ? parseInt(matched[0], 10) : rawId;
      }

      const numProg = Number(editDrawerForm.progress_percent) || 0;
      const isDone = editDrawerForm.status === 'done' || editDrawerForm.status === 'completed';
      const actStatus = isDone ? 'completed' : editDrawerForm.status || 'planned';
      const taskStatus = isDone ? 'done' : editDrawerForm.status || 'todo';

      let updatedServerItem = null;

      if (isActivity) {
        const actPayload = {
          title: editDrawerForm.title.trim(),
          start_date: editDrawerForm.start_date || null,
          activity_date: editDrawerForm.start_date || null,
          end_date: editDrawerForm.end_date || null,
          progress_percent: numProg,
          status: actStatus,
          assignee_employee_ids: editDrawerForm.assignee_employee_ids,
          document_link: editDrawerForm.document_link || null,
          notes: editDrawerForm.notes || null,
        };

        const res = await api.put(`/manajemen/work-plan-activities/${rawId}`, actPayload);
        updatedServerItem = res.data?.data;

        // Sync to schedule endpoint for timeline gantt consistency
        await api
          .patch(`/manajemen/tasks/gantt/activity/${rawId}/schedule`, {
            start_date: editDrawerForm.start_date,
            end_date: editDrawerForm.end_date,
            progress_percent: numProg,
          })
          .catch(() => {});
      } else {
        const taskPayload = {
          title: editDrawerForm.title.trim(),
          start_date: editDrawerForm.start_date || null,
          due_date: editDrawerForm.end_date || null,
          progress_percent: numProg,
          status: taskStatus,
          assignee_employee_id: editDrawerForm.assignee_employee_ids?.[0] || null,
          document_link: editDrawerForm.document_link || null,
          description: editDrawerForm.notes || null,
        };

        const res = await api.put(`/manajemen/tasks/${rawId}`, taskPayload);
        updatedServerItem = res.data?.data;

        await api
          .patch(`/manajemen/tasks/gantt/task/${rawId}/schedule`, {
            start_date: editDrawerForm.start_date,
            end_date: editDrawerForm.end_date,
            progress_percent: numProg,
          })
          .catch(() => {});
      }

      // Mutasi item lokal untuk UI seketika
      const newSelectedItem = {
        ...selectedItem,
        title: editDrawerForm.title.trim(),
        name: editDrawerForm.title.trim(),
        text: editDrawerForm.title.trim(),
        start_date: editDrawerForm.start_date,
        activity_date: editDrawerForm.start_date,
        end_date: editDrawerForm.end_date,
        due_date: editDrawerForm.end_date,
        progress_percent: numProg,
        status: isActivity ? actStatus : taskStatus,
        assignee_employee_ids: editDrawerForm.assignee_employee_ids,
        assignee_employee_id: editDrawerForm.assignee_employee_ids?.[0] || null,
        document_link: editDrawerForm.document_link,
        notes: editDrawerForm.notes,
        description: editDrawerForm.notes,
        raw_id: rawId,
        item_type: isActivity ? 'activity' : 'task',
        raw_item: {
          ...(selectedItem.raw_item || {}),
          title: editDrawerForm.title.trim(),
          name: editDrawerForm.title.trim(),
          start_date: editDrawerForm.start_date,
          end_date: editDrawerForm.end_date,
          due_date: editDrawerForm.end_date,
          progress_percent: numProg,
          status: isActivity ? actStatus : taskStatus,
        },
        ...(updatedServerItem || {}),
      };

      setSelectedItem(newSelectedItem);
      setEditDrawerForm({
        title: newSelectedItem.title,
        start_date: newSelectedItem.start_date || '',
        end_date: newSelectedItem.end_date || '',
        progress_percent: newSelectedItem.progress_percent || 0,
        status: newSelectedItem.status || 'planned',
        assignee_employee_ids: newSelectedItem.assignee_employee_ids || [],
        document_link: newSelectedItem.document_link || '',
        notes: newSelectedItem.notes || '',
      });

      setTasksList((prev) =>
        prev.map((t) => {
          const isMatch =
            String(t.id) === String(selectedItem.id) ||
            (rawId && (String(t.raw_id) === String(rawId) || String(t.id).includes(String(rawId))));
          return isMatch ? { ...t, ...newSelectedItem } : t;
        })
      );

      // Sinkronisasi ke ganttData agar timeline Gantt langsung terupdate
      setGanttData((prev) =>
        prev.map((g) => {
          const isMatch =
            String(g.id) === String(selectedItem.id) ||
            (rawId && (String(g.raw_id) === String(rawId) || String(g.id).includes(String(rawId))));
          return isMatch ? { ...g, ...newSelectedItem } : g;
        })
      );

      if (isActivity) {
        setProgramsList((prev) =>
          prev.map((prog) => ({
            ...prog,
            activities: (prog.activities || []).map((a) =>
              a.id === rawId ? { ...a, ...newSelectedItem } : a
            ),
          }))
        );
      }

      setIsEditingDrawerItem(false);
      setSelectedItem(null);
      await fetchTasksData();

      // Refresh Dashboard Stats
      const dashQuery =
        contextType === 'foundation'
          ? `/manajemen/dashboard/tasks-progress`
          : `/manajemen/dashboard/tasks-progress?school_unit_id=${selectedUnitId}`;
      api.get(dashQuery).then((r) => {
        if (r.data?.success && r.data.data) setDashboardStats(r.data.data);
      });
    } catch (err) {
      console.error('Failed to update task data from drawer:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan tugas.');
    } finally {
      setIsSavingDrawer(false);
    }
  };

  // Discussions State
  const [discussions, setDiscussions] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Sync active school unit
  useEffect(() => {
    if (activeSchoolUnit?.id) {
      setSelectedUnitId(activeSchoolUnit.id);
    }
  }, [activeSchoolUnit]);

  // 1. Fetch Dashboard Stats & Source Lists based on Academic Year & Context Level
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const unitQuery = contextType === 'school_unit' && selectedUnitId
        ? `school_unit_id=${selectedUnitId}`
        : `context=foundation`;

      const dashQuery = contextType === 'foundation'
        ? `/manajemen/dashboard/tasks-progress`
        : `/manajemen/dashboard/tasks-progress?school_unit_id=${selectedUnitId}`;

      const projsQuery = contextType === 'foundation'
        ? `/manajemen/projects`
        : `/manajemen/projects?school_unit_id=${selectedUnitId}`;

      const empQuery = contextType === 'school_unit' && selectedUnitId
        ? `/kepegawaian/employees?limit=100&school_unit_id=${selectedUnitId}`
        : `/kepegawaian/employees?limit=100`;

      const [dashRes, awpRes, projRes, empRes] = await Promise.all([
        api.get(dashQuery).catch(() => ({ data: { success: false } })),
        api.get(`/manajemen/annual-work-plans/current?${unitQuery}&academic_year=${encodeURIComponent(academicYear)}`).catch(() => ({ data: { success: false } })),
        api.get(projsQuery).catch(() => ({ data: { data: [] } })),
        api.get(empQuery).catch(() => ({ data: { data: { items: [] } } })),
      ]);

      if (dashRes.data?.success && dashRes.data.data) {
        setDashboardStats(dashRes.data.data);
      }

      if (awpRes.data?.success && awpRes.data.data?.id) {
        const awp = awpRes.data.data;
        setCurrentAwpId(awp.id);
        const matrixRes = await api.get(`/manajemen/annual-work-plans/${awp.id}/matrix`).catch(() => ({ data: { success: false } }));
        if (matrixRes.data?.success && matrixRes.data.data?.programs) {
          const rawProgs = matrixRes.data.data.programs || [];
          const mappedProgs = rawProgs.map((p) => ({
            id: p.program_id,
            code: p.program_code,
            name: p.program_name,
            category_name: p.category_name,
            domain_name: p.domain_name,
            is_flagship: p.is_flagship,
            activities: p.activities || [],
          }));
          setProgramsList(mappedProgs);
        } else {
          setProgramsList([]);
        }
      } else {
        setCurrentAwpId(null);
        setProgramsList([]);
      }

      if (projRes.data?.success) {
        const projs = projRes.data.data || [];
        setProjectsList(projs);
      }

      if (empRes.data?.success && empRes.data.data?.items) {
        setEmployees(empRes.data.data.items);
      }
    } catch (err) {
      console.error('Error loading initial Task Hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [contextType, selectedUnitId, academicYear]);

  // Persist Filter Selections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aldepos_task_hub_context_type', contextType);
    } catch {}
  }, [contextType]);

  useEffect(() => {
    if (selectedUnitId) {
      try {
        localStorage.setItem('aldepos_task_hub_unit_id', String(selectedUnitId));
      } catch {}
    }
  }, [selectedUnitId]);

  useEffect(() => {
    if (academicYear) {
      try {
        localStorage.setItem('aldepos_task_hub_academic_year', academicYear);
      } catch {}
    }
  }, [academicYear]);

  useEffect(() => {
    try {
      localStorage.setItem('aldepos_task_hub_context_source', contextSource);
    } catch {}
  }, [contextSource]);

  useEffect(() => {
    if (selectedProgramId !== undefined && selectedProgramId !== null) {
      try {
        localStorage.setItem('aldepos_task_hub_program_id', String(selectedProgramId));
      } catch {}
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (selectedProjectId !== undefined && selectedProjectId !== null) {
      try {
        localStorage.setItem('aldepos_task_hub_project_id', String(selectedProjectId));
      } catch {}
    }
  }, [selectedProjectId]);

  useEffect(() => {
    try {
      localStorage.setItem('aldepos_task_hub_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  // Helper: Pengelompokan Waktu Lokal Cerdas (Overdue, Hari Ini, Besok, Pekan Ini)
  const computeBucketsFromTasks = (items = []) => {
    const now = new Date();
    const toYMD = (d) => {
      if (!d) return null;
      const dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return null;
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = toYMD(now);
    const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrow = toYMD(tomorrowDate);

    const bucket = {
      overdue: [],
      today: [],
      tomorrow: [],
      this_week: [],
    };

    items.forEach((item) => {
      // Lewati tugas yang sudah berstatus selesai atau dibatalkan
      if (
        item.status === 'done' ||
        item.status === 'completed' ||
        item.status === 'cancelled' ||
        item.status === 'dibatalkan'
      ) {
        return;
      }

      const due = toYMD(item.due_date || item.end_date);
      const start = toYMD(item.start_date || item.activity_date);
      const effectiveDate = due || start;

      if (!effectiveDate) {
        bucket.this_week.push(item);
      } else if (effectiveDate < today) {
        bucket.overdue.push(item);
      } else if (effectiveDate === today || (start && start <= today && due && due >= today)) {
        bucket.today.push(item);
      } else if (effectiveDate === tomorrow) {
        bucket.tomorrow.push(item);
      } else {
        bucket.this_week.push(item);
      }
    });

    return bucket;
  };

  // 2. Fetch Tasks based on active view mode and context
  const fetchTasksData = async () => {
    try {
      if (viewMode === 'bucket') {
        const isProgSpecific = contextSource === 'program' && selectedProgramId && selectedProgramId !== 'all';
        const isProjSpecific = contextSource === 'project' && selectedProjectId && selectedProjectId !== 'all';

        const params = new URLSearchParams();
        if (contextType === 'school_unit' && selectedUnitId) {
          params.append('school_unit_id', selectedUnitId);
        } else {
          params.append('is_foundation', 'true');
        }
        if (academicYear) params.append('academic_year', academicYear);
        if (isProgSpecific) params.append('rips_program_id', selectedProgramId);
        if (isProjSpecific) params.append('project_id', selectedProjectId);

        const res = await api.get(`/manajemen/tasks/bucket?${params.toString()}`).catch(() => ({ data: { success: false } }));
        if (res.data?.success && res.data.data) {
          const enrichItem = (item) => {
            if (item.program_id || item.rips_program_id) {
              const pid = item.program_id || item.rips_program_id;
              const matchedProg = programsList.find((p) => String(p.id) === String(pid));
              if (matchedProg) {
                return { ...item, program_name: matchedProg.name, program_code: matchedProg.code };
              }
            }
            return item;
          };
          const b = res.data.data;
          const mappedOverdue = (b.overdue || []).map(enrichItem);
          const mappedToday = (b.today || []).map(enrichItem);
          const mappedTomorrow = (b.tomorrow || []).map(enrichItem);
          const mappedThisWeek = (b.this_week || []).map(enrichItem);

          setBucketData({
            overdue: mappedOverdue,
            today: mappedToday,
            tomorrow: mappedTomorrow,
            this_week: mappedThisWeek,
          });

          const allBucketItems = [
            ...mappedOverdue,
            ...mappedToday,
            ...mappedTomorrow,
            ...mappedThisWeek,
          ];
          if (allBucketItems.length > 0) {
            setTasksList(allBucketItems);
          }
        } else if (tasksList.length > 0) {
          setBucketData(computeBucketsFromTasks(tasksList));
        }
      } else if (viewMode === 'gantt') {
        const isProgSpecific = contextSource === 'program' && selectedProgramId && selectedProgramId !== 'all';
        const isProjSpecific = contextSource === 'project' && selectedProjectId && selectedProjectId !== 'all';

        const query = isProgSpecific
          ? `rips_program_id=${selectedProgramId}`
          : isProjSpecific
          ? `project_id=${selectedProjectId}`
          : contextType === 'foundation'
          ? `academic_year=${encodeURIComponent(academicYear)}`
          : `school_unit_id=${selectedUnitId}&academic_year=${encodeURIComponent(academicYear)}`;

        const res = await api.get(`/manajemen/tasks/gantt?${query}`).catch(() => ({ data: { success: false } }));
        if (res.data?.success && res.data.data && res.data.data.length > 0) {
          setGanttData(res.data.data);
        } else {
          // Fallback gantt data from tasksList dengan item_type eksplisit
          const ganttFallback = tasksList
            .filter((t) => t.start_date || t.due_date)
            .map((t) => ({
              id: t.id,
              raw_id: t.raw_id || t.id,
              item_type: t.item_type || (contextSource === 'program' ? 'activity' : 'task'),
              program_id: t.program_id,
              program_code: t.program_code,
              program_name: t.program_name,
              project_id: t.project_id,
              title: t.program_name ? `[${t.program_code || 'RKT'}] ${t.title}` : t.title,
              start_date: t.start_date || t.due_date,
              end_date: t.end_date || t.due_date,
              progress_percent: t.progress_percent || 0,
              status: t.status,
              assignee_employee_ids: t.assignee_employee_ids || (t.assignee_employee_id ? [t.assignee_employee_id] : []),
              assignee_employee_id: t.assignee_employee_id,
            }));
          setGanttData(ganttFallback);
        }
      } else {
        // List, Kanban, Calendar
        if (contextSource === 'program') {
          if (selectedProgramId && selectedProgramId !== 'all') {
            const selectedProg = programsList.find((p) => String(p.id) === String(selectedProgramId));
            const res = await api.get(`/manajemen/work-plan-activities?rips_program_id=${selectedProgramId}`);
            if (res.data?.success) {
              const mapped = (res.data.data || []).map((a) => ({
                id: a.id,
                raw_id: a.id,
                item_type: 'activity',
                program_id: selectedProgramId,
                program_name: selectedProg?.name || 'Program RKT',
                program_code: selectedProg?.code || '',
                title: a.title,
                due_date: a.end_date || a.start_date || a.activity_date,
                start_date: a.start_date || a.activity_date,
                end_date: a.end_date || a.start_date || a.activity_date,
                priority: 'medium',
                status: a.status === 'completed' ? 'done' : a.status,
                progress_percent: a.progress_percent,
                assignee_employee_id: a.assignee_employee_id,
                assignee_employee_ids: a.assignee_employee_ids,
                document_link: a.document_link,
                notes: a.notes,
                tag: a.tag,
              }));
              setTasksList(mapped);
            }
          } else {
            // TAMPILKAN SEMUA TUGAS DARI SELURUH PROGRAM RKT
            const allActivities = [];
            programsList.forEach((prog) => {
              if (Array.isArray(prog.activities) && prog.activities.length > 0) {
                prog.activities.forEach((a) => {
                  allActivities.push({
                    id: a.id,
                    raw_id: a.id,
                    item_type: 'activity',
                    program_id: prog.id,
                    program_name: prog.name,
                    program_code: prog.code,
                    title: a.title,
                    due_date: a.end_date || a.start_date || a.activity_date,
                    start_date: a.start_date || a.activity_date,
                    end_date: a.end_date || a.start_date || a.activity_date,
                    priority: 'medium',
                    status: a.status === 'completed' ? 'done' : a.status,
                    progress_percent: a.progress_percent,
                    assignee_employee_id: a.assignee_employee_id,
                    assignee_employee_ids: a.assignee_employee_ids,
                    document_link: a.document_link,
                    notes: a.notes,
                    tag: a.tag,
                  });
                });
              }
            });
            setTasksList(allActivities);
          }
        } else if (contextSource === 'project') {
          if (selectedProjectId && selectedProjectId !== 'all') {
            const selectedProj = projectsList.find((pr) => String(pr.id) === String(selectedProjectId));
            const res = await api.get(`/manajemen/tasks?project_id=${selectedProjectId}`);
            if (res.data?.success) {
              const mapped = (res.data.data || []).map((t) => ({
                id: t.id,
                raw_id: t.id,
                item_type: 'task',
                project_id: selectedProjectId,
                program_name: selectedProj?.name || 'Proyek Generik',
                program_code: 'PROYEK',
                title: t.title,
                due_date: t.due_date,
                start_date: t.start_date,
                end_date: t.due_date,
                priority: t.priority,
                status: t.status,
                progress_percent: t.progress_percent,
                assignee_employee_id: t.assignee_employee_id,
                document_link: t.document_link,
                notes: t.notes || t.description,
              }));
              setTasksList(mapped);
            }
          } else {
            const unitQuery = contextType === 'foundation'
              ? `/manajemen/tasks`
              : `/manajemen/tasks?school_unit_id=${selectedUnitId}`;
            const res = await api.get(unitQuery);
            if (res.data?.success) {
              const mapped = (res.data.data || []).map((t) => {
                const matchedProj = projectsList.find((pr) => String(pr.id) === String(t.project_id));
                return {
                  id: t.id,
                  raw_id: t.id,
                  item_type: 'task',
                  project_id: t.project_id,
                  program_name: matchedProj?.name || (t.project_id ? `Proyek #${t.project_id}` : 'Tugas Mandiri'),
                  program_code: 'PROYEK',
                  title: t.title,
                  due_date: t.due_date,
                  start_date: t.start_date,
                  end_date: t.due_date,
                  priority: t.priority,
                  status: t.status,
                  progress_percent: t.progress_percent,
                  assignee_employee_id: t.assignee_employee_id,
                  document_link: t.document_link,
                  notes: t.notes || t.description,
                };
              });
              setTasksList(mapped);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching tasks for view:', err);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [viewMode, contextSource, selectedProgramId, selectedProjectId, selectedUnitId, contextType, academicYear, programsList.length, projectsList.length]);

  // 3. Fetch Discussions for Program
  const fetchDiscussions = async () => {
    if (contextSource !== 'program' || !selectedProgramId || selectedProgramId === 'all') {
      setDiscussions([]);
      return;
    }
    try {
      const res = await api.get(`/manajemen/program-discussions?rips_program_id=${selectedProgramId}`);
      if (res.data?.success) {
        setDiscussions(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading discussions:', err);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, [selectedProgramId, contextSource]);

  // Handle Send Chat
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedProgramId || selectedProgramId === 'all') return;
    try {
      setChatLoading(true);
      await api.post('/manajemen/program-discussions', {
        rips_program_id: Number(selectedProgramId),
        message: chatMessage.trim(),
      });
      setChatMessage('');
      fetchDiscussions();
    } catch (err) {
      alert('Gagal mengirim pesan');
    } finally {
      setChatLoading(false);
    }
  };

  // Drag and Drop Status Update for Kanban
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('application/json');
      if (!rawData) return;
      const item = JSON.parse(rawData);

      const isDone = newStatus === 'done' || newStatus === 'completed';
      const isCancelled = newStatus === 'cancelled' || newStatus === 'dibatalkan';
      const uiStatus = isDone ? 'done' : (isCancelled ? 'cancelled' : newStatus);
      const nextProg = isDone ? 100 : (item.progress_percent || 0);

      // Optimistic update
      setTasksList((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, status: uiStatus, progress_percent: nextProg } : t))
      );
      setGanttData((prev) =>
        prev.map((g) => (String(g.id) === String(item.id) || (item.raw_id && String(g.raw_id) === String(item.raw_id)) ? { ...g, status: uiStatus, progress_percent: nextProg } : g))
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => ({ ...prev, status: uiStatus, progress_percent: nextProg }));
      }

      // Backend API sync & in-memory programsList sync
      if (item.item_type === 'activity') {
        const actStatus = isDone ? 'completed' : (isCancelled ? 'cancelled' : newStatus);
        setProgramsList((prev) =>
          prev.map((prog) => ({
            ...prog,
            activities: (prog.activities || []).map((a) =>
              a.id === item.raw_id ? { ...a, status: actStatus, progress_percent: nextProg } : a
            ),
          }))
        );
        await api.put(`/manajemen/work-plan-activities/${item.raw_id}`, {
          status: actStatus,
          progress_percent: nextProg,
        });
      } else {
        const taskStatus = isDone ? 'done' : (isCancelled ? 'cancelled' : newStatus);
        await api.patch(`/manajemen/tasks/${item.raw_id}/status`, { status: taskStatus });
      }

      // Refresh stats
      const dashQuery = contextType === 'foundation'
        ? `/manajemen/dashboard/tasks-progress`
        : `/manajemen/dashboard/tasks-progress?school_unit_id=${selectedUnitId}`;
      api.get(dashQuery).then((r) => {
        if (r.data?.success && r.data.data) setDashboardStats(r.data.data);
      });
    } catch (err) {
      console.error('Drag drop status update failed:', err);
      fetchTasksData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Fast Update Status from Detail Drawer
  const handleUpdateStatus = async (item, newStatus) => {
    if (!item) return;
    try {
      const isDone = newStatus === 'done' || newStatus === 'completed';
      const isCancelled = newStatus === 'cancelled' || newStatus === 'dibatalkan';
      const uiStatus = isDone ? 'done' : (isCancelled ? 'cancelled' : newStatus);
      const nextProg = isDone ? 100 : (item.progress_percent || 0);

      // 1. Optimistic update tasksList & ganttData
      setTasksList((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, status: uiStatus, progress_percent: nextProg } : t))
      );
      setGanttData((prev) =>
        prev.map((g) => (String(g.id) === String(item.id) || (item.raw_id && String(g.raw_id) === String(item.raw_id)) ? { ...g, status: uiStatus, progress_percent: nextProg } : g))
      );

      // 2. Optimistic update selectedItem
      setSelectedItem((prev) => (prev ? { ...prev, status: uiStatus, progress_percent: nextProg } : null));

      // 3. Backend API sync & programsList in-memory sync
      if (item.item_type === 'activity') {
        const actStatus = isDone ? 'completed' : (isCancelled ? 'cancelled' : newStatus);
        setProgramsList((prev) =>
          prev.map((prog) => ({
            ...prog,
            activities: (prog.activities || []).map((a) =>
              a.id === item.raw_id ? { ...a, status: actStatus, progress_percent: nextProg } : a
            ),
          }))
        );
        await api.put(`/manajemen/work-plan-activities/${item.raw_id}`, {
          status: actStatus,
          progress_percent: nextProg,
        });
      } else {
        const taskStatus = isDone ? 'done' : (isCancelled ? 'cancelled' : newStatus);
        await api.put(`/manajemen/tasks/${item.raw_id}`, {
          status: taskStatus,
          progress_percent: nextProg,
        });
      }

      // 4. Refresh Dashboard Stats
      const dashQuery = contextType === 'foundation'
        ? `/manajemen/dashboard/tasks-progress`
        : `/manajemen/dashboard/tasks-progress?school_unit_id=${selectedUnitId}`;
      api.get(dashQuery).then((r) => {
        if (r.data?.success && r.data.data) setDashboardStats(r.data.data);
      });
    } catch (err) {
      alert('Gagal mengubah status');
    }
  };

  // Update Item Progress Slider
  const handleUpdateProgress = async (item, progress) => {
    if (!item) return;
    try {
      const numProg = Number(progress);
      const isDone = numProg === 100;
      const uiStatus = isDone ? 'done' : (numProg > 0 ? 'in_progress' : (item.item_type === 'activity' ? 'planned' : 'todo'));
      const actStatus = isDone ? 'completed' : (numProg > 0 ? 'in_progress' : 'planned');
      const taskStatus = isDone ? 'done' : (numProg > 0 ? 'in_progress' : 'todo');

      // 1. Optimistic update tasksList & ganttData
      setTasksList((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, progress_percent: numProg, status: uiStatus } : t))
      );
      setGanttData((prev) =>
        prev.map((g) => (String(g.id) === String(item.id) || (item.raw_id && String(g.raw_id) === String(item.raw_id)) ? { ...g, progress_percent: numProg, status: uiStatus } : g))
      );

      // 2. Optimistic update selectedItem
      setSelectedItem((prev) => (prev ? { ...prev, progress_percent: numProg, status: uiStatus } : null));

      // 3. Backend API sync & programsList in-memory sync
      if (item.item_type === 'activity') {
        setProgramsList((prev) =>
          prev.map((prog) => ({
            ...prog,
            activities: (prog.activities || []).map((a) =>
              a.id === item.raw_id ? { ...a, progress_percent: numProg, status: actStatus } : a
            ),
          }))
        );
        await api.put(`/manajemen/work-plan-activities/${item.raw_id}`, {
          progress_percent: numProg,
          status: actStatus,
        });
      } else {
        await api.put(`/manajemen/tasks/${item.raw_id}`, {
          progress_percent: numProg,
          status: taskStatus,
        });
      }

      // 4. Refresh Dashboard Stats
      const dashQuery = contextType === 'foundation'
        ? `/manajemen/dashboard/tasks-progress`
        : `/manajemen/dashboard/tasks-progress?school_unit_id=${selectedUnitId}`;
      api.get(dashQuery).then((r) => {
        if (r.data?.success && r.data.data) setDashboardStats(r.data.data);
      });
    } catch (err) {
      alert('Gagal memperbarui progres');
    }
  };

  // Handler Sinkronisasi Jadwal Timeline Gantt (Drag, Resize, Update Progres)
  const handleGanttScheduleChange = (updatedItem) => {
    if (!updatedItem) return;

    // 1. Sinkronisasi state ganttData
    setGanttData((prev) =>
      prev.map((g) => (String(g.id) === String(updatedItem.id) ? { ...g, ...updatedItem } : g))
    );

    // 2. Sinkronisasi state tasksList
    setTasksList((prev) =>
      prev.map((t) =>
        String(t.id) === String(updatedItem.id) || (updatedItem.raw_id && String(t.raw_id) === String(updatedItem.raw_id))
          ? {
              ...t,
              ...updatedItem,
              start_date: updatedItem.start_date,
              end_date: updatedItem.end_date,
              due_date: updatedItem.end_date || updatedItem.due_date,
            }
          : t
      )
    );

    // 3. Sinkronisasi selectedItem jika sedang terbuka di Drawer
    if (
      selectedItem &&
      (String(selectedItem.id) === String(updatedItem.id) ||
        (updatedItem.raw_id && String(selectedItem.raw_id) === String(updatedItem.raw_id)))
    ) {
      setSelectedItem((prev) => ({
        ...prev,
        ...updatedItem,
        start_date: updatedItem.start_date,
        end_date: updatedItem.end_date,
        due_date: updatedItem.end_date || updatedItem.due_date,
      }));
    }

    // 4. Sinkronisasi programsList kegiatan in-memory jika item_type === 'activity'
    if (updatedItem.item_type === 'activity') {
      setProgramsList((prev) =>
        prev.map((prog) => ({
          ...prog,
          activities: (prog.activities || []).map((a) =>
            String(a.id) === String(updatedItem.raw_id || updatedItem.id)
              ? {
                  ...a,
                  start_date: updatedItem.start_date,
                  end_date: updatedItem.end_date,
                  progress_percent: updatedItem.progress_percent,
                  status: updatedItem.status || a.status,
                }
              : a
          ),
        }))
      );
    }
  };

  // Active Context Labels
  const selectedUnit = schoolUnits?.find((u) => u.id === Number(selectedUnitId));
  const currentLevelLabel = contextType === 'foundation'
    ? 'Tingkat Yayasan (Gabungan)'
    : (selectedUnit ? `${selectedUnit.name} (${selectedUnit.level})` : 'Satuan Pendidikan');

  const activeProgram = selectedProgramId === 'all'
    ? { name: 'Semua Program RKT (Gabungan)' }
    : programsList.find((p) => String(p.id) === String(selectedProgramId));

  const activeProject = selectedProjectId === 'all'
    ? { name: 'Semua Proyek Generik (Gabungan)' }
    : projectsList.find((p) => String(p.id) === String(selectedProjectId));

  // MODAL: TAMBAH TUGAS / AKTIVITAS BARU (Rendered via React Portal)
  const renderCreateTaskModal = () => {
    if (!isCreateModalOpen) return null;
    const modalContent = (
      <div
        data-theme={theme}
        data-manajemen-root=""
        className="fixed inset-0 z-[100000] !m-0 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn text-left mj-modal-backdrop"
        style={{
          margin: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(2, 6, 23, 0.75)' : 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className={`border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}>
          {/* Modal Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDark
              ? 'border-slate-800 bg-slate-950/60'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark
                  ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-600'
              }`}>
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tambah Langkah Tugas Kegiatan / Aktivitas Baru</h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tambahkan langkah tugas atau kegiatan operasional ke dalam program &amp; timeline Gantt</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body / Form */}
          <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Tipe Sumber Switcher: Aktivitas RKT vs Tugas Proyek */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tipe Tugas / Aktivitas</label>
              <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setCreateForm((prev) => ({ ...prev, source_type: 'activity' }))}
                  className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    createForm.source_type === 'activity'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-inherit" />
                  <span>Aktivitas Program RKT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm((prev) => ({ ...prev, source_type: 'task' }))}
                  className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    createForm.source_type === 'task'
                      ? 'bg-indigo-600 text-white shadow-md shadow-violet-600/30'
                      : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 text-inherit" />
                  <span>Tugas Proyek Generik</span>
                </button>
              </div>
            </div>

            {/* Target Program / Target Project Dropdown */}
            {createForm.source_type === 'activity' ? (
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Program RKT Tujuan <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={createForm.program_id}
                  onChange={(val) => setCreateForm((prev) => ({ ...prev, program_id: val }))}
                  options={programsList.map((p) => ({
                    value: p.id,
                    label: `${p.code || ''} - ${p.name || ''}`,
                    badge: p.is_flagship ? '⭐ Unggulan' : null,
                    sublabel: p.category_name || (p.domain_name ? `Bidang: ${p.domain_name}` : null),
                  }))}
                  placeholder="-- Pilih Program RKT --"
                  searchPlaceholder="Cari Program RKT..."
                  className="w-full"
                  allowClear={false}
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Proyek Tujuan <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={createForm.project_id}
                  onChange={(val) => setCreateForm((prev) => ({ ...prev, project_id: val }))}
                  options={projectsList.map((pr) => ({
                    value: pr.id,
                    label: pr.name || `Proyek #${pr.id}`,
                    badge: pr.status?.toUpperCase(),
                    badgeClass: pr.status === 'in_progress' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300',
                  }))}
                  placeholder="-- Pilih Proyek --"
                  searchPlaceholder="Cari Proyek..."
                  className="w-full"
                  allowClear={false}
                  required
                />
              </div>
            )}

            {/* Judul Langkah Kegiatan / Tugas */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Judul Langkah Kegiatan / Tugas <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Contoh: Rapat Koordinasi Panitia, Penyusunan Dokumen..."
                required
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Tag / Tipe & Status Pelaksanaan Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tag / Tipe</label>
                <SearchableSelect
                  value={createForm.tag || 'kegiatan_utama'}
                  onChange={(val) => setCreateForm((prev) => ({ ...prev, tag: val }))}
                  options={tagOptions}
                  placeholder="Pilih Tag / Tipe"
                  searchPlaceholder="Cari tipe/tag..."
                  allowClear={false}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Status Pelaksanaan</label>
                <SearchableSelect
                  value={createForm.status || 'planned'}
                  onChange={(val) => setCreateForm((prev) => ({ ...prev, status: val }))}
                  options={statusOptions}
                  placeholder="Pilih Status"
                  searchPlaceholder="Cari status..."
                  allowClear={false}
                  className="w-full"
                />
              </div>
            </div>

            {/* Pilihan Jadwal Tanggal: 1 Hari vs Rentang Waktu */}
            <div className={`space-y-2 p-3.5 border rounded-xl ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100/90 border-slate-200'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className={`text-xs font-extrabold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Jadwal Pelaksanaan Tugas
                </label>
                <div className={`inline-flex rounded-xl p-0.5 border text-[11px] font-semibold ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/90 border-slate-300'
                }`}>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm((prev) => ({
                        ...prev,
                        date_mode: 'single',
                        end_date: prev.start_date || prev.activity_date || '',
                      }))
                    }
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      createForm.date_mode !== 'range'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 1 Hari (Spesifik)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm((prev) => ({ ...prev, date_mode: 'range' }))}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      createForm.date_mode === 'range'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗓️ Rentang Waktu (Mulai - Selesai)
                  </button>
                </div>
              </div>

              {createForm.date_mode === 'range' ? (
                <div className="pt-1">
                  <label className={`block text-[11px] font-extrabold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Rentang Waktu Pelaksanaan (Mulai s.d Selesai)
                  </label>
                  <DatePickerField
                    mode="range"
                    startDate={createForm.start_date || createForm.activity_date || ''}
                    endDate={createForm.end_date || ''}
                    onRangeChange={({ startDate, endDate }) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        start_date: startDate,
                        end_date: endDate,
                        activity_date: startDate,
                      }))
                    }
                    placeholder="Pilih rentang tanggal mulai - selesai..."
                  />
                </div>
              ) : (
                <div>
                  <label className={`block text-[11px] font-extrabold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tanggal Pelaksanaan (DD/MM/YY)
                  </label>
                  <DatePickerField
                    mode="single"
                    value={createForm.start_date || createForm.activity_date || ''}
                    onChange={(iso) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        start_date: iso,
                        end_date: iso,
                        activity_date: iso,
                      }))
                    }
                    placeholder="DD/MM/YY"
                  />
                </div>
              )}
            </div>

            {/* Penanggung Jawab (PIC Pegawai - Multi-Select) */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Penanggung Jawab (PIC Pegawai - Bisa &gt; 1 Orang)
              </label>
              <SearchableSelect
                value={createForm.assignee_employee_ids || []}
                onChange={(val) => setCreateForm((prev) => ({ ...prev, assignee_employee_ids: val }))}
                options={employeeOptions}
                placeholder="-- Pilih 1 atau Lebih Pegawai Pelaksana --"
                searchPlaceholder="Ketik nama atau NIP pegawai..."
                isMulti={true}
                allowClear={true}
                className="w-full"
              />
            </div>

            {/* Progres (%) & Tautan Bukti / Dokumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Progres (%)
                  </span>
                  <span className={`font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{createForm.progress_percent || 0}%</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={createForm.progress_percent !== undefined ? createForm.progress_percent : 0}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, progress_percent: Number(e.target.value) }))
                  }
                  className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-bold ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Tautan Bukti / Dokumen
                </label>
                <input
                  type="text"
                  value={createForm.document_link || ''}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, document_link: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-medium ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Catatan Tambahan
              </label>
              <textarea
                rows={2}
                value={createForm.notes || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Detail instruksi atau kendala pelaksanaan..."
                className={`w-full border rounded-xl p-3 text-xs outline-none focus:border-indigo-500 resize-none font-medium ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Modal Footer Actions */}
            <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                }`}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingCreate || !createForm.title.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingCreate ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span className="text-white">Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white stroke-[2.5]" />
                    <span className="text-white">Simpan Tugas / Langkah Kegiatan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
    const portalTarget =
      (typeof document !== 'undefined' && document.fullscreenElement) ||
      (typeof document !== 'undefined' ? document.body : null);
    return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
  };

  // Reorder Tasks Drag & Drop Handler (Gantt Table)
  const handleTaskReorder = (sourceId, targetId, mode) => {
    setTasksList((prevList) => {
      const sourceIndex = prevList.findIndex(
        (t) => String(t.id) === String(sourceId) || String(t.raw_id) === String(sourceId)
      );
      const targetIndex = prevList.findIndex(
        (t) => String(t.id) === String(targetId) || String(t.raw_id) === String(targetId)
      );
      if (sourceIndex === -1 || targetIndex === -1) return prevList;

      const newList = [...prevList];
      const [movedItem] = newList.splice(sourceIndex, 1);
      const insertIndex = mode === 'before' ? targetIndex : targetIndex + 1;
      newList.splice(insertIndex, 0, movedItem);
      return newList;
    });
  };

  // MODAL: DETAIL & EDIT TUGAS / AKTIVITAS (Popup Modal Window via Portal)
  const renderDetailModal = () => {
    if (!selectedItem) return null;
    const isActivity =
      selectedItem.item_type === 'activity' ||
      Boolean(selectedItem.program_id && !selectedItem.project_id);

    const modalContent = (
      <div
        data-theme={theme}
        data-manajemen-root=""
        className="fixed inset-0 z-[100000] !m-0 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn text-left mj-modal-backdrop"
        style={{
          margin: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(2, 6, 23, 0.75)' : 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div
          className={`border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-white'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
          }`}
        >
          {/* Modal Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                  isDark
                    ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Detail &amp; Edit Tugas / Aktivitas
                </h3>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isActivity ? 'Aktivitas Program RKT' : 'Tugas Proyek Generik'} &bull; ID #{selectedItem.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body / Form */}
          <form onSubmit={handleSaveDrawerEdit} className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Program / Proyek Terkait Info */}
            {selectedItem.program_name && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                  isDark
                    ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-extrabold block text-indigo-400 dark:text-indigo-300">
                    {isActivity ? 'Program RKT Induk' : 'Proyek Terkait'}
                  </span>
                  <span className="font-bold text-xs truncate block">
                    {selectedItem.program_code ? `[${selectedItem.program_code}] ` : ''}
                    {selectedItem.program_name}
                  </span>
                </div>
              </div>
            )}

            {/* Judul Langkah Kegiatan / Tugas */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Judul Langkah Kegiatan / Tugas <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editDrawerForm.title}
                onChange={(e) => setEditDrawerForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Judul langkah kegiatan atau tugas..."
                required
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-medium ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Status Pelaksanaan Selector (4 Pilihan Tombol Modern) */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Status Pelaksanaan
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: isActivity ? 'planned' : 'todo', label: 'Planned' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: isActivity ? 'completed' : 'done', label: 'Done' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map((st) => {
                  const isCurrentActive =
                    editDrawerForm.status === st.id ||
                    (st.id === 'planned' && editDrawerForm.status === 'todo') ||
                    ((st.id === 'done' || st.id === 'completed') && (editDrawerForm.status === 'done' || editDrawerForm.status === 'completed')) ||
                    (st.id === 'cancelled' && (editDrawerForm.status === 'cancelled' || editDrawerForm.status === 'dibatalkan'));

                  let activeClass = 'bg-slate-700 text-white shadow-md ring-2 ring-slate-400';
                  if (st.id === 'in_progress') activeClass = 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400';
                  if (st.id === 'done' || st.id === 'completed') activeClass = 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400';
                  if (st.id === 'cancelled') activeClass = 'bg-rose-700 text-white shadow-md ring-2 ring-rose-400';

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        const nextProg = (st.id === 'done' || st.id === 'completed') ? 100 : (editDrawerForm.progress_percent || 0);
                        setEditDrawerForm((prev) => ({ ...prev, status: st.id, progress_percent: nextProg }));
                      }}
                      className={`py-2 px-1 rounded-xl font-bold text-xs transition cursor-pointer text-center truncate ${
                        isCurrentActive
                          ? activeClass
                          : isDark
                          ? 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Jadwal Tanggal: 1 Hari vs Rentang Waktu */}
            <div
              className={`space-y-2 p-3.5 border rounded-xl ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100/90 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className={`text-xs font-extrabold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Jadwal Pelaksanaan Tugas
                </label>
                <div
                  className={`inline-flex rounded-xl p-0.5 border text-[11px] font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/90 border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setEditDrawerForm((prev) => ({
                        ...prev,
                        date_mode: 'single',
                        end_date: prev.start_date || '',
                      }))
                    }
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      editDrawerForm.date_mode !== 'range'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 1 Hari (Spesifik)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDrawerForm((prev) => ({ ...prev, date_mode: 'range' }))}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                      editDrawerForm.date_mode === 'range'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗓️ Rentang Waktu (Mulai - Selesai)
                  </button>
                </div>
              </div>

              {editDrawerForm.date_mode === 'range' ? (
                <div className="pt-1">
                  <label className={`block text-[11px] font-extrabold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Rentang Waktu Pelaksanaan (Mulai s.d Selesai)
                  </label>
                  <DatePickerField
                    mode="range"
                    startDate={editDrawerForm.start_date || ''}
                    endDate={editDrawerForm.end_date || ''}
                    onRangeChange={({ startDate, endDate }) =>
                      setEditDrawerForm((prev) => ({
                        ...prev,
                        start_date: startDate,
                        end_date: endDate,
                      }))
                    }
                    placeholder="Pilih rentang tanggal mulai - selesai..."
                  />
                </div>
              ) : (
                <div>
                  <label className={`block text-[11px] font-extrabold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tanggal Pelaksanaan (DD/MM/YY)
                  </label>
                  <DatePickerField
                    mode="single"
                    value={editDrawerForm.start_date || ''}
                    onChange={(iso) =>
                      setEditDrawerForm((prev) => ({
                        ...prev,
                        start_date: iso,
                        end_date: iso,
                      }))
                    }
                    placeholder="DD/MM/YY"
                  />
                </div>
              )}
            </div>

            {/* Penanggung Jawab (PIC Pegawai - Multi-Select) */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Penanggung Jawab (PIC Pegawai - Bisa &gt; 1 Orang)
              </label>
              <SearchableSelect
                value={editDrawerForm.assignee_employee_ids || []}
                onChange={(val) => setEditDrawerForm((prev) => ({ ...prev, assignee_employee_ids: val }))}
                options={employeeOptions}
                placeholder="-- Pilih 1 atau Lebih Pegawai Pelaksana --"
                searchPlaceholder="Ketik nama atau NIP pegawai..."
                isMulti={true}
                allowClear={true}
                className="w-full"
              />
            </div>

            {/* Progres Capaian (%) & Slider */}
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  <Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Progress Capaian:
                </span>
                <span className={`font-extrabold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  {editDrawerForm.progress_percent || 0}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={editDrawerForm.progress_percent || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const isDone = val === 100;
                  const nextStatus = isDone
                    ? (isActivity ? 'completed' : 'done')
                    : val > 0
                    ? 'in_progress'
                    : (isActivity ? 'planned' : 'todo');
                  setEditDrawerForm((prev) => ({ ...prev, progress_percent: val, status: nextStatus }));
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Tautan Bukti Dokumen (URL) */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Tautan Bukti Dokumen / Laporan (Opsional)
              </label>
              <input
                type="url"
                value={editDrawerForm.document_link || ''}
                onChange={(e) => setEditDrawerForm((prev) => ({ ...prev, document_link: e.target.value }))}
                placeholder="https://drive.google.com/... atau link dokumen"
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-medium ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Catatan / Keterangan Pelaksanaan */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Catatan / Deskripsi Pelaksanaan
              </label>
              <textarea
                rows={3}
                value={editDrawerForm.notes || ''}
                onChange={(e) => setEditDrawerForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Tambahkan catatan atau deskripsi pelaksanaan..."
                className={`w-full border rounded-xl p-3 text-xs outline-none focus:border-indigo-500 transition resize-none font-medium ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Modal Actions Footer */}
            <div
              className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                disabled={isSavingDrawer}
                className={`px-4 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSavingDrawer}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold transition text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSavingDrawer ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
    const portalTarget =
      (typeof document !== 'undefined' && document.fullscreenElement) ||
      (typeof document !== 'undefined' ? document.body : null);
    return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
  };

  return (
    <div className="space-y-6 pb-16 mj-animate-fade-in">
      {/* 0. HEADER CONTEXT BANNER & ACADEMIC YEAR SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50 shrink-0">
            <Kanban className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Hub Tugas &amp; Proyek</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold mj-badge-primary">
                {currentLevelLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold mj-badge-sky">
                TA {academicYear}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Pemantauan pelaksanaan tugas operasional RKT, Kanban board, timeline Gantt, dan ruang koordinasi diskusi
            </p>
          </div>
        </div>

        {/* Level Context & Academic Year Switchers */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Switcher Yayasan vs Satuan Pendidikan */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setContextType('foundation')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contextType === 'foundation'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Yayasan
            </button>
            <button
              onClick={() => setContextType('school_unit')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contextType === 'school_unit'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              Satuan Pendidikan
            </button>
          </div>

          {/* School Unit Selector */}
          {contextType === 'school_unit' && (
            <SearchableSelect
              value={selectedUnitId}
              onChange={(val) => setSelectedUnitId(Number(val))}
              className="w-56"
              options={schoolUnits?.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.level})`,
              })) || []}
            />
          )}

          {/* Academic Year Selector */}
          <SearchableSelect
            value={academicYear}
            onChange={(val) => setAcademicYear(val)}
            className="w-36"
            options={[
              { value: '2025/2026', label: '2025/2026' },
              { value: '2026/2027', label: '2026/2027' },
              { value: '2027/2028', label: '2027/2028' },
              { value: '2028/2029', label: '2028/2029' },
              { value: '2029/2030', label: '2029/2030' },
              { value: '2030/2031', label: '2030/2031' },
            ]}
          />
        </div>
      </div>

      {/* 1. TOP EXECUTIVE DASHBOARD CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3 mj-summary-card mj-stagger-1"
          style={{ borderTop: '3px solid var(--mj-primary)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Total Tugas/Kegiatan</span>
            <p className="text-xl font-bold text-white tracking-tight">{dashboardStats.total_tasks}</p>
          </div>
        </div>

        <div
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3 mj-summary-card mj-stagger-2"
          style={{ borderTop: '3px solid var(--mj-done)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Tuntas Selesai</span>
            <p className="text-xl font-bold text-emerald-400 tracking-tight">{dashboardStats.completed_tasks}</p>
          </div>
        </div>

        <div
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3 mj-summary-card mj-stagger-3"
          style={{ borderTop: '3px solid var(--mj-progress)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Sedang Berjalan</span>
            <p className="text-xl font-bold text-amber-300 tracking-tight">{dashboardStats.in_progress_tasks}</p>
          </div>
        </div>

        <div
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3 mj-summary-card mj-stagger-4"
          style={{ borderTop: '3px solid var(--mj-risk)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium">Terlambat (Overdue)</span>
            <p className="text-xl font-bold text-rose-400 tracking-tight">{dashboardStats.overdue_tasks}</p>
          </div>
        </div>

        <div
          className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center gap-3 mj-summary-card mj-stagger-5"
          style={{ borderTop: '3px solid var(--mj-sky)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Rata-rata Progres</span>
              <span className="text-xs font-bold text-indigo-300">{dashboardStats.avg_progress_percent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full rounded-full"
                style={{ width: `${dashboardStats.avg_progress_percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTEXT SELECTOR & VIEW MODE TOGGLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Source Switcher & Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setContextSource('program')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                contextSource === 'program'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Program RKT
            </button>
            <button
              onClick={() => setContextSource('project')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                contextSource === 'project'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Proyek Generik
            </button>
          </div>

          {contextSource === 'program' ? (
            <div className="w-72 sm:w-96">
              <SearchableSelect
                value={selectedProgramId}
                onChange={(val) => setSelectedProgramId(val || 'all')}
                options={programOptions}
                placeholder="-- Pilih Program RKT --"
                searchPlaceholder="Ketik kode atau nama program..."
                allowClear={true}
              />
            </div>
          ) : (
            <div className="w-72 sm:w-96">
              <SearchableSelect
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val || 'all')}
                options={projectOptions}
                placeholder="-- Pilih Proyek Generik --"
                searchPlaceholder="Ketik nama proyek..."
                allowClear={true}
              />
            </div>
          )}
        </div>

        {/* Right Action: View Mode Toggle & Tambah Tugas Button */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* View Mode Toggle */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border overflow-x-auto ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban ({tasksList.length})
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List ({tasksList.length})
            </button>
            <button
              onClick={() => setViewMode('bucket')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'bucket'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              Bucket Waktu
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'gantt'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Gantt Timeline
            </button>
          </div>

          {/* Tombol Tambah Tugas / Aktivitas Global */}
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:shadow-lg transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tugas / Aktivitas</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE + RIGHT DETAIL/DISCUSSION DRAWER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT / CENTER VIEW CANVAS (Spans 2 cols when drawer open, 3 cols when closed) */}
        <div className={`${selectedItem ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4 transition-all duration-300`}>
          {/* VIEW: KANBAN BOARD (4 Kolom Status) */}
          {viewMode === 'kanban' && (
            <div className={`grid grid-cols-1 ${selectedItem ? 'md:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-4'} gap-4`}>
              {/* Column Planned / Todo */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'planned')}
                className={`border rounded-xl p-4 flex flex-col justify-between min-h-[400px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="space-y-3">
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-800'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Direncanakan ({tasksList.filter((t) => t.status === 'planned' || t.status === 'todo').length})
                    </span>
                    <button
                      onClick={() => openCreateModal(null, null, 'planned')}
                      title="Tambah Tugas Direncanakan"
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {tasksList.filter((t) => t.status === 'planned' || t.status === 'todo').length === 0 ? (
                      <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                        isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}>
                        <p className="text-xs font-semibold">Belum ada tugas di kolom ini</p>
                        <p className="text-[10px]">Tarik tugas ke sini atau klik tombol tambah</p>
                      </div>
                    ) : (
                      tasksList.filter((t) => t.status === 'planned' || t.status === 'todo').map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => setSelectedItem(item)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 shadow-xs ${
                            isDark
                              ? 'bg-slate-950 hover:border-indigo-500/50 border-slate-800/80'
                              : 'bg-slate-50 hover:border-indigo-500/50 border-slate-200'
                          } ${
                            selectedItem?.id === item.id ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-950/30' : ''
                          }`}
                        >
                          {/* Program Name Badge */}
                          {item.program_name && (
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                isDark
                                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                <Layers className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                                <span className="truncate">{item.program_code ? `[${item.program_code}] ` : ''}{item.program_name}</span>
                              </span>
                            </div>
                          )}

                          <h4 className={`text-xs font-bold line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>

                          {/* PIC Employee */}
                          {(() => {
                            let empIds = [];
                            if (Array.isArray(item.assignee_employee_ids) && item.assignee_employee_ids.length > 0) {
                              empIds = item.assignee_employee_ids;
                            } else if (item.assignee_employee_id) {
                              empIds = [item.assignee_employee_id];
                            }
                            if (empIds.length === 0) return null;
                            const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);
                            if (matchedEmps.length === 0) return null;
                            return (
                              <div className={`flex items-center gap-1 text-[10.5px] pt-0.5 truncate font-medium ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                <User className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                              </div>
                            );
                          })()}

                          <div className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                            isDark ? 'border-slate-900 text-slate-400' : 'border-slate-200 text-slate-500'
                          }`}>
                            <span>{item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : '-'}</span>
                            <span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{item.progress_percent || 0}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Add Button Planned */}
                <button
                  onClick={() => openCreateModal(null, null, 'planned')}
                  className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                    isDark
                      ? 'border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400'
                      : 'border-slate-300 hover:border-indigo-500/60 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas / Aktivitas</span>
                </button>
              </div>

              {/* Column In Progress */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'in_progress')}
                className={`border rounded-xl p-4 flex flex-col justify-between min-h-[400px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="space-y-3">
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                      isDark ? 'text-amber-300' : 'text-amber-700'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Sedang Berjalan ({tasksList.filter((t) => t.status === 'in_progress').length})
                    </span>
                    <button
                      onClick={() => openCreateModal(null, null, 'in_progress')}
                      title="Tambah Tugas Sedang Berjalan"
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {tasksList.filter((t) => t.status === 'in_progress').length === 0 ? (
                      <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                        isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}>
                        <p className="text-xs font-semibold">Belum ada tugas di kolom ini</p>
                        <p className="text-[10px]">Tarik tugas ke sini saat mulai dikerjakan</p>
                      </div>
                    ) : (
                      tasksList.filter((t) => t.status === 'in_progress').map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => setSelectedItem(item)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 shadow-xs ${
                            isDark
                              ? 'bg-slate-950 hover:border-amber-500/50 border-slate-800/80'
                              : 'bg-slate-50 hover:border-amber-500/50 border-slate-200'
                          } ${
                            selectedItem?.id === item.id ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-950/30' : ''
                          }`}
                        >
                          {/* Program Name Badge */}
                          {item.program_name && (
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                isDark
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                <Layers className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                                <span className="truncate">{item.program_code ? `[${item.program_code}] ` : ''}{item.program_name}</span>
                              </span>
                            </div>
                          )}

                          <h4 className={`text-xs font-bold line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>

                          {/* PIC Employee */}
                          {(() => {
                            let empIds = [];
                            if (Array.isArray(item.assignee_employee_ids) && item.assignee_employee_ids.length > 0) {
                              empIds = item.assignee_employee_ids;
                            } else if (item.assignee_employee_id) {
                              empIds = [item.assignee_employee_id];
                            }
                            if (empIds.length === 0) return null;
                            const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);
                            if (matchedEmps.length === 0) return null;
                            return (
                              <div className={`flex items-center gap-1 text-[10.5px] pt-0.5 truncate font-medium ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                <User className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                              </div>
                            );
                          })()}

                          <div className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                            isDark ? 'border-slate-900 text-slate-400' : 'border-slate-200 text-slate-500'
                          }`}>
                            <span>{item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : '-'}</span>
                            <span className={`font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{item.progress_percent}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Add Button In Progress */}
                <button
                  onClick={() => openCreateModal(null, null, 'in_progress')}
                  className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                    isDark
                      ? 'border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400'
                      : 'border-slate-300 hover:border-amber-500/60 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas Berjalan</span>
                </button>
              </div>

              {/* Column Completed */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'done')}
                className={`border rounded-xl p-4 flex flex-col justify-between min-h-[400px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="space-y-3">
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                      isDark ? 'text-emerald-400' : 'text-emerald-700'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Tuntas Selesai ({tasksList.filter((t) => t.status === 'done' || t.status === 'completed').length})
                    </span>
                    <button
                      onClick={() => openCreateModal(null, null, 'done')}
                      title="Tambah Tugas Tuntas Selesai"
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {tasksList.filter((t) => t.status === 'done' || t.status === 'completed').length === 0 ? (
                      <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                        isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}>
                        <p className="text-xs font-semibold">Belum ada tugas di kolom ini</p>
                        <p className="text-[10px]">Tugas yang sudah selesai akan muncul di sini</p>
                      </div>
                    ) : (
                      tasksList.filter((t) => t.status === 'done' || t.status === 'completed').map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => setSelectedItem(item)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 shadow-xs ${
                            isDark
                              ? 'bg-slate-950 hover:border-emerald-500/50 border-slate-800/80'
                              : 'bg-slate-50 hover:border-emerald-500/50 border-slate-200'
                          } ${
                            selectedItem?.id === item.id ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg shadow-indigo-950/30' : ''
                          }`}
                        >
                          {/* Program Name Badge */}
                          {item.program_name && (
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                isDark
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                <Layers className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                                <span className="truncate">{item.program_code ? `[${item.program_code}] ` : ''}{item.program_name}</span>
                              </span>
                            </div>
                          )}

                          <h4 className={`text-xs font-bold line-through line-clamp-2 ${
                            isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'
                          }`}>{item.title}</h4>

                          {/* PIC Employee */}
                          {(() => {
                            let empIds = [];
                            if (Array.isArray(item.assignee_employee_ids) && item.assignee_employee_ids.length > 0) {
                              empIds = item.assignee_employee_ids;
                            } else if (item.assignee_employee_id) {
                              empIds = [item.assignee_employee_id];
                            }
                            if (empIds.length === 0) return null;
                            const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);
                            if (matchedEmps.length === 0) return null;
                            return (
                              <div className={`flex items-center gap-1 text-[10.5px] pt-0.5 truncate font-medium ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                <User className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                              </div>
                            );
                          })()}

                          <div className={`flex items-center justify-between text-[11px] font-bold pt-1 border-t ${
                            isDark ? 'border-slate-900 text-emerald-400' : 'border-slate-200 text-emerald-700'
                          }`}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${
                              isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>Selesai</span>
                            <span>100%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Add Button Done */}
                <button
                  onClick={() => openCreateModal(null, null, 'done')}
                  className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                    isDark
                      ? 'border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400'
                      : 'border-slate-300 hover:border-emerald-500/60 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas Selesai</span>
                </button>
              </div>

              {/* Column Cancelled / Dibatalkan */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'cancelled')}
                className={`border rounded-xl p-4 flex flex-col justify-between min-h-[400px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
                }`}
              >
                <div className="space-y-3">
                  <div className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                      isDark ? 'text-rose-400' : 'text-rose-700'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Dibatalkan ({tasksList.filter((t) => t.status === 'cancelled' || t.status === 'dibatalkan').length})
                    </span>
                    <button
                      onClick={() => openCreateModal(null, null, 'cancelled')}
                      title="Tambah Tugas Dibatalkan"
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {tasksList.filter((t) => t.status === 'cancelled' || t.status === 'dibatalkan').length === 0 ? (
                      <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                        isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}>
                        <p className="text-xs font-semibold">Belum ada tugas di kolom ini</p>
                        <p className="text-[10px]">Tugas yang dibatalkan akan tercatat di sini</p>
                      </div>
                    ) : (
                      tasksList.filter((t) => t.status === 'cancelled' || t.status === 'dibatalkan').map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => setSelectedItem(item)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 shadow-xs ${
                            isDark
                              ? 'bg-slate-950 hover:border-rose-500/50 border-slate-800/80'
                              : 'bg-slate-50 hover:border-rose-500/50 border-slate-200'
                          } ${
                            selectedItem?.id === item.id ? 'border-rose-500 ring-1 ring-rose-500 shadow-lg shadow-rose-950/30' : ''
                          }`}
                        >
                          {/* Program Name Badge */}
                          {item.program_name && (
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                isDark
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                <Layers className="w-2.5 h-2.5 shrink-0 text-rose-500" />
                                <span className="truncate">{item.program_code ? `[${item.program_code}] ` : ''}{item.program_name}</span>
                              </span>
                            </div>
                          )}

                          <h4 className={`text-xs font-bold line-through line-clamp-2 ${
                            isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'
                          }`}>{item.title}</h4>

                          {/* PIC Employee */}
                          {(() => {
                            let empIds = [];
                            if (Array.isArray(item.assignee_employee_ids) && item.assignee_employee_ids.length > 0) {
                              empIds = item.assignee_employee_ids;
                            } else if (item.assignee_employee_id) {
                              empIds = [item.assignee_employee_id];
                            }
                            if (empIds.length === 0) return null;
                            const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);
                            if (matchedEmps.length === 0) return null;
                            return (
                              <div className={`flex items-center gap-1 text-[10.5px] pt-0.5 truncate font-medium ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                <User className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                              </div>
                            );
                          })()}

                          <div className={`flex items-center justify-between text-[11px] pt-1 border-t ${
                            isDark ? 'border-slate-900 text-slate-400' : 'border-slate-200 text-slate-500'
                          }`}>
                            <span>{item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : '-'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>Dibatalkan</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Add Button Cancelled */}
                <button
                  onClick={() => openCreateModal(null, null, 'cancelled')}
                  className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                    isDark
                      ? 'border-slate-800 hover:border-rose-500/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400'
                      : 'border-slate-300 hover:border-rose-500/60 hover:bg-rose-50 text-slate-600 hover:text-rose-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas Dibatalkan</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: BUCKET WAKTU (4 Kolom Distribusi Berdasarkan Tenggat) */}
          {viewMode === 'bucket' && (
            <div className="space-y-4">
              {/* Header Bucket Toolbar */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                    isDark ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Distribusi Jadwal Berdasarkan Waktu</h4>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pengelompokan otomatis tugas yang belum selesai berdasarkan batas waktu (deadline)</p>
                  </div>
                </div>
                <button
                  onClick={() => openCreateModal()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas / Aktivitas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Column 1: Overdue / Terlewat */}
                <div className={`border rounded-xl p-4 flex flex-col justify-between min-h-[350px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-rose-500/30' : 'bg-white border-rose-200'
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between pb-2 border-b ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                        isDark ? 'text-rose-400' : 'text-rose-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        ⚠️ Terlewat ({bucketData.overdue?.length || 0})
                      </span>
                      <button
                        onClick={() => openCreateModal()}
                        title="Tambah Tugas"
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(!bucketData.overdue || bucketData.overdue.length === 0) ? (
                        <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                          isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}>
                          <p className="text-xs font-semibold">Tidak ada tugas terlewat</p>
                          <p className="text-[10px]">Semua tugas berjalan sesuai jadwal</p>
                        </div>
                      ) : (
                        bucketData.overdue.map((i) => {
                          let empIds = [];
                          if (Array.isArray(i.assignee_employee_ids) && i.assignee_employee_ids.length > 0) {
                            empIds = i.assignee_employee_ids;
                          } else if (i.assignee_employee_id) {
                            empIds = [i.assignee_employee_id];
                          }
                          const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);

                          return (
                            <div
                              key={`${i.item_type || 'item'}-${i.id}`}
                              onClick={() => setSelectedItem(i)}
                              className={`p-3.5 rounded-xl border transition text-xs cursor-pointer space-y-2 shadow-xs ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800/80 hover:border-rose-500/40 text-white'
                                  : 'bg-slate-50 border-slate-200 hover:border-rose-500/40 text-slate-900'
                              } ${selectedItem?.id === i.id ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                            >
                              {i.program_name && (
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                    isDark ? 'bg-rose-950/40 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}>
                                    <Layers className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{i.program_code ? `[${i.program_code}] ` : ''}{i.program_name}</span>
                                  </span>
                                </div>
                              )}
                              <h4 className={`font-bold line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{i.title}</h4>
                              {matchedEmps.length > 0 && (
                                <div className={`flex items-center gap-1 text-[10.5px] truncate font-medium ${
                                  isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                  <User className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                                </div>
                              )}
                              <div className={`flex items-center justify-between text-[10.5px] pt-1.5 border-t font-semibold ${
                                isDark ? 'border-slate-900 text-rose-400' : 'border-slate-200 text-rose-700'
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  Tenggat: {i.due_date ? formatHumanDate(i.due_date) : 'Lewat'}
                                </span>
                                <span className="font-extrabold">{i.progress_percent || 0}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal()}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                      isDark
                        ? 'border-slate-800 hover:border-rose-500/60 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400'
                        : 'border-slate-300 hover:border-rose-500/60 hover:bg-rose-50 text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tugas Terlewat</span>
                  </button>
                </div>

                {/* Column 2: Today / Hari Ini */}
                <div className={`border rounded-xl p-4 flex flex-col justify-between min-h-[350px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-amber-500/30' : 'bg-white border-amber-200'
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between pb-2 border-b ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                        isDark ? 'text-amber-300' : 'text-amber-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        📅 Hari Ini ({bucketData.today?.length || 0})
                      </span>
                      <button
                        onClick={() => openCreateModal()}
                        title="Tambah Tugas Hari Ini"
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(!bucketData.today || bucketData.today.length === 0) ? (
                        <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                          isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}>
                          <p className="text-xs font-semibold">Tidak ada tugas hari ini</p>
                          <p className="text-[10px]">Agenda hari ini bebas atau sudah selesai</p>
                        </div>
                      ) : (
                        bucketData.today.map((i) => {
                          let empIds = [];
                          if (Array.isArray(i.assignee_employee_ids) && i.assignee_employee_ids.length > 0) {
                            empIds = i.assignee_employee_ids;
                          } else if (i.assignee_employee_id) {
                            empIds = [i.assignee_employee_id];
                          }
                          const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);

                          return (
                            <div
                              key={`${i.item_type || 'item'}-${i.id}`}
                              onClick={() => setSelectedItem(i)}
                              className={`p-3.5 rounded-xl border transition text-xs cursor-pointer space-y-2 shadow-xs ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800/80 hover:border-amber-500/40 text-white'
                                  : 'bg-slate-50 border-slate-200 hover:border-amber-500/40 text-slate-900'
                              } ${selectedItem?.id === i.id ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}
                            >
                              {i.program_name && (
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                    isDark ? 'bg-amber-950/40 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                    <Layers className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{i.program_code ? `[${i.program_code}] ` : ''}{i.program_name}</span>
                                  </span>
                                </div>
                              )}
                              <h4 className={`font-bold line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{i.title}</h4>
                              {matchedEmps.length > 0 && (
                                <div className={`flex items-center gap-1 text-[10.5px] truncate font-medium ${
                                  isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                  <User className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                                </div>
                              )}
                              <div className={`flex items-center justify-between text-[10.5px] pt-1.5 border-t font-semibold ${
                                isDark ? 'border-slate-900 text-amber-300' : 'border-slate-200 text-amber-700'
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  Hari Ini
                                </span>
                                <span className="font-extrabold">{i.progress_percent || 0}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal()}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                      isDark
                        ? 'border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400'
                        : 'border-slate-300 hover:border-amber-500/60 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tugas Hari Ini</span>
                  </button>
                </div>

                {/* Column 3: Tomorrow / Besok */}
                <div className={`border rounded-xl p-4 flex flex-col justify-between min-h-[350px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200'
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between pb-2 border-b ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                        isDark ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        ⏰ Besok ({bucketData.tomorrow?.length || 0})
                      </span>
                      <button
                        onClick={() => openCreateModal()}
                        title="Tambah Tugas Besok"
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(!bucketData.tomorrow || bucketData.tomorrow.length === 0) ? (
                        <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                          isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}>
                          <p className="text-xs font-semibold">Tidak ada tugas besok</p>
                          <p className="text-[10px]">Jadwal besok belum ada agenda mendesak</p>
                        </div>
                      ) : (
                        bucketData.tomorrow.map((i) => {
                          let empIds = [];
                          if (Array.isArray(i.assignee_employee_ids) && i.assignee_employee_ids.length > 0) {
                            empIds = i.assignee_employee_ids;
                          } else if (i.assignee_employee_id) {
                            empIds = [i.assignee_employee_id];
                          }
                          const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);

                          return (
                            <div
                              key={`${i.item_type || 'item'}-${i.id}`}
                              onClick={() => setSelectedItem(i)}
                              className={`p-3.5 rounded-xl border transition text-xs cursor-pointer space-y-2 shadow-xs ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800/80 hover:border-indigo-500/40 text-white'
                                  : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40 text-slate-900'
                              } ${selectedItem?.id === i.id ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
                            >
                              {i.program_name && (
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                    isDark ? 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  }`}>
                                    <Layers className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{i.program_code ? `[${i.program_code}] ` : ''}{i.program_name}</span>
                                  </span>
                                </div>
                              )}
                              <h4 className={`font-bold line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{i.title}</h4>
                              {matchedEmps.length > 0 && (
                                <div className={`flex items-center gap-1 text-[10.5px] truncate font-medium ${
                                  isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                  <User className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                                </div>
                              )}
                              <div className={`flex items-center justify-between text-[10.5px] pt-1.5 border-t font-semibold ${
                                isDark ? 'border-slate-900 text-indigo-300' : 'border-slate-200 text-indigo-700'
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  Besok
                                </span>
                                <span className="font-extrabold">{i.progress_percent || 0}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal()}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                      isDark
                        ? 'border-slate-800 hover:border-indigo-500/60 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400'
                        : 'border-slate-300 hover:border-indigo-500/60 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tugas Besok</span>
                  </button>
                </div>

                {/* Column 4: This Week / Pekan Ini & Mendatang */}
                <div className={`border rounded-xl p-4 flex flex-col justify-between min-h-[350px] shadow-xs ${
                  isDark ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-emerald-200'
                }`}>
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between pb-2 border-b ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <span className={`text-xs font-extrabold uppercase flex items-center gap-1.5 ${
                        isDark ? 'text-emerald-400' : 'text-emerald-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        🗓️ Pekan Ini ({bucketData.this_week?.length || 0})
                      </span>
                      <button
                        onClick={() => openCreateModal()}
                        title="Tambah Tugas Pekan Ini"
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {(!bucketData.this_week || bucketData.this_week.length === 0) ? (
                        <div className={`p-6 rounded-xl border border-dashed text-center space-y-1 my-2 ${
                          isDark ? 'border-slate-800/80 bg-slate-950/40 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}>
                          <p className="text-xs font-semibold">Tidak ada tugas pekan ini</p>
                          <p className="text-[10px]">Tugas baru yang direncanakan akan tampil di sini</p>
                        </div>
                      ) : (
                        bucketData.this_week.map((i) => {
                          let empIds = [];
                          if (Array.isArray(i.assignee_employee_ids) && i.assignee_employee_ids.length > 0) {
                            empIds = i.assignee_employee_ids;
                          } else if (i.assignee_employee_id) {
                            empIds = [i.assignee_employee_id];
                          }
                          const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);

                          return (
                            <div
                              key={`${i.item_type || 'item'}-${i.id}`}
                              onClick={() => setSelectedItem(i)}
                              className={`p-3.5 rounded-xl border transition text-xs cursor-pointer space-y-2 shadow-xs ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800/80 hover:border-emerald-500/40 text-white'
                                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-900'
                              } ${selectedItem?.id === i.id ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}`}
                            >
                              {i.program_name && (
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-full border ${
                                    isDark ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}>
                                    <Layers className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{i.program_code ? `[${i.program_code}] ` : ''}{i.program_name}</span>
                                  </span>
                                </div>
                              )}
                              <h4 className={`font-bold line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{i.title}</h4>
                              {matchedEmps.length > 0 && (
                                <div className={`flex items-center gap-1 text-[10.5px] truncate font-medium ${
                                  isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                  <User className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{matchedEmps.map((e) => e.name || e.full_name).join(', ')}</span>
                                </div>
                              )}
                              <div className={`flex items-center justify-between text-[10.5px] pt-1.5 border-t font-semibold ${
                                isDark ? 'border-slate-900 text-slate-400' : 'border-slate-200 text-slate-600'
                              }`}>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  {i.due_date || i.start_date ? formatHumanDate(i.due_date || i.start_date) : 'Pekan Ini'}
                                </span>
                                <span className={`font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{i.progress_percent || 0}%</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal()}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer mt-3 ${
                      isDark
                        ? 'border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400'
                        : 'border-slate-300 hover:border-emerald-500/60 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tugas Pekan Ini</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: LIST TABLE */}
          {viewMode === 'list' && (
            <div className={`border rounded-xl overflow-hidden shadow-xl ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
            }`}>
              {/* Header List Toolbar */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b ${
                isDark ? 'border-slate-800 bg-slate-950/40 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-900'
              }`}>
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className={`font-extrabold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Daftar Lengkap ({tasksList.length} Tugas &amp; Aktivitas)</span>
                </div>
                <button
                  onClick={() => openCreateModal()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas / Aktivitas</span>
                </button>
              </div>

              <div className="overflow-x-auto p-4">
                <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead className={`text-[10px] uppercase border-b font-extrabold ${
                    isDark ? 'bg-slate-950/60 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <tr>
                      <th className="p-3">Judul Tugas &amp; Program</th>
                      <th className="p-3">Jadwal</th>
                      <th className="p-3">Pelaksana</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Progres</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {tasksList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          <p>Tidak ada data tugas atau aktivitas yang cocok dengan filter saat ini.</p>
                          <button
                            onClick={() => openCreateModal()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer mt-3"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Tugas Sekarang</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      tasksList.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`cursor-pointer transition ${
                            isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                          } ${
                            selectedItem?.id === item.id
                              ? isDark
                                ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-500/40'
                                : 'bg-indigo-50 ring-1 ring-inset ring-indigo-300'
                              : ''
                          }`}
                        >
                          <td className="p-3">
                            <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</div>
                            {item.program_name && (
                              <div className={`text-[10.5px] font-medium mt-0.5 flex items-center gap-1 ${
                                isDark ? 'text-indigo-400' : 'text-indigo-700'
                              }`}>
                                <Layers className="w-3 h-3 shrink-0" />
                                <span>{item.program_code ? `[${item.program_code}] ` : ''}{item.program_name}</span>
                              </div>
                            )}
                          </td>
                          <td className={`p-3 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {item.start_date && item.end_date && item.start_date !== item.end_date ? (
                              <span>
                                {new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} &ndash; {new Date(item.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span>{item.due_date ? new Date(item.due_date).toLocaleDateString('id-ID') : '-'}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {(() => {
                              let empIds = [];
                              if (Array.isArray(item.assignee_employee_ids) && item.assignee_employee_ids.length > 0) {
                                empIds = item.assignee_employee_ids;
                              } else if (item.assignee_employee_id) {
                                empIds = [item.assignee_employee_id];
                              }
                              if (empIds.length === 0) return <span className="text-slate-400">-</span>;
                              const matchedEmps = empIds.map((id) => employees.find((e) => e.id === Number(id))).filter(Boolean);
                              if (matchedEmps.length === 0) return <span className="text-slate-400">-</span>;
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {matchedEmps.map((e) => (
                                    <span key={e.id} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                      isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'
                                    }`}>
                                      {e.name || e.full_name}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-3 capitalize font-bold whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              item.status === 'done' || item.status === 'completed'
                                ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.status === 'in_progress'
                                ? isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
                                : item.status === 'cancelled' || item.status === 'dibatalkan'
                                ? isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-200'
                                : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {item.status === 'done' || item.status === 'completed'
                                ? 'Selesai'
                                : item.status === 'in_progress'
                                ? 'Berjalan'
                                : item.status === 'cancelled' || item.status === 'dibatalkan'
                                ? 'Dibatalkan'
                                : 'Planned'}
                            </span>
                          </td>
                          <td className={`p-3 text-center font-extrabold whitespace-nowrap ${
                            (Number(item.progress_percent) || 0) === 100
                              ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                              : (Number(item.progress_percent) || 0) > 0
                              ? isDark ? 'text-amber-400' : 'text-amber-700'
                              : isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}>{item.progress_percent || 0}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: GANTT CHART TIMELINE */}
          {viewMode === 'gantt' && (
            <GanttTimelineView
              data={ganttData}
              academicYear={academicYear}
              employees={employees}
              onItemClick={(item) => {
                if (item && !item.is_group && item.type !== 'summary' && !String(item.id || '').startsWith('grp-')) {
                  setSelectedItem(item);
                }
              }}
              onScheduleChange={handleGanttScheduleChange}
              onAddTask={(progId) => openCreateModal(progId)}
              onTaskReorder={handleTaskReorder}
            />
          )}

          {/* MODAL WINDOWS (Rendered via React Portal) */}
          {renderCreateTaskModal()}
          {renderDetailModal()}
        </div>
      </div>
    </div>
  );
}
