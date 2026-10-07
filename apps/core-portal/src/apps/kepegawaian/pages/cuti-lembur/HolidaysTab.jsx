import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Edit2,
  Tag
} from 'lucide-react';
import api from '../../../../shared/services/api';

export default function HolidaysTab({ activeSchoolUnit }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Holiday Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    holiday_type: 'national',
    start_date: '',
    end_date: '',
    is_off_day: true,
    deducts_annual_leave: false,
    applies_to: 'all_employees',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      let q = `?year=${selectedYear}`;
      if (activeSchoolUnit?.id) q += `&schoolUnitId=${activeSchoolUnit.id}`;
      const res = await api.get(`/kepegawaian/holidays${q}`);
      if (res.data?.success) {
        setHolidays(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear, activeSchoolUnit]);

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        ...form,
        school_unit_id: activeSchoolUnit?.id || null
      };
      const res = await api.post('/kepegawaian/holidays', payload);
      if (res.data?.success) {
        setIsModalOpen(false);
        setForm({
          name: '',
          holiday_type: 'national',
          start_date: '',
          end_date: '',
          is_off_day: true,
          deducts_annual_leave: false,
          applies_to: 'all_employees',
          notes: ''
        });
        fetchHolidays();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan hari libur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus hari libur ini?')) return;
    try {
      await api.delete(`/kepegawaian/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus hari libur');
    }
  };

  const filteredHolidays = holidays.filter(h =>
    (h.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama hari libur atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026">Tahun 2026</option>
            <option value="2027">Tahun 2027</option>
          </select>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Hari Libur
        </button>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Hari Libur</th>
                <th className="py-3.5 px-4">Kategori Libur</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4 text-center">Status Libur</th>
                <th className="py-3.5 px-4 text-center">Potong Cuti Tahunan</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat kalender libur...
                  </td>
                </tr>
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Belum ada hari libur terdaftar pada tahun {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {item.holiday_type?.replace('_', ' ') || 'Nasional'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{item.start_date}</div>
                      {item.end_date && item.end_date !== item.start_date && (
                        <div className="text-xs text-slate-400">s/d {item.end_date}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        item.is_off_day ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.is_off_day ? 'Hari Libur (Off)' : 'Tetap Masuk'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.deducts_annual_leave ? (
                        <span className="text-xs font-semibold text-rose-600">Ya (-1 Cuti)</span>
                      ) : (
                        <span className="text-xs text-slate-400">Tidak</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteHoliday(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Libur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Tambah Hari Libur / Cuti Bersama</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveHoliday} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Libur *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hari Raya Idul Fitri 1447 H"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Libur *</label>
                  <select
                    value={form.holiday_type}
                    onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="national">Libur Nasional Resmi</option>
                    <option value="joint_leave">Cuti Bersama Pemerintah</option>
                    <option value="school_semester">Libur Semester Sekolah</option>
                    <option value="school_ramadan">Libur Awal/Akhir Ramadan</option>
                    <option value="foundation">Libur Khusus Yayasan</option>
                    <option value="unit_special">Libur Khusus Satuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Pegawai</label>
                  <select
                    value={form.applies_to}
                    onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all_employees">Semua Pegawai</option>
                    <option value="schedules">Jadwal Tertentu (Guru Saja)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    required
                    value={form.end_date || form.start_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_off_day}
                    onChange={(e) => setForm({ ...form, is_off_day: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  Hari Libur (Pegawai Bebas Tugas)
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.deducts_annual_leave}
                    onChange={(e) => setForm({ ...form, deducts_annual_leave: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  Memotong Jatah Cuti Tahunan
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan SKB menteri atau surat edaran yayasan..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Hari Libur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
