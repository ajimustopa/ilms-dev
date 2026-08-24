import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  BookOpen,
  PiggyBank,
  Lock,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  X
} from 'lucide-react';

export default function Bookkeeping() {
  const [subTab, setSubTab] = useState('journals'); // 'journals' | 'savings' | 'closings'
  const [loading, setLoading] = useState(false);

  // Journal States
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [coaList, setCoaList] = useState([]);
  const [manualForm, setManualForm] = useState({
    journal_date: new Date().toISOString().slice(0, 10),
    description: '',
    lines: [
      { chart_of_account_id: 1, entry_side: 'debit', amount: 0 },
      { chart_of_account_id: 2, entry_side: 'credit', amount: 0 }
    ]
  });

  // Savings States
  const [savings, setSavings] = useState([]);
  const [selectedSaving, setSelectedSaving] = useState(null);
  const [savingModalOpen, setSavingModalOpen] = useState(false);
  const [savingTxType, setSavingTxType] = useState('deposit'); // 'deposit' | 'withdrawal'
  const [savingAmount, setSavingAmount] = useState('');

  // Closings States
  const [closings, setClosings] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (subTab === 'journals') {
        const [jRes, coaRes] = await Promise.all([
          api.get('/keuangan/journal-entries'),
          api.get('/keuangan/chart-of-accounts')
        ]);
        setJournals(jRes.data?.data || []);
        setCoaList(coaRes.data?.data || []);
      } else if (subTab === 'savings') {
        const res = await api.get('/keuangan/savings-accounts');
        setSavings(res.data?.data || []);
      } else if (subTab === 'closings') {
        const res = await api.get('/keuangan/fiscal-year-closings');
        setClosings(res.data?.data || []);
      }
    } catch (err) {
      console.error('Error fetching bookkeeping data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subTab]);

  const handleViewJournalDetail = async (id) => {
    try {
      const res = await api.get(`/keuangan/journal-entries/${id}`);
      setSelectedJournal(res.data?.data);
      setJournalModalOpen(true);
    } catch (err) {
      alert('Gagal memuat rincian jurnal');
    }
  };

  const handleCreateManualJournal = async (e) => {
    e.preventDefault();
    const sumDebit = manualForm.lines.filter(l => l.entry_side === 'debit').reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);
    const sumCredit = manualForm.lines.filter(l => l.entry_side === 'credit').reduce((acc, l) => acc + parseFloat(l.amount || 0), 0);

    if (Math.abs(sumDebit - sumCredit) >= 0.01) {
      alert(`Jurnal tidak seimbang! Total Debit (Rp ${sumDebit.toLocaleString()}) != Total Kredit (Rp ${sumCredit.toLocaleString()})`);
      return;
    }

    try {
      await api.post('/keuangan/journal-entries/manual', manualForm);
      alert('Jurnal manual berhasil dibuat!');
      setManualModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat jurnal manual');
    }
  };

  const handleSavingsTx = async (e) => {
    e.preventDefault();
    if (!selectedSaving) return;
    try {
      const endpoint = savingTxType === 'deposit'
        ? `/keuangan/savings-accounts/${selectedSaving.id}/deposit`
        : `/keuangan/savings-accounts/${selectedSaving.id}/withdraw`;

      await api.post(endpoint, { amount: parseFloat(savingAmount) });
      alert(`Transaksi ${savingTxType === 'deposit' ? 'setoran' : 'penarikan'} berhasil dicatat!`);
      setSavingModalOpen(false);
      setSavingAmount('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Transaksi tabungan gagal');
    }
  };

  const handleCloseFiscalYear = async () => {
    const ayId = prompt('Masukkan Academic Year ID untuk ditutup bukunya:', '1');
    if (!ayId) return;

    try {
      await api.post('/keuangan/fiscal-year-closings', { academic_year_id: parseInt(ayId, 10) });
      alert('Tutup buku tahunan berhasil diselesaikan!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses tutup buku tahunan');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pembukuan Akuntansi & Tabungan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Buku jurnal umum double-entry, pengelolaan tabungan siswa/guru, dan prosedur tutup buku tahunan
          </p>
        </div>
        {subTab === 'journals' && (
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Input Jurnal Penyesuaian Manual</span>
          </button>
        )}
        {subTab === 'closings' && (
          <button
            type="button"
            onClick={handleCloseFiscalYear}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto"
          >
            <Lock className="w-4 h-4" />
            <span>Tutup Buku Tahun Ajaran</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setSubTab('journals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            subTab === 'journals' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg' : 'border-transparent text-slate-500'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Jurnal Umum ({journals.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('savings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            subTab === 'savings' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg' : 'border-transparent text-slate-500'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>Tabungan Siswa & Guru</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('closings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            subTab === 'closings' ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg' : 'border-transparent text-slate-500'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Tutup Buku Tahunan</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-400">Memuat data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. JURNAL UMUM */}
            {subTab === 'journals' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">No. Jurnal</th>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Keterangan / Transaksi</th>
                    <th className="px-5 py-3">Sumber Mutasi</th>
                    <th className="px-5 py-3 text-right">Total Debit & Kredit</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {journals.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">{j.journal_number}</td>
                      <td className="px-5 py-3.5 text-slate-500">{j.journal_date ? j.journal_date.slice(0, 10) : '-'}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{j.description}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {j.source_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800">{formatCurrency(j.total_amount)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleViewJournalDetail(j.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                        >
                          Lihat Baris
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. TABUNGAN */}
            {subTab === 'savings' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">No. Rekening</th>
                    <th className="px-5 py-3">Nama Pemilik</th>
                    <th className="px-5 py-3">Tipe Nasabah</th>
                    <th className="px-5 py-3 text-right">Saldo Tabungan</th>
                    <th className="px-5 py-3 text-right">Aksi Setor / Tarik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savings.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-600">TAB#{s.id}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{s.owner_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700">
                          {s.owner_type === 'student' ? 'Siswa' : 'Pegawai/Guru'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-600 text-sm">{formatCurrency(s.balance)}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedSaving(s); setSavingTxType('deposit'); setSavingModalOpen(true); }}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                        >
                          + Setor Kas
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedSaving(s); setSavingTxType('withdrawal'); setSavingModalOpen(true); }}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold"
                        >
                          - Tarik Saldo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. TUTUP BUKU */}
            {subTab === 'closings' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Tahun Ajaran ID</th>
                    <th className="px-5 py-3">Status Buku</th>
                    <th className="px-5 py-3">Tanggal Penutupan</th>
                    <th className="px-5 py-3">Ditutup Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closings.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-800">Tahun Ajaran #{c.academic_year_id}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white flex items-center gap-1 w-fit">
                          <Lock className="w-3 h-3" /> {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{c.closed_at ? c.closed_at.slice(0, 10) : '-'}</td>
                      <td className="px-5 py-3.5 text-slate-600">User #{c.closed_by || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Detail Jurnal Lines */}
      {journalModalOpen && selectedJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Detail Baris Jurnal #{selectedJournal.journal_number}</h2>
                <p className="text-[11px] text-slate-400">{selectedJournal.description}</p>
              </div>
              <button type="button" onClick={() => setJournalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Akun (COA)</th>
                    <th className="px-4 py-2.5 text-right">Debit (Rp)</th>
                    <th className="px-4 py-2.5 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedJournal.lines?.map((line, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-emerald-700">{line.account_code}</div>
                        <div className="font-semibold text-slate-700">{line.account_name}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                        {line.entry_side === 'debit' ? formatCurrency(line.amount) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                        {line.entry_side === 'credit' ? formatCurrency(line.amount) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td className="px-4 py-2 text-slate-600">Total Seimbang</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(selectedJournal.total_debit)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(selectedJournal.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Jurnal Manual */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">Input Jurnal Penyesuaian Manual</h2>
              <button type="button" onClick={() => setManualModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateManualJournal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Jurnal</label>
                <input
                  type="text"
                  required
                  value={manualForm.description}
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                  placeholder="Misal: Penyesuaian Selisih Kas Kecil"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Baris Debit */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-emerald-700">1. Pos Debit</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={manualForm.lines[0].chart_of_account_id}
                    onChange={(e) => {
                      const newLines = [...manualForm.lines];
                      newLines[0].chart_of_account_id = parseInt(e.target.value, 10);
                      setManualForm({ ...manualForm, lines: newLines });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {coaList.map(c => <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Nominal Debit (Rp)"
                    value={manualForm.lines[0].amount}
                    onChange={(e) => {
                      const newLines = [...manualForm.lines];
                      newLines[0].amount = parseFloat(e.target.value || 0);
                      setManualForm({ ...manualForm, lines: newLines });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Baris Kredit */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-rose-700">2. Pos Kredit</span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={manualForm.lines[1].chart_of_account_id}
                    onChange={(e) => {
                      const newLines = [...manualForm.lines];
                      newLines[1].chart_of_account_id = parseInt(e.target.value, 10);
                      setManualForm({ ...manualForm, lines: newLines });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    {coaList.map(c => <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Nominal Kredit (Rp)"
                    value={manualForm.lines[1].amount}
                    onChange={(e) => {
                      const newLines = [...manualForm.lines];
                      newLines[1].amount = parseFloat(e.target.value || 0);
                      setManualForm({ ...manualForm, lines: newLines });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setManualModalOpen(false)} className="px-3.5 py-2 text-xs text-slate-600">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                  Simpan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Setor / Tarik Tabungan */}
      {savingModalOpen && selectedSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-sm font-bold text-slate-800">
                {savingTxType === 'deposit' ? 'Setor Tabungan' : 'Tarik Saldo Tabungan'} &bull; {selectedSaving.owner_name}
              </h2>
              <button type="button" onClick={() => setSavingModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavingsTx} className="space-y-3">
              <div className="text-xs text-slate-500">
                Saldo Saat Ini: <strong className="text-slate-800">{formatCurrency(selectedSaving.balance)}</strong>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal {savingTxType === 'deposit' ? 'Setoran' : 'Penarikan'} (Rp)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={savingAmount}
                  onChange={(e) => setSavingAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setSavingModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold">
                  Proses Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
