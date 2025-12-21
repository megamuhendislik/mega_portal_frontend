import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, X, Calendar, ChevronLeft, ChevronRight, Settings, Info, Clock, CheckCircle } from 'lucide-react';
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

const MONTHS_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
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

    // Drag Selection State
    const [isDragging, setIsDragging] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);

    // Modal State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showHolidayModal, setShowHolidayModal] = useState(false);

    // Edit Data
    const [scheduleFormData, setScheduleFormData] = useState(null);
    const [holidayFormData, setHolidayFormData] = useState(null);

    const { user } = useAuth();
    const canManageHolidays = user?.user?.is_superuser || user?.all_permissions?.includes('CALENDAR_MANAGE_HOLIDAYS');

    const today = moment().startOf('day');

    // --- Effects ---
    useEffect(() => {
        moment.locale('tr');
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [schedulesRes, holidaysRes] = await Promise.all([
                api.get('/work-schedules/'),
                api.get('/public-holidays/')
            ]);
            setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : schedulesRes.data.results || []);
            setHolidays(Array.isArray(holidaysRes.data) ? holidaysRes.data : holidaysRes.data.results || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schedules.length > 0 && !selectedScheduleId) {
            setSelectedScheduleId(schedules[0].id);
        }
    }, [schedules]);

    const selectedSchedule = schedules.find(s => s.id === parseInt(selectedScheduleId));

    // --- Interaction Handlers (Drag Select) ---

    // 1. Mouse Down: Start Selection
    const handleMouseDown = (date) => {
        if (!editMode || !canManageHolidays) return;
        if (date.isBefore(today, 'day')) return; // Block past dates

        setIsDragging(true);
        setSelectionStart(date);
        setSelectionEnd(date);
    };

    // 2. Mouse Enter: Update Selection End (while dragging)
    const handleMouseEnter = (date) => {
        if (!isDragging) return;
        setSelectionEnd(date);
    };

    // 3. Mouse Up: Finish Selection & Open Modal
    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        if (!selectionStart || !selectionEnd) return;

        // Determine range (start could be after end if dragged backwards)
        const start = selectionStart.isBefore(selectionEnd) ? selectionStart : selectionEnd;
        const end = selectionStart.isBefore(selectionEnd) ? selectionEnd : selectionStart;

        openHolidayModalRange(start, end);
    };

    // Standard Click Handling (Fallbacks if no drag happened)
    const handleDayClick = (date, existingHoliday) => {
        if (date.isBefore(today, 'day')) return;

        // If dragging just finished, ignore duplicate click event
        if (isDragging) return;

        // If existing holiday, open edit for THAT specific holiday
        if (existingHoliday) {
            openHolidayModalEdit(existingHoliday);
            return;
        }

        // If edit mode is ON and no existing holiday, treat as single day select
        if (editMode && canManageHolidays) {
            setSelectionStart(date);
            setSelectionEnd(date);
            openHolidayModalRange(date, date);
        }
    };

    // Double click shortcut (Works even if edit mode is OFF, for power users)
    const handleDayDoubleClick = (date, existingHoliday) => {
        if (date.isBefore(today, 'day')) return;

        if (canManageHolidays) {
            if (existingHoliday) {
                openHolidayModalEdit(existingHoliday);
            } else {
                setSelectionStart(date);
                setSelectionEnd(date);
                openHolidayModalRange(date, date);
            }
        }
    }


    // --- Modal Logic ---

    // Open Modal for NEW Holiday (Range or Single)
    const openHolidayModalRange = (start, end) => {
        const isMultiDay = !start.isSame(end, 'day');

        setHolidayFormData({
            id: null,
            name: '',
            category: 'OFFICIAL',
            isPartial: false,
            startTime: '13:00',
            endTime: '18:00',
            rangeStart: start,
            rangeEnd: end,
            isMultiDay: isMultiDay
        });
        setShowHolidayModal(true);
    };

    // Open Modal for EXISTING Holiday
    const openHolidayModalEdit = (holiday) => {
        const holidayDate = moment(holiday.date);
        const isPartial = !!holiday.start_time;

        setHolidayFormData({
            id: holiday.id,
            name: holiday.name,
            category: holiday.category,
            isPartial: isPartial,
            startTime: holiday.start_time ? holiday.start_time.substring(0, 5) : '13:00',
            endTime: holiday.end_time ? holiday.end_time.substring(0, 5) : '18:00',
            rangeStart: holidayDate,
            rangeEnd: holidayDate,
            isMultiDay: false // Editing existng always effectively single day for now
        });
        setShowHolidayModal(true);
    };

    const handleSaveHoliday = async () => {
        if (!holidayFormData.name.trim()) return alert('Lütfen isim giriniz.');

        try {
            const { rangeStart, rangeEnd, name, category, isPartial, startTime, endTime } = holidayFormData;

            // Generate list of dates to process
            const datesToProcess = [];
            let current = rangeStart.clone();
            while (current.isSameOrBefore(rangeEnd)) {
                datesToProcess.push(current.clone());
                current.add(1, 'day');
            }

            // Prepare Payload Base
            const basePayload = { name, category };

            // Logic:
            // 1. If Multi-Day: Force FULL_DAY for all (Partial not supported for ranges yet logic-wise easily)
            // 2. If Single-Day: Allow Partial

            if (holidayFormData.isMultiDay) {
                // Bulk Create for Range
                const promises = datesToProcess.map(date =>
                    api.post('/public-holidays/', {
                        ...basePayload,
                        date: date.format('YYYY-MM-DD'),
                        type: 'FULL_DAY',
                        start_time: null,
                        end_time: null
                    })
                );
                await Promise.all(promises);
            } else {
                // Single Day (Create or Update)
                const payload = {
                    ...basePayload,
                    date: rangeStart.format('YYYY-MM-DD'),
                    type: isPartial ? 'HALF_DAY' : 'FULL_DAY',
                    start_time: isPartial ? startTime : null,
                    end_time: isPartial ? endTime : null
                };

                if (holidayFormData.id) {
                    await api.put(`/public-holidays/${holidayFormData.id}/`, payload);
                } else {
                    await api.post('/public-holidays/', payload);
                }
            }

            setShowHolidayModal(false);
            setSelectionStart(null);
            setSelectionEnd(null);
            fetchData(); // Refresh grid
        } catch (error) {
            console.error('Save failed:', error);
            alert('Kaydetme hatası: ' + (error.response?.data?.detail || error.message));
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
            alert('Silinemedi.');
        }
    }


    // --- Render Helpers ---
    const getDayStatus = (date) => {
        const dateStr = date.format('YYYY-MM-DD');

        // Check Selection State (Dragging visual)
        if (selectionStart && selectionEnd) {
            const start = selectionStart.isBefore(selectionEnd) ? selectionStart : selectionEnd;
            const end = selectionStart.isBefore(selectionEnd) ? selectionEnd : selectionStart;
            if (date.isBetween(start, end, 'day', '[]')) {
                return { type: 'SELECTED', label: 'Seçili', color: 'bg-blue-200 ring-2 ring-blue-400 z-10' };
            }
        }

        // Check Public Holiday
        const holiday = holidays.find(h => h.date === dateStr);
        if (holiday) {
            const isReligious = holiday.category === 'RELIGIOUS';
            // Partial text
            let label = holiday.name;
            if (holiday.start_time && holiday.end_time) {
                label += ` (${holiday.start_time.substring(0, 5)}-${holiday.end_time.substring(0, 5)})`;
            }

            return {
                type: 'HOLIDAY',
                label: label,
                color: isReligious ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-red-100 text-red-700 border-red-200',
                holiday
            };
        }

        // Check Schedule
        if (!selectedSchedule) return { type: 'UNKNOWN', label: '-', color: 'bg-slate-50' };

        const dayKey = date.format('ddd').toUpperCase();
        const rule = selectedSchedule.schedule[dayKey];
        if (!rule || rule.is_off) return { type: 'OFF', label: 'Hafta Tatili', color: 'bg-slate-100 text-slate-400' };

        return { type: 'WORK', label: `${rule.start}-${rule.end}`, color: 'bg-green-50 text-green-700 border-green-200 border' };
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Yükleniyor...</div>;

    return (
        <div className="p-4 w-full mx-auto select-none" onMouseUp={handleMouseUp}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Çalışma Takvimleri</h2>
                    <p className="text-slate-500 text-sm mt-1">Takvim ve tatil yönetimi.</p>
                </div>
                <button
                    onClick={() => {
                        const defaultSchedule = {};
                        DAYS.forEach(day => { defaultSchedule[day.key] = { start: '09:00', end: '18:00', is_off: day.key === 'SAT' || day.key === 'SUN' }; });
                        setScheduleFormData({ id: null, name: '', is_default: false, lunch_start: '12:30', lunch_end: '13:30', daily_break_allowance: 30, late_tolerance_minutes: 15, schedule: defaultSchedule });
                        setShowScheduleModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
                >
                    <Plus size={20} /> Yeni Takvim Ekle
                </button>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8 flex flex-col xl:flex-row items-center gap-6 justify-between">
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
                        <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>

                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1">
                        <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-white rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
                        <span className="px-4 py-2 font-bold text-slate-700 min-w-[80px] text-center">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-white rounded-lg text-slate-500"><ChevronRight size={20} /></button>
                    </div>

                    {selectedSchedule && (
                        <div className="flex items-center gap-2 ml-2 border-l border-slate-200 pl-4">
                            <button
                                onClick={() => {
                                    setScheduleFormData({
                                        id: selectedSchedule.id,
                                        name: selectedSchedule.name,
                                        is_default: selectedSchedule.is_default,
                                        lunch_start: selectedSchedule.lunch_start || '12:30',
                                        lunch_end: selectedSchedule.lunch_end || '13:30',
                                        daily_break_allowance: selectedSchedule.daily_break_allowance || 30,
                                        late_tolerance_minutes: selectedSchedule.late_tolerance_minutes || 15,
                                        schedule: JSON.parse(JSON.stringify(selectedSchedule.schedule))
                                    });
                                    setShowScheduleModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Settings size={16} /> Ayarlar
                            </button>
                            {!selectedSchedule.is_default && (
                                <button onClick={() => {
                                    if (window.confirm('Silmek istediğinize emin misiniz?')) {
                                        api.delete(`/work-schedules/${selectedSchedule.id}/`).then(() => { setSelectedScheduleId(null); fetchData(); });
                                    }
                                }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                    {/* Legend */}
                    <div className="flex gap-3 text-xs">
                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Çalışma</div>
                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Tatil</div>
                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Resmi</div>
                    </div>

                    {canManageHolidays && (
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <span className={`text-sm font-bold ${editMode ? 'text-blue-600' : 'text-slate-500'}`}>Tatil Modu</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Message */}
            {editMode && (
                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                    <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-blue-800 text-sm">Tatil Düzenleme Modu</h4>
                        <p className="text-blue-600 text-sm mt-1">Günleri seçmek için tıklayın veya <strong>basılı tutup sürükleyerek</strong> çoklu seçim yapın.</p>
                    </div>
                </div>
            )}

            {/* Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                {MONTHS_TR.map((monthName, index) => {
                    const monthStart = moment(`${selectedYear}-${index + 1}-01`, 'YYYY-M-DD').locale('tr');
                    const daysInMonth = monthStart.daysInMonth();
                    const startDayOfWeek = (monthStart.day() + 6) % 7;

                    return (
                        <div key={monthName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none">
                            <div className="bg-slate-50 p-3 border-b border-slate-100 text-center font-bold text-slate-800 capitalize">{monthName}</div>
                            <div className="p-4">
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => <div key={d} className="text-center text-[10px] text-slate-400 font-bold">{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1.5">
                                    {Array(startDayOfWeek).fill(null).map((_, i) => <div key={`e-${i}`} className="h-8"></div>)}
                                    {Array(daysInMonth).fill(null).map((_, i) => {
                                        const date = moment(monthStart).add(i, 'days').locale('tr');
                                        const status = getDayStatus(date);
                                        const isPast = date.isBefore(today, 'day');

                                        return (
                                            <div
                                                key={i}
                                                onMouseDown={() => handleMouseDown(date)}
                                                onMouseEnter={() => handleMouseEnter(date)}
                                                // MouseUp handled by wrapper div to catch drops anywhere, but click handles logic here if needed
                                                onClick={() => handleDayClick(date, status.holiday)}
                                                onDoubleClick={() => handleDayDoubleClick(date, status.holiday)}
                                                className={`
                                                    h-8 flex items-center justify-center text-xs font-medium rounded-lg transition-all relative group
                                                    ${status.color}
                                                    ${isPast ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                                                    ${!isPast && editMode ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : ''}
                                                `}
                                                title={status.label}
                                            >
                                                {i + 1}
                                                {status.holiday?.start_time && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-full border border-white"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- Modals (Portals) --- */}

            {/* Holiday Modal */}
            {showHolidayModal && holidayFormData && createPortal(
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100">
                        <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-lg">{holidayFormData.id ? 'Tatili Düzenle' : 'Tatil Ekle'}</h3>
                            <button onClick={() => setShowHolidayModal(false)}><X className="text-slate-400 hover:text-slate-600" size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Date Display */}
                            <div className="text-sm font-medium text-blue-800 text-center bg-blue-50 py-3 rounded-xl border border-blue-100 capitalize">
                                {holidayFormData.isMultiDay
                                    ? `${holidayFormData.rangeStart.locale('tr').format('D MMMM')} - ${holidayFormData.rangeEnd.locale('tr').format('D MMMM')}`
                                    : holidayFormData.rangeStart.locale('tr').format('D MMMM YYYY, dddd')
                                }
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">TATİL ADI</label>
                                <input
                                    autoFocus
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                    placeholder="Örn: 29 Ekim"
                                    value={holidayFormData.name}
                                    onChange={e => setHolidayFormData({ ...holidayFormData, name: e.target.value })}
                                />
                            </div>

                            {/* Type (Official/Religious) */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setHolidayFormData({ ...holidayFormData, category: 'OFFICIAL' })}
                                    className={`p-3 rounded-xl border-2 font-bold transition-all ${holidayFormData.category === 'OFFICIAL' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 text-slate-500'}`}>Resmi Tatil</button>
                                <button onClick={() => setHolidayFormData({ ...holidayFormData, category: 'RELIGIOUS' })}
                                    className={`p-3 rounded-xl border-2 font-bold transition-all ${holidayFormData.category === 'RELIGIOUS' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}>Dini Bayram</button>
                            </div>

                            {/* Partial Day Option (Only for Single Day Mode) */}
                            {!holidayFormData.isMultiDay && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="flex items-center cursor-pointer mb-3">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                            checked={holidayFormData.isPartial}
                                            onChange={(e) => setHolidayFormData({ ...holidayFormData, isPartial: e.target.checked })}
                                        />
                                        <span className="ml-3 font-bold text-slate-700 text-sm">Yarım / Kısmi Gün</span>
                                    </label>

                                    {holidayFormData.isPartial && (
                                        <div className="flex items-center gap-2 animate-fade-in mt-2 border-t border-slate-200 pt-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Başlangıç</label>
                                                <input type="time" value={holidayFormData.startTime} onChange={(e) => setHolidayFormData({ ...holidayFormData, startTime: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-medium" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Bitiş</label>
                                                <input type="time" value={holidayFormData.endTime} onChange={(e) => setHolidayFormData({ ...holidayFormData, endTime: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-medium" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {holidayFormData.id && (
                                <button onClick={handleDeleteHoliday} className="w-full py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium border border-transparent hover:border-red-100 flex items-center justify-center gap-2">
                                    <Trash2 size={18} /> Sil
                                </button>
                            )}
                        </div>

                        <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setShowHolidayModal(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-100">Vazgeç</button>
                            <button onClick={handleSaveHoliday} className="flex-[2] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"><Save size={18} /> Kaydet</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Schedule Modal (Simplified for brevity, assuming existing logic maintained in spirit but cleaner) */}
            {showScheduleModal && scheduleFormData && createPortal(
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in text-left">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div><h3 className="text-xl font-bold text-slate-800">Haftalık Program</h3><p className="text-slate-500 text-sm">Çalışma saatlerini düzenle.</p></div>
                            <button onClick={() => setShowScheduleModal(false)}><X className="text-slate-400 hover:text-slate-600" size={24} /></button>
                        </div>
                        {/* Body */}
                        <form className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Basic Settings */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Takvim Adı</label>
                                    <input value={scheduleFormData.name} onChange={e => setScheduleFormData({ ...scheduleFormData, name: e.target.value })} className="input-std w-full px-4 py-2 border rounded-lg" />
                                </div>
                                <div className="flex items-center pt-6">
                                    <input type="checkbox" checked={scheduleFormData.is_default} onChange={e => setScheduleFormData({ ...scheduleFormData, is_default: e.target.checked })} className="w-5 h-5 text-blue-600" />
                                    <span className="ml-2 font-medium text-slate-700">Varsayılan Takvim</span>
                                </div>
                            </div>
                            {/* List of Days */}
                            <div className="space-y-3">
                                {DAYS.map(day => {
                                    const rule = scheduleFormData.schedule[day.key] || {};
                                    return (
                                        <div key={day.key} className={`flex items-center gap-4 p-3 rounded-lg border ${rule.is_off ? 'bg-slate-50' : 'bg-white'}`}>
                                            <div className="w-24 font-bold text-slate-700">{day.label}</div>
                                            <label className="flex items-center cursor-pointer mr-4">
                                                <input type="checkbox" checked={rule.is_off} onChange={e => {
                                                    const ns = { ...scheduleFormData.schedule };
                                                    ns[day.key] = { ...rule, is_off: e.target.checked };
                                                    setScheduleFormData({ ...scheduleFormData, schedule: ns });
                                                }} className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="ml-2 text-sm text-slate-600">Tatil</span>
                                            </label>
                                            {!rule.is_off && (
                                                <div className="flex gap-2">
                                                    <input type="time" value={rule.start} onChange={e => {
                                                        const ns = { ...scheduleFormData.schedule }; ns[day.key].start = e.target.value; setScheduleFormData({ ...scheduleFormData, schedule: ns });
                                                    }} className="border rounded px-2 py-1 text-sm" />
                                                    <span className="text-slate-400">-</span>
                                                    <input type="time" value={rule.end} onChange={e => {
                                                        const ns = { ...scheduleFormData.schedule }; ns[day.key].end = e.target.value; setScheduleFormData({ ...scheduleFormData, schedule: ns });
                                                    }} className="border rounded px-2 py-1 text-sm" />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </form>
                        {/* Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 z-10">
                            <button onClick={() => setShowScheduleModal(false)} className="px-5 py-2 text-slate-600 bg-white border rounded-lg">İptal</button>
                            <button onClick={async (e) => {
                                e.preventDefault();
                                try {
                                    if (scheduleFormData.id) await api.put(`/work-schedules/${scheduleFormData.id}/`, scheduleFormData);
                                    else await api.post('/work-schedules/', scheduleFormData);
                                    setShowScheduleModal(false); fetchData();
                                } catch (err) { alert('Hata'); }
                            }} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Kaydet</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default WorkSchedules;
