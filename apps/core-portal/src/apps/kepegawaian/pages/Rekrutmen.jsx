import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import { useToast } from '../../../shared/components/Toast';
import {
  UserPlus,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  BookOpen,
  Brain,
  MessageSquare,
  Clock,
  UserCheck,
  FileSpreadsheet,
  Upload,
  Layers,
  ArrowRight,
  Eye,
  Trash2,
  Edit,
  Power,
  Check,
  HelpCircle,
  Sliders,
  Scale,
  Sparkles,
  Lock,
  ChevronRight
} from 'lucide-react';
import api from '../../../shared/services/api';

const STAGE_CONFIG = {
  applied: { label: 'Lamaran Masuk', badge: 'bg-blue-50 text-blue-700 border-blue-200', color: 'blue' },
  screening: { label: 'Seleksi Berkas', badge: 'bg-amber-50 text-amber-700 border-amber-200', color: 'amber' },
  interview: { label: 'Wawancara', badge: 'bg-purple-50 text-purple-700 border-purple-200', color: 'purple' },
  psychological_test: { label: 'Tes Psikotes', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', color: 'indigo' },
  microteaching: { label: 'Microteaching (Guru)', badge: 'bg-teal-50 text-teal-700 border-teal-200', color: 'teal' },
  offering: { label: 'Penawaran Kerja', badge: 'bg-orange-50 text-orange-700 border-orange-200', color: 'orange' },
  accepted: { label: 'Diterima (Onboarding)', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: 'emerald' },
  rejected: { label: 'Gugur / Ditolak', badge: 'bg-rose-50 text-rose-700 border-rose-200', color: 'rose' }
};

export default function Rekrutmen() {
  const { activeSchoolUnit, user } = useAuth();
  const toast = useToast();
  const showToast = (msg, type = 'info') => {
    if (toast?.[type]) toast[type](msg);
    else if (toast?.showToast) toast.showToast(msg, type);
    else if (toast?.info) toast.info(msg);
  };

  // Active Main Tab: 'candidates' | 'psychological' | 'interview_rubric' | 'microteaching_rubric'
  const [activeTab, setActiveTab] = useState('candidates');

  // Candidate state
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Modals & Details
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('profile'); // profile | history | interview | psikotes | microteaching

  // Sub-forms inside Detail Modal
  const [isStageUpdateOpen, setIsStageUpdateOpen] = useState(false);
  const [stageForm, setStageForm] = useState({ stage: 'screening', status: 'passed', notes: '', assessor_name: '' });

  const [isAddInterviewOpen, setIsAddInterviewOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    interviewer_name: user?.full_name || 'Tim Pewawancara',
    interview_date: new Date().toISOString().split('T')[0],
    recommendation: 'recommended',
    notes: '',
    questions_answers: [
      { question: 'Visi pendidikan & motivasi bergabung di Aldepos IBS', answer: '', score: 85, notes: '' },
      { question: 'Kompetensi teknis & pengalaman kerja terkait', answer: '', score: 80, notes: '' },
      { question: 'Penyelesaian konflik & kerja sama tim', answer: '', score: 80, notes: '' }
    ]
  });

  const [isTakeTestOpen, setIsTakeTestOpen] = useState(false);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('');
  const [testAnswers, setTestAnswers] = useState({});

  const [isAddMicroteachingOpen, setIsAddMicroteachingOpen] = useState(false);
  const [microForm, setMicroForm] = useState({
    evaluator_name: user?.full_name || 'Kepala Kurikulum',
    subject_topic: '',
    teaching_date: new Date().toISOString().split('T')[0],
    mastery_score: 80,
    methodology_score: 80,
    classroom_management_score: 80,
    media_tech_score: 80,
    communication_score: 85,
    recommendation: 'recommended',
    evaluator_notes: ''
  });

  // Instruments state
  const [instruments, setInstruments] = useState([]);
  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState(false);
  const [editingInstrumentId, setEditingInstrumentId] = useState(null);
  const [previewInstrument, setPreviewInstrument] = useState(null);

  const [instrumentForm, setInstrumentForm] = useState({
    title: '',
    test_type: 'psychological', // psychological | interview_rubric | microteaching_rubric
    description: '',
    duration_minutes: 30,
    passing_score: 70,
    is_active: true,
    questions: []
  });

  // Create Candidate Form
  const [createForm, setCreateForm] = useState({
    candidate_name: '',
    applied_position: '',
    email: '',
    phone_number: '',
    last_education: '',
    skills: '',
    work_experiences: '',
    documents: [],
    notes: '',
    selection_stage: 'applied'
  });

  // Activate Employee Form
  const [activateForm, setActivateForm] = useState({
    employee_number: '',
    employment_status: 'gtt',
    current_position_id: '',
    gender: 'male',
    birth_date: ''
  });

  const [jobPositions, setJobPositions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch candidates list
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let q = '?';
      if (activeSchoolUnit?.id) q += `school_unit_id=${activeSchoolUnit.id}&`;
      if (filterStage) q += `selection_stage=${filterStage}&`;
      if (searchQuery) q += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await api.get(`/kepegawaian/recruitment-candidates${q}`);
      if (res.data?.success) {
        setCandidates(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat kandidat rekrutmen', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch instruments
  const fetchInstruments = async () => {
    setInstrumentLoading(true);
    try {
      const res = await api.get('/kepegawaian/recruitment-instruments');
      if (res.data?.success) {
        setInstruments(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat bank instrumen', 'error');
    } finally {
      setInstrumentLoading(false);
    }
  };

  // Fetch detail of single candidate
  const fetchCandidateDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/kepegawaian/recruitment-candidates/${id}`);
      if (res.data?.success) {
        setDetailCandidate(res.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat detail kandidat', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const res = await api.get('/kepegawaian/job-positions');
      if (res.data?.success) {
        setJobPositions(res.data.data || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchCandidates();
    fetchPositions();
    fetchInstruments();
  }, [activeSchoolUnit, filterStage]);

  // Create candidate handler with robust validation & feedback
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateErrorMsg('');

    if (!createForm.candidate_name.trim()) {
      setCreateErrorMsg('Nama lengkap pelamar wajib diisi.');
      return;
    }
    if (!createForm.applied_position.trim()) {
      setCreateErrorMsg('Posisi yang dilamar wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...createForm,
        school_unit_id: activeSchoolUnit?.id || 1,
        skills: createForm.skills ? createForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        work_experiences: createForm.work_experiences ? [{ description: createForm.work_experiences }] : []
      };
      const res = await api.post('/kepegawaian/recruitment-candidates', payload);
      if (res.data?.success) {
        showToast('Kandidat pelamar berhasil didaftarkan ke tahap Lamaran Masuk!', 'success');
        setIsCreateOpen(false);
        setCreateErrorMsg('');
        setCreateForm({
          candidate_name: '',
          applied_position: '',
          email: '',
          phone_number: '',
          last_education: '',
          skills: '',
          work_experiences: '',
          documents: [],
          notes: '',
          selection_stage: 'applied'
        });
        fetchCandidates();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menambahkan pelamar baru';
      setCreateErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete single candidate
  const handleDeleteCandidate = async (candidateId, candidateName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data pelamar "${candidateName}" beserta seluruh riwayat seleksinya?`)) {
      return;
    }

    try {
      const res = await api.delete(`/kepegawaian/recruitment-candidates/${candidateId}`);
      if (res.data?.success) {
        showToast(`Data pelamar "${candidateName}" berhasil dihapus`, 'success');
        if (detailCandidate?.id === candidateId) {
          setDetailCandidate(null);
        }
        fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus data pelamar', 'error');
    }
  };

  // Update candidate stage
  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!detailCandidate) return;
    setSubmitting(true);
    try {
      const res = await api.patch(`/kepegawaian/recruitment-candidates/${detailCandidate.id}/stage`, {
        selection_stage: stageForm.stage,
        status: stageForm.status,
        notes: stageForm.notes,
        assessor_name: stageForm.assessor_name || user?.full_name || 'Tim HRD'
      });
      if (res.data?.success) {
        showToast(`Tahapan kandidat berhasil diubah ke '${STAGE_CONFIG[stageForm.stage]?.label || stageForm.stage}'`, 'success');
        setIsStageUpdateOpen(false);
        fetchCandidateDetail(detailCandidate.id);
        fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengubah status tahapan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit interview
  const handleAddInterview = async (e) => {
    e.preventDefault();
    if (!detailCandidate) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/kepegawaian/recruitment-candidates/${detailCandidate.id}/interviews`, interviewForm);
      if (res.data?.success) {
        showToast('Hasil penilaian wawancara berhasil disimpan & dicatat ke riwayat!', 'success');
        setIsAddInterviewOpen(false);
        fetchCandidateDetail(detailCandidate.id);
        fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan wawancara', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit psychological test
  const handleTakeTest = async (e) => {
    e.preventDefault();
    if (!detailCandidate || !selectedInstrumentId) return;
    setSubmitting(true);
    try {
      const instrument = instruments.find(i => i.id == selectedInstrumentId);
      const answersPayload = (instrument?.questions || []).map(q => ({
        question_id: q.id,
        selected_option: testAnswers[q.id] || ''
      }));

      const res = await api.post(`/kepegawaian/recruitment-candidates/${detailCandidate.id}/test-results`, {
        instrument_id: Number(selectedInstrumentId),
        answers: answersPayload,
        assessor_name: user?.full_name || 'Sistem Evaluasi Psikotes'
      });

      if (res.data?.success) {
        showToast('Tes psikotes berhasil dikoreksi otomatis & hasil disimpan!', 'success');
        setIsTakeTestOpen(false);
        setTestAnswers({});
        fetchCandidateDetail(detailCandidate.id);
        fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengevaluasi tes psikotes', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit microteaching
  const handleAddMicroteaching = async (e) => {
    e.preventDefault();
    if (!detailCandidate) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/kepegawaian/recruitment-candidates/${detailCandidate.id}/microteachings`, microForm);
      if (res.data?.success) {
        showToast('Nilai evaluasi microteaching berhasil disimpan & dicatat ke riwayat!', 'success');
        setIsAddMicroteachingOpen(false);
        fetchCandidateDetail(detailCandidate.id);
        fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan evaluasi microteaching', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open modal create instrument based on active tab
  const openCreateInstrument = (targetType) => {
    setEditingInstrumentId(null);
    const type = targetType || (activeTab === 'candidates' ? 'psychological' : activeTab);

    let defaultQuestions = [];
    if (type === 'psychological') {
      defaultQuestions = [
        {
          id: 1,
          question: 'Pertanyaan psikotes / penalaran logika 1',
          options: [
            { key: 'A', text: 'Pilihan A' },
            { key: 'B', text: 'Pilihan B' },
            { key: 'C', text: 'Pilihan C' },
            { key: 'D', text: 'Pilihan D' }
          ],
          correct_option: 'A',
          score_weight: 20
        }
      ];
    } else if (type === 'interview_rubric') {
      defaultQuestions = [
        {
          id: 1,
          category: 'Visi Pendidikan Islam & Kepribadian',
          question: 'Apa motivasi utama Anda mengabdi di lingkungan pesantren IBS dan bagaimana Anda menyelaraskan visi pendidikan Islami?',
          indicator: 'Kesesuaian orientasi dakwah, ketulusan niat, pemahaman visi pendidikan karakter Islami.',
          max_score: 100
        },
        {
          id: 2,
          category: 'Kompetensi Teknis & Pengalaman',
          question: 'Ceritakan pengalaman nyata Anda dalam menyelesaikan tantangan dalam pembelajaran atau pekerjaan sebelumnya.',
          indicator: 'Penguasaan keahlian teknis, pemecahan masalah (problem solving), inovasi kerja.',
          max_score: 100
        }
      ];
    } else if (type === 'microteaching_rubric') {
      defaultQuestions = [
        { id: 1, aspect_name: 'Penguasaan Materi & Silabus', weight_percentage: 25, indicator: 'Kesesuaian kurikulum, kedalaman konsep materi, kejelasan penyampaian materi inti' },
        { id: 2, aspect_name: 'Metode Pembelajaran & Interaktivitas', weight_percentage: 20, indicator: 'Variasi metode, pelibatan santri, active learning' },
        { id: 3, aspect_name: 'Pengelolaan Kelas & Disiplin Waktu', weight_percentage: 20, indicator: 'Ketepatan waktu alokasi pembuka-inti-penutup, pengkondisian kelas' },
        { id: 4, aspect_name: 'Pemanfaatan Media & IT Pembelajaran', weight_percentage: 15, indicator: 'Penggunaan presentasi/alat peraga/media digital interaktif' },
        { id: 5, aspect_name: 'Penampilan, Bahasa & Komunikasi Islami', weight_percentage: 20, indicator: 'Artikulasi suara, keramahan, keteladanan akhlak (adab), busana syar\'i' }
      ];
    }

    setInstrumentForm({
      title: '',
      test_type: type,
      description: '',
      duration_minutes: type === 'psychological' ? 30 : 45,
      passing_score: 75,
      is_active: true,
      questions: defaultQuestions
    });
    setIsInstrumentModalOpen(true);
  };

  // Open modal edit instrument
  const openEditInstrument = (inst) => {
    setEditingInstrumentId(inst.id);
    setInstrumentForm({
      title: inst.title || '',
      test_type: inst.test_type || 'psychological',
      description: inst.description || '',
      duration_minutes: inst.duration_minutes || 30,
      passing_score: inst.passing_score || 70,
      is_active: Boolean(inst.is_active),
      questions: Array.isArray(inst.questions) ? JSON.parse(JSON.stringify(inst.questions)) : []
    });
    setIsInstrumentModalOpen(true);
  };

  // Toggle active status of instrument
  const handleToggleInstrumentActive = async (inst) => {
    const nextStatus = !inst.is_active;
    try {
      const res = await api.put(`/kepegawaian/recruitment-instruments/${inst.id}`, {
        is_active: nextStatus
      });
      if (res.data?.success) {
        showToast(`Status paket "${inst.title}" berhasil diubah menjadi ${nextStatus ? 'AKTIF' : 'NONAKTIF'}`, 'success');
        fetchInstruments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengubah status instrumen', 'error');
    }
  };

  // Delete instrument (only allowed if usage_count === 0)
  const handleDeleteInstrument = async (inst) => {
    if (inst.usage_count > 0) {
      showToast(`Paket tidak dapat dihapus karena sudah dipakai dalam ${inst.usage_count} penilaian pelamar. Anda dapat menonaktifkannya.`, 'warning');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus paket/rubrik "${inst.title}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/kepegawaian/recruitment-instruments/${inst.id}`);
      if (res.data?.success) {
        showToast(`Paket "${inst.title}" berhasil dihapus`, 'success');
        fetchInstruments();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus instrumen', 'error');
    }
  };

  // Save Instrument (Create or Update)
  const handleSaveInstrument = async (e) => {
    e.preventDefault();
    if (!instrumentForm.title.trim()) {
      showToast('Judul paket/rubrik wajib diisi', 'error');
      return;
    }

    // Validation for microteaching total weights
    if (instrumentForm.test_type === 'microteaching_rubric') {
      const totalWeight = (instrumentForm.questions || []).reduce((acc, curr) => acc + (Number(curr.weight_percentage) || 0), 0);
      if (totalWeight !== 100) {
        showToast(`Total bobot persentase 5 aspek harus tepat 100% (saat ini: ${totalWeight}%)`, 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...instrumentForm,
        school_unit_id: activeSchoolUnit?.id || 1
      };

      if (editingInstrumentId) {
        const res = await api.put(`/kepegawaian/recruitment-instruments/${editingInstrumentId}`, payload);
        if (res.data?.success) {
          showToast('Paket instrumen/soal berhasil diperbarui!', 'success');
          setIsInstrumentModalOpen(false);
          fetchInstruments();
        }
      } else {
        const res = await api.post('/kepegawaian/recruitment-instruments', payload);
        if (res.data?.success) {
          showToast('Paket instrumen/soal baru berhasil disimpan!', 'success');
          setIsInstrumentModalOpen(false);
          fetchInstruments();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan instrumen', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Activate Candidate to Employee
  const handleActivate = async (e) => {
    e.preventDefault();
    if (!detailCandidate) return;
    setSubmitting(true);
    try {
      const payload = {
        ...activateForm,
        school_unit_id: activeSchoolUnit?.id || detailCandidate.school_unit_id || 1
      };
      const res = await api.post(`/kepegawaian/recruitment-candidates/${detailCandidate.id}/activate`, payload);
      if (res.data?.success) {
        showToast(`Kandidat ${detailCandidate.candidate_name} resmi diaktifkan sebagai pegawai & akun SSO Core dibuat!`, 'success');
        setIsActivateOpen(false);
        fetchCandidateDetail(detailCandidate.id);
        fetchCandidates();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengaktifkan pegawai', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openCandidateDetail = (c) => {
    fetchCandidateDetail(c.id);
    setDetailTab('profile');
  };

  // Filtered instruments per tab
  const filteredInstruments = instruments.filter(inst => {
    if (activeTab === 'psychological') return inst.test_type === 'psychological';
    if (activeTab === 'interview_rubric') return inst.test_type === 'interview_rubric';
    if (activeTab === 'microteaching_rubric') return inst.test_type === 'microteaching_rubric';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-indigo-600" />
            <span>Rekrutmen & Onboarding Pegawai</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem terintegrasi seleksi pelamar, bank soal psikotes, panduan wawancara, rubrik microteaching, dan aktivasi pegawai.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { fetchCandidates(); fetchInstruments(); }}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {activeTab === 'candidates' ? (
            <button
              onClick={() => {
                setCreateErrorMsg('');
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Pelamar Baru</span>
            </button>
          ) : (
            <button
              onClick={() => openCreateInstrument(activeTab)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {activeTab === 'psychological' && 'Tambah Paket Soal Psikotes'}
                {activeTab === 'interview_rubric' && 'Tambah Rubrik Wawancara'}
                {activeTab === 'microteaching_rubric' && 'Tambah Rubrik Microteaching'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'candidates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Pipeline & Pelamar ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('psychological')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'psychological'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>2. Soal Psikotes & Skoring ({instruments.filter(i => i.test_type === 'psychological').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('interview_rubric')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'interview_rubric'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>3. Panduan & Pertanyaan Wawancara ({instruments.filter(i => i.test_type === 'interview_rubric').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('microteaching_rubric')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'microteaching_rubric'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>4. Rubrik Microteaching Guru ({instruments.filter(i => i.test_type === 'microteaching_rubric').length})</span>
        </button>
      </div>

      {/* TAB 1: PIPELINE & DAFTAR PELAMAR */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
                placeholder="Cari nama, posisi, email, nomor..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Filter Tahap:
              </span>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="">Semua Tahapan ({candidates.length})</option>
                {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Candidates */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs">Memuat data pelamar...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Belum ada kandidat pelamar</p>
                <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Input Pelamar Baru" untuk mendaftarkan kandidat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Nama Pelamar</th>
                      <th className="py-3.5 px-4">Posisi Dilamar</th>
                      <th className="py-3.5 px-4">Pendidikan & Kontak</th>
                      <th className="py-3.5 px-4 text-center">Tahapan Seleksi</th>
                      <th className="py-3.5 px-4 text-center">Status Pegawai</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {candidates.map((c) => {
                      const stageInfo = STAGE_CONFIG[c.selection_stage] || { label: c.selection_stage, badge: 'bg-slate-100 text-slate-700' };
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 text-sm">{c.candidate_name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">ID: #{c.id} &bull; Tgl Daftar: {new Date(c.created_at).toLocaleDateString('id-ID')}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                              <Briefcase className="w-3 h-3 text-slate-500" />
                              {c.applied_position}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 font-semibold">{c.last_education || '-'}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{c.email || c.phone_number || 'Tidak ada kontak'}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${stageInfo.badge}`}>
                              {stageInfo.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {c.activated_employee_id ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pegawai Aktif (#{c.activated_employee_id})</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum Diaktifkan</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openCandidateDetail(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs border border-indigo-200 transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Kelola Seleksi</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCandidate(c.id, c.candidate_name)}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                title="Hapus Data Pelamar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* TABS 2, 3, 4: INSTRUMENTS MANAGEMENT (PSIKOTES / WAWANCARA / MICROTEACHING) */}
      {activeTab !== 'candidates' && (
        <div className="space-y-5">
          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5">
                {activeTab === 'psychological' && <Brain className="w-5 h-5" />}
                {activeTab === 'interview_rubric' && <MessageSquare className="w-5 h-5" />}
                {activeTab === 'microteaching_rubric' && <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-black text-sm text-indigo-950">
                  {activeTab === 'psychological' && 'Kelola Paket Soal Psikotes & Rumus Perhitungan Skor'}
                  {activeTab === 'interview_rubric' && 'Kelola Bank Pertanyaan & Rubrik Penilaian Wawancara'}
                  {activeTab === 'microteaching_rubric' && 'Kelola Rubrik 5 Aspek Microteaching & Bobot Penilaian'}
                </h4>
                <p className="text-indigo-800/80 mt-0.5">
                  {activeTab === 'psychological' && 'Perhitungan nilai psikotes dilakukan otomatis dengan normalisasi bobot kunci jawaban (skala 0 - 100) dan status Lulus jika mencapai passing grade.'}
                  {activeTab === 'interview_rubric' && 'Pewawancara menilai setiap pertanyaan (0 - 100) berdasarkan indikator panduan, dan sistem menghitung rata-rata skor akhir serta rekomendasi.'}
                  {activeTab === 'microteaching_rubric' && 'Evaluator memasukkan skor 5 aspek pedagogik dan sistem menghitung nilai akhir dengan rumus persentase terbobot.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => openCreateInstrument(activeTab)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baru</span>
            </button>
          </div>

          {/* Instrument Cards Grid */}
          {instrumentLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Memuat data instrumen...</span>
            </div>
          ) : filteredInstruments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Scale className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Belum ada paket/rubrik terdaftar untuk kategori ini</p>
              <p className="text-[11px] text-slate-400 mt-1">Klik tombol "Tambah Baru" untuk menyusun butir soal dan formula perhitungan skor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredInstruments.map((inst) => {
                const isUsed = (inst.usage_count || 0) > 0;
                return (
                  <div key={inst.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4">
                    <div>
                      {/* Top Badges & Status Toggle */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            inst.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {inst.is_active ? 'Status: Aktif' : 'Status: Nonaktif'}
                          </span>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isUsed ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {inst.usage_count || 0}x Digunakan
                          </span>
                        </div>

                        {/* Switch Active Toggle */}
                        <button
                          onClick={() => handleToggleInstrumentActive(inst)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            inst.is_active
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                          title={inst.is_active ? 'Klik untuk Menonaktifkan' : 'Klik untuk Mengaktifkan'}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{inst.is_active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                      </div>

                      {/* Title & Description */}
                      <div className="mt-3">
                        <h3 className="font-black text-slate-800 text-sm">{inst.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{inst.description || 'Tidak ada deskripsi'}</p>
                      </div>

                      {/* Metric Specifications */}
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-3 text-center text-xs">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">
                            {inst.test_type === 'microteaching_rubric' ? 'Jumlah Aspek' : 'Jumlah Butir'}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">{inst.questions?.length || 0} {inst.test_type === 'microteaching_rubric' ? 'Aspek' : 'Soal'}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Durasi Alokasi</span>
                          <span className="font-bold text-slate-800 text-xs">{inst.duration_minutes} Menit</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Passing Grade</span>
                          <span className="font-black text-emerald-600 text-xs">{inst.passing_score}/100</span>
                        </div>
                      </div>

                      {/* Formula / Scoring calculation preview info */}
                      <div className="mt-3 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
                        <span className="font-bold block mb-0.5 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-indigo-600" />
                          <span>Mekanisme Skoring & Evaluasi:</span>
                        </span>
                        {inst.test_type === 'psychological' && (
                          <span className="text-slate-600">
                            Total Skor = (Jumlah Bobot Jawaban Benar / Total Bobot Maks) &times; 100. Status Lulus jika nilai &ge; {inst.passing_score}.
                          </span>
                        )}
                        {inst.test_type === 'interview_rubric' && (
                          <span className="text-slate-600">
                            Skor Akhir = Rata-rata nilai seluruh pertanyaan (0-100). Rekomendasi dipertimbangkan jika nilai &ge; {inst.passing_score}.
                          </span>
                        )}
                        {inst.test_type === 'microteaching_rubric' && (
                          <span className="text-slate-600">
                            Nilai Akhir = &sum;(Nilai Aspek &times; Bobot Aspek %). Memenuhi standar jika nilai akhir &ge; {inst.passing_score}.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setPreviewInstrument(inst)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau Butir ({inst.questions?.length || 0})</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditInstrument(inst)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs border border-indigo-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteInstrument(inst)}
                          disabled={isUsed}
                          className={`p-1.5 rounded-xl transition flex items-center justify-center ${
                            isUsed
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer'
                          }`}
                          title={isUsed ? 'Tidak dapat dihapus karena sudah dipakai dalam penilaian pelamar' : 'Hapus Paket'}
                        >
                          {isUsed ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRATINJAU BUTIR SOAL / RUBRIK */}
      {/* ======================================================== */}
      {previewInstrument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Pratinjau Instrumen</span>
                <h3 className="font-black text-base text-white">{previewInstrument.title}</h3>
              </div>
              <button onClick={() => setPreviewInstrument(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Tipe Instrumen</span>
                  <span className="font-bold text-slate-800 uppercase">{previewInstrument.test_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Durasi</span>
                  <span className="font-bold text-slate-800">{previewInstrument.duration_minutes} Menit</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Passing Grade</span>
                  <span className="font-bold text-emerald-600">{previewInstrument.passing_score}/100</span>
                </div>
              </div>

              {/* Psychological Questions */}
              {previewInstrument.test_type === 'psychological' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800">Daftar Butir Soal & Kunci Jawaban:</h4>
                  {(previewInstrument.questions || []).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between gap-2 font-bold text-slate-800">
                        <span>{idx + 1}. {q.question}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] whitespace-nowrap">Bobot: {q.score_weight || 10}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {(q.options || []).map((opt) => (
                          <div
                            key={opt.key}
                            className={`p-2 rounded-xl border text-[11px] ${
                              opt.key === q.correct_option
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <strong>({opt.key})</strong> {opt.text} {opt.key === q.correct_option && '✓ (Kunci)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Interview Rubric Questions */}
              {previewInstrument.test_type === 'interview_rubric' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800">Daftar Pertanyaan & Indikator Wawancara:</h4>
                  {(previewInstrument.questions || []).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                        <span className="text-purple-700 text-[11px] uppercase tracking-wider">{q.category || `Aspek #${idx + 1}`}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px]">Skor Maks: {q.max_score || 100}</span>
                      </div>
                      <p className="font-bold text-slate-800 text-xs">T: {q.question}</p>
                      {q.indicator && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                          <strong>Panduan/Indikator Jawaban:</strong> {q.indicator}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Microteaching Rubric Questions */}
              {previewInstrument.test_type === 'microteaching_rubric' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800">Daftar 5 Aspek & Bobot Penilaian Microteaching:</h4>
                  {(previewInstrument.questions || []).map((q, idx) => (
                    <div key={q.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                        <span className="text-teal-800 font-bold">{idx + 1}. {q.aspect_name}</span>
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-xs font-black">Bobot: {q.weight_percentage}%</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{q.indicator}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
              <button
                onClick={() => setPreviewInstrument(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BUAT / EDIT PAKET SOAL & RUBRIK */}
      {/* ======================================================== */}
      {isInstrumentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-base text-white">
                  {editingInstrumentId ? 'Edit Paket Instrumen / Soal' : 'Buat Paket Instrumen / Soal Baru'}
                </h3>
              </div>
              <button onClick={() => setIsInstrumentModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstrument} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Judul Paket Soal / Rubrik *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tes Psikotes Logika Matematika & Spasial"
                    value={instrumentForm.title}
                    onChange={(e) => setInstrumentForm({ ...instrumentForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Instrumen *</label>
                  <select
                    value={instrumentForm.test_type}
                    onChange={(e) => setInstrumentForm({ ...instrumentForm, test_type: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="psychological">Tes Psikotes & Logika (Pilihan Ganda)</option>
                    <option value="interview_rubric">Panduan & Rubrik Wawancara</option>
                    <option value="microteaching_rubric">Rubrik Microteaching (5 Aspek Guru)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Keaktifan</label>
                  <select
                    value={instrumentForm.is_active ? '1' : '0'}
                    onChange={(e) => setInstrumentForm({ ...instrumentForm, is_active: e.target.value === '1' })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                  >
                    <option value="1">Aktif (Dapat digunakan saat seleksi)</option>
                    <option value="0">Nonaktif (Diarsipkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi Ujian / Wawancara (Menit)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={instrumentForm.duration_minutes}
                    onChange={(e) => setInstrumentForm({ ...instrumentForm, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nilai Standar Kelulusan (Passing Grade)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={instrumentForm.passing_score}
                    onChange={(e) => setInstrumentForm({ ...instrumentForm, passing_score: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi / Petunjuk Pengerjaan</label>
                <textarea
                  rows={2}
                  value={instrumentForm.description}
                  onChange={(e) => setInstrumentForm({ ...instrumentForm, description: e.target.value })}
                  placeholder="Petunjuk pengerjaan bagi kandidat atau panduan bagi penilai..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              {/* DYNAMIC QUESTIONS BUILDER: 1. PSIKOTES */}
              {instrumentForm.test_type === 'psychological' && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Daftar Butir Soal Pilihan Ganda & Kunci Jawaban</h4>
                      <p className="text-[11px] text-slate-400">Total butir: {instrumentForm.questions.length} &bull; Total bobot poin: {(instrumentForm.questions || []).reduce((acc, q) => acc + (Number(q.score_weight) || 0), 0)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = {
                          id: Date.now(),
                          question: `Soal nomor #${instrumentForm.questions.length + 1}`,
                          options: [
                            { key: 'A', text: 'Pilihan A' },
                            { key: 'B', text: 'Pilihan B' },
                            { key: 'C', text: 'Pilihan C' },
                            { key: 'D', text: 'Pilihan D' }
                          ],
                          correct_option: 'A',
                          score_weight: 20
                        };
                        setInstrumentForm({ ...instrumentForm, questions: [...instrumentForm.questions, newQ] });
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Butir Soal
                    </button>
                  </div>

                  {instrumentForm.questions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-indigo-600 text-xs">SOAL #{qIdx + 1}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-600 text-[11px]">Bobot Skor:</span>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={q.score_weight || 20}
                              onChange={(e) => {
                                const updated = [...instrumentForm.questions];
                                updated[qIdx].score_weight = Number(e.target.value);
                                setInstrumentForm({ ...instrumentForm, questions: updated });
                              }}
                              className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-bold text-indigo-600 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setInstrumentForm({
                                ...instrumentForm,
                                questions: instrumentForm.questions.filter((_, i) => i !== qIdx)
                              });
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Butir Soal Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Tuliskan teks pertanyaan / soal logika di sini..."
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...instrumentForm.questions];
                          updated[qIdx].question = e.target.value;
                          setInstrumentForm({ ...instrumentForm, questions: updated });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800"
                      />

                      {/* Options & Correct Answer */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 block">Pilihan Jawaban & Tentukan Kunci Jawaban:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div
                              key={opt.key}
                              className={`p-2 rounded-xl border flex items-center gap-2 ${
                                q.correct_option === opt.key ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`correct_opt_${q.id || qIdx}`}
                                checked={q.correct_option === opt.key}
                                onChange={() => {
                                  const updated = [...instrumentForm.questions];
                                  updated[qIdx].correct_option = opt.key;
                                  setInstrumentForm({ ...instrumentForm, questions: updated });
                                }}
                                title="Pilih sebagai kunci jawaban yang benar"
                                className="text-emerald-600"
                              />
                              <span className="font-bold text-slate-700">({opt.key})</span>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => {
                                  const updated = [...instrumentForm.questions];
                                  updated[qIdx].options[optIdx].text = e.target.value;
                                  setInstrumentForm({ ...instrumentForm, questions: updated });
                                }}
                                placeholder={`Pilihan ${opt.key}`}
                                className="flex-1 px-2 py-1 bg-transparent text-xs text-slate-800 font-medium focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DYNAMIC QUESTIONS BUILDER: 2. WAWANCARA */}
              {instrumentForm.test_type === 'interview_rubric' && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Daftar Pertanyaan & Rubrik Indikator Penilaian</h4>
                      <p className="text-[11px] text-slate-400">Total pertanyaan: {instrumentForm.questions.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = {
                          id: Date.now(),
                          category: 'Kompetensi & Nilai Karakter',
                          question: '',
                          indicator: '',
                          max_score: 100
                        };
                        setInstrumentForm({ ...instrumentForm, questions: [...instrumentForm.questions, newQ] });
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Pertanyaan
                    </button>
                  </div>

                  {instrumentForm.questions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={q.category || ''}
                          onChange={(e) => {
                            const updated = [...instrumentForm.questions];
                            updated[qIdx].category = e.target.value;
                            setInstrumentForm({ ...instrumentForm, questions: updated });
                          }}
                          placeholder="Kategori Aspek (contoh: Visi Dakwah, Teamwork)"
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-purple-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setInstrumentForm({
                              ...instrumentForm,
                              questions: instrumentForm.questions.filter((_, i) => i !== qIdx)
                            });
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={q.question || ''}
                        onChange={(e) => {
                          const updated = [...instrumentForm.questions];
                          updated[qIdx].question = e.target.value;
                          setInstrumentForm({ ...instrumentForm, questions: updated });
                        }}
                        placeholder="Tuliskan butir pertanyaan wawancara..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs"
                      />

                      <textarea
                        rows={2}
                        value={q.indicator || ''}
                        onChange={(e) => {
                          const updated = [...instrumentForm.questions];
                          updated[qIdx].indicator = e.target.value;
                          setInstrumentForm({ ...instrumentForm, questions: updated });
                        }}
                        placeholder="Panduan bagi pewawancara / indikator respon yang diharapkan..."
                        className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-xl text-purple-900 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* DYNAMIC QUESTIONS BUILDER: 3. MICROTEACHING */}
              {instrumentForm.test_type === 'microteaching_rubric' && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Rubrik 5 Aspek Pedagogik & Persentase Bobot</h4>
                      <p className="text-[11px] text-slate-400">
                        Total Bobot saat ini: <strong className={
                          (instrumentForm.questions || []).reduce((acc, q) => acc + (Number(q.weight_percentage) || 0), 0) === 100
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }>
                          {(instrumentForm.questions || []).reduce((acc, q) => acc + (Number(q.weight_percentage) || 0), 0)}% (Wajib 100%)
                        </strong>
                      </p>
                    </div>
                  </div>

                  {instrumentForm.questions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={q.aspect_name || ''}
                          onChange={(e) => {
                            const updated = [...instrumentForm.questions];
                            updated[qIdx].aspect_name = e.target.value;
                            setInstrumentForm({ ...instrumentForm, questions: updated });
                          }}
                          placeholder={`Nama Aspek #${qIdx + 1}`}
                          className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-teal-800"
                        />
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-500 text-xs">Bobot %:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={q.weight_percentage || 0}
                            onChange={(e) => {
                              const updated = [...instrumentForm.questions];
                              updated[qIdx].weight_percentage = Number(e.target.value);
                              setInstrumentForm({ ...instrumentForm, questions: updated });
                            }}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-black text-teal-600 text-xs"
                          />
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={q.indicator || ''}
                        onChange={(e) => {
                          const updated = [...instrumentForm.questions];
                          updated[qIdx].indicator = e.target.value;
                          setInstrumentForm({ ...instrumentForm, questions: updated });
                        }}
                        placeholder="Deskripsi indikator penilaian aspek ini..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsInstrumentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Paket Instrumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: DETAIL LENGKAP PELAMAR & WORKFLOW SELEKSI */}
      {/* ======================================================== */}
      {detailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white font-black text-base shadow-md">
                  {detailCandidate.candidate_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-base leading-none text-white">{detailCandidate.candidate_name}</h3>
                  <p className="text-xs text-indigo-300 mt-1 font-medium">
                    Posisi Dilamar: <span className="text-white font-bold">{detailCandidate.applied_position}</span> &bull; Tahap: <span className="uppercase text-amber-300 font-bold">{STAGE_CONFIG[detailCandidate.selection_stage]?.label || detailCandidate.selection_stage}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setStageForm({
                      stage: detailCandidate.selection_stage,
                      status: 'passed',
                      notes: '',
                      assessor_name: user?.full_name || 'Tim HRD'
                    });
                    setIsStageUpdateOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Pindah Tahap</span>
                </button>

                {!detailCandidate.activated_employee_id && (
                  <button
                    onClick={() => {
                      setActivateForm({
                        employee_number: `EMP-${Date.now().toString().slice(-4)}`,
                        employment_status: 'gtt',
                        current_position_id: '',
                        gender: 'male',
                        birth_date: ''
                      });
                      setIsActivateOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Aktivasi Pegawai</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteCandidate(detailCandidate.id, detailCandidate.candidate_name)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Hapus Pelamar Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>

                <button
                  onClick={() => setDetailCandidate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs in Detail */}
            <div className="px-5 border-b border-slate-200 bg-slate-50 flex items-center gap-4 text-xs font-bold overflow-x-auto shrink-0">
              <button
                onClick={() => setDetailTab('profile')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  detailTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. Profil & Berkas Lamaran</span>
              </button>

              <button
                onClick={() => setDetailTab('history')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  detailTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>2. Riwayat Tahapan ({detailCandidate.stage_histories?.length || 0})</span>
              </button>

              <button
                onClick={() => setDetailTab('interview')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  detailTab === 'interview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>3. Wawancara ({detailCandidate.interviews?.length || 0})</span>
              </button>

              <button
                onClick={() => setDetailTab('psikotes')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  detailTab === 'psikotes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>4. Tes Psikotes ({detailCandidate.test_results?.length || 0})</span>
              </button>

              <button
                onClick={() => setDetailTab('microteaching')}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                  detailTab === 'microteaching' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>5. Microteaching Guru ({detailCandidate.microteachings?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body with Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {/* SUBTAB 1: PROFIL & BERKAS LAMARAN */}
              {detailTab === 'profile' && (
                <div className="space-y-6">
                  {/* Basic & Education */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span>Pendidikan & Latar Belakang</span>
                      </h4>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Pendidikan Terakhir</span>
                        <span className="text-xs font-bold text-slate-800">{detailCandidate.last_education || 'Belum diisi'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Email & Kontak</span>
                        <span className="text-xs font-semibold text-slate-800">{detailCandidate.email || '-'} &bull; {detailCandidate.phone_number || '-'}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Keahlian & Kompetensi</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(detailCandidate.skills) && detailCandidate.skills.length > 0 ? (
                          detailCandidate.skills.map((s, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Belum ada keahlian terdaftar</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Work Experience */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-slate-600" />
                      <span>Riwayat Pengalaman Kerja</span>
                    </h4>
                    {Array.isArray(detailCandidate.work_experiences) && detailCandidate.work_experiences.length > 0 ? (
                      detailCandidate.work_experiences.map((w, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                          {w.description || JSON.stringify(w)}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Tidak ada riwayat kerja tertulis.</p>
                    )}
                  </div>

                  {/* Documents & Files */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Berkas Lamaran & Dokumen Terlampir</span>
                    </h4>
                    {Array.isArray(detailCandidate.documents) && detailCandidate.documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {detailCandidate.documents.map((doc, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span className="text-xs font-semibold text-slate-800">{doc.name || `Dokumen #${idx + 1}`}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold uppercase">{doc.type || 'PDF'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                        Berkas lamaran lengkap (CV, Ijazah, KTP) tersimpan secara digital dalam berkas fisik & arsip rekrutmen.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: RIWAYAT TAHAPAN SELEKSI */}
              {detailTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">Audit Trail & Timeline Riwayat Proses Seleksi</h4>
                  </div>

                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {(detailCandidate.stage_histories || []).map((st, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center"></div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                              Tahap: {STAGE_CONFIG[st.stage]?.label || st.stage}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              st.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : st.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {st.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">{st.notes || 'Tidak ada catatan'}</p>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                            <span>Penilai: {st.assessor_name || 'Tim HRD'}</span>
                            <span>{new Date(st.created_at).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: WAWANCARA (TANYA JAWAB & SKOR) */}
              {detailTab === 'interview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">Lembar Penilaian Wawancara</h4>
                    <button
                      onClick={() => setIsAddInterviewOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Input Hasil Wawancara</span>
                    </button>
                  </div>

                  {(detailCandidate.interviews || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Belum ada sesi wawancara yang dicatat</p>
                      <p className="text-[11px] text-slate-400 mt-1">Klik tombol di atas untuk memasukkan butir tanya-jawab dan skor wawancara.</p>
                    </div>
                  ) : (
                    detailCandidate.interviews.map((intv) => (
                      <div key={intv.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-slate-800">Pewawancara: {intv.interviewer_name}</span>
                            <span className="text-[11px] text-slate-400 block">Tgl: {intv.interview_date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-indigo-600">Skor: {intv.overall_score}/100</span>
                            <span className={`block text-[10px] font-bold uppercase ${
                              intv.recommendation === 'recommended' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              Rekomendasi: {intv.recommendation}
                            </span>
                          </div>
                        </div>

                        {/* Q&A Items */}
                        <div className="space-y-2.5">
                          <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Butir Pertanyaan & Jawaban:</h5>
                          {(intv.questions_answers || []).map((qa, qidx) => (
                            <div key={qidx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>T: {qa.question}</span>
                                <span className="text-indigo-600">Nilai: {qa.score}</span>
                              </div>
                              <p className="text-slate-600">J: {qa.answer || '(Belum ada catatan jawaban)'}</p>
                            </div>
                          ))}
                        </div>

                        {intv.notes && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">
                            Catatan Pewawancara: {intv.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 4: TES PSIKOTES (KOREKSI OTOMATIS) */}
              {detailTab === 'psikotes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">Hasil Evaluasi Tes Psikotes & Logika</h4>
                    <button
                      onClick={() => setIsTakeTestOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Uji / Input Jawaban Psikotes</span>
                    </button>
                  </div>

                  {(detailCandidate.test_results || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                      <Brain className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Belum ada hasil psikotes</p>
                      <p className="text-[11px] text-slate-400 mt-1">Pilih instrumen psikotes untuk menginput lembar jawaban & hitung nilai otomatis.</p>
                    </div>
                  ) : (
                    detailCandidate.test_results.map((tr) => (
                      <div key={tr.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm">{tr.instrument_title || 'Tes Psikotes'}</h5>
                            <span className="text-[11px] text-slate-400">Waktu Pelaksanaan: {new Date(tr.created_at).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-base font-black ${tr.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              Nilai: {tr.total_score}
                            </span>
                            <span className={`block text-[10px] font-bold uppercase ${tr.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tr.status === 'passed' ? 'LULUS (MEMENUHI SYARAT)' : 'TIDAK LULUS'}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown answers */}
                        <div className="space-y-2">
                          <h6 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Review Lembar Jawaban:</h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(tr.answers || []).map((a, aidx) => (
                              <div key={aidx} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                a.is_correct ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50/60 border-rose-200 text-rose-900'
                              }`}>
                                <div>
                                  <span className="font-bold block">Soal #{a.question_id}: {a.question_text || 'Pertanyaan'}</span>
                                  <span className="text-[11px]">Jawaban: <strong>{a.selected_option}</strong></span>
                                </div>
                                <span className="font-bold text-xs">{a.score > 0 ? `+${a.score}` : '0'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {tr.notes && (
                          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                            {tr.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUBTAB 5: MICROTEACHING GURU */}
              {detailTab === 'microteaching' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">Uji Praktik Mengajar (Microteaching)</h4>
                      <p className="text-[11px] text-slate-400">Khusus calon Guru / Pendidik untuk menilai pedagogik & interaksi kelas.</p>
                    </div>
                    <button
                      onClick={() => setIsAddMicroteachingOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Input Nilai Microteaching</span>
                    </button>
                  </div>

                  {(detailCandidate.microteachings || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Belum ada penilaian microteaching</p>
                      <p className="text-[11px] text-slate-400 mt-1">Klik tombol di atas untuk mengisi rubrik 5 aspek microteaching.</p>
                    </div>
                  ) : (
                    detailCandidate.microteachings.map((mc) => (
                      <div key={mc.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm">Materi: {mc.subject_topic}</h5>
                            <span className="text-[11px] text-slate-400">Penguji: {mc.evaluator_name} &bull; Tgl: {mc.teaching_date}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-black text-indigo-600">Nilai Akhir: {mc.final_score}/100</span>
                            <span className="block text-[10px] font-bold uppercase text-emerald-600">
                              Rekomendasi: {mc.recommendation}
                            </span>
                          </div>
                        </div>

                        {/* 5 Aspek Nilai */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">1. Penguasaan Materi</span>
                            <span className="font-black text-slate-800 text-sm">{mc.mastery_score}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">2. Metode & Interaksi</span>
                            <span className="font-black text-slate-800 text-sm">{mc.methodology_score}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">3. Pengelolaan Kelas</span>
                            <span className="font-black text-slate-800 text-sm">{mc.classroom_management_score}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">4. Media & IT</span>
                            <span className="font-black text-slate-800 text-sm">{mc.media_tech_score}</span>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">5. Komunikasi & Etika</span>
                            <span className="font-black text-slate-800 text-sm">{mc.communication_score}</span>
                          </div>
                        </div>

                        {mc.evaluator_notes && (
                          <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900 font-medium">
                            Catatan Evaluator: {mc.evaluator_notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INPUT PELAMAR BARU (TAHAP APPLIED) */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-base text-white">Pendaftaran Pelamar Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 flex-1">
              {createErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Pelamar *</label>
                <input
                  type="text"
                  required
                  value={createForm.candidate_name}
                  onChange={(e) => setCreateForm({ ...createForm, candidate_name: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzan, S.Pd."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Posisi yang Dilamar *</label>
                  <input
                    type="text"
                    required
                    value={createForm.applied_position}
                    onChange={(e) => setCreateForm({ ...createForm, applied_position: e.target.value })}
                    placeholder="Contoh: Guru Matematika SMA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pendidikan Terakhir & IPK</label>
                  <input
                    type="text"
                    value={createForm.last_education}
                    onChange={(e) => setCreateForm({ ...createForm, last_education: e.target.value })}
                    placeholder="Contoh: S1 Pendidikan UNJ (IPK 3.85)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="ahmad@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    value={createForm.phone_number}
                    onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keahlian / Skills (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={createForm.skills}
                  onChange={(e) => setCreateForm({ ...createForm, skills: e.target.value })}
                  placeholder="Contoh: Tahfidz 30 Juz, Bahasa Arab, Canva, Google Classroom"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Riwayat Pengalaman Kerja</label>
                <textarea
                  rows={2}
                  value={createForm.work_experiences}
                  onChange={(e) => setCreateForm({ ...createForm, work_experiences: e.target.value })}
                  placeholder="Contoh: 2 Tahun Guru Honorer di SMP Negeri 1 Bogor (2022-2024)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Upload Berkas Lamaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Upload Berkas Lamaran (Opsional / Tidak Wajib)</label>
                <input
                  type="file"
                  id="candidate-file-upload"
                  multiple
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const newDocs = files.map((f) => ({
                      name: f.name,
                      size: (f.size / 1024).toFixed(1) + ' KB',
                      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
                      lastModified: f.lastModified
                    }));
                    setCreateForm((prev) => ({
                      ...prev,
                      documents: [...(prev.documents || []), ...newDocs]
                    }));
                  }}
                />

                <label
                  htmlFor="candidate-file-upload"
                  className="p-4 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50/70 text-center block cursor-pointer transition"
                >
                  <Upload className="w-6 h-6 mx-auto text-indigo-500 mb-1" />
                  <span className="text-xs text-indigo-700 font-bold block">Klik untuk Unggah CV, Ijazah, atau Sertifikat</span>
                  <span className="text-[11px] text-slate-400">Format PDF, DOCX, JPG atau PNG (Bisa pilih lebih dari satu file)</span>
                </label>

                {createForm.documents && createForm.documents.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">Berkas Terpilih ({createForm.documents.length}):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {createForm.documents.map((doc, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div className="truncate">
                              <p className="font-semibold text-slate-800 truncate">{doc.name}</p>
                              <span className="text-[10px] text-slate-400">{doc.size}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCreateForm((prev) => ({
                                ...prev,
                                documents: prev.documents.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                            title="Hapus Berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Daftarkan Pelamar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PINDAH TAHAPAN SELEKSI */}
      {/* ======================================================== */}
      {isStageUpdateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Pindah Tahapan Seleksi</h3>
              </div>
              <button onClick={() => setIsStageUpdateOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStage} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Tahapan Berikutnya *</label>
                <select
                  value={stageForm.stage}
                  onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Hasil Evaluasi</label>
                <select
                  value={stageForm.status}
                  onChange={(e) => setStageForm({ ...stageForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="passed">Passed (Lolos ke Tahap Ini)</option>
                  <option value="in_progress">In Progress (Sedang Berjalan)</option>
                  <option value="failed">Failed (Gugur / Tidak Lolos)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Alasan Hasil Seleksi</label>
                <textarea
                  rows={3}
                  value={stageForm.notes}
                  onChange={(e) => setStageForm({ ...stageForm, notes: e.target.value })}
                  placeholder="Tuliskan catatan pertimbangan kelulusan atau alasan penolakan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStageUpdateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Perbarui'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: INPUT HASIL WAWANCARA */}
      {/* ======================================================== */}
      {isAddInterviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-base text-white">Lembar Penilaian Wawancara</h3>
              </div>
              <button onClick={() => setIsAddInterviewOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInterview} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pewawancara *</label>
                  <input
                    type="text"
                    required
                    value={interviewForm.interviewer_name}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interviewer_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Wawancara *</label>
                  <input
                    type="date"
                    required
                    value={interviewForm.interview_date}
                    onChange={(e) => setInterviewForm({ ...interviewForm, interview_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Daftar Pertanyaan & Skor Jawaban Pelamar</label>
                  <button
                    type="button"
                    onClick={() => setInterviewForm({
                      ...interviewForm,
                      questions_answers: [...interviewForm.questions_answers, { question: '', answer: '', score: 80, notes: '' }]
                    })}
                    className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Pertanyaan
                  </button>
                </div>

                {interviewForm.questions_answers.map((qa, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Pertanyaan #${idx + 1}`}
                        value={qa.question}
                        onChange={(e) => {
                          const updated = [...interviewForm.questions_answers];
                          updated[idx].question = e.target.value;
                          setInterviewForm({ ...interviewForm, questions_answers: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                      />
                      <div className="w-24">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Skor (0-100)"
                          value={qa.score}
                          onChange={(e) => {
                            const updated = [...interviewForm.questions_answers];
                            updated[idx].score = Number(e.target.value);
                            setInterviewForm({ ...interviewForm, questions_answers: updated });
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-indigo-600"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Jawaban atau rangkuman respon pelamar..."
                      value={qa.answer}
                      onChange={(e) => {
                        const updated = [...interviewForm.questions_answers];
                        updated[idx].answer = e.target.value;
                        setInterviewForm({ ...interviewForm, questions_answers: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rekomendasi Akhir Pewawancara</label>
                <select
                  value={interviewForm.recommendation}
                  onChange={(e) => setInterviewForm({ ...interviewForm, recommendation: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="recommended">Sangat Direkomendasikan (Lolos)</option>
                  <option value="reconsider">Ditinjau Ulang / Cadangan</option>
                  <option value="rejected">Tidak Direkomendasikan (Tolak)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  placeholder="Catatan sikap, kepribadian, negosiasi gaji..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddInterviewOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Penilaian Wawancara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: INPUT JAWABAN & HITUNG OTOMATIS PSIKOTES */}
      {/* ======================================================== */}
      {isTakeTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-base text-white">Lembar Jawaban & Perhitungan Nilai Psikotes Otomatis</h3>
              </div>
              <button onClick={() => setIsTakeTestOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTakeTest} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Instrumen Bank Soal Psikotes *</label>
                <select
                  required
                  value={selectedInstrumentId}
                  onChange={(e) => {
                    setSelectedInstrumentId(e.target.value);
                    setTestAnswers({});
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Instrumen Tes --</option>
                  {instruments.filter(i => i.test_type === 'psychological' && i.is_active).map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.title} ({inst.questions?.length || 0} Soal - Standar Kelulusan: {inst.passing_score})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInstrumentId && (
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900 font-semibold flex items-center justify-between">
                    <span>Sistem akan mengoreksi jawaban dan menghitung skor total serta status kelulusan secara otomatis.</span>
                  </div>

                  {(() => {
                    const inst = instruments.find(i => i.id == selectedInstrumentId);
                    return (inst?.questions || []).map((q, idx) => (
                      <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="font-bold text-slate-800">
                          {idx + 1}. {q.question}
                        </div>

                        <div className="space-y-1.5">
                          {(q.options || []).map((opt) => (
                            <label
                              key={opt.key}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                                testAnswers[q.id] === opt.key
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                value={opt.key}
                                checked={testAnswers[q.id] === opt.key}
                                onChange={() => setTestAnswers({ ...testAnswers, [q.id]: opt.key })}
                                className="text-indigo-600"
                              />
                              <span><strong>({opt.key})</strong> {opt.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTakeTestOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedInstrumentId}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Mengevaluasi...' : 'Koreksi & Simpan Hasil Otomatis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: INPUT EVALUASI MICROTEACHING GURU */}
      {/* ======================================================== */}
      {isAddMicroteachingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <h3 className="font-black text-base text-white">Evaluasi Microteaching (Calon Guru)</h3>
              </div>
              <button onClick={() => setIsAddMicroteachingOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMicroteaching} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Evaluator / Penguji *</label>
                  <input
                    type="text"
                    required
                    value={microForm.evaluator_name}
                    onChange={(e) => setMicroForm({ ...microForm, evaluator_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Praktik *</label>
                  <input
                    type="date"
                    required
                    value={microForm.teaching_date}
                    onChange={(e) => setMicroForm({ ...microForm, teaching_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Materi / Topik Pelajaran yang Diajarkan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Persamaan Linear Kuadrat (Matematika Kelas 10)"
                  value={microForm.subject_topic}
                  onChange={(e) => setMicroForm({ ...microForm, subject_topic: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              {/* 5 Aspek Penilaian */}
              <div className="space-y-3 pt-2">
                <h5 className="font-bold text-slate-700">Skor 5 Aspek Penilaian Microteaching (0 - 100):</h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">1. Penguasaan Materi & Silabus (25%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={microForm.mastery_score}
                      onChange={(e) => setMicroForm({ ...microForm, mastery_score: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Metode & Interaktivitas (20%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={microForm.methodology_score}
                      onChange={(e) => setMicroForm({ ...microForm, methodology_score: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">3. Pengelolaan Kelas & Waktu (20%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={microForm.classroom_management_score}
                      onChange={(e) => setMicroForm({ ...microForm, classroom_management_score: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">4. Pemanfaatan Media & IT (15%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={microForm.media_tech_score}
                      onChange={(e) => setMicroForm({ ...microForm, media_tech_score: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">5. Penampilan, Gestur & Komunikasi (20%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={microForm.communication_score}
                    onChange={(e) => setMicroForm({ ...microForm, communication_score: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Kualitatif Evaluator</label>
                <textarea
                  rows={2}
                  value={microForm.evaluator_notes}
                  onChange={(e) => setMicroForm({ ...microForm, evaluator_notes: e.target.value })}
                  placeholder="Contoh: Penguasaan konsep sangat matang, artikulasi jelas, perlu sedikit penguatan di ice breaking."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMicroteachingOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Nilai Microteaching'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 8: AKTIVASI PEGAWAI & PROVISIONING SSO CORE */}
      {/* ======================================================== */}
      {isActivateOpen && detailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base text-white">Aktivasi Pegawai Baru</h3>
              </div>
              <button onClick={() => setIsActivateOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActivate} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                Aktivasi akan otomatis mendaftarkan <strong>{detailCandidate.candidate_name}</strong> ke master pegawai & membuat akun login SSO di Core Service.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Pegawai / NIP / NIPD *</label>
                <input
                  type="text"
                  required
                  value={activateForm.employee_number}
                  onChange={(e) => setActivateForm({ ...activateForm, employee_number: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Kepegawaian</label>
                <select
                  value={activateForm.employment_status}
                  onChange={(e) => setActivateForm({ ...activateForm, employment_status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="tetap" className="text-slate-800 bg-white">Pegawai Tetap Yayasan (PTY)</option>
                  <option value="kontrak" className="text-slate-800 bg-white">Pegawai Kontrak (PKWT)</option>
                  <option value="gtt" className="text-slate-800 bg-white">Guru Tidak Tetap (GTT)</option>
                  <option value="magang" className="text-slate-800 bg-white">Magang / Probation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan Struktural / Fungsional</label>
                <select
                  value={activateForm.current_position_id}
                  onChange={(e) => setActivateForm({ ...activateForm, current_position_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="" className="text-slate-500 bg-white">-- Pilih Jabatan --</option>
                  {jobPositions.map((pos) => (
                    <option key={pos.id} value={pos.id} className="text-slate-800 bg-white">
                      {pos.position_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer"
                >
                  {submitting ? 'Mengaktifkan...' : 'Konfirmasi & Terbitkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
