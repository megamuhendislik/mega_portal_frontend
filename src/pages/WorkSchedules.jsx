import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Check, Calendar, ChevronLeft, ChevronRight, Settings, Info } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';
import { useAuth } from '../context/AuthContext';
import 'moment/locale/tr';

// Constants
const DAYS = [
    { key: 'MON', label: 'Pazartesi' },
    { key: 'TUE', label: 'Salı' },
    { key: 'WED', label: 'Çarşamba' },
    { key: 'THU', label: 'Perşembe' },
    { key: 'FRI', label: 'Cuma' },
    { key: 'SAT', label: 'Cumartesi' },
    { key: 'SUN', label: 'Pazar' },
];

const WorkSchedules = () => {
    // --- State ---
    const [schedules, setSchedules] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    // View State
    const [selectedScheduleId, setSelectedScheduleId] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [editMode, setEditMode] = useState(false); // Holiday Edit Mode

    // Modal State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showHolidayModal, setShowHolidayModal] = useState(false);

    // Edit Data
    const [scheduleFormData, setScheduleFormData] = useState(null); // For creating/editing schedules
    const [holidayFormData, setHolidayFormData] = useState(null); // For creating/editing holidays
    const [selectedDateForHoliday, setSelectedDateForHoliday] = useState(null);

    const { user } = useAuth();
    const canManageHolidays = user?.all_permissions?.includes('CALENDAR_MANAGE_HOLIDAYS');
    const today = moment().startOf('day');

    // --- Effects ---
    useEffect(() => {
        fetchData();
    }, []);

    // Select first schedule by default when data loads
    useEffect(() => {
        if (schedules.length > 0 && !selectedScheduleId) {
            setSelectedScheduleId(schedules[0].id);
        }
    }, [schedules]);

    // --- Data Fetching ---
    const fetchData = async () => {
        try {
            const [schedulesRes, holidaysRes] = await Promise.all([
                api.get('/work-schedules/'),
                api.get('/public-holidays/')
            ]);

            const sData = schedulesRes.data.results || schedulesRes.data;
            const hData = holidaysRes.data.results || holidaysRes.data;

            setSchedules(Array.isArray(sData) ? sData : []);
            setHolidays(Array.isArray(hData) ? hData : []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Derived State ---
    const selectedSchedule = schedules.find(s => s.id === parseInt(selectedScheduleId));

    // --- Handlers: Schedule ---
    const handleInitNewSchedule = () => {
        const defaultSchedule = {};
        DAYS.forEach(day => {
            defaultSchedule[day.key] = {
                start: '09:00',
                end: '18:00',
                is_off: day.key === 'SAT' || day.key === 'SUN'
            };
        });
        setScheduleFormData({
            id: null,
            name: '',
            is_default: false,
            lunch_start: '12:30',
            lunch_end: '13:30',
            daily_break_allowance: 30,
            late_tolerance_minutes: 15,
            schedule: defaultSchedule
        });
        setShowScheduleModal(true);
    };

    const handleEditSchedule = () => {
        if (!selectedSchedule) return;
        setScheduleFormData({
            id: selectedSchedule.id,
            name: selectedSchedule.name,
            is_default: selectedSchedule.is_default,
            lunch_start: selectedSchedule.lunch_start || '12:30',
            lunch_end: selectedSchedule.lunch_end || '13:30',
            daily_break_allowance: selectedSchedule.daily_break_allowance || 30,
            late_tolerance_minutes: selectedSchedule.late_tolerance_minutes || 15,
            schedule: JSON.parse(JSON.stringify(selectedSchedule.schedule)) // Deep copy
        });
        setShowScheduleModal(true);
    };

    const handleDeleteSchedule = async () => {
        if (!selectedSchedule) return;
        if (!window.confirm(`${selectedSchedule.name} adlı takvimi silmek istediğinize emin misiniz?`)) return;

        try {
            await api.delete(`/work-schedules/${selectedSchedule.id}/`);
            // Reset selection to force auto-select of next available
            setSelectedScheduleId(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Silme işlemi başarısız.');
        }
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        try {
            if (scheduleFormData.id) {
                await api.put(`/work-schedules/${scheduleFormData.id}/`, scheduleFormData);
            } else {
                await api.post('/work-schedules/', scheduleFormData);
            }
            setShowScheduleModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Kaydetme başarısız.');
        }
    };

    // --- Handlers: Holidays ---
    const handleDayClick = (date, existingHoliday) => {
        // Only trigger if Edit Mode is active AND user has permission
        if (editMode && canManageHolidays) {
            setSelectedDateForHoliday(date);
            setHolidayFormData(existingHoliday ? { ...existingHoliday } : { name: '', category: 'OFFICIAL' });
            setShowHolidayModal(true);
        }
    };

    const handleSaveHoliday = async () => {
        if (!holidayFormData.name.trim()) {
            alert('Lütfen bir isim giriniz.');
            return;
        }

        try {
            const payload = {
                name: holidayFormData.name,
                category: holidayFormData.category,
                date: selectedDateForHoliday.format('YYYY-MM-DD')
            };

            if (holidayFormData.id) {
                await api.put(`/public-holidays/${holidayFormData.id}/`, payload);
            } else {
                await api.post('/public-holidays/', payload);
            }
            setShowHolidayModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving holiday:', error);
            alert('Tatil kaydedilemedi.');
        }
    };

    const handleDeleteHoliday = async () => {
        if (!holidayFormData.id) return;
        if (!window.confirm('Bu tatili silmek istediğinize emin misiniz?')) return;

        try {
            await api.delete(`/public-holidays/${holidayFormData.id}/`);
            setShowHolidayModal(false);
            fetchData();
        } catch (error) {
            console.error('Error deleting holiday:', error);
            alert('Tatil silinemedi.');
        }
    };

    // --- Render Helpers ---
    const getDayStatus = (date) => {
        const dateStr = date.format('YYYY-MM-DD');

        // 1. Check Public Holiday
        const holiday = holidays.find(h => h.date === dateStr);
        if (holiday) {
            const isReligious = holiday.category === 'RELIGIOUS';
            return {
                type: 'HOLIDAY',
                label: holiday.name,
                color: isReligious
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-red-100 text-red-700 border-red-200',
                holiday
            };
        }

        // 2. Check Schedule Rules
        if (!selectedSchedule) return { type: 'UNKNOWN', label: '-', color: 'bg-slate-50' };

        const dayKey = date.format('ddd').toUpperCase();
        const rule = selectedSchedule.schedule[dayKey];

        if (!rule || rule.is_off) {
            return { type: 'OFF', label: 'Hafta Tatili', color: 'bg-slate-100 text-slate-400' };
        }

        return { type: 'WORK', label: `${rule.start}-${rule.end}`, color: 'bg-green-50 text-green-700 border-green-200 border' };
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Takvim verileri yükleniyor...</div>;

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Çalışma Takvimleri</h2>
                    <p className="text-slate-500 text-sm mt-1">Şirket genelindeki çalışma saatlerini ve tatil günlerini buradan yönetebilirsiniz.</p>
                </div>
                <button
                    onClick={handleInitNewSchedule}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={20} />
                    Yeni Takvim Ekle
                </button>
            </div>

            {/* Main Controls Toolbar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8 flex flex-col xl:flex-row items-center gap-6 justify-between">

                {/* Left: Schedule & Year Selection */}
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="relative">
                        <select
                            value={selectedScheduleId || ''}
                            onChange={(e) => setSelectedScheduleId(e.target.value)}
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-3 pl-4 pr-10 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[240px] cursor-pointer"
                        >
                            {schedules.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.is_default ? '(Varsayılan)' : ''}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Calendar size={18} />
                        </div>
                    </div>

                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-700 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 py-2 font-bold text-slate-700 min-w-[80px] text-center">{selectedYear}</span>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-700 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {selectedSchedule && (
                        <div className="flex items-center gap-2 ml-2 border-l border-slate-200 pl-4">
                            <button
                                onClick={handleEditSchedule}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Settings size={16} />
                                Haftalık Ayarlar
                            </button>
                            {!selectedSchedule.is_default && (
                                <button
                                    onClick={handleDeleteSchedule}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Takvimi Sil"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Legend & Holiday Mode */}
                <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs justify-center">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded border border-green-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                            <span className="text-green-800 font-medium">Çalışma</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                            <span className="text-slate-600 font-medium">Hafta Tatili</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded border border-red-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            <span className="text-red-800 font-medium">Resmi Tatil</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded border border-indigo-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                            <span className="text-indigo-800 font-medium">Dini Bayram</span>
                        </div>
                    </div>

                    {/* Edit Mode Toggle */}
                    {canManageHolidays && (
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <span className={`text-sm font-bold transition-colors ${editMode ? 'text-blue-600' : 'text-slate-500'}`}>
                                Tatil Düzenleme Modu
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Banner if Edit Mode is ON */}
            {editMode && (
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 animate-fade-in shadow-sm">
                    <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-blue-800 text-sm">Düzenleme Modu Aktif</h4>
                        <p className="text-blue-600 text-sm mt-1">
                            Tatil eklemek veya mevcut tatilleri düzenlemek için takvim üzerindeki günlere <strong>TEK TIKLAYINIZ</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Annual Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                {moment.months().map((monthName, index) => {
                    const monthStart = moment(`${selectedYear}-${index + 1}-01`, 'YYYY-M-DD');
                    const daysInMonth = monthStart.daysInMonth();
                    const startDayOfWeek = (monthStart.day() + 6) % 7; // Monday start

                    return (
                        <div key={monthName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="bg-slate-50 p-3 border-b border-slate-100">
                                <h4 className="font-bold text-slate-800 text-center capitalize">{monthName}</h4>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                                        <div key={d} className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">{d}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1.5">
                                    {/* Empty cells for start offset */}
                                    {Array(startDayOfWeek).fill(null).map((_, i) => (
                                        <div key={`empty-${i}`} className="h-8"></div>
                                    ))}

                                    {/* Days */}
                                    {Array(daysInMonth).fill(null).map((_, i) => {
                                        const date = moment(monthStart).add(i, 'days');
                                        const status = getDayStatus(date);
                                        const isPast = date.isBefore(today);

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => handleDayClick(date, status.holiday)}
                                                className={`
                                                    h-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all select-none relative group
                                                    ${status.color} 
                                                    ${isPast ? 'opacity-50 grayscale-[0.5]' : ''} 
                                                    ${editMode && canManageHolidays
                                                        ? 'cursor-pointer hover:ring-2 ring-blue-400 hover:scale-110 hover:shadow-lg z-0 hover:z-10 bg-white/50 backdrop-blur-sm' // Hover effect in edit mode
                                                        : 'cursor-default'
                                                    }
                                                `}
                                                title={`${date.format('DD MMMM YYYY')}\n${status.label}`}
                                            >
                                                {i + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- Modals --- */}

            {/* Holiday Modal */}
            {showHolidayModal && holidayFormData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                        <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {holidayFormData.id ? 'Tatili Düzenle' : 'Yeni Tatil Ekle'}
                            </h3>
                            <button onClick={() => setShowHolidayModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="text-sm font-medium text-blue-800 text-center bg-blue-50 py-3 rounded-xl border border-blue-100">
                                {selectedDateForHoliday?.format('DD MMMM YYYY, dddd')}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tatil Adı</label>
                                <input
                                    type="text"
                                    value={holidayFormData.name}
                                    onChange={(e) => setHolidayFormData({ ...holidayFormData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                                    placeholder="Örn: 29 Ekim Cumhuriyet Bayramı"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tatil Türü</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setHolidayFormData({ ...holidayFormData, category: 'OFFICIAL' })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${holidayFormData.category === 'OFFICIAL' ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200' : 'border-slate-100 hover:border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <div className="font-bold">Resmi Tatil</div>
                                    </button>
                                    <button
                                        onClick={() => setHolidayFormData({ ...holidayFormData, category: 'RELIGIOUS' })}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${holidayFormData.category === 'RELIGIOUS' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200' : 'border-slate-100 hover:border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <div className="font-bold">Dini Bayram</div>
                                    </button>
                                </div>
                            </div>

                            {holidayFormData.id && (
                                <button
                                    onClick={handleDeleteHoliday}
                                    className="w-full py-3 mt-2 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
                                >
                                    <Trash2 size={18} />
                                    Tatili Sil
                                </button>
                            )}
                        </div>

                        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowHolidayModal(false)} className="flex-1 px-4 py-3 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors bg-white border border-slate-200">
                                Vazgeç
                            </button>
                            <button onClick={handleSaveHoliday} className="flex-[2] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                                <Save size={18} />
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal (Weekly Rules) */}
            {showScheduleModal && scheduleFormData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[55] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {scheduleFormData.id ? 'Haftalık Programı Düzenle' : 'Yeni Takvim Oluştur'}
                                </h3>
                                <p className="text-slate-500 text-sm mt-0.5">Haftalık çalışma saatlerini ve mola sürelerini belirleyin.</p>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchedule} className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* General Settings */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                        Genel Ayarlar
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Takvim Adı</label>
                                        <input
                                            type="text"
                                            required
                                            value={scheduleFormData.name}
                                            onChange={(e) => setScheduleFormData({ ...scheduleFormData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                            placeholder="Örn: Standart Mesai"
                                        />
                                    </div>
                                    <div className="flex items-center pt-2">
                                        <label className="flex items-center cursor-pointer select-none group">
                                            <input
                                                type="checkbox"
                                                checked={scheduleFormData.is_default}
                                                onChange={(e) => setScheduleFormData({ ...scheduleFormData, is_default: e.target.checked })}
                                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-3 text-slate-700 group-hover:text-blue-700 transition-colors font-medium">Bu takvimi varsayılan olarak ayarla</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                                        Mola & Tolerans
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Günlük Mola (dk)</label>
                                            <input
                                                type="number"
                                                value={scheduleFormData.daily_break_allowance}
                                                onChange={(e) => setScheduleFormData({ ...scheduleFormData, daily_break_allowance: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Geç Kalma Toleransı (dk)</label>
                                            <input
                                                type="number"
                                                value={scheduleFormData.late_tolerance_minutes}
                                                onChange={(e) => setScheduleFormData({ ...scheduleFormData, late_tolerance_minutes: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Standart Öğle Molası</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={scheduleFormData.lunch_start}
                                                onChange={(e) => setScheduleFormData({ ...scheduleFormData, lunch_start: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                            <span className="text-slate-400 font-bold">-</span>
                                            <input
                                                type="time"
                                                value={scheduleFormData.lunch_end}
                                                onChange={(e) => setScheduleFormData({ ...scheduleFormData, lunch_end: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Weekly Schedule Grid */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 border-t border-slate-100 pt-6">
                                    <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                                    Haftalık Çalışma Saatleri
                                </h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {DAYS.map(day => {
                                        const rule = scheduleFormData.schedule[day.key] || {};
                                        return (
                                            <div key={day.key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${rule.is_off ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}>
                                                <div className="w-28 font-semibold text-slate-700">{day.label}</div>

                                                <label className="flex items-center cursor-pointer mr-6">
                                                    <input
                                                        type="checkbox"
                                                        checked={rule.is_off}
                                                        onChange={(e) => {
                                                            const newSchedule = { ...scheduleFormData.schedule };
                                                            newSchedule[day.key] = { ...rule, is_off: e.target.checked };
                                                            setScheduleFormData({ ...scheduleFormData, schedule: newSchedule });
                                                        }}
                                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="ml-2.5 text-sm font-medium text-slate-600">Tatil</span>
                                                </label>

                                                {!rule.is_off && (
                                                    <div className="flex items-center gap-3 flex-1 animate-fade-in">
                                                        <div className="relative group flex-1 max-w-[150px]">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                                                <span className="text-xs font-bold">BAŞLA</span>
                                                            </div>
                                                            <input
                                                                type="time"
                                                                value={rule.start}
                                                                onChange={(e) => {
                                                                    const newSchedule = { ...scheduleFormData.schedule };
                                                                    newSchedule[day.key] = { ...rule, start: e.target.value };
                                                                    setScheduleFormData({ ...scheduleFormData, schedule: newSchedule });
                                                                }}
                                                                className="w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                                            />
                                                        </div>
                                                        <span className="text-slate-300">-</span>
                                                        <div className="relative group flex-1 max-w-[150px]">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                                                <span className="text-xs font-bold">BİTİŞ</span>
                                                            </div>
                                                            <input
                                                                type="time"
                                                                value={rule.end}
                                                                onChange={(e) => {
                                                                    const newSchedule = { ...scheduleFormData.schedule };
                                                                    newSchedule[day.key] = { ...rule, end: e.target.value };
                                                                    setScheduleFormData({ ...scheduleFormData, schedule: newSchedule });
                                                                }}
                                                                className="w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </form>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 z-10">
                            <button
                                type="button"
                                onClick={() => setShowScheduleModal(false)}
                                className="px-5 py-2.5 text-slate-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-xl font-medium transition-all"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveSchedule}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95"
                            >
                                <Save size={20} />
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkSchedules;
