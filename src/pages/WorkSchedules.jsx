import React, { useState, useEffect, useMemo, useRef } from 'react';
import moment from 'moment';
import api from '../services/api';
import { createPortal } from 'react-dom';
import {
    Calendar, Users, Clock, Save, Plus, Trash2, CheckCircle,
    RefreshCw, AlertTriangle, X, Loader2, Paintbrush, Layers
} from 'lucide-react';
import YearCalendar from '../components/YearCalendar';
import FiscalCalendarView from '../components/FiscalCalendarView';
import TemplateEditor from '../components/TemplateEditor';

const TABS = [
    { key: 'templates', label: 'Şablonlar', icon: Layers },
    { key: 'calendar', label: 'Yıllık Takvim', icon: Paintbrush },
    { key: 'overrides', label: 'Tatiller', icon: Clock },
    { key: 'periods', label: 'Dönemler & Ayarlar', icon: Calendar },
    { key: 'users', label: 'Personel', icon: Users },
];

const WorkSchedules = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('templates');

    // Calendar State
    const [draftData, setDraftData] = useState(null);
    const [executionLogs, setExecutionLogs] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [saving, setSaving] = useState(false);

    // Template State
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [savingTemplate, setSavingTemplate] = useState(false);

    // Day Assignments State
    const [dayAssignments, setDayAssignments] = useState({});
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchCalendars();
    }, []);

    useEffect(() => {
        if (selectedCalendarId) {
            fetchCalendarDetails(selectedCalendarId);
            fetchTemplates(selectedCalendarId);
        } else {
            setDraftData(null);
            setTemplates([]);
            setDayAssignments({});
        }
    }, [selectedCalendarId]);

    useEffect(() => {
        if (selectedCalendarId) {
            fetchDayAssignments(selectedCalendarId, calendarYear);
        }
    }, [selectedCalendarId, calendarYear]);

    // --- API Functions ---

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

    const fetchTemplates = async (calendarId) => {
        try {
            const res = await api.get(`/attendance/schedule-templates/?calendar=${calendarId}`);
            const data = res.data.results || res.data;
            setTemplates(data);
            if (data.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(data[0].id);
                setEditingTemplate({ ...data[0] });
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
        }
    };

    const fetchDayAssignments = async (calendarId, year) => {
        try {
            const res = await api.get(`/attendance/day-assignments/?calendar=${calendarId}&year=${year}`);
            const data = res.data.results || res.data;
            const map = {};
            data.forEach(a => {
                map[a.date] = {
                    id: a.id,
                    template_id: a.template,
                    template_name: a.template_name,
                    template_color: a.template_color,
                };
            });
            setDayAssignments(map);
        } catch (error) {
            console.error("Error fetching day assignments:", error);
        }
    };

    // --- Template CRUD ---

    const handleSelectTemplate = (id) => {
        setSelectedTemplateId(id);
        const tmpl = templates.find(t => t.id === id);
        if (tmpl) setEditingTemplate({ ...tmpl });
    };

    const handleCreateTemplate = async () => {
        const name = prompt("Yeni Şablon Adı (Örn: Yaz Mesaisi):");
        if (!name) return;
        try {
            const res = await api.post('/attendance/schedule-templates/', {
                calendar: selectedCalendarId,
                name,
                color: '#10b981',
                is_default: false,
                weekly_schedule: {
                    MON: { start: "08:00", end: "18:00", is_off: false },
                    TUE: { start: "08:00", end: "18:00", is_off: false },
                    WED: { start: "08:00", end: "18:00", is_off: false },
                    THU: { start: "08:00", end: "18:00", is_off: false },
                    FRI: { start: "08:00", end: "18:00", is_off: false },
                    SAT: { start: "08:00", end: "18:00", is_off: true },
                    SUN: { start: "08:00", end: "18:00", is_off: true }
                },
                lunch_start: "12:30",
                lunch_end: "13:30",
                daily_break_allowance: 30,
                late_tolerance_minutes: 15,
                service_tolerance_minutes: 0,
                minimum_overtime_minutes: 15,
            });
            const newTemplates = [...templates, res.data];
            setTemplates(newTemplates);
            setSelectedTemplateId(res.data.id);
            setEditingTemplate({ ...res.data });
        } catch (error) {
            alert('Hata: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleSaveTemplate = async (template) => {
        setSavingTemplate(true);
        try {
            const res = await api.patch(`/attendance/schedule-templates/${template.id}/`, template);
            const updated = templates.map(t => t.id === template.id ? res.data : t);
            setTemplates(updated);
            setEditingTemplate({ ...res.data });
        } catch (error) {
            alert('Kaydetme hatası: ' + (error.response?.data?.detail || error.message));
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('Bu şablonu silmek istediğinize emin misiniz?\nBu şablona atanmış günler varsayılana dönecektir.')) return;
        try {
            await api.delete(`/attendance/schedule-templates/${id}/`);
            const updated = templates.filter(t => t.id !== id);
            setTemplates(updated);
            if (selectedTemplateId === id) {
                const first = updated[0];
                setSelectedTemplateId(first?.id || null);
                setEditingTemplate(first ? { ...first } : null);
            }
            // Refresh day assignments (deleted template's assignments are cascade deleted)
            fetchDayAssignments(selectedCalendarId, calendarYear);
        } catch (error) {
            alert('Silme hatası: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --- Day Assignment (Paint) ---

    const handlePaintDay = async (dateStr, templateId) => {
        if (!selectedCalendarId) return;

        if (templateId === null) {
            // Eraser: remove assignment
            const existing = dayAssignments[dateStr];
            if (existing?.id) {
                try {
                    await api.delete(`/attendance/day-assignments/${existing.id}/`);
                    setDayAssignments(prev => {
                        const updated = { ...prev };
                        delete updated[dateStr];
                        return updated;
                    });
                } catch (error) {
                    console.error("Delete assignment error:", error);
                    alert('Silme hatası: ' + (error.response?.data?.detail || error.message));
                }
            }
        } else {
            // Assign template to day
            try {
                const existing = dayAssignments[dateStr];
                let res;
                if (existing?.id) {
                    res = await api.patch(`/attendance/day-assignments/${existing.id}/`, {
                        template: templateId
                    });
                } else {
                    res = await api.post('/attendance/day-assignments/', {
                        calendar: selectedCalendarId,
                        date: dateStr,
                        template: templateId
                    });
                }
                const tmpl = templates.find(t => t.id === templateId);
                setDayAssignments(prev => ({
                    ...prev,
                    [dateStr]: {
                        id: res.data.id,
                        template_id: templateId,
                        template_name: tmpl?.name || '',
                        template_color: tmpl?.color || '#3b82f6',
                    }
                }));
            } catch (error) {
                console.error("Assign error:", error);
                alert('Atama hatası: ' + (error.response?.data?.detail || error.message));
            }
        }
    };

    const handleBulkPaint = async (startDate, endDate, templateId) => {
        if (!selectedCalendarId) return;
        try {
            if (templateId === null) {
                // Bulk remove
                await api.post('/attendance/day-assignments/bulk_remove/', {
                    calendar_id: selectedCalendarId,
                    start_date: startDate,
                    end_date: endDate,
                });
            } else {
                // Bulk assign
                await api.post('/attendance/day-assignments/bulk_assign/', {
                    calendar_id: selectedCalendarId,
                    template_id: templateId,
                    start_date: startDate,
                    end_date: endDate,
                });
            }
            // Refresh assignments
            await fetchDayAssignments(selectedCalendarId, calendarYear);
        } catch (error) {
            alert('Toplu atama hatası: ' + (error.response?.data?.detail || error.message));
        }
    };

    // --- Async Recalculation State ---
    const [recalcProgress, setRecalcProgress] = useState(null); // { progress_id, status, progress_percent, ... }
    const pollingRef = useRef(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const startPolling = (calendarId, progressId) => {
        if (pollingRef.current) clearInterval(pollingRef.current);

        pollingRef.current = setInterval(async () => {
            try {
                const res = await api.get(`/attendance/fiscal-calendars/${calendarId}/recalculate_status/?progress_id=${progressId}`);
                const data = res.data;
                setRecalcProgress(data);

                if (data.logs && data.logs.length > 0) {
                    setExecutionLogs(data.logs);
                }

                if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                    setSaving(false);
                    fetchCalendarDetails(calendarId);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000); // Poll every 2 seconds
    };

    // --- Global Save ---

    const handleGlobalSave = async () => {
        if (!draftData) return;
        setSaving(true);
        setExecutionLogs([]);
        setRecalcProgress(null);

        try {
            // Step 1: Save calendar settings
            await api.patch(`/attendance/fiscal-calendars/${draftData.id}/`, draftData);

            // Step 2: Assign employees
            await api.post(`/attendance/fiscal-calendars/${draftData.id}/assign_employees/`, {
                employee_ids: assignments
            });

            // Step 3: Queue async recalculation
            const now = new Date();
            const y = now.getFullYear();
            const startOfYear = `${y}-01-01`;
            const endOfYear = `${y}-12-31`;

            const res = await api.post(`/attendance/fiscal-calendars/${draftData.id}/recalculate/`, {
                start_date: startOfYear,
                end_date: endOfYear
            });

            if (res.data.status === 'QUEUED' && res.data.progress_id) {
                // Start polling for progress
                setRecalcProgress({
                    progress_id: res.data.progress_id,
                    status: 'PENDING',
                    progress_percent: 0,
                    total_employees: res.data.employee_count || 0,
                    processed_employees: 0,
                });
                setExecutionLogs([`Hesaplama kuyruğa alındı. ${res.data.employee_count} personel işlenecek...`]);
                startPolling(draftData.id, res.data.progress_id);
            } else if (res.data.status === 'NO_EMPLOYEES') {
                setExecutionLogs(["Bu takvime bağlı aktif personel bulunamadı."]);
                setSaving(false);
            } else {
                // Fallback for unexpected response
                setExecutionLogs(res.data.logs || ["İşlem tamamlandı."]);
                setSaving(false);
                fetchCalendarDetails(draftData.id);
            }
        } catch (error) {
            setSaving(false);
            alert("Hata: " + error.message);
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
                year,
                weekly_schedule: {
                    MON: { start: "08:00", end: "18:00", is_off: false },
                    TUE: { start: "08:00", end: "18:00", is_off: false },
                    WED: { start: "08:00", end: "18:00", is_off: false },
                    THU: { start: "08:00", end: "18:00", is_off: false },
                    FRI: { start: "08:00", end: "18:00", is_off: false },
                    SAT: { start: "08:00", end: "18:00", is_off: true },
                    SUN: { start: "08:00", end: "18:00", is_off: true }
                },
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

    // --- Derived ---

    const defaultTemplate = templates.find(t => t.is_default);
    const defaultTemplateColor = defaultTemplate?.color || '#3b82f6';

    if (loading && calendars.length === 0) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    return (
        <div className="p-3 md:p-6 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800">Mali Takvim Yönetimi</h1>
                    <p className="text-slate-500 text-sm md:text-base">Çalışma saatleri, şablonlar ve tatilleri tek ekrandan yönetin.</p>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                    <Plus size={18} /> Yeni Takvim
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-72 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-600 flex items-center gap-2">
                        <Calendar size={18} /> Takvim Listesi
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
                        <>
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 bg-indigo-50 p-4 border-b border-indigo-100">
                                <div>
                                    <h2 className="text-lg font-bold text-indigo-900">{draftData.name} ({draftData.year})</h2>
                                    <p className="text-sm text-indigo-700">Şablonlar, takvim boyama ve personel atamalarını yönetin.</p>
                                </div>
                                <button onClick={handleGlobalSave} disabled={saving}
                                    className="bg-indigo-600 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg font-bold text-xs md:text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
                                    <Save size={20} />
                                    {saving ? 'Kaydediliyor...' : 'Kaydet & Hesapla'}
                                </button>
                            </div>

                            {/* Tab Navigation */}
                            <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4">
                                {TABS.map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-1.5 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                                                activeTab === tab.key
                                                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <Icon size={16} /> {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-3 md:p-6">
                                {/* Tab: Şablonlar */}
                                {activeTab === 'templates' && (
                                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
                                        {/* Template List */}
                                        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                                            <button onClick={handleCreateTemplate}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                                                <Plus size={16} /> Yeni Şablon
                                            </button>

                                            {templates.map(t => (
                                                <div
                                                    key={t.id}
                                                    onClick={() => handleSelectTemplate(t.id)}
                                                    className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                                                        selectedTemplateId === t.id
                                                            ? 'shadow-md scale-[1.02]'
                                                            : 'border-transparent hover:border-slate-200 bg-slate-50'
                                                    }`}
                                                    style={{
                                                        borderColor: selectedTemplateId === t.id ? t.color : undefined,
                                                        backgroundColor: selectedTemplateId === t.id ? t.color + '10' : undefined,
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                                                        <span className="font-medium text-sm text-slate-800 truncate">{t.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 ml-6">
                                                        {t.is_default && (
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Varsayılan</span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400">
                                                            {Object.values(t.weekly_schedule || {}).filter(d => !d.is_off).length} iş günü
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}

                                            {templates.length === 0 && (
                                                <div className="text-center py-8 text-slate-400">
                                                    <Layers size={32} className="mx-auto mb-2 opacity-30" />
                                                    <p className="text-xs">Henüz şablon yok</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Template Editor */}
                                        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-5 overflow-y-auto">
                                            <TemplateEditor
                                                template={editingTemplate}
                                                onChange={setEditingTemplate}
                                                onSave={handleSaveTemplate}
                                                onDelete={handleDeleteTemplate}
                                                saving={savingTemplate}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Yıllık Takvim (Paint Mode) */}
                                {activeTab === 'calendar' && (
                                    <div>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Bir şablon fırçası seçin ve takvimde günlere tıklayarak atayın.
                                            Toplu atama için tarih aralığı kullanın.
                                        </p>
                                        <FiscalCalendarView
                                            calendarId={selectedCalendarId}
                                            paintMode={true}
                                            templates={templates}
                                            dayAssignments={dayAssignments}
                                            defaultTemplateColor={defaultTemplateColor}
                                            onPaintDay={handlePaintDay}
                                            onBulkPaint={handleBulkPaint}
                                            year={calendarYear}
                                            onYearChange={setCalendarYear}
                                        />
                                    </div>
                                )}

                                {/* Tab: Tatiller */}
                                {activeTab === 'overrides' && (
                                    <div>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Belirli günler için tatil veya özel mesai saatleri tanımlayın.
                                            Bu ayarlar şablonların üstüne yazılır.
                                        </p>
                                        <FiscalCalendarView calendarId={draftData.id} />

                                        {/* Resmi Tatiller Listesi */}
                                        <div className="mt-6">
                                            <HolidaysList publicHolidayIds={draftData.public_holidays || []} />
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Dönemler & Ayarlar */}
                                {activeTab === 'periods' && (
                                    <div className="space-y-8">
                                        {/* General Settings */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <SettingsIcon /> Genel Ayarlar
                                            </h3>
                                            <GeneralSettingsForm
                                                data={draftData}
                                                onChange={(newData) => setDraftData(newData)}
                                            />
                                        </div>

                                        <hr className="border-slate-100" />

                                        {/* Fiscal Periods */}
                                        <div>
                                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <CalendarIcon /> Mali Dönemler (Bordro Ayları)
                                            </h3>
                                            <PeriodsSettingsForm data={draftData} refresh={() => fetchCalendarDetails(draftData.id)} />
                                        </div>
                                    </div>
                                )}

                                {/* Tab: Personel */}
                                {activeTab === 'users' && (
                                    <div>
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <UsersIcon /> Personel Atamaları
                                        </h3>
                                        <UsersSettingsForm
                                            assignedIds={assignments}
                                            onChange={setAssignments}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
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
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                                        {recalcProgress?.status === 'RUNNING' ? 'Hesaplama Devam Ediyor...' : 'Ayarlar Kaydediliyor...'}
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {recalcProgress?.status === 'RUNNING'
                                            ? `${recalcProgress.processed_employees || 0} / ${recalcProgress.total_employees || '?'} personel`
                                            : 'Hesaplama kuyruğa alınıyor...'}
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>İlerleme</span>
                                        <span className="font-mono font-bold text-indigo-600">
                                            %{recalcProgress?.progress_percent || 0}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(recalcProgress?.progress_percent || 0, 2)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Live Logs */}
                                {executionLogs.length > 0 && (
                                    <div className="bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        <div className="font-mono text-xs text-slate-400 space-y-0.5">
                                            {executionLogs.slice(-15).map((log, i) => (
                                                <div key={i} className={log.includes('HATA') ? 'text-red-400' : ''}>
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-slate-400 text-center mt-4">
                                    Bu pencereyi kapatabilirsiniz. Hesaplama arka planda devam eder.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        {recalcProgress?.status === 'FAILED' ? (
                                            <AlertTriangle className="text-red-500" size={24} />
                                        ) : (
                                            <CheckCircle className="text-emerald-500" size={24} />
                                        )}
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">
                                                {recalcProgress?.status === 'FAILED' ? 'Hesaplama Başarısız' : 'İşlem Tamamlandı'}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {recalcProgress?.status === 'FAILED'
                                                    ? 'Hata detayları aşağıdadır.'
                                                    : `${recalcProgress?.processed_employees || '?'} personel, ${recalcProgress?.processed_days || '?'} gün güncellendi.`}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setExecutionLogs([]); setRecalcProgress(null); }} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
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
                                    <button onClick={() => { setExecutionLogs([]); setRecalcProgress(null); }}
                                        className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors">
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
    const handleChange = (field, value) => {
        onChange({ ...data, [field]: value });
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
    const filterFn = (e) => (e.first_name + ' ' + e.last_name + ' ' + e.employee_code).toLowerCase().includes(searchTerm.toLowerCase());

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <input placeholder="Personel ara..." className="input-field max-w-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[300px] md:h-[500px]">
                <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-4 flex flex-col">
                    <h3 className="font-bold mb-3 text-indigo-700 flex justify-between items-center">
                        <span>Bu Takvime Dahil ({assigned.length})</span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {assigned.filter(filterFn).map(e => (
                            <div key={e.id} className="flex justify-between items-center p-3 bg-white border border-indigo-100 rounded-lg shadow-sm group hover:border-indigo-300 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                        {e.first_name?.[0]}{e.last_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800">{e.first_name} {e.last_name}</div>
                                        <div className="text-xs text-slate-500">{e.employee_code}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleAssign(e.id, false)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all font-medium text-sm">
                                    Çıkar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border border-slate-200 bg-white rounded-xl p-4 flex flex-col">
                    <h3 className="font-bold mb-3 text-slate-600">Diğer Personeller ({unassigned.length})</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {unassigned.filter(filterFn).map(e => (
                            <div key={e.id} className="flex justify-between items-center p-3 bg-slate-50 border border-transparent rounded-lg hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                        {e.first_name?.[0]}{e.last_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-600">{e.first_name} {e.last_name}</div>
                                        <div className="text-xs text-slate-400">{e.employee_code}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleAssign(e.id, true)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all font-medium text-sm">
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

// --- Holidays List (read-only, for Tatiller tab) ---
const HolidaysList = ({ publicHolidayIds }) => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/public-holidays/').then(res => {
            const data = res.data.results || res.data;
            setHolidays(data);
        }).finally(() => setLoading(false));
    }, []);

    const activeHolidays = holidays
        .filter(h => publicHolidayIds.includes(h.id))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (loading) return <div className="text-center py-4 text-slate-400 text-sm">Tatiller yükleniyor...</div>;
    if (activeHolidays.length === 0) return null;

    return (
        <div>
            <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-red-500" />
                Resmi Tatiller
                <span className="text-xs font-normal text-slate-400">({activeHolidays.length} gün)</span>
            </h4>
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Tarih</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Tatil Adı</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Tür</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600 text-xs">Saatler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeHolidays.map(h => (
                            <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-2.5 font-mono text-slate-700">
                                    {moment(h.date).format('DD MMM YYYY, ddd')}
                                </td>
                                <td className="px-4 py-2.5 font-medium text-slate-800">{h.name}</td>
                                <td className="px-4 py-2.5">
                                    {h.type === 'HALF_DAY' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            Yarım Gün
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                                            Tam Gün
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 text-slate-500">
                                    {h.type === 'HALF_DAY' && h.start_time && h.end_time
                                        ? `${h.start_time.slice(0, 5)} - ${h.end_time.slice(0, 5)}`
                                        : <span className="text-slate-300">—</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Icons
const SettingsIcon = () => <Settings size={20} className="text-slate-500" />;
const Settings = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
const ClockIcon = () => <Clock size={20} className="text-slate-500" />;
const CalendarIcon = () => <Calendar size={20} className="text-slate-500" />;
const UsersIcon = () => <Users size={20} className="text-slate-500" />;

const HolidayDetailModal = ({ range, onClose, onSave }) => {
    const [name, setName] = useState('Resmi Tatil');
    const [type, setType] = useState('FULL_DAY');
    const [defaultStart, setDefaultStart] = useState('09:00');
    const [defaultEnd, setDefaultEnd] = useState('13:00');

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

    const [dailyOverrides, setDailyOverrides] = useState({});

    const handleOverrideChange = (date, field, value) => {
        setDailyOverrides(prev => ({
            ...prev,
            [date]: { ...prev[date], [field]: value }
        }));
    };

    const handleSave = () => {
        const configs = dates.map(date => {
            const override = dailyOverrides[date] || {};
            return {
                name,
                date,
                type,
                start_time: type === 'HALF_DAY' ? (override.start || defaultStart) : null,
                end_time: type === 'HALF_DAY' ? (override.end || defaultEnd) : null
            };
        });
        onSave(configs);
    };

    const isBulkHalfDay = type === 'HALF_DAY' && dates.length > 1;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4 animate-in fade-in zoom-in-95" style={{ zIndex: 10000 }}>
            <div className={`bg-white rounded-xl shadow-2xl p-4 md:p-6 w-full ${isBulkHalfDay ? 'max-w-[calc(100vw-2rem)] md:max-w-2xl' : 'max-w-sm'} transition-all`}>
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
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none"
                                placeholder="Örn: Kurban Bayramı" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tür</label>
                            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 ring-indigo-500 outline-none bg-white"
                                value={type} onChange={e => setType(e.target.value)}>
                                <option value="FULL_DAY">Tam Gün</option>
                                <option value="HALF_DAY">Yarım Gün / Saatlik</option>
                            </select>
                        </div>
                    </div>

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
                                    const isModified = (override.start && override.start !== defaultStart) || (override.end && override.end !== defaultEnd);
                                    return (
                                        <div key={date} className={`flex items-center gap-3 p-2 border-b last:border-0 ${isModified ? 'bg-indigo-50/50' : 'hover:bg-white'}`}>
                                            <div className="w-24 text-sm font-medium text-slate-700">{date}</div>
                                            <div className="flex items-center gap-2 flex-1">
                                                <input type="time" className={`border rounded px-2 py-1 text-sm w-full ${isModified ? 'border-indigo-300 bg-white' : 'border-slate-200 text-slate-500'}`}
                                                    value={s} onChange={e => handleOverrideChange(date, 'start', e.target.value)} />
                                                <span className="text-slate-300">-</span>
                                                <input type="time" className={`border rounded px-2 py-1 text-sm w-full ${isModified ? 'border-indigo-300 bg-white' : 'border-slate-200 text-slate-500'}`}
                                                    value={e} onChange={e => handleOverrideChange(date, 'end', e.target.value)} />
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

const HolidayBuilderModal = ({ onClose, selectedHolidayIds, allHolidays, onUpdateSelection, onNewHolidayCreated, onHolidayDeleted }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const selectedDates = useMemo(() => {
        const dates = new Set();
        selectedHolidayIds.forEach(id => {
            const h = allHolidays.find(x => x.id === id);
            if (h) dates.add(h.date);
        });
        return dates;
    }, [selectedHolidayIds, allHolidays]);

    const [pendingRange, setPendingRange] = useState(null);

    const handleRangeSelect = (start, end) => {
        setPendingRange({ start, end });
    };

    const confirmHolidayCreation = async (holidayConfigs) => {
        if (!holidayConfigs || holidayConfigs.length === 0) return;
        const createdHolidays = [];
        const createdIds = [];
        try {
            for (const config of holidayConfigs) {
                const res = await api.post('/core/public-holidays/', {
                    name: config.name, date: config.date, type: config.type,
                    start_time: config.start_time, end_time: config.end_time, category: 'OFFICIAL'
                });
                createdHolidays.push(res.data);
                createdIds.push(res.data.id);
            }
            createdHolidays.forEach(h => onNewHolidayCreated(h));
            onUpdateSelection([...selectedHolidayIds, ...createdIds]);
            setPendingRange(null);
        } catch (error) {
            alert("Hata oluştu: " + error.message);
        }
    };

    const handleRemoveDate = async (dateStr) => {
        const holidayToRemove = allHolidays.find(h => h.date === dateStr);
        if (holidayToRemove) {
            if (window.confirm(`${dateStr} tarihindeki "${holidayToRemove.name}" tatilini silmek istediğinize emin misiniz?`)) {
                try {
                    await api.delete(`/core/public-holidays/${holidayToRemove.id}/`);
                    if (onHolidayDeleted) onHolidayDeleted(holidayToRemove.id);
                    const newIds = selectedHolidayIds.filter(id => id !== holidayToRemove.id);
                    onUpdateSelection(newIds);
                } catch (error) {
                    alert("Silme işlemi başarısız: " + error.message);
                }
            }
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
                {pendingRange && (
                    <HolidayDetailModal range={pendingRange} onClose={() => setPendingRange(null)} onSave={confirmHolidayCreation} />
                )}

                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Görsel Tatil Düzenleyici</h3>
                        <p className="text-sm text-slate-500">Tarihleri sürükleyerek seçin ve tatil detaylarını girin.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50">
                    <YearCalendar
                        year={year}
                        onYearChange={setYear}
                        holidays={new Set(allHolidays.map(h => h.date))}
                        selectedDates={selectedDates}
                        onRangeSelect={handleRangeSelect}
                        onDateClick={handleRemoveDate}
                    />
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all">
                        Tamamla
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default WorkSchedules;
