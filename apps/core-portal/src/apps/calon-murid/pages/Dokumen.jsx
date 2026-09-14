import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  UploadCloud,
  FileCheck2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Loader2,
  FileText,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export default function CalonMuridDokumen() {
  const { profile, refreshProfile } = useOutletContext();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [docForm, setDocForm] = useState({
    document_type: 'kk',
    document_name: 'Scan Kartu Keluarga (KK)',
    file_url: ''
  });

  const standardDocuments = [
    { key: 'kk', label: 'Kartu Keluarga (KK)', desc: 'Scan/Foto dokumen asli KK terbaru' },
    { key: 'akta_lahir', label: 'Akta Kelahiran', desc: 'Scan/Foto akta kelahiran resmi santri' },
    { key: 'ijazah', label: 'Ijazah / SKL / Rapor', desc: 'Scan ijazah atau surat keterangan lulus sekolah asal' },
    { key: 'pas_foto', label: 'Pas Foto Santri (3x4)', desc: 'Foto formal latar belakang merah/biru' },
    { key: 'kip', label: 'Kartu KIP / Prestasi (Opsional)', desc: 'Sertifikat kejuaraan atau kartu bantuan pendidikan' }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/akademik/psb-portal/me/documents');
      setDocuments(res.data?.data || []);
    } catch (err) {
      console.warn('Error fetching candidate documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!docForm.file_url.trim()) {
      setErrorMsg('Tautan URL atau file dokumen wajib diisi');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      await api.post('/akademik/psb-portal/me/documents', docForm);
      setSuccessMsg('Dokumen berhasil diunggah dan siap diverifikasi!');
      setUploadModalOpen(false);
      setDocForm({
        document_type: 'kk',
        document_name: 'Scan Kartu Keluarga (KK)',
        file_url: ''
      });
      fetchDocuments();
      if (refreshProfile) refreshProfile();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mengunggah dokumen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Hapus dokumen ini?')) return;
    try {
      await api.delete(`/akademik/psb-portal/me/documents/${docId}`);
      setSuccessMsg('Dokumen berhasil dihapus');
      fetchDocuments();
      if (refreshProfile) refreshProfile();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menghapus dokumen');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Berkas & Lampiran Persyaratan Masuk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unggah berkas dokumen persyaratan dalam format digital (PDF, JPG, atau PNG) untuk diverifikasi panitia.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setUploadModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Unggah Berkas Baru</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Standard Checklist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {standardDocuments.map((std) => {
          const uploaded = documents.find((d) => d.document_type === std.key);
          return (
            <div
              key={std.key}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                uploaded
                  ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/40 shadow-sm'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    uploaded
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{std.label}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{std.desc}</p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  uploaded
                    ? uploaded.verified_at
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}>
                  {uploaded
                    ? uploaded.verified_at
                      ? 'Terverifikasi'
                      : 'Menunggu Verifikasi'
                    : 'Belum Diunggah'}
                </span>
              </div>

              {uploaded ? (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] truncate max-w-[200px]">
                    {uploaded.document_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={uploaded.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[11px] font-bold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Lihat Berkas</span>
                    </a>
                    <button
                      onClick={() => handleDelete(uploaded.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Hapus berkas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setDocForm({
                        document_type: std.key,
                        document_name: `Scan ${std.label}`,
                        file_url: ''
                      });
                      setUploadModalOpen(true);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Unggah Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Upload */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Unggah Berkas Persyaratan</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Dokumen *
                </label>
                <select
                  value={docForm.document_type}
                  onChange={(e) => {
                    const found = standardDocuments.find((s) => s.key === e.target.value);
                    setDocForm({
                      ...docForm,
                      document_type: e.target.value,
                      document_name: found ? `Scan ${found.label}` : 'Dokumen Tambahan'
                    });
                  }}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {standardDocuments.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Dokumen / Keterangan *
                </label>
                <input
                  type="text"
                  required
                  value={docForm.document_name}
                  onChange={(e) => setDocForm({ ...docForm, document_name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tautan File / Cloud Document URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... atau /uploads/doc.pdf"
                  value={docForm.file_url}
                  onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Masukkan link Google Drive publik atau URL penyimpanan berkas Anda.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Simpan Dokumen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
