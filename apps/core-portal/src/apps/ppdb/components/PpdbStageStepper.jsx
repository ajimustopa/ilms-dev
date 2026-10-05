import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  CreditCard,
  ClipboardList,
  Award,
  Wallet,
  GraduationCap,
  Users,
  Check,
  ArrowRight,
  Sparkles,
  FileText,
  ExternalLink
} from 'lucide-react';

/**
 * Metadata 7 Tahapan PPDB
 */
export const PPDB_STAGES_CONFIG = [
  { step: 1, id: 'registration', label: 'Registrasi', icon: User, short: '1. Registrasi' },
  { step: 2, id: 'registration_fee', label: 'Bayar Formulir', icon: CreditCard, short: '2. Bayar Formulir' },
  { step: 3, id: 'testing', label: 'Testing Seleksi', icon: ClipboardList, short: '3. Testing' },
  { step: 4, id: 'announcement', label: 'Hasil Seleksi', icon: Award, short: '4. Hasil Seleksi' },
  { step: 5, id: 'enrollment_fee', label: 'Uang Pangkal', icon: Wallet, short: '5. Uang Pangkal' },
  { step: 6, id: 'prospective_student', label: 'Calon Siswa', icon: GraduationCap, short: '6. Calon Siswa' },
  { step: 7, id: 'student_status', label: 'Siswa Aktif', icon: Users, short: '7. Siswa Aktif' },
];

/**
 * Badge Status Tahapan PPDB (Untuk Kolom Tabel)
 */
export function PpdbStageBadge({ stageInfo, status }) {
  if (!stageInfo) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
        {status || 'Registrasi'}
      </span>
    );
  }

  const {
    current_stage_number,
    current_stage_label,
    current_stage_code,
    badge_class,
    is_withdrawn,
    is_placed,
    stages = []
  } = stageInfo;

  return (
    <div className="flex flex-col gap-1 items-start">
      {/* Badge Utama */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${badge_class}`}>
          {is_withdrawn ? (
            <XCircle className="w-3 h-3 text-rose-600" />
          ) : is_placed ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ) : current_stage_code === 'rejected' ? (
            <XCircle className="w-3 h-3 text-rose-600" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-current opacity-70 animate-pulse" />
          )}
          <span>
            {is_withdrawn
              ? 'Mengundurkan Diri'
              : (current_stage_number > 0 ? `Tahap ${current_stage_number}/7: ${current_stage_label}` : current_stage_label)}
          </span>
        </span>
      </div>

      {/* Mini 7-Step Dots Indicator */}
      {!is_withdrawn && (
        <div className="flex items-center gap-1 mt-0.5 pl-0.5">
          {PPDB_STAGES_CONFIG.map((cfg, idx) => {
            const stageData = stages[idx];
            const isCompleted = stageData?.status === 'completed';
            const isInProgress = stageData?.status === 'in_progress';
            const isFailed = stageData?.status === 'failed';

            let dotColor = 'bg-slate-200';
            if (isCompleted) dotColor = 'bg-emerald-500';
            else if (isInProgress) dotColor = 'bg-amber-400 ring-2 ring-amber-200';
            else if (isFailed) dotColor = 'bg-rose-500';

            return (
              <div
                key={cfg.id}
                title={`Tahap ${cfg.step}: ${cfg.label} - ${stageData?.detail || '-'}`}
                className={`w-2.5 h-1.5 rounded-full transition-all ${dotColor}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Stepper Bar Horisontal (Untuk Header Modal Detail)
 */
export function PpdbStageProgressBar({ stageInfo }) {
  if (!stageInfo || !stageInfo.stages) return null;
  const { stages, is_withdrawn } = stageInfo;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/30 to-slate-50 border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        {PPDB_STAGES_CONFIG.map((cfg, idx) => {
          const stageData = stages[idx] || {};
          const isCompleted = stageData.status === 'completed';
          const isInProgress = stageData.status === 'in_progress';
          const isFailed = stageData.status === 'failed';
          const isPending = stageData.status === 'pending' || !stageData.status;

          let stepBg = 'bg-slate-100 text-slate-400 border-slate-200';
          let textColor = 'text-slate-400';
          let icon = <span className="text-[10px] font-bold">{cfg.step}</span>;

          if (is_withdrawn) {
            stepBg = 'bg-slate-100 text-slate-400 border-slate-200';
          } else if (isCompleted) {
            stepBg = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';
            textColor = 'text-emerald-800 font-bold';
            icon = <Check className="w-3.5 h-3.5" />;
          } else if (isInProgress) {
            stepBg = 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 shadow-2xs';
            textColor = 'text-amber-800 font-bold';
            icon = <Clock className="w-3.5 h-3.5 animate-spin" />;
          } else if (isFailed) {
            stepBg = 'bg-rose-600 text-white border-rose-600 shadow-2xs';
            textColor = 'text-rose-800 font-bold';
            icon = <XCircle className="w-3.5 h-3.5" />;
          }

          return (
            <React.Fragment key={cfg.id}>
              <div className="flex flex-col items-center min-w-[72px] text-center">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${stepBg}`}>
                  {icon}
                </div>
                <span className={`text-[10px] mt-1 leading-tight ${textColor}`}>
                  {cfg.label}
                </span>
              </div>
              {idx < PPDB_STAGES_CONFIG.length - 1 && (
                <div className="flex-1 min-w-[12px] h-0.5 bg-slate-200 self-center -mt-3">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Timeline Detail 7 Tahap (Untuk Tab Detail Modal)
 */
export function PpdbStageDetailTimeline({
  stageInfo,
  registrant,
  onDeclareProspective,
  onNavigateToBill,
  isDeclaring = false
}) {
  if (!stageInfo || !stageInfo.stages) {
    return (
      <div className="p-4 text-center text-slate-400">
        Informasi tahapan pendaftaran belum tersedia.
      </div>
    );
  }

  const { stages, is_withdrawn, is_prospective_student, is_placed, is_accepted } = stageInfo;

  return (
    <div className="space-y-4">
      {/* Banner status pengunduran diri jika ada */}
      {is_withdrawn && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold">Calon Santri Telah Mengundurkan Diri.</span>
            <p className="text-[11px] text-rose-700/80 mt-0.5">
              Proses pendaftaran telah dihentikan sesuai permohonan pengunduran diri dan kebijakan pengembalian dana yayasan.
            </p>
          </div>
        </div>
      )}

      {/* Timeline List 7 Langkah */}
      <div className="space-y-3">
        {PPDB_STAGES_CONFIG.map((cfg, idx) => {
          const stage = stages[idx] || {};
          const isCompleted = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';
          const isFailed = stage.status === 'failed';
          const isPending = stage.status === 'pending' || !stage.status;
          const IconComponent = cfg.icon;

          let statusBadge = (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              Pending
            </span>
          );

          if (isCompleted) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Selesai</span>
              </span>
            );
          } else if (isInProgress) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Dalam Proses</span>
              </span>
            );
          } else if (isFailed) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>Tidak Terpenuhi</span>
              </span>
            );
          }

          return (
            <div
              key={cfg.id}
              className={`p-3.5 rounded-xl border transition-colors ${
                isCompleted
                  ? 'bg-emerald-50/20 border-emerald-200/80'
                  : isInProgress
                  ? 'bg-amber-50/20 border-amber-200/90'
                  : isFailed
                  ? 'bg-rose-50/20 border-rose-200'
                  : 'bg-white border-slate-200/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : isInProgress
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : isFailed
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">
                        Tahap {cfg.step}: {stage.name || cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {stage.detail || '-'}
                    </p>

                    {/* Tombol aksi kontekstual per tahap */}
                    {cfg.step === 2 && !stage.is_paid && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {onNavigateToBill && (
                          <button
                            type="button"
                            onClick={onNavigateToBill}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Lihat Rincian Biaya Formulir</span>
                          </button>
                        )}
                        <a
                          href="/keuangan/ppdb-billing"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Wallet className="w-3 h-3" />
                          <span>Kasir Keuangan PPDB</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {cfg.step === 5 && !stage.is_full_paid && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <a
                          href="/keuangan/ppdb-billing"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Wallet className="w-3 h-3" />
                          <span>Catat Kas Masuk di Keuangan PPDB</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <span className="text-[10px] text-slate-400">
                          (Dikelola & diverifikasi oleh Bendahara)
                        </span>
                      </div>
                    )}

                    {cfg.step === 6 && is_accepted && !is_prospective_student && !is_placed && onDeclareProspective && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isDeclaring}
                          onClick={onDeclareProspective}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isDeclaring ? 'Memproses...' : 'Tetapkan Sebagai Calon Siswa (Siap Rombel)'}</span>
                        </button>
                        <span className="text-[10px] text-slate-400">
                          Syarat seleksi dan uang pangkal terpenuhi
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0">{statusBadge}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
