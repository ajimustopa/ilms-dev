import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Save,
  X,
  Sparkles,
  Layers,
  FileText,
  Loader2
} from 'lucide-react';

export default function TujuanPembelajaran() {
  const { activeSchoolUnit } = useAuth();

  const [selectedSubject, setSelectedSubject] = useState('Matematika Terapan');
  const [selectedGrade, setSelectedGrade] = useState('Kelas 8');
  const [selectedSemester, setSelectedSemester] = useState('Genap');
  const [searchQuery, setSearchQuery] = useState('');

  const [learningObjectives, setLearningObjectives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    scope_material: '',
    semester: 'Genap',
    grade_level: 'Kelas 8'
  });

  // Load Learning Objectives
  useEffect(() => {
    const fetchTP = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/akademik/curriculum/learning-objectives', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id }
        }).catch(() => null);

        const list = res?.data?.data?.items || res?.data?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setLearningObjectives(list);
        } else {
          // Dummy data Tujuan Pembelajaran Kurikulum Merdeka
          setLearningObjectives([
            {
              id: 1,
              code: 'TP.8.1',
              description: 'Memahami konsep sistem persamaan linear dua variabel dan menyelesaikannya dengan metode grafik & substitusi.',
              scope_material: 'SPLDV & Aljabar',
              subject_name: 'Matematika Terapan',
              grade_level: 'Kelas 8',
              semester: 'Genap'
            },
            {
              id: 2,
              code: 'TP.8.2',
              description: 'Menganalisis hubungan sudut-sudut pada bidang geometri dan menghitung luas lingkaran serta bangun ruang.',
              scope_material: 'Geometri & Pengukuran',
              subject_name: 'Matematika Terapan',
              grade_level: 'Kelas 8',
              semester: 'Genap'
            },
            {
              id: 3,
              code: 'TP.8.3',
              description: 'Menyajikan dan menginterpretasi data statistik dalam bentuk diagram batang, garis, dan menghitung ukuran pemusatan data (Mean, Median, Modus).',
              scope_material: 'Statistika & Peluang',
              subject_name: 'Matematika Terapan',
              grade_level: 'Kelas 8',
              semester: 'Genap'
            },
            {
              id: 4,
              code: 'TP.7.1',
              description: 'Menjelaskan konsep bilangan bulat positif dan negatif serta menerapkannya dalam operasi hitung campuran.',
              scope_material: 'Bilangan Bulat',
              subject_name: 'Matematika Terapan',
              grade_level: 'Kelas 7',
              semester: 'Genap'
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching learning objectives:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTP();
  }, [activeSchoolUnit]);

  // Open Modal (Add / Edit)
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code || '',
        description: item.description || '',
        scope_material: item.scope_material || '',
        semester: item.semester || selectedSemester,
        grade_level: item.grade_level || selectedGrade
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: `TP.8.${learningObjectives.length + 1}`,
        description: '',
        scope_material: '',
        semester: selectedSemester,
        grade_level: selectedGrade
      });
    }
    setIsModalOpen(true);
  };

  // Submit Form TP
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    try {
      if (editingItem) {
        // Update Local State
        setLearningObjectives((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...formData } : item))
        );
        setFeedback({ type: 'success', message: `Tujuan Pembelajaran ${formData.code} berhasil diperbarui.` });
      } else {
        // Create Local State
        const newItem = {
          id: Date.now(),
          ...formData,
          subject_name: selectedSubject
        };
        setLearningObjectives((prev) => [newItem, ...prev]);
        setFeedback({ type: 'success', message: `Tujuan Pembelajaran ${formData.code} berhasil ditambahkan.` });
      }
      setIsModalOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Gagal menyimpan Tujuan Pembelajaran.' });
    }
  };

  // Delete TP
  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Tujuan Pembelajaran ini?')) {
      setLearningObjectives((prev) => prev.filter((item) => item.id !== id));
      setFeedback({ type: 'success', message: 'Tujuan Pembelajaran berhasil dihapus.' });
    }
  };

  const filteredTP = learningObjectives.filter((tp) => {
    const matchSearch =
      (tp.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tp.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tp.scope_material || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Halaman */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Tujuan Pembelajaran (TP)</h1>
            <p className="text-xs text-slate-400">
              Perumusan Capaian & Tujuan Pembelajaran Kurikulum Merdeka untuk e-Rapor
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tujuan Pembelajaran</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Matematika Terapan">Matematika Terapan</option>
            <option value="Fisika Dasar">Fisika Dasar</option>
            <option value="Informatika & Coding">Informatika & Coding</option>
          </select>

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Kelas 7">Fase D (Kelas 7)</option>
            <option value="Kelas 8">Fase D (Kelas 8)</option>
            <option value="Kelas 9">Fase D (Kelas 9)</option>
          </select>
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode TP atau deskripsi..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* List Kartu TP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTP.map((item) => (
          <div
            key={item.id}
            className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 p-5 shadow-lg flex flex-col justify-between transition group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-black font-mono">
                  {item.code}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {item.scope_material || 'Lingkup Materi'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed group-hover:text-white transition">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                {item.grade_level || selectedGrade} • {item.semester || selectedSemester}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenModal(item)}
                  className="p-2 rounded-xl text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition"
                  title="Edit TP"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Hapus TP"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Tambah / Edit TP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Edit Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kode TP</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: TP.8.1"
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lingkup Materi</label>
                  <input
                    type="text"
                    required
                    value={formData.scope_material}
                    onChange={(e) => setFormData({ ...formData, scope_material: e.target.value })}
                    placeholder="Contoh: Aljabar / SPLDV"
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deskripsi Lengkap Tujuan Pembelajaran (TP)
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tuliskan rumusan kompetensi dan lingkup materi yang diharapkan dicapai peserta didik..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg transition"
                >
                  Simpan TP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
