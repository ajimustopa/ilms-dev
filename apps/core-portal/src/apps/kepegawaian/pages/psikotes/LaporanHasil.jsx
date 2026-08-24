import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  BrainCircuit,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  FileText,
  Save,
  ShieldCheck,
  Layers,
  HelpCircle
} from 'lucide-react';
import api from '../../../../shared/services/api';
import { useToast } from '../../../../shared/components/Toast';

export default function LaporanHasil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Assessor Evaluation form state
  const [evalForm, setEvalForm] = useState({
    assessor_name: '',
    assessor_evaluation: '',
    hrd_recommendation: ''
  });
  const [savingEval, setSavingEval] = useState(false);

  useEffect(() => {
    fetchSessionResult();
  }, [id]);

  const fetchSessionResult = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/kepegawaian/psychotest/sessions/${id}/result`);
      if (res.data?.success) {
        const data = res.data.data;
        setSession(data);
        setEvalForm({
          assessor_name: data.assessor_name || '',
          assessor_evaluation: data.assessor_evaluation || '',
          hrd_recommendation: data.hrd_recommendation || ''
        });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat laporan hasil psikotes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    try {
      setSavingEval(true);
      const res = await api.post(`/kepegawaian/psychotest/sessions/${id}/evaluate`, evalForm);
      if (res.data?.success) {
        showToast('Evaluasi asesor dan catatan HRD berhasil disimpan', 'success');
        fetchSessionResult();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyimpan evaluasi asesor', 'error');
    } finally {
      setSavingEval(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Memuat laporan hasil psikotes...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Laporan Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500">Sesi psikotes ini belum selesai dikerjakan atau hasil belum tersedia.</p>
        <Link
          to="/kepegawaian/psikotes/sesi"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Sesi
        </Link>
      </div>
    );
  }

  const isMbti = session.test_type_code === 'mbti';
  const scores = session.dimension_scores || {};
  const radar = session.radar_chart_data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Action Bar (Hide in Print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/kepegawaian/psikotes/sesi"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Sesi
        </Link>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4" /> Cetak / Export PDF
        </button>
      </div>

      {/* Main Report Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Header Lembaga & Identitas Sesi */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-600/30 shrink-0">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 block">
                Laporan Psikodiagnostik Kepribadian
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {session.test_type_name}
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Kode Sesi: {session.session_code} • Diselesaikan: {session.completed_at ? new Date(session.completed_at).toLocaleDateString('id-ID', { dateStyle: 'full' }) : '-'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 sm:text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identitas Peserta</span>
            <p className="font-bold text-slate-900 text-sm">{session.participant_name}</p>
            <p className="text-slate-500">{session.participant_email || 'Email tidak terlampir'}</p>
            <div className="flex sm:justify-end gap-1.5 pt-1">
              {session.candidate_name ? (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  Pelamar: {session.applied_position || 'Umum'}
                </span>
              ) : session.employee_name ? (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                  Pegawai: {session.employee_number}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Hero Card: Dominant Personality Result */}
        <div className="bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-8 translate-y-8 pointer-events-none">
            <BrainCircuit className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Hasil Tipologi Kepribadian Dominan
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {session.result_code}
              </h2>
              <p className="text-base sm:text-lg font-semibold text-indigo-200">
                {session.result_label}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed pt-2">
              {session.profile_summary}
            </p>
          </div>
        </div>

        {/* SECTION 1: Skor Kuantitatif Per Dimensi / Trait */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Pemetaan Skor Kuantitatif Sumbu Psikologi
            </h3>
            <span className="text-xs text-slate-400 font-medium">Metode: {session.scoring_method}</span>
          </div>

          {isMbti ? (
            // MBTI 4-Axis Quantitative Bars
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['EI', 'SN', 'TF', 'JP'].map((axisKey) => {
                const item = scores[axisKey];
                if (!item) return null;
                return (
                  <div key={axisKey} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">
                        {axisKey === 'EI'
                          ? 'Extraversion vs Introversion'
                          : axisKey === 'SN'
                          ? 'Sensing vs Intuition'
                          : axisKey === 'TF'
                          ? 'Thinking vs Feeling'
                          : 'Judging vs Perceiving'}
                      </span>
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        Dominan: Kutub {item.dominant_pole}
                      </span>
                    </div>

                    {/* Dual Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${item.positive_percentage}%` }}
                          className="bg-emerald-500 transition-all duration-500"
                        />
                        <div
                          style={{ width: `${item.negative_percentage}%` }}
                          className="bg-indigo-600 transition-all duration-500"
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                        <span className="text-emerald-700">
                          {item.positive_pole}: {item.positive_percentage}%
                        </span>
                        <span className="text-indigo-700">
                          {item.negative_pole}: {item.negative_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Big Five OCEAN Trait Progress Bars
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['O', 'C', 'E', 'A', 'N'].map((code) => {
                const item = scores[code];
                if (!item) return null;
                return (
                  <div key={code} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{item.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          item.level === 'tinggi'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.level === 'rendah'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Level: {item.level}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${item.percentage}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.level === 'tinggi'
                              ? 'bg-emerald-500'
                              : item.level === 'rendah'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Rata-rata: {item.average_score} / 5.00</span>
                        <span className="font-bold text-slate-800">{item.percentage}%</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 italic mt-1 leading-snug">{item.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Analisis Kualitatif & Rekomendasi HRD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Strengths */}
          <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" /> Kekuatan & Potensi Utama
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {session.strengths_summary || 'Menunjukkan stabilitas emosional dan dedikasi kerja yang konsisten.'}
            </p>
          </div>

          {/* Development Areas */}
          <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" /> Area Pengembangan & Mitigasi
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {session.development_areas || 'Penguatan komunikasi interpersonal dan fleksibilitas dalam menghadapi dinamika tak terduga.'}
            </p>
          </div>
        </div>

        {/* HRD Recommendation Banner */}
        <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200 space-y-2">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Rekomendasi Penempatan Tugas & Formasi Karir HRD
          </div>
          <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
            {session.hrd_recommendation}
          </p>
        </div>

        {/* SECTION 3: Evaluasi Asesor & Catatan Tambahan (Form Editable) */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Lembar Verifikasi & Evaluasi Asesor
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-200">
              Khusus Tim HRD
            </span>
          </div>

          <form onSubmit={handleSaveEvaluation} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nama Asesor / Psikolog</label>
              <input
                type="text"
                value={evalForm.assessor_name}
                onChange={(e) => setEvalForm({ ...evalForm, assessor_name: e.target.value })}
                placeholder="mis. Dr. Bambang Sutrisno, M.Psi., Psikolog"
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ulasan / Catatan Kualitatif Asesor</label>
              <textarea
                rows={3}
                value={evalForm.assessor_evaluation}
                onChange={(e) => setEvalForm({ ...evalForm, assessor_evaluation: e.target.value })}
                placeholder="Tambahkan catatan khusus terkait observasi perilaku atau wawancara..."
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
              />
            </div>

            <div className="flex justify-end print:hidden">
              <button
                type="submit"
                disabled={savingEval}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-xs"
              >
                <Save className="w-4 h-4" /> {savingEval ? 'Menyimpan...' : 'Simpan Catatan Asesor'}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 4: Rekap Lembar Jawaban */}
        {session.answers && session.answers.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" /> Rekap Jawaban Butir Soal ({session.answers.length})
              </h3>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 w-28">Kode & Dimensi</th>
                    <th className="py-2.5 px-3">Teks Soal</th>
                    <th className="py-2.5 px-3 w-28 text-center">Jawaban Terpilih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {session.answers.map((ans, idx) => (
                    <tr key={ans.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-semibold text-indigo-600 block">{ans.question_code}</span>
                        <span className="text-[10px] text-slate-400">{ans.dimension_name}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-800 line-clamp-1">{ans.question_text}</td>
                      <td className="py-2 px-3 text-center font-bold font-mono text-emerald-700 bg-emerald-50/50">
                        {ans.selected_option} {ans.selected_pole ? `[${ans.selected_pole}]` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Tanda Tangan (Print Ready) */}
        <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-center text-xs text-slate-800">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Bagian SDM & Kepegawaian</p>
            <div className="h-16"></div>
            <p className="font-bold underline">( ............................................ )</p>
          </div>
          <div>
            <p>Diperiksa oleh,</p>
            <p className="font-bold">Asesor Psikologi</p>
            <div className="h-16"></div>
            <p className="font-bold underline">
              ( {evalForm.assessor_name || '............................................'} )
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
