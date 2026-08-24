import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Layers,
  HelpCircle,
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import api from '../../../../shared/services/api';
import { useToast } from '../../../../shared/components/Toast';

export default function BankSoal() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('questions'); // 'types', 'dimensions', 'questions', 'profiles'
  const [loading, setLoading] = useState(false);

  // Data states
  const [types, setTypes] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // Filter states
  const [selectedTypeId, setSelectedTypeId] = useState('1'); // 1 = MBTI default
  const [selectedDimensionId, setSelectedDimensionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [modalQuestionOpen, setModalQuestionOpen] = useState(false);
  const [modalProfileOpen, setModalProfileOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);

  // Form states
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    test_type_id: 1,
    dimension_id: '',
    question_code: '',
    question_text: '',
    question_type: 'forced_choice',
    scoring_direction: 'normal',
    option_a_text: '',
    option_a_pole: 'E',
    option_b_text: '',
    option_b_pole: 'I',
    order_number: 1,
    is_active: true
  });

  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    profile_label: '',
    description_text: '',
    strengths_text: '',
    weaknesses_text: '',
    hrd_recommendation_text: '',
    suitable_roles: ''
  });

  // 1. Fetch Types & Dimensions on Load
  useEffect(() => {
    fetchTypes();
    fetchDimensions();
  }, []);

  // 2. Fetch specific tab data
  useEffect(() => {
    if (activeTab === 'questions') {
      fetchQuestions();
    } else if (activeTab === 'profiles') {
      fetchProfiles();
    }
  }, [activeTab, selectedTypeId, selectedDimensionId]);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kepegawaian/psychotest/types');
      if (res.data?.success) {
        setTypes(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat tipe tes psikologi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDimensions = async () => {
    try {
      const res = await api.get('/kepegawaian/psychotest/dimensions');
      if (res.data?.success) {
        setDimensions(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      let url = `/kepegawaian/psychotest/questions?test_type_id=${selectedTypeId}`;
      if (selectedDimensionId) {
        url += `&dimension_id=${selectedDimensionId}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setQuestions(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat bank soal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kepegawaian/psychotest/profiles?test_type_id=${selectedTypeId}`);
      if (res.data?.success) {
        setProfiles(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat profil interpretasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Question Create / Edit Submit
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...questionForm,
        test_type_id: parseInt(selectedTypeId, 10),
        dimension_id: parseInt(questionForm.dimension_id, 10),
        order_number: parseInt(questionForm.order_number || 1, 10)
      };

      if (editingQuestion) {
        await api.put(`/kepegawaian/psychotest/questions/${editingQuestion.id}`, payload);
        showToast('Butir soal psikotes berhasil diperbarui', 'success');
      } else {
        await api.post('/kepegawaian/psychotest/questions', payload);
        showToast('Butir soal baru berhasil ditambahkan ke bank soal', 'success');
      }

      setModalQuestionOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan butir soal', 'error');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus butir soal ini?')) return;
    try {
      await api.delete(`/kepegawaian/psychotest/questions/${id}`);
      showToast('Butir soal berhasil dihapus', 'success');
      fetchQuestions();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menghapus butir soal', 'error');
    }
  };

  // Handle Profile Update Submit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/kepegawaian/psychotest/profiles/${editingProfile.id}`, profileForm);
      showToast('Deskripsi profil interpretasi HRD berhasil diperbarui', 'success');
      setModalProfileOpen(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memperbarui profil', 'error');
    }
  };

  const openAddQuestion = () => {
    const dimList = dimensions.filter((d) => d.test_type_id === parseInt(selectedTypeId, 10));
    setEditingQuestion(null);
    setQuestionForm({
      test_type_id: parseInt(selectedTypeId, 10),
      dimension_id: dimList[0]?.id || '',
      question_code: '',
      question_text: '',
      question_type: selectedTypeId === '1' ? 'forced_choice' : 'likert_5',
      scoring_direction: 'normal',
      option_a_text: '',
      option_a_pole: 'E',
      option_b_text: '',
      option_b_pole: 'I',
      order_number: questions.length + 1,
      is_active: true
    });
    setModalQuestionOpen(true);
  };

  const openEditQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionForm({
      test_type_id: q.test_type_id,
      dimension_id: q.dimension_id,
      question_code: q.question_code || '',
      question_text: q.question_text,
      question_type: q.question_type,
      scoring_direction: q.scoring_direction,
      option_a_text: q.option_a_text || '',
      option_a_pole: q.option_a_pole || 'E',
      option_b_text: q.option_b_text || '',
      option_b_pole: q.option_b_pole || 'I',
      order_number: q.order_number,
      is_active: Boolean(q.is_active)
    });
    setModalQuestionOpen(true);
  };

  const openEditProfile = (p) => {
    setEditingProfile(p);
    setProfileForm({
      profile_label: p.profile_label || '',
      description_text: p.description_text || '',
      strengths_text: p.strengths_text || '',
      weaknesses_text: p.weaknesses_text || '',
      hrd_recommendation_text: p.hrd_recommendation_text || '',
      suitable_roles: p.suitable_roles || ''
    });
    setModalProfileOpen(true);
  };

  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      q.question_text?.toLowerCase().includes(s) ||
      q.question_code?.toLowerCase().includes(s) ||
      q.dimension_name?.toLowerCase().includes(s)
    );
  });

  const currentType = types.find((t) => String(t.id) === String(selectedTypeId)) || types[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Bank Soal & Instrumen Psikotes</h1>
          </div>
          <p className="text-sm text-slate-500">
            Kelola instrumen tipologi MBTI, trait kepribadian Big Five (OCEAN), dimensi, dan profil rekomendasi HRD.
          </p>
        </div>

        {/* Test Type Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTypeId(String(t.id));
                setSelectedDimensionId('');
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                String(selectedTypeId) === String(t.id)
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.code === 'mbti' ? 'MBTI (4 Sumbu)' : 'Big Five (OCEAN)'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'questions'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Bank Butir Soal ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('dimensions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'dimensions'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Dimensi & Sumbu Trait
        </button>
        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'profiles'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Profil & Rekomendasi HRD ({profiles.length})
        </button>
      </div>

      {/* TAB CONTENT: 1. QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari teks soal atau kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedDimensionId}
                onChange={(e) => setSelectedDimensionId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="">Semua Dimensi / Trait</option>
                {dimensions
                  .filter((d) => d.test_type_id === parseInt(selectedTypeId, 10))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={openAddQuestion}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all w-full sm:w-auto justify-center shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Butir Soal
            </button>
          </div>

          {/* Questions Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-28">Kode & Tipe</th>
                    <th className="py-3 px-4 w-44">Dimensi / Sumbu</th>
                    <th className="py-3 px-4">Teks Pertanyaan & Opsi Pilihan</th>
                    <th className="py-3 px-4 w-24 text-center">Status</th>
                    <th className="py-3 px-4 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Memuat data butir soal...
                      </td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada butir soal yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q, idx) => (
                      <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-indigo-600 block">{q.question_code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-medium">
                            {q.question_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{q.dimension_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Kode: {q.dimension_code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 line-clamp-2 mb-1">{q.question_text}</p>
                          {q.question_type === 'forced_choice' && (
                            <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                              <span className="line-clamp-1">
                                <strong className="text-emerald-700">A [{q.option_a_pole}]:</strong> {q.option_a_text}
                              </span>
                              <span className="line-clamp-1">
                                <strong className="text-indigo-700">B [{q.option_b_pole}]:</strong> {q.option_b_text}
                              </span>
                            </div>
                          )}
                          {q.question_type === 'likert_5' && (
                            <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Skala Likert 1-5 {q.scoring_direction === 'reverse' ? '(Reverse Coded)' : '(Normal)'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {q.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewQuestion(q)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Pratinjau Butir"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditQuestion(q)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit Soal"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* TAB CONTENT: 2. DIMENSIONS */}
      {activeTab === 'dimensions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions
            .filter((d) => d.test_type_id === parseInt(selectedTypeId, 10))
            .map((dim) => (
              <div key={dim.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                      Dimensi: {dim.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{dim.name}</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Urutan #{dim.order_number}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{dim.description}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 block">
                      Kutub Positif [{dim.pole_positive_code || '+'}]
                    </span>
                    <p className="text-xs font-semibold text-emerald-900">{dim.pole_positive_label}</p>
                  </div>
                  <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-800 block">
                      Kutub Negatif [{dim.pole_negative_code || '-'}]
                    </span>
                    <p className="text-xs font-semibold text-indigo-900">{dim.pole_negative_label}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* TAB CONTENT: 3. PROFILES */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                    {p.profile_code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{p.profile_label}</h3>
                </div>
                <button
                  onClick={() => openEditProfile(p)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title="Edit Deskripsi & Rekomendasi"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deskripsi Karakter</span>
                  <p className="text-slate-700 leading-relaxed mt-0.5">{p.description_text}</p>
                </div>

                {p.strengths_text && (
                  <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-800 block">Kekuatan Utama</span>
                    <p className="text-slate-700 mt-0.5">{p.strengths_text}</p>
                  </div>
                )}

                {p.hrd_recommendation_text && (
                  <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-800 block">Rekomendasi HRD & Penempatan</span>
                    <p className="text-slate-700 mt-0.5">{p.hrd_recommendation_text}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Tambah / Edit Butir Soal */}
      {modalQuestionOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingQuestion ? 'Edit Butir Soal Psikotes' : 'Tambah Butir Soal Baru'}
              </h3>
              <button
                onClick={() => setModalQuestionOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dimensi / Trait Target *</label>
                  <select
                    value={questionForm.dimension_id}
                    onChange={(e) => setQuestionForm({ ...questionForm, dimension_id: e.target.value })}
                    required
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Pilih Dimensi</option>
                    {dimensions
                      .filter((d) => d.test_type_id === parseInt(selectedTypeId, 10))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Butir Soal</label>
                  <input
                    type="text"
                    placeholder="mis. MBTI_EI_11"
                    value={questionForm.question_code}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_code: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Teks Pertanyaan / Pernyataan *</label>
                <textarea
                  rows={3}
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  required
                  placeholder="Tuliskan stimulus pertanyaan atau situasi..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                />
              </div>

              {selectedTypeId === '1' ? (
                // MBTI Forced Choice Options
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-emerald-800">Opsi Pilihan A *</label>
                      <select
                        value={questionForm.option_a_pole}
                        onChange={(e) => setQuestionForm({ ...questionForm, option_a_pole: e.target.value })}
                        className="text-[10px] p-1 border border-emerald-300 rounded bg-emerald-50 text-emerald-900 font-bold"
                      >
                        <option value="E">Kutub E</option>
                        <option value="S">Kutub S</option>
                        <option value="T">Kutub T</option>
                        <option value="J">Kutub J</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={questionForm.option_a_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_a_text: e.target.value })}
                      required
                      placeholder="Pernyataan Opsi A..."
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-indigo-800">Opsi Pilihan B *</label>
                      <select
                        value={questionForm.option_b_pole}
                        onChange={(e) => setQuestionForm({ ...questionForm, option_b_pole: e.target.value })}
                        className="text-[10px] p-1 border border-indigo-300 rounded bg-indigo-50 text-indigo-900 font-bold"
                      >
                        <option value="I">Kutub I</option>
                        <option value="N">Kutub N</option>
                        <option value="F">Kutub F</option>
                        <option value="P">Kutub P</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={questionForm.option_b_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_b_text: e.target.value })}
                      required
                      placeholder="Pernyataan Opsi B..."
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              ) : (
                // Big Five Scoring Direction
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="font-semibold text-slate-700 block mb-1">Arah Skoring Psikometri (Likert 1-5)</label>
                  <select
                    value={questionForm.scoring_direction}
                    onChange={(e) => setQuestionForm({ ...questionForm, scoring_direction: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="normal">Normal (Nilai 5 = Sangat Tinggi / Positif)</option>
                    <option value="reverse">Reverse Coded (Nilai dibalik: 1 menjadi 5, 5 menjadi 1)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionForm.is_active}
                    onChange={(e) => setQuestionForm({ ...questionForm, is_active: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Aktifkan butir soal ini</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalQuestionOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
                  >
                    Simpan Butir Soal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Profile & Rekomendasi */}
      {modalProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">
                  Kode: {editingProfile?.profile_code}
                </span>
                <h3 className="text-base font-bold text-slate-900">Edit Deskripsi Profil Interpretasi HRD</h3>
              </div>
              <button
                onClick={() => setModalProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul / Label Profil *</label>
                <input
                  type="text"
                  value={profileForm.profile_label}
                  onChange={(e) => setProfileForm({ ...profileForm, profile_label: e.target.value })}
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Naratif Karakter *</label>
                <textarea
                  rows={3}
                  value={profileForm.description_text}
                  onChange={(e) => setProfileForm({ ...profileForm, description_text: e.target.value })}
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kekuatan & Keunggulan</label>
                <textarea
                  rows={2}
                  value={profileForm.strengths_text}
                  onChange={(e) => setProfileForm({ ...profileForm, strengths_text: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Area Pengembangan / Kelemahan</label>
                <textarea
                  rows={2}
                  value={profileForm.weaknesses_text}
                  onChange={(e) => setProfileForm({ ...profileForm, weaknesses_text: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rekomendasi HRD & Penempatan Tugas *</label>
                <textarea
                  rows={2}
                  value={profileForm.hrd_recommendation_text}
                  onChange={(e) => setProfileForm({ ...profileForm, hrd_recommendation_text: e.target.value })}
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalProfileOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Preview Butir Soal */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {previewQuestion.question_code}
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Dimensi: {previewQuestion.dimension_name}
              </span>
              <p className="text-sm font-semibold text-slate-900">{previewQuestion.question_text}</p>

              {previewQuestion.question_type === 'forced_choice' && (
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 block">
                      Opsi A (Kutub {previewQuestion.option_a_pole}):
                    </span>
                    <p className="text-xs text-slate-800 mt-0.5">{previewQuestion.option_a_text}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-800 block">
                      Opsi B (Kutub {previewQuestion.option_b_pole}):
                    </span>
                    <p className="text-xs text-slate-800 mt-0.5">{previewQuestion.option_b_text}</p>
                  </div>
                </div>
              )}

              {previewQuestion.question_type === 'likert_5' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 block mb-2">Pilihan Respons Peserta (Skala 1 - 5)</span>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                    <span>1: Sangat Tidak Setuju</span>
                    <span>3: Netral</span>
                    <span>5: Sangat Setuju</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
