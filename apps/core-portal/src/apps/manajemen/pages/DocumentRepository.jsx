import React, { useState } from 'react';
import {
  FolderArchive,
  FileText,
  Download,
  Filter,
  Plus,
  Search,
  CheckCircle2,
  ExternalLink,
  Tag,
  Clock,
  Calendar
} from 'lucide-react';

export default function DocumentRepository() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const documents = [
    {
      id: 1,
      title: 'Rencana Induk Pengembangan Sekolah (RIPS/Renstra) 2026–2030',
      type: 'PDF',
      category: 'Renstra',
      owner: 'Ketua Yayasan',
      period: '2026–2030',
      version: 'v2.0',
      status: 'Terverifikasi / Resmi',
      date: '15 Jul 2026',
      fileUrl: '/documents/renstra-2026-2030.pdf'
    },
    {
      id: 2,
      title: 'Buku Rencana Kerja Tahunan (RKT) TA 2026/2027',
      type: 'PDF',
      category: 'RKT',
      owner: 'Kepala Sekolah',
      period: '2026/2027',
      version: 'v1.0',
      status: 'Terverifikasi / Resmi',
      date: '10 Agu 2026',
      fileUrl: '/documents/rkt-2026-2027.pdf'
    },
    {
      id: 3,
      title: 'SK Penetapan Indikator Kinerja Utama (IKU) & Target Mutu',
      type: 'PDF',
      category: 'SK & Kebijakan',
      owner: 'Tim Penjamin Mutu',
      period: '2026–2030',
      version: 'v1.1',
      status: 'Terverifikasi / Resmi',
      date: '01 Agu 2026',
      fileUrl: '/documents/sk-kpi-mutu.pdf'
    },
    {
      id: 4,
      title: 'Portofolio Bukti Fisik Standar Sarana & Prasarana Akreditasi',
      type: 'ZIP / PDF',
      category: 'Bukti Akreditasi',
      owner: 'Koordinator Sarpras',
      period: '2026',
      version: 'v1.0',
      status: 'Draf Peninjauan',
      date: '20 Agu 2026',
      fileUrl: '/documents/bukti-sarpras-akreditasi.zip'
    },
  ];

  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    if (searchQuery.trim() && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-600 flex items-center justify-center text-white font-bold">
              <FolderArchive className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black text-white">Repositori Dokumen Perencanaan & Mutu</h2>
          </div>
          <p className="text-xs text-slate-400">
            Arsip terpusat dokumen SK, naskah akademik Renstra, buku RKT, pedoman mutu, dan portofolio akreditasi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/50 transition border border-indigo-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Unggah / Tautkan Dokumen</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/80">
            {['all', 'Renstra', 'RKT', 'SK & Kebijakan', 'Bukti Akreditasi'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul dokumen..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-slate-400 text-[11px] uppercase font-bold">
            <tr>
              <th className="p-3 rounded-l-xl">Nama Dokumen</th>
              <th className="p-3">Kategori</th>
              <th className="p-3">Pemilik / Otorisator</th>
              <th className="p-3">Periode</th>
              <th className="p-3">Versi</th>
              <th className="p-3">Tanggal Unggah</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center rounded-r-xl">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                <td className="p-3">
                  <div className="font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{doc.title}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {doc.category}
                  </span>
                </td>
                <td className="p-3 text-slate-300">{doc.owner}</td>
                <td className="p-3 font-semibold text-indigo-300">{doc.period}</td>
                <td className="p-3 font-mono text-slate-400">{doc.version}</td>
                <td className="p-3 text-slate-400">{doc.date}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                    {doc.status}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    title="Buka / Unduh Dokumen"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
