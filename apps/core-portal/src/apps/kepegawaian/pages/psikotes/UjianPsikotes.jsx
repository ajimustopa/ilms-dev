import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BrainCircuit,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  HelpCircle,
  Check,
  ShieldCheck
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function UjianPsikotes() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: selected_option }
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedResult, setCompletedResult] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(30 * 60);

  useEffect(() => {
    fetchExamData();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (!sessionInfo || isCompleted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionInfo, isCompleted]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Verify token & get questions
      const res = await api.get(`/kepegawaian/psychotest/public/${token}/questions`);
      if (res.data?.success) {
        const data = res.data.data;
        setSessionInfo(data.session_info);
        setQuestions(data.questions || []);
        setTimeLeft((data.session_info.duration_minutes || 30) * 60);

        // Pre-fill saved answers
        const initialAnswers = {};
        data.questions.forEach((q) => {
          if (q.saved_answer) {
            initialAnswers[q.id] = q.saved_answer;
          }
        });
        setAnswers(initialAnswers);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Token sesi psikotes tidak valid atau sudah selesai dikerjakan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (questionId, option) => {
    const newAnswers = { ...answers, [questionId]: option };
    setAnswers(newAnswers);

    // Auto save answer to backend
    try {
      await api.post(`/kepegawaian/psychotest/public/${token}/answers`, {
        question_id: questionId,
        selected_option: option,
        response_time_seconds: 3
      });
    } catch (err) {
      console.error('Failed to autosave answer:', err);
    }
  };

  const handleSubmitExam = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirm = window.confirm(
        `Anda baru menjawab ${answeredCount} dari ${questions.length} butir soal. Apakah Anda yakin ingin mengakhiri dan mengirim ujian sekarang?`
      );
      if (!confirm) return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/kepegawaian/psychotest/public/${token}/submit`);
      if (res.data?.success) {
        setIsCompleted(true);
        setCompletedResult(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirimkan ujian.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 p-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Menyiapkan lembar instrumen psikotes...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 text-white shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Sesi Tidak Tersedia</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black">Tes Berhasil Diselesaikan!</h2>
            <p className="text-xs text-slate-400">
              Seluruh rekaman jawaban Anda telah tersimpan dan terproses secara aman di sistem.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Nama Peserta:</span>
              <span className="font-semibold text-slate-200">{sessionInfo?.participant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tipe Tes:</span>
              <span className="font-semibold text-slate-200">{sessionInfo?.test_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu Kirim:</span>
              <span className="font-semibold text-emerald-400">
                {new Date().toLocaleTimeString('id-ID', { timeStyle: 'short' })} WIB
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Terima kasih atas partisipasi Anda. Hasil asesmen akan dievaluasi oleh tim HRD Yayasan Aldepos.
          </p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPct = Math.round((Object.keys(answers).length / questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white leading-none">ALDEPOS PSYCHOMETRIC PORTAL</h1>
            <p className="text-[10px] text-indigo-400 mt-0.5">{sessionInfo?.test_type_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className={`font-mono text-xs sm:text-sm font-bold ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>

          <button
            onClick={handleSubmitExam}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Mengirim...' : 'Selesai'}
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-800 w-full">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full bg-indigo-500 transition-all duration-300"
        />
      </div>

      {/* Exam Main Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-between space-y-6">
        {/* Question Header */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
          <span className="font-semibold text-indigo-400">
            Butir Pertanyaan {currentIndex + 1} dari {questions.length}
          </span>
          <span>
            Terjawab: <strong className="text-slate-200">{Object.keys(answers).length}</strong> / {questions.length}
          </span>
        </div>

        {/* Question Content */}
        {currentQ && (
          <div className="space-y-6 my-auto">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                {currentQ.dimension_name}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQ.question_text}
              </h2>
            </div>

            {/* FORCED CHOICE OPTIONS (MBTI) */}
            {currentQ.question_type === 'forced_choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleSelectOption(currentQ.id, 'A')}
                  className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    answers[currentQ.id] === 'A'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        answers[currentQ.id] === 'A' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      A
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{currentQ.option_a_text}</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectOption(currentQ.id, 'B')}
                  className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                    answers[currentQ.id] === 'B'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-500/50'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        answers[currentQ.id] === 'B' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      B
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{currentQ.option_b_text}</p>
                  </div>
                </button>
              </div>
            )}

            {/* LIKERT 5 OPTIONS (BIG FIVE) */}
            {currentQ.question_type === 'likert_5' && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {[
                    { val: '1', label: 'Sangat Tidak Setuju' },
                    { val: '2', label: 'Tidak Setuju' },
                    { val: '3', label: 'Netral / Ragu' },
                    { val: '4', label: 'Setuju' },
                    { val: '5', label: 'Sangat Setuju' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => handleSelectOption(currentQ.id, item.val)}
                      className={`p-3 sm:p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                        answers[currentQ.id] === item.val
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-lg font-black">{item.val}</span>
                      <span className="text-[10px] font-medium hidden sm:block leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium px-2 sm:hidden">
                  <span>1: Sangat Tidak Setuju</span>
                  <span>5: Sangat Setuju</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Pagination / Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold rounded-xl text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Sebelumnya
          </button>

          {/* Quick Number Grid Trigger / Indicator */}
          <span className="text-xs font-semibold text-slate-400">
            Nomor {currentIndex + 1}
          </span>

          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold rounded-xl text-white shadow-sm"
          >
            Berikutnya <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
