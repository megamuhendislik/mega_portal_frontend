
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Search, User, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    ArrowLeft, Database, Download, Upload, ChevronDown, ChevronUp, X
} from 'lucide-react';
import DayEditModal from './data-management/DayEditModal';

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
    const monthNames = ["Ocak", "\u015eubat", "Mart", "Nisan", "May\u0131s", "Haziran", "Temmuz", "A\u011fustos", "Eyl\u00fcl", "Ekim", "Kas\u0131m", "Aral\u0131k"];

    const getVal = (m, field) => {
        const found = stats.find(s => s.month === m);
        return found ? found[field] : 0;
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm p-4 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <h4 className="text-sm font-bold text-slate-800">Y\u0131ll\u0131k \u00d6zet Tablosu</h4>

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
                {loading && <span className="text-xs text-slate-400 animate-pulse">Y\u00fckleniyor...</span>}
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
        if (!window.confirm(`${format(currentMonth, 'MMMM', { locale: tr })} ay\u0131 i\u00e7in eksik g\u00fcnleri otomatik tamamlamak istiyor musunuz?`)) return;

        try {
            const res = await api.post('/system-data/auto_fill_month/', {
                employee_id: selectedUser.id,
                year: currentMonth.getFullYear(),
                month: currentMonth.getMonth() + 1
            });
            alert(`${res.data.filled_days} g\u00fcn otomatik tamamland\u0131.`);
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
            setMessage({ type: 'info', text: 'Yedek haz\u0131rlan\u0131yor, l\u00fctfen bekleyin...' });
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

            setMessage({ type: 'success', text: 'Yedek ba\u015far\u0131yla indirildi.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '\u0130ndirme ba\u015far\u0131s\u0131z: ' + (err.response?.data?.error || err.message) });
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let msg = 'D\u0130KKAT: Veriler g\u00fcncellenecektir. Devam?';
        if (dryRun) msg = 'S\u0130M\u00dcLASYON MODU: Veriler taranacak fakat veritaban\u0131 DE\u011e\u0130\u015eT\u0130R\u0130LMEYECEKT\u0130R. Devam?';

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
                setMessage({ type: 'success', text: 'Sim\u00fclasyon Tamamland\u0131. Raporu inceleyin.' });
            } else {
                setMessage({ type: 'success', text: res.data.message || 'Geri y\u00fckleme ba\u015far\u0131l\u0131.' });
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
    const monthNamesShort = ["Oca", "\u015eub", "Mar", "Nis", "May", "Haz", "Tem", "A\u011fu", "Eyl", "Eki", "Kas", "Ara"];

    // Permission Check
    if (!hasPermission('PAGE_DATA_MANAGEMENT') && !hasPermission('SYSTEM_FULL_ACCESS')) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <h2 className="text-xl font-bold text-red-500 mb-2">Eri\u015fim Reddedildi</h2>
                <p className="text-slate-600">Bu sayfay\u0131 g\u00f6r\u00fcnt\u00fclemek i\u00e7in yeterli yetkiniz bulunmamaktad\u0131r.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1800px] mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Database className="text-blue-600" />
                    Sistem Veri Y\u00f6netimi (Y\u0131ll\u0131k Matris)
                </h1>

                <div className="flex bg-white rounded-lg shadow-sm p-1 border">
                    <button
                        onClick={() => setActiveTab('browse_users')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'browse_users' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-gray-50'}`}
                    >
                        Y\u0131ll\u0131k Matris
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
                    <button onClick={() => setMessage(null)} className="font-bold hover:opacity-75">{'\u00d7'}</button>
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
                                <h2 className="text-lg font-bold text-slate-800">Veri D\u0131\u015fa Aktar</h2>
                                <p className="text-sm text-slate-500">Sistem yede\u011fini indir</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button onClick={() => handleExport('json')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-blue-700">JSON (Tam Yedek)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-800">Restore \u0130\u00e7in</span>
                            </button>
                            {/* SQL Export Disabled
                            <button onClick={() => handleExport('sql')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-purple-700">SQL Dump (PostgreSQL)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-purple-200 group-hover:text-purple-800">DB Y\u00f6neticisi \u0130\u00e7in</span>
                            </button>
                            */}
                            <button onClick={() => handleExport('csv')} className="w-full flex items-center justify-between p-4 border rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
                                <span className="font-medium text-slate-700 group-hover:text-green-700">CSV (Excel)</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 group-hover:bg-green-200 group-hover:text-green-800">Raporlama \u0130\u00e7in</span>
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
                                <h2 className="text-lg font-bold text-slate-800">Geri Y\u00fckle</h2>
                                <p className="text-sm text-slate-500">JSON yede\u011finden geri d\u00f6n</p>
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
                                    {importing ? 'Y\u00fckleniyor...' : 'Dosya Se\u00e7 veya S\u00fcr\u00fckle'}
                                </span>
                                <span className="text-xs text-slate-400">Sadece .json dosyalar\u0131</span>
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
                                        <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Sadece Do\u011frula (Sim\u00fclasyon Modu)</div>
                                        <div className="text-xs text-slate-500">\u0130\u015faretlerseniz veritaban\u0131nda de\u011fi\u015fiklik yap\u0131lmaz.</div>
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
                                <h2 className="font-bold text-slate-700">Y\u0131ll\u0131k Personel \u00d6zeti</h2>

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
                                            <th className="px-4 py-3 border-b text-right min-w-[100px]">\u0130\u015flem</th>
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
                                                                        title="Mahsupla\u015f / S\u0131f\u0131rla"
                                                                    >
                                                                        S\u0131f\u0131rla
                                                                    </button>
                                                                )}
                                                            </td>
                                                        );
                                                    })}

                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleSelectUser(emp)}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors"
                                                            title="Takvimi A\u00e7"
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
                                    <div className="p-8 text-center text-slate-500">Sonu\u00e7 bulunamad\u0131.</div>
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
                                    <span className="font-medium">Listeye D\u00f6n</span>
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
                                        Ay\u0131 Otomatik Tamamla (Eksikleri Doldur)
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
                                <div className="h-[400px] flex items-center justify-center text-slate-400">Y\u00fckleniyor...</div>
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
                                Sim\u00fclasyon Raporu
                            </h3>
                            <button onClick={() => setSimulationReport(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                <p className="font-bold mb-1">Do\u011frulama Ba\u015far\u0131l\u0131!</p>
                                <p>A\u015fa\u011f\u0131daki veriler veritaban\u0131na aktar\u0131lmak \u00fczere ba\u015far\u0131yla tarand\u0131. (\u015eu an hi\u00e7bir de\u011fi\u015fiklik yap\u0131lmad\u0131)</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3">Bulunan Kay\u0131tlar</h4>
                                {Object.entries(simulationReport).map(([model, count]) => (
                                    <div key={model} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                                        <span className="font-mono text-sm text-slate-600">{model}</span>
                                        <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border">{count}</span>
                                    </div>
                                ))}
                                {Object.keys(simulationReport).length === 0 && (
                                    <div className="text-slate-500 italic text-center py-4">\u00d6zet olu\u015fturulamad\u0131 veya dosya bo\u015f.</div>
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
                {['Pzt', 'Sal', '\u00c7ar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
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
                                            \u0130Z\u0130N
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
                                    Kay\u0131t Yok
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
    const [mode, setMode] = useState('settle'); // 'settle' | 'real_reset'
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const monthNames = ['', 'Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];

    useEffect(() => {
        if (isOpen) {
            setMode('settle');
            setLoading(false);
            setConfirmText('');
        }
    }, [isOpen]);

    const handleAction = async () => {
        if (mode === 'real_reset' && confirmText !== 'ONAYLA') {
            alert('Onaylamak i\u00e7in "ONAYLA" yaz\u0131n.');
            return;
        }
        setLoading(true);
        try {
            const endpoint = mode === 'settle'
                ? '/system-data/settle_balance/'
                : '/system-data/real_reset/';
            const res = await api.post(endpoint, {
                employee_id: data.employee.id,
                year: data.year,
                month: data.month,
            });
            alert(res.data.message || '\u0130\u015flem ba\u015far\u0131l\u0131.');
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
    const isDeficit = data.netBalance < 0;
    const absHours = (Math.abs(data.netBalance) / 3600).toFixed(1);
    const absMinutes = Math.round(Math.abs(data.netBalance) / 60);
    const empName = `${data.employee.first_name} ${data.employee.last_name}`;
    const empDept = data.employee.department_name || data.employee.department?.name || '';
    const periodLabel = `${monthNames[data.month] || data.month} ${data.year}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header \u2014 \u00c7al\u0131\u015fan + D\u00f6nem bilgisi */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs font-medium text-slate-300 uppercase tracking-wider mb-1">Bakiye \u0130\u015flemi</div>
                            <h3 className="text-xl font-bold">{empName}</h3>
                            <div className="flex items-center gap-3 mt-1.5">
                                {empDept && <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{empDept}</span>}
                                <span className="text-sm font-semibold text-blue-300">{periodLabel}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl font-bold leading-none mt-1">{'\u00d7'}</button>
                    </div>
                </div>

                {/* Balance Display */}
                <div className="px-6 pt-5">
                    <div className={`p-4 rounded-xl border ${isSurplus ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : isDeficit ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <div className="text-xs font-semibold uppercase tracking-wider opacity-60">Net Bakiye</div>
                        <div className="text-2xl font-bold mt-1">
                            {isSurplus ? '+' : isDeficit ? '-' : ''}{absHours} saat
                            <span className="text-sm font-normal ml-2 opacity-60">({absMinutes} dk)</span>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="px-6 py-5 space-y-3">
                    {/* Option 1: Mutabakat */}
                    <label
                        className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${mode === 'settle' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => setMode('settle')}
                    >
                        <div className="flex items-start gap-3">
                            <input type="radio" name="smode" checked={mode === 'settle'} readOnly className="mt-1 w-4 h-4 text-blue-600" />
                            <div>
                                <div className="font-bold text-slate-900">Mutabakat (S\u0131f\u0131rla)</div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Bakiyeyi s\u0131f\u0131rlar ve bir sonraki aya devretmesini engeller.
                                    {isSurplus && ' Art\u0131 bakiye i\u00e7in \u00f6deme yap\u0131ld\u0131\u011f\u0131n\u0131,'}
                                    {isDeficit && ' Eksi bakiye i\u00e7in maa\u015ftan d\u00fc\u015f\u00fcld\u00fc\u011f\u00fcn\u00fc,'}
                                    {' '}muhasebe elle takip eder. Mesai kay\u0131tlar\u0131 de\u011fi\u015fmez.
                                </p>
                            </div>
                        </div>
                    </label>

                    {/* Option 2: Ger\u00e7ek S\u0131f\u0131rla */}
                    <label
                        className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${mode === 'real_reset' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}
                        onClick={() => setMode('real_reset')}
                    >
                        <div className="flex items-start gap-3">
                            <input type="radio" name="smode" checked={mode === 'real_reset'} readOnly className="mt-1 w-4 h-4 text-red-600" />
                            <div>
                                <div className="font-bold text-slate-900">Ger\u00e7ek S\u0131f\u0131rla</div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Eksik saatleri mesai kayd\u0131 olarak doldurur. \u00c7al\u0131\u015fan o saatleri \u00e7al\u0131\u015fm\u0131\u015f gibi
                                    g\u00f6r\u00fcn\u00fcr ve normal mesai tam olur. <strong className="text-red-600">Bu i\u015flem geri al\u0131namaz.</strong>
                                </p>
                            </div>
                        </div>
                    </label>

                    {/* Confirm input for real reset */}
                    {mode === 'real_reset' && (
                        <div className="ml-7 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700 mb-2 font-semibold">Onaylamak i\u00e7in "ONAYLA" yaz\u0131n:</p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                                placeholder="ONAYLA"
                                className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 font-semibold hover:bg-slate-200 rounded-lg">
                        \u0130ptal
                    </button>
                    <button
                        onClick={handleAction}
                        disabled={loading || (mode === 'real_reset' && confirmText !== 'ONAYLA')}
                        className={`px-6 py-2.5 text-sm text-white font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${mode === 'real_reset' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? '\u0130\u015fleniyor...' : mode === 'real_reset' ? 'Ger\u00e7ek S\u0131f\u0131rla' : 'Mutabakat Yap'}
                    </button>
                </div>
            </div>
        </div>
    );
}
