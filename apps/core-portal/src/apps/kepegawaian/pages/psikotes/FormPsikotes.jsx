import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Clock,
  Send,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  LayoutGrid
} from 'lucide-react';

export default function FormPsikotes({
  sessionInfo,
  questions = [],
  initialAnswers = {},
  onSaveAnswer,
  onSubmitExam,
  submitting = false,
  isPublic = false
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers || {});
  const [timeLeft, setTimeLeft] = useState((sessionInfo?.duration_minutes || 30) * 60);
  const [showGridModal, setShowGridModal] = useState(false);

  useEffect(() => {
    setAnswers(initialAnswers || {});
  }, [initialAnswers]);

  // Countdown Timer
  useEffect(() => {
    if (!sessionInfo) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionInfo]);

  const handleSelectOption = (questionId, option) => {
    const nextAnswers = { ...answers, [questionId]: option };
    setAnswers(nextAnswers);

    if (onSaveAnswer) {
      onSaveAnswer(questionId, option, 3);
    }
  };

  const triggerSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirm = window.confirm(
        `Anda baru menjawab ${answeredCount} dari ${questions.length} butir soal. Apakah Anda yakin ingin mengakhiri dan mengirim tes sekarang?`
      );
      if (!confirm) return;
    }
    if (onSubmitExam) {
      onSubmitExam(answers);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Sticky Header */}
      <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white leading-none">
              {sessionInfo?.test_type_name || 'ALDEPOS PSYCHOMETRIC TEST'}
            </h1>
            <p className="text-[10px] text-indigo-400 mt-0.5 font-medium">
              Peserta: {sessionInfo?.participant_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Question Grid Trigger */}
          <button
            onClick={() => setShowGridModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            title="Daftar Nomor Soal"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Daftar Soal</span>
            <span className="bg-indigo-600/40 text-indigo-300 px-1.5 py-0.2 rounded text-[10px] font-mono">
              {answeredCount}/{totalQuestions}
            </span>
          </button>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <span
              className={`font-mono text-xs sm:text-sm font-bold ${
                timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
              }`}
            >
              {formatTimer(timeLeft)}
            </span>
          </div>

          {/* Submit Action */}
          <button
            onClick={triggerSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Mengirim...' : 'Selesai'}</span>
          </button>
        </div>
      </header>

      {/* Progress Track */}
      <div className="h-1 bg-slate-800 w-full">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full bg-indigo-500 transition-all duration-300"
        />
      </div>

      {/* Main Question Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-between space-y-6">
        {/* Question Sub-Header */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-300 font-mono font-bold text-xs border border-indigo-800/60">
              No. {currentIndex + 1}
            </span>
            <span className="text-slate-400">dari {totalQuestions} Butir</span>
          </div>

          <span className="text-xs text-slate-400">
            Progres: <strong className="text-emerald-400 font-bold">{progressPct}%</strong>
          </span>
        </div>

        {/* Current Question Stimulus & Options */}
        {currentQ ? (
          <div className="space-y-6 my-auto">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400/90 block font-semibold">
                {currentQ.dimension_name}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQ.question_text}
              </h2>
            </div>

            {/* TYPE 1: FORCED CHOICE (MBTI) */}
            {currentQ.question_type === 'forced_choice' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
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
                  type="button"
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

            {/* TYPE 2: LIKERT 5 (BIG FIVE OCEAN) */}
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
                      type="button"
                      key={item.val}
                      onClick={() => handleSelectOption(currentQ.id, item.val)}
                      className={`p-3 sm:p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                        answers[currentQ.id] === item.val
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
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
        ) : (
          <div className="text-center py-12 text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Tidak ada butir soal yang dimuat.</p>
          </div>
        )}

        {/* Bottom Pagination & Nav Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold rounded-xl text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Sebelumnya
          </button>

          <span className="text-xs font-medium text-slate-400">
            Soal {currentIndex + 1} / {totalQuestions}
          </span>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentIndex === totalQuestions - 1}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold rounded-xl text-white shadow-sm transition"
          >
            Berikutnya <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* MODAL: Question Grid Navigation */}
      {showGridModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Daftar Nomor Soal</h3>
              </div>
              <button
                onClick={() => setShowGridModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-72 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(answers[q.id]);
                const isCurrent = currentIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowGridModal(false);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition flex flex-col items-center justify-center ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                        : isAnswered
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && <span className="text-[9px] font-mono leading-none mt-0.5">{answers[q.id]}</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Terjawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block"></span>
                <span>Belum ({totalQuestions - answeredCount})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
