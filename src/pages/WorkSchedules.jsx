import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Users, Clock, Save, Plus, Trash2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const WorkSchedules = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [calendarData, setCalendarData] = useState(null);

    useEffect(() => {
        fetchCalendars();
    }, []);

    useEffect(() => {
        if (selectedCalendarId) {
            fetchCalendarDetails(selectedCalendarId);
        } else {
            setCalendarData(null);
        }
    }, [selectedCalendarId]);

    const fetchCalendars = async () => {
        setLoading(true);
        try {
            const res = await api.get('/attendance/fiscal-calendars/');
            const data = res.data.results || res.data; // Handle pagination
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
            const res = await api.get(`/attendance/fiscal-calendars/${id}/`);
            setCalendarData(res.data);
        } catch (error) {
            console.error("Error details:", error);
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
                    {calendarData ? (
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Section 1: Top Row - General & Schedule */}
                            <div className="grid grid-cols-12 gap-6">
                                {/* General Settings */}
                                <div className="col-span-12 xl:col-span-4 space-y-6">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <SettingsIcon /> Genel Ayarlar
                                        </h3>
                                        <GeneralSettingsForm data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />
                                    </div>
                                </div>

                                {/* Weekly Schedule */}
                                <div className="col-span-12 xl:col-span-8">
                                    <div className="bg-white border border-slate-200 p-4 rounded-xl h-full shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <ClockIcon /> Haftalık Çalışma Programı
                                        </h3>
                                        <ScheduleSettingsForm data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 2: Fiscal Periods */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <CalendarIcon /> Mali Dönemler (Bordro Ayları)
                                </h3>
                                <PeriodsSettingsForm data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />
                            </div>

                            <hr className="border-slate-100" />

                            {/* Section 3: Users */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <UsersIcon /> Personel Atamaları
                                </h3>
                                <UsersSettingsForm data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />
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
        </div>
    );
};

// --- Sub-Components ---

const GeneralSettingsForm = ({ data, refresh }) => {
    const [formData, setFormData] = useState({ ...data });
    const [holidays, setHolidays] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/public-holidays/').then(res => {
            const data = res.data.results || res.data;
            setHolidays(data);
        });
    }, []);

    // Sync state when data changes (e.g. switch calendar)
    useEffect(() => { setFormData({ ...data }); }, [data]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/attendance/fiscal-calendars/${data.id}/`, formData);
            refresh();
            // alert('Kaydedildi'); // Remove disruptive alerts? Maybe toast.
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const toggleHoliday = (hId) => {
        const current = formData.public_holidays || [];
        const newHolidays = current.includes(hId)
            ? current.filter(id => id !== hId)
            : [...current, hId];
        setFormData({ ...formData, public_holidays: newHolidays });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Takvim Adı</label>
                <input className="input-field w-full bg-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Yıl</label>
                    <input className="input-field w-full bg-white" type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                </div>
                <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-white border rounded hover:bg-slate-50 w-full h-[42px]">
                        <input type="checkbox" checked={formData.is_default} onChange={e => setFormData({ ...formData, is_default: e.target.checked })} />
                        <span className="text-sm font-medium">Varsayılan</span>
                    </label>
                </div>
            </div>


            {/* Breaks & Lunch Config */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Mola & Yemek Ayarları</label>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Öğle Başlangıç</label>
                        <input className="input-field w-full bg-white text-sm" type="time" value={formData.lunch_start} onChange={e => setFormData({ ...formData, lunch_start: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Öğle Bitiş</label>
                        <input className="input-field w-full bg-white text-sm" type="time" value={formData.lunch_end} onChange={e => setFormData({ ...formData, lunch_end: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Günlük Mola (Dk)</label>
                        <input className="input-field w-full bg-white text-sm" type="number" value={formData.daily_break_allowance} onChange={e => setFormData({ ...formData, daily_break_allowance: parseInt(e.target.value) })} />
                    </div>
                </div>
            </div>

            {/* Tolerances Config */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Tolerans & Limitler</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Geç Kalma (dk)</label>
                        <input className="input-field w-full bg-white text-sm" type="number" value={formData.late_tolerance_minutes} onChange={e => setFormData({ ...formData, late_tolerance_minutes: parseInt(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Erken Çıkma (dk)</label>
                        <input className="input-field w-full bg-white text-sm" type="number" value={formData.early_leave_tolerance_minutes} onChange={e => setFormData({ ...formData, early_leave_tolerance_minutes: parseInt(e.target.value) })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Servis Toleransı (dk)</label>
                        <input className="input-field w-full bg-white text-sm" type="number" value={formData.service_tolerance_minutes} onChange={e => setFormData({ ...formData, service_tolerance_minutes: parseInt(e.target.value) })} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Min. Mesai (dk)</label>
                        <input className="input-field w-full bg-white text-sm" type="number" value={formData.minimum_overtime_minutes} onChange={e => setFormData({ ...formData, minimum_overtime_minutes: parseInt(e.target.value) })} />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Resmi Tatiller</label>
                <div className="bg-white border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                    {holidays.map(h => (
                        <label key={h.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded border border-transparent hover:border-slate-100 transition-colors">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-indigo-600 rounded"
                                checked={(formData.public_holidays || []).includes(h.id)}
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

            <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
        </div >
    );
};

const ScheduleSettingsForm = ({ data, refresh }) => {
    const [schedule, setSchedule] = useState(data.weekly_schedule || {});
    const [saving, setSaving] = useState(false);

    useEffect(() => { setSchedule(data.weekly_schedule || {}); }, [data]);

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
        setSchedule(prev => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/attendance/fiscal-calendars/${data.id}/`, { weekly_schedule: schedule });
            refresh();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-3">
                {days.map(day => {
                    const dayConfig = schedule[day.key] || { start: '08:30', end: '18:00', is_off: day.key === 'SUN' };
                    return (
                        <div key={day.key} className={`flex items-center gap-4 p-3 rounded-lg border ${dayConfig.is_off ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
                            <div className="w-24 font-bold text-slate-700">{day.label}</div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${dayConfig.is_off ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${dayConfig.is_off ? 'translate-x-4' : ''}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={dayConfig.is_off}
                                    onChange={e => handleChange(day.key, 'is_off', e.target.checked)}
                                />
                                <span className="text-sm font-medium text-slate-600">{dayConfig.is_off ? 'Tatil Günü' : 'Çalışma Günü'}</span>
                            </label>

                            {!dayConfig.is_off && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <Clock size={16} className="text-slate-400" />
                                    <input
                                        type="time"
                                        className="border rounded px-2 py-1 text-sm bg-slate-50 focus:bg-white focus:ring-2 ring-indigo-100 outline-none"
                                        value={dayConfig.start}
                                        onChange={e => handleChange(day.key, 'start', e.target.value)}
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="time"
                                        className="border rounded px-2 py-1 text-sm bg-slate-50 focus:bg-white focus:ring-2 ring-indigo-100 outline-none"
                                        value={dayConfig.end}
                                        onChange={e => handleChange(day.key, 'end', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={saving} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
                    <Save size={18} /> {saving ? 'Kaydediliyor...' : 'Programı Kaydet'}
                </button>
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

const UsersSettingsForm = ({ data, refresh }) => {
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadData(); }, [data.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, assignedRes] = await Promise.all([
                api.get('/employees/?page_size=1000'), // Get all (or handle true pagination later)
                api.get(`/attendance/fiscal-calendars/${data.id}/assigned_employees/`)
            ]);
            const usersData = usersRes.data.results || usersRes.data;
            setAllEmployees(usersData);
            setAssignedEmployees(assignedRes.data.map(e => e.id));
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = (employeeId, assign) => {
        const newAssigned = assign
            ? [...assignedEmployees, employeeId]
            : assignedEmployees.filter(id => id !== employeeId);
        setAssignedEmployees(newAssigned);
    };

    const handleBulkSave = async () => {
        setSaving(true);
        try {
            await api.post(`/attendance/fiscal-calendars/${data.id}/assign_employees/`, { employee_ids: assignedEmployees });
            alert('Atamalar başarıyla güncellendi.');
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="py-8 text-center text-slate-400">Kullanıcı listesi yükleniyor...</div>;

    const assigned = allEmployees.filter(e => assignedEmployees.includes(e.id));
    const unassigned = allEmployees.filter(e => !assignedEmployees.includes(e.id));

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
                <button onClick={handleBulkSave} disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {saving ? 'Kaydediliyor...' : 'Atamaları Kaydet'}
                </button>
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

export default WorkSchedules;
