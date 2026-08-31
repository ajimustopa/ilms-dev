import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  FileCheck2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
  Sparkles,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function PSBTests() {
  const { activeSchoolUnit } = useAuth();
  const [tests, setTests] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [groups, setGroups] = useState([]);
  const [registrants, setRegistrants] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test Builder Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testForm, setTestForm] = useState({
    psb_process_id: '',
    name: '',
    description: '',
    duration_minutes: 60,
    passing_score: 70,
    questions: [] // [{ question_type, question_text, options, correct_answer, score_weight }]
  });

  // Assign Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState('group'); // 'group' | 'registrant'
  const [assignForm, setAssignForm] = useState({
    psb_test_id: '',
    psb_group_id: '',
    psb_registrant_id: '',
    scheduled_at: ''
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (selectedProcessId) {
      fetchTests(selectedProcessId);
      fetchGroupsAndRegistrants(selectedProcessId);
    }
  }, [selectedProcessId, activeSchoolUnit]);

  const fetchProcesses = async () => {
    try {
      const res = await api.get('/akademik/psb-processes');
      const list = res.data?.data || [];
      setProcesses(list);
      if (list.length > 0) {
        const active = list.find((p) => p.status === 'open') || list[0];
        setSelectedProcessId(String(active.id));
      }
    } catch (err) {
      console.warn('Failed to load processes:', err);
    }
  };

  const fetchTests = async (procId) => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/psb-tests', { params: { psb_process_id: procId } });
      setTests(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load PSB tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupsAndRegistrants = async (procId) => {
    try {
      const [grpRes, regRes] = await Promise.all([
        api.get('/akademik/psb-groups', { params: { psb_process_id: procId } }),
        api.get('/akademik/psb-registrants', { params: { psb_process_id: procId, satuan_pendidikan_id: activeSchoolUnit?.id } })
      ]);
      setGroups(grpRes.data?.data || []);
      setRegistrants(regRes.data?.data || []);
    } catch (err) {
      console.warn('Failed to load groups/registrants:', err);
    }
  };

  const handleOpenTestModal = async (t = null) => {
    setErrorMsg('');
    if (t) {
      setEditingTestId(t.id);
      try {
        const detailRes = await api.get(`/akademik/psb-tests/${t.id}`);
        const full = detailRes.data?.data || t;
        setTestForm({
          psb_process_id: full.psb_process_id || selectedProcessId,
          name: full.name || '',
          description: full.description || '',
          duration_minutes: full.duration_minutes || 60,
          passing_score: full.passing_score || 70,
          questions: (full.questions || []).map((q) => ({
            id: q.id,
            question_type: q.question_type || 'multiple_choice',
            question_text: q.question_text || '',
            options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D']),
            correct_answer: q.correct_answer || '',
            score_weight: q.score_weight || 10
          }))
        });
      } catch (e) {
        setTestForm({
          psb_process_id: t.psb_process_id || selectedProcessId,
          name: t.name,
          description: t.description,
          duration_minutes: t.duration_minutes,
          passing_score: t.passing_score,
          questions: []
        });
      }
    } else {
      setEditingTestId(null);
      setTestForm({
        psb_process_id: selectedProcessId,
        name: 'Tes Potensi Akademik & Keagamaan',
        description: 'Ujian seleksi santri baru materi dasar bahasa arab, matematika, dan keislaman.',
        duration_minutes: 60,
        passing_score: 70,
        questions: [
          {
            question_type: 'multiple_choice',
            question_text: 'Berapakah rukun Islam yang wajib diyakini setiap muslim?',
            options: ['4 Rukun', '5 Rukun', '6 Rukun', '7 Rukun'],
            correct_answer: '5 Rukun',
            score_weight: 20
          },
          {
            question_type: 'fill_in_blank',
            question_text: 'Surat pembuka dalam mushaf Al-Qur\'an adalah surat ...',
            options: [],
            correct_answer: 'Al-Fatihah',
            score_weight: 20
          }
        ]
      });
    }
    setTestModalOpen(true);
  };

  const handleAddQuestion = (type = 'multiple_choice') => {
    setTestForm({
      ...testForm,
      questions: [
        ...testForm.questions,
        {
          question_type: type,
          question_text: '',
          options: type === 'multiple_choice' ? ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'] : [],
          correct_answer: '',
          score_weight: 10
        }
      ]
    });
  };

  const handleRemoveQuestion = (idx) => {
    const qList = [...testForm.questions];
    qList.splice(idx, 1);
    setTestForm({ ...testForm, questions: qList });
  };

  const handleQuestionChange = (idx, field, value) => {
    const qList = [...testForm.questions];
    qList[idx] = { ...qList[idx], [field]: value };
    setTestForm({ ...testForm, questions: qList });
  };

  const handleOptionChange = (qIdx, optIdx, val) => {
    const qList = [...testForm.questions];
    const opts = [...(qList[qIdx].options || [])];
    opts[optIdx] = val;
    qList[qIdx].options = opts;
    setTestForm({ ...testForm, questions: qList });
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      if (editingTestId) {
        await api.put(`/akademik/psb-tests/${editingTestId}`, testForm);
        setSuccessMsg('Formulir tes seleksi berhasil diperbarui!');
      } else {
        await api.post('/akademik/psb-tests', testForm);
        setSuccessMsg('Formulir tes seleksi baru berhasil dibuat!');
      }
      setTestModalOpen(false);
      fetchTests(selectedProcessId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan modul tes');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAssignModal = (testId) => {
    setAssignForm({
      psb_test_id: testId,
      psb_group_id: groups[0]?.id ? String(groups[0].id) : '',
      psb_registrant_id: registrants[0]?.id ? String(registrants[0].id) : '',
      scheduled_at: new Date().toISOString().slice(0, 16)
    });
    setAssignModalOpen(true);
  };

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        psb_test_id: Number(assignForm.psb_test_id),
        scheduled_at: assignForm.scheduled_at
      };
      if (assignTargetType === 'group') {
        payload.psb_group_id = Number(assignForm.psb_group_id);
      } else {
        payload.psb_registrant_id = Number(assignForm.psb_registrant_id);
      }

      const res = await api.post('/akademik/psb-test-sessions/assign', payload);
      setSuccessMsg(res.data?.message || 'Penugasan sesi tes berhasil dijadwalkan!');
      setAssignModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menjadwalkan tes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-2xl">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <span>Builder Tes & Ujian Seleksi PSB</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Buat bank soal ujian (pilihan ganda, isian, uraian essay), passing score, dan penugasan jadwal tes ke calon murid.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Proses PSB:</span>
            <select
              value={selectedProcessId}
              onChange={(e) => setSelectedProcessId(e.target.value)}
              className="text-xs font-bold text-teal-700 bg-transparent focus:outline-none"
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.target_academic_year})</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleOpenTestModal()}
            disabled={!selectedProcessId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-md shadow-teal-900/20 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tes Baru</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Test List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-10 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            <span>Memuat modul tes...</span>
          </div>
        ) : tests.length === 0 ? (
          <div className="col-span-2 py-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
            Belum ada formulir tes pada periode PSB ini. Klik "Buat Tes Baru" di atas.
          </div>
        ) : (
          tests.map((t) => (
            <div key={t.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-teal-500 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
                    Durasi: {t.duration_minutes} Menit
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Passing Grade: <strong className="text-teal-700">{t.passing_score} Poin</strong>
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t.description || 'Tidak ada deskripsi'}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenTestModal(t)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-600 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Soal & Bobot</span>
                </button>

                <button
                  onClick={() => handleOpenAssignModal(t.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Tugaskan Ujian</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Test Builder */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingTestId ? 'Edit Formulir & Bank Soal Tes' : 'Buat Modul Tes PSB Baru'}
              </h3>
              <button onClick={() => setTestModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitTest} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ujian / Tes *</label>
                  <input
                    type="text"
                    required
                    value={testForm.name}
                    onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    placeholder="Contoh: Tes Pemetaan Potensi Santri Baru"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Deskripsi / Petunjuk Pengerjaan</label>
                  <textarea
                    rows={2}
                    value={testForm.description}
                    onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durasi Pengerjaan (Menit) *</label>
                  <input
                    type="number"
                    min="5"
                    required
                    value={testForm.duration_minutes}
                    onChange={(e) => setTestForm({ ...testForm, duration_minutes: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ambang Batas Kelulusan (Passing Score) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={testForm.passing_score}
                    onChange={(e) => setTestForm({ ...testForm, passing_score: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Question Bank Items */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                    Daftar Butir Soal ({testForm.questions.length})
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('multiple_choice')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Pilihan Ganda</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('fill_in_blank')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Isian Singkat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('essay')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Uraian Essay</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {testForm.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-teal-700">Soal #{qIdx + 1} ({q.question_type.replace('_', ' ')})</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">Bobot:</span>
                            <input
                              type="number"
                              min="1"
                              value={q.score_weight}
                              onChange={(e) => handleQuestionChange(qIdx, 'score_weight', Number(e.target.value))}
                              className="w-14 rounded-lg border border-slate-300 p-1 text-center font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Teks Pertanyaan *</label>
                        <textarea
                          rows={2}
                          required
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                          placeholder="Tuliskan pertanyaan soal..."
                        />
                      </div>

                      {/* Multiple choice options */}
                      {q.question_type === 'multiple_choice' && (
                        <div className="space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-600">Pilihan Jawaban & Kunci Benar:</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct_q_${qIdx}`}
                                  checked={q.correct_answer === opt && !!opt}
                                  onChange={() => handleQuestionChange(qIdx, 'correct_answer', opt)}
                                  className="text-teal-600"
                                  title="Tandai sebagai kunci jawaban benar"
                                />
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                                  placeholder={`Opsi ${optIdx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fill in blank answer */}
                      {q.question_type === 'fill_in_blank' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kunci Jawaban Singkat:</label>
                          <input
                            type="text"
                            value={q.correct_answer}
                            onChange={(e) => handleQuestionChange(qIdx, 'correct_answer', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 p-2"
                            placeholder="Contoh: Al-Fatihah"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-900/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Simpan Modul Ujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assign Test */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Penugasan Jadwal Ujian Seleksi</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitAssign} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Penugasan *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignTargetType('group')}
                    className={`py-2 rounded-xl border text-xs font-bold transition ${
                      assignTargetType === 'group' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Seluruh Kelompok / Gelombang
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignTargetType('registrant')}
                    className={`py-2 rounded-xl border text-xs font-bold transition ${
                      assignTargetType === 'registrant' ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Per Calon Murid Spesifik
                  </button>
                </div>
              </div>

              {assignTargetType === 'group' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Gelombang *</label>
                  <select
                    value={assignForm.psb_group_id}
                    onChange={(e) => setAssignForm({ ...assignForm, psb_group_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Calon Murid *</label>
                  <select
                    value={assignForm.psb_registrant_id}
                    onChange={(e) => setAssignForm({ ...assignForm, psb_registrant_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5"
                  >
                    {registrants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.registration_number} - {r.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jadwal Pelaksanaan Ujian (Timestamp) *</label>
                <input
                  type="datetime-local"
                  required
                  value={assignForm.scheduled_at}
                  onChange={(e) => setAssignForm({ ...assignForm, scheduled_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-900/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Jadwalkan Tes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
