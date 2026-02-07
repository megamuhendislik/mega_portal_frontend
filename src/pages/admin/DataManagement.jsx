
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Search, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Save, Trash2, Plus, ArrowLeft, Database, Download, Upload, ChevronDown, ChevronUp, X
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
    const [dryRun, setDryRun] = useState(false);
    const [simulationReport, setSimulationReport] = useState(null);

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

    // --- Settlement Modal State ---
    const [settlementData, setSettlementData] = useState(null); // { isOpen: bool, employee, year, month, netBalance }

    const openSettlement = (employee, month, stat) => {
        // stat has { normal, ot, missing, net_balance (if available) }
        // bulkStats might not have net_balance? 
        // We can infer Net = (Normal + OT) - Target? Or just (OT - Missing)? 
        // Usually Net Balance = Total Work - Target.
        // But here we rely on what 'bulkStats' returns.
        // Let's ensure bulkStats returns 'net_balance' or 'balance'.

        // If not available, we assume Balance ~= OT - Missing (roughly for visualization)
        // But for settlement we need exact.
        // Let's pass what we have, and maybe fetch exact in modal? 
        // Or assume the user wants to settle the visible surplus/deficit.
        const balance = stat.balance !== undefined ? stat.balance : (stat.ot - stat.missing);

        setSettlementData({
            isOpen: true,
            employee,
            year: listYear,
            month,
            netBalance: balance
        });
    };

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

    const handleExport = async (fmt) => {
        try {
            setMessage({ type: 'info', text: 'Yedek hazırlanıyor, lütfen bekleyin...' });
            const response = await api.get(`/system-data/export_backup/?format=${fmt}`, {
                responseType: 'blob'
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Try to extract filename from content-disposition
            let filename = `backup_${fmt}_${new Date().toISOString().slice(0, 10)}.json`;
            if (fmt === 'sql') filename = filename.replace('.json', '.sql');
            if (fmt === 'csv') filename = filename.replace('.json', '.zip');

            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2)
                    filename = fileNameMatch[1];
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMessage({ type: 'success', text: 'Yedek başarıyla indirildi.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'İndirme başarısız: ' + (err.response?.data?.error || err.message) });
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let msg = 'DİKKAT: Veriler güncellenecektir. Devam?';
        if (dryRun) msg = 'SİMÜLASYON MODU: Veriler taranacak fakat veritabanı DEĞİŞTİRİLMEYECEKTİR. Devam?';

        if (!window.confirm(msg)) {
            e.target.value = null; // Reset input
            return;
        }

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dry_run', dryRun);

        try {
            const res = await api.post('/system-data/import_backup/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (res.data.summary) {
                setSimulationReport(res.data.summary);
                setMessage({ type: 'success', text: 'Simülasyon Tamamlandı. Raporu inceleyin.' });
            } else {
                setMessage({ type: 'success', text: res.data.message || 'Geri yükleme başarılı.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Hata: ' + (err.response?.data?.error || err.message) });
        } finally {
            setImporting(false);
            e.target.value = null;
        }
    };

    // Matrix Helper
    const monthCols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthNamesShort = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

    // Permission Check
    if (!hasPermission('PAGE_DATA_MANAGEMENT') && !hasPermission('SYSTEM_FULL_ACCESS')) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <h2 className="text-xl font-bold text-red-500 mb-2">Erişim Reddedildi</h2>
                <p className="text-slate-600">Bu sayfayı görüntülemek için yeterli yetkiniz bulunmamaktadır.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1800px] mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Database className="text-blue-600" />
                    Sistem Veri Yönetimi (Yıllık Matris)
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
                            {/* SQL Export Disabled
                            <button onClick={() => handleExport('sql')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-purple-700">SQL Dump (PostgreSQL)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-purple-200 group-hover:text-purple-800">DB Yöneticisi İçin</span>
                            </button>
                            */}
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

                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <label className="flex items-center justify-center gap-3 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        checked={dryRun}
                                        onChange={e => setDryRun(e.target.checked)}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-slate-300 transition-colors"
                                    />
                                    <div className="text-left">
                                        <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Sadece Doğrula (Simülasyon Modu)</div>
                                        <div className="text-xs text-slate-500">İşaretlerseniz veritabanında değişiklik yapılmaz.</div>
                                    </div>
                                </label>
                            </div>
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

                                                                {/* Settlement Trigger */}
                                                                {!isEmpty && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openSettlement(emp, m, stat); }}
                                                                        className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 rounded"
                                                                        title="Mahsuplaş / Sıfırla"
                                                                    >
                                                                        Sıfırla
                                                                    </button>
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

            {/* Settlement Modal */}
            <SettlementModal
                isOpen={settlementData?.isOpen}
                onClose={() => setSettlementData(null)}
                data={settlementData}
                onSaveSuccess={fetchBulkStats}
            />

            {/* Simulation Report Modal */}
            {simulationReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden m-4">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                Simülasyon Raporu
                            </h3>
                            <button onClick={() => setSimulationReport(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                <p className="font-bold mb-1">Doğrulama Başarılı!</p>
                                <p>Aşağıdaki veriler veritabanına aktarılmak üzere başarıyla tarandı. (Şu an hiçbir değişiklik yapılmadı)</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Bulunan Kayıtlar</h4>
                                {Object.entries(simulationReport).map(([model, count]) => (
                                    <div key={model} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                                        <span className="font-mono text-sm text-slate-600">{model}</span>
                                        <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border">{count}</span>
                                    </div>
                                ))}
                                {Object.keys(simulationReport).length === 0 && (
                                    <div className="text-slate-500 italic text-center py-4">Özet oluşturulamadı veya dosya boş.</div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSimulationReport(null)}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
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

function SettlementModal({ isOpen, onClose, data, onSaveSuccess }) {
    const [amount, setAmount] = useState(data?.netBalance || 0);
    const [mode, setMode] = useState('FULL'); // FULL, PARTIAL
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && data) {
            setAmount(data.netBalance);
            setMode('FULL');
        }
    }, [isOpen, data]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.post('/attendance/settle-balance/', {
                employee_id: data.employee.id,
                year: data.year,
                month: data.month,
                balance_seconds: data.netBalance,
                compensated_seconds: amount
            });
            alert('Mahsuplaşma işlemi kaydedildi.');
            onSaveSuccess();
            onClose();
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !data) return null;

    const isSurplus = data.netBalance > 0;
    const absBal = Math.abs(data.netBalance);
    const hours = Math.round(absBal / 3600);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Bakiye Mahsuplaşma</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
                </div>

                <div className="p-6 space-y-4">
                    <div className={`p-4 rounded-xl border ${isSurplus ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        <div className="text-sm font-bold opacity-70">Mevcut Bakiye ({data.month}. Ay)</div>
                        <div className="text-3xl font-bold">
                            {isSurplus ? '+' : '-'}{hours} Saat
                        </div>
                        <div className="text-xs mt-1 opacity-80">({data.netBalance} saniye)</div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                            <input
                                type="radio"
                                name="mode"
                                checked={mode === 'FULL'}
                                onChange={() => { setMode('FULL'); setAmount(data.netBalance); }}
                                className="w-5 h-5 text-blue-600"
                            />
                            <div>
                                <div className="font-bold text-slate-700">Tamamını Sıfırla</div>
                                <div className="text-xs text-slate-500">Bütün bakiyeyi mahsuplaş ({data.netBalance} sn)</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                            <input
                                type="radio"
                                name="mode"
                                checked={mode === 'PARTIAL'}
                                onChange={() => setMode('PARTIAL')}
                                className="w-5 h-5 text-blue-600"
                            />
                            <div>
                                <div className="font-bold text-slate-700">Kısmi / Manuel Giriş</div>
                                <div className="text-xs text-slate-500">Belirli bir miktarı düş</div>
                            </div>
                        </label>

                        {mode === 'PARTIAL' && (
                            <div className="pl-8">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Miktar (Saniye)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(Number(e.target.value))}
                                    className="w-full border p-2 rounded-lg font-mono"
                                />
                                <div className="text-xs text-slate-400 mt-1">
                                    Pozitif (+) değer bakiyeden düşer, Negatif (-) değer bakiyeye ekler.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">İptal</button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'İşleniyor...' : 'Onayla'}
                    </button>
                </div>
            </div>
        </div>
    );
}



function DayEditModal({ isOpen, onClose, employee, date, onSaveSuccess }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteIds, setDeleteIds] = useState([]);
    const [activeTab, setActiveTab] = useState('smart'); // 'smart', 'raw'

    // Smart Entry State
    const [workStart, setWorkStart] = useState('08:00');
    const [workDuration, setWorkDuration] = useState(9); // Default 9 hours (08-17)
    const [otDuration, setOtDuration] = useState(2);

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
                // Switch to raw if existing records are complex? For now default smart.
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
            alert('Kaydedildi!');
            if (onSaveSuccess) onSaveSuccess();
            onClose();
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
        const rec = records[idx];
        if (rec.id) {
            setDeleteIds([...deleteIds, rec.id]);
        }
        setRecords(records.filter((_, i) => i !== idx));
    };

    // --- Smart Logic ---
    const applyDailyWork = () => {
        const idsToDelete = records.filter(r => r.id).map(r => r.id);
        setDeleteIds([...deleteIds, ...idsToDelete]);

        const [sh, sm] = workStart.split(':').map(Number);
        const startDate = new Date(date);
        startDate.setHours(sh, sm, 0, 0);

        const endDate = new Date(startDate.getTime() + workDuration * 60 * 60 * 1000);

        const newRec = {
            id: null,
            check_in: `${dateStr}T${workStart}`,
            check_out: format(endDate, "yyyy-MM-dd'T'HH:mm"),
            source: 'MANUAL',
            status: 'OPEN'
        };

        setRecords([newRec]);
        alert('Günlük kayıt oluşturuldu. Kaydet butonuna basmayı unutmayın.');
    };

    const addOvertime = () => {
        let lastEnd = new Date(date);
        lastEnd.setHours(18, 0, 0, 0);

        if (records.length > 0) {
            const sorted = [...records].sort((a, b) => new Date(b.check_out) - new Date(a.check_out));
            if (sorted[0].check_out) {
                lastEnd = new Date(sorted[0].check_out);
            }
        }

        const start = lastEnd;
        const end = new Date(start.getTime() + otDuration * 60 * 60 * 1000);

        const newRec = {
            id: null,
            check_in: format(start, "yyyy-MM-dd'T'HH:mm"),
            check_out: format(end, "yyyy-MM-dd'T'HH:mm"),
            source: 'MANUAL',
            status: 'OPEN'
        };

        setRecords([...records, newRec]);
    };

    const calculateTotalHours = () => {
        let totalMs = 0;
        records.forEach(r => {
            if (r.check_in && r.check_out) {
                const diff = new Date(r.check_out) - new Date(r.check_in);
                if (diff > 0) totalMs += diff;
            }
        });
        return (totalMs / (1000 * 60 * 60)).toFixed(1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {format(date, 'd MMMM yyyy', { locale: tr })}
                            <span className="text-xs font-normal text-slate-500 bg-white border px-2 py-1 rounded-full">
                                {employee.first_name} {employee.last_name}
                            </span>
                        </h3>
                        <div className="text-sm text-slate-500 mt-1 flex gap-4">
                            <span>Toplam Kayıt: <b className="text-slate-800">{calculateTotalHours()} Saat</b></span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500">
                        <span className="font-bold text-xl">×</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white">
                    <button
                        onClick={() => setActiveTab('smart')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'smart' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                    >
                        ⚡ Hızlı İşlem (Smart Entry)
                    </button>
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'raw' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                    >
                        📝 Detaylı Düzenleme
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                    {loading ? (
                        <div className="text-center py-10">Yükleniyor...</div>
                    ) : (
                        <>
                            {activeTab === 'smart' && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Daily Work Generator */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                            Günlük Çalışma Oluştur
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç Saati</label>
                                                <input
                                                    type="time"
                                                    value={workStart}
                                                    onChange={e => setWorkStart(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-blue-200 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Çalışma Süresi (Saat)</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={workDuration}
                                                    onChange={e => setWorkDuration(Number(e.target.value))}
                                                    className="w-full border p-2 rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-blue-200 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={applyDailyWork}
                                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-blue-200 shadow-lg"
                                            >
                                                Günü Oluştur
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            ⚠️ Bu işlem mevcut kayıtları siler ve yerine belirttiğiniz saat aralığında tek bir kayıt oluşturur.
                                        </p>
                                    </div>

                                    {/* Overtime Generator */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                            <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                                            Ek Mesai Ekle
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Eklenecek Süre (Saat)</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={otDuration}
                                                    onChange={e => setOtDuration(Number(e.target.value))}
                                                    className="w-full border p-2 rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-amber-200 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={addOvertime}
                                                className="bg-amber-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors shadow-amber-200 shadow-lg"
                                            >
                                                Mesai Ekle (+{otDuration}s)
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">
                                            Son çıkış saatine {otDuration} saat ekler. Eğer kayıt yoksa 18:00'dan başlar.
                                        </p>
                                    </div>

                                    {/* Quick Preview */}
                                    <div className="mt-4 border-t pt-4">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Oluşacak Kayıtlar Önizleme</h5>
                                        <div className="space-y-2">
                                            {records.map((rec, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm p-2 bg-white border rounded">
                                                    <span className="font-mono text-slate-600">{rec.check_in ? format(new Date(rec.check_in), 'HH:mm') : '?'} - {rec.check_out ? format(new Date(rec.check_out), 'HH:mm') : '?'}</span>
                                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{rec.source}</span>
                                                </div>
                                            ))}
                                            {records.length === 0 && <span className="text-sm text-slate-400 italic">Henüz kayıt yok.</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'raw' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between mb-4 items-center">
                                        <div className="text-sm text-slate-500 font-medium">Manuel Kayıt Düzenleme</div>
                                        <button onClick={addRecord} className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors text-sm border border-blue-100">
                                            <Plus size={16} /> Yeni Satır
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                                                <tr>
                                                    <th className="p-3">Giriş</th>
                                                    <th className="p-3">Çıkış</th>
                                                    <th className="p-3 w-32">Kaynak</th>
                                                    <th className="p-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {records.map((rec, i) => (
                                                    <tr key={i} className="group hover:bg-blue-50/20 transition-colors">
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                className="w-full border p-2 rounded bg-white font-mono text-sm focus:border-blue-400 outline-none"
                                                                value={rec.check_in || ''}
                                                                onChange={e => updateRec(i, 'check_in', e.target.value)}
                                                                placeholder="YYYY-MM-DDTHH:MM"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                className="w-full border p-2 rounded bg-white font-mono text-sm focus:border-blue-400 outline-none"
                                                                value={rec.check_out || ''}
                                                                onChange={e => updateRec(i, 'check_out', e.target.value)}
                                                                placeholder="YYYY-MM-DDTHH:MM"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <select
                                                                value={rec.source}
                                                                onChange={e => updateRec(i, 'source', e.target.value)}
                                                                className="w-full border p-2 rounded bg-white text-sm focus:border-blue-400 outline-none"
                                                            >
                                                                <option value="MANUAL">MANUAL</option>
                                                                <option value="CARD">CARD</option>
                                                                <option value="FACE">FACE</option>
                                                                <option value="QR">QR</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                onClick={() => removeRec(i)}
                                                                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {records.length === 0 && (
                                                    <tr>
                                                        <td colSpan="4" className="p-8 text-center text-slate-400 italic">Kayıt bulunamadı.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Vazgeç</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-200"
                    >
                        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
}
