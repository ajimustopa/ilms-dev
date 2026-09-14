import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  Send,
  Loader2,
  Award,
  BookOpen,
  HelpCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function CalonMuridTesSeleksi() {
  const { profile, refreshProfile } = useOutletContext();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // CBT Exam State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: "jawaban" }
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Countdown Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/psb-portal/me/test-sessions');
      setSessions(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching test sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (session) => {
    try {
      setLoadingDetail(true);
      setErrorMsg('');
      setActiveSession(session);
      const res = await api.get(`/akademik/psb-portal/me/test-sessions/${session.id}`);
      const data = res.data?.data;
      setSessionDetail(data);

      // Pre-fill answers jika ada
      const initialAnswers = {};
      (data.answers || []).forEach((a) => {
        initialAnswers[a.psb_test_question_id] = a.answer_text;
      });
      setAnswers(initialAnswers);
      setCurrentQuestionIdx(0);

      // Timer
      if (session.status === 'scheduled' || session.status === 'in_progress') {
        const durationMin = data.session?.duration_minutes || 60;
        setTimeLeftSeconds(durationMin * 60);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memuat soal ujian');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const handleSelectAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmitExam = async () => {
    if (!window.confirm('Yakin ingin mengirimkan seluruh jawaban ujian ini?')) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const formattedAnswers = Object.keys(answers).map((qId) => ({
        psb_test_question_id: Number(qId),
        answer_text: answers[qId]
      }));

      const res = await api.post(`/akademik/psb-portal/me/test-sessions/${activeSession.id}/submit`, {
        answers: formattedAnswers
      });

      setSubmitResult(res.data?.data || {});
      fetchSessions();
      if (refreshProfile) refreshProfile();

      // Refresh session detail untuk menampilkan nilai graded
      const updatedDetail = await api.get(`/akademik/psb-portal/me/test-sessions/${activeSession.id}`);
      setSessionDetail(updatedDetail.data?.data);
      setTimeLeftSeconds(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengirimkan jawaban ujian');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Tes Seleksi & Ujian Masuk Online (CBT)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Modul pengerjaan ujian berbasis komputer untuk calon santri baru Aldepos Islamic Boarding School.
          </p>
        </div>

        {activeSession && (
          <button
            onClick={() => {
              setActiveSession(null);
              setSessionDetail(null);
              setTimeLeftSeconds(null);
            }}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            ← Kembali ke Daftar Ujian
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* 2. DAFTAR SESI TES (JIKA BELUM MEMBUKA EXAM RUNNER) */}
      {!activeSession && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileCheck2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Belum Ada Jadwal Ujian Aktif</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Panitia PPDB belum menjadwalkan tes seleksi untuk nomor pendaftaran Anda. Jadwal tes akan muncul otomatis setelah berkas Anda diverifikasi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((sess) => {
                const isGraded = sess.status === 'graded';
                const isPassed = isGraded && sess.total_score >= sess.passing_score;

                return (
                  <div
                    key={sess.id}
                    className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500 transition"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {sess.duration_minutes} Menit
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isGraded
                            ? isPassed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300'
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {isGraded
                            ? isPassed ? 'LULUS (Passed)' : 'BELUM LULUS'
                            : 'Siap Dikerjakan'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{sess.test_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sess.test_description || 'Tes potensi akademik & peminatan santri'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">Ambang Batas (Passing Grade)</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{sess.passing_score} Poin</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">Nilai Perolehan</span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {isGraded ? `${sess.total_score} Poin` : 'Menunggu Pengerjaan'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartExam(sess)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 transition"
                    >
                      {isGraded ? (
                        <>
                          <Award className="w-4 h-4" />
                          <span>Lihat Lembar Hasil Ujian</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Mulai Kerjakan Ujian CBT</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. CBT EXAM RUNNER */}
      {activeSession && sessionDetail && (
        <div className="space-y-6">
          
          {/* Top Bar Exam Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                Sesi Ujian Aktif
              </span>
              <h2 className="text-lg font-bold mt-0.5">{sessionDetail.session?.test_name}</h2>
              <p className="text-xs text-slate-400">Passing Score: {sessionDetail.session?.passing_score} • Total Soal: {sessionDetail.questions?.length || 0}</p>
            </div>

            {/* Timer if in progress */}
            {sessionDetail.session?.status !== 'graded' && timeLeftSeconds !== null && (
              <div className="flex items-center gap-3 bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 self-start sm:self-auto">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Sisa Waktu</span>
                  <span className="font-mono text-base font-extrabold text-amber-300">
                    {formatTimer(timeLeftSeconds)}
                  </span>
                </div>
              </div>
            )}

            {/* Score Result if Graded */}
            {sessionDetail.session?.status === 'graded' && (
              <div className="flex items-center gap-3 bg-emerald-950 px-4 py-2.5 rounded-xl border border-emerald-700 self-start sm:self-auto">
                <Award className="w-6 h-6 text-emerald-400" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-300 block">Hasil Ujian</span>
                  <span className="text-base font-extrabold text-white">
                    Skor: {sessionDetail.session?.total_score} ({sessionDetail.session?.is_passed ? 'LULUS' : 'TIDAK LULUS'})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Exam Body (Questions & Question Navigator) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left: Current Question Box */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {sessionDetail.questions && sessionDetail.questions.length > 0 ? (
                (() => {
                  const q = sessionDetail.questions[currentQuestionIdx];
                  const currentAnswer = answers[q.id] || '';
                  const isGraded = sessionDetail.session?.status === 'graded';

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Soal Nomor {currentQuestionIdx + 1} dari {sessionDetail.questions.length}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Bobot: {q.score_weight} Poin • Tipe: {q.question_type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                        {q.question_text}
                      </p>

                      {/* Question Input Type Renderer */}
                      <div className="space-y-3 pt-2">
                        {/* 1. Multiple Choice (Pilihan Ganda) */}
                        {q.question_type === 'multiple_choice' && (
                          <div className="space-y-2">
                            {Array.isArray(q.options) && q.options.map((opt, oIdx) => {
                              const isChecked = currentAnswer === opt;
                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-center gap-3.5 p-4 min-h-[48px] rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition ${
                                    isChecked
                                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-100 font-bold shadow-2xs'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question_${q.id}`}
                                    value={opt}
                                    checked={isChecked}
                                    disabled={isGraded}
                                    onChange={() => handleSelectAnswer(q.id, opt)}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. Fill in Blank (Isian Singkat) */}
                        {q.question_type === 'fill_in_blank' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Ketikkan Jawaban Singkat:</label>
                            <input
                              type="text"
                              disabled={isGraded}
                              value={currentAnswer}
                              onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                              placeholder="Ketik jawaban Anda..."
                              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* 3. Essay (Uraian Panjang) */}
                        {q.question_type === 'essay' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Tuliskan Penjelasan / Uraian:</label>
                            <textarea
                              rows={5}
                              disabled={isGraded}
                              value={currentAnswer}
                              onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                              placeholder="Tuliskan uraian jawaban lengkap Anda di sini..."
                              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* Correct answer display if graded */}
                      {isGraded && q.correct_answer && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                          <strong>Kunci Jawaban Resmi:</strong> {q.correct_answer}
                        </div>
                      )}

                      {/* Question Navigation Controls */}
                      <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          disabled={currentQuestionIdx === 0}
                          onClick={() => setCurrentQuestionIdx((prev) => prev - 1)}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold disabled:opacity-40"
                        >
                          ← Soal Sebelumnya
                        </button>

                        {currentQuestionIdx < sessionDetail.questions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                          >
                            Soal Selanjutnya →
                          </button>
                        ) : (
                          !isGraded && (
                            <button
                              type="button"
                              onClick={handleSubmitExam}
                              disabled={submitting}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
                            >
                              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              <span>Selesai & Kirim Ujian</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-slate-500">Soal ujian belum tersedia pada sesi ini.</p>
              )}
            </div>

            {/* Right: Question Number Grid Navigator */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 self-start">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Nomor Soal Ujian
              </h4>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {sessionDetail.questions?.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = currentQuestionIdx === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center transition ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-1'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {sessionDetail.session?.status !== 'graded' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleSubmitExam}
                    disabled={submitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Kirim Jawaban Ujian</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
