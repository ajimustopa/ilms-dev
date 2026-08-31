import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Filter,
  ShieldCheck,
  Building2,
  BookOpen
} from 'lucide-react';

export default function PSBPlacement() {
  const { activeSchoolUnit } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [classGroups, setClassGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Placement Modal State
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [placeForm, setPlaceForm] = useState({
    target_class_group_id: '',
    nipd: '',
    notes: ''
  });
  const [savingPlace, setSavingPlace] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProcesses();
    fetchClassGroups();
  }, [activeSchoolUnit]);

  useEffect(() => {
    if (selectedProcessId) {
      fetchCandidates(selectedProcessId);
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

  const fetchClassGroups = async () => {
    try {
      const res = await api.get('/akademik/class-groups', {
        params: { satuan_pendidikan_id: activeSchoolUnit?.id }
      });
      setClassGroups(res.data?.data || []);
    } catch (err) {
      console.warn('Failed to load class groups:', err);
    }
  };

  const fetchCandidates = async (procId) => {
    try {
      setLoading(true);
      // Ambil calon murid dengan status 'test_passed' atau 'registered'
      const res = await api.get('/akademik/psb-registrants', {
        params: {
          psb_process_id: procId,
          satuan_pendidikan_id: activeSchoolUnit?.id
        }
      });
      const all = res.data?.data || [];
      // Filter yang belum ditempatkan dan berhak ditempatkan (test_passed atau registered)
      const eligible = all.filter((r) => r.status === 'test_passed' || r.status === 'registered');
      setCandidates(eligible);
    } catch (err) {
      console.warn('Failed to load placement candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPlaceModal = (candidate) => {
    setSelectedCandidate(candidate);
    // Generate auto NIPD suggestion based on year and ID
    const yearPrefix = candidate.target_academic_year ? candidate.target_academic_year.split('/')[0].slice(-2) : '26';
    const suggestedNipd = `${yearPrefix}${String(candidate.id).padStart(4, '0')}`;

    setPlaceForm({
      target_class_group_id: classGroups[0]?.id ? String(classGroups[0].id) : '',
      nipd: suggestedNipd,
      notes: `Penempatan definitif santri baru tahun ajaran ${candidate.target_academic_year || '2026/2027'}`
    });
    setPlacementModalOpen(true);
  };

  const handleSubmitPlacement = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setSavingPlace(true);
    setErrorMsg('');

    try {
      await api.post(`/akademik/psb-registrants/${selectedCandidate.id}/place`, {
        target_class_group_id: Number(placeForm.target_class_group_id),
        nipd: placeForm.nipd.trim(),
        notes: placeForm.notes
      });

      setSuccessMsg(`Santri ${selectedCandidate.full_name} berhasil ditempatkan secara definitif!`);
      setPlacementModalOpen(false);
      fetchCandidates(selectedProcessId);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menempatkan santri ke rombel');
    } finally {
      setSavingPlace(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-2xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span>Penempatan Rombel Calon Murid (Placement)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Antrean calon santri yang lulus seleksi / berkas valid untuk diresmikan menjadi siswa aktif di rombongan belajar definitif.
          </p>
        </div>

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
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Candidates Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Antrean Siap Penempatan ({candidates.length} Calon Santri)
          </span>
          <span className="text-[11px] text-slate-400">
            Hanya menampilkan santri berstatus Lulus Tes (test_passed) atau Terdaftar (registered)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">No. Registrasi</th>
                <th className="py-3.5 px-4">Nama Calon Santri</th>
                <th className="py-3.5 px-4">Gender</th>
                <th className="py-3.5 px-4">Gelombang / Jalur</th>
                <th className="py-3.5 px-4">Status Seleksi</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span>Memuat antrean penempatan...</span>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    Tidak ada calon murid dalam antrean penempatan saat ini.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {c.registration_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.full_name}</div>
                      <div className="text-[10px] text-slate-400">NISN: {c.nisn || '-'} • Asal: {c.previous_school_name || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {c.candidate_gender === 'L' ? (
                        <span className="text-blue-600">Laki-laki</span>
                      ) : (
                        <span className="text-pink-600">Perempuan</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">
                      {c.psb_group_name || 'Reguler'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        c.status === 'test_passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {c.status === 'test_passed' ? 'Lulus Seleksi' : 'Terdaftar (Tanpa Tes)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenPlaceModal(c)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-xs transition"
                      >
                        <span>Tempatkan ke Rombel</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placement Modal */}
      {placementModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Peresmian Penempatan Santri</h3>
                <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                  {selectedCandidate.full_name} ({selectedCandidate.registration_number})
                </p>
              </div>
              <button onClick={() => setPlacementModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-semibold">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmitPlacement} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rombongan Belajar Tujuan *</label>
                <select
                  required
                  value={placeForm.target_class_group_id}
                  onChange={(e) => setPlaceForm({ ...placeForm, target_class_group_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">-- Pilih Rombel --</option>
                  {classGroups.map((cg) => {
                    const currentCount = cg.student_count || 0;
                    const maxCap = cg.capacity || 30;
                    const isFull = currentCount >= maxCap;
                    return (
                      <option key={cg.id} value={cg.id} disabled={isFull}>
                        {cg.name} ({currentCount}/{maxCap} Santri) {isFull ? '- [PENUH]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIPD Definitif Santri *</label>
                <input
                  type="text"
                  required
                  value={placeForm.nipd}
                  onChange={(e) => setPlaceForm({ ...placeForm, nipd: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-teal-700 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  placeholder="Contoh: 260012"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nomor Induk Peserta Didik unik yang akan dicatat pada master data siswa aktif.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan SK / Penempatan</label>
                <textarea
                  rows={2}
                  value={placeForm.notes}
                  onChange={(e) => setPlaceForm({ ...placeForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPlacementModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPlace}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-teal-900/20"
                >
                  {savingPlace ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Resmikan Penempatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
