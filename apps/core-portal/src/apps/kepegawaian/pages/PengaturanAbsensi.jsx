import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import {
  MapPin,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Crosshair,
  CheckCircle,
  AlertCircle,
  Calendar,
  Shield,
  X,
  Search,
  Building,
  RefreshCw,
  Power
} from 'lucide-react';

export default function PengaturanAbsensi() {
  const { activeSchoolUnit, schoolUnits } = useAuth();
  const [activeTab, setActiveTab] = useState('locations'); // 'locations' | 'schedules'

  // State: Lokasi Absensi
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoAccuracy, setGeoAccuracy] = useState(null);

  // Form State: Lokasi
  const [locationForm, setLocationForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    address: '',
    notes: '',
    is_active: true
  });

  // State: Pengaturan Jam Kerja
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Form State: Jam Kerja
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    day_of_week: 'all',
    start_time: '07:15',
    end_time: '16:00',
    late_tolerance_minutes: 15,
    early_departure_tolerance_minutes: 0,
    is_active: true,
    notes: ''
  });

  // State Feedback & Delete Confirm Modal
  const [feedback, setFeedback] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'location'|'schedule', id: 1, name: '...' }

  const currentUnitId = activeSchoolUnit?.id || schoolUnits?.[0]?.id || 1;

  // 1. Fetch Data Lokasi
  const fetchLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const res = await api.get('/kepegawaian/attendance/locations', {
        params: { satuan_pendidikan_id: currentUnitId }
      });
      if (res.data?.success) {
        setLocations(res.data.data || []);
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal memuat data lokasi absensi'
      });
    } finally {
      setLoadingLocations(false);
    }
  }, [currentUnitId]);

  // 2. Fetch Data Jam Kerja
  const fetchSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      const res = await api.get('/kepegawaian/attendance/work-schedules', {
        params: { satuan_pendidikan_id: currentUnitId }
      });
      if (res.data?.success) {
        setSchedules(res.data.data || []);
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal memuat data jam kerja'
      });
    } finally {
      setLoadingSchedules(false);
    }
  }, [currentUnitId]);

  useEffect(() => {
    fetchLocations();
    fetchSchedules();
  }, [fetchLocations, fetchSchedules]);

  // Handle Geolocation Browser
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'warning',
        message: 'Browser Anda tidak mendukung deteksi lokasi Geolocation'
      });
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLocationForm((prev) => ({
          ...prev,
          latitude: latitude.toFixed(8),
          longitude: longitude.toFixed(8)
        }));
        setGeoAccuracy(accuracy);
        setGeoLocating(false);
        setFeedback({
          type: 'success',
          message: `Koordinat GPS berhasil diambil (Akurasi: ±${Math.round(accuracy)} meter)`
        });
      },
      (err) => {
        setGeoLocating(false);
        setFeedback({
          type: 'danger',
          message: `Gagal mendeteksi lokasi GPS: ${err.message}. Pastikan izin lokasi diaktifkan di browser Anda.`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Submit Lokasi Form
  const handleSubmitLocation = async (e) => {
    e.preventDefault();
    const lat = parseFloat(locationForm.latitude);
    const lng = parseFloat(locationForm.longitude);
    const radius = parseFloat(locationForm.radius_meters);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFeedback({ type: 'danger', message: 'Latitude harus bernilai angka antara -90 dan 90' });
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFeedback({ type: 'danger', message: 'Longitude harus bernilai angka antara -180 dan 180' });
      return;
    }
    if (isNaN(radius) || radius < 10) {
      setFeedback({ type: 'danger', message: 'Radius toleransi minimal 10 meter' });
      return;
    }

    try {
      const payload = {
        ...locationForm,
        satuan_pendidikan_id: currentUnitId,
        latitude: lat,
        longitude: lng,
        radius_meters: radius
      };

      if (editingLocation) {
        await api.put(`/kepegawaian/attendance/locations/${editingLocation.id}`, payload);
        setFeedback({ type: 'success', message: 'Lokasi absensi berhasil diperbarui' });
      } else {
        await api.post('/kepegawaian/attendance/locations', payload);
        setFeedback({ type: 'success', message: 'Lokasi absensi baru berhasil ditambahkan' });
      }

      setLocationModalOpen(false);
      setEditingLocation(null);
      fetchLocations();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menyimpan lokasi absensi'
      });
    }
  };

  // Submit Jam Kerja Form
  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...scheduleForm,
        satuan_pendidikan_id: currentUnitId,
        late_tolerance_minutes: parseInt(scheduleForm.late_tolerance_minutes, 10),
        early_departure_tolerance_minutes: parseInt(scheduleForm.early_departure_tolerance_minutes, 10)
      };

      if (editingSchedule) {
        await api.put(`/kepegawaian/attendance/work-schedules/${editingSchedule.id}`, payload);
        setFeedback({ type: 'success', message: 'Pengaturan jam kerja berhasil diperbarui' });
      } else {
        await api.post('/kepegawaian/attendance/work-schedules', payload);
        setFeedback({ type: 'success', message: 'Pengaturan jam kerja baru berhasil ditambahkan' });
      }

      setScheduleModalOpen(false);
      setEditingSchedule(null);
      fetchSchedules();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menyimpan pengaturan jam kerja'
      });
    }
  };

  // Eksekusi Hapus / Toggle Status
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'location') {
        await api.delete(`/kepegawaian/attendance/locations/${deleteConfirm.id}`);
        setFeedback({ type: 'success', message: `Lokasi '${deleteConfirm.name}' berhasil dihapus` });
        fetchLocations();
      } else {
        await api.delete(`/kepegawaian/attendance/work-schedules/${deleteConfirm.id}`);
        setFeedback({ type: 'success', message: `Pengaturan jam kerja '${deleteConfirm.name}' berhasil dihapus` });
        fetchSchedules();
      }
      setDeleteConfirm(null);
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menghapus data'
      });
      setDeleteConfirm(null);
    }
  };

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    if (!locationSearch) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        (l.address && l.address.toLowerCase().includes(locationSearch.toLowerCase()))
    );
  }, [locations, locationSearch]);

  const formatDayName = (day) => {
    const map = {
      all: 'Semua Hari (Senin-Minggu)',
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Minggu'
    };
    return map[day] || day;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Building className="w-4 h-4 text-slate-400" />
            <span>Kepegawaian</span>
            <span>/</span>
            <span className="text-slate-700">Pengaturan Absensi</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Pengaturan Absensi & Jam Kerja</h1>
          <p className="text-sm text-slate-600">
            Kelola multi-titik radius GPS dan jam operasional shift pegawai untuk Satuan Pendidikan aktif.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'locations'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Lokasi GPS ({locations.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'schedules'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Jam Kerja ({schedules.length})
          </button>
        </div>
      </div>

      {/* Banner Feedback */}
      {feedback && (
        <FlatAlertBanner
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* =========================================================================
          TAB 1: LOKASI ABSENSI GPS
          ========================================================================= */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama titik atau alamat..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => {
                setEditingLocation(null);
                setLocationForm({
                  name: '',
                  latitude: '',
                  longitude: '',
                  radius_meters: 100,
                  address: '',
                  notes: '',
                  is_active: true
                });
                setGeoAccuracy(null);
                setLocationModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Titik Lokasi
            </button>
          </div>

          {loadingLocations ? (
            <div className="bg-white p-12 text-center rounded-lg border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-sm text-slate-500">Memuat daftar titik lokasi absensi...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-slate-200">
              <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">Belum Ada Titik Lokasi Absensi</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Tambahkan titik koordinat resmi kampus agar guru dan staf dapat melakukan presensi kehadiran melalui perangkat mobile.
              </p>
              <button
                onClick={() => {
                  setEditingLocation(null);
                  setLocationModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Tambah Titik Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className={`bg-white rounded-lg border transition-shadow p-5 flex flex-col justify-between ${
                    loc.is_active ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{loc.name}</h3>
                      </div>
                      <StatusPill
                        status={loc.is_active ? 'success' : 'neutral'}
                        label={loc.is_active ? 'Aktif' : 'Nonaktif'}
                      />
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Koordinat:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {parseFloat(loc.latitude).toFixed(6)}, {parseFloat(loc.longitude).toFixed(6)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Radius Toleransi:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {parseFloat(loc.radius_meters)} Meter
                        </span>
                      </div>
                      {loc.address && (
                        <div className="pt-1 text-slate-500">
                          <span className="font-medium text-slate-700 block">Alamat:</span>
                          <span className="line-clamp-2">{loc.address}</span>
                        </div>
                      )}
                      {loc.notes && (
                        <div className="pt-1 text-slate-400 italic">
                          <span>Catatan: {loc.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingLocation(loc);
                        setLocationForm({
                          name: loc.name,
                          latitude: loc.latitude,
                          longitude: loc.longitude,
                          radius_meters: loc.radius_meters,
                          address: loc.address || '',
                          notes: loc.notes || '',
                          is_active: Boolean(loc.is_active)
                        });
                        setGeoAccuracy(null);
                        setLocationModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded border border-slate-300 flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          type: 'location',
                          id: loc.id,
                          name: loc.name
                        })
                      }
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: PENGATURAN JAM KERJA & SHIFT
          ========================================================================= */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">Jadwal Shift & Toleransi Masuk/Pulang</h2>
              <p className="text-xs text-slate-500">Tentukan batas jam masuk, kepulangan, serta toleransi menit sebelum dianggap terlambat.</p>
            </div>
            <button
              onClick={() => {
                setEditingSchedule(null);
                setScheduleForm({
                  name: '',
                  day_of_week: 'all',
                  start_time: '07:15',
                  end_time: '16:00',
                  late_tolerance_minutes: 15,
                  early_departure_tolerance_minutes: 0,
                  is_active: true,
                  notes: ''
                });
                setScheduleModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Shift Kerja
            </button>
          </div>

          {loadingSchedules ? (
            <div className="bg-white p-12 text-center rounded-lg border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-sm text-slate-500">Memuat pengaturan jam kerja...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-slate-200">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">Belum Ada Pengaturan Jam Kerja</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Atur jam kerja default satuan pendidikan agar sistem dapat menghitung status keterlambatan kehadiran secara otomatis.
              </p>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Tambah Shift Pertama
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Nama Shift / Jadwal</th>
                      <th className="py-3.5 px-4">Hari Berlaku</th>
                      <th className="py-3.5 px-4">Jam Masuk</th>
                      <th className="py-3.5 px-4">Jam Pulang</th>
                      <th className="py-3.5 px-4">Toleransi Terlambat</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {schedules.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.notes && <div className="text-xs text-slate-400">{item.notes}</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDayName(item.day_of_week)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          {item.start_time?.slice(0, 5)} WIB
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {item.end_time?.slice(0, 5)} WIB
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            +{item.late_tolerance_minutes} Menit
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill
                            status={item.is_active ? 'success' : 'neutral'}
                            label={item.is_active ? 'Aktif' : 'Nonaktif'}
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingSchedule(item);
                                setScheduleForm({
                                  name: item.name,
                                  day_of_week: item.day_of_week,
                                  start_time: item.start_time?.slice(0, 5) || '07:15',
                                  end_time: item.end_time?.slice(0, 5) || '16:00',
                                  late_tolerance_minutes: item.late_tolerance_minutes,
                                  early_departure_tolerance_minutes: item.early_departure_tolerance_minutes,
                                  is_active: Boolean(item.is_active),
                                  notes: item.notes || ''
                                });
                                setScheduleModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded"
                              title="Edit Shift"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'schedule',
                                  id: item.id,
                                  name: item.name
                                })
                              }
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Hapus Shift"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH / EDIT LOKASI ABSENSI
          ========================================================================= */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingLocation ? 'Edit Titik Lokasi Absensi' : 'Tambah Titik Lokasi Baru'}
                </h3>
              </div>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLocation} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Titik Lokasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mis. Kampus Utama, Gedung Asrama, GOR"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Koordinat GPS + Tombol Ambil Lokasi */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">Koordinat GPS Sekolah</span>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geoLocating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
                    {geoLocating ? 'Mendeteksi...' : 'Gunakan Lokasi Saya Saat Ini'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Latitude (Lintang) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="-6.65215000"
                      value={locationForm.latitude}
                      onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Longitude (Bujur) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="106.81232000"
                      value={locationForm.longitude}
                      onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {geoAccuracy && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✓ Koordinat terdeteksi dengan akurasi GPS: ±{Math.round(geoAccuracy)} meter
                  </p>
                )}
              </div>

              {/* Radius */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Radius Toleransi Presensi (Meter) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    required
                    value={locationForm.radius_meters}
                    onChange={(e) => setLocationForm({ ...locationForm, radius_meters: e.target.value })}
                    className="w-32 px-3 py-2 text-sm font-bold text-emerald-700 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500">
                    Pegawai hanya dapat check-in jika berada di dalam radius ini.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Alamat Fisik</label>
                <textarea
                  rows="2"
                  placeholder="Jl. Raya Aldepos No. 1, Bogor..."
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="loc_is_active"
                  checked={locationForm.is_active}
                  onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="loc_is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Aktifkan titik lokasi ini untuk presensi harian
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm"
                >
                  {editingLocation ? 'Simpan Perubahan' : 'Tambah Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH / EDIT PENGATURAN JAM KERJA
          ========================================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingSchedule ? 'Edit Pengaturan Jam Kerja' : 'Tambah Pengaturan Jam Kerja Baru'}
                </h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Shift / Jadwal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mis. Shift Reguler Senin-Kamis, Shift Khusus Jumat"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hari Berlaku <span className="text-rose-500">*</span>
                </label>
                <select
                  value={scheduleForm.day_of_week}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="all">Semua Hari Kerja (Senin - Minggu)</option>
                  <option value="monday">Senin</option>
                  <option value="tuesday">Selasa</option>
                  <option value="wednesday">Rabu</option>
                  <option value="thursday">Kamis</option>
                  <option value="friday">Jumat</option>
                  <option value="saturday">Sabtu</option>
                  <option value="sunday">Minggu</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jam Masuk Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-emerald-700 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jam Pulang Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-slate-700 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Toleransi Terlambat (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    required
                    value={scheduleForm.late_tolerance_minutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, late_tolerance_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500">Contoh: 15 menit setelah jam masuk.</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Toleransi Pulang Cepat (Menit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    required
                    value={scheduleForm.early_departure_tolerance_minutes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, early_departure_tolerance_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-500">0 jika tidak ada toleransi.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catatan / Deskripsi</label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan untuk shift ini..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sched_is_active"
                  checked={scheduleForm.is_active}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="sched_is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Aktifkan pengaturan shift ini
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Tambah Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KONFIRMASI HAPUS
          ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Konfirmasi Hapus</h3>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus {deleteConfirm.type === 'location' ? 'titik lokasi' : 'shift'}{' '}
              <strong className="text-slate-900">"{deleteConfirm.name}"</strong>?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
