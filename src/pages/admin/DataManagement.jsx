
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Search, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Save, Trash2, Plus, ArrowLeft, Database, Download, Upload, ChevronDown, ChevronUp
} from 'lucide-react';

function YearlyStatsMatrix({ employee, initialYear }) {
    const [year, setYear] = useState(initialYear);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [year, employee.id]);

    const fetchStats = () => {
        setLoading(true);
        api.get('/system-data/get_yearly_summary/', {
            params: { employee_id: employee.id, year: year }
        }).then(res => {
            setStats(res.data);
        }).finally(() => setLoading(false));
    };

    const formatSeconds = (sec) => {
        if (!sec) return '-';
        const h = Math.round(sec / 3600);
        return `${h}s`;
    };

    // Prepare matrix data: columns are months 1-12
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    const getVal = (m, field) => {
        const found = stats.find(s => s.month === m);
        return found ? found[field] : 0;
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <h4 className="text-sm font-bold text-slate-800">Yıllık Özet Tablosu</h4>

                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setYear(year - 1)}
                            className="p-1 hover:bg-white rounded shadow-sm text-slate-600 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 font-bold text-slate-700 text-sm">{year}</span>
                        <button
                            onClick={() => setYear(year + 1)}
                            className="p-1 hover:bg-white rounded shadow-sm text-slate-600 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
                {loading && <span className="text-xs text-slate-400 animate-pulse">Yükleniyor...</span>}
            </div>

            <div className="overflow-x-auto pb-2">
                <table className="w-full text-xs border-collapse min-w-[800px]">
                    <thead>
                        <tr>
                            <th className="p-2 text-left bg-slate-50 text-slate-500 font-medium border border-slate-200 sticky left-0 z-10 w-24">Metrik</th>
                            {monthNames.map(m => (
                                <th key={m} className="p-2 text-center bg-slate-50 text-slate-500 font-medium border border-slate-200 min-w-[60px]">{m}</th>
                            ))}
                            <th className="p-2 text-center bg-slate-100 text-slate-700 font-bold border border-slate-200">Toplam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Normal */}
                        <tr>
                            <td className="p-2 font-medium text-slate-600 bg-slate-50 border border-slate-200 sticky left-0 z-10">Normal</td>
                            {months.map(m => (
                                <td key={m} className="p-2 text-center border border-slate-200 text-slate-600">
                                    {formatSeconds(getVal(m, 'normal'))}
                                </td>
                            ))}
                            <td className="p-2 text-center border border-slate-200 font-bold text-slate-800 bg-slate-50">
                                {formatSeconds(stats.reduce((acc, curr) => acc + (curr.normal || 0), 0))}
                            </td>
                        </tr>
                        {/* Overtime */}
                        <tr>
                            <td className="p-2 font-medium text-amber-600 bg-amber-50/30 border border-slate-200 sticky left-0 z-10">Mesai</td>
                            {months.map(m => (
                                <td key={m} className="p-2 text-center border border-slate-200 text-amber-600 font-medium bg-amber-50/10">
                                    {formatSeconds(getVal(m, 'ot'))}
                                </td>
                            ))}
                            <td className="p-2 text-center border border-slate-200 font-bold text-amber-700 bg-amber-50">
                                {formatSeconds(stats.reduce((acc, curr) => acc + (curr.ot || 0), 0))}
                            </td>
                        </tr>
                        {/* Missing */}
                        <tr>
                            <td className="p-2 font-medium text-red-600 bg-red-50/30 border border-slate-200 sticky left-0 z-10">Eksik</td>
                            {months.map(m => (
                                <td key={m} className="p-2 text-center border border-slate-200 text-red-600 font-medium bg-red-50/10">
                                    {formatSeconds(getVal(m, 'missing'))}
                                </td>
                            ))}
                            <td className="p-2 text-center border border-slate-200 font-bold text-red-700 bg-red-50">
                                {formatSeconds(stats.reduce((acc, curr) => acc + (curr.missing || 0), 0))}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

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

    // List View Year Selection (Matrix Mode)
    const [listYear, setListYear] = useState(new Date().getFullYear());
    const [bulkStats, setBulkStats] = useState({}); // { empId: { month: { normal, ot, missing } } }

    const [expandedRowId, setExpandedRowId] = useState(null);

    // --- Calendar State ---
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [monthlyData, setMonthlyData] = useState({});
    const [loadingCalendar, setLoadingCalendar] = useState(false);

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
        if (activeTab === 'browse_users') {
            fetchBulkStats();
        }
    }, [activeTab, listYear]);

    useEffect(() => {
        if (viewMode === 'calendar' && selectedUser) {
            fetchMonthlyData();
        }
    }, [currentMonth, selectedUser, viewMode]);

    const fetchMonthlyData = () => {
        setLoadingCalendar(true);
        api.get('/system-data/get_monthly_summary/', {
            params: {
                employee_id: selectedUser.id,
                year: currentMonth.getFullYear(),
                month: currentMonth.getMonth() + 1
            }
        }).then(res => {
            setMonthlyData(res.data);
        }).finally(() => setLoadingCalendar(false));
    };

    const fetchBulkStats = () => {
        api.get('/system-data/get_bulk_yearly_stats/', {
            params: {
                year: listYear
            }
        }).then(res => {
            setBulkStats(res.data);
        });
    };

    const handleAutoFill = async () => {
        if (!window.confirm(`${format(currentMonth, 'MMMM', { locale: tr })} ayı için eksik günleri otomatik tamamlamak istiyor musunuz?`)) return;

        try {
            const res = await api.post('/system-data/auto_fill_month/', {
                employee_id: selectedUser.id,
                year: currentMonth.getFullYear(),
                month: currentMonth.getMonth() + 1
            });
            alert(`${res.data.filled_days} gün otomatik tamamlandı.`);
            fetchMonthlyData(); // Refresh calendar
        } catch (e) {
            alert('Hata: ' + e.message);
        }
    };

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

    const toggleRow = (empId) => {
        setExpandedRowId(expandedRowId === empId ? null : empId);
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setViewMode('calendar');
        // Start calendar at Jan of selected listYear (or keep month logic if preferred, but simpler to start clean)
        setCurrentMonth(new Date(listYear, 0, 1));
    };

    const handleDayClick = (day) => {
        setEditingDate(day);
        setIsEditModalOpen(true);
    };

    const formatDuration = (seconds) => {
        if (!seconds) return null;
        const h = Math.round(seconds / 3600);
        return `${h}s`; // e.g. 5s (5 hours)
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

    // Matrix Helper
    const monthCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthNamesShort = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

    if (!hasPermission('DATA_MANAGE_FULL') && !hasPermission('MENU_DATA_MANAGEMENT_VIEW')) {
        return <div className="p-8 text-center text-gray-500">Yetkiniz yok.</div>;
    }

    return (
        <div className="p-6 max-w-[1800px] mx-auto min-h-screen">
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
                        Yıllık Matris
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
                                <h2 className="font-bold text-slate-700">Yıllık Personel Özeti</h2>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                        <button onClick={() => setListYear(listYear - 1)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-lg font-bold text-slate-800 min-w-[100px] text-center select-none">
                                            {listYear}
                                        </span>
                                        <button onClick={() => setListYear(listYear + 1)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

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
                            </div>

                            <div className="max-h-[700px] overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-20 text-xs uppercase text-slate-500 font-bold tracking-wider shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 border-b bg-slate-50/95 sticky left-0 z-30 min-w-[200px]">Personel</th>
                                            {monthNamesShort.map((m, i) => (
                                                <th key={m} className={`px-2 py-3 text-center border-b min-w-[70px] ${i % 2 === 0 ? 'bg-slate-50/95' : 'bg-white/95'}`}>{m}</th>
                                            ))}
                                            <th className="px-4 py-3 border-b text-right min-w-[100px]">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEmployees.map(emp => {
                                            const empStats = bulkStats[emp.id] || {};
                                            return (
                                                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-4 py-3 bg-white group-hover:bg-blue-50/30 border-r border-slate-100 sticky left-0 z-10 w-[200px]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {emp.first_name[0]}{emp.last_name[0]}
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="font-medium text-slate-900 text-sm">{emp.first_name} {emp.last_name}</div>
                                                                <div className="text-[10px] text-slate-500">{emp.department_name || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {monthCols.map(m => {
                                                        const stat = empStats[m] || {};
                                                        const hasOt = stat.ot > 300; // Show if > 5 mins
                                                        const hasMissing = stat.missing > 300;
                                                        const isEmpty = !hasOt && !hasMissing;

                                                        return (
                                                            <td key={m} className={`px-1 py-2 text-center border-r border-slate-50 text-xs ${m % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                                                                {isEmpty ? (
                                                                    <span className="text-slate-200">-</span>
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        {hasOt && (
                                                                            <span className="text-amber-700 bg-amber-50 px-1.5 rounded font-bold">
                                                                                +{Math.round(stat.ot / 3600)}s
                                                                            </span>
                                                                        )}
                                                                        {hasMissing && (
                                                                            <span className="text-red-700 bg-red-50 px-1.5 rounded font-bold">
                                                                                -{Math.round(stat.missing / 3600)}s
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleSelectUser(emp)}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                                            title="Takvimi Aç"
                                                        >
                                                            <CalendarIcon size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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

                                <div className="flex flex-col items-center gap-2">
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
                                    <button
                                        onClick={handleAutoFill}
                                        className="text-xs text-blue-600 hover:underline font-bold"
                                    >
                                        Ayı Otomatik Tamamla (Eksikleri Doldur)
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
                            {loadingCalendar ? (
                                <div className="h-[400px] flex items-center justify-center text-slate-400">Yükleniyor...</div>
                            ) : (
                                <CalendarGrid
                                    currentMonth={currentMonth}
                                    onDayClick={handleDayClick}
                                    monthlyData={monthlyData}
                                />
                            )}
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
                    onSaveSuccess={fetchMonthlyData}
                />
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Sub-Components
// ----------------------------------------------------------------------

function CalendarGrid({ currentMonth, onDayClick, monthlyData }) {
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
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday = isSameDay(day, new Date());
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                    const data = monthlyData[dateStr] || { normal: 0, ot: 0, missing: 0 };
                    const hasStats = data.normal > 0 || data.ot > 0 || data.missing > 0;

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
                                {/* Status dot? */}
                            </div>

                            {hasStats ? (
                                <div className="space-y-1 mt-2">
                                    {data.normal > 0 && (
                                        <div className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded flex justify-between font-medium">
                                            <span>Normal</span>
                                            <span>{Math.round(data.normal / 3600)}s</span>
                                        </div>
                                    )}
                                    {data.ot > 0 && (
                                        <div className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded flex justify-between font-medium">
                                            <span>Mesai</span>
                                            <span>{Math.round(data.ot / 3600)}s</span>
                                        </div>
                                    )}
                                    {data.missing > 0 && (
                                        <div className="bg-red-50 text-red-700 text-[10px] px-1.5 py-0.5 rounded flex justify-between font-medium">
                                            <span>Eksik</span>
                                            <span>{Math.round(data.missing / 3600)}s</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex justify-center items-center h-full pb-6 text-xs text-slate-300 group-hover:text-blue-500 font-medium mt-4">
                                    Kayıt Yok
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DayEditModal({ isOpen, onClose, employee, date, onSaveSuccess }) {
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

    const fillStandardShift = () => {
        // Adds standard 08:00 - 18:00 shift
        setRecords([...records, {
            id: null,
            check_in: `${dateStr}T08:00`,
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
                            <div className="flex justify-between mb-4 items-center">
                                <div className="text-sm text-slate-500 font-medium">Hızlı İşlemler:</div>
                                <div className="flex gap-2">
                                    <button onClick={fillStandardShift} className="flex items-center gap-2 bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors text-sm">
                                        Tam Gün Mesai Ekle (08:00 - 18:00)
                                    </button>
                                    <button onClick={addRecord} className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm">
                                        <Plus size={16} /> Yeni Kayıt Ekle
                                    </button>
                                </div>
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
