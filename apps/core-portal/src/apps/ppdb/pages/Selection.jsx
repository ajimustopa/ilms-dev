import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import { useAuth } from '../../../shared/store/AuthContext';
import DataTable from '../../../shared/components/DataTable';
import FilterBar from '../../../shared/components/FilterBar';
import Modal from '../../../shared/components/Modal';
import StatusPill from '../../../shared/components/StatusPill';
import LoadingSkeleton from '../../../shared/components/LoadingSkeleton';
import EmptyState from '../../../shared/components/EmptyState';
import {
  GraduationCap,
  Calendar,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Award,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Building,
  Layers,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import AcademicYearSelector from '../components/AcademicYearSelector';

export default function Selection() {
  const { activeSchoolUnit } = useAuth();
  const outletContext = useOutletContext() || {};
  const selectedAcademicYear = outletContext.selectedAcademicYear || localStorage.getItem('aldepos_ppdb_selected_academic_year') || '2026/2027';
  const setSelectedAcademicYear = outletContext.setSelectedAcademicYear;
  const academicYears = outletContext.academicYears || [];

  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'tests' | 'scoring' | 'announcements'
  const [loading, setLoading] = useState(true);

  // Common lookups
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');

  // 1. Sesi Ujian state
  const [sessions, setSessions] = useState([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    id: null,
    psb_test_id: '',
    session_name: '',
    session_date: '',
    start_time: '08:00',
    end_time: '10:00',
    room_location: '',
    quota: 30,
    proctor_name: ''
  });

  // Exam card modal
  const [examCardModalOpen, setExamCardModalOpen] = useState(false);
  const [examCardData, setExamCardData] = useState(null);

  // 2. Master Tes state
  const [tests, setTests] = useState([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testForm, setTestForm] = useState({
    id: null,
    psb_program_id: '',
    test_name: '',
    test_type: 'akademik', // 'akademik' | 'wawancara' | 'alquran' | 'psikotes' | 'kesehatan'
    weight: 25,
    passing_grade: 70,
    max_score: 100,
    description: ''
  });

  // 3. Penilaian & Skor Komposit state
  const [scoringList, setScoringList] = useState([]);
  const [scoringSearch, setScoringSearch] = useState('');
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [selectedScoringRegistrant, setSelectedScoringRegistrant] = useState(null);
  const [registrantSummary, setRegistrantSummary] = useState(null);
  const [scoreInputForm, setScoreInputForm] = useState({
    sessionId: '',
    score: 80,
    notes: '',
    is_passed: true
  });

  // 4. Pengumuman Kelulusan state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementFilter, setAnnouncementFilter] = useState('all');
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [decisionForm, setDecisionForm] = useState({
    decision: 'lulus', // 'lulus' | 'cadangan' | 'tidak_lulus' | 'menunggu'
    notes: ''
  });
  const [sklModalOpen, setSklModalOpen] = useState(false);
  const [sklData, setSklData] = useState(null);

  // Fetch initial lookups & tab data
  useEffect(() => {
    fetchPrograms();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedProgramId || programs.length > 0) {
      loadTabData();
    }
  }, [activeTab, selectedProgramId]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/psb/programs');
      const list = res.data?.data || [];
      setPrograms(list);
      if (list.length > 0 && !selectedProgramId) {
        setSelectedProgramId(list[0].id);
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'sessions') {
        const [resSess, resTests] = await Promise.all([
          api.get('/api/v1/psb/test-sessions'),
          api.get('/api/v1/psb/tests', { params: { psb_program_id: selectedProgramId } })
        ]);
        setSessions(resSess.data?.data || []);
        setTests(resTests.data?.data || []);
      } else if (activeTab === 'tests') {
        const res = await api.get('/api/v1/psb/tests', { params: { psb_program_id: selectedProgramId } });
        setTests(res.data?.data || []);
      } else if (activeTab === 'scoring') {
        const res = await api.get('/api/v1/psb/registrants', {
          params: { psb_program_id: selectedProgramId, limit: 100 }
        });
        setScoringList(res.data?.data || []);
        // Also fetch tests for lookup
        const resTests = await api.get('/api/v1/psb/tests', { params: { psb_program_id: selectedProgramId } });
        setTests(resTests.data?.data || []);
      } else if (activeTab === 'announcements') {
        const res = await api.get('/api/v1/psb/announcements', {
          params: { psb_program_id: selectedProgramId }
        });
        setAnnouncements(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error loading tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: Sesi Ujian
  // ==========================================
  const handleSaveSession = async (e) => {
    e.preventDefault();
    try {
      if (sessionForm.id) {
        await api.put(`/api/v1/psb/test-sessions/${sessionForm.id}`, sessionForm);
      } else {
        await api.post('/api/v1/psb/test-sessions', sessionForm);
      }
      setSessionModalOpen(false);
      loadTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan sesi ujian');
    }
  };

  const handleOpenExamCard = async (registrantId) => {
    try {
      const res = await api.get(`/api/v1/psb/registrants/${registrantId}/exam-card`);
      setExamCardData(res.data?.data);
      setExamCardModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengambil data kartu ujian peserta');
    }
  };

  // ==========================================
  // HANDLERS: Master Tes
  // ==========================================
  const handleSaveTest = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...testForm, psb_program_id: selectedProgramId };
      if (testForm.id) {
        await api.put(`/api/v1/psb/tests/${testForm.id}`, payload);
      } else {
        await api.post('/api/v1/psb/tests', payload);
      }
      setTestModalOpen(false);
      loadTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan master tes');
    }
  };

  const handleDeleteTest = async (id) => {
    if (!window.confirm('Yakin ingin menghapus mata tes ini?')) return;
    try {
      await api.delete(`/api/v1/psb/tests/${id}`);
      loadTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus mata tes');
    }
  };

  // ==========================================
  // HANDLERS: Penilaian
  // ==========================================
  const handleOpenScoringModal = async (reg) => {
    setSelectedScoringRegistrant(reg);
    try {
      const res = await api.get(`/api/v1/psb/registrants/${reg.id}/selection-summary`);
      setRegistrantSummary(res.data?.data);
      setScoreModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat ringkasan tes peserta');
    }
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    if (!scoreInputForm.sessionId) {
      alert('Pilih sesi ujian terlebih dahulu');
      return;
    }
    try {
      await api.post(`/api/v1/psb/test-sessions/${scoreInputForm.sessionId}/score`, {
        psb_registrant_id: selectedScoringRegistrant.id,
        score: Number(scoreInputForm.score),
        notes: scoreInputForm.notes,
        is_passed: Boolean(scoreInputForm.is_passed)
      });
      // Refresh summary
      const res = await api.get(`/api/v1/psb/registrants/${selectedScoringRegistrant.id}/selection-summary`);
      setRegistrantSummary(res.data?.data);
      alert('Nilai berhasil disimpan!');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan nilai ujian');
    }
  };

  // ==========================================
  // HANDLERS: Pengumuman & SKL
  // ==========================================
  const handleOpenDecisionModal = (item) => {
    setSelectedAnnouncement(item);
    setDecisionForm({
      decision: item.final_decision || 'lulus',
      notes: item.decision_notes || ''
    });
    setDecisionModalOpen(true);
  };

  const handleSaveDecision = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/v1/psb/announcements/decide', {
        decisions: [
          {
            registrant_id: selectedAnnouncement.registrant_id || selectedAnnouncement.id,
            final_decision: decisionForm.decision,
            notes: decisionForm.notes
          }
        ]
      });
      setDecisionModalOpen(false);
      loadTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan status kelulusan');
    }
  };

  const handleOpenSkl = async (regId) => {
    try {
      const res = await api.get(`/api/v1/psb/announcements/${regId}/letter`);
      setSklData(res.data?.data);
      setSklModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memuat Surat Keterangan Lulus');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold tracking-wider uppercase mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Tahap 3 & 4 Seleksi Penerimaan Siswa Baru</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tes Seleksi & Pengumuman Kelulusan</h1>
          <p className="text-emerald-100 text-xs mt-1 max-w-2xl">
            Atur mata uji & bobot, jadwalkan sesi ujian, cetak kartu ujian, input nilai penguji, kalkulasi skor terbobot otomatis, hingga penerbitan Surat Keterangan Lulus (SKL).
          </p>
        </div>

        {/* Selectors (Tahun Ajaran & Program) */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 flex flex-wrap items-center gap-3">
          <AcademicYearSelector
            value={selectedAcademicYear}
            onChange={(ny) => {
              if (setSelectedAcademicYear) setSelectedAcademicYear(ny);
              localStorage.setItem('aldepos_ppdb_selected_academic_year', ny);
              window.dispatchEvent(new CustomEvent('aldepos_ppdb_academic_year_changed', { detail: ny }));
            }}
            years={academicYears}
            variant="banner"
            dropdownAlign="left"
          />

          <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
            <div className="text-xs text-emerald-100 font-medium hidden sm:inline">Program:</div>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="bg-emerald-950/80 text-white text-xs font-semibold rounded-lg px-3 py-1.5 border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              {programs
                .filter(p => !selectedAcademicYear || p.target_academic_year === selectedAcademicYear || programs.length <= 1)
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sessions'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Sesi & Penjadwalan Ujian</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
            {sessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'tests'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Mata Uji & Pembobotan</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
            {tests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('scoring')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'scoring'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Penilaian & Skor Komposit</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'announcements'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Pengumuman Hasil & SKL</span>
          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
            {announcements.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Sesi Ujian & Penjadwalan */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Jadwal Sesi Ujian Masuk
              </h2>
              <p className="text-xs text-slate-500">
                Kelola ruang, kapasitas peserta, waktu dan pengawas ujian tes seleksi PSB.
              </p>
            </div>
            <button
              onClick={() => {
                setSessionForm({
                  id: null,
                  psb_test_id: tests[0]?.id || '',
                  session_name: '',
                  session_date: new Date().toISOString().split('T')[0],
                  start_time: '08:00',
                  end_time: '10:00',
                  room_location: 'Gedung Utama Lt. 2',
                  quota: 30,
                  proctor_name: ''
                });
                setSessionModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sesi Ujian</span>
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Belum Ada Sesi Ujian"
              description="Tambahkan sesi jadwal ujian untuk mengalokasikan calon santri/murid ke ruang ujian."
              actionLabel="Tambah Sesi Sekarang"
              onAction={() => setSessionModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        {sess.test_name || 'Ujian Seleksi'}
                      </span>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-1">
                        {sess.session_name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {sess.total_participants || 0} / {sess.quota || 30}
                      </span>
                      <p className="text-[10px] text-slate-400">Kapasitas</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(sess.session_date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sess.start_time} - {sess.end_time} WIB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sess.room_location || 'Ruang Belum Diatur'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pengawas: {sess.proctor_name || '-'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">
                      Sisa Kuota: {Math.max(0, (sess.quota || 30) - (sess.total_participants || 0))}
                    </span>
                    <button
                      onClick={() => {
                        setSessionForm({
                          id: sess.id,
                          psb_test_id: sess.psb_test_id,
                          session_name: sess.session_name,
                          session_date: sess.session_date,
                          start_time: sess.start_time,
                          end_time: sess.end_time,
                          room_location: sess.room_location,
                          quota: sess.quota,
                          proctor_name: sess.proctor_name
                        });
                        setSessionModalOpen(true);
                      }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      Edit Sesi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Master Tes & Bobot */}
      {/* ========================================================================= */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Master Mata Uji Seleksi Masuk
              </h2>
              <p className="text-xs text-slate-500">
                Daftar mata uji, jenis tes, persentase bobot nilai, dan passing grade minimal.
              </p>
            </div>
            <button
              onClick={() => {
                setTestForm({
                  id: null,
                  psb_program_id: selectedProgramId,
                  test_name: '',
                  test_type: 'akademik',
                  weight: 25,
                  passing_grade: 70,
                  max_score: 100,
                  description: ''
                });
                setTestModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mata Uji</span>
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : tests.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Belum Ada Mata Uji"
              description="Konfigurasikan mata uji (misal: Tes Potensi Akademik, Baca Tulis Quran, Wawancara Ortu) untuk program ini."
              actionLabel="Tambah Mata Uji"
              onAction={() => setTestModalOpen(true)}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nama Mata Uji</th>
                    <th className="py-3 px-4">Jenis Tes</th>
                    <th className="py-3 px-4 text-center">Bobot Nilai</th>
                    <th className="py-3 px-4 text-center">Passing Grade</th>
                    <th className="py-3 px-4 text-center">Skor Maksimal</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {t.test_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {t.test_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {t.weight}%
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {t.passing_grade}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                        {t.max_score}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {t.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setTestForm({
                              id: t.id,
                              psb_program_id: t.psb_program_id,
                              test_name: t.test_name,
                              test_type: t.test_type,
                              weight: t.weight,
                              passing_grade: t.passing_grade,
                              max_score: t.max_score,
                              description: t.description || ''
                            });
                            setTestModalOpen(true);
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(t.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Total Bobot Terdaftar:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {tests.reduce((acc, curr) => acc + Number(curr.weight || 0), 0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Penilaian & Skor Komposit */}
      {/* ========================================================================= */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Penilaian Ujian & Skor Terbobot
              </h2>
              <p className="text-xs text-slate-500">
                Input nilai dari setiap penguji sesi, periksa pemenuhan passing grade, dan lihat kartu peserta ujian.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={scoringSearch}
                onChange={(e) => setScoringSearch(e.target.value)}
                placeholder="Cari No. Reg / Nama Peserta..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No. Registrasi</th>
                    <th className="py-3 px-4">Nama Lengkap & NISN</th>
                    <th className="py-3 px-4 text-center">Gender</th>
                    <th className="py-3 px-4 text-center">Status Berkas</th>
                    <th className="py-3 px-4 text-center">Status Bayar Reg</th>
                    <th className="py-3 px-4 text-center">Skor Akhir</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scoringList
                    .filter((r) => {
                      if (!scoringSearch) return true;
                      const q = scoringSearch.toLowerCase();
                      return (
                        r.registration_number?.toLowerCase().includes(q) ||
                        r.full_name?.toLowerCase().includes(q) ||
                        r.nisn?.includes(q)
                      );
                    })
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.registration_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {r.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400">NISN: {r.nisn || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.gender === 'L'
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                            }`}
                          >
                            {r.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusPill status={r.documents_verified ? 'verified' : 'pending'} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusPill status={r.payment_status || 'unpaid'} />
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-100">
                          {r.composite_score ? (
                            <span className="text-emerald-600 font-extrabold text-sm">
                              {Number(r.composite_score).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum Dinilai</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenExamCard(r.id)}
                            title="Lihat / Cetak Kartu Ujian"
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">Kartu Ujian</span>
                          </button>
                          <button
                            onClick={() => handleOpenScoringModal(r)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold shadow-sm inline-flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Input Nilai</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Pengumuman Kelulusan & SKL */}
      {/* ========================================================================= */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Pengumuman Hasil Seleksi & Surat Keterangan Lulus (SKL)
              </h2>
              <p className="text-xs text-slate-500">
                Tentukan status akhir peserta (Lulus, Cadangan, Tidak Lulus) dan cetak SKL resmi.
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={announcementFilter}
                onChange={(e) => setAnnouncementFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="lulus">Lulus / Diterima</option>
                <option value="cadangan">Cadangan</option>
                <option value="tidak_lulus">Tidak Lulus</option>
                <option value="menunggu">Menunggu Keputusan</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Belum Ada Data Pengumuman"
              description="Data pengumuman akan terisi setelah peserta mengikuti tes seleksi dan dinilai."
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No. Registrasi</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4 text-center">Skor Komposit</th>
                    <th className="py-3 px-4 text-center">Peringkat</th>
                    <th className="py-3 px-4 text-center">Keputusan Akhir</th>
                    <th className="py-3 px-4">Catatan Keputusan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {announcements
                    .filter((a) =>
                      announcementFilter === 'all' ? true : a.final_decision === announcementFilter
                    )
                    .map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.registration_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {item.full_name}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {item.composite_score ? Number(item.composite_score).toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          #{item.rank || idx + 1}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.final_decision === 'lulus'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.final_decision === 'cadangan'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : item.final_decision === 'tidak_lulus'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {item.final_decision || 'Menunggu'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {item.decision_notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenDecisionModal(item)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold"
                          >
                            Keputusan
                          </button>
                          <button
                            onClick={() => handleOpenSkl(item.registrant_id || item.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold shadow-sm inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Lihat SKL</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Sesi Ujian Form */}
      {/* ========================================================================= */}
      <Modal
        isOpen={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title={sessionForm.id ? 'Edit Sesi Ujian' : 'Tambah Sesi Ujian Baru'}
      >
        <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mata Uji Terkait
            </label>
            <select
              value={sessionForm.psb_test_id}
              onChange={(e) => setSessionForm({ ...sessionForm, psb_test_id: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            >
              <option value="">-- Pilih Mata Uji --</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.test_name} ({t.test_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Sesi
            </label>
            <input
              type="text"
              value={sessionForm.session_name}
              onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
              placeholder="Contoh: Sesi Pagi - Gelombang 1"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pelaksanaan
              </label>
              <input
                type="date"
                value={sessionForm.session_date}
                onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kapasitas / Kuota
              </label>
              <input
                type="number"
                value={sessionForm.quota}
                onChange={(e) => setSessionForm({ ...sessionForm, quota: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Mulai
              </label>
              <input
                type="text"
                value={sessionForm.start_time}
                onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                placeholder="08:00"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jam Selesai
              </label>
              <input
                type="text"
                value={sessionForm.end_time}
                onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                placeholder="10:00"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ruang / Lokasi
            </label>
            <input
              type="text"
              value={sessionForm.room_location}
              onChange={(e) => setSessionForm({ ...sessionForm, room_location: e.target.value })}
              placeholder="Contoh: Lab Komputer 1 / Ruang Kelas 7A"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pengawas / Penguji
            </label>
            <input
              type="text"
              value={sessionForm.proctor_name}
              onChange={(e) => setSessionForm({ ...sessionForm, proctor_name: e.target.value })}
              placeholder="Contoh: Ust. Ahmad / Bu Siti"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSessionModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded"
            >
              Simpan Sesi
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Master Tes Form */}
      {/* ========================================================================= */}
      <Modal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        title={testForm.id ? 'Edit Mata Uji' : 'Tambah Mata Uji Baru'}
      >
        <form onSubmit={handleSaveTest} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Mata Uji
            </label>
            <input
              type="text"
              value={testForm.test_name}
              onChange={(e) => setTestForm({ ...testForm, test_name: e.target.value })}
              placeholder="Contoh: Tes Membaca Al-Qur'an & Tajwid"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori / Jenis Tes
              </label>
              <select
                value={testForm.test_type}
                onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              >
                <option value="akademik">Akademik</option>
                <option value="alquran">Al-Qur'an / Tahfidz</option>
                <option value="wawancara">Wawancara Calon Siswa & Ortu</option>
                <option value="psikotes">Psikotes / Potensi</option>
                <option value="kesehatan">Kesehatan</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bobot Nilai (%)
              </label>
              <input
                type="number"
                value={testForm.weight}
                onChange={(e) => setTestForm({ ...testForm, weight: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                min="1"
                max="100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Passing Grade Minimal
              </label>
              <input
                type="number"
                value={testForm.passing_grade}
                onChange={(e) => setTestForm({ ...testForm, passing_grade: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                min="0"
                max="100"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Skor Maksimal
              </label>
              <input
                type="number"
                value={testForm.max_score}
                onChange={(e) => setTestForm({ ...testForm, max_score: Number(e.target.value) })}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi / Kriteria Penilaian
            </label>
            <textarea
              value={testForm.description}
              onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
              rows="3"
              placeholder="Rubrik penilaian atau materi yang diujikan..."
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTestModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded"
            >
              Simpan Mata Uji
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Input Nilai & Ringkasan Penilaian */}
      {/* ========================================================================= */}
      <Modal
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        title={`Input Nilai Ujian: ${selectedScoringRegistrant?.full_name || ''}`}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Header Data Peserta */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg flex justify-between items-center">
            <div>
              <span className="font-mono text-emerald-600 font-bold">
                {selectedScoringRegistrant?.registration_number}
              </span>
              <p className="text-slate-500">
                NISN: {selectedScoringRegistrant?.nisn || '-'} | Asal Sekolah:{' '}
                {selectedScoringRegistrant?.previous_school_name || '-'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400">Skor Komposit Saat Ini</span>
              <div className="text-lg font-black text-emerald-600">
                {registrantSummary?.composite_score
                  ? Number(registrantSummary.composite_score).toFixed(2)
                  : '-'}
              </div>
            </div>
          </div>

          {/* Form Tambah Nilai */}
          <form
            onSubmit={handleSubmitScore}
            className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg space-y-3"
          >
            <div className="font-bold text-slate-800 dark:text-slate-200">
              Form Penilaian Sesi Ujian
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Sesi Ujian
                </label>
                <select
                  value={scoreInputForm.sessionId}
                  onChange={(e) => setScoreInputForm({ ...scoreInputForm, sessionId: e.target.value })}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                  required
                >
                  <option value="">-- Sesi Ujian --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.session_name} ({s.test_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Skor Perolehan (0 - 100)
                </label>
                <input
                  type="number"
                  value={scoreInputForm.score}
                  onChange={(e) => setScoreInputForm({ ...scoreInputForm, score: e.target.value })}
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-bold text-emerald-600"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kelulusan Sesi Ini
                </label>
                <select
                  value={scoreInputForm.is_passed ? '1' : '0'}
                  onChange={(e) =>
                    setScoreInputForm({ ...scoreInputForm, is_passed: e.target.value === '1' })
                  }
                  className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-semibold"
                >
                  <option value="1">Lulus Passing Grade</option>
                  <option value="0">Tidak Lulus Passing Grade</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Penguji / Feedback
              </label>
              <input
                type="text"
                value={scoreInputForm.notes}
                onChange={(e) => setScoreInputForm({ ...scoreInputForm, notes: e.target.value })}
                placeholder="Contoh: Makhraj huruf sangat baik, tajwid lancar"
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm"
              >
                Simpan & Update Nilai Sesi
              </button>
            </div>
          </form>

          {/* Rincian Nilai per Mata Uji */}
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">
              Daftar Nilai per Mata Uji Terdaftar:
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2 px-3">Mata Uji</th>
                    <th className="py-2 px-3 text-center">Bobot</th>
                    <th className="py-2 px-3 text-center">Nilai</th>
                    <th className="py-2 px-3 text-center">Passing Grade</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3">Penguji / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {registrantSummary?.scores?.length > 0 ? (
                    registrantSummary.scores.map((s, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {s.test_name}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-500">{s.weight}%</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-600">
                          {s.score}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-500">{s.passing_grade}</td>
                        <td className="py-2 px-3 text-center">
                          {s.score >= s.passing_grade ? (
                            <span className="text-emerald-600 font-bold text-[10px]">Lulus</span>
                          ) : (
                            <span className="text-rose-600 font-bold text-[10px]">Di Bawah PG</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{s.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-3 text-center text-slate-400 italic">
                        Belum ada nilai ujian yang diinput.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Keputusan Kelulusan */}
      {/* ========================================================================= */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title="Tetapkan Keputusan Hasil Seleksi"
      >
        <form onSubmit={handleSaveDecision} className="space-y-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
            <div className="font-bold text-slate-800 dark:text-slate-100">
              {selectedAnnouncement?.full_name}
            </div>
            <div className="text-slate-500">
              No. Reg: {selectedAnnouncement?.registration_number} | Skor Komposit:{' '}
              <span className="font-bold text-emerald-600">
                {selectedAnnouncement?.composite_score
                  ? Number(selectedAnnouncement.composite_score).toFixed(2)
                  : '-'}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Status Keputusan Akhir
            </label>
            <select
              value={decisionForm.decision}
              onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-bold"
              required
            >
              <option value="lulus">LULUS / DITERIMA</option>
              <option value="cadangan">CADANGAN</option>
              <option value="tidak_lulus">TIDAK LULUS</option>
              <option value="menunggu">MENUNGGU KEPUTUSAN</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Catatan / Arahan Panitia
            </label>
            <textarea
              value={decisionForm.notes}
              onChange={(e) => setDecisionForm({ ...decisionForm, notes: e.target.value })}
              rows="3"
              placeholder="Contoh: Diterima di Gelombang 1. Wajib daftar ulang dan menyelesaikan uang pangkal sebelum batas waktu."
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDecisionModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded"
            >
              Simpan Keputusan
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Cetak / Preview Kartu Peserta Ujian */}
      {/* ========================================================================= */}
      <Modal
        isOpen={examCardModalOpen}
        onClose={() => setExamCardModalOpen(false)}
        title="Kartu Peserta Ujian Seleksi Masuk"
        size="md"
      >
        <div className="space-y-4 text-xs">
          {examCardData ? (
            <div className="border-2 border-emerald-700 rounded-xl p-5 bg-white text-slate-800 space-y-4 shadow-sm">
              {/* Kop Kartu */}
              <div className="border-b-2 border-emerald-800 pb-3 text-center">
                <div className="font-extrabold text-sm uppercase tracking-wider text-emerald-800">
                  YAYASAN ALDEPOS SALAFIYAH
                </div>
                <div className="font-bold text-xs uppercase tracking-tight text-slate-700">
                  KARTU TANDA PESERTA SELEKSI PENERIMAAN SISWA BARU
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Tahun Ajaran {examCardData.academic_year_name || '2026/2027'} -{' '}
                  {examCardData.unit_name || 'Satuan Pendidikan'}
                </div>
              </div>

              {/* Data Peserta */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="col-span-2 space-y-1.5">
                  <div className="flex">
                    <span className="w-28 text-slate-500">No. Registrasi:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {examCardData.registration_number}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Nama Lengkap:</span>
                    <span className="font-bold">{examCardData.full_name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">NISN / Gender:</span>
                    <span>
                      {examCardData.nisn || '-'} ({examCardData.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Asal Sekolah:</span>
                    <span>{examCardData.previous_school_name || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500">Jalur / Gelombang:</span>
                    <span className="font-semibold text-slate-700">{examCardData.wave_name || 'Gelombang 1'}</span>
                  </div>
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center border border-dashed border-slate-300 p-3 rounded-lg bg-slate-50">
                  <div className="w-20 h-24 border border-slate-300 flex items-center justify-center text-slate-400 text-[10px] bg-white">
                    Pasfoto 3x4
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">Stempel Panitia</span>
                </div>
              </div>

              {/* Jadwal Sesi */}
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                <div className="font-bold text-emerald-900 text-[11px] mb-1">Jadwal Sesi Ujian:</div>
                <div className="text-[10px] space-y-0.5 text-emerald-800">
                  <div>Hari/Tanggal: <strong>{examCardData.session_date ? new Date(examCardData.session_date).toLocaleDateString('id-ID', { dateStyle: 'full' }) : 'Sesuai Jadwal Gelombang'}</strong></div>
                  <div>Waktu: <strong>{examCardData.start_time || '08:00'} - {examCardData.end_time || '11:00'} WIB</strong></div>
                  <div>Ruang: <strong>{examCardData.room_location || 'Gedung Utama Lt. 2'}</strong></div>
                </div>
              </div>

              {/* Catatan / Tata Tertib */}
              <div className="text-[9px] text-slate-500 border-t border-slate-200 pt-2 space-y-0.5">
                <div>1. Kartu ini wajib dibawa dan ditunjukkan saat mengikuti ujian seleksi masuk.</div>
                <div>2. Peserta wajib hadir 15 menit sebelum waktu ujian dimulai dengan pakaian rapi dan sopan.</div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic">Memuat data kartu peserta...</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setExamCardModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Tutup
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Surat Keterangan Lulus (SKL) Resmi */}
      {/* ========================================================================= */}
      <Modal
        isOpen={sklModalOpen}
        onClose={() => setSklModalOpen(false)}
        title="Surat Keterangan Lulus (SKL)"
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {sklData ? (
            <div className="border border-slate-300 p-6 rounded-lg bg-white text-slate-800 space-y-5 shadow-sm font-serif">
              {/* Kop Surat */}
              <div className="text-center border-b-2 border-slate-800 pb-3 space-y-1">
                <div className="text-sm font-bold tracking-widest text-slate-900 uppercase">
                  YAYASAN ALDEPOS SALAFIYAH BOGOR
                </div>
                <div className="text-xs font-semibold text-slate-700 uppercase">
                  PANITIA PENERIMAAN SISWA BARU (PSB)
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Jl. Raya Tapos No. 1, Tenjolaya, Bogor - Jawa Barat | Web: aldepos.sch.id
                </div>
              </div>

              {/* Judul & Nomor Surat */}
              <div className="text-center space-y-1">
                <div className="font-bold underline text-sm uppercase tracking-wide">
                  SURAT KETERANGAN LULUS SELEKSI
                </div>
                <div className="text-[10px] text-slate-600 font-sans font-mono">
                  Nomor: {sklData.letter_number || `SKL/PSB/${new Date().getFullYear()}/${sklData.registration_number}`}
                </div>
              </div>

              {/* Isi Surat */}
              <div className="space-y-3 font-sans text-xs leading-relaxed text-slate-700">
                <p>
                  Berdasarkan hasil tes seleksi masuk Penerimaan Siswa Baru (PSB) Yayasan Aldepos Salafiyah Tahun Ajaran {sklData.academic_year_name || '2026/2027'}, dengan ini Panitia Seleksi menerangkan bahwa:
                </p>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                  <div className="grid grid-cols-4">
                    <span className="text-slate-500">Nomor Registrasi</span>
                    <span className="col-span-3 font-bold font-mono text-emerald-700">
                      : {sklData.registration_number}
                    </span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="col-span-3 font-bold">: {sklData.full_name}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="text-slate-500">NISN</span>
                    <span className="col-span-3">: {sklData.nisn || '-'}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="text-slate-500">Asal Sekolah</span>
                    <span className="col-span-3">: {sklData.previous_school_name || '-'}</span>
                  </div>
                  <div className="grid grid-cols-4">
                    <span className="text-slate-500">Skor Akhir Komposit</span>
                    <span className="col-span-3 font-bold text-emerald-600">
                      : {sklData.composite_score ? Number(sklData.composite_score).toFixed(2) : '-'} (Peringkat #{sklData.rank || '1'})
                    </span>
                  </div>
                </div>

                <div className="p-3 text-center bg-emerald-50 border border-emerald-200 rounded">
                  <span className="text-xs uppercase text-slate-500 tracking-wider">Dinyatakan:</span>
                  <div className="text-base font-black text-emerald-800 tracking-widest mt-0.5">
                    {sklData.final_decision === 'lulus' ? 'LULUS / DITERIMA' : (sklData.final_decision?.toUpperCase() || 'CADANGAN')}
                  </div>
                </div>

                <p className="text-[11px] text-slate-600">
                  Kepada calon santri/siswa yang dinyatakan lulus diwajibkan untuk segera menyelesaikan registrasi ulang dan administrasi Uang Pangkal sesuai petunjuk panitia.
                </p>
              </div>

              {/* Tanda Tangan */}
              <div className="flex justify-end pt-4 font-sans text-xs">
                <div className="text-center space-y-12">
                  <div>
                    <div>Bogor, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
                    <div className="font-semibold text-slate-700">Ketua Panitia PSB Aldepos,</div>
                  </div>
                  <div className="font-bold underline text-slate-800">
                    ( Panitia PSB Aldepos )
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 italic">Memuat dokumen SKL...</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setSklModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Tutup
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak SKL</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
