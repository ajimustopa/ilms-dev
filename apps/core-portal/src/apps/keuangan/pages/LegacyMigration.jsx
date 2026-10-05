import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatRibbonCard from '../../../shared/components/StatRibbonCard';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  History,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
  Receipt,
  User,
  CreditCard,
  Building2,
  School,
  Edit3,
  HelpCircle
} from 'lucide-react';

export default function LegacyMigration() {
  const { activeSchoolUnit } = useAuth();

  // State Cutover Date
  const [cutoverData, setCutoverData] = useState(null);
  const [cutoverForm, setCutoverForm] = useState({ cutover_date: '', notes: '', reason: '' });
  const [isEditingCutover, setIsEditingCutover] = useState(false);
  const [loadingCutover, setLoadingCutover] = useState(true);

  // State Master Data
  const [students, setStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // State Form Tagihan Historis
  const [billForm, setBillForm] = useState({
    fee_type_id: '',
    period_month: '',
    period_year: new Date().getFullYear(),
    amount: '',
    paid_amount: '',
    due_date: '',
    historical_cash_note: '',
    legacy_note: ''
  });
  const [savingBill, setSavingBill] = useState(false);

  // State List Tagihan Historis
  const [legacyBills, setLegacyBills] = useState([]);
  const [summary, setSummary] = useState({ total_billed: 0, total_paid: 0, total_remaining: 0 });
  const [loadingBills, setLoadingBills] = useState(true);

  // State Modal Tambah Pembayaran Lampau
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: '',
    historical_cash_note: '',
    notes: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // General Notification State
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCutoverInfo = async () => {
    try {
      setLoadingCutover(true);
      const res = await api.get('/keuangan/legacy-migration/cutover-date');
      if (res.data?.success) {
        setCutoverData(res.data.data);
        if (res.data.data?.cutover_date) {
          setCutoverForm({
            cutover_date: res.data.data.cutover_date,
            notes: res.data.data.notes || '',
            reason: ''
          });
        }
      }
    } catch (err) {
      console.error('Error fetching cutover info:', err);
    } finally {
      setLoadingCutover(false);
    }
  };

  const fetchLegacyBills = async () => {
    try {
      setLoadingBills(true);
      const res = await api.get('/keuangan/legacy-migration/bills');
      if (res.data?.success) {
        setLegacyBills(res.data.data.bills || []);
        setSummary(res.data.data.summary || { total_billed: 0, total_paid: 0, total_remaining: 0 });
      }
    } catch (err) {
      console.error('Error fetching legacy bills:', err);
    } finally {
      setLoadingBills(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [studentsRes, feeTypesRes] = await Promise.all([
        api.get('/akademik/students?limit=200').catch(() => ({ data: { data: [] } })),
        api.get('/keuangan/fee-types?is_active=true').catch(() => ({ data: { data: [] } }))
      ]);

      const studs = studentsRes.data?.data?.students || studentsRes.data?.data || [];
      const types = feeTypesRes.data?.data || [];
      setStudents(studs);
      setFeeTypes(types);
      if (types.length > 0 && !billForm.fee_type_id) {
        setBillForm(prev => ({ ...prev, fee_type_id: types[0].id }));
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  useEffect(() => {
    fetchCutoverInfo();
    fetchLegacyBills();
    fetchMasterData();
  }, [activeSchoolUnit]);

  const handleSaveCutover = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.post('/keuangan/legacy-migration/cutover-date', cutoverForm);
      if (res.data?.success) {
        setSuccessMsg('Tanggal Mulai Pencatatan Sistem (Cutover Date) berhasil disimpan.');
        setIsEditingCutover(false);
        fetchCutoverInfo();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal menyimpan cutover date');
    }
  };

  const handleCreateLegacyBill = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMsg('Pilih santri terlebih dahulu.');
      return;
    }

    try {
      setSavingBill(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        student_id: selectedStudent.id,
        fee_type_id: Number(billForm.fee_type_id),
        period_month: billForm.period_month ? Number(billForm.period_month) : null,
        period_year: Number(billForm.period_year),
        amount: parseFloat(billForm.amount),
        paid_amount: billForm.paid_amount ? parseFloat(billForm.paid_amount) : 0,
        due_date: billForm.due_date,
        historical_cash_note: billForm.historical_cash_note,
        legacy_note: billForm.legacy_note
      };

      const res = await api.post('/keuangan/legacy-migration/bills', payload);
      if (res.data?.success) {
        setSuccessMsg(`Tagihan historis untuk ${selectedStudent.full_name || selectedStudent.name} berhasil dicatat.`);
        setBillForm({
          fee_type_id: feeTypes[0]?.id || '',
          period_month: '',
          period_year: new Date().getFullYear(),
          amount: '',
          paid_amount: '',
          due_date: '',
          historical_cash_note: '',
          legacy_note: ''
        });
        setSelectedStudent(null);
        setSearchStudentTerm('');
        fetchLegacyBills();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mencatat tagihan historis');
    } finally {
      setSavingBill(false);
    }
  };

  const handleAddLegacyPayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    try {
      setSavingPayment(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        historical_cash_note: paymentForm.historical_cash_note,
        notes: paymentForm.notes
      };

      const res = await api.post(`/keuangan/legacy-migration/bills/${selectedBillForPayment.id}/legacy-payments`, payload);
      if (res.data?.success) {
        setSuccessMsg(`Pembayaran historis sebesar Rp ${parseFloat(payload.amount).toLocaleString('id-ID')} berhasil dicatat.`);
        setSelectedBillForPayment(null);
        setPaymentForm({ amount: '', payment_date: '', historical_cash_note: '', notes: '' });
        fetchLegacyBills();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal mencatat pembayaran historis');
    } finally {
      setSavingPayment(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const term = searchStudentTerm.toLowerCase();
    return (s.full_name || s.name || '').toLowerCase().includes(term) ||
           (s.nis || '').toLowerCase().includes(term);
  }).slice(0, 8);

  // Menggunakan formatCurrency dari shared/utils/formatters

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Migrasi Data Historis & Saldo Awal</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <History className="w-3 h-3 text-amber-600" />
              <span>Modul Migrasi Awal</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan riwayat piutang santri & pembayaran lampau pra-sistem tanpa memengaruhi saldo kas aktif
          </p>
        </div>
      </div>

      {/* Alert Notifikasi */}
      {errorMsg && (
        <FlatAlertBanner
          variant="danger"
          message={errorMsg}
          onClose={() => setErrorMsg('')}
        />
      )}
      {successMsg && (
        <FlatAlertBanner
          variant="success"
          message={successMsg}
          onClose={() => setSuccessMsg('')}
        />
      )}

      {/* LANGKAH 1: PENGATURAN TANGGAL CUTOVER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-100 flex items-start gap-3.5">
          <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Langkah 1: Tanggal Mulai Pencatatan Sistem (Cutover Date)</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                Batas Awal Sistem
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Seluruh transaksi sebelum tanggal ini dianggap data historis (tidak membuat jurnal kas berjalan). Transaksi setelah tanggal ini akan otomatis membukukan kas dan jurnal akuntansi resmi.
            </p>
          </div>
        </div>

        <div className="p-6">
          {loadingCutover ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>Memeriksa status cutover date...</span>
            </div>
          ) : cutoverData?.cutover_date && !isEditingCutover ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500">Tanggal Cutover Aktif</div>
                  <div className="text-lg font-extrabold text-slate-800 tracking-tight tnum">
                    {cutoverData.cutover_date}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {cutoverData.notes ? `Catatan: "${cutoverData.notes}"` : 'Tidak ada catatan tambahan'} &bull; Tercatat {cutoverData.legacy_bills_count} tagihan migrasi
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCutover(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs self-start sm:self-center"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Ubah Tanggal Cutover</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveCutover} className="space-y-4">
              {isEditingCutover && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <strong>PERINGATAN RISIKO:</strong> Mengubah tanggal cutover saat sistem sudah memiliki tagihan & pembayaran aktif dapat memengaruhi validasi tanggal transaksi. Wajib sertakan alasan pengubahan resmi.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Cutover (YYYY-MM-DD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={cutoverForm.cutover_date}
                    onChange={(e) => setCutoverForm({ ...cutoverForm, cutover_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Contoh: 2026-07-01 (Awal Tahun Ajaran 2026/2027)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Pengaturan Cutover
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Cutover Go-Live Tahun Ajaran Baru"
                    value={cutoverForm.notes}
                    onChange={(e) => setCutoverForm({ ...cutoverForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {isEditingCutover && (
                <div>
                  <label className="block text-xs font-bold text-rose-800 mb-1">
                    Alasan Pengubahan Tanggal Cutover (Wajib Diisi) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Jelaskan alasan pengubahan cutover date..."
                    value={cutoverForm.reason}
                    onChange={(e) => setCutoverForm({ ...cutoverForm, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-rose-50/40 border border-rose-200 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  {isEditingCutover ? 'Simpan Perubahan Cutover' : 'Tetapkan Tanggal Cutover'}
                </button>
                {isEditingCutover && (
                  <button
                    type="button"
                    onClick={() => setIsEditingCutover(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatRibbonCard
          label="Total Piutang Migrasi"
          value={formatCurrency(summary.total_billed)}
          status="neutral"
          subtext="Akumulasi tagihan lampau yang dicatat"
        />
        <StatRibbonCard
          label="Terbayar Lampau"
          value={formatCurrency(summary.total_paid)}
          status="success"
          subtext="Sudah dilunasi sebelum cutover"
        />
        <StatRibbonCard
          label="Sisa Piutang Berjalan"
          value={formatCurrency(summary.total_remaining)}
          status="danger"
          subtext="Menjadi saldo awal piutang aktif"
        />
      </div>

      {/* LANGKAH 2: FORM & DAFTAR TAGIHAN HISTORIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Input Tagihan Historis */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Langkah 2: Entri Tagihan Lampau</h2>
              <p className="text-[11px] text-slate-400">Input saldo piutang & cicilan lama santri</p>
            </div>
          </div>

          {!cutoverData?.cutover_date ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
              <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <span>Silakan atur <strong>Tanggal Cutover</strong> pada Langkah 1 terlebih dahulu sebelum menginput data tagihan historis.</span>
            </div>
          ) : (
            <form onSubmit={handleCreateLegacyBill} className="space-y-3.5">
              {/* Autocomplete Pencarian Santri */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Santri <span className="text-red-500">*</span>
                </label>
                {selectedStudent ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-900">{selectedStudent.full_name || selectedStudent.name}</div>
                      <div className="text-[10px] text-emerald-700">NIS: {selectedStudent.nis || '-'} &bull; Kelas: {selectedStudent.class_name || '-'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 relative">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik Nama atau NIS santri..."
                        value={searchStudentTerm}
                        onChange={(e) => setSearchStudentTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                    {searchStudentTerm && (
                      <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">Santri tidak ditemukan</div>
                        ) : (
                          filteredStudents.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => { setSelectedStudent(s); setSearchStudentTerm(''); }}
                              className="w-full text-left p-2.5 hover:bg-slate-50 text-xs flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-800">{s.full_name || s.name}</span>
                              <span className="text-[10px] text-slate-500">NIS: {s.nis}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Jenis Biaya */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pos / Jenis Biaya <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={billForm.fee_type_id}
                  onChange={(e) => setBillForm({ ...billForm, fee_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  {feeTypes.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.billing_pattern})</option>
                  ))}
                </select>
              </div>

              {/* Periode Bulan & Tahun */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bulan (Opsional)</label>
                  <select
                    value={billForm.period_month}
                    onChange={(e) => setBillForm({ ...billForm, period_month: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  >
                    <option value="">-- Tahunan / Bebas --</option>
                    {[...Array(12)].map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>Bulan {idx + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Lampau <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={billForm.period_year}
                    onChange={(e) => setBillForm({ ...billForm, period_year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Nominal Tagihan & Cicilan Awal */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Tagihan (Rp) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 500000"
                    value={billForm.amount}
                    onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sudah Dibayar Lama</label>
                  <input
                    type="number"
                    placeholder="Contoh: 200000"
                    value={billForm.paid_amount}
                    onChange={(e) => setBillForm({ ...billForm, paid_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Jatuh Tempo Lampau */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jatuh Tempo Lampau (&lt; {cutoverData.cutover_date}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  max={cutoverData.cutover_date}
                  value={billForm.due_date}
                  onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Kas Lampau (Informasional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Buku Kas Tunai Bendahara 2025"
                  value={billForm.historical_cash_note}
                  onChange={(e) => setBillForm({ ...billForm, historical_cash_note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={savingBill || !selectedStudent}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {savingBill && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Tagihan Historis</span>
              </button>
            </form>
          )}
        </div>

        {/* Tabel Rekapitulasi Tagihan Historis */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Daftar Tagihan Historis Terdaftar</h2>
              <p className="text-[11px] text-slate-400">Total {legacyBills.length} pos tagihan migrasi</p>
            </div>
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{legacyBills.length}</span> tagihan terdata
            </div>
          </div>

          <div className="table-container flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                <tr>
                  <th className="px-3 py-2.5">Santri</th>
                  <th className="px-3 py-2.5">Jenis Biaya</th>
                  <th className="px-3 py-2.5 text-right">Nominal</th>
                  <th className="px-3 py-2.5 text-right">Terbayar Lampau</th>
                  <th className="px-3 py-2.5 text-right">Sisa Tagihan</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingBills ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400 italic">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-1" />
                      Memuat daftar tagihan historis...
                    </td>
                  </tr>
                ) : legacyBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400 italic">
                      Belum ada tagihan historis yang diinput. Silakan gunakan form di samping.
                    </td>
                  </tr>
                ) : (
                  legacyBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800">{b.student_name}</div>
                        <div className="text-[10px] text-slate-500 tnum">NIS: {b.student_nis}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-700">{b.fee_type_name}</div>
                        <div className="text-[10px] text-slate-500 tnum">
                          {b.period_month ? `Bln ${b.period_month} / ` : ''}{b.period_year}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 num-cell font-semibold text-slate-800">
                        {formatCurrency(b.amount)}
                      </td>
                      <td className="px-3 py-2.5 num-cell text-emerald-700 font-semibold">
                        {formatCurrency(b.paid_amount)}
                      </td>
                      <td className="px-3 py-2.5 num-cell text-rose-700 font-bold">
                        {formatCurrency(b.remaining_amount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusPill
                          variant={b.status === 'paid' ? 'success' : b.status === 'partially_paid' ? 'warning' : 'danger'}
                          label={b.status === 'paid' ? 'Lunas' : b.status === 'partially_paid' ? 'Sebagian' : 'Belum Lunas'}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.status !== 'paid' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedBillForPayment(b)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold transition"
                            title="Tambah cicilan pembayaran sebelum cutover"
                          >
                            + Bayar Lampau
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Pembayaran Lampau */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catat Pembayaran Lampau</h3>
                <p className="text-[11px] text-slate-500">
                  Untuk {selectedBillForPayment.student_name} ({selectedBillForPayment.fee_type_name})
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                Pra-Cutover
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total Tagihan:</span>
                <strong className="tnum font-semibold text-slate-800">{formatCurrency(selectedBillForPayment.amount)}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sisa Tunggakan:</span>
                <strong className="tnum font-bold text-rose-700">{formatCurrency(selectedBillForPayment.remaining_amount)}</strong>
              </div>
            </div>

            <form onSubmit={handleAddLegacyPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Dibayar (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  max={selectedBillForPayment.remaining_amount}
                  placeholder={`Maks ${selectedBillForPayment.remaining_amount}`}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Bayar Asli (&lt; {cutoverData.cutover_date}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  max={cutoverData.cutover_date}
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Kas Lampau
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Titipan bendahara lama"
                  value={paymentForm.historical_cash_note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, historical_cash_note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBillForPayment(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                >
                  {savingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
