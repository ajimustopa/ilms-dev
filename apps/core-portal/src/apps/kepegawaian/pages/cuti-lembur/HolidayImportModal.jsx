import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  HelpCircle
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function HolidayImportModal({
  isOpen,
  onClose,
  activeSchoolUnit = null,
  onSuccess
}) {
  const [fileContent, setFileContent] = useState('');
  const [format, setFormat] = useState('csv');
  const [fileName, setFileName] = useState('');
  const [schoolUnitId, setSchoolUnitId] = useState(activeSchoolUnit?.id ? String(activeSchoolUnit.id) : '');
  
  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isJson = file.name.endsWith('.json');
    setFormat(isJson ? 'json' : 'csv');
    setPreviewData(null);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvHeader = 'name,holiday_type,start_date,end_date,is_off_day,applies_to,deducts_annual_leave,date_rule,notes\n' +
      'Tahun Baru 2026 Masehi,national,2026-01-01,2026-01-01,true,all_employees,false,fixed_date,Tahun Baru Masehi\n' +
      'Hari Kemerdekaan RI,national,2026-08-17,2026-08-17,true,all_employees,false,fixed_date,HUT Kemerdekaan RI\n' +
      'Libur Semester Gasal,school_semester,2026-12-21,2026-12-24,true,all_employees,false,floating,Libur Akhir Semester Gasal';

    const blob = new Blob([csvHeader], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'templat_impor_hari_libur_aldepos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = async () => {
    if (!fileContent.trim()) {
      setErrorMsg('Pilih berkas CSV/JSON atau tempel konten teks libur terlebih dahulu');
      return;
    }

    setIsLoadingPreview(true);
    setErrorMsg('');
    try {
      const res = await api.post('/kepegawaian/holidays/import', {
        mode: 'preview',
        format,
        content: fileContent,
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : null
      });

      if (res.data?.success) {
        setPreviewData(res.data.data);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal memeriksa format berkas impor');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || previewData.valid_count === 0) return;

    setIsCommitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/kepegawaian/holidays/import', {
        mode: 'commit',
        format,
        content: fileContent,
        school_unit_id: schoolUnitId ? Number(schoolUnitId) : null
      });

      if (res.data?.success) {
        onSuccess?.(res.data.message || `Berhasil mengimpor ${previewData.valid_count} hari libur`);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengeksekusi impor data libur');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Impor Kalender Libur (CSV / JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Unggah daftar hari libur resmi SKB 3 Menteri atau agenda sekolah secara massal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Top Info & Template Link */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 text-xs text-indigo-900">
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Gunakan format CSV atau JSON standar dengan kolom <b>name, start_date, end_date</b></span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg shadow-sm hover:bg-indigo-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Templat CSV</span>
            </button>
          </div>

          {/* Unit Scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Satuan Pendidikan Sasaran
            </label>
            <select
              value={schoolUnitId}
              onChange={(e) => {
                setSchoolUnitId(e.target.value);
                setPreviewData(null);
              }}
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Satuan (Global Yayasan & Nasional)</option>
              <option value="1">SMP IT Aldepos Islamic Boarding School</option>
              <option value="2">SMA IT Aldepos Islamic Boarding School</option>
            </select>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Berkas CSV / JSON
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/30 transition-colors flex flex-col items-center justify-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
              <div className="text-xs text-slate-600 font-medium">
                {fileName ? (
                  <span className="text-indigo-600 font-semibold">{fileName}</span>
                ) : (
                  <span>Klik untuk memilih berkas (.csv / .json)</span>
                )}
              </div>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleFileUpload}
                className="opacity-0 absolute inset-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Raw Textarea / Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Atau Tempel Teks Konten CSV / JSON
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Format: {format.toUpperCase()}</span>
            </div>
            <textarea
              rows={4}
              placeholder="name,holiday_type,start_date,end_date..."
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setPreviewData(null);
              }}
              className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          {/* Preview Action */}
          {!previewData && (
            <button
              type="button"
              onClick={handlePreview}
              disabled={isLoadingPreview || !fileContent.trim()}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa dan Membaca Pratinjau...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Periksa &amp; Pratinjau Data Impor</span>
                </>
              )}
            </button>
          )}

          {/* Preview Results Table */}
          {previewData && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hasil Pratinjau Data
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    {previewData.valid_count} Valid
                  </span>
                  {previewData.invalid_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                      {previewData.invalid_count} Gagal / Galat
                    </span>
                  )}
                </div>
              </div>

              {/* Errors list if any */}
              {previewData.errors?.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
                  <div className="font-semibold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Ditemukan {previewData.errors.length} baris tidak valid:</span>
                  </div>
                  {previewData.errors.map((err, i) => (
                    <div key={i} className="text-[11px] pl-5">
                      • Baris {err.line} [{err.field}]: {err.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Valid rows table preview */}
              {previewData.preview_rows?.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Nama Libur</th>
                        <th className="py-2 px-3">Jenis</th>
                        <th className="py-2 px-3">Mulai</th>
                        <th className="py-2 px-3">Selesai</th>
                        <th className="py-2 px-3">Aturan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {previewData.preview_rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-medium">{r.name}</td>
                          <td className="py-1.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                              {r.holiday_type}
                            </span>
                          </td>
                          <td className="py-1.5 px-3">{r.start_date}</td>
                          <td className="py-1.5 px-3">{r.end_date}</td>
                          <td className="py-1.5 px-3 text-[11px] text-slate-500">{r.date_rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Tutup
            </button>
            {previewData && (
              <button
                type="button"
                onClick={handleCommitImport}
                disabled={isCommitting || previewData.valid_count === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengimpor ke Basis Data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Konfirmasi Impor ({previewData.valid_count} Hari Libur)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
