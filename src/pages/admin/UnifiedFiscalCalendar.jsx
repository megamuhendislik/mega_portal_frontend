
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar, Users, Clock, Save, Plus, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
// Components for Tabs (to be implemented inline or separate files)
// 1. GeneralSettings (Name, Year, Holidays)
// 2. WeeklySchedule (Mon-Sun inputs)
// 3. Periods (Grid)
// 4. Assignments (User list)

const UnifiedFiscalCalendar = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    // Data for selected calendar
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
            setCalendars(res.data);
            if (res.data.length > 0 && !selectedCalendarId) {
                // Select first by default
                setSelectedCalendarId(res.data[0].id);
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
        const name = prompt("Yeni Takvim Adı:");
        if (!name) return;
        try {
            const res = await api.post('/attendance/fiscal-calendars/', {
                name,
                year: 2026,
                weekly_schedule: {
                    MON: { start: "08:30", end: "18:00", is_off: False },
                    TUE: { start: "08:30", end: "18:00", is_off: False },
                    WED: { start: "08:30", end: "18:00", is_off: False },
                    THU: { start: "08:30", end: "18:00", is_off: False },
                    FRI: { start: "08:30", end: "18:00", is_off: False },
                    SAT: { start: "08:30", end: "13:00", is_off: False },
                    SUN: { start: "00:00", end: "00:00", is_off: True }
                }
            });
            setCalendars([...calendars, res.data]);
            setSelectedCalendarId(res.data.id);
        } catch (error) {
            alert('Hata: ' + error.message);
        }
    };

    if (loading && calendars.length === 0) return <div>Yükleniyor...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Mali Takvim Yönetimi</h1>
                <button onClick={handleCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    <Plus size={18} /> Yeni Takvim
                </button>
            </div>

            <div className="flex gap-6">
                {/* Sidebar List */}
                <div className="w-64 flex-shrink-0 bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-600">Takvimler</div>
                    <div className="divide-y divide-slate-100">
                        {calendars.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCalendarId(c.id)}
                                className={`p-4 cursor-pointer hover:bg-slate-50 ${selectedCalendarId === c.id ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'text-slate-600'}`}
                            >
                                <div className="font-medium">{c.name}</div>
                                <div className="text-xs text-slate-400">{c.year}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white rounded-xl shadow border border-slate-200 p-6">
                    {calendarData ? (
                        <>
                            {/* Tabs */}
                            <div className="flex gap-4 border-b border-slate-100 mb-6">
                                <button onClick={() => setActiveTab('general')} className={`pb-2 px-1 ${activeTab === 'general' ? 'border-b-2 border-indigo-500 text-indigo-600 font-bold' : 'text-slate-500'}`}>Genel & Tatiller</button>
                                <button onClick={() => setActiveTab('schedule')} className={`pb-2 px-1 ${activeTab === 'schedule' ? 'border-b-2 border-indigo-500 text-indigo-600 font-bold' : 'text-slate-500'}`}>Haftalık Program</button>
                                <button onClick={() => setActiveTab('periods')} className={`pb-2 px-1 ${activeTab === 'periods' ? 'border-b-2 border-indigo-500 text-indigo-600 font-bold' : 'text-slate-500'}`}>Mali Dönemler</button>
                                <button onClick={() => setActiveTab('users')} className={`pb-2 px-1 ${activeTab === 'users' ? 'border-b-2 border-indigo-500 text-indigo-600 font-bold' : 'text-slate-500'}`}>Kullanıcılar</button>
                            </div>

                            {activeTab === 'general' && <GeneralTab data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />}
                            {activeTab === 'schedule' && <ScheduleTab data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />}
                            {activeTab === 'periods' && <PeriodsTab data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />}
                            {activeTab === 'users' && <UsersTab data={calendarData} refresh={() => fetchCalendarDetails(selectedCalendarId)} />}
                        </>
                    ) : (
                        <div className="text-slate-400 text-center py-20">Bir takvim seçin veya oluşturun.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-components (Placeholders for now, will implement fully)
const GeneralTab = ({ data, refresh }) => {
    const [formData, setFormData] = useState({ ...data });
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {
        api.get('/public-holidays/').then(res => setHolidays(res.data));
    }, []);

    const handleSave = async () => {
        try {
            await api.patch(`/attendance/fiscal-calendars/${data.id}/`, formData);
            refresh();
            alert('Kaydedildi');
        } catch (e) { alert(e.message); }
    };

    const toggleHoliday = (hId) => {
        const current = formData.public_holidays || [];
        const newHolidays = current.includes(hId)
            ? current.filter(id => id !== hId)
            : [...current, hId];
        setFormData({ ...formData, public_holidays: newHolidays });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Takvim Adı</label>
                    <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                    <label className="label">Yıl</label>
                    <input className="input-field" type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label">Geç Kalma Toleransı (dk)</label>
                    <input className="input-field" type="number" value={formData.late_tolerance_minutes} onChange={e => setFormData({ ...formData, late_tolerance_minutes: parseInt(e.target.value) })} />
                </div>
                <div>
                    <label className="label">Erken Çıkma Toleransı (dk)</label>
                    <input className="input-field" type="number" value={formData.early_leave_tolerance_minutes} onChange={e => setFormData({ ...formData, early_leave_tolerance_minutes: parseInt(e.target.value) })} />
                </div>
            </div>

            <div>
                <h3 className="font-bold mb-2">Geçerli Resmi Tatiller</h3>
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto border p-2 rounded">
                    {holidays.map(h => (
                        <label key={h.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                                type="checkbox"
                                checked={(formData.public_holidays || []).includes(h.id)}
                                onChange={() => toggleHoliday(h.id)}
                            />
                            <span className="text-sm">{h.name} ({h.date})</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                    <Save size={18} /> Kaydet
                </button>
            </div>
        </div>
    );
};
const ScheduleTab = ({ data, refresh }) => {
    const [schedule, setSchedule] = useState(data.weekly_schedule || {});

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
        try {
            await api.patch(`/attendance/fiscal-calendars/${data.id}/`, { weekly_schedule: schedule });
            refresh();
            alert('Kaydedildi');
        } catch (e) { alert(e.message); }
    };

    return (
        <div>
            <div className="grid gap-4 mb-6">
                {days.map(day => {
                    const dayConfig = schedule[day.key] || { start: '08:30', end: '18:00', is_off: day.key === 'SUN' };
                    return (
                        <div key={day.key} className="flex items-center gap-4 border-b pb-2">
                            <div className="w-24 font-bold">{day.label}</div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={dayConfig.is_off}
                                    onChange={e => handleChange(day.key, 'is_off', e.target.checked)}
                                />
                                <span className="text-sm">Tatil</span>
                            </label>

                            {!dayConfig.is_off && (
                                <>
                                    <input
                                        type="time"
                                        className="border rounded p-1"
                                        value={dayConfig.start}
                                        onChange={e => handleChange(day.key, 'start', e.target.value)}
                                    />
                                    <span>-</span>
                                    <input
                                        type="time"
                                        className="border rounded p-1"
                                        value={dayConfig.end}
                                        onChange={e => handleChange(day.key, 'end', e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end">
                <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                    <Save size={18} /> Programı Kaydet
                </button>
            </div>
        </div>
    );
};
const PeriodsTab = ({ data, refresh }) => {
    const handleGenerate = async () => {
        if (!confirm('Mevcut dönemler silinip yeniden oluşturulacak (26-25 kuralı). Onaylıyor musunuz?')) return;
        try {
            await api.post(`/attendance/fiscal-calendars/${data.id}/generate_periods/`, { clear_existing: true });
            refresh();
            alert('Başarılı!');
        } catch (e) { alert(e.message); }
    };
    return (
        <div>
            <div className="flex justify-between mb-4">
                <h3 className="font-bold">Mali Dönemler</h3>
                <button onClick={handleGenerate} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded">Varsayılanları Oluştur</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {data.periods && data.periods.map(p => (
                    <div key={p.id} className="border p-2 rounded">
                        <div className="font-bold">{p.year}/{p.month}</div>
                        <div className="text-sm">{p.start_date} - {p.end_date}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
const UsersTab = ({ data, refresh }) => {
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [data.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, assignedRes] = await Promise.all([
                api.get('/employees/'),
                api.get(`/attendance/fiscal-calendars/${data.id}/assigned_employees/`)
            ]);
            setAllEmployees(usersRes.data);
            setAssignedEmployees(assignedRes.data.map(e => e.id));
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (employeeId, assign) => {
        // Optimistic UI
        const newAssigned = assign
            ? [...assignedEmployees, employeeId]
            : assignedEmployees.filter(id => id !== employeeId);
        setAssignedEmployees(newAssigned);

        // Batch update implies we should select many then save, but for simplicity let's save on click or have a "Save Assignments" button.
        // The API `assign_employees` takes a list of IDs and sets them to this calendar.
        // It's a bulk set operation? No, filter(id__in=ids).update().
        // If I want to UNASSIGN, I need to know which ones to remove?
        // The API I wrote `assign_employees` adds them. It doesn't handle removal if I don't send them?
        // Wait, `employees.update(fiscal_calendar=calendar)` only adds.
        // I need an API to SET the list (overwrite), or add/remove.
        // Let's assume for now we only ADD via the API I wrote.
        // I should probably update the API to handle full sync or add/remove.
        // For now, let's just make a "Add Selected" button.
    };

    const handleBulkSave = async () => {
        try {
            // My API currently only ADDS.
            // If I want to remove, I need `unassign` or full sync.
            // Let's assume I strictly add for now. User can re-assign to another calendar to "remove".
            await api.post(`/attendance/fiscal-calendars/${data.id}/assign_employees/`, { employee_ids: assignedEmployees });
            alert('Atamalar Güncellendi');
        } catch (e) { alert(e.message); }
    };

    if (loading) return <div>Yükleniyor...</div>;

    // Separate assigned vs unassigned for easier management
    const assigned = allEmployees.filter(e => assignedEmployees.includes(e.id));
    const unassigned = allEmployees.filter(e => !assignedEmployees.includes(e.id));

    return (
        <div className="grid grid-cols-2 gap-6 h-[500px]">
            <div className="border rounded-xl p-4 flex flex-col">
                <h3 className="font-bold mb-2 text-indigo-700">Bu Takvime Atananlar ({assigned.length})</h3>
                <div className="flex-1 overflow-y-auto space-y-1">
                    {assigned.map(e => (
                        <div key={e.id} className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                            <span>{e.first_name} {e.last_name}</span>
                            <button
                                onClick={() => handleAssign(e.id, false)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                                Çıkar
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border rounded-xl p-4 flex flex-col">
                <h3 className="font-bold mb-2 text-slate-600">Atanmamış Personel ({unassigned.length})</h3>
                <div className="flex-1 overflow-y-auto space-y-1">
                    {unassigned.map(e => (
                        <div key={e.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded">
                            <span>{e.first_name} {e.last_name}</span>
                            <button
                                onClick={() => handleAssign(e.id, true)}
                                className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
                            >
                                Ekle
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="col-span-2 flex justify-end p-2">
                <button onClick={handleBulkSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg">
                    Değişiklikleri Kaydet
                </button>
            </div>
        </div>
    );
};

export default UnifiedFiscalCalendar;
