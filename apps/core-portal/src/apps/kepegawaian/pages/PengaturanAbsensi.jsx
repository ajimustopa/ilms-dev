import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../shared/store/AuthContext';
import api from '../../../shared/services/api';
import StatusPill from '../../../shared/components/StatusPill';
import FlatAlertBanner from '../../../shared/components/FlatAlertBanner';
import SearchableSelect from '../../../shared/components/SearchableSelect';
import DatePickerField from '../../../shared/components/DatePickerField';
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
  Power,
  Users,
  UserCheck,
  Zap,
  Sliders,
  Filter,
  Layers,
  ChevronRight,
  Star,
  Globe,
  Check,
  UserX,
  CheckCircle2,
  UserPlus,
  ArrowRight
} from 'lucide-react';

// Komponen Input Waktu Compact (Jam & Menit 24 Jam)
function TimePickerCompact({ value = '07:00', onChange, accentColor = 'emerald', className = "", disabled = false }) {
  const parseVal = (v) => {
    const s = (v || '07:00').slice(0, 5).split(':');
    return {
      h: s[0] !== undefined && s[0] !== '' ? s[0] : '07',
      m: s[1] !== undefined && s[1] !== '' ? s[1] : '00'
    };
  };

  const initial = parseVal(value);
  const [hourStr, setHourStr] = useState(initial.h);
  const [minStr, setMinStr] = useState(initial.m);

  useEffect(() => {
    const parsed = parseVal(value);
    setHourStr(parsed.h);
    setMinStr(parsed.m);
  }, [value]);

  const ringFocusClass = accentColor === 'purple'
    ? 'focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500'
    : 'focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500';

  const handleHourChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (raw !== '' && parseInt(raw, 10) > 23) raw = '23';
    setHourStr(raw);
    if (raw.length === 2) {
      const validM = (minStr === '' ? '00' : minStr).padStart(2, '0');
      onChange?.(`${raw}:${validM}`);
    } else if (raw.length === 1 && parseInt(raw, 10) > 2) {
      const padded = raw.padStart(2, '0');
      setHourStr(padded);
      const validM = (minStr === '' ? '00' : minStr).padStart(2, '0');
      onChange?.(`${padded}:${validM}`);
    }
  };

  const handleHourBlur = () => {
    const formatted = (hourStr === '' ? '00' : hourStr).padStart(2, '0');
    setHourStr(formatted);
    const validM = (minStr === '' ? '00' : minStr).padStart(2, '0');
    onChange?.(`${formatted}:${validM}`);
  };

  const handleMinChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (raw !== '' && parseInt(raw, 10) > 59) raw = '59';
    setMinStr(raw);
    if (raw.length === 2) {
      const validH = (hourStr === '' ? '00' : hourStr).padStart(2, '0');
      onChange?.(`${validH}:${raw}`);
    } else if (raw.length === 1 && parseInt(raw, 10) > 5) {
      const padded = raw.padStart(2, '0');
      setMinStr(padded);
      const validH = (hourStr === '' ? '00' : hourStr).padStart(2, '0');
      onChange?.(`${validH}:${padded}`);
    }
  };

  const handleMinBlur = () => {
    const formatted = (minStr === '' ? '00' : minStr).padStart(2, '0');
    setMinStr(formatted);
    const validH = (hourStr === '' ? '00' : hourStr).padStart(2, '0');
    onChange?.(`${validH}:${formatted}`);
  };

  return (
    <div className={`inline-flex items-center bg-white border border-slate-300 rounded-md px-2 py-1 shadow-2xs ${ringFocusClass} ${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        placeholder="07"
        value={hourStr}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        onFocus={(e) => e.target.select()}
        disabled={disabled}
        className="w-6 text-center text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
        title="Ketik Jam (00 - 23)"
      />
      <span className="text-xs font-bold text-slate-400 mx-0.5">:</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        placeholder="00"
        value={minStr}
        onChange={handleMinChange}
        onBlur={handleMinBlur}
        onFocus={(e) => e.target.select()}
        disabled={disabled}
        className="w-6 text-center text-xs font-mono font-bold text-slate-900 bg-transparent focus:outline-none"
        title="Ketik Menit (00 - 59)"
      />
    </div>
  );
}

// Komponen Input Waktu Manual Simpel & Responsif (Ketik Angka Jam & Menit 24 Jam dengan Label)
function Time24Input({ label, value, onChange, required = false, helperText, className = "", disabled = false, accentColor = "emerald" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="flex items-center gap-2">
        <TimePickerCompact
          value={value}
          onChange={onChange}
          accentColor={accentColor}
          disabled={disabled}
          className="px-3 py-1.5"
        />
        <span className="text-xs font-bold text-slate-500 font-mono">WIB</span>
      </div>
      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
}

// Modal Pemilih Titik Koordinat Peta Interaktif (OpenStreetMap Leaflet)
function MapCoordinatePickerModal({ isOpen, onClose, initialLat, initialLng, initialRadius = 100, onSelectCoordinate }) {
  const mapContainerRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markerRef = React.useRef(null);
  const circleRef = React.useRef(null);

  const [currentLat, setCurrentLat] = useState(parseFloat(initialLat) || -6.5971);
  const [currentLng, setCurrentLng] = useState(parseFloat(initialLng) || 106.8060);
  const [radius, setRadius] = useState(parseInt(initialRadius, 10) || 100);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(Boolean(typeof window !== 'undefined' && window.L));

  // 1. Injeksi Leaflet CSS & JS dinamis tanpa menambah package.json
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setIsLeafletReady(true);
      };
      document.head.appendChild(script);
    } else {
      const checkInterval = setInterval(() => {
        if (window.L) {
          setIsLeafletReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  // 2. Inisialisasi Peta
  useEffect(() => {
    if (!isOpen || !isLeafletReady || !mapContainerRef.current) return;

    const L = window.L;
    const startLat = parseFloat(initialLat) || currentLat;
    const startLng = parseFloat(initialLng) || currentLng;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([startLat, startLng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const pinIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const marker = L.marker([startLat, startLng], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      const circle = L.circle([startLat, startLng], {
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.25,
        radius: radius
      }).addTo(map);

      marker.on('drag', (e) => {
        const { lat, lng } = e.target.getLatLng();
        circle.setLatLng([lat, lng]);
      });

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        setCurrentLat(lat);
        setCurrentLng(lng);
        circle.setLatLng([lat, lng]);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setCurrentLat(lat);
        setCurrentLng(lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    } else {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([startLat, startLng], 16);
      if (markerRef.current) markerRef.current.setLatLng([startLat, startLng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([startLat, startLng]);
        circleRef.current.setRadius(radius);
      }
    }
  }, [isOpen, isLeafletReady]);

  // Update radius lingkaran geofence
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  const handleClose = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    }
    onClose();
  };

  // Pencarian Lokasi dengan OpenStreetMap Nominatim
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setCurrentLat(lat);
        setCurrentLng(lon);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 17);
          if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
          if (circleRef.current) circleRef.current.setLatLng([lat, lon]);
        }
      } else {
        alert('Lokasi tidak ditemukan. Silakan gunakan nama daerah / alamat lain.');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Ambil Lokasi GPS Saat Ini
  const handleUserLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          if (circleRef.current) circleRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => {
        alert('Gagal mengambil lokasi GPS: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleApply = () => {
    onSelectCoordinate({
      latitude: parseFloat(currentLat.toFixed(8)),
      longitude: parseFloat(currentLng.toFixed(8)),
      radius_meters: radius
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight">Pilih Titik Koordinat di Peta</h3>
              <p className="text-[11px] text-slate-500">Klik pada peta atau geser pin merah ke lokasi sekolah/gedung yang tepat.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 min-w-[240px] flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari tempat / nama jalan / kota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition disabled:opacity-50"
            >
              {searching ? 'Mencari...' : 'Cari'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUserLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
            title="Pusatkan ke lokasi GPS saat ini"
          >
            <Crosshair className="w-3.5 h-3.5" />
            GPS Saya
          </button>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Radius:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10))}
              className="px-2 py-1 text-xs font-bold font-mono rounded border border-slate-300 bg-white"
            >
              <option value="50">50 m</option>
              <option value="100">100 m</option>
              <option value="150">150 m</option>
              <option value="200">200 m</option>
              <option value="300">300 m</option>
              <option value="500">500 m</option>
            </select>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[380px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
          {!isLeafletReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-medium">
              Memuat peta OpenStreetMap...
            </div>
          )}
        </div>

        {/* Footer Info & Action */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-mono">
            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">LATITUDE</span>
              <span className="font-bold text-slate-800">{currentLat.toFixed(8)}</span>
            </div>
            <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">LONGITUDE</span>
              <span className="font-bold text-slate-800">{currentLng.toFixed(8)}</span>
            </div>
            <div className="bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-600 block font-sans font-bold">RADIUS GEOFENCE</span>
              <span className="font-bold text-emerald-800">{radius} Meter</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg border border-slate-200"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Terapkan Titik Koordinat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PengaturanAbsensi() {
  const { activeSchoolUnit, schoolUnits } = useAuth();
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'schedules' | 'locations'

  // State: Lokasi Absensi
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
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
    is_active: true,
    is_default: false
  });

  // State: Pengaturan Master Jam Kerja (Shift)
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Form State: Jam Kerja
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    schedule_type: 'massal',
    day_of_week: 'all',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    custom_day_schedules: {
      monday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      tuesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      wednesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      thursday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      friday: { is_active: true, start_time: '07:15', end_time: '11:30' },
      saturday: { is_active: true, start_time: '07:15', end_time: '13:00' },
      sunday: { is_active: false, start_time: '07:15', end_time: '16:00' }
    },
    start_time: '07:15',
    end_time: '16:00',
    late_tolerance_minutes: 15,
    early_departure_tolerance_minutes: 0,
    flexible_target_hours: 8.0,
    is_active: true,
    notes: ''
  });

  // State: Penetapan Jadwal & Lokasi Presensi Pegawai
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all'); // 'all' | 'assigned' | 'unassigned'
  const [assignmentFilterType, setAssignmentFilterType] = useState('all');
  const [assignmentFilterLocationType, setAssignmentFilterLocationType] = useState('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');

  // State: Master Pegawai untuk Dropdown & Multi-Select
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Default Day Schedules untuk Shift Baku & Custom Pegawai
  const defaultDaySchedules = useMemo(() => ({
    monday: { is_active: true, start_time: '07:15', end_time: '16:00' },
    tuesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
    wednesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
    thursday: { is_active: true, start_time: '07:15', end_time: '16:00' },
    friday: { is_active: true, start_time: '07:15', end_time: '11:30' },
    saturday: { is_active: true, start_time: '07:15', end_time: '13:00' },
    sunday: { is_active: false, start_time: '07:15', end_time: '16:00' }
  }), []);

  // Form State: Penetapan Jadwal & Lokasi Pegawai
  const [assignmentForm, setAssignmentForm] = useState({
    assignment_type: 'massal', // 'massal' | 'custom_employee' | 'flexible'
    location_assignment_type: 'all_locations', // 'all_locations' | 'default_only' | 'custom_locations'
    allowed_location_ids: [],
    employee_id: '',
    employee_ids: [],
    schedule_id: '',
    custom_start_time: '07:15',
    custom_end_time: '16:00',
    custom_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    custom_day_schedules: {
      monday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      tuesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      wednesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      thursday: { is_active: true, start_time: '07:15', end_time: '16:00' },
      friday: { is_active: true, start_time: '07:15', end_time: '11:30' },
      saturday: { is_active: true, start_time: '07:15', end_time: '13:00' },
      sunday: { is_active: false, start_time: '07:15', end_time: '16:00' }
    },
    custom_late_tolerance_minutes: 15,
    custom_early_tolerance_minutes: 0,
    flexible_target_hours: 8.0,
    effective_start_date: '',
    effective_end_date: '',
    notes: '',
    is_active: true
  });

  // State Input Waktu Masal untuk Form Shift (Tab 2) & Custom Assignment (Tab 1)
  const [bulkScheduleTime, setBulkScheduleTime] = useState({ start_time: '07:15', end_time: '16:00' });
  const [bulkAssignmentTime, setBulkAssignmentTime] = useState({ start_time: '07:15', end_time: '16:00' });

  // State Feedback & Delete Confirm Modal
  const [feedback, setFeedback] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'location'|'schedule'|'assignment', id: 1, name: '...' }
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [settingAllDefaultLoc, setSettingAllDefaultLoc] = useState(false);
  const [confirmSetAllDefaultModal, setConfirmSetAllDefaultModal] = useState(false);

  const currentUnitId = activeSchoolUnit?.id && activeSchoolUnit.id !== 'all'
    ? activeSchoolUnit.id
    : (schoolUnits?.find(u => u.id && u.id !== 'all')?.id || 1);

  // 1. Fetch Data Lokasi
  const fetchLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const params = {};
      if (currentUnitId && currentUnitId !== 'all') {
        params.satuan_pendidikan_id = currentUnitId;
      }
      const res = await api.get('/kepegawaian/attendance/locations', { params });
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

  // 2. Fetch Data Master Jam Kerja
  const fetchSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      const params = {};
      if (currentUnitId && currentUnitId !== 'all') {
        params.satuan_pendidikan_id = currentUnitId;
      }
      const res = await api.get('/kepegawaian/attendance/work-schedules', { params });
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

  // 3. Fetch Data Penugasan Jadwal Pegawai
  const fetchAssignments = useCallback(async () => {
    try {
      setLoadingAssignments(true);
      const params = {};
      if (currentUnitId && currentUnitId !== 'all') {
        params.satuan_pendidikan_id = currentUnitId;
      }
      const res = await api.get('/kepegawaian/attendance/schedule-assignments', { params });
      if (res.data?.success) {
        setAssignments(res.data.data || []);
      }
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal memuat data penugasan jadwal'
      });
    } finally {
      setLoadingAssignments(false);
    }
  }, [currentUnitId]);

  // 4. Fetch Master Pegawai
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const params = { per_page: 500 };
      if (currentUnitId && currentUnitId !== 'all') {
        params.school_unit_id = currentUnitId;
      }
      const res = await api.get('/kepegawaian/employees', { params });
      if (res.data?.success) {
        setEmployees(res.data.data?.items || res.data.data || []);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar pegawai:', err);
    } finally {
      setLoadingEmployees(false);
    }
  }, [currentUnitId]);

  useEffect(() => {
    fetchLocations();
    fetchSchedules();
    fetchAssignments();
    fetchEmployees();
  }, [fetchLocations, fetchSchedules, fetchAssignments, fetchEmployees]);

  // Handle Geolocation Browser
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'danger',
        message: 'Browser Anda tidak mendukung fitur Geolocation GPS.'
      });
      return;
    }

    setGeoLocating(true);
    setGeoAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(8),
          longitude: position.coords.longitude.toFixed(8)
        }));
        setGeoAccuracy(position.coords.accuracy);
        setGeoLocating(false);
      },
      (error) => {
        setGeoLocating(false);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin akses lokasi GPS ditolak oleh browser/perangkat Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Informasi lokasi GPS tidak tersedia pada perangkat ini.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Permintaan lokasi GPS memakan waktu terlalu lama (timeout).';
        }
        setFeedback({ type: 'danger', message: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Submit Handler: Lokasi
  const handleSubmitLocation = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...locationForm,
        satuan_pendidikan_id: currentUnitId,
        latitude: parseFloat(locationForm.latitude),
        longitude: parseFloat(locationForm.longitude),
        radius_meters: parseFloat(locationForm.radius_meters),
        is_default: Boolean(locationForm.is_default)
      };

      if (editingLocation) {
        await api.put(`/kepegawaian/attendance/locations/${editingLocation.id}`, payload);
        setFeedback({ type: 'success', message: 'Titik lokasi absensi berhasil diperbarui.' });
      } else {
        await api.post('/kepegawaian/attendance/locations', payload);
        setFeedback({ type: 'success', message: 'Titik lokasi absensi baru berhasil ditambahkan.' });
      }

      setLocationModalOpen(false);
      fetchLocations();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menyimpan titik lokasi absensi'
      });
    }
  };

  // Handler Cepat: Tetapkan Lokasi sebagai Titik GPS Default Unit
  const handleSetDefaultLocation = async (loc) => {
    try {
      setSettingDefaultId(loc.id);
      const res = await api.patch(`/kepegawaian/attendance/locations/${loc.id}/set-default`);
      setFeedback({
        type: 'success',
        message: res.data?.message || `Titik lokasi "${loc.name}" berhasil ditetapkan sebagai Titik GPS Default Unit.`
      });
      fetchLocations();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menetapkan titik lokasi default'
      });
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Handler Masal: Jadikan Lokasi Absensi Semua Pegawai Mengikuti Lokasi Default
  const handleSetAllEmployeesDefaultLocation = async () => {
    try {
      setSettingAllDefaultLoc(true);
      const res = await api.post('/kepegawaian/attendance/schedule-assignments/set-all-default-location', {
        satuan_pendidikan_id: currentUnitId
      });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Semua pegawai berhasil ditetapkan lokasi absensinya ke Titik Lokasi Default Unit.'
        });
        setConfirmSetAllDefaultModal(false);
        await Promise.all([fetchAssignments(), fetchLocations(), fetchEmployees()]);
      }
    } catch (err) {
      console.error(err);
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menetapkan lokasi absensi semua pegawai ke lokasi default'
      });
    } finally {
      setSettingAllDefaultLoc(false);
    }
  };

  // Submit Handler: Jam Kerja / Shift Baku
  const handleSubmitSchedule = async (e) => {
    e.preventDefault();
    try {
      const customDays = scheduleForm.custom_day_schedules || {};
      const activeDays = Object.keys(customDays).filter((d) => customDays[d]?.is_active);

      if (!activeDays.length) {
        setFeedback({ type: 'danger', message: 'Pilih minimal satu hari kerja aktif untuk shift ini.' });
        return;
      }

      const firstActiveDay = activeDays[0];
      const defaultStart = customDays[firstActiveDay]?.start_time || scheduleForm.start_time || '07:15';
      const defaultEnd = customDays[firstActiveDay]?.end_time || scheduleForm.end_time || '16:00';

      const payload = {
        satuan_pendidikan_id: currentUnitId,
        name: scheduleForm.name,
        schedule_type: scheduleForm.schedule_type || 'massal',
        days_of_week: activeDays,
        day_of_week: activeDays.length === 7 ? 'all' : activeDays[0],
        custom_day_schedules: customDays,
        start_time: defaultStart,
        end_time: defaultEnd,
        late_tolerance_minutes: parseInt(scheduleForm.late_tolerance_minutes, 10) || 15,
        early_departure_tolerance_minutes: parseInt(scheduleForm.early_departure_tolerance_minutes, 10) || 0,
        flexible_target_hours: parseFloat(scheduleForm.flexible_target_hours || 8.0),
        is_active: scheduleForm.is_active,
        notes: scheduleForm.notes || null
      };

      if (editingSchedule) {
        await api.put(`/kepegawaian/attendance/work-schedules/${editingSchedule.id}`, payload);
        setFeedback({ type: 'success', message: 'Master jam kerja shift baku berhasil diperbarui.' });
      } else {
        await api.post('/kepegawaian/attendance/work-schedules', payload);
        setFeedback({ type: 'success', message: 'Master jam kerja shift baku baru berhasil ditambahkan.' });
      }

      setScheduleModalOpen(false);
      fetchSchedules();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menyimpan master jam kerja shift baku'
      });
    }
  };

  // Helper ringkasan custom_day_schedules
  const formatCustomDaySchedulesSummary = (daySchedules, fallbackStartTime, fallbackEndTime) => {
    if (!daySchedules || typeof daySchedules !== 'object') {
      return fallbackStartTime && fallbackEndTime
        ? `${fallbackStartTime.slice(0, 5)} - ${fallbackEndTime.slice(0, 5)} WIB`
        : 'Jadwal Khusus';
    }

    const activeDays = Object.keys(daySchedules).filter((d) => daySchedules[d]?.is_active);
    if (activeDays.length === 0) return 'Tidak ada hari kerja aktif';

    const firstDay = daySchedules[activeDays[0]];
    const isUniform = activeDays.every(
      (d) =>
        daySchedules[d]?.start_time === firstDay?.start_time &&
        daySchedules[d]?.end_time === firstDay?.end_time
    );

    if (isUniform && firstDay?.start_time && firstDay?.end_time) {
      return `${firstDay.start_time.slice(0, 5)} - ${firstDay.end_time.slice(0, 5)} WIB (${activeDays.length} Hari)`;
    }

    const dayNameShort = {
      monday: 'Sen',
      tuesday: 'Sel',
      wednesday: 'Rab',
      thursday: 'Kam',
      friday: 'Jum',
      saturday: 'Sab',
      sunday: 'Ahd'
    };

    return activeDays
      .map((d) => {
        const cfg = daySchedules[d];
        return `${dayNameShort[d] || d}: ${(cfg.start_time || '07:15').slice(0, 5)}-${(cfg.end_time || '16:00').slice(0, 5)}`;
      })
      .join(', ');
  };

  // Submit Handler: Penetapan Jadwal & Lokasi Kerja (3 Metode + Multi Lokasi GPS)
  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    try {
      const isCustom = assignmentForm.assignment_type === 'custom_employee';
      const activeDays = isCustom && assignmentForm.custom_day_schedules
        ? Object.keys(assignmentForm.custom_day_schedules).filter((d) => assignmentForm.custom_day_schedules[d]?.is_active)
        : assignmentForm.custom_days_of_week;

      // Validasi jika mode kustom lokasi dipilih tapi belum ada titik yang dipilih
      if (
        assignmentForm.location_assignment_type === 'custom_locations' &&
        (!assignmentForm.allowed_location_ids || assignmentForm.allowed_location_ids.length === 0)
      ) {
        setFeedback({
          type: 'danger',
          message: 'Pilih minimal satu titik lokasi GPS untuk penugasan lokasi kustom.'
        });
        return;
      }

      const payload = {
        satuan_pendidikan_id: currentUnitId,
        assignment_type: assignmentForm.assignment_type,
        location_assignment_type: assignmentForm.location_assignment_type || 'all_locations',
        allowed_location_ids: assignmentForm.location_assignment_type === 'custom_locations'
          ? (assignmentForm.allowed_location_ids || [])
          : null,
        employee_id: assignmentForm.employee_id || null,
        employee_ids: assignmentForm.employee_ids.length ? assignmentForm.employee_ids : (assignmentForm.employee_id ? [assignmentForm.employee_id] : []),
        schedule_id: assignmentForm.schedule_id || null,
        custom_start_time: isCustom && assignmentForm.assignment_type !== 'flexible' ? (assignmentForm.custom_day_schedules?.monday?.start_time || assignmentForm.custom_start_time) : null,
        custom_end_time: isCustom && assignmentForm.assignment_type !== 'flexible' ? (assignmentForm.custom_day_schedules?.monday?.end_time || assignmentForm.custom_end_time) : null,
        custom_days_of_week: assignmentForm.assignment_type === 'flexible'
          ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
          : (isCustom ? activeDays : null),
        custom_day_schedules: isCustom && assignmentForm.assignment_type !== 'flexible' ? assignmentForm.custom_day_schedules : null,
        custom_late_tolerance_minutes: parseInt(assignmentForm.custom_late_tolerance_minutes, 10) || 15,
        custom_early_tolerance_minutes: parseInt(assignmentForm.custom_early_tolerance_minutes, 10) || 0,
        flexible_target_hours: parseFloat(assignmentForm.flexible_target_hours) || 8.0,
        effective_start_date: assignmentForm.effective_start_date || null,
        effective_end_date: assignmentForm.effective_end_date || null,
        notes: assignmentForm.notes || null,
        is_active: assignmentForm.is_active
      };

      if (editingAssignment) {
        await api.put(`/kepegawaian/attendance/schedule-assignments/${editingAssignment.id}`, payload);
        setFeedback({ type: 'success', message: 'Penetapan jadwal & lokasi presensi pegawai berhasil diperbarui.' });
      } else {
        await api.post('/kepegawaian/attendance/schedule-assignments', payload);
        setFeedback({ type: 'success', message: 'Penetapan jadwal & lokasi presensi pegawai berhasil disimpan.' });
      }

      setAssignmentModalOpen(false);
      fetchAssignments();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menyimpan penetapan jadwal pegawai'
      });
    }
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'location') {
        await api.delete(`/kepegawaian/attendance/locations/${deleteConfirm.id}`);
        setFeedback({ type: 'success', message: 'Titik lokasi absensi berhasil dihapus.' });
        fetchLocations();
      } else if (deleteConfirm.type === 'schedule') {
        await api.delete(`/kepegawaian/attendance/work-schedules/${deleteConfirm.id}`);
        setFeedback({ type: 'success', message: 'Master jam kerja berhasil dihapus.' });
        fetchSchedules();
      } else if (deleteConfirm.type === 'assignment') {
        await api.delete(`/kepegawaian/attendance/schedule-assignments/${deleteConfirm.id}`);
        setFeedback({ type: 'success', message: 'Penetapan jadwal pegawai berhasil dihapus.' });
        fetchAssignments();
      }
      setDeleteConfirm(null);
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.response?.data?.message || 'Gagal menghapus data'
      });
    }
  };

  // Filtering Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchSearch =
        loc.name?.toLowerCase().includes(locationSearch.toLowerCase()) ||
        loc.address?.toLowerCase().includes(locationSearch.toLowerCase());
      return matchSearch;
    });
  }, [locations, locationSearch]);

  // Helper formatting hari & dayOptions
  const dayOptions = useMemo(() => [
    { id: 'monday', label: 'Senin', short: 'Sen' },
    { id: 'tuesday', label: 'Selasa', short: 'Sel' },
    { id: 'wednesday', label: 'Rabu', short: 'Rab' },
    { id: 'thursday', label: 'Kamis', short: 'Kam' },
    { id: 'friday', label: 'Jumat', short: 'Jum' },
    { id: 'saturday', label: 'Sabtu', short: 'Sab' },
    { id: 'sunday', label: 'Ahad', short: 'Ahd' }
  ], []);

  const formatDayName = (dayKey) => {
    const days = {
      all: 'Setiap Hari (Senin - Ahad)',
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Ahad'
    };
    return days[dayKey] || dayKey;
  };

  const formatScheduleDaysSummary = (daysInput, fallbackDay) => {
    let days = [];
    if (Array.isArray(daysInput)) {
      days = daysInput;
    } else if (typeof daysInput === 'string' && daysInput.startsWith('[')) {
      try {
        days = JSON.parse(daysInput);
      } catch (e) {
        days = [fallbackDay || 'all'];
      }
    } else if (daysInput) {
      days = [daysInput];
    } else if (fallbackDay) {
      days = [fallbackDay];
    }

    if (days.includes('all') || days.length === 7) {
      return 'Setiap Hari (Senin - Ahad)';
    }

    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const sixDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekend = ['saturday', 'sunday'];

    const sortedDays = [...days].sort();
    if (sortedDays.length === 5 && weekdays.every((d) => days.includes(d))) {
      return 'Senin - Jumat (5 Hari)';
    }
    if (sortedDays.length === 6 && sixDays.every((d) => days.includes(d))) {
      return 'Senin - Sabtu (6 Hari)';
    }
    if (sortedDays.length === 2 && weekend.every((d) => days.includes(d))) {
      return 'Sabtu & Ahad (Akhir Pekan)';
    }

    const dayNameMap = {
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Ahad'
    };

    return days.map((d) => dayNameMap[d] || d).join(', ');
  };

  // Master shift aktif default unit
  const activeMasterSchedule = useMemo(() => {
    return schedules.find((s) => s.is_active) || schedules[0] || null;
  }, [schedules]);

  // Set Pegawai Terjadwal
  const assignedEmployeeIdSet = useMemo(() => {
    return new Set(assignments.map((a) => String(a.employee_id)));
  }, [assignments]);

  // Mapping Assignment berdasarkan employee_id
  const assignmentByEmployeeId = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      map.set(String(a.employee_id), a);
    });
    return map;
  }, [assignments]);

  // Daftar Pegawai Belum Terjadwal (Mengikuti Default Unit)
  const unassignedEmployees = useMemo(() => {
    return employees.filter((emp) => !assignedEmployeeIdSet.has(String(emp.id)));
  }, [employees, assignedEmployeeIdSet]);

  // Unified List of Employees with their Applied Schedules
  const allEmployeesWithAppliedSchedule = useMemo(() => {
    const list = [];
    const processedEmpIds = new Set();

    // 1. Seluruh pegawai terdaftar di master
    employees.forEach((emp) => {
      const empIdStr = String(emp.id);
      processedEmpIds.add(empIdStr);
      const assign = assignmentByEmployeeId.get(empIdStr);

      const empName = emp.full_name || emp.name || `Pegawai #${emp.id}`;
      const empNip = emp.employee_number || emp.nip || emp.nik || '-';
      const empPos = emp.current_position?.name || emp.current_position_name || emp.position || emp.job_title || emp.role || 'GTK';
      const empStatus = emp.employment_status || emp.account_status || emp.status || 'Aktif';

      if (assign) {
        // Pegawai memiliki penetapan jadwal khusus
        list.push({
          ...assign,
          employee_name: empName,
          employee_number: empNip,
          employee_position: empPos,
          employee_status: empStatus,
          has_custom_assignment: true,
          applied_scheme_type: assign.assignment_type
        });
      } else {
        // Pegawai mengikuti Master Shift Default Unit
        list.push({
          id: `default-${emp.id}`,
          employee_id: emp.id,
          employee_name: empName,
          employee_number: empNip,
          employee_position: empPos,
          employee_status: empStatus,
          has_custom_assignment: false,
          applied_scheme_type: 'default_master',
          assignment_type: 'default_master',
          schedule_name: activeMasterSchedule ? activeMasterSchedule.name : 'Shift Baku Master (Default Unit)',
          schedule_id: activeMasterSchedule?.id || null,
          custom_day_schedules: activeMasterSchedule?.custom_day_schedules || null,
          master_start_time: activeMasterSchedule?.start_time || '07:15',
          master_end_time: activeMasterSchedule?.end_time || '16:00',
          days_of_week: activeMasterSchedule?.days_of_week || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
          day_of_week: activeMasterSchedule?.day_of_week || 'all',
          location_assignment_type: 'all_locations',
          allowed_location_ids: [],
          late_tolerance_minutes: activeMasterSchedule?.late_tolerance_minutes || 15,
          early_departure_tolerance_minutes: activeMasterSchedule?.early_departure_tolerance_minutes || 0,
          is_active: true,
          effective_start_date: null,
          effective_end_date: null,
          raw_employee: emp
        });
      }
    });

    // 2. Sertakan assignment jika employee tidak ada di list pegawai unit
    assignments.forEach((assign) => {
      const empIdStr = String(assign.employee_id);
      if (!processedEmpIds.has(empIdStr)) {
        list.push({
          ...assign,
          has_custom_assignment: true,
          applied_scheme_type: assign.assignment_type
        });
      }
    });

    return list;
  }, [employees, assignments, assignmentByEmployeeId, activeMasterSchedule]);

  // Filtering Unified List
  const filteredUnifiedEmployees = useMemo(() => {
    return allEmployeesWithAppliedSchedule.filter((item) => {
      // 1. Filter Status Penugasan
      if (assignmentStatusFilter === 'assigned' && !item.has_custom_assignment) return false;
      if (assignmentStatusFilter === 'unassigned' && item.has_custom_assignment) return false;

      // 2. Filter Metode Jam Kerja
      if (assignmentFilterType !== 'all') {
        if (assignmentFilterType === 'default_master') {
          if (item.applied_scheme_type !== 'default_master') return false;
        } else if (item.applied_scheme_type !== assignmentFilterType) {
          return false;
        }
      }

      // 3. Filter Lokasi GPS
      if (assignmentFilterLocationType !== 'all') {
        const locType = item.location_assignment_type || 'all_locations';
        if (locType !== assignmentFilterLocationType) return false;
      }

      // 4. Pencarian Teks
      if (assignmentSearch) {
        const query = assignmentSearch.toLowerCase();
        const matchName = item.employee_name?.toLowerCase().includes(query);
        const matchNip = item.employee_number?.toLowerCase().includes(query);
        const matchPos = item.employee_position?.toLowerCase().includes(query);
        const matchSchedule = item.schedule_name?.toLowerCase().includes(query);
        if (!matchName && !matchNip && !matchPos && !matchSchedule) return false;
      }

      return true;
    });
  }, [allEmployeesWithAppliedSchedule, assignmentStatusFilter, assignmentFilterType, assignmentFilterLocationType, assignmentSearch]);

  // Filtering Unassigned Employees (Pegawai yang belum ditetapkan)
  const filteredUnassignedEmployees = useMemo(() => {
    return unassignedEmployees.filter((emp) => {
      const matchSearch =
        !assignmentSearch ||
        (emp.full_name || emp.name || '')?.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
        (emp.employee_number || emp.nip || emp.nik || '')?.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
        (emp.current_position?.name || emp.position || emp.job_title || '')?.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
        (emp.employment_status || emp.status || '')?.toLowerCase().includes(assignmentSearch.toLowerCase());
      return matchSearch;
    });
  }, [unassignedEmployees, assignmentSearch]);

  // Stats Komprehensif
  const stats = useMemo(() => {
    const totalEmployees = allEmployeesWithAppliedSchedule.length || employees.length || assignments.length;
    const assignedCount = assignedEmployeeIdSet.size;
    const unassignedCount = unassignedEmployees.length;
    const assignedPct = totalEmployees > 0 ? Math.round((assignedCount / totalEmployees) * 100) : 0;
    const massalCount = assignments.filter((a) => a.assignment_type === 'massal').length;
    const customCount = assignments.filter((a) => a.assignment_type === 'custom_employee').length;
    const flexibleCount = assignments.filter((a) => a.assignment_type === 'flexible').length;
    return {
      totalEmployees,
      assignedCount,
      unassignedCount,
      assignedPct,
      massalCount,
      customCount,
      flexibleCount
    };
  }, [allEmployeesWithAppliedSchedule, employees, assignments, assignedEmployeeIdSet, unassignedEmployees]);

  // Options untuk SearchableSelect: Pegawai
  const employeeSelectOptions = useMemo(() => {
    return employees.map((emp) => {
      const isAssigned = assignedEmployeeIdSet.has(String(emp.id));
      const empName = emp.full_name || emp.name || `Pegawai #${emp.id}`;
      const empNip = emp.employee_number || emp.nip || emp.nik || 'NIP -';
      const empPos = emp.current_position?.name || emp.current_position_name || emp.position || emp.job_title || emp.role || 'GTK';

      return {
        value: emp.id,
        label: empName,
        sublabel: `${empNip} • ${empPos}`,
        badge: isAssigned ? 'Sudah Berjadwal' : 'Belum Berjadwal',
        badgeClass: isAssigned
          ? 'bg-emerald-100 text-emerald-800 font-bold text-[10px]'
          : 'bg-amber-100 text-amber-800 font-bold text-[10px]'
      };
    });
  }, [employees, assignedEmployeeIdSet]);

  // Options untuk SearchableSelect: Master Skema Jam Kerja
  const scheduleSelectOptions = useMemo(() => {
    return schedules.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: formatCustomDaySchedulesSummary(s.custom_day_schedules, s.start_time, s.end_time),
      badge: s.is_active ? 'Aktif' : 'Nonaktif',
      badgeClass: s.is_active ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
    }));
  }, [schedules]);

  const handleToggleDay = (dayId) => {
    setAssignmentForm((prev) => {
      const current = Array.isArray(prev.custom_days_of_week) ? prev.custom_days_of_week : [];
      if (current.includes(dayId)) {
        return { ...prev, custom_days_of_week: current.filter((d) => d !== dayId) };
      } else {
        return { ...prev, custom_days_of_week: [...current, dayId] };
      }
    });
  };

  // Handler buka modal penetapan untuk 1 pegawai spesifik
  const handleOpenAssignModalForSingleEmployee = (emp) => {
    setEditingAssignment(null);
    setAssignmentForm({
      assignment_type: 'massal',
      location_assignment_type: 'all_locations',
      allowed_location_ids: [],
      employee_id: emp.id,
      employee_ids: [emp.id],
      schedule_id: schedules[0]?.id || '',
      custom_start_time: '07:15',
      custom_end_time: '16:00',
      custom_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      custom_day_schedules: { ...defaultDaySchedules },
      custom_late_tolerance_minutes: 15,
      custom_early_tolerance_minutes: 0,
      flexible_target_hours: 8.0,
      effective_start_date: '',
      effective_end_date: '',
      notes: '',
      is_active: true
    });
    setAssignmentModalOpen(true);
  };

  // Handler buka modal penetapan massal untuk seluruh pegawai belum berjadwal
  const handleOpenAssignModalForUnassignedBatch = () => {
    const unassignedIds = unassignedEmployees.map((e) => e.id);
    if (unassignedIds.length === 0) return;

    setEditingAssignment(null);
    setAssignmentForm({
      assignment_type: 'massal',
      location_assignment_type: 'all_locations',
      allowed_location_ids: [],
      employee_id: unassignedIds[0] || '',
      employee_ids: unassignedIds,
      schedule_id: schedules[0]?.id || '',
      custom_start_time: '07:15',
      custom_end_time: '16:00',
      custom_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      custom_day_schedules: { ...defaultDaySchedules },
      custom_late_tolerance_minutes: 15,
      custom_early_tolerance_minutes: 0,
      flexible_target_hours: 8.0,
      effective_start_date: '',
      effective_end_date: '',
      notes: `Penetapan massal untuk ${unassignedIds.length} pegawai belum berjadwal`,
      is_active: true
    });
    setAssignmentModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pengaturan & Jadwal Presensi</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi 3 metode penetapan jadwal masuk guru/karyawan, toleransi jam kerja, dan master titik koordinat GPS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>{activeSchoolUnit?.name || 'Unit Sekolah'}</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {feedback && (
        <FlatAlertBanner
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Tab Navigasi Utama */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'assignments'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Penetapan Jadwal Pegawai</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {stats.assignedCount} / {stats.totalEmployees}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'schedules'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Master Skema Shift Baku</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">
            {schedules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'locations'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Titik Lokasi GPS</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">
            {locations.length}
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: PENETAPAN JADWAL PEGAWAI (3 METODE)
          ========================================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Card Summary Status Penetapan Pegawai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Card 1: Total Pegawai */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Pegawai GTK</span>
                <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{stats.totalEmployees}</p>
              <span className="text-[11px] text-slate-400">Pegawai terdaftar di unit</span>
            </div>

            {/* Card 2: Sudah Ditetapkan */}
            <div
              onClick={() => setAssignmentStatusFilter('assigned')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                assignmentStatusFilter === 'assigned'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                  : 'border-slate-200/80 hover:border-emerald-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Sudah Ditetapkan</span>
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl font-bold text-emerald-700">{stats.assignedCount}</p>
                <span className="text-xs font-semibold text-emerald-600">({stats.assignedPct}%)</span>
              </div>
              {/* Progress bar mini */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats.assignedPct}%` }}
                />
              </div>
            </div>

            {/* Card 3: Belum Ditetapkan */}
            <div
              onClick={() => setAssignmentStatusFilter('unassigned')}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                assignmentStatusFilter === 'unassigned'
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30'
                  : stats.unassignedCount > 0
                  ? 'border-amber-200 bg-amber-50/20 hover:border-amber-400 shadow-xs'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${stats.unassignedCount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                  Belum Ditetapkan
                </span>
                <span className={`p-1.5 rounded-lg ${stats.unassignedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  <UserX className="w-4 h-4" />
                </span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${stats.unassignedCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                {stats.unassignedCount}
              </p>
              <span className="text-[11px] text-slate-400">
                {stats.unassignedCount > 0 ? 'Ikut Shift Master Unit (Default)' : 'Semua sudah berjadwal'}
              </span>
            </div>

            {/* Card 4: 1. Skema Massal */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">1. Skema Massal</span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-2">{stats.massalCount}</p>
              <span className="text-[11px] text-slate-400">Ikut shift baku master</span>
            </div>

            {/* Card 5: Custom & Fleksibel */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">2 & 3. Khusus / Fleksibel</span>
                <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <UserCheck className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-700 mt-2">
                {stats.customCount + stats.flexibleCount}
              </p>
              <span className="text-[11px] text-slate-400">
                {stats.customCount} Custom, {stats.flexibleCount} Fleksibel
              </span>
            </div>
          </div>

          {/* Smart Alert Banner jika terdapat pegawai belum berjadwal */}
          {stats.unassignedCount > 0 && assignmentStatusFilter !== 'unassigned' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs">
                  <span className="font-bold">Perhatian: </span>
                  Terdapat <span className="font-bold text-amber-950">{stats.unassignedCount} dari {stats.totalEmployees} pegawai</span> yang belum memiliki penetapan jadwal khusus. Saat ini mereka otomatis mengikuti <em>Shift Baku Master Unit</em>.
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setAssignmentStatusFilter('unassigned')}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  Lihat {stats.unassignedCount} Pegawai
                </button>
                <button
                  onClick={handleOpenAssignModalForUnassignedBatch}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Tetapkan Massal
                </button>
              </div>
            </div>
          )}

          {/* Action Bar & Filter Multi-Level */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Filter Status Penetapan Pegawai */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setAssignmentStatusFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    assignmentStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Pegawai ({stats.totalEmployees})
                </button>
                <button
                  onClick={() => setAssignmentStatusFilter('assigned')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    assignmentStatusFilter === 'assigned'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Penugasan Khusus ({stats.assignedCount})
                </button>
                <button
                  onClick={() => setAssignmentStatusFilter('unassigned')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                    assignmentStatusFilter === 'unassigned'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Shift Master Unit ({stats.unassignedCount})
                </button>
              </div>

              {/* Pencarian */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai / NIP / skema..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Filter Khusus Skema & Lokasi */}
              {assignmentStatusFilter !== 'unassigned' && (
                <>
                  {/* Filter Metode Jam Kerja */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    {[
                      { id: 'all', label: 'Semua Skema' },
                      { id: 'default_master', label: '⭐ Shift Master Unit' },
                      { id: 'massal', label: '1. Massal' },
                      { id: 'custom_employee', label: '2. Custom' },
                      { id: 'flexible', label: '3. Fleksibel' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAssignmentFilterType(tab.id)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          assignmentFilterType === tab.id
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Filter Mode Lokasi GPS */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    {[
                      { id: 'all', label: 'Semua Lokasi' },
                      { id: 'all_locations', label: '🌐 Semua Titik' },
                      { id: 'default_only', label: '⭐ Titik Default' },
                      { id: 'custom_locations', label: '📍 Kustom Titik' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAssignmentFilterLocationType(tab.id)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          assignmentFilterLocationType === tab.id
                            ? 'bg-white text-emerald-800 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                disabled={settingAllDefaultLoc}
                onClick={() => setConfirmSetAllDefaultModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors shrink-0"
                title="Setel lokasi absensi seluruh pegawai ke titik GPS default unit sekolah"
              >
                {settingAllDefaultLoc ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
                Set Semua ke Lokasi Default
              </button>

              {stats.unassignedCount > 0 && (
                <button
                  onClick={handleOpenAssignModalForUnassignedBatch}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  title="Tetapkan jadwal khusus serentak untuk semua pegawai yang belum berjadwal khusus"
                >
                  <UserPlus className="w-4 h-4" />
                  Tetapkan Massal ({unassignedEmployees.length})
                </button>
              )}

              <button
                onClick={() => {
                  setEditingAssignment(null);
                  setAssignmentForm({
                    assignment_type: 'massal',
                    location_assignment_type: 'all_locations',
                    allowed_location_ids: [],
                    employee_id: '',
                    employee_ids: [],
                    schedule_id: schedules[0]?.id || '',
                    custom_start_time: '07:15',
                    custom_end_time: '16:00',
                    custom_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                    custom_day_schedules: { ...defaultDaySchedules },
                    custom_late_tolerance_minutes: 15,
                    custom_early_tolerance_minutes: 0,
                    flexible_target_hours: 8.0,
                    effective_start_date: '',
                    effective_end_date: '',
                    notes: '',
                    is_active: true
                  });
                  setAssignmentModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Tetapkan Jadwal & Lokasi
              </button>
            </div>
          </div>

          {/* ===================================================================
              VIEW TABEL UTAMA: DAFTAR PEGAWAI & SKEMA JADWAL YANG DITERAPKAN
              =================================================================== */}
          {loadingAssignments || loadingEmployees ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-xs text-slate-500">Memuat daftar pegawai dan skema jadwal...</p>
            </div>
          ) : filteredUnifiedEmployees.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Data Pegawai yang Sesuai</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                {assignmentSearch
                  ? 'Tidak ditemukan pegawai yang cocok dengan filter / kata kunci pencarian Anda.'
                  : 'Belum ada data pegawai atau penetapan jadwal yang terdaftar.'}
              </p>
              {assignmentSearch && (
                <button
                  onClick={() => {
                    setAssignmentSearch('');
                    setAssignmentFilterType('all');
                    setAssignmentFilterLocationType('all');
                    setAssignmentStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                >
                  Reset Filter & Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Pegawai / GTK</th>
                      <th className="py-3 px-4">Skema Jadwal Diterapkan</th>
                      <th className="py-3 px-4">Ketentuan Jam Masuk & Pulang</th>
                      <th className="py-3 px-4">Lokasi GPS Presensi</th>
                      <th className="py-3 px-4">Hari Berlaku</th>
                      <th className="py-3 px-4">Status & Periode</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUnifiedEmployees.map((item) => {
                      const isCustom = item.has_custom_assignment;
                      const empName = item.employee_name || `Pegawai #${item.employee_id}`;
                      const empNip = item.employee_number || '-';
                      const empPos = item.employee_position || 'GTK';

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isCustom ? 'hover:bg-slate-50/90' : 'hover:bg-amber-50/30 bg-slate-50/30'
                          }`}
                        >
                          {/* 1. Pegawai / GTK */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                                  isCustom
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {empName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{empName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {empNip} {empPos ? `• ${empPos}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Skema Jadwal Diterapkan */}
                          <td className="py-3 px-4">
                            {isCustom ? (
                              item.assignment_type === 'massal' ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    <Layers className="w-3 h-3 text-blue-600" />
                                    1. Skema Massal
                                  </span>
                                  <div className="text-[11px] font-semibold text-blue-950 mt-1 truncate max-w-[180px]">
                                    {item.schedule_name || 'Shift Terpilih'}
                                  </div>
                                </div>
                              ) : item.assignment_type === 'custom_employee' ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                    <UserCheck className="w-3 h-3 text-purple-600" />
                                    2. Custom Pegawai
                                  </span>
                                  <div className="text-[10px] text-purple-700 mt-0.5 font-medium">
                                    Jadwal Harian Khusus
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Zap className="w-3 h-3 text-amber-600" />
                                    3. Fleksibel
                                  </span>
                                  <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
                                    Target Akumulasi Jam
                                  </div>
                                </div>
                              )
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                                  <Star className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                                  Shift Master Unit
                                </span>
                                <div className="text-[11px] font-semibold text-slate-800 mt-0.5 truncate max-w-[180px]">
                                  {item.schedule_name}
                                </div>
                                <span className="inline-block text-[9px] text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.2 rounded mt-0.5">
                                  Default Otomatis
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 3. Ketentuan Jam Masuk & Pulang */}
                          <td className="py-3 px-4">
                            {isCustom && item.assignment_type === 'flexible' ? (
                              <div className="font-semibold text-amber-900">
                                Target {item.flexible_target_hours || 8} Jam / Hari
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  Tanpa batas jam masuk pagi
                                </span>
                              </div>
                            ) : isCustom && item.assignment_type === 'custom_employee' ? (
                              <div>
                                <div className="font-mono text-xs font-bold text-purple-900">
                                  {formatCustomDaySchedulesSummary(item.custom_day_schedules, item.custom_start_time, item.custom_end_time)}
                                </div>
                                <span className="font-sans text-[10px] text-amber-700 font-semibold">
                                  Toleransi: +{item.custom_late_tolerance_minutes || 15} m
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="font-mono text-xs font-bold text-slate-800">
                                  {formatCustomDaySchedulesSummary(
                                    item.custom_day_schedules,
                                    item.master_start_time || item.start_time,
                                    item.master_end_time || item.end_time
                                  )}
                                </div>
                                <span className="font-sans text-[10px] text-amber-700 font-semibold">
                                  Toleransi: +{item.custom_late_tolerance_minutes || item.late_tolerance_minutes || 15} m
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 4. Lokasi GPS Presensi */}
                          <td className="py-3 px-4">
                            {item.location_assignment_type === 'custom_locations' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                  <MapPin className="w-3 h-3 text-purple-600" />
                                  Kustom ({item.allowed_location_ids?.length || 0} Titik)
                                </span>
                                {item.allowed_locations_detail && item.allowed_locations_detail.length > 0 ? (
                                  <div
                                    className="text-[10px] text-slate-600 mt-0.5 max-w-[170px] truncate"
                                    title={item.allowed_locations_detail.map((l) => l.name).join(', ')}
                                  >
                                    {item.allowed_locations_detail.map((l) => l.name).join(', ')}
                                  </div>
                                ) : (
                                  <span className="block text-[10px] text-slate-400 mt-0.5">Titik kustom terpilih</span>
                                )}
                              </div>
                            ) : item.location_assignment_type === 'default_only' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                  <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
                                  Hanya Titik Default
                                </span>
                                <span className="block text-[10px] text-slate-500 mt-0.5 truncate max-w-[170px]">
                                  {locations.find((l) => l.is_default)?.name || 'Default Unit'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  <Globe className="w-3 h-3 text-slate-500" />
                                  Semua Titik Unit
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  {locations.length} titik aktif
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 5. Hari Berlaku */}
                          <td className="py-3 px-4">
                            {item.assignment_type === 'flexible' ? (
                              <div>
                                <div className="flex flex-wrap gap-1">
                                  {dayOptions.map((d) => (
                                    <span
                                      key={d.id}
                                      className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                      title="Berlaku Setiap Hari (Senin - Minggu)"
                                    >
                                      {d.short}
                                    </span>
                                  ))}
                                </div>
                                <span className="inline-block text-[10px] font-semibold text-amber-800 mt-0.5">
                                  Semua Hari (Sen – Ahd)
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {dayOptions.map((d) => {
                                  let isAct = false;
                                  if (item.custom_day_schedules && typeof item.custom_day_schedules === 'object') {
                                    isAct = Boolean(item.custom_day_schedules[d.id]?.is_active);
                                  } else if (item.custom_days_of_week) {
                                    try {
                                      const parsed = typeof item.custom_days_of_week === 'string'
                                        ? JSON.parse(item.custom_days_of_week)
                                        : item.custom_days_of_week;
                                      isAct = Array.isArray(parsed) && (parsed.includes(d.id) || parsed.includes('all'));
                                    } catch (e) {
                                      isAct = true;
                                    }
                                  } else if (item.days_of_week) {
                                    isAct = Array.isArray(item.days_of_week) && (item.days_of_week.includes(d.id) || item.days_of_week.includes('all'));
                                  } else {
                                    isAct = d.id !== 'sunday';
                                  }

                                  return (
                                    <span
                                      key={d.id}
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                        isAct
                                          ? isCustom
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : 'bg-slate-100 text-slate-400 opacity-40 line-through'
                                      }`}
                                    >
                                      {d.short}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* 6. Status & Periode */}
                          <td className="py-3 px-4">
                            {isCustom ? (
                              <div className="space-y-1">
                                <StatusPill
                                  status={item.is_active ? 'success' : 'neutral'}
                                  label={item.is_active ? 'Khusus Aktif' : 'Nonaktif'}
                                />
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {item.effective_start_date ? (
                                    <span>
                                      {item.effective_start_date.split('T')[0]} s/d{' '}
                                      {item.effective_end_date ? item.effective_end_date.split('T')[0] : '∞'}
                                    </span>
                                  ) : (
                                    <span className="font-sans text-slate-400">Permanen</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  Standar Unit
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-0.5 font-sans">
                                  Mengikuti Master
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 7. Aksi */}
                          <td className="py-3 px-4 text-right">
                            {isCustom ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingAssignment(item);
                                    let populatedDaySchedules = { ...defaultDaySchedules };

                                    if (item.custom_day_schedules) {
                                      if (typeof item.custom_day_schedules === 'object') {
                                        populatedDaySchedules = { ...defaultDaySchedules, ...item.custom_day_schedules };
                                      } else if (typeof item.custom_day_schedules === 'string') {
                                        try {
                                          populatedDaySchedules = { ...defaultDaySchedules, ...JSON.parse(item.custom_day_schedules) };
                                        } catch (e) {}
                                      }
                                    } else if (item.custom_start_time && item.custom_end_time) {
                                      let activeDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                      if (item.custom_days_of_week) {
                                        try {
                                          activeDays = typeof item.custom_days_of_week === 'string'
                                            ? JSON.parse(item.custom_days_of_week)
                                            : item.custom_days_of_week;
                                        } catch (e) {
                                          activeDays = item.custom_days_of_week.split(',').map((s) => s.trim());
                                        }
                                      }
                                      const customObj = {};
                                      dayOptions.forEach((d) => {
                                        customObj[d.id] = {
                                          is_active: Array.isArray(activeDays) ? activeDays.includes(d.id) : true,
                                          start_time: item.custom_start_time?.slice(0, 5) || '07:15',
                                          end_time: item.custom_end_time?.slice(0, 5) || '16:00'
                                        };
                                      });
                                      populatedDaySchedules = customObj;
                                    }

                                    setAssignmentForm({
                                      assignment_type: item.assignment_type || 'massal',
                                      location_assignment_type: item.location_assignment_type || 'all_locations',
                                      allowed_location_ids: Array.isArray(item.allowed_location_ids) ? item.allowed_location_ids.map(Number) : [],
                                      employee_id: item.employee_id || '',
                                      employee_ids: [item.employee_id],
                                      schedule_id: item.schedule_id || '',
                                      custom_start_time: item.custom_start_time?.slice(0, 5) || '07:15',
                                      custom_end_time: item.custom_end_time?.slice(0, 5) || '16:00',
                                      custom_days_of_week: Object.keys(populatedDaySchedules).filter((k) => populatedDaySchedules[k]?.is_active),
                                      custom_day_schedules: populatedDaySchedules,
                                      custom_late_tolerance_minutes: item.custom_late_tolerance_minutes || 15,
                                      custom_early_tolerance_minutes: item.custom_early_tolerance_minutes || 0,
                                      flexible_target_hours: item.flexible_target_hours || 8.0,
                                      effective_start_date: item.effective_start_date?.split('T')[0] || '',
                                      effective_end_date: item.effective_end_date?.split('T')[0] || '',
                                      notes: item.notes || '',
                                      is_active: Boolean(item.is_active)
                                    });
                                    setAssignmentModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition"
                                  title="Edit Penugasan Khusus"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: 'assignment',
                                      id: item.id,
                                      name: `Jadwal Khusus untuk ${item.employee_name}`
                                    })
                                  }
                                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  title="Hapus Penugasan Khusus (Kembali ke Default)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  const emp = item.raw_employee || { id: item.employee_id, name: item.employee_name };
                                  handleOpenAssignModalForSingleEmployee(emp);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] border border-emerald-200 transition shadow-2xs"
                                title="Atur jadwal / lokasi khusus untuk pegawai ini"
                              >
                                <Plus className="w-3 h-3 text-emerald-600" />
                                Atur Khusus
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: MASTER SKEMA SHIFT BAKU
          ========================================================================= */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Master Skema Shift & Toleransi Baku</h2>
              <p className="text-xs text-slate-500">
                Skema jam kerja baku yang menjadi default bagi seluruh pegawai yang belum memiliki penugasan khusus.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSchedule(null);
                setScheduleForm({
                  name: '',
                  schedule_type: 'massal',
                  day_of_week: 'all',
                  days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                  custom_day_schedules: {
                    monday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                    tuesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                    wednesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                    thursday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                    friday: { is_active: true, start_time: '07:15', end_time: '11:30' },
                    saturday: { is_active: true, start_time: '07:15', end_time: '13:00' },
                    sunday: { is_active: false, start_time: '07:15', end_time: '16:00' }
                  },
                  start_time: '07:15',
                  end_time: '16:00',
                  late_tolerance_minutes: 15,
                  early_departure_tolerance_minutes: 0,
                  flexible_target_hours: 8.0,
                  is_active: true,
                  notes: ''
                });
                setScheduleModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Shift Baku
            </button>
          </div>

          {loadingSchedules ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-xs text-slate-500">Memuat master jam kerja...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Pengaturan Jam Kerja</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Atur jam kerja default satuan pendidikan agar sistem dapat menghitung status keterlambatan kehadiran secara otomatis.
              </p>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Tambah Shift Pertama
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nama Shift / Jadwal</th>
                      <th className="py-3 px-4">Ketentuan Jam Masuk & Pulang</th>
                      <th className="py-3 px-4">Hari Berlaku</th>
                      <th className="py-3 px-4">Toleransi</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedules.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.notes && <div className="text-[11px] text-slate-400">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs font-bold text-emerald-800">
                            {formatCustomDaySchedulesSummary(item.custom_day_schedules, item.start_time, item.end_time)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                              {formatScheduleDaysSummary(item.days_of_week, item.day_of_week)}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {dayOptions.map((d) => {
                                let isIncluded = false;
                                if (item.custom_day_schedules && typeof item.custom_day_schedules === 'object') {
                                  isIncluded = Boolean(item.custom_day_schedules[d.id]?.is_active);
                                } else if (item.days_of_week && Array.isArray(item.days_of_week)) {
                                  isIncluded = item.days_of_week.includes(d.id) || item.days_of_week.includes('all');
                                } else if (item.day_of_week === 'all') {
                                  isIncluded = true;
                                } else if (item.day_of_week === d.id) {
                                  isIncluded = true;
                                }
                                return (
                                  <span
                                    key={d.id}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                      isIncluded
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-slate-100 text-slate-400 opacity-40 line-through'
                                    }`}
                                  >
                                    {d.short}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Terlambat: +{item.late_tolerance_minutes || 0} m
                            </span>
                            {item.early_departure_tolerance_minutes > 0 && (
                              <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 ml-1">
                                Pulang cepat: {item.early_departure_tolerance_minutes} m
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill
                            status={item.is_active ? 'success' : 'neutral'}
                            label={item.is_active ? 'Aktif' : 'Nonaktif'}
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingSchedule(item);
                                let populatedDaySchedules = {
                                  monday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                                  tuesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                                  wednesday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                                  thursday: { is_active: true, start_time: '07:15', end_time: '16:00' },
                                  friday: { is_active: true, start_time: '07:15', end_time: '11:30' },
                                  saturday: { is_active: true, start_time: '07:15', end_time: '13:00' },
                                  sunday: { is_active: false, start_time: '07:15', end_time: '16:00' }
                                };

                                if (item.custom_day_schedules) {
                                  if (typeof item.custom_day_schedules === 'object') {
                                    populatedDaySchedules = { ...populatedDaySchedules, ...item.custom_day_schedules };
                                  } else if (typeof item.custom_day_schedules === 'string') {
                                    try {
                                      populatedDaySchedules = { ...populatedDaySchedules, ...JSON.parse(item.custom_day_schedules) };
                                    } catch (e) {}
                                  }
                                } else {
                                  let days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                  if (item.days_of_week) {
                                    if (Array.isArray(item.days_of_week)) {
                                      days = item.days_of_week;
                                    } else if (typeof item.days_of_week === 'string') {
                                      try {
                                        days = JSON.parse(item.days_of_week);
                                      } catch (e) {
                                        days = [item.day_of_week || 'all'];
                                      }
                                    }
                                  } else if (item.day_of_week === 'all') {
                                    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                  } else if (item.day_of_week) {
                                    days = [item.day_of_week];
                                  }

                                  if (days.includes('all')) {
                                    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                                  }

                                  const customObj = {};
                                  dayOptions.forEach((d) => {
                                    customObj[d.id] = {
                                      is_active: Array.isArray(days) ? days.includes(d.id) : true,
                                      start_time: item.start_time?.slice(0, 5) || '07:15',
                                      end_time: item.end_time?.slice(0, 5) || (d.id === 'friday' ? '11:30' : (d.id === 'saturday' ? '13:00' : '16:00'))
                                    };
                                  });
                                  populatedDaySchedules = customObj;
                                }

                                const activeDays = Object.keys(populatedDaySchedules).filter((k) => populatedDaySchedules[k]?.is_active);

                                setScheduleForm({
                                  name: item.name,
                                  schedule_type: item.schedule_type || 'massal',
                                  day_of_week: item.day_of_week,
                                  days_of_week: activeDays,
                                  custom_day_schedules: populatedDaySchedules,
                                  start_time: item.start_time?.slice(0, 5) || '07:15',
                                  end_time: item.end_time?.slice(0, 5) || '16:00',
                                  late_tolerance_minutes: item.late_tolerance_minutes || 15,
                                  early_departure_tolerance_minutes: item.early_departure_tolerance_minutes || 0,
                                  flexible_target_hours: item.flexible_target_hours || 8.0,
                                  is_active: Boolean(item.is_active),
                                  notes: item.notes || ''
                                });
                                setScheduleModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded"
                              title="Edit Shift"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
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
                              <Trash2 className="w-3.5 h-3.5" />
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
          TAB 3: TITIK LOKASI GPS (MULTI-KAMPUS & DEFAULT UNIT)
          ========================================================================= */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {/* Banner Status Titik Lokasi Default Unit */}
          {(() => {
            const defaultLoc = locations.find((l) => l.is_default);
            return defaultLoc ? (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Star className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        Titik Lokasi GPS Default Unit
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{defaultLoc.name}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Koordinat: <span className="font-mono font-semibold text-slate-800">{parseFloat(defaultLoc.latitude).toFixed(6)}, {parseFloat(defaultLoc.longitude).toFixed(6)}</span> | Radius: <span className="font-bold text-emerald-700">{parseFloat(defaultLoc.radius_meters)} Meter</span>
                      {defaultLoc.address ? ` — ${defaultLoc.address}` : ''}
                    </p>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Titik ini adalah lokasi absensi utama bagi seluruh pegawai yang menggunakan mode lokasi default unit sekolah.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmSetAllDefaultModal(true)}
                  disabled={settingAllDefaultLoc}
                  className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100/60 active:scale-95 border border-emerald-300 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Jadikan Lokasi Semua Pegawai</span>
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Belum Ada Titik Lokasi Default Unit yang Ditetapkan</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Klik tombol <strong>"Jadikan Default"</strong> pada salah satu titik lokasi di bawah agar sistem memiliki rujukan titik lokasi utama untuk pegawai.
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama lokasi / alamat..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
                  is_active: true,
                  is_default: locations.length === 0 // otomatis default jika ini lokasi pertama
                });
                setGeoAccuracy(null);
                setLocationModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Titik Lokasi
            </button>
          </div>

          {loadingLocations ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-xs text-slate-500">Memuat daftar titik lokasi absensi...</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <MapPin className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Titik Lokasi Absensi</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Tambahkan titik koordinat resmi kampus agar guru dan staf dapat melakukan presensi kehadiran melalui perangkat mobile.
              </p>
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
                    is_active: true,
                    is_default: true
                  });
                  setLocationModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
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
                  className={`bg-white rounded-xl border transition-shadow p-4 flex flex-col justify-between relative overflow-hidden ${
                    loc.is_default
                      ? 'border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs bg-emerald-50/20'
                      : loc.is_active
                      ? 'border-slate-200 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  {loc.is_default && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-2xs">
                      <Star className="w-3 h-3 fill-white" />
                      Titik Default Unit
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2 pt-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          loc.is_default ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{loc.name}</h3>
                          {loc.is_default && (
                            <span className="text-[10px] font-semibold text-emerald-700">Titik Utama Presensi</span>
                          )}
                        </div>
                      </div>
                      {!loc.is_default && (
                        <StatusPill
                          status={loc.is_active ? 'success' : 'neutral'}
                          label={loc.is_active ? 'Aktif' : 'Nonaktif'}
                        />
                      )}
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
                          <span className="font-medium text-slate-700 block text-[11px]">Alamat:</span>
                          <span className="line-clamp-2 text-[11px]">{loc.address}</span>
                        </div>
                      )}
                      {loc.notes && (
                        <div className="pt-1 text-slate-400 italic text-[11px]">
                          <span>Catatan: {loc.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                    <div>
                      {!loc.is_default ? (
                        <button
                          type="button"
                          disabled={settingDefaultId === loc.id}
                          onClick={() => handleSetDefaultLocation(loc)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Tetapkan titik ini sebagai Titik GPS Default untuk Unit Sekolah"
                        >
                          <Star className="w-3 h-3" />
                          {settingDefaultId === loc.id ? 'Menyimpan...' : 'Jadikan Default'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Default Aktif
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
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
                            is_active: Boolean(loc.is_active),
                            is_default: Boolean(loc.is_default)
                          });
                          setGeoAccuracy(null);
                          setLocationModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded border border-slate-200 flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3 h-3" />
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
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: PENETAPAN JADWAL PEGAWAI (3 METODE)
          ========================================================================= */}
      {assignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingAssignment ? 'Edit Penetapan Jadwal Pegawai' : 'Penetapan Jadwal Masuk (3 Metode)'}
                </h3>
              </div>
              <button
                onClick={() => setAssignmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Pilihan 3 Metode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Pilih Metode Penetapan Jadwal <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div
                    onClick={() => setAssignmentForm({ ...assignmentForm, assignment_type: 'massal' })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      assignmentForm.assignment_type === 'massal'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                      <Layers className="w-4 h-4 text-blue-600" />
                      1. Skema Massal
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Gunakan master shift baku yang telah disiapkan untuk unit.
                    </p>
                  </div>

                  <div
                    onClick={() => setAssignmentForm({ ...assignmentForm, assignment_type: 'custom_employee' })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      assignmentForm.assignment_type === 'custom_employee'
                        ? 'border-purple-600 bg-purple-50/70 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      2. Custom Pegawai
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Jam & hari khusus per individu (misal honorer / ustadz tamu).
                    </p>
                  </div>

                  <div
                    onClick={() => setAssignmentForm({ ...assignmentForm, assignment_type: 'flexible' })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      assignmentForm.assignment_type === 'flexible'
                        ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                      <Zap className="w-4 h-4 text-amber-600" />
                      3. Fleksibel
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Bebas jam masuk, berpatokan akumulasi durasi jam kerja.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pilih Pegawai dengan Live Search */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Pilih Pegawai / GTK <span className="text-rose-500">*</span>
                  </label>
                  {assignmentForm.assignment_type === 'massal' && !editingAssignment && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const unassignedIds = unassignedEmployees.map((e) => e.id);
                          setAssignmentForm({
                            ...assignmentForm,
                            employee_ids: unassignedIds,
                            employee_id: unassignedIds[0] || ''
                          });
                        }}
                        className="text-amber-700 hover:text-amber-800 font-bold hover:underline"
                      >
                        Pilih Belum Berjadwal ({unassignedEmployees.length})
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = employees.map((e) => e.id);
                          setAssignmentForm({
                            ...assignmentForm,
                            employee_ids: allIds,
                            employee_id: allIds[0] || ''
                          });
                        }}
                        className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                      >
                        Pilih Seluruh Pegawai ({employees.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* SearchableSelect Mode Multi-Select (Khusus Penugasan Massal baru) vs Single Select */}
                {assignmentForm.assignment_type === 'massal' && !editingAssignment ? (
                  <div>
                    <SearchableSelect
                      isMulti={true}
                      options={employeeSelectOptions}
                      value={assignmentForm.employee_ids}
                      onChange={(val) => {
                        const arr = Array.isArray(val) ? val : (val ? [val] : []);
                        setAssignmentForm({
                          ...assignmentForm,
                          employee_ids: arr,
                          employee_id: arr[0] || ''
                        });
                      }}
                      placeholder="-- Cari & Pilih Satu atau Banyak Pegawai --"
                      searchPlaceholder="Ketik nama atau NIP pegawai untuk mencari..."
                      accentColor="emerald"
                      className="text-xs"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>
                        {assignmentForm.employee_ids.length > 0
                          ? `Terpilih ${assignmentForm.employee_ids.length} pegawai untuk penetapan serentak`
                          : 'Ketik nama/NIP untuk mencari dan memilih beberapa pegawai sekaligus.'}
                      </span>
                      {assignmentForm.employee_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAssignmentForm({ ...assignmentForm, employee_ids: [], employee_id: '' })}
                          className="text-rose-600 hover:underline text-[10px] font-medium"
                        >
                          Kosongkan Pilihan
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    options={employeeSelectOptions}
                    value={assignmentForm.employee_id}
                    onChange={(val) => {
                      setAssignmentForm({
                        ...assignmentForm,
                        employee_id: val,
                        employee_ids: val ? [val] : []
                      });
                    }}
                    placeholder="-- Cari & Pilih Pegawai (Ketik Nama / NIP) --"
                    searchPlaceholder="Ketik nama atau NIP pegawai..."
                    accentColor="emerald"
                    className="text-xs"
                    required
                  />
                )}
              </div>

              {/* Form Spesifik Metode 1: Skema Massal dengan Live Search */}
              {assignmentForm.assignment_type === 'massal' && (
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                  <label className="block text-xs font-bold text-blue-900 uppercase">
                    Pilih Skema Master Pekanan <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={scheduleSelectOptions}
                    value={assignmentForm.schedule_id}
                    onChange={(val) => setAssignmentForm({ ...assignmentForm, schedule_id: val })}
                    placeholder="-- Cari & Pilih Master Skema Jam Kerja --"
                    searchPlaceholder="Ketik nama skema atau jam kerja..."
                    accentColor="blue"
                    className="text-xs bg-white rounded-lg"
                    required
                  />
                  <p className="text-[11px] text-blue-700">
                    Jadwal akan otomatis berlaku pada hari-hari kerja yang ditetapkan di skema tersebut. Hari di luar skema dianggap sebagai hari libur / non-kerja.
                  </p>
                </div>
              )}

              {/* Form Spesifik Metode 2: Custom Pegawai (Bisa berbeda tiap hari) */}
              {assignmentForm.assignment_type === 'custom_employee' && (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-200/80">
                    <div>
                      <h4 className="font-bold text-purple-950 text-xs">Jadwal Harian Khusus Pegawai</h4>
                      <p className="text-[11px] text-purple-800">
                        Atur jam masuk dan jam pulang yang berbeda untuk masing-masing hari, atau tetapkan secara masal di bawah ini.
                      </p>
                    </div>
                  </div>

                  {/* Toolbar Penetapan Waktu Masal Pegawai */}
                  <div className="p-3 bg-purple-100/70 rounded-lg border border-purple-300 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-700" />
                        Penetapan Waktu Masal
                      </span>
                      <span className="text-[10px] text-purple-800 font-medium hidden sm:inline">
                        Atur jam di bawah lalu klik tombol aksi untuk menerapkan ke hari yang dipilih
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-600">Masuk:</span>
                        <TimePickerCompact
                          value={bulkAssignmentTime.start_time}
                          onChange={(val) => setBulkAssignmentTime((prev) => ({ ...prev, start_time: val }))}
                          accentColor="purple"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-600">Pulang:</span>
                        <TimePickerCompact
                          value={bulkAssignmentTime.end_time}
                          onChange={(val) => setBulkAssignmentTime((prev) => ({ ...prev, end_time: val }))}
                          accentColor="purple"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap flex-1 justify-start sm:justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setAssignmentForm((prev) => {
                              const updated = { ...prev.custom_day_schedules };
                              Object.keys(updated).forEach((d) => {
                                if (updated[d]?.is_active) {
                                  updated[d] = {
                                    ...updated[d],
                                    start_time: bulkAssignmentTime.start_time,
                                    end_time: bulkAssignmentTime.end_time
                                  };
                                }
                              });
                              return { ...prev, custom_day_schedules: updated };
                            });
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-2xs flex items-center gap-1 transition-all"
                          title="Terapkan jam masuk & pulang ini ke semua hari yang saat ini dicentang (aktif)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Terapkan ke Hari Tercentang
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignmentForm((prev) => {
                              const updated = { ...prev.custom_day_schedules };
                              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((d) => {
                                updated[d] = {
                                  ...(updated[d] || {}),
                                  is_active: true,
                                  start_time: bulkAssignmentTime.start_time,
                                  end_time: bulkAssignmentTime.end_time
                                };
                              });
                              ['saturday', 'sunday'].forEach((d) => {
                                updated[d] = { ...(updated[d] || {}), is_active: false };
                              });
                              return { ...prev, custom_day_schedules: updated };
                            });
                          }}
                          className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-purple-50 text-purple-900 font-semibold border border-purple-300 shadow-2xs transition-all"
                          title="Aktifkan Sen-Jum & terapkan jam ini (Sabtu-Minggu libur)"
                        >
                          Sen - Jum (5 Hari)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignmentForm((prev) => {
                              const updated = { ...prev.custom_day_schedules };
                              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach((d) => {
                                updated[d] = {
                                  ...(updated[d] || {}),
                                  is_active: true,
                                  start_time: bulkAssignmentTime.start_time,
                                  end_time: bulkAssignmentTime.end_time
                                };
                              });
                              updated.sunday = { ...(updated.sunday || {}), is_active: false };
                              return { ...prev, custom_day_schedules: updated };
                            });
                          }}
                          className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-purple-50 text-purple-900 font-semibold border border-purple-300 shadow-2xs transition-all"
                          title="Aktifkan Sen-Sab & terapkan jam ini (Minggu libur)"
                        >
                          Sen - Sab (6 Hari)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAssignmentForm((prev) => {
                              const updated = { ...prev.custom_day_schedules };
                              ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((d) => {
                                updated[d] = {
                                  ...(updated[d] || {}),
                                  is_active: true,
                                  start_time: bulkAssignmentTime.start_time,
                                  end_time: bulkAssignmentTime.end_time
                                };
                              });
                              return { ...prev, custom_day_schedules: updated };
                            });
                          }}
                          className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-purple-50 text-purple-900 font-semibold border border-purple-300 shadow-2xs transition-all"
                          title="Aktifkan semua 7 hari & terapkan jam ini"
                        >
                          Semua 7 Hari
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List Tabel Jadwal 7 Hari */}
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-purple-200 max-h-72 overflow-y-auto">
                    {dayOptions.map((d) => {
                      const schedule = assignmentForm.custom_day_schedules?.[d.id] || { is_active: false, start_time: '07:15', end_time: '16:00' };
                      const isActive = Boolean(schedule.is_active);

                      return (
                        <div
                          key={d.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                            isActive
                              ? 'bg-purple-50/40 border-purple-200'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:w-32 shrink-0">
                            <input
                              type="checkbox"
                              id={`day-toggle-${d.id}`}
                              checked={isActive}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setAssignmentForm((prev) => ({
                                  ...prev,
                                  custom_day_schedules: {
                                    ...prev.custom_day_schedules,
                                    [d.id]: {
                                      ...(prev.custom_day_schedules?.[d.id] || { start_time: '07:15', end_time: '16:00' }),
                                      is_active: checked
                                    }
                                  }
                                }));
                              }}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                            />
                            <label htmlFor={`day-toggle-${d.id}`} className="cursor-pointer">
                              <span className="text-xs font-bold text-slate-800">{d.label}</span>
                              <span className={`block text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isActive ? 'Hari Kerja' : 'Libur'}
                              </span>
                            </label>
                          </div>

                          {isActive ? (
                            <div className="flex items-center gap-3 flex-1 justify-start sm:justify-end flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-500 w-12 shrink-0">Masuk:</span>
                                <TimePickerCompact
                                  value={schedule.start_time || '07:15'}
                                  onChange={(newTime) => {
                                    setAssignmentForm((prev) => ({
                                      ...prev,
                                      custom_day_schedules: {
                                        ...prev.custom_day_schedules,
                                        [d.id]: { ...schedule, start_time: newTime }
                                      }
                                    }));
                                  }}
                                  accentColor="purple"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-500 w-12 shrink-0">Pulang:</span>
                                <TimePickerCompact
                                  value={schedule.end_time || '16:00'}
                                  onChange={(newTime) => {
                                    setAssignmentForm((prev) => ({
                                      ...prev,
                                      custom_day_schedules: {
                                        ...prev.custom_day_schedules,
                                        [d.id]: { ...schedule, end_time: newTime }
                                      }
                                    }));
                                  }}
                                  accentColor="purple"
                                />
                              </div>

                              <span className="text-[10px] font-mono text-purple-700 font-bold hidden sm:inline">
                                WIB
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  const curStartTime = schedule.start_time || '07:15';
                                  const curEndTime = schedule.end_time || '16:00';
                                  setAssignmentForm((prev) => {
                                    const updated = { ...prev.custom_day_schedules };
                                    Object.keys(updated).forEach((k) => {
                                      if (updated[k]?.is_active) {
                                        updated[k] = { ...updated[k], start_time: curStartTime, end_time: curEndTime };
                                      }
                                    });
                                    return { ...prev, custom_day_schedules: updated };
                                  });
                                }}
                                className="text-[10px] px-2 py-1 rounded bg-white hover:bg-purple-100 text-purple-800 font-semibold border border-purple-200 shadow-2xs transition-all"
                                title={`Salin jam ${d.label} (${schedule.start_time || '07:15'} - ${schedule.end_time || '16:00'}) ke semua hari aktif`}
                              >
                                Salin ke Hari Aktif Lain
                              </button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic py-1">
                              Tidak ada kewajiban presensi pada hari ini
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Toleransi Terlambat (Menit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={assignmentForm.custom_late_tolerance_minutes}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, custom_late_tolerance_minutes: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Toleransi Pulang Cepat (Menit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={assignmentForm.custom_early_tolerance_minutes}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, custom_early_tolerance_minutes: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Spesifik Metode 3: Fleksibel */}
              {assignmentForm.assignment_type === 'flexible' && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Zap className="w-4 h-4 fill-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-950 text-xs">Ketentuan Jadwal Fleksibel</h4>
                      <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                        Pegawai dapat melakukan absensi kapan saja tanpa terikat jam masuk pagi. Sistem akan menghitung akumulasi durasi jam kerja saat check-out.
                      </p>
                    </div>
                  </div>

                  {/* Info Hari Berlaku: Senin - Minggu */}
                  <div className="bg-white/80 p-3 rounded-lg border border-amber-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Hari Berlaku Absensi
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        Semua Hari (Senin – Minggu)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dayOptions.map((d) => (
                        <span
                          key={d.id}
                          className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase mb-1">
                      Target Akumulasi Jam Kerja Harian
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="24"
                        required
                        value={assignmentForm.flexible_target_hours}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, flexible_target_hours: e.target.value })}
                        className="w-24 px-3 py-2 text-xs font-bold text-amber-900 rounded-lg border border-slate-300 bg-white shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="text-xs font-medium text-slate-600">Jam per hari</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Penetapan Titik Lokasi GPS Pegawai */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Penetapan Titik Lokasi Presensi GPS
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Menentukan di radius GPS mana pegawai diizinkan check-in
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setAssignmentForm({ ...assignmentForm, location_assignment_type: 'all_locations' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignmentForm.location_assignment_type === 'all_locations'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Globe className={`w-4 h-4 ${assignmentForm.location_assignment_type === 'all_locations' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <input
                        type="radio"
                        name="location_assignment_type"
                        checked={assignmentForm.location_assignment_type === 'all_locations'}
                        onChange={() => setAssignmentForm({ ...assignmentForm, location_assignment_type: 'all_locations' })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="text-xs font-semibold">Semua Titik Unit</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Bisa presensi di semua titik aktif unit
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentForm({ ...assignmentForm, location_assignment_type: 'default_only' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignmentForm.location_assignment_type === 'default_only'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Star className={`w-4 h-4 ${assignmentForm.location_assignment_type === 'default_only' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <input
                        type="radio"
                        name="location_assignment_type"
                        checked={assignmentForm.location_assignment_type === 'default_only'}
                        onChange={() => setAssignmentForm({ ...assignmentForm, location_assignment_type: 'default_only' })}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <div className="text-xs font-semibold">Hanya Titik Default</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      {locations.some(l => l.is_default || l.is_default === 1)
                        ? `Utama: ${locations.find(l => l.is_default || l.is_default === 1)?.name}`
                        : 'Khusus titik bertanda default'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentForm({ ...assignmentForm, location_assignment_type: 'custom_locations' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      assignmentForm.location_assignment_type === 'custom_locations'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-950 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <MapPin className={`w-4 h-4 ${assignmentForm.location_assignment_type === 'custom_locations' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <input
                        type="radio"
                        name="location_assignment_type"
                        checked={assignmentForm.location_assignment_type === 'custom_locations'}
                        onChange={() => setAssignmentForm({ ...assignmentForm, location_assignment_type: 'custom_locations' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="text-xs font-semibold">Kustom Titik Tertentu</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                      Pilih 1 atau lebih titik lokasi khusus
                    </div>
                  </button>
                </div>

                {/* Sub-Panel: Pilihan Lokasi Kustom */}
                {assignmentForm.location_assignment_type === 'custom_locations' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Pilih Titik Lokasi yang Diizinkan ({assignmentForm.allowed_location_ids.length} dipilih):
                      </span>
                      <div className="flex gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setAssignmentForm({
                            ...assignmentForm,
                            allowed_location_ids: locations.map(l => l.id)
                          })}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setAssignmentForm({
                            ...assignmentForm,
                            allowed_location_ids: []
                          })}
                          className="text-slate-500 hover:underline font-medium"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    {locations.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-2 text-center bg-white rounded border border-dashed border-slate-200">
                        Belum ada data titik lokasi GPS di unit ini. Tambahkan di tab Titik Lokasi GPS.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {locations.map((loc) => {
                          const isChecked = assignmentForm.allowed_location_ids.some(id => String(id) === String(loc.id));
                          const isDef = loc.is_default === true || loc.is_default === 1 || loc.is_default === '1';

                          return (
                            <label
                              key={loc.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-blue-50/50 border-blue-300 text-blue-950 font-medium'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const curIds = [...assignmentForm.allowed_location_ids];
                                  if (e.target.checked) {
                                    if (!curIds.some(id => String(id) === String(loc.id))) {
                                      curIds.push(loc.id);
                                    }
                                  } else {
                                    const filtered = curIds.filter(id => String(id) !== String(loc.id));
                                    curIds.length = 0;
                                    curIds.push(...filtered);
                                  }
                                  setAssignmentForm({ ...assignmentForm, allowed_location_ids: curIds });
                                }}
                                className="mt-0.5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs flex items-center gap-1.5 truncate">
                                  <span className="truncate">{loc.name}</span>
                                  {isDef && (
                                    <span className="px-1 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold shrink-0">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>Radius {loc.radius_meters || 100}m</span>
                                  {loc.latitude && loc.longitude && (
                                    <span className="truncate">
                                      ({Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {assignmentForm.allowed_location_ids.length === 0 && (
                      <p className="text-[10px] text-rose-600 font-medium">
                        ⚠️ Wajib memilih minimal 1 titik lokasi jika memilih mode Kustom.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Masa Berlaku (Opsional) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Efektif Dari Tanggal (Opsional)
                  </label>
                  <DatePickerField
                    value={assignmentForm.effective_start_date}
                    onChange={(isoDate) => setAssignmentForm({ ...assignmentForm, effective_start_date: isoDate || '' })}
                    placeholder="DD/MM/YYYY"
                    className="text-xs"
                    allowClear={true}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Sampai Tanggal (Opsional)
                  </label>
                  <DatePickerField
                    value={assignmentForm.effective_end_date}
                    onChange={(isoDate) => setAssignmentForm({ ...assignmentForm, effective_end_date: isoDate || '' })}
                    placeholder="DD/MM/YYYY"
                    className="text-xs"
                    allowClear={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Catatan / Keterangan</label>
                <textarea
                  rows="2"
                  placeholder="Misal: Jadwal khusus semester ganjil ustadz tahfidz..."
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="assignmentActive"
                  checked={assignmentForm.is_active}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="assignmentActive" className="text-xs font-semibold text-slate-700">
                  Status Jadwal Aktif
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssignmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Simpan Penetapan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH / EDIT MASTER JAM KERJA (SHIFT BAKU)
          ========================================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingSchedule ? 'Edit Master Shift Baku' : 'Tambah Master Shift Baku Baru'}
                </h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Shift / Skema <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mis. Shift Reguler Guru & Staf, Shift Asrama, Shift Satpam"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Konfigurasi Jam Kerja 7 Hari Per Hari */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/80">
                  <div>
                    <h4 className="font-bold text-emerald-950 text-xs">Jadwal Jam Masuk & Pulang Harian</h4>
                    <p className="text-[11px] text-emerald-800">
                      Tentukan jam masuk dan jam pulang untuk masing-masing hari kerja, atau tetapkan secara masal di bawah ini.
                    </p>
                  </div>
                </div>

                {/* Toolbar Penetapan Waktu Masal */}
                <div className="p-3 bg-emerald-100/70 rounded-lg border border-emerald-300 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      Penetapan Waktu Masal
                    </span>
                    <span className="text-[10px] text-emerald-800 font-medium hidden sm:inline">
                      Atur jam di bawah lalu klik tombol aksi untuk menerapkan ke hari yang dipilih
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600">Masuk:</span>
                      <TimePickerCompact
                        value={bulkScheduleTime.start_time}
                        onChange={(val) => setBulkScheduleTime((prev) => ({ ...prev, start_time: val }))}
                        accentColor="emerald"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-600">Pulang:</span>
                      <TimePickerCompact
                        value={bulkScheduleTime.end_time}
                        onChange={(val) => setBulkScheduleTime((prev) => ({ ...prev, end_time: val }))}
                        accentColor="emerald"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap flex-1 justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleForm((prev) => {
                            const updated = { ...prev.custom_day_schedules };
                            Object.keys(updated).forEach((d) => {
                              if (updated[d]?.is_active) {
                                updated[d] = {
                                  ...updated[d],
                                  start_time: bulkScheduleTime.start_time,
                                  end_time: bulkScheduleTime.end_time
                                };
                              }
                            });
                            return { ...prev, custom_day_schedules: updated };
                          });
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-2xs flex items-center gap-1 transition-all"
                        title="Terapkan jam masuk & pulang ini ke semua hari yang saat ini dicentang (aktif)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Terapkan ke Hari Tercentang
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScheduleForm((prev) => {
                            const updated = { ...prev.custom_day_schedules };
                            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((d) => {
                              updated[d] = {
                                ...(updated[d] || {}),
                                is_active: true,
                                start_time: bulkScheduleTime.start_time,
                                end_time: bulkScheduleTime.end_time
                              };
                            });
                            ['saturday', 'sunday'].forEach((d) => {
                              updated[d] = { ...(updated[d] || {}), is_active: false };
                            });
                            return { ...prev, custom_day_schedules: updated };
                          });
                        }}
                        className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 font-semibold border border-emerald-300 shadow-2xs transition-all"
                        title="Aktifkan Sen-Jum & terapkan jam ini (Sabtu-Minggu libur)"
                      >
                        Sen - Jum (5 Hari)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScheduleForm((prev) => {
                            const updated = { ...prev.custom_day_schedules };
                            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach((d) => {
                              updated[d] = {
                                ...(updated[d] || {}),
                                is_active: true,
                                start_time: bulkScheduleTime.start_time,
                                end_time: bulkScheduleTime.end_time
                              };
                            });
                            updated.sunday = { ...(updated.sunday || {}), is_active: false };
                            return { ...prev, custom_day_schedules: updated };
                          });
                        }}
                        className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 font-semibold border border-emerald-300 shadow-2xs transition-all"
                        title="Aktifkan Sen-Sab & terapkan jam ini (Minggu libur)"
                      >
                        Sen - Sab (6 Hari)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setScheduleForm((prev) => {
                            const updated = { ...prev.custom_day_schedules };
                            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((d) => {
                              updated[d] = {
                                ...(updated[d] || {}),
                                is_active: true,
                                start_time: bulkScheduleTime.start_time,
                                end_time: bulkScheduleTime.end_time
                              };
                            });
                            return { ...prev, custom_day_schedules: updated };
                          });
                        }}
                        className="text-xs px-2 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 font-semibold border border-emerald-300 shadow-2xs transition-all"
                        title="Aktifkan semua 7 hari & terapkan jam ini"
                      >
                        Semua 7 Hari
                      </button>
                    </div>
                  </div>
                </div>

                {/* List Tabel Jadwal 7 Hari */}
                <div className="space-y-2 bg-white p-3 rounded-lg border border-emerald-200 max-h-72 overflow-y-auto">
                  {dayOptions.map((d) => {
                    const schedule = scheduleForm.custom_day_schedules?.[d.id] || { is_active: false, start_time: '07:15', end_time: '16:00' };
                    const isActive = Boolean(schedule.is_active);

                    return (
                      <div
                        key={d.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:w-32 shrink-0">
                          <input
                            type="checkbox"
                            id={`shift-day-toggle-${d.id}`}
                            checked={isActive}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setScheduleForm((prev) => ({
                                ...prev,
                                custom_day_schedules: {
                                  ...prev.custom_day_schedules,
                                  [d.id]: {
                                    ...(prev.custom_day_schedules?.[d.id] || { start_time: '07:15', end_time: '16:00' }),
                                    is_active: checked
                                  }
                                }
                              }));
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor={`shift-day-toggle-${d.id}`} className="cursor-pointer">
                            <span className="text-xs font-bold text-slate-800">{d.label}</span>
                            <span className={`block text-[10px] font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {isActive ? 'Hari Kerja' : 'Libur'}
                            </span>
                          </label>
                        </div>

                        {isActive ? (
                          <div className="flex items-center gap-3 flex-1 justify-start sm:justify-end flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-500 w-12 shrink-0">Masuk:</span>
                              <TimePickerCompact
                                value={schedule.start_time || '07:15'}
                                onChange={(newTime) => {
                                  setScheduleForm((prev) => ({
                                    ...prev,
                                    custom_day_schedules: {
                                      ...prev.custom_day_schedules,
                                      [d.id]: { ...schedule, start_time: newTime }
                                    }
                                  }));
                                }}
                                accentColor="emerald"
                              />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-500 w-12 shrink-0">Pulang:</span>
                              <TimePickerCompact
                                value={schedule.end_time || '16:00'}
                                onChange={(newTime) => {
                                  setScheduleForm((prev) => ({
                                    ...prev,
                                    custom_day_schedules: {
                                      ...prev.custom_day_schedules,
                                      [d.id]: { ...schedule, end_time: newTime }
                                    }
                                  }));
                                }}
                                accentColor="emerald"
                              />
                            </div>

                            <span className="text-[10px] font-mono text-emerald-700 font-bold hidden sm:inline">
                              WIB
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const curStartTime = schedule.start_time || '07:15';
                                const curEndTime = schedule.end_time || '16:00';
                                setScheduleForm((prev) => {
                                  const updated = { ...prev.custom_day_schedules };
                                  Object.keys(updated).forEach((k) => {
                                    if (updated[k]?.is_active) {
                                      updated[k] = { ...updated[k], start_time: curStartTime, end_time: curEndTime };
                                    }
                                  });
                                  return { ...prev, custom_day_schedules: updated };
                                });
                              }}
                              className="text-[10px] px-2 py-1 rounded bg-white hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 shadow-2xs transition-all"
                              title={`Salin jam ${d.label} (${schedule.start_time || '07:15'} - ${schedule.end_time || '16:00'}) ke semua hari aktif`}
                            >
                              Salin ke Hari Aktif Lain
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic py-1">
                            Hari Libur (Non-Kerja)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catatan</label>
                <textarea
                  rows="2"
                  placeholder="Keterangan tambahan shift..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="scheduleActive"
                  checked={scheduleForm.is_active}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="scheduleActive" className="text-xs font-semibold text-slate-700">
                  Status Shift Aktif
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Simpan Master Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH / EDIT LOKASI GPS
          ========================================================================= */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
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

            <form onSubmit={handleSubmitLocation} className="p-6 space-y-4 text-xs">
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Koordinat GPS + Ambil Lokasi & Map Picker */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">Koordinat GPS Sekolah</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors shadow-2xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Pilih di Peta
                    </button>
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={geoLocating}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
                      {geoLocating ? 'Mendeteksi...' : 'GPS Saat Ini'}
                    </button>
                  </div>
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
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {geoAccuracy && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✓ Koordinat terdeteksi dengan akurasi GPS: ±{Math.round(geoAccuracy)} meter
                  </p>
                )}
              </div>

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
                    className="w-32 px-3 py-2 text-xs font-bold text-emerald-700 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <input
                    type="checkbox"
                    id="locationDefault"
                    checked={locationForm.is_default}
                    onChange={(e) => setLocationForm({ ...locationForm, is_default: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <label htmlFor="locationDefault" className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 cursor-pointer">
                      <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                      Jadikan Titik Lokasi GPS Default Unit Sekolah Ini
                    </label>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Titik ini akan otomatis menjadi titik absensi utama bagi pegawai unit yang tidak diset lokasi kustom.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 px-1">
                  <input
                    type="checkbox"
                    id="locationActive"
                    checked={locationForm.is_active}
                    onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="locationActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Status Titik Lokasi Aktif
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Simpan Titik Lokasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KONFIRMASI SET SEMUA PEGAWAI KE LOKASI DEFAULT
          ========================================================================= */}
      {confirmSetAllDefaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-2">
              Jadikan Lokasi Default untuk Semua Pegawai?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Tindakan ini akan mengatur seluruh pegawai aktif di unit sekolah ini agar menggunakan <strong>Titik Lokasi Default Unit</strong> sebagai rujukan absensi kehadiran GPS mereka.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={settingAllDefaultLoc}
                onClick={() => setConfirmSetAllDefaultModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={settingAllDefaultLoc}
                onClick={handleSetAllEmployeesDefaultLocation}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {settingAllDefaultLoc ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Terapkan ke Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KONFIRMASI HAPUS
          ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Konfirmasi Penghapusan</h3>
            <p className="text-xs text-slate-500 mb-5">
              Apakah Anda yakin ingin menghapus data <strong>"{deleteConfirm.name}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Peta Interaktif (OpenStreetMap Leaflet) */}
      <MapCoordinatePickerModal
        isOpen={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLat={locationForm.latitude}
        initialLng={locationForm.longitude}
        initialRadius={locationForm.radius_meters}
        onSelectCoordinate={({ latitude, longitude, radius_meters }) => {
          setLocationForm((prev) => ({
            ...prev,
            latitude: String(latitude),
            longitude: String(longitude),
            radius_meters: radius_meters || prev.radius_meters
          }));
          setGeoAccuracy(null);
        }}
      />
    </div>
  );
}
