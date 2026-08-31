import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../../shared/services/api';
import {
  ArrowLeft,
  User,
  MapPin,
  Users2,
  School,
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Award,
  ShieldCheck,
  History,
  KeyRound,
  Trash2
} from 'lucide-react';

export default function PSBRegistrantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [registrant, setRegistrant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [testSessions, setTestSessions] = useState([]);
  const [placementLogs, setPlacementLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('biodata');

  const [verifyingDocId, setVerifyingDocId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/akademik/psb-registrants/${id}`);
      const data = res.data?.data;
      setRegistrant(data);
      setDocuments(data.documents || []);
      setTestSessions(data.test_sessions || []);
      setPlacementLogs(data.placement_logs || []);
    } catch (err) {
      setErrorMsg('Gagal memuat detail pendaftar');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoc = async (docId, isVerified) => {
    try {
      setVerifyingDocId(docId);
      await api.patch(`/akademik/psb-registrants/${id}/documents/${docId}/verify`, {
        is_verified: isVerified,
        notes: isVerified ? 'Berkas sesuai dengan dokumen fisik asli' : 'Berkas belum lengkap/valid'
      });
      setSuccessMsg(`Status verifikasi dokumen berhasil diperbarui!`);
      fetchDetail();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi berkas');
    } finally {
      setVerifyingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-2" />
        <span className="text-xs text-slate-500 font-semibold">Memuat profil calon murid...</span>
      </div>
    );
  }

  if (!registrant) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-slate-800">Data calon murid tidak ditemukan</p>
        <Link to="/akademik/psb/pendataan" className="text-xs text-teal-600 font-bold hover:underline">
          ← Kembali ke Daftar Pendaftar
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'biodata', label: 'Biodata & Domisili', icon: User },
    { key: 'dokumen', label: 'Berkas Persyaratan', icon: UploadCloud, count: documents.length },
    { key: 'testing', label: 'Hasil Ujian & Nilai', icon: FileCheck2, count: testSessions.length },
    { key: 'riwayat', label: 'Riwayat Penempatan', icon: History, count: placementLogs.length }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/akademik/psb/pendataan"
            className="p-2 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{registrant.full_name}</h1>
              <span className="font-mono font-bold text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
                {registrant.registration_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {registrant.satuan_pendidikan_name} • {registrant.psb_group_name || 'Jalur Reguler'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 border border-slate-200 uppercase tracking-wider text-slate-700">
            Status: {registrant.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        
        {/* 1. TAB BIODATA */}
        {activeTab === 'biodata' && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Data Diri */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2 text-teal-700">
                  <User className="w-4 h-4" />
                  <span>Identitas Pribadi</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">NISN</span>
                    <span className="font-semibold text-slate-800">{registrant.nisn || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jenis Kelamin</span>
                    <span className="font-semibold text-slate-800">
                      {registrant.candidate_gender === 'L' ? 'Laki-laki (Ikhwan)' : 'Perempuan (Akhwat)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tempat, Tgl Lahir</span>
                    <span className="font-semibold text-slate-800">
                      {registrant.candidate_birth_place || '-'}, {registrant.candidate_birth_date ? registrant.candidate_birth_date.split('T')[0] : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jalur Masuk</span>
                    <span className="font-semibold text-slate-800 capitalize">{registrant.entry_type || 'Reguler'}</span>
                  </div>
                </div>
              </div>

              {/* Sekolah Asal & Biaya */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2 text-teal-700">
                  <School className="w-4 h-4" />
                  <span>Asal Sekolah & Biaya</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Nama Asal Sekolah</span>
                    <span className="font-semibold text-slate-800">{registrant.previous_school_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kelompok Biaya</span>
                    <span className="font-semibold text-teal-700">{registrant.fee_group_name_snapshot || 'Standar Unit'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sumber Pendaftaran</span>
                    <span className="font-semibold text-slate-800">
                      {registrant.source === 'public_website' ? 'Website PPDB Online' : 'Input Manual Panitia'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Ortu */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2 text-teal-700">
                  <Users2 className="w-4 h-4" />
                  <span>Data Orang Tua / Wali</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Ayah</span>
                    <span className="font-semibold text-slate-800">{registrant.father_name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Ibu</span>
                    <span className="font-semibold text-slate-800">{registrant.mother_name || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Kontak WhatsApp</span>
                    <span className="font-semibold text-slate-800">{registrant.parent_contact || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Domisili */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b pb-2 flex items-center gap-2 text-teal-700">
                  <MapPin className="w-4 h-4" />
                  <span>Alamat Domisili</span>
                </h3>
                <div>
                  <span className="text-slate-400 block text-[11px]">Alamat Lengkap</span>
                  <p className="font-semibold text-slate-800 leading-relaxed mt-0.5">
                    {registrant.address || 'Alamat belum dilengkapi'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TAB DOKUMEN */}
        {activeTab === 'dokumen' && (
          <div className="space-y-4">
            {documents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada berkas yang diunggah oleh pendaftar.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => {
                  const isVerified = !!doc.verified_at;
                  return (
                    <div key={doc.id} className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{doc.document_name}</h4>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mt-0.5">
                            Tipe: {doc.document_type}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isVerified ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka File Dokumen</span>
                        </a>

                        <div className="flex items-center gap-1.5">
                          {isVerified ? (
                            <button
                              onClick={() => handleVerifyDoc(doc.id, false)}
                              disabled={verifyingDocId === doc.id}
                              className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"
                            >
                              Batalkan Verifikasi
                            </button>
                          ) : (
                            <button
                              onClick={() => handleVerifyDoc(doc.id, true)}
                              disabled={verifyingDocId === doc.id}
                              className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verifikasi Berkas</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. TAB HASIL TEST */}
        {activeTab === 'testing' && (
          <div className="space-y-4">
            {testSessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada sesi tes yang ditugaskan kepada calon santri ini.</p>
            ) : (
              <div className="space-y-3">
                {testSessions.map((sess) => (
                  <div key={sess.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{sess.test_name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          sess.status === 'graded'
                            ? sess.is_passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {sess.status === 'graded' ? (sess.is_passed ? 'LULUS (Passed)' : 'TIDAK LULUS') : 'Sedang/Akan Ujian'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Durasi: {sess.duration_minutes} Menit • Passing Grade: {sess.passing_score} Poin
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Total Nilai Diperoleh:</span>
                      <span className="text-base font-extrabold text-teal-700">{sess.total_score} Poin</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. TAB RIWAYAT PENEMPATAN */}
        {activeTab === 'riwayat' && (
          <div className="space-y-4">
            {placementLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada riwayat penempatan resmi untuk calon santri ini.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {placementLogs.map((log) => (
                  <div key={log.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Penempatan Rombel: {log.target_class_group_name || `Kelas ID ${log.target_class_group_id}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.placed_at ? new Date(log.placed_at).toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      NIPD Definitif: <strong className="text-teal-700 font-mono">{log.assigned_nipd}</strong> • Catatan: {log.notes || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
