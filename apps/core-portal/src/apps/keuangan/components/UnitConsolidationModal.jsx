import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import {
  Building2,
  School,
  Check,
  CheckCircle2,
  X,
  Layers,
  ShieldCheck,
  Info,
  Sliders,
  Settings2,
  Sparkles,
  BookOpen,
  Receipt,
  Coins,
  FileSpreadsheet,
  BarChart3,
  RotateCcw
} from 'lucide-react';
import {
  getConsolidationConfig,
  saveConsolidationConfig,
  getIncludedUnits,
  DEFAULT_CONSOLIDATION_CONFIG
} from '../../../shared/utils/unitConsolidationHelper';

export default function UnitConsolidationModal({ isOpen, onClose, onSaved }) {
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

  // Inisialisasi data dari config tersimpan saat modal dibuka
  useEffect(() => {
    if (isOpen) {
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
      setSaveSuccess(false);
    }
  }, [isOpen, schoolUnits]);

  if (!isOpen) return null;

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

      if (onSaved) {
        onSaved(updated);
      }

      setTimeout(() => {
        setSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan konfigurasi.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-snug">
                Definisi Pengelolaan Gabungan Satuan Pendidikan
              </h2>
              <p className="text-xs text-slate-300">
                Atur satuan pendidikan mana saja yang digabung dalam konsolidasi keuangan Yayasan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          
          {/* Ringkasan Status Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Unit Tersedia</div>
              <div className="text-lg font-bold text-slate-800 mt-0.5">{availableUnits.length} Satuan</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Terdaftar di Yayasan</div>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Unit Tergabung Aktif</div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">{includedUnits.length} Satuan</div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {allUnitsIncluded ? 'Semua Unit Terkonsolidasi' : 'Unit Pilihan Khusus'}
              </div>
            </div>

            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
              <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Status Konsolidasi</div>
              <div className="text-xs font-bold text-indigo-900 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Terverifikasi Terpadu</span>
              </div>
              <div className="text-[10px] text-indigo-600 mt-0.5">Siap Transaksi &amp; Laporan</div>
            </div>
          </div>

          {/* Form Identitas Grup Gabungan */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Nama Label &amp; Deskripsi Pengelolaan Gabungan
              </label>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Standar</span>
              </button>
            </div>

            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pusat Yayasan (Gabungan)"
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition"
              />
            </div>

            <div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat mengenai cakupan penggabungan keuangan ini..."
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition resize-none"
              />
            </div>
          </div>

          {/* Section Pilihan Satuan Pendidikan yang Digabung */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daftar Satuan Pendidikan yang Diikutsertakan</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Centang unit yang data keuangan, tagihan, kas, dan pembukuannya dikelola secara gabungan.
                </p>
              </div>

              {/* Tombol Preset Cepat */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllUnits}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                    allUnitsIncluded
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pilih Semua ({availableUnits.length})
                </button>
                <button
                  type="button"
                  onClick={handleSelectSecondaryOnly}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                >
                  SMP &amp; SMA
                </button>
              </div>
            </div>

            {/* List Satuan Pendidikan */}
            <div className="space-y-2 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
              {availableUnits.map((unit) => {
                const isChecked = allUnitsIncluded || selectedUnitIds.map(String).includes(String(unit.id));
                return (
                  <label
                    key={unit.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-white border-emerald-300 shadow-2xs'
                        : 'bg-slate-100/70 border-slate-200/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleUnit(unit.id)}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-0.5 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-800">{unit.name}</span>
                        {unit.level && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Jenjang {unit.level}
                          </span>
                        )}
                        {isChecked ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Tergabung
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-200 text-slate-600">
                            Dipisahkan (Mandiri)
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>NPSN: <b className="text-slate-700">{unit.npsn || '-'}</b></span>
                        {unit.principal_name && (
                          <span>Kepala: <b className="text-slate-700">{unit.principal_name}</b></span>
                        )}
                        {unit.phone_number && (
                          <span>Telp: <b className="text-slate-700">{unit.phone_number}</b></span>
                        )}
                      </div>

                      {unit.address && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {unit.address}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section Cakupan Modul Konsolidasi */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cakupan Modul Konsolidasi Terpadu</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.accounting}
                  onChange={(e) => setScope({ ...scope, accounting: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Laporan Keuangan Konsolidasi</div>
                  <div className="text-[10px] text-slate-400">Neraca, Laba Rugi, Buku Besar Gabungan</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.billing}
                  onChange={(e) => setScope({ ...scope, billing: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Rekap Tagihan &amp; Pembayaran</div>
                  <div className="text-[10px] text-slate-400">Monitoring piutang seluruh santri</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.fund_balances}
                  onChange={(e) => setScope({ ...scope, fund_balances: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Pos Dana &amp; Rekening Kas Pusat</div>
                  <div className="text-[10px] text-slate-400">Konsolidasi saldo pool kas &amp; bank</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scope.budget}
                  onChange={(e) => setScope({ ...scope, budget: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-slate-800">Rencana Anggaran (RAPBS)</div>
                  <div className="text-[10px] text-slate-400">Perencanaan pagu &amp; belanja yayasan</div>
                </div>
              </label>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <b>Catatan Transparansi:</b> Pengaturan ini memperjelas konteks <b>"Pusat Yayasan (Gabungan)"</b> pada seluruh dropdown dan modul laporan, sehingga bendahara/pimpinan mengetahui secara pasti satuan mana saja yang masuk dalam agregasi data.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {includedUnits.length} dari {availableUnits.length} satuan pendidikan terpilih
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
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
                  <span>Simpan Definisi Gabungan</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
