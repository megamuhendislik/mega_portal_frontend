
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Search, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Save, Trash2, Plus, ArrowLeft, Database, Download, Upload
} from 'lucide-react';

export default function DataManagement() {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState('browse_users'); // 'backup', 'browse_users'
    const [message, setMessage] = useState(null);

    // --- Backup State ---
    const [importing, setImporting] = useState(false);

    // --- Browse State ---
    const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar'
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // --- Calendar State ---
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // --- Edit Modal State ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDate, setEditingDate] = useState(null); // Date object

    useEffect(() => {
        if (activeTab === 'browse_users' && employees.length === 0) {
            setLoadingEmployees(true);
            api.get('/employees/?page_size=1000').then(res => {
                const data = res.data.results || res.data;
                setEmployees(data);
                setFilteredEmployees(data);
            }).finally(() => setLoadingEmployees(false));
        }
    }, [activeTab]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredEmployees(employees);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredEmployees(employees.filter(e =>
                e.first_name.toLowerCase().includes(lower) ||
                e.last_name.toLowerCase().includes(lower) ||
                (e.employee_code && e.employee_code.toLowerCase().includes(lower))
            ));
        }
    }, [searchTerm, employees]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setViewMode('calendar');
        setCurrentMonth(new Date()); // Reset to today
    };

    const handleDayClick = (day) => {
        setEditingDate(day);
        setIsEditModalOpen(true);
    };

    const handleExport = (fmt) => {
        window.open(`${api.defaults.baseURL}/system-data/export_backup/?format=${fmt}`, '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!window.confirm('DİKKAT: Veriler güncellenecektir. Devam?')) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/system-data/import_backup/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setMessage({ type: 'success', text: 'Geri yükleme başarılı.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Hata: ' + (err.response?.data?.error || err.message) });
        } finally {
            setImporting(false);
        }
    };

    if (!hasPermission('DATA_MANAGE_FULL') && !hasPermission('MENU_DATA_MANAGEMENT_VIEW')) {
        return <div className="p-8 text-center text-gray-500">Yetkiniz yok.</div>;
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Database className="text-blue-600" />
                    Sistem Veri Yönetimi
                </h1>

                <div className="flex bg-white rounded-lg shadow-sm p-1 border">
                    <button
                        onClick={() => setActiveTab('browse_users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'browse_users' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-gray-50'}`}
                    >
                        Veri Düzenleme
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'backup' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-gray-50'}`}
                    >
                        Yedekleme
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 mb-6 rounded-lg flex justify-between items-center ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} className="font-bold hover:opacity-75">×</button>
                </div>
            )}

            {activeTab === 'backup' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {/* Export Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Download className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Veri Dışa Aktar</h2>
                                <p className="text-sm text-slate-500">Sistem yedeğini indir</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button onClick={() => handleExport('json')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-blue-700">JSON (Tam Yedek)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-800">Restore İçin</span>
                            </button>
                            <button onClick={() => handleExport('sql')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-purple-700">SQL Dump (PostgreSQL)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-purple-200 group-hover:text-purple-800">DB Yöneticisi İçin</span>
                            </button>
                            <button onClick={() => handleExport('csv')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-green-700">CSV (Excel)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-green-200 group-hover:text-green-800">Raporlama İçin</span>
                            </button>
                        </div>
                    </div>

                    {/* Import Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-orange-50 rounded-lg">
                                <Upload className="text-orange-600" size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Geri Yükle</h2>
                                <p className="text-sm text-slate-500">JSON yedeğinden geri dön</p>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                disabled={importing}
                                className="hidden"
                                id="backup-upload"
                            />
                            <label htmlFor="backup-upload" className="cursor-pointer block">
                                <Database size={48} className="mx-auto text-slate-300 mb-4" />
                                <span className="block font-medium text-slate-700 mb-1">
                                    {importing ? 'Yükleniyor...' : 'Dosya Seç veya Sürükle'}
                                </span>
                                <span className="text-xs text-slate-400">Sadece .json dosyaları</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'browse_users' && (
                <div className="animate-fade-in">
                    {viewMode === 'list' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                                <h2 className="font-bold text-slate-700">Personel Listesi</h2>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Ara..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="max-h-[600px] overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Personel</th>
                                            <th className="px-6 py-4">Departman</th>
                                            <th className="px-6 py-4">Pozisyon</th>
                                            <th className="px-6 py-4 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEmployees.map(emp => (
                                            <tr key={emp.id} className="hover:bg-blue-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                            {emp.first_name[0]}{emp.last_name[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</div>
                                                            <div className="text-xs text-slate-500">{emp.employee_code}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{emp.department?.name || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{emp.job_position?.name || '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleSelectUser(emp)}
                                                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:border-blue-500 hover:text-blue-600 shadow-sm transition-all font-medium"
                                                    >
                                                        Takvimi Aç
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredEmployees.length === 0 && (
                                    <div className="p-8 text-center text-slate-500">Sonuç bulunamadı.</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-8">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                    <span className="font-medium">Listeye Dön</span>
                                </button>

                                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-lg font-bold text-slate-800 min-w-[140px] text-center">
                                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                                    </span>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white rounded-lg shadow-sm transition-all text-slate-600">
                                        <ChevronRight size={20} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="font-bold text-slate-800">{selectedUser.first_name} {selectedUser.last_name}</div>
                                        <div className="text-xs text-slate-500">{selectedUser.job_position?.name}</div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-200">
                                        {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <CalendarGrid
                                currentMonth={currentMonth}
                                onDayClick={handleDayClick}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedUser && editingDate && (
                <DayEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    employee={selectedUser}
                    date={editingDate}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Sub-Components
// ----------------------------------------------------------------------

function CalendarGrid({ currentMonth, onDayClick }) {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Padding days for grid alignment
    const startDay = getDay(monthStart); // 0=Sun, 1=Mon...
    // Adjust for Monday start (Turkish standard) -> Mon=0... Sun=6
    const padding = startDay === 0 ? 6 : startDay - 1;
    const paddingArray = Array(padding).fill(null);

    return (
        <div>
            {/* Days Header */}
            <div className="grid grid-cols-7 mb-4 border-b pb-2">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-4">
                {paddingArray.map((_, i) => <div key={`pad-${i}`} />)}

                {days.map(day => {
                    const isToday = isSameDay(day, new Date());
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDayClick(day)}
                            className={`
                                relative min-h-[100px] border rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group bg-white
                                ${isToday ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-300'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-lg font-bold ${isWeekend ? 'text-red-400' : 'text-slate-700'}`}>
                                    {format(day, 'd')}
                                </span>
                                {/* Placeholder for status dot */}
                                <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
                            </div>

                            <div className="flex justify-center items-center h-full pb-6 text-xs text-slate-400 group-hover:text-blue-500 font-medium">
                                Düzenle
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DayEditModal({ isOpen, onClose, employee, date }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteIds, setDeleteIds] = useState([]);
    const [summary, setSummary] = useState(null);

    const dateStr = format(date, 'yyyy-MM-dd');

    // Load initial data
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setDeleteIds([]);
            api.get('/system-data/daily_records/', {
                params: { employee_id: employee.id, date: dateStr }
            }).then(res => {
                setRecords(res.data.records);
                setSummary(null);
            }).finally(() => setLoading(false));
        }
    }, [isOpen, employee.id, dateStr]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.post('/system-data/update_daily_records/', {
                employee_id: employee.id,
                date: dateStr,
                records: records,
                delete_ids: deleteIds
            });
            setSummary(res.data.summary);
            // Re-fetch to normalize
            const refetch = await api.get('/system-data/daily_records/', {
                params: { employee_id: employee.id, date: dateStr }
            });
            setRecords(refetch.data.records);

            alert('Kaydedildi!');
        } catch (e) {
            alert('Hata: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const addRecord = () => {
        setRecords([...records, {
            id: null,
            check_in: `${dateStr}T09:00`,
            check_out: `${dateStr}T18:00`,
            source: 'MANUAL',
            status: 'OPEN'
        }]);
    };

    const updateRec = (idx, field, val) => {
        const n = [...records];
        n[idx][field] = val;
        setRecords(n);
    };

    const removeRec = (idx) => {
        const r = records[idx];
        if (r.id) setDeleteIds([...deleteIds, r.id]);
        setRecords(records.filter((_, i) => i !== idx));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">
                            {format(date, 'd MMMM yyyy', { locale: tr })}
                        </h3>
                        <p className="text-sm text-slate-500">{employee.first_name} {employee.last_name} için kayıtlar</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <span className="font-bold text-xl">×</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-10">Yükleniyor...</div>
                    ) : (
                        <>
                            <div className="flex justify-end mb-4">
                                <button onClick={addRecord} className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">
                                    <Plus size={18} /> Yeni Kayıt
                                </button>
                            </div>

                            <div className="space-y-4">
                                {records.map((rec, i) => (
                                    <div key={i} className="flex flex-col md:flex-row gap-4 p-4 border rounded-xl bg-slate-50 relative group hover:border-blue-300 transition-colors">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Giriş Zamanı</label>
                                            <input
                                                type="text"
                                                className="w-full border p-2 rounded bg-white font-mono text-sm"
                                                value={rec.check_in || ''}
                                                onChange={e => updateRec(i, 'check_in', e.target.value)}
                                                placeholder="YYYY-MM-DDTHH:MM"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Çıkış Zamanı</label>
                                            <input
                                                type="text"
                                                className="w-full border p-2 rounded bg-white font-mono text-sm"
                                                value={rec.check_out || ''}
                                                onChange={e => updateRec(i, 'check_out', e.target.value)}
                                                placeholder="YYYY-MM-DDTHH:MM"
                                            />
                                        </div>
                                        <div className="w-[150px]">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Kaynak</label>
                                            <select
                                                value={rec.source}
                                                onChange={e => updateRec(i, 'source', e.target.value)}
                                                className="w-full border p-2 rounded bg-white text-sm"
                                            >
                                                <option value="MANUAL">MANUAL</option>
                                                <option value="CARD">CARD</option>
                                                <option value="FACE">FACE</option>
                                                <option value="QR">QR</option>
                                            </select>
                                        </div>

                                        <button
                                            onClick={() => removeRec(i)}
                                            className="absolute top-2 right-2 text-red-300 group-hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {records.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-xl">
                                        Kayıt yok.
                                    </div>
                                )}
                            </div>

                            {summary && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800">
                                    <strong>Sonuçlar:</strong>
                                    <span className="ml-2">Normal: {Math.round(summary.normal_seconds / 60)}dk</span>
                                    <span className="ml-2">Fazla: {Math.round(summary.overtime_seconds / 60)}dk</span>
                                    <span className="ml-2">Eksik: {Math.round(summary.missing_seconds / 60)}dk</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg text-slate-600 font-medium hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                        {saving ? '...' : <><Save size={18} /> Kaydet</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

