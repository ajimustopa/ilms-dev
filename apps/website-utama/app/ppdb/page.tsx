'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Users,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  Trash2,
  HelpCircle
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1/website-utama';

export default function PpdbFormPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrantId, setRegistrantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedCode, setSubmittedCode] = useState<number | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    school_unit_id: 1,
    school_year: '2027/2028',
    registration_path: 'reguler',
    candidate_full_name: '',
    candidate_birth_place: '',
    candidate_birth_date: '',
    candidate_gender: 'L',
    candidate_address: '',
    father_name: '',
    mother_name: '',
    parent_contact: ''
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [docForm, setDocForm] = useState({
    document_type: 'kartu_keluarga',
    file_url: ''
  });

  const schoolUnits = [
    { id: 1, name: 'SD Aldepos Islamic School' },
    { id: 2, name: 'SMP Aldepos Islamic Boarding School' },
    { id: 3, name: 'SMA Aldepos Islamic Boarding School' }
  ];

  const documentTypes = [
    { key: 'kartu_keluarga', label: 'Kartu Keluarga (KK)' },
    { key: 'akta_lahir', label: 'Akta Kelahiran' },
    { key: 'pas_foto', label: 'Pas Foto 3x4 Calon Santri' },
    { key: 'ijazah_atau_rapor', label: 'Ijazah / Rapor Terakhir' }
  ];

  // Step 1: Simpan Draft Data Diri (POST jika baru, PUT jika ada id)
  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.candidate_full_name.trim()) {
      setErrorMsg('Nama lengkap calon siswa wajib diisi');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (!registrantId) {
        // Create draft baru
        const res = await fetch(`${API_BASE_URL}/public/ppdb/registrants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Gagal menyimpan draft');
        setRegistrantId(json.data.id);
      } else {
        // Update existing draft
        const res = await fetch(`${API_BASE_URL}/public/ppdb/registrants/${registrantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Gagal memperbarui data');
      }
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Simpan Data Orang Tua (PUT)
  const handleStep2Next = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parent_contact.trim()) {
      setErrorMsg('Kontak WhatsApp orang tua wajib diisi');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (registrantId) {
        const res = await fetch(`${API_BASE_URL}/public/ppdb/registrants/${registrantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Gagal menyimpan data orang tua');
      }
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Tambah Dokumen Pendukung
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.file_url.trim()) {
      setErrorMsg('URL file dokumen wajib diisi');
      return;
    }
    if (!registrantId) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/public/ppdb/registrants/${registrantId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gagal mengunggah dokumen');

      setDocuments([...documents, { ...docForm, id: json.data?.id || Date.now() }]);
      setDocForm({ document_type: 'akta_lahir', file_url: '' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal unggah dokumen');
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Submit Final Pendaftaran
  const handleSubmitFinal = async () => {
    if (!registrantId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/public/ppdb/registrants/${registrantId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Gagal mengirim pendaftaran');

      setSubmittedCode(registrantId);
      setCurrentStep(5); // Success step
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header Form */}
      <div className="text-center space-y-2 mb-10">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
          PPDB Online 2027/2028
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Formulir Pendaftaran Siswa & Santri Baru
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Lengkapi formulir pendaftaran secara bertahap. Pastikan data calon siswa dan kontak orang tua diisi dengan benar.
        </p>
      </div>

      {/* Stepper Wizard Indicator */}
      {currentStep <= 4 && (
        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { step: 1, title: 'Data Diri', icon: User },
            { step: 2, title: 'Data Ortu', icon: Users },
            { step: 3, title: 'Dokumen', icon: UploadCloud },
            { step: 4, title: 'Review & Kirim', icon: FileCheck },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 transition-all ${
                currentStep === s.step
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold shadow-sm'
                  : currentStep > s.step
                  ? 'border-emerald-200 bg-white text-emerald-600'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span className="text-[11px] truncate">{s.title}</span>
            </div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* STEP 1: Data Diri Calon Siswa */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <User className="w-5 h-5 text-emerald-600" />
              <span>Langkah 1: Data Calon Siswa & Satuan Pendidikan</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Pendidikan</label>
                <select
                  value={formData.school_unit_id}
                  onChange={(e) => setFormData({ ...formData, school_unit_id: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  {schoolUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jalur Pendaftaran</label>
                <select
                  value={formData.registration_path}
                  onChange={(e) => setFormData({ ...formData, registration_path: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="reguler">Reguler (Umum)</option>
                  <option value="prestasi">Prestasi Akademik / Non-Akademik</option>
                  <option value="tahfidz">Beasiswa Tahfidz Quran</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Calon Siswa *</label>
              <input
                type="text"
                value={formData.candidate_full_name}
                onChange={(e) => setFormData({ ...formData, candidate_full_name: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="Nama sesuai akta kelahiran"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.candidate_birth_place}
                  onChange={(e) => setFormData({ ...formData, candidate_birth_place: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Kota kelahiran"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.candidate_birth_date}
                  onChange={(e) => setFormData({ ...formData, candidate_birth_date: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={formData.candidate_gender}
                  onChange={(e) => setFormData({ ...formData, candidate_gender: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="L">Laki-laki (Ikhwan)</option>
                  <option value="P">Perempuan (Akhwat)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Domisili Lengkap</label>
              <textarea
                rows={3}
                value={formData.candidate_address}
                onChange={(e) => setFormData({ ...formData, candidate_address: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="Jl. Nama Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-emerald-900/20 transition-all"
              >
                <span>{loading ? 'Menyimpan...' : 'Lanjut ke Data Orang Tua'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Data Orang Tua / Wali */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Next} className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Langkah 2: Data Orang Tua / Wali Santri</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Ayah</label>
                <input
                  type="text"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Nama lengkap ayah kandung"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Ibu</label>
                <input
                  type="text"
                  value={formData.mother_name}
                  onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Nama lengkap ibu kandung"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp Aktif Orang Tua *</label>
              <input
                type="text"
                value={formData.parent_contact}
                onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                placeholder="Contoh: 081234567890 (Untuk notifikasi status PPDB & tes)"
                required
              />
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-emerald-900/20 transition-all"
              >
                <span>{loading ? 'Menyimpan...' : 'Lanjut ke Unggah Dokumen'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Upload Dokumen */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              <span>Langkah 3: Unggah Dokumen Persyaratan</span>
            </h2>

            {/* Form Upload Item */}
            <form onSubmit={handleAddDocument} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Dokumen</label>
                  <select
                    value={docForm.document_type}
                    onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    {documentTypes.map((dt) => (
                      <option key={dt.key} value={dt.key}>{dt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tautan File Dokumen / URL</label>
                  <input
                    type="text"
                    value={docForm.file_url}
                    onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="https://... atau /uploads/dokumen.pdf"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Tambah Dokumen
                </button>
              </div>
            </form>

            {/* List Dokumen Terunggah */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Dokumen yang Dilampirkan ({documents.length})</h3>
              {documents.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  Belum ada dokumen yang dilampirkan (Dapat menyusul saat verifikasi berkas).
                </div>
              ) : (
                documents.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-800 capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                      <span className="text-slate-400 truncate max-w-xs font-mono text-[11px]">{doc.file_url}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-emerald-900/20 transition-all"
              >
                <span>Lanjut ke Review & Kirim</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit Final */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>Langkah 4: Konfirmasi & Kirim Pendaftaran</span>
            </h2>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Nama Calon Siswa</p>
                <p className="font-bold text-slate-800 text-sm">{formData.candidate_full_name}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Jalur & Tahun Ajaran</p>
                <p className="font-bold text-emerald-700 capitalize">{formData.registration_path} • {formData.school_year}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Tempat, Tanggal Lahir</p>
                <p className="font-semibold text-slate-800">{formData.candidate_birth_place || '-'}, {formData.candidate_birth_date || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Jenis Kelamin</p>
                <p className="font-semibold text-slate-800">{formData.candidate_gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Nama Orang Tua</p>
                <p className="font-semibold text-slate-800">Ayah: {formData.father_name || '-'} / Ibu: {formData.mother_name || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Kontak WhatsApp</p>
                <p className="font-semibold text-slate-800">{formData.parent_contact}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-medium">Alamat Domisili</p>
                <p className="font-semibold text-slate-800">{formData.candidate_address || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400 font-medium">Jumlah Dokumen Dilampirkan</p>
                <p className="font-semibold text-slate-800">{documents.length} Berkas Dokumen</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <p className="font-bold">Pernyataan Kebenaran Data:</p>
              <p>Dengan menekan tombol kirim di bawah, saya menyatakan bahwa seluruh data yang dimasukkan adalah benar dan bersedia mengikuti seluruh tahapan seleksi masuk Aldepos Islamic Boarding School.</p>
            </div>

            <div className="pt-4 flex justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={loading}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-emerald-900/30 transition-all hover:scale-105"
              >
                <span>{loading ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran Sekarang'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success & Tracking Code Display */}
        {currentStep === 5 && (
          <div className="text-center py-8 space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Pendaftaran Berhasil Dikirim!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Terima kasih telah mendaftar. Data formulir calon siswa telah kami terima dan masuk ke tahap verifikasi berkas oleh tim panitia PPDB.
              </p>
            </div>

            {/* Tracking Code Box */}
            <div className="max-w-xs mx-auto p-5 bg-slate-900 text-white rounded-2xl shadow-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Nomor Registrasi / Tracking</span>
              <p className="text-2xl font-mono font-extrabold text-emerald-300">#{submittedCode}</p>
              <p className="text-[10px] text-slate-400">Simpan nomor ini untuk melacak perkembangan status penerimaan.</p>
            </div>

            <div className="pt-4 flex justify-center space-x-4">
              <button
                onClick={() => router.push(`/ppdb/status?id=${submittedCode}`)}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md transition-all"
              >
                <span>Lacak Status Pendaftaran</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
