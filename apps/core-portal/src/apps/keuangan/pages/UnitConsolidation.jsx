import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Building2,
  School,
  Check,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Info,
  Sliders,
  Settings2,
  BookOpen,
  Receipt,
  Coins,
  FileSpreadsheet,
  RotateCcw,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  getConsolidationConfig,
  saveConsolidationConfig,
  getIncludedUnits,
  DEFAULT_CONSOLIDATION_CONFIG
} from '../../../shared/utils/unitConsolidationHelper';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';

export default function UnitConsolidation() {
  const { schoolUnits } = useAuth();
  const [config, setConfig] = useState(DEFAULT_CONSOLIDATION_CONFIG);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allUnitsIncluded, setAllUnitsIncluded] = useState(true);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [scope, setScope] = useState({
    accounting: true,
    billing: true,
    fund_balances: true,
    budget: true,
    reports: true
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [schoolUnits]);

  const loadConfig = () => {
    const current = getConsolidationConfig(schoolUnits);
    setConfig(current);
    setName(current.name || DEFAULT_CONSOLIDATION_CONFIG.name);
    setDescription(current.description || DEFAULT_CONSOLIDATION_CONFIG.description);
    setAllUnitsIncluded(Boolean(current.allUnitsIncluded));
    
    const ids = current.allUnitsIncluded
      ? (schoolUnits || []).map(u => u.id)
      : (current.includedUnitIds || []);
    setSelectedUnitIds(ids);

    setScope(current.scope || DEFAULT_CONSOLIDATION_CONFIG.scope);
  };

  const availableUnits = schoolUnits || [];
  const includedUnits = allUnitsIncluded
    ? availableUnits
    : availableUnits.filter(u => selectedUnitIds.map(String).includes(String(u.id)));

  const handleToggleUnit = (unitId) => {
    setAllUnitsIncluded(false);
    setSelectedUnitIds(prev => {
      const exists = prev.map(String).includes(String(unitId));
      if (exists) {
        return prev.filter(id => String(id) !== String(unitId));
      } else {
        return [...prev, unitId];
      }
    });
  };

  const handleSelectAllUnits = () => {
    setAllUnitsIncluded(true);
    setSelectedUnitIds(availableUnits.map(u => u.id));
  };

  const handleSelectSecondaryOnly = () => {
    setAllUnitsIncluded(false);
    const secondaryIds = availableUnits
      .filter(u => ['SMP', 'SMA', 'SMK', 'MA', 'MTS'].includes((u.level || '').toUpperCase()))
      .map(u => u.id);
    setSelectedUnitIds(secondaryIds.length > 0 ? secondaryIds : availableUnits.map(u => u.id));
  };

  const handleResetDefault = () => {
    setName(DEFAULT_CONSOLIDATION_CONFIG.name);
    setDescription(DEFAULT_CONSOLIDATION_CONFIG.description);
    setAllUnitsIncluded(true);
    setSelectedUnitIds(availableUnits.map(u => u.id));
    setScope(DEFAULT_CONSOLIDATION_CONFIG.scope);
  };

  const handleSave = () => {
    if (selectedUnitIds.length === 0 && !allUnitsIncluded) {
      alert('Pilih minimal satu satuan pendidikan untuk pengelolaan gabungan.');
      return;
    }

    setSaving(true);
    try {
      const updated = {
        ...config,
        name: name.trim() || DEFAULT_CONSOLIDATION_CONFIG.name,
        description: description.trim() || DEFAULT_CONSOLIDATION_CONFIG.description,
        allUnitsIncluded,
        includedUnitIds: allUnitsIncluded ? availableUnits.map(u => u.id) : selectedUnitIds,
        scope
      };

      saveConsolidationConfig(updated);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaving(false);
        setSaveSuccess(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan konfigurasi.');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Perencanaan &amp; Tarif</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-emerald-700">Pengelolaan Gabungan</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-600" />
            <span>Definisi Pengelolaan Gabungan Satuan Pendidikan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi definisi cakupan unit satuan pendidikan yang digabungkan pada pilihan konteks <b>"Pusat Yayasan (Gabungan)"</b>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadConfig}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-75"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Tersimpan!</span>
              </>
            ) : saving ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <FlatAlertBanner
          type="success"
          message="Definisi pengelolaan gabungan berhasil diperbarui dan diterapkan ke seluruh sistem!"
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Satuan Pendidikan</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{availableUnits.length} Satuan</div>
          <div className="text-xs text-slate-500 mt-1">Terdaftar resmi di Yayasan Aldepos</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Satuan Tergabung Aktif</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{includedUnits.length} Satuan</div>
          <div className="text-xs text-emerald-700 mt-1">
            {allUnitsIncluded ? 'Seluruh unit aktif terkonsolidasi' : 'Kombinasi unit pilihan khusus'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Status Konsolidasi</div>
          <div className="text-sm font-bold text-indigo-900 mt-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Aktif &amp; Terkonsolidasi</span>
          </div>
          <div className="text-xs text-indigo-600 mt-1">Laporan &amp; buku besar terintegrasi</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Form Identitas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600" />
                <span>Identitas &amp; Label Pengelolaan Gabungan</span>
              </h2>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standar</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Nama Tampilan Konteks Gabungan
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pusat Yayasan (Gabungan Seluruh Satuan)"
                className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Deskripsi &amp; Penjelasan Definisi
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan tujuan dan cakupan penggabungan unit ini..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition resize-none"
              />
            </div>
          </div>

          {/* Checklist Satuan Pendidikan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Satuan Pendidikan yang Tergabung</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centang unit sekolah yang pengelolaannya dimasukkan ke dalam profil gabungan ini.
                </p>
              </div>

              {/* Preset Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllUnits}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                    allUnitsIncluded
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pilih Semua ({availableUnits.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectSecondaryOnly}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 transition"
                >
                  SMP &amp; SMA Saja
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {availableUnits.map((unit) => {
                const isChecked = allUnitsIncluded || selectedUnitIds.map(String).includes(String(unit.id));
                return (
                  <label
                    key={unit.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleUnit(unit.id)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-1 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{unit.name}</span>
                        {unit.level && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Jenjang {unit.level}
                          </span>
                        )}
                        {isChecked ? (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-600 text-white flex items-center gap-1">
                            <Check className="w-3 h-3" /> Termasuk dalam Gabungan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-200 text-slate-700">
                            Dikelola Mandiri Terpisah
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-4 flex-wrap">
                        <span>NPSN: <b className="text-slate-800">{unit.npsn || '-'}</b></span>
                        {unit.principal_name && (
                          <span>Kepala Sekolah: <b className="text-slate-800">{unit.principal_name}</b></span>
                        )}
                        {unit.phone_number && (
                          <span>Kontak: <b className="text-slate-800">{unit.phone_number}</b></span>
                        )}
                      </div>

                      {unit.address && (
                        <p className="text-xs text-slate-400 mt-1">
                          {unit.address}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Scope & Preview Card */}
        <div className="space-y-6">
          
          {/* Live Preview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Live Preview Konteks Terpilih
            </div>

            <div className="p-3.5 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">{name || 'Pusat Yayasan (Gabungan)'}</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {description || 'Pengelolaan terpadu satuan pendidikan'}
              </p>

              <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
                {includedUnits.map((u) => (
                  <span
                    key={u.id}
                    className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-semibold"
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Pilihan ini akan ditampilkan pada dropdown di header atas untuk memudahkan identifikasi data.
            </div>
          </div>

          {/* Cakupan Fitur */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Cakupan Modul Konsolidasi</span>
            </h3>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.accounting}
                  onChange={(e) => setScope({ ...scope, accounting: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Laporan Keuangan Konsolidasi</div>
                  <div className="text-[10px] text-slate-400">Neraca, Laba Rugi, Buku Besar</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.billing}
                  onChange={(e) => setScope({ ...scope, billing: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Rekap Tagihan &amp; Pembayaran</div>
                  <div className="text-[10px] text-slate-400">Piutang &amp; kwitansi seluruh santri</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.fund_balances}
                  onChange={(e) => setScope({ ...scope, fund_balances: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pos Dana &amp; Rekening Kas Pusat</div>
                  <div className="text-[10px] text-slate-400">Monitoring saldo kas &amp; bank yayasan</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.budget}
                  onChange={(e) => setScope({ ...scope, budget: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Rencana Anggaran (RAPBS)</div>
                  <div className="text-[10px] text-slate-400">Alokasi pagu &amp; belanja terpadu</div>
                </div>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
