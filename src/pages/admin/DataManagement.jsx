
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

    const startDay = getDay(monthStart);
    const padding = startDay === 0 ? 6 : startDay - 1;
    const paddingArray = Array(padding).fill(null);

    return (
        <div>
            <div className="grid grid-cols-7 mb-4 border-b pb-2">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-3">
                {paddingArray.map((_, i) => <div key={`pad-${i}`} />)}

                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isToday = isSameDay(day, new Date());
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                    const data = monthlyData[dateStr] || { normal: 0, ot: 0, missing: 0 };
                    const hasStats = data.normal > 0 || data.ot > 0 || data.missing > 0;
                    const hasLeave = data.leave;
                    const hasOtReq = data.has_ot_request;

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDayClick(day)}
                            className={`
                                relative min-h-[100px] border rounded-xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md group
                                ${hasLeave ? (hasLeave.status === 'APPROVED' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-yellow-50/60 border-yellow-200') : 'bg-white'}
                                ${isToday ? 'border-blue-400 ring-4 ring-blue-50' : !hasLeave ? 'border-slate-100 hover:border-blue-300' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-base font-bold ${isWeekend ? 'text-red-400' : 'text-slate-700'}`}>
                                    {format(day, 'd')}
                                </span>
                                <div className="flex gap-0.5">
                                    {hasLeave && (
                                        <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${hasLeave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            İZİN
                                        </span>
                                    )}
                                    {hasOtReq && (
                                        <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-amber-100 text-amber-700">FM</span>
                                    )}
                                </div>
                            </div>

                            {hasLeave && (
                                <div className={`text-[9px] px-1.5 py-0.5 rounded mb-1 font-medium truncate ${hasLeave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {hasLeave.type}
                                </div>
                            )}

                            {hasStats ? (
                                <div className="space-y-0.5">
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
                            ) : !hasLeave ? (
                                <div className="flex justify-center items-center h-full pb-4 text-xs text-slate-300 group-hover:text-blue-500 font-medium mt-2">
                                    Kayıt Yok
                                </div>
                            ) : null}
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
    const [leaves, setLeaves] = useState([]);
    const [otRequests, setOtRequests] = useState([]);
    const [leaveBalance, setLeaveBalance] = useState([]);
    const [requestTypes, setRequestTypes] = useState([]);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteIds, setDeleteIds] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Smart Entry State
    const [workStart, setWorkStart] = useState('08:00');
    const [workDuration, setWorkDuration] = useState(9);
    const [otDuration, setOtDuration] = useState(2);

    // Leave Create Form
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveReason, setLeaveReason] = useState('');

    const dateStr = format(date, 'yyyy-MM-dd');

    const loadData = () => {
        setLoading(true);
        setDeleteIds([]);
        api.get('/system-data/daily_records/', {
            params: { employee_id: employee.id, date: dateStr }
        }).then(res => {
            setRecords(res.data.records || []);
            setLeaves(res.data.leaves || []);
            setOtRequests(res.data.overtime_requests || []);
            setLeaveBalance(res.data.leave_balance || []);
            setRequestTypes(res.data.request_types || []);
            setDailyTarget(res.data.daily_target_seconds || 0);
            if (res.data.request_types?.length > 0 && !leaveTypeId) {
                setLeaveTypeId(res.data.request_types[0].id);
            }
        }).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isOpen) {
            loadData();
            setLeaveStart(dateStr);
            setLeaveEnd(dateStr);
            setLeaveReason('');
        }
    }, [isOpen, employee.id, dateStr]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/system-data/update_daily_records/', {
                employee_id: employee.id, date: dateStr,
                records: records, delete_ids: deleteIds
            });
            alert('Kaydedildi!');
            if (onSaveSuccess) onSaveSuccess();
            loadData();
        } catch (e) { alert('Hata: ' + e.message); }
        finally { setSaving(false); }
    };

    const addRecord = () => {
        setRecords([...records, {
            id: null, check_in: `${dateStr}T09:00`, check_out: `${dateStr}T18:00`,
            source: 'MANUAL', status: 'OPEN'
        }]);
    };

    const updateRec = (idx, field, val) => {
        const n = [...records]; n[idx][field] = val; setRecords(n);
    };

    const removeRec = (idx) => {
        const rec = records[idx];
        if (rec.id) setDeleteIds([...deleteIds, rec.id]);
        setRecords(records.filter((_, i) => i !== idx));
    };

    const applyDailyWork = () => {
        const idsToDelete = records.filter(r => r.id).map(r => r.id);
        setDeleteIds([...deleteIds, ...idsToDelete]);
        const [sh, sm] = workStart.split(':').map(Number);
        const startDate = new Date(date); startDate.setHours(sh, sm, 0, 0);
        const endDate = new Date(startDate.getTime() + workDuration * 60 * 60 * 1000);
        setRecords([{
            id: null, check_in: `${dateStr}T${workStart}`,
            check_out: format(endDate, "yyyy-MM-dd'T'HH:mm"), source: 'MANUAL', status: 'OPEN'
        }]);
        alert('Günlük kayıt oluşturuldu. Kaydet butonuna basmayı unutmayın.');
    };

    const addOvertime = () => {
        let lastEnd = new Date(date); lastEnd.setHours(18, 0, 0, 0);
        if (records.length > 0) {
            const sorted = [...records].sort((a, b) => new Date(b.check_out) - new Date(a.check_out));
            if (sorted[0].check_out) lastEnd = new Date(sorted[0].check_out);
        }
        const end = new Date(lastEnd.getTime() + otDuration * 60 * 60 * 1000);
        setRecords([...records, {
            id: null, check_in: format(lastEnd, "yyyy-MM-dd'T'HH:mm"),
            check_out: format(end, "yyyy-MM-dd'T'HH:mm"), source: 'MANUAL', status: 'OPEN'
        }]);
    };

    const totalHours = () => {
        let t = 0;
        records.forEach(r => { if (r.check_in && r.check_out) { const d = new Date(r.check_out) - new Date(r.check_in); if (d > 0) t += d; } });
        return (t / (1000 * 60 * 60)).toFixed(1);
    };

    const handleCreateLeave = async () => {
        if (!leaveTypeId || !leaveStart || !leaveEnd) { alert('Lütfen tüm alanları doldurun'); return; }
        setSaving(true);
        try {
            const res = await api.post('/system-data/admin_create_leave/', {
                employee_id: employee.id, request_type_id: leaveTypeId,
                start_date: leaveStart, end_date: leaveEnd, reason: leaveReason || 'Muhasebe tarafından oluşturuldu'
            });
            alert(res.data.message);
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) { alert('Hata: ' + (e.response?.data?.error || e.message)); }
        finally { setSaving(false); }
    };

    const handleCancelLeave = async (leaveId) => {
        if (!confirm('Bu izni iptal etmek istediğinize emin misiniz?')) return;
        try {
            const res = await api.post('/system-data/admin_cancel_leave/', { leave_id: leaveId });
            alert(res.data.message);
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) { alert('Hata: ' + (e.response?.data?.error || e.message)); }
    };

    const handleOtAction = async (otId, action) => {
        const reason = action === 'reject' ? prompt('Red sebebi:') : '';
        if (action === 'reject' && reason === null) return;
        try {
            const res = await api.post('/system-data/admin_manage_overtime/', {
                overtime_id: otId, action, reason
            });
            alert(res.data.message);
            loadData();
            if (onSaveSuccess) onSaveSuccess();
        } catch (e) { alert('Hata: ' + (e.response?.data?.error || e.message)); }
    };

    const fmtSec = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}s ${m}dk`; };

    const statusBadge = (status) => {
        const map = {
            'APPROVED': 'bg-emerald-100 text-emerald-700',
            'PENDING': 'bg-yellow-100 text-yellow-700',
            'REJECTED': 'bg-red-100 text-red-700',
            'CANCELLED': 'bg-slate-100 text-slate-500',
            'POTENTIAL': 'bg-blue-100 text-blue-700',
        };
        return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
    };

    if (!isOpen) return null;

    const tabs = [
        { key: 'overview', icon: '📊', label: 'Özet' },
        { key: 'attendance', icon: '📝', label: 'Giriş/Çıkış' },
        { key: 'leave', icon: '🏖️', label: 'İzin' },
        { key: 'overtime', icon: '⏰', label: 'Fazla Mesai' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50/30">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {format(date, 'd MMMM yyyy, EEEE', { locale: tr })}
                            <span className="text-xs font-normal text-slate-500 bg-white border px-2 py-1 rounded-full">
                                {employee.first_name} {employee.last_name}
                            </span>
                        </h3>
                        <div className="text-sm text-slate-500 mt-1 flex gap-4 flex-wrap">
                            <span>Toplam: <b className="text-slate-800">{totalHours()} Saat</b></span>
                            {dailyTarget > 0 && <span>Hedef: <b className="text-blue-600">{fmtSec(dailyTarget)}</b></span>}
                            {leaves.length > 0 && <span className="text-emerald-600 font-bold">🏖️ İzinli</span>}
                            {otRequests.length > 0 && <span className="text-amber-600 font-bold">⏰ {otRequests.length} FM Talebi</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-red-500">
                        <span className="font-bold text-xl">×</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white">
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5
                                ${activeTab === tab.key ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                            <span>{tab.icon}</span> {tab.label}
                            {tab.key === 'leave' && leaves.length > 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded-full">{leaves.length}</span>}
                            {tab.key === 'overtime' && otRequests.length > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full">{otRequests.length}</span>}
                        </button>
                    ))}
                </div>

                <div className="p-5 overflow-y-auto flex-1 bg-slate-50/30">
                    {loading ? (
                        <div className="text-center py-10">Yükleniyor...</div>
                    ) : (
                        <>
                            {/* ========== OVERVIEW TAB ========== */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Hedef', value: fmtSec(dailyTarget), color: 'blue', icon: '🎯' },
                                            { label: 'Normal', value: fmtSec(records.reduce((s, r) => s + (r.normal_seconds || 0), 0)), color: 'green', icon: '✅' },
                                            { label: 'Fazla Mesai', value: fmtSec(records.reduce((s, r) => s + (r.overtime_seconds || 0), 0)), color: 'amber', icon: '⏰' },
                                            { label: 'Eksik', value: fmtSec(records.reduce((s, r) => s + (r.missing_seconds || 0), 0)), color: 'red', icon: '❌' },
                                        ].map((card, i) => (
                                            <div key={i} className={`bg-white rounded-xl border p-3 border-${card.color}-100`}>
                                                <div className="text-xs text-slate-500 mb-1">{card.icon} {card.label}</div>
                                                <div className={`text-lg font-bold text-${card.color}-600`}>{card.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Attendance Records Preview */}
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-blue-500 rounded-full"></div> Giriş/Çıkış Kayıtları
                                        </h4>
                                        {records.length > 0 ? (
                                            <div className="space-y-1">
                                                {records.map((rec, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded-lg">
                                                        <span className="font-mono text-slate-600">
                                                            {rec.check_in ? format(new Date(rec.check_in), 'HH:mm') : '?'} → {rec.check_out ? format(new Date(rec.check_out), 'HH:mm') : '?'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded">{rec.source}</span>
                                                            {rec.normal_seconds > 0 && <span className="text-[10px] text-green-600">{fmtSec(rec.normal_seconds)}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-slate-400 italic">Kayıt yok</p>}
                                    </div>

                                    {/* Leaves on this day */}
                                    {leaves.length > 0 && (
                                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                                            <h4 className="text-sm font-bold text-emerald-700 mb-2">🏖️ İzin Kayıtları</h4>
                                            {leaves.map((lr, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white rounded-lg p-2 mb-1 border border-emerald-100">
                                                    <div>
                                                        <span className="font-medium text-sm text-slate-700">{lr.type_name}</span>
                                                        <span className="text-xs text-slate-400 ml-2">{lr.start_date} → {lr.end_date} ({lr.total_days} gün)</span>
                                                    </div>
                                                    {statusBadge(lr.status)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* OT Requests on this day */}
                                    {otRequests.length > 0 && (
                                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                                            <h4 className="text-sm font-bold text-amber-700 mb-2">⏰ Fazla Mesai Talepleri</h4>
                                            {otRequests.map((ot, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white rounded-lg p-2 mb-1 border border-amber-100">
                                                    <div>
                                                        <span className="font-mono text-sm text-slate-600">{ot.start_time} → {ot.end_time}</span>
                                                        {ot.reason && <span className="text-xs text-slate-400 ml-2">({ot.reason})</span>}
                                                    </div>
                                                    {statusBadge(ot.status)}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Leave Balance */}
                                    {leaveBalance.length > 0 && (
                                        <div className="bg-white rounded-xl border p-4">
                                            <h4 className="text-sm font-bold text-slate-700 mb-2">📋 Yıllık İzin Bakiyesi</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {leaveBalance.map((bal, i) => (
                                                    <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                                                        <div className="text-xs text-slate-400 mb-1">{bal.year}</div>
                                                        <div className="text-2xl font-bold text-blue-600">{bal.remaining_days}</div>
                                                        <div className="text-[10px] text-slate-400">Kalan / {bal.total_days} toplam ({bal.used_days} kullanıldı)</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ========== ATTENDANCE TAB ========== */}
                            {activeTab === 'attendance' && (
                                <div className="space-y-5 animate-fade-in">
                                    {/* Smart Entry */}
                                    <div className="bg-white p-5 rounded-xl border shadow-sm">
                                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-5 bg-blue-500 rounded-full"></div> ⚡ Hızlı İşlem
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç</label>
                                                <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Süre (Saat)</label>
                                                <input type="number" step="0.5" value={workDuration} onChange={e => setWorkDuration(Number(e.target.value))}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <button onClick={applyDailyWork}
                                                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-blue-200 shadow-lg text-sm">
                                                Günü Oluştur
                                            </button>
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Mesai (Saat)</label>
                                                    <input type="number" step="0.5" value={otDuration} onChange={e => setOtDuration(Number(e.target.value))}
                                                        className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
                                                </div>
                                                <button onClick={addOvertime}
                                                    className="bg-amber-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-amber-700 transition-colors text-sm whitespace-nowrap">
                                                    +Mesai
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Raw Records Table */}
                                    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                                        <div className="flex justify-between p-3 items-center border-b bg-slate-50">
                                            <div className="text-sm text-slate-600 font-medium">Kayıtlar ({records.length})</div>
                                            <button onClick={addRecord} className="flex items-center gap-1.5 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded-lg text-sm border border-blue-100">
                                                <Plus size={14} /> Yeni
                                            </button>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold">
                                                <tr>
                                                    <th className="p-3">Giriş</th>
                                                    <th className="p-3">Çıkış</th>
                                                    <th className="p-3 w-28">Kaynak</th>
                                                    <th className="p-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {records.map((rec, i) => (
                                                    <tr key={i} className="group hover:bg-blue-50/20 transition-colors">
                                                        <td className="p-2">
                                                            <input type="text" className="w-full border p-2 rounded bg-white font-mono text-sm focus:border-blue-400 outline-none"
                                                                value={rec.check_in || ''} onChange={e => updateRec(i, 'check_in', e.target.value)} placeholder="YYYY-MM-DDTHH:MM" />
                                                        </td>
                                                        <td className="p-2">
                                                            <input type="text" className="w-full border p-2 rounded bg-white font-mono text-sm focus:border-blue-400 outline-none"
                                                                value={rec.check_out || ''} onChange={e => updateRec(i, 'check_out', e.target.value)} placeholder="YYYY-MM-DDTHH:MM" />
                                                        </td>
                                                        <td className="p-2">
                                                            <select value={rec.source} onChange={e => updateRec(i, 'source', e.target.value)}
                                                                className="w-full border p-2 rounded bg-white text-sm focus:border-blue-400 outline-none">
                                                                <option value="MANUAL">MANUAL</option>
                                                                <option value="CARD">CARD</option>
                                                                <option value="FACE">FACE</option>
                                                                <option value="QR">QR</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => removeRec(i)} className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors" title="Sil">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {records.length === 0 && (
                                                    <tr><td colSpan="4" className="p-6 text-center text-slate-400 italic">Kayıt bulunamadı.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ========== LEAVE TAB ========== */}
                            {activeTab === 'leave' && (
                                <div className="space-y-5 animate-fade-in">
                                    {/* Leave Balance Summary */}
                                    {leaveBalance.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {leaveBalance.map((bal, i) => (
                                                <div key={i} className="bg-white rounded-xl border p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm font-bold text-slate-600">{bal.year}</span>
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{bal.remaining_days} kalan</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                        <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.min((bal.used_days / bal.total_days) * 100, 100)}%` }}></div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-1">{bal.used_days} kullanıldı / {bal.total_days} toplam</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Existing Leaves */}
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div> Bu Güne Ait İzinler
                                        </h4>
                                        {leaves.length > 0 ? leaves.map((lr, i) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 rounded-lg p-3 mb-2">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-slate-700">{lr.type_name}</div>
                                                    <div className="text-xs text-slate-400">{lr.start_date} → {lr.end_date} ({lr.total_days} gün) {lr.reason && `• ${lr.reason}`}</div>
                                                    {lr.approved_by && <div className="text-[10px] text-slate-400 mt-0.5">Onaylayan: {lr.approved_by}</div>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {statusBadge(lr.status)}
                                                    {lr.status !== 'CANCELLED' && (
                                                        <button onClick={() => handleCancelLeave(lr.id)}
                                                            className="text-xs text-red-500 hover:text-red-700 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                                            İptal
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )) : <p className="text-sm text-slate-400 italic">Bu tarihte izin kaydı yok.</p>}
                                    </div>

                                    {/* Create New Leave */}
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-blue-500 rounded-full"></div> Yeni İzin Oluştur
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">İzin Türü</label>
                                                <select value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)}
                                                    className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none">
                                                    {requestTypes.map(rt => (
                                                        <option key={rt.id} value={rt.id}>{rt.name} ({rt.category})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Sebep</label>
                                                <input type="text" value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                                                    placeholder="Opsiyonel" className="w-full border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Başlangıç</label>
                                                <input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Bitiş</label>
                                                <input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)}
                                                    className="w-full border p-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-200 outline-none" />
                                            </div>
                                        </div>
                                        <button onClick={handleCreateLeave} disabled={saving}
                                            className="mt-3 w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-200 text-sm">
                                            {saving ? 'Oluşturuluyor...' : '✓ İzin Oluştur ve Onayla'}
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-1">⚡ Admin izni otomatik olarak onaylanacak ve bakiyeden düşülecektir.</p>
                                    </div>
                                </div>
                            )}

                            {/* ========== OVERTIME TAB ========== */}
                            {activeTab === 'overtime' && (
                                <div className="space-y-5 animate-fade-in">
                                    <div className="bg-white rounded-xl border p-4">
                                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-amber-500 rounded-full"></div> Fazla Mesai Talepleri
                                        </h4>
                                        {otRequests.length > 0 ? otRequests.map((ot, i) => (
                                            <div key={i} className="bg-slate-50 rounded-lg p-4 mb-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-mono text-sm text-slate-700 font-bold">{ot.start_time} → {ot.end_time}</div>
                                                        <div className="text-xs text-slate-400 mt-1">
                                                            Süre: {fmtSec(ot.duration_seconds || 0)}
                                                            {ot.reason && ` • Sebep: ${ot.reason}`}
                                                        </div>
                                                        {ot.approval_manager && <div className="text-[10px] text-slate-400 mt-0.5">Yönetici: {ot.approval_manager}</div>}
                                                        {ot.rejection_reason && <div className="text-[10px] text-red-500 mt-0.5">Red sebebi: {ot.rejection_reason}</div>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {statusBadge(ot.status)}
                                                    </div>
                                                </div>
                                                {(ot.status === 'PENDING' || ot.status === 'POTENTIAL') && (
                                                    <div className="flex gap-2 mt-3 border-t pt-3">
                                                        <button onClick={() => handleOtAction(ot.id, 'approve')}
                                                            className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                                                            ✓ Onayla
                                                        </button>
                                                        <button onClick={() => handleOtAction(ot.id, 'reject')}
                                                            className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-700 transition-colors">
                                                            ✗ Reddet
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-400 italic py-4 text-center">Bu tarihte fazla mesai talebi bulunmuyor.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-between items-center">
                    <div className="text-xs text-slate-400">
                        {activeTab === 'attendance' && deleteIds.length > 0 && (
                            <span className="text-red-500 font-bold">{deleteIds.length} kayıt silinecek</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm">Kapat</button>
                        {activeTab === 'attendance' && (
                            <button onClick={handleSave} disabled={saving || loading}
                                className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg shadow-green-200 text-sm">
                                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
