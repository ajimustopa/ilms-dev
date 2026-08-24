import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  UserCheck,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import api from '../../../../shared/services/api';
import { useToast } from '../../../../shared/components/Toast';
import FormPsikotes from './FormPsikotes';

export default function IsiTesKaryawan() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);

  // Workflow state: 'list' | 'consent' | 'exam' | 'finished'
  const [flowState, setFlowState] = useState('list');
  const [consentChecked, setConsentChecked] = useState(false);

  // Exam Data
  const [examData, setExamData] = useState({
    sessionInfo: null,
    questions: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [finishedData, setFinishedData] = useState(null);

  useEffect(() => {
    fetchMySessions();
  }, []);

  const fetchMySessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kepegawaian/psychotest/my-tests');
      if (res.data?.success) {
        setSessions(res.data.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal memuat daftar penugasan tes saya', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsent = async (session) => {
    try {
      setLoading(true);
      setActiveSession(session);
      const res = await api.get(`/kepegawaian/psychotest/my-tests/${session.id}/take`);
      if (res.data?.success) {
        setExamData({
          sessionInfo: res.data.data.session_info,
          questions: res.data.data.questions || []
        });
        setConsentChecked(false);
        setFlowState('consent');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal menyiapkan lembar ujian', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnswer = async (questionId, selectedOption, responseTimeSeconds) => {
    if (!activeSession) return;
    try {
      await api.post(`/kepegawaian/psychotest/my-tests/${activeSession.id}/answer`, {
        question_id: questionId,
        selected_option: selectedOption,
        response_time_seconds: responseTimeSeconds || 3
      });
    } catch (err) {
      console.error('Autosave error:', err);
    }
  };

  const handleSubmitExam = async () => {
    if (!activeSession) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/kepegawaian/psychotest/my-tests/${activeSession.id}/submit`);
      if (res.data?.success) {
        setFinishedData(res.data.data);
        setFlowState('finished');
        showToast('Tes psikologi berhasil dikirimkan!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengirimkan lembar ujian', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. STATE: LIST OF SESSIONS
  if (flowState === 'list') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Penugasan Tes Psikologi Saya</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar sesi asesmen psikologi dan inventori kepribadian yang ditugaskan kepada Anda.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat daftar penugasan tes...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Tidak Ada Tes Aktif</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Saat ini belum ada penugasan tes psikologi baru yang dijadwalkan untuk Anda. Hubungi tim HRD jika ada kendala.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((s) => (
              <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {s.session_code}
                    </span>
                    {s.status === 'completed' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Selesai
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Siap Dikerjakan
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{s.test_type_name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Durasi: {s.duration_minutes} Menit
                    </span>
                  </div>
                </div>

                {s.status === 'completed' ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-xs font-semibold text-slate-600 block">
                      Tes sudah selesai dikerjakan.
                    </span>
                    <span className="text-[10px] text-slate-400">Hasil tersimpan untuk peninjauan HRD.</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartConsent(s)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Mulai Pengerjaan Tes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. STATE: CONSENT SCREEN
  if (flowState === 'consent') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Petunjuk & Lembar Persetujuan Tes</h2>
              <p className="text-xs text-slate-500">{examData.sessionInfo?.test_type_name}</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" /> Aturan & Petunjuk Pengerjaan:
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 leading-relaxed pl-1">
              <li>Tes ini berlangsung selama <strong>{examData.sessionInfo?.duration_minutes} Menit</strong>.</li>
              <li>Pilihlah jawaban yang paling spontan dan jujur menggambarkan kebiasaan atau preferensi diri Anda.</li>
              <li>Tidak ada jawaban yang dinilai salah; setiap respon mencerminkan gaya kepribadian unik Anda.</li>
              <li>Pastikan koneksi internet Anda stabil hingga seluruh butir soal selesai dikirimkan.</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 w-4 h-4"
              />
              <span className="text-xs font-semibold text-indigo-950 leading-relaxed">
                Saya menyatakan memahami seluruh petunjuk di atas dan bersedia mengerjakan tes ini secara mandiri, jujur, dan sungguh-sungguh.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setFlowState('list')}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Batal & Kembali
            </button>

            <button
              onClick={() => setFlowState('exam')}
              disabled={!consentChecked}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20"
            >
              <span>Mulai Mengerjakan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. STATE: EXAM FORM
  if (flowState === 'exam') {
    return (
      <FormPsikotes
        sessionInfo={examData.sessionInfo}
        questions={examData.questions}
        onSaveAnswer={handleSaveAnswer}
        onSubmitExam={handleSubmitExam}
        submitting={submitting}
        isPublic={false}
      />
    );
  }

  // 4. STATE: FINISHED CONFIRMATION
  if (flowState === 'finished') {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Tes Psikologi Selesai!</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Terima kasih atas partisipasi Anda. Seluruh jawaban telah tersimpan dan akan direview oleh tim HRD Yayasan Aldepos.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Tipe Tes:</span>
              <span className="font-semibold text-slate-800">{examData.sessionInfo?.test_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status Sesi:</span>
              <span className="font-bold text-emerald-600">Selesai (Completed)</span>
            </div>
          </div>

          <button
            onClick={() => {
              setFlowState('list');
              fetchMySessions();
            }}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            Kembali ke Daftar Tes Saya
          </button>
        </div>
      </div>
    );
  }

  return null;
}
