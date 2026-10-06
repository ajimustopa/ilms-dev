import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../shared/store/AuthContext';
import api from '../../../../shared/services/api';
import StatusPill from '../../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../../shared/components/FlatAlertBanner';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  BookOpen,
  ClipboardCheck,
  Award,
  Filter,
  Search,
  Printer,
  ChevronRight,
  Sparkles,
  Calendar,
  Building,
  CheckCircle2
} from 'lucide-react';

const DAYS = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalMengajar() {
  const { activeSchoolUnit, user } = useAuth();
  const navigate = useNavigate();

  const [selectedDay, setSelectedDay] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/akademik/curriculum/schedules', {
          params: { satuan_pendidikan_id: activeSchoolUnit?.id }
        }).catch(() => null);

        const items = res?.data?.data?.items || res?.data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setSchedules(items);
        } else {
          // Mock data jadwal jika belum ada
          setSchedules([
            { id: 1, day_name: 'Senin', start_time: '07:30', end_time: '09:00', subject_name: 'Matematika Terapan', class_group_name: 'Kelas 8A', room_name: 'Lab 2', student_count: 32, jp: 2 },
            { id: 2, day_name: 'Senin', start_time: '09:30', end_time: '11:00', subject_name: 'Fisika Dasar', class_group_name: 'Kelas 9B', room_name: 'Ruang 103', student_count: 30, jp: 2 },
            { id: 3, day_name: 'Selasa', start_time: '08:00', end_time: '09:30', subject_name: 'Matematika Terapan', class_group_name: 'Kelas 7A', room_name: 'Ruang 201', student_count: 28, jp: 2 },
            { id: 4, day_name: 'Selasa', start_time: '10:00', end_time: '11:30', subject_name: 'Matematika Terapan', class_group_name: 'Kelas 7B', room_name: 'Ruang 202', student_count: 29, jp: 2 },
            { id: 5, day_name: 'Rabu', start_time: '07:30', end_time: '09:00', subject_name: 'Fisika Dasar', class_group_name: 'Kelas 9A', room_name: 'Lab Fisika', student_count: 31, jp: 2 },
            { id: 6, day_name: 'Rabu', start_time: '13:00', end_time: '14:30', subject_name: 'Matematika Terapan', class_group_name: 'Kelas 8C', room_name: 'Ruang 105', student_count: 30, jp: 2 },
            { id: 7, day_name: 'Kamis', start_time: '08:00', end_time: '10:15', subject_name: 'Matematika Peminatan', class_group_name: 'Kelas 9B', room_name: 'Ruang 103', student_count: 30, jp: 3 },
            { id: 8, day_name: 'Kamis', start_time: '10:30', end_time: '12:00', subject_name: 'Matematika Terapan', class_group_name: 'Kelas 8B', room_name: 'Ruang 104', student_count: 32, jp: 2 },
            { id: 9, day_name: 'Jumat', start_time: '07:30', end_time: '09:00', subject_name: 'Bimbingan Olimpiade', class_group_name: 'Tim OSN MTK', room_name: 'Ruang Riset', student_count: 15, jp: 2 },
            { id: 10, day_name: 'Sabtu', start_time: '08:00', end_time: '09:30', subject_name: 'Matematika Terapan', class_group_name: 'Kelas 7C', room_name: 'Ruang 203', student_count: 28, jp: 2 }
          ]);
        }
      } catch (err) {
        console.error('Error fetching teaching schedules:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [activeSchoolUnit]);

  const filteredSchedules = schedules.filter((s) => {
    const matchDay = selectedDay === 'Semua' || s.day_name === selectedDay || s.day_of_week === selectedDay;
    const matchSearch =
      (s.subject_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.class_group_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.room_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDay && matchSearch;
  });

  const totalJP = schedules.reduce((acc, curr) => acc + (Number(curr.jp) || 2), 0);
  const totalClasses = new Set(schedules.map((s) => s.class_group_name)).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Stats Banner */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Jadwal Mengajar Pribadi</h1>
            <p className="text-xs text-slate-400">
              Daftar sesi tatap muka dan beban jam ajar mengajar Anda
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Beban Ajar</span>
            <p className="text-sm font-extrabold text-emerald-400">{totalJP} JP / Pekan</p>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Rombel Diampu</span>
            <p className="text-sm font-extrabold text-blue-400">{totalClasses} Kelas</p>
          </div>
          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Cetak Jadwal"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Hari (Tabs) & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Day Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedDay === day
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mapel, kelas, ruang..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* List Kartu Jadwal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedules.map((item) => (
          <div
            key={item.id}
            className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 p-5 shadow-lg flex flex-col justify-between transition group"
          >
            <div>
              {/* Header Card: Hari & Jam */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-extrabold">
                  {item.day_name || item.day_of_week}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{item.start_time} - {item.end_time}</span>
                </div>
              </div>

              {/* Title: Mapel & Rombel */}
              <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                {item.subject_name}
              </h3>
              <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                {item.class_group_name}
              </p>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.room_name || 'Ruang Standar'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 justify-end">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.student_count || 30} Santri</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => navigate(`/guru/absensi-kelas?schedule_id=${item.id}`)}
                className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Absensi</span>
              </button>

              <button
                onClick={() => navigate(`/guru/nilai?subject=${encodeURIComponent(item.subject_name)}&class=${encodeURIComponent(item.class_group_name)}`)}
                className="py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Nilai</span>
              </button>
            </div>

          </div>
        ))}
      </div>

      {filteredSchedules.length === 0 && (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
          Tidak ada jadwal mengajar yang ditemukan untuk filter ini.
        </div>
      )}

    </div>
  );
}
