import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import api from '../services/api';
import { Calendar, Users, Clock, Save, Plus, Trash2, CheckCircle, RefreshCw, AlertTriangle, X, Loader2 } from 'lucide-react';
import YearCalendar from '../components/YearCalendar';

const WorkSchedules = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Consolidated State
    const [draftData, setDraftData] = useState(null);
    const [executionLogs, setExecutionLogs] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCalendars();
    }, []);

    useEffect(() => {
        if (selectedCalendarId) {
            fetchCalendarDetails(selectedCalendarId);
        } else {
            setDraftData(null);
        }
    }, [selectedCalendarId]);

    const fetchCalendars = async () => {
        setLoading(true);
        try {
            const res = await api.get('/attendance/fiscal-calendars/');
            const data = res.data.results || res.data;
            setCalendars(data);
            if (data.length > 0 && !selectedCalendarId) {
                setSelectedCalendarId(data[0].id);
            }
        } catch (error) {
            console.error("Error fetching calendars:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCalendarDetails = async (id) => {
        try {
            const [calRes, assignRes] = await Promise.all([
                api.get(`/attendance/fiscal-calendars/${id}/`),
                api.get(`/attendance/fiscal-calendars/${id}/assigned_employees/`)
            ]);
            setDraftData(calRes.data);
            setAssignments(assignRes.data.map(e => e.id));
        } catch (error) {
            console.error("Error details:", error);
        }
    };

    const handleGlobalSave = async () => {
        if (!draftData) return;
        setSaving(true);
        setExecutionLogs([]); // Clear old logs

        try {
            // 1. Update Calendar Settings
            await api.patch(`/attendance/fiscal-calendars/${draftData.id}/`, draftData);

            // 2. Update Assignments
            await api.post(`/attendance/fiscal-calendars/${draftData.id}/assign_employees/`, {
                employee_ids: assignments
            });

            // 3. Auto-Recalculate Targets (Entire Year for Safety)
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
            const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);

            // We await this so the modal stays open until done
            const res = await api.post(`/attendance/fiscal-calendars/${draftData.id}/recalculate/`, {
                start_date: startOfYear,
                end_date: endOfYear
            });

            // Capture Logs
            if (res.data.logs) {
                setExecutionLogs(res.data.logs);
            } else {
                setExecutionLogs(["Log bilgisi alınamadı."]);
            }

            // Refresh to ensure sync
            fetchCalendarDetails(draftData.id);

        } catch (error) {
            alert("Hata: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        const name = prompt("Yeni Takvim Adı (Örn: 2027 Genel):");
        if (!name) return;

        const yearInput = prompt("Yıl:", new Date().getFullYear() + 1);
        if (!yearInput) return;
        const year = parseInt(yearInput);

        try {
            const res = await api.post('/attendance/fiscal-calendars/', {
                name,
                year: year,
                weekly_schedule: {
                    MON: { start: "08:00", end: "18:00", is_off: false },
                    TUE: { start: "08:00", end: "18:00", is_off: false },
                    WED: { start: "08:00", "end": "18:00", is_off: false },
                    THU: { start: "08:00", "end": "18:00", is_off: false },
                    FRI: { start: "08:00", "end": "18:00", is_off: false },
                    SAT: { start: "08:00", "end": "18:00", is_off: true },
                    SUN: { start: "08:00", "end": "18:00", is_off: true }
                },
                // Default settings
                lunch_start: "12:30",
                lunch_end: "13:30",
                daily_break_allowance: 30,
                late_tolerance_minutes: 30,
                early_leave_tolerance_minutes: 0,
                service_tolerance_minutes: 15,
                minimum_overtime_minutes: 15
            });
            setCalendars([...calendars, res.data]);
            setSelectedCalendarId(res.data.id);
        } catch (error) {
            alert('Hata: ' + error.message);
        }
    };

    if (loading && calendars.length === 0) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Mali Takvim Yönetimi</h1>
                    <p className="text-slate-500">Çalışma saatleri, tatiller ve mali dönemleri tek ekrandan yönetin.</p>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                    <Plus size={18} /> Yeni Takvim
                </button>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {/* Sidebar List */}
                <div className="w-72 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-600 flex items-center gap-2">
                        <Calendar size={18} />
                        Takvim Listesi
                    </div>
                    <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                        {calendars.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCalendarId(c.id)}
                                className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedCalendarId === c.id ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'text-slate-600 border-l-4 border-transparent'}`}
                            >
                                <div className="font-medium">{c.name}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600">{c.year}</span>
                                    {c.is_default && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Varsayılan</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    {draftData ? (
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Header Row with SAVE Button */}
                            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-indigo-900">{draftData.name} ({draftData.year})</h2>
                                    <p className="text-sm text-indigo-700">Tüm değişiklikleri yaptıktan sonra kaydedin.</p>
                                </div>
                                <button
                                    onClick={handleGlobalSave}
                                    disabled={saving}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <Save size={20} />
                                    {saving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}
                                </button>
                            </div>

                            {/* Section 1: Top Row - General & Schedule */}
                            <div className="grid grid-cols-12 gap-6">
                                {/* General Settings */}
                                <div className="col-span-12 xl:col-span-4 space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <SettingsIcon /> Genel Ayarlar
                                        </h3>
                                        <GeneralSettingsForm
                                            data={draftData}
                                            onChange={(newData) => setDraftData(newData)}
                                        />
                                    </div>
                                </div>

                                {/* Weekly Schedule */}
                                <div className="col-span-12 xl:col-span-8">
                                    <div className="bg-white border border-slate-200 p-4 rounded-xl h-full shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <ClockIcon /> Haftalık Çalışma Programı
                                        </h3>
                                        <ScheduleSettingsForm
                                            data={draftData}
                                            onChange={(newData) => setDraftData(newData)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 2: Fiscal Periods */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <CalendarIcon /> Mali Dönemler (Bordro Ayları)
                                </h3>
                                <PeriodsSettingsForm data={draftData} refresh={() => fetchCalendarDetails(draftData.id)} />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 3: Users */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <UsersIcon /> Personel Atamaları
                                </h3>
                                <UsersSettingsForm
                                    assignedIds={assignments}
                                    onChange={setAssignments}
                                />
                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <p>Detayları görüntülemek için soldan bir takvim seçin.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Processing Modal & Log Viewer */}
            {(saving || executionLogs.length > 0) && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">

                        {saving ? (
                            <div className="p-8 text-center">
                                <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Ayarlar Kaydediliyor...</h3>
                                <p className="text-slate-500 text-sm mb-6">
                                    Personel hedefleri ve devamlılık kayıtları güncelleniyor. Bu işlem personel sayısına göre birkaç saniye sürebilir.
                                </p>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                                    <div className="h-full bg-indigo-500 animate-pulse rounded-full w-2/3"></div>
                                </div>
                                <p className="text-xs text-slate-400">Lütfen bekleyin...</p>
                            </div>
                        ) : (
                            // Log Viewer Mode
                            <>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="text-emerald-500" size={24} />
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">İşlem Tamamlandı</h3>
                                            <p className="text-xs text-slate-500">Hesaplama detayları aşağıdadır.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setExecutionLogs([])} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                        <X size={20} className="text-slate-500" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 bg-slate-900 text-slate-300 font-mono text-xs space-y-1">
                                    {executionLogs.map((log, i) => (
                                        <div key={i} className={`p-1 ${log.includes('HATA') ? 'text-red-400 bg-red-900/20' : 'border-l-2 border-slate-700 pl-2'}`}>
                                            {log}
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-end">
                                    <button
                                        onClick={() => setExecutionLogs([])}
                                        className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Components ---

const GeneralSettingsForm = ({ data, onChange }) => {
    const [holidays, setHolidays] = useState([]);
    const [showHolidayBuilder, setShowHolidayBuilder] = useState(false);

    useEffect(() => {
        api.get('/public-holidays/').then(res => {
            const data = res.data.results || res.data;
            setHolidays(data);
        });
    }, []);

    const handleChange = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const toggleHoliday = (hId) => {
        const current = data.public_holidays || [];
        const newHolidays = current.includes(hId)
            ? current.filter(id => id !== hId)
            : [...current, hId];
        handleChange('public_holidays', newHolidays);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Takvim Adı</label>
                <input className="input-field w-full bg-white" value={data.name || ''} onChange={e => handleChange('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Yıl</label>
                    <input className="input-field w-full bg-white" type="number" value={data.year || ''} onChange={e => handleChange('year', parseInt(e.target.value))} />
                </div>
                <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-white border rounded hover:bg-slate-50 w-full h-[42px]">
                        <input type="checkbox" checked={data.is_default || false} onChange={e => handleChange('is_default', e.target.checked)} />
                        <span className="text-sm font-medium">Varsayılan</span>
                    </label>
                </div>
            </div>

            {/* Breaks & Lunch Config MOVED TO SCHEDULE */}

            {/* Tolerances Config */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-center tracking-wider">Tolerans & Limitler</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Tolerans (dk)</label>
                        <input
                            className="input-field w-full bg-white text-center"
                            type="number"
                            value={data.late_tolerance_minutes || 0}
                            onChange={e => handleChange('late_tolerance_minutes', parseInt(e.target.value))}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Giriş ve çıkışlar için genel tolerans.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Servis Toleransı (dk)</label>
                        <input className="input-field w-full bg-white text-center" type="number" value={data.service_tolerance_minutes || 0} onChange={e => handleChange('service_tolerance_minutes', parseInt(e.target.value))} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Min. Mesai (dk)</label>
                        <input className="input-field w-full bg-white text-center" type="number" value={data.minimum_overtime_minutes || 0} onChange={e => handleChange('minimum_overtime_minutes', parseInt(e.target.value))} />
                    </div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Resmi Tatiller</label>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHolidayBuilder(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                        >
                            <Calendar size={14} /> Görsel Düzenle
                        </button>
                        <Link to="/public-holidays" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 border-l pl-2 border-slate-300">
                            <Settings size={12} />
                            Tanımları Düzenle
                        </Link>
                    </div>
                </div>
                <div className="bg-white border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                    {holidays.map(h => (
                        <label key={h.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded border border-transparent hover:border-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-indigo-600 rounded"
                                checked={(data.public_holidays || []).includes(h.id)}
                                onChange={() => toggleHoliday(h.id)}
                            />
                            <div className="text-sm">
                                <div className="font-medium text-slate-700">{h.name}</div>
                                <div className="text-xs text-slate-400">{h.date}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Visual Holiday Builder Modal */}

            {showHolidayBuilder && (
                <HolidayBuilderModal
                    onClose={() => setShowHolidayBuilder(false)}
                    selectedHolidayIds={data.public_holidays || []}
                    allHolidays={holidays}
                    onUpdateSelection={(newIds) => onChange({ ...data, public_holidays: newIds })}
                    onNewHolidayCreated={(newHoliday) => {
                        setHolidays([...holidays, newHoliday]);
                    }}
                    onHolidayDeleted={(deletedId) => {
                        setHolidays(holidays.filter(h => h.id !== deletedId));
                        // Remove from current calendar assignment if present
                        if ((data.public_holidays || []).includes(deletedId)) {
                            onChange({ ...data, public_holidays: data.public_holidays.filter(id => id !== deletedId) });
                        }
                    }}
                />
            )}
        </div >
    );
};

const ScheduleSettingsForm = ({ data, onChange }) => {
    const schedule = data.weekly_schedule || {};

    const days = [
        { key: 'MON', label: 'Pazartesi' },
        { key: 'TUE', label: 'Salı' },
        { key: 'WED', label: 'Çarşamba' },
        { key: 'THU', label: 'Perşembe' },
        { key: 'FRI', label: 'Cuma' },
        { key: 'SAT', label: 'Cumartesi' },
        { key: 'SUN', label: 'Pazar' },
    ];

    const handleChange = (dayKey, field, value) => {
        const newSchedule = {
            ...schedule,
            [dayKey]: {
                ...schedule[dayKey],
                [field]: value
            }
        };
        onChange({ ...data, weekly_schedule: newSchedule });
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Gün</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs w-[140px]">Durum</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Mesai Saatleri</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Öğle Arası</th>
                                <th className="px-4 py-3 font-bold text-slate-500 uppercase text-xs w-[100px]">Mola (dk)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {days.map(day => {
                                const dayConfig = schedule[day.key] || {
                                    start: '08:30',
                                    end: '18:00',
                                    is_off: day.key === 'SUN',
                                    lunch_start: '12:30',
                                    lunch_end: '13:30',
                                    daily_break_allowance: 30
                                };
                                const isOff = dayConfig.is_off;

                                return (
                                    <tr key={day.key} className={`transition-colors ${isOff ? 'bg-slate-50 hover:bg-slate-100' : 'hover:bg-indigo-50/30'}`}>
                                        <td className="px-4 py-3 font-bold text-slate-700">{day.label}</td>
                                        <td className="px-4 py-3">
                                            <label className="inline-flex items-center gap-2 cursor-pointer select-none relative group">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    checked={isOff}
                                                    onChange={e => handleChange(day.key, 'is_off', e.target.checked)}
                                                />
                                                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out flex items-center px-0.5 ${isOff ? 'bg-slate-300' : 'bg-emerald-500'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isOff ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 w-16 px-1">{!isOff ? 'Çalışma' : 'Tatil'}</span>
                                            </label>
                                        </td>
                                        <td className="px-4 py-3">
                                            {!isOff ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <Clock size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            type="time"
                                                            value={dayConfig.start}
                                                            onChange={e => handleChange(day.key, 'start', e.target.value)}
                                                            className="pl-7 pr-2 py-1.5 border rounded-lg text-xs font-medium focus:ring-2 ring-indigo-500 outline-none w-[90px]"
                                                        />
                                                    </div>
                                                    <span className="text-slate-400 font-bold">-</span>
                                                    <input
                                                        type="time"
                                                        value={dayConfig.end}
                                                        onChange={e => handleChange(day.key, 'end', e.target.value)}
                                                        className="px-2 py-1.5 border rounded-lg text-xs font-medium focus:ring-2 ring-indigo-500 outline-none w-[80px] text-center"
                                                    />
                                                </div>
                                            ) : <span className="text-slate-400 text-xs italic pl-2">-- : --</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {!isOff ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <input
                                                            type="time"
                                                            value={dayConfig.lunch_start}
                                                            onChange={e => handleChange(day.key, 'lunch_start', e.target.value)}
                                                            className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 ring-indigo-500 outline-none w-[80px]"
                                                        />
                                                    </div>
                                                    <span className="text-slate-300">-</span>
                                                    <input
                                                        type="time"
                                                        value={dayConfig.lunch_end}
                                                        onChange={e => handleChange(day.key, 'lunch_end', e.target.value)}
                                                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 ring-indigo-500 outline-none w-[80px]"
                                                    />
                                                </div>
                                            ) : <span className="text-slate-400 text-xs italic pl-2">-- : --</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {!isOff ? (
                                                <input
                                                    type="number"
                                                    value={dayConfig.daily_break_allowance}
                                                    onChange={e => handleChange(day.key, 'daily_break_allowance', parseInt(e.target.value))}
                                                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center focus:ring-2 ring-indigo-500 outline-none"
                                                />
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-100">
                <AlertTriangle size={14} />
                <span>Not: Günlük mola süreleri ve öğle arası saatleri, ilgili gün için varsayılan değerleri geçersiz kılar.</span>
            </div>
        </div>
    );
};

const PeriodsSettingsForm = ({ data, refresh }) => {
    const handleGenerate = async () => {
        if (!confirm('Mevcut dönemler silinip yeniden oluşturulacak (26-25 kuralı). Onaylıyor musunuz?')) return;
        try {
            await api.post(`/attendance/fiscal-calendars/${data.id}/generate_periods/`, { clear_existing: true });
            refresh();
        } catch (e) { alert(e.message); }
    };

    const periods = data.periods || [];
    periods.sort((a, b) => (a.year - b.year) || (a.month - b.month));

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="font-bold text-slate-700">Dönem Listesi ({data.year})</h4>
                    <p className="text-xs text-slate-500">Maaş ve hakediş hesaplamaları için kullanılan tarih aralıkları.</p>
                </div>
                <button onClick={handleGenerate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
                    <RefreshCw size={16} /> Varsayılanları Oluştur (26-25)
                </button>
            </div>

            {periods.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                    <AlertTriangle className="mx-auto text-amber-500 mb-2" />
                    <p className="text-slate-500 mb-2">Henüz dönem oluşturulmamış.</p>
                    <button onClick={handleGenerate} className="text-indigo-600 hover:underline text-sm font-semibold">Otomatik Oluştur</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {periods.map(p => {
                        const isCurrentMonth = new Date().getMonth() + 1 === p.month && new Date().getFullYear() === p.year;
                        return (
                            <div key={p.id} className={`bg-white border rounded-lg p-4 relative group ${isCurrentMonth ? 'ring-2 ring-indigo-500 border-transparent shadow-md' : 'hover:border-indigo-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-lg text-slate-800">{p.year} / {p.month}</div>
                                    {p.is_locked ? <div className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Kilitli</div> : <div className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Aktif</div>}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Başlangıç:</span>
                                        <span className="font-mono text-slate-700">{p.start_date}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Bitiş:</span>
                                        <span className="font-mono text-slate-700">{p.end_date}</span>
                                    </div>
                                </div>
                                {/* Optional: Edit button could go here */}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const UsersSettingsForm = ({ assignedIds, onChange }) => {
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const usersRes = await api.get('/employees/?page_size=1000');
            setAllEmployees(usersRes.data.results || usersRes.data);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = (employeeId, assign) => {
        const newAssigned = assign
            ? [...assignedIds, employeeId]
            : assignedIds.filter(id => id !== employeeId);
        onChange(newAssigned);
    };

    if (loading) return <div className="py-8 text-center text-slate-400">Kullanıcı listesi yükleniyor...</div>;

    const assigned = allEmployees.filter(e => assignedIds.includes(e.id));
    const unassigned = allEmployees.filter(e => !assignedIds.includes(e.id));

    // Filter logic
    const filterFn = (e) => (e.first_name + ' ' + e.last_name + ' ' + e.employee_code).toLowerCase().includes(searchTerm.toLowerCase());

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <input
                    placeholder="Personel ara..."
                    className="input-field max-w-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                {/* Assigned Column */}
                <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-4 flex flex-col">
                    <h3 className="font-bold mb-3 text-indigo-700 flex justify-between items-center">
                        <span>Bu Takvime Dahil ({assigned.length})</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {assigned.filter(filterFn).map(e => (
                            <div key={e.id} className="flex justify-between items-center p-3 bg-white border border-indigo-100 rounded-lg shadow-sm group hover:border-indigo-300 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                        {e.first_name[0]}{e.last_name[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">{e.first_name} {e.last_name}</div>
                                        <div className="text-xs text-slate-500">{e.employee_code}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAssign(e.id, false)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium text-sm"
                                >
                                    Çıkar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Unassigned Column */}
                <div className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col">
                    <h3 className="font-bold mb-3 text-slate-600">Diğer Personeller ({unassigned.length})</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {unassigned.filter(filterFn).map(e => (
                            <div key={e.id} className="flex justify-between items-center p-3 bg-slate-50 border border-transparent rounded-lg hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                        {e.first_name[0]}{e.last_name[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-600">{e.first_name} {e.last_name}</div>
                                        <div className="text-xs text-slate-400">{e.employee_code}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAssign(e.id, true)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium text-sm"
                                >
                                    Ekle
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Icons (Simple SVG Wrappers)
const SettingsIcon = () => <Settings size={20} className="text-slate-500" />;
const Settings = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
const ClockIcon = () => <Clock size={20} className="text-slate-500" />;
const CalendarIcon = () => <Calendar size={20} className="text-slate-500" />;
const UsersIcon = () => <Users size={20} className="text-slate-500" />;

import { createPortal } from 'react-dom';

const HolidayDetailModal = ({ range, onClose, onSave }) => {
    const [name, setName] = useState('Resmi Tatil');
    const [type, setType] = useState('FULL_DAY');

    // Global defaults
    const [defaultStart, setDefaultStart] = useState('09:00');
    const [defaultEnd, setDefaultEnd] = useState('13:00');

    // Generate date list from range
    const dates = useMemo(() => {
        const list = [];
        let current = moment(range.start);
        const end = moment(range.end);
        while (current.isSameOrBefore(end)) {
            list.push(current.format('YYYY-MM-DD'));
            current.add(1, 'day');
        }
        return list;
    }, [range]);

    // Per-day overrides: { '2026-01-01': { start: '09:00', end: '13:00' } }
    const [dailyOverrides, setDailyOverrides] = useState({});

    const handleOverrideChange = (date, field, value) => {
        setDailyOverrides(prev => ({
            ...prev,
            [date]: {
                ...prev[date],
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        const configs = dates.map(date => {
            const override = dailyOverrides[date] || {};
            const startTime = override.start || defaultStart;
            const endTime = override.end || defaultEnd;

            return {
                name,
                date, // Explicitly pass date
                type,
                start_time: type === 'HALF_DAY' ? startTime : null,
                end_time: type === 'HALF_DAY' ? endTime : null
            };
        });
        onSave(configs);
    };

    const isBulkHalfDay = type === 'HALF_DAY' && dates.length > 1;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4 animate-in fade-in zoom-in-95" style={{ zIndex: 10000 }}>
            <div className={`bg-white rounded-xl shadow-2xl p-6 w-full ${isBulkHalfDay ? 'max-w-2xl' : 'max-w-sm'} transition-all`}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Tatil Detayları</h3>
                    <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
                        {range.start} - {range.end} ({dates.length} Gün)
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tatil Adı</label>
                            <input
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none"
                                placeholder="Örn: Kurban Bayramı"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tür</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none bg-white"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="FULL_DAY">Tam Gün</option>
                                <option value="HALF_DAY">Yarım Gün / Saatlik</option>
                            </select>
                        </div>
                    </div>

                    {/* Single Day or Global Settings for Sync */}
                    {type === 'HALF_DAY' && !isBulkHalfDay && (
                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Başlangıç</label>
                                <input type="time" className="w-full border rounded px-2 py-1 bg-white" value={defaultStart} onChange={e => setDefaultStart(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Bitiş</label>
                                <input type="time" className="w-full border rounded px-2 py-1 bg-white" value={defaultEnd} onChange={e => setDefaultEnd(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Bulk Day List */}
                    {isBulkHalfDay && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="bg-slate-50 p-2 border-b flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Günlük Ayarlar</span>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] text-slate-400">Varsayılan:</span>
                                    <input type="time" className="text-xs border rounded px-1 py-0.5 w-16" value={defaultStart} onChange={e => setDefaultStart(e.target.value)} />
                                    <span className="text-slate-300">-</span>
                                    <input type="time" className="text-xs border rounded px-1 py-0.5 w-16" value={defaultEnd} onChange={e => setDefaultEnd(e.target.value)} />
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto bg-slate-50/30">
                                {dates.map(date => {
                                    const override = dailyOverrides[date] || {};
                                    const s = override.start || defaultStart;
                                    const e = override.end || defaultEnd;

                                    // Highlight if different from default
                                    const isModified = (override.start && override.start !== defaultStart) || (override.end && override.end !== defaultEnd);

                                    return (
                                        <div key={date} className={`flex items-center gap-3 p-2 border-b last:border-0 ${isModified ? 'bg-indigo-50/50' : 'hover:bg-white'}`}>
                                            <div className="w-24 text-sm font-medium text-slate-700">{date}</div>
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="time"
                                                    className={`border rounded px-2 py-1 text-sm w-full ${isModified ? 'border-indigo-300 bg-white' : 'border-slate-200 text-slate-500'}`}
                                                    value={s}
                                                    onChange={e => handleOverrideChange(date, 'start', e.target.value)}
                                                />
                                                <span className="text-slate-300">-</span>
                                                <input
                                                    type="time"
                                                    className={`border rounded px-2 py-1 text-sm w-full ${isModified ? 'border-indigo-300 bg-white' : 'border-slate-200 text-slate-500'}`}
                                                    value={e}
                                                    onChange={e => handleOverrideChange(date, 'end', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">İptal</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                        {dates.length} Gün İçin Kaydet
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const HolidayBuilderModal = ({ onClose, selectedHolidayIds, allHolidays, onUpdateSelection, onNewHolidayCreated }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const selectedDates = useMemo(() => {
        const dates = new Set();
        selectedHolidayIds.forEach(id => {
            const h = allHolidays.find(x => x.id === id);
            if (h) dates.add(h.date);
        });
        return dates;
    }, [selectedHolidayIds, allHolidays]);

    // Detail Modal State
    const [pendingRange, setPendingRange] = useState(null); // { start, end }

    const handleRangeSelect = (start, end) => {
        setPendingRange({ start, end });
    };

    const confirmHolidayCreation = async (holidayConfigs) => {
        // holidayConfigs is now an array of objects: [{ name, date, type, start_time, end_time }, ...]
        if (!holidayConfigs || holidayConfigs.length === 0) return;

        // Visual Feedback (could add loading state here if needed, but for now blocking interaction via modal)

        const createdHolidays = [];
        const createdIds = [];

        try {
            // 1. Create all holidays sequentially
            for (const config of holidayConfigs) {
                const payload = {
                    name: config.name,
                    date: config.date,
                    type: config.type,
                    start_time: config.start_time,
                    end_time: config.end_time,
                    category: 'OFFICIAL'
                };

                const res = await api.post('/core/public-holidays/', payload);
                createdHolidays.push(res.data);
                createdIds.push(res.data.id);
            }

            // 2. Batch Update UI (Critical: Do this AFTER all async work)

            // Allow parent to update global list (if onNewHolidayCreated supports batch, great, if not loop is safer here as it's synchronous state update)
            createdHolidays.forEach(h => onNewHolidayCreated(h));

            // Update local selection
            onUpdateSelection([...selectedHolidayIds, ...createdIds]);

            // Close detail modal
            setPendingRange(null);

        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
    };

    const handleRemoveDate = async (dateStr) => {
        // Find if there is a holiday on this date
        const holidayToRemove = allHolidays.find(h => h.date === dateStr);

        if (holidayToRemove) {
            if (window.confirm(`${dateStr} tarihindeki "${holidayToRemove.name}" tatilini silmek istediğinize emin misiniz?`)) {
                try {
                    await api.delete(`/core/public-holidays/${holidayToRemove.id}/`);

                    // Remove from parent list
                    const newHolidays = allHolidays.filter(h => h.id !== holidayToRemove.id);
                    // We need a way to propogate this up. 
                    // Since we don't have a direct 'onRemoveHoliday' prop, we can re-use onUpdateSelection for local
                    // BUT for the RED dots to go away, 'allHolidays' prop must change.
                    // Assuming 'onNewHolidayCreated' might be the wrong name for "refresh list".
                    // Let's check parent usage. If parent manages state, we need a callback.
                    // For now, let's assume we can trigger a refresh or we need to add a callback.
                    // Wait, 'onNewHolidayCreated' adds to list. checking parent...
                    // The parent WorkSchedules passes 'publicHolidays' and 'setPublicHolidays' via props?
                    // No, it handles it in 'handlePublicHolidaysChange' or similar?
                    // Actually, let's just use a new callback prop 'onHolidayDeleted' and add it to usage.
                    if (onHolidayDeleted) onHolidayDeleted(holidayToRemove.id);

                    // Also clear from local selection if it was just selected
                    const newIds = selectedHolidayIds.filter(id => id !== holidayToRemove.id);
                    onUpdateSelection(newIds);

                } catch (error) {
                    alert("Silme işlemi başarısız: " + error.message);
                }
            }
        } else {
            // If not in global list but in local selection (draft), just remove from selection
            // (Though usually drag select doesn't add to ID list until saved? Wait. 
            //  The builder works by creating them immediately in confirmHolidayCreation.
            //  So they should always be in allHolidays once created.)
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">

                {pendingRange && (
                    <HolidayDetailModal
                        range={pendingRange}
                        onClose={() => setPendingRange(null)}
                        onSave={confirmHolidayCreation}
                    />
                )}

                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Görsel Tatil Düzenleyici</h3>
                        <p className="text-sm text-slate-500">Tarihleri sürükleyerek seçin ve tatil detaylarını girin. Tıklayarak mevcutları kaldırabilirsiniz.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50">
                    <YearCalendar
                        year={year}
                        onYearChange={setYear}
                        holidays={new Set(allHolidays.map(h => h.date))} // Global list (Red)
                        selectedDates={selectedDates} // Selected for this calendar (Blue)
                        onRangeSelect={handleRangeSelect}
                        onDateClick={handleRemoveDate}
                    />
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
                    >
                        Tamamla
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RecalculationPromptModal = ({ calendarId, onClose }) => {
    const [step, setStep] = useState('PROMPT'); // PROMPT | SELECT_DATE | PROCESSING | SUCCESS
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7) + '-01'); // 1st of current month
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
    const [result, setResult] = useState(null);

    const handleRecalculate = async () => {
        setStep('PROCESSING');
        try {
            const res = await api.post(`/attendance/fiscal-calendars/${calendarId}/recalculate/`, {
                start_date: startDate,
                end_date: endDate
            });
            setResult(res.data);
            setStep('SUCCESS');
        } catch (error) {
            alert('Hata: ' + error.message);
            setStep('SELECT_DATE'); // Go back
        }
    };

    if (step === 'PROMPT') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                            <CheckCircle size={28} />
                        </div>
                        <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-2">Ayarlar Kaydedildi</h3>
                    <p className="text-slate-600 mb-6">
                        Yapılan değişikliklerin geçmiş kayıtlara yansıması için hesaplama işlemini tetiklemek ister misiniz?
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setStep('SELECT_DATE')}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Evet, Şimdi Hesapla
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                        >
                            Hayır, Sadece Kaydet
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'SELECT_DATE') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Hesaplama Aralığı Seçin</h3>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç Tarihi</label>
                            <input
                                type="date"
                                className="input-field w-full"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Bitiş Tarihi</label>
                            <input
                                type="date"
                                className="input-field w-full"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep('PROMPT')}
                            className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold hover:bg-slate-200"
                        >
                            Geri
                        </button>
                        <button
                            onClick={handleRecalculate}
                            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700"
                        >
                            Hesapla
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'PROCESSING') {
        return (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm text-center">
                    <div className="animate-spin text-indigo-600 mb-4 mx-auto w-8 h-8">
                        <RefreshCw size={32} />
                    </div>
                    <h3 className="font-bold text-slate-800">Hesaplanıyor...</h3>
                    <p className="text-sm text-slate-500 mt-2">Bu işlem personel sayısına göre biraz zaman alabilir.</p>
                </div>
            </div>
        );
    }

    if (step === 'SUCCESS' && result) {
        return (
            <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md text-center">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">İşlem Tamamlandı</h3>
                    <p className="text-slate-600 mb-6">
                        {result.message}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-900 transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default WorkSchedules;
