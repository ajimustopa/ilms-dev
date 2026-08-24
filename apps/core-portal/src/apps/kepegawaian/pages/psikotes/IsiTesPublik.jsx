import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Sparkles,
  School
} from 'lucide-react';
import FormPsikotes from './FormPsikotes';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3000/api/v1`
    : 'http://localhost:3000/api/v1');

export default function IsiTesPublik() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

  // Workflow state: 'consent' | 'exam' | 'finished'
  const [flowState, setFlowState] = useState('consent');
  const [consentChecked, setConsentChecked] = useState(false);

  // Exam Data
  const [sessionInfo, setSessionInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [finishedData, setFinishedData] = useState(null);

  useEffect(() => {
    fetchPublicExamData();
  }, [token]);

  const fetchPublicExamData = async () => {
    try {
      setLoading(true);
      setErrorInfo(null);

      // Unauthenticated public request without Bearer token
      const res = await axios.get(`${API_BASE_URL}/kepegawaian/psychotest/public/${token}/questions`);
      if (res.data?.success) {
        const data = res.data.data;
        setSessionInfo(data.session_info);
        setQuestions(data.questions || []);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || 'Sesi psikotes tidak ditemukan atau sudah tidak aktif.';
      setErrorInfo({
        status,
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePublicAnswer = async (questionId, selectedOption, responseTimeSeconds) => {
    try {
      await axios.post(`${API_BASE_URL}/kepegawaian/psychotest/public/${token}/answers`, {
        question_id: questionId,
        selected_option: selectedOption,
        response_time_seconds: responseTimeSeconds || 3
      });
    } catch (err) {
      console.error('Public answer autosave error:', err);
    }
  };

  const handleSubmitPublicExam = async () => {
    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/kepegawaian/psychotest/public/${token}/submit`);
      if (res.data?.success) {
        setFinishedData(res.data.data);
        setFlowState('finished');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirimkan lembar ujian psikotes.');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. STATE: LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 p-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Menghubungkan ke Portal Ujian Psikotes...</p>
      </div>
    );
  }

  // 2. STATE: ERROR (404 / 410 / COMPLETED / EXPIRED)
  if (errorInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold">Akses Ujian Tidak Tersedia</h2>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">{errorInfo.message}</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs text-slate-400 space-y-1">
            <p>Kode Token: <span className="font-mono font-bold text-slate-300">{token}</span></p>
            <p className="text-[11px] text-slate-500">
              Silakan hubungi Tim Rekrutmen & HRD Yayasan Aldepos jika Anda memerlukan bantuan lebih lanjut.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. STATE: CONSENT SCREEN
  if (flowState === 'consent') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4">
        <div className="max-w-2xl w-full mx-auto space-y-8 my-auto">
          {/* Header Portal */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-xl shadow-indigo-600/30">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 block">
              PORTAL ASESMEN PSIKOLOGI REKRUTMEN
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Yayasan Aldepos Islamic Boarding School</h1>
          </div>

          {/* Consent Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Kandidat Peserta:</span>
                <span className="font-bold text-slate-100 text-sm">{sessionInfo?.participant_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Instrumen Tes:</span>
                <span className="font-bold text-indigo-300">{sessionInfo?.test_type_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Durasi Waktu:</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {sessionInfo?.duration_minutes} Menit
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              <h4 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> Petunjuk & Tata Tertib Pengerjaan:
              </h4>
              <ul className="list-disc list-inside space-y-2 text-slate-400 pl-1">
                <li>Tes ini memuat <strong>{questions.length} butir pertanyaan</strong> dan berlangsung selama <strong>{sessionInfo?.duration_minutes} Menit</strong>.</li>
                <li>Pilihlah alternatif yang paling spontan dan mencerminkan kebiasaan atau preferensi alamiah diri Anda sehari-hari.</li>
                <li>Tidak ada jawaban salah; kejujuran respon Anda sangat penting untuk akurasi pemetaan kepribadian.</li>
                <li>Setiap pilihan otomatis tersimpan di server (*auto-save*). Pastikan koneksi internet Anda tetap aktif.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-900/60">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 w-4 h-4"
                />
                <span className="text-xs font-semibold text-indigo-200 leading-relaxed">
                  Saya menyatakan telah membaca seluruh petunjuk dan siap mengerjakan tes psikologi ini secara mandiri, jujur, dan tertib.
                </span>
              </label>
            </div>

            <button
              onClick={() => setFlowState('exam')}
              disabled={!consentChecked}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs sm:text-sm font-bold rounded-2xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>Mulai Mengerjakan Tes Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-600">
          &copy; 2026 Yayasan Aldepos. All rights reserved.
        </footer>
      </div>
    );
  }

  // 4. STATE: EXAM FORM
  if (flowState === 'exam') {
    return (
      <FormPsikotes
        sessionInfo={sessionInfo}
        questions={questions}
        onSaveAnswer={handleSavePublicAnswer}
        onSubmitExam={handleSubmitPublicExam}
        submitting={submitting}
        isPublic={true}
      />
    );
  }

  // 5. STATE: FINISHED SCREEN
  if (flowState === 'finished') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black">Ujian Telah Terkirim!</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Terima kasih atas partisipasi Anda, <strong>{sessionInfo?.participant_name}</strong>. Seluruh lembar respon psikotes Anda telah kami terima secara lengkap.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Instrumen Tes:</span>
              <span className="font-semibold text-slate-200">{sessionInfo?.test_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu Pengiriman:</span>
              <span className="font-semibold text-emerald-400">
                {new Date().toLocaleTimeString('id-ID', { timeStyle: 'short' })} WIB
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Hasil asesmen akan diproses dan dievaluasi lebih lanjut oleh Tim Rekrutmen & HRD Yayasan Aldepos. Anda dapat menutup tab peramban ini.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
