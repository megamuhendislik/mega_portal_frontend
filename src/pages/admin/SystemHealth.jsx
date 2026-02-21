import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

// Icons
import {
    ServerStackIcon,
    ClockIcon,
    ShieldCheckIcon,
    PlayCircleIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    CommandLineIcon,
    TrashIcon,
    KeyIcon,
    SparklesIcon,
    ClipboardDocumentCheckIcon,
    WrenchScrewdriverIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

import ResourceMonitor from '../../components/ResourceMonitor';

// Extracted tab components
import PermissionsTab from './system-health/PermissionsTab';
import DashboardTab from './system-health/DashboardTab';
import AttendanceDiagTab from './system-health/AttendanceDiagTab';

export default function SystemHealth() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const response = await api.get('/system/health-check/get_system_stats/');
            setStats(response.data);
        } catch (error) {
            console.error("Stats error:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ServerStackIcon className="w-7 h-7 text-indigo-600" />
                        Sistem Kontrol Merkezi
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Puantaj motoru doğrulama, servis logları ve sistem bütünlüğü paneli.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        SYSTEM ONLINE
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white px-2 rounded-xl shadow-sm border border-gray-100">
                <nav className="flex space-x-1 overflow-x-auto p-2" aria-label="Tabs">
                    {[
                        { id: 'dashboard', name: 'Genel Bakış', icon: ServerStackIcon },
                        { id: 'permissions', name: 'Yetki Kontrolü', icon: KeyIcon },
                        { id: 'stress_test', name: 'Stres Testi & Konsol', icon: CommandLineIcon },
                        { id: 'test_suite', name: 'Sistem Testleri', icon: CheckCircleIcon },
                        { id: 'logs', name: 'Servis Logları', icon: ClockIcon },
                        { id: 'security', name: 'Güvenlik', icon: ShieldCheckIcon },
                        { id: 'synthetic', name: 'Sentetik Veri', icon: SparklesIcon },
                        { id: 'data_audit', name: 'Veri Denetimi', icon: ClipboardDocumentCheckIcon },
                        { id: 'attendance_diag', name: 'Mesai Doğrulama', icon: ClockIcon },
                        { id: 'resources', name: 'Kaynak Kullanımı', icon: ChartBarIcon },
                        { id: 'calendar_cleanup', name: 'Takvim Temizliği', icon: TrashIcon },
                        { id: 'maintenance', name: 'Bakım & Onarım', icon: WrenchScrewdriverIcon },
                        { id: 'system_reset', name: 'Sistem Sıfırlama', icon: ExclamationTriangleIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-red-50 text-red-700'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* CONTENT AREA */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && <DashboardTab stats={stats} refresh={fetchStats} loading={loadingStats} />}
                {activeTab === 'permissions' && <PermissionsTab />}
                {activeTab === 'stress_test' && <StressTestTab />}
                {activeTab === 'test_suite' && <TestSuiteTab />}
                {activeTab === 'logs' && <ServiceLogsTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'synthetic' && <SyntheticDataTab />}
                {activeTab === 'data_audit' && <DataAuditTab />}
                {activeTab === 'attendance_diag' && <AttendanceDiagTab />}
                {activeTab === 'resources' && <ResourceMonitor />}
                {activeTab === 'calendar_cleanup' && <CalendarCleanupTab />}
                {activeTab === 'maintenance' && <MaintenanceTab />}
                {activeTab === 'system_reset' && <SystemResetTab />}
            </div>

        </div>
    );
}

function SystemResetTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleWipeEmployees = async () => {
        if (!confirm("DİKKAT! Adminler hariç TÜM personel kayıtları, izinler, ve tüm geçmiş veriler SİLİNECEK.\n\nBu işlem geri alınamaz!\n\nDevam etmek istiyor musunuz?")) return;

        const verification = prompt("Onaylamak için lütfen 'SIL' yazınız:");
        if (verification !== 'SIL') return;

        setLoading(true);
        try {
            const res = await api.post('/system/health-check/wipe_all_employees/');
            setResult(res.data);
        } catch (e) {
            alert("Hata: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-6 text-red-700 bg-red-50 p-4 rounded-xl border border-red-200">
                <ExclamationTriangleIcon className="w-10 h-10" />
                <div>
                    <h3 className="text-xl font-bold">Tehlikeli Bölge (Danger Zone)</h3>
                    <p className="text-sm opacity-80">Bu alandaki işlemler geri alınamaz veri kayıplarına yol açar. Lütfen dikkatli kullanınız.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Item 1: Wipe Employees */}
                <div className="border border-red-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-800 text-lg mb-2">Tüm Personeli Sil (Sıfırla)</h4>
                    <p className="text-sm text-gray-500 mb-6">
                        Süper Adminler hariç, sistemdeki <strong>tüm çalışanları</strong>, kullanıcı hesaplarını, izin taleplerini ve puantaj kayıtlarını kalıcı olarak siler via veritabanından kaldırır.
                        <br /><br />
                        Sistemi yeniden başlatmak veya test verilerini temizlemek için kullanın.
                    </p>

                    {result ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-200">
                            <strong>İşlem Sonucu:</strong>
                            <p>{result.message || result.status}</p>
                        </div>
                    ) : (
                        <button
                            onClick={handleWipeEmployees}
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-wait' : 'bg-red-600 hover:bg-red-700 active:scale-95'}`}
                        >
                            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <TrashIcon className="w-5 h-5" />}
                            {loading ? 'Siliniyor...' : 'Tüm Personeli Sil'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function CalendarCleanupTab() {
    const [calendars, setCalendars] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [result, setResult] = useState(null);

    useEffect(() => {
        scanCalendars();
    }, []);

    const scanCalendars = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/scan_junk_calendars/');
            setCalendars(res.data);
            setSelectedIds([]); // Reset selection on rescan
            setResult(null);
        } catch (e) {
            console.error(e);
            alert("Tarama Hatası!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedIds.length) return;
        if (!confirm(`${selectedIds.length} adet takvim silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?`)) return;

        setLoading(true);
        try {
            const res = await api.post('/system/health-check/cleanup_calendars/', { calendar_ids: selectedIds });
            setResult(res.data);
            scanCalendars(); // Refresh list
        } catch (e) {
            alert("Silme hatası: " + (e.response?.data?.error || e.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === calendars.length) setSelectedIds([]);
        else setSelectedIds(calendars.map(c => c.id));
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <TrashIcon className="w-6 h-6 text-red-600" />
                        Gereksiz Takvim Temizliği
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Sistem tarafından otomatik oluşturulmuş veya kullanılmayan "Custom" takvimleri tespit eder ve siler.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={scanCalendars}
                        className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500 border border-gray-200"
                        title="Yeniden Tara"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Seçilenleri Sil ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Success Message */}
            {result && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">
                    <div className="font-bold flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        İşlem Başarılı
                    </div>
                    <div>{result.deleted_count} adet takvim silindi.</div>
                    {result.errors?.length > 0 && (
                        <div className="mt-2 text-red-600">
                            <strong>Hatalar:</strong>
                            <ul className="list-disc list-inside text-xs">
                                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 w-[50px] text-center">
                                <input
                                    type="checkbox"
                                    checked={calendars.length > 0 && selectedIds.length === calendars.length}
                                    onChange={toggleSelectAll}
                                    disabled={loading || calendars.length === 0}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-4 py-3">Takvim Adı</th>
                            <th className="px-4 py-3">Yıl</th>
                            <th className="px-4 py-3">Kayıtlı Personel</th>
                            <th className="px-4 py-3">Oluşturulma Tarihi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && calendars.length === 0 && (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-400">Taranıyor...</td></tr>
                        )}
                        {!loading && calendars.length === 0 && (
                            <tr><td colSpan="5" className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
                                <ShieldCheckIcon className="w-12 h-12 text-gray-200" />
                                <div>Temiz! Gereksiz takvim bulunamadı.</div>
                            </td></tr>
                        )}
                        {calendars.map(cal => (
                            <tr key={cal.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(cal.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(p => [...p, cal.id]);
                                            else setSelectedIds(p => p.filter(id => id !== cal.id));
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-4 py-3 font-mono text-gray-700 font-medium">{cal.name}</td>
                                <td className="px-4 py-3 text-gray-500">{cal.year}</td>
                                <td className="px-4 py-3">
                                    {cal.employee_count > 0 ? (
                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">
                                            {cal.employee_count} Kişi
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs italic">Kullanılmıyor</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{cal.created_at || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-xs text-gray-400 text-right">
                Toplam {calendars.length} adet "junk" potansiyeli taşıyan takvim bulundu.
            </div>
        </div>
    );
}

function DataAuditTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('ALL'); // ALL, CRITICAL, WARNING

    useEffect(() => {
        loadAudit();
    }, []);

    const loadAudit = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/data-audit/');
            setData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = data?.employees?.filter(emp => {
        if (filter === 'ALL') return true;
        return emp.status === filter;
    }) || [];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'CRITICAL': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">KRİTİK EKSİK</span>;
            case 'WARNING': return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">UYARI</span>;
            case 'OK': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">TAMAM</span>;
            default: return null;
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
                        Veri Denetimi ve Bütünlük Raporu
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Tüm çalışanların kritik veri alanlarını (İşe Giriş Tarihi, Email, TC vb.) tarar ve eksikleri raporlar.
                    </p>
                </div>
                <button
                    onClick={loadAudit}
                    className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
                    title="Yenile"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {['ALL', 'CRITICAL', 'WARNING', 'OK'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {f === 'ALL' ? 'Tümü' : f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3">Durum</th>
                            <th className="px-4 py-3">Personel</th>
                            <th className="px-4 py-3">Departman & Pozisyon</th>
                            <th className="px-4 py-3">İşe Giriş Tarihi</th>
                            <th className="px-4 py-3">Email & Kullanıcı</th>
                            <th className="px-4 py-3">Eksik Alanlar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">Veriler taranıyor...</td></tr>
                        )}
                        {!loading && filteredEmployees.length === 0 && (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">Kriterlere uygun kayıt bulunamadı.</td></tr>
                        )}
                        {!loading && filteredEmployees.map(emp => (
                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">{getStatusBadge(emp.status)}</td>
                                <td className="px-4 py-3">
                                    <div className="font-bold text-gray-800">{emp.name}</div>
                                    <div className="text-xs text-gray-400 font-mono">{emp.employee_code}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-xs">
                                        <span className="block font-medium">{emp.department}</span>
                                        <span className="text-gray-500">{emp.job_position}</span>
                                    </div>
                                </td>
                                <td className={`px-4 py-3 font-mono text-xs ${!emp.hired_date ? 'text-red-600 font-bold bg-red-50' : 'text-gray-600'}`}>
                                    {emp.hired_date || 'EKSİK'}
                                </td>
                                <td className="px-4 py-3 text-xs">
                                    <div className={!emp.email ? 'text-red-600 font-bold' : ''}>{emp.email || 'NO EMAIL'}</div>
                                    <div className={!emp.has_user ? 'text-amber-600' : 'text-green-600'}>
                                        {emp.has_user ? `User: ${emp.username}` : 'No User Account'}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {emp.missing_fields.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {emp.missing_fields.map(f => (
                                                <span key={f} className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-200">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-green-500 text-xs font-bold flex items-center gap-1">
                                            <CheckCircleIcon className="w-4 h-4" /> Tamam
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-xs text-gray-400 text-right">
                Toplam {data?.total_scanned || 0} personel tarandı.
            </div>
        </div>
    );
}

function StressTestTab() {
    const [isRunning, setIsRunning] = useState(false);
    const [activeTest, setActiveTest] = useState(null);
    const [logs, setLogs] = useState([]);
    const consoleEndRef = useRef(null);

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const startTest = async (endpoint, testName) => {
        setIsRunning(true);
        setActiveTest(testName);
        setLogs([`> ${testName} başlatılıyor...`, '> Async Task kuyruğa alınıyor...']);

        try {
            const startRes = await api.post(`/system/health-check/${endpoint}/`);
            if (startRes.data.error) throw new Error(startRes.data.error);

            const taskId = startRes.data.task_id;
            if (!taskId) throw new Error("Task ID alınamadı.");

            setLogs(prev => [...prev, `> Görev Kuyruğa Alındı: ${taskId}`, '> Bekleniyor...']);

            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/system/health-check/get_stress_test_status/?task_id=${taskId}`);
                    const { state, logs: remoteLogs, report, error } = statusRes.data;

                    if (state === 'PROGRESS' && remoteLogs) {
                        const formattedLogs = remoteLogs.map(l => {
                            if (typeof l === 'object') {
                                return `[${l.time}] ${l.message} ${l.details ? '(' + l.details + ')' : ''}`;
                            }
                            return l;
                        });
                        setLogs(formattedLogs);
                    }

                    if (state === 'SUCCESS') {
                        clearInterval(pollInterval);

                        // Show all runner logs from final report (covers fast-finish case where PROGRESS was never polled)
                        if (report?.logs && report.logs.length > 0) {
                            const formattedLogs = report.logs.map(l => {
                                if (typeof l === 'object') {
                                    return `[${l.time}] ${l.message} ${l.details ? '(' + l.details + ')' : ''}`;
                                }
                                return l;
                            });
                            setLogs(formattedLogs);
                        }

                        setLogs(prev => [...prev, '', `> TEST TAMAMLANDI: ${report?.summary || 'Sonuç yok'}`]);

                        if (report?.results && report.results.length > 0) {
                            const resultLines = report.results.map(r => {
                                const icon = r.status === 'PASS' ? '✅' : (r.status === 'FAIL' ? '❌' : '⚠️');
                                return `${icon} [#${r.id}] ${r.desc} ... ${r.status}${r.details ? ' (' + r.details + ')' : ''}`;
                            });
                            setLogs(prev => [...prev, '--- SONUÇLAR ---', ...resultLines]);
                        }

                        setIsRunning(false);
                        setActiveTest(null);
                    } else if (state === 'FAILURE') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> KRİTİK HATA: ${error}`]);
                        setIsRunning(false);
                        setActiveTest(null);
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 1000);

        } catch (error) {
            setLogs(prev => [...prev, `> BAŞLATMA HATASI: ${error.message}`]);
            setIsRunning(false);
            setActiveTest(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Control Panel */}
            <div className="col-span-1 space-y-4">
                {/* Attendance Stress Test */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-base font-bold text-gray-800 mb-1">Puantaj Stres Testi</h3>
                    <p className="text-gray-400 text-xs mb-3">150+ senaryo ile puantaj motorunu test eder</p>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                        <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                            <li>Vardiya Toleransları (Snapping)</li>
                            <li>Otomatik Mola Kesintileri</li>
                            <li>Gece Vardiyası (Midnight Wrap)</li>
                            <li>Otomatik Mesai Bölme (Auto-Split)</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => startTest('run_comprehensive_stress_test', 'Puantaj Stres Testi')}
                        disabled={isRunning}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}
                        `}
                    >
                        {activeTest === 'Puantaj Stres Testi' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayCircleIcon className="w-4 h-4" />}
                        {activeTest === 'Puantaj Stres Testi' ? 'ÇALIŞIYOR...' : 'PUANTAJ TESTİ'}
                    </button>
                </div>

                {/* Production Readiness Test */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200">
                    <h3 className="text-base font-bold text-gray-800 mb-1">Üretim Hazırlık Testi</h3>
                    <p className="text-gray-400 text-xs mb-3">Tüm sistemleri kapsamlı test eder (production ready?)</p>

                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 mb-4">
                        <ul className="text-xs text-emerald-700 space-y-0.5 list-disc list-inside">
                            <li>Kimlik Doğrulama & Şifre Değiştirme</li>
                            <li>İzin / Mesai / Kartsız Giriş Talepleri</li>
                            <li>Onay, Red, İptal, Override Akışları</li>
                            <li>Vekalet Sistemi (Vekil Onay + Yönetici Ezme)</li>
                            <li>Güvenli Geçiş (Fernet Şifreleme)</li>
                            <li>Karar Geçmişi & Bildirim Zinciri</li>
                            <li>Aylık Özet & Hedef Hesaplama</li>
                            <li>Veri Temizliği & Bütünlük Doğrulama</li>
                        </ul>
                    </div>

                    <button
                        onClick={() => startTest('run_production_readiness_test', 'Üretim Hazırlık Testi')}
                        disabled={isRunning}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'}
                        `}
                    >
                        {activeTest === 'Üretim Hazırlık Testi' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayCircleIcon className="w-4 h-4" />}
                        {activeTest === 'Üretim Hazırlık Testi' ? 'ÇALIŞIYOR...' : 'ÜRETİM TESTİ'}
                    </button>
                </div>
            </div>

            {/* Console Output */}
            <div className="col-span-2">
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col h-[700px]">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">
                            root@mega-engine:~# {activeTest ? `./run_${activeTest === 'Puantaj Stres Testi' ? 'stress' : 'readiness'}_test.sh` : 'awaiting...'}
                        </span>
                        <div className="flex gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500/80'}`}></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm text-green-400 space-y-1">
                        {logs.length === 0 && (
                            <div className="text-gray-600 select-none">
                                // Bekleniyor... Test başlatmak için soldaki butonlardan birini tıklayın.
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className={`
                                ${log.includes('❌') || log.includes('FAIL') || log.includes('HATA') ? 'text-red-400' : ''}
                                ${log.includes('⚠') || log.includes('WARN') ? 'text-yellow-400' : ''}
                                ${log.includes('PHASE') || log.includes('═══') || log.includes('╔') || log.includes('╚') ? 'text-cyan-400 font-bold' : ''}
                                ${log.includes('PRODUCTION READY') ? 'text-emerald-400 font-bold text-base' : ''}
                                ${log.includes('SORUN TESPİT') ? 'text-red-400 font-bold text-base' : ''}
                            `}>
                                {log}
                            </div>
                        ))}
                        <div ref={consoleEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ServiceLogsTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/service-logs/');
            setLogs(res.data.results || res.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
            <div className="flex justify-between p-4 border-b border-gray-100 items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-800">Servis Hareket Dökümü</h3>
                <button onClick={loadLogs} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition" title="Yenile">
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Zaman</th>
                            <th className="px-6 py-3">Level</th>
                            <th className="px-6 py-3">Bileşen</th>
                            <th className="px-6 py-3">Mesaj</th>
                            <th className="px-6 py-3">Detay</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-3 text-gray-500 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLevelBadge(log.level)}`}>{log.level}</span>
                                </td>
                                <td className="px-6 py-3 text-indigo-600 font-medium text-xs">{log.component}</td>
                                <td className="px-6 py-3 text-gray-800">{log.message}</td>
                                <td className="px-6 py-3 text-xs text-gray-500 font-mono max-w-xs truncate" title={JSON.stringify(log.details)}>{log.details ? JSON.stringify(log.details) : '-'}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">Kayıt bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SecurityTab() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <ShieldCheckIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Güvenlik Durumu</h3>
                        <p className="text-gray-500 text-sm">Katman 1 Koruma Aktif</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
                        <span className="text-gray-600">API Yetkilendirme</span>
                        <span className="text-green-600 font-bold">AKTİF (JWT)</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 rounded text-sm">
                        <span className="text-gray-600">Kapı Şifreleme (Fernet)</span>
                        <span className="text-green-600 font-bold">AKTİF</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


function TestSuiteTab() {
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState(null);
    const [error, setError] = useState(null);

    const runTests = async () => {
        setRunning(true);
        setOutput("Testler başlatılıyor... Lütfen bekleyiniz (Bu işlem 30-60 saniye sürebilir)...\n");
        setError(null);
        try {
            const res = await api.post('/system/health-check/run_regression_tests/');
            // Append result
            setOutput(res.data.logs || "Log çıktısı yok.");
            if (!res.data.success) {
                setError(`Testler Hata ile Tamamlandı (Exit Code: ${res.data.exit_code})`);
            }
        } catch (e) {
            setError(e.response?.data?.error || e.message);
            setOutput(prev => prev + `\nFATAL ERROR: ${e.message}`);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Tam Kapsamlı Sistem Testi</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Backend üzerindeki `comprehensive_test.py` dosyasını çalıştırır.
                    Şunları kontrol eder:
                </p>
                <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside mb-6">
                    <li>Organizasyon & Yetkiler</li>
                    <li>Token & Auth Sistemi</li>
                    <li>Puantaj Motoru (Giriş/Çıkış)</li>
                    <li>İzin Talepleri & Onay Mekanizması</li>
                    <li>Escalation (Zaman Aşımı) Kuralları</li>
                    <li>Önemli: Regression Testleri (Yeni Bug Fixler)</li>
                </ul>

                <button
                    onClick={runTests}
                    disabled={running}
                    className={`w-full py-3 px-4 rounded-lg font-bold shadow-sm transition-all flex justify-center items-center gap-2
                        ${running
                            ? 'bg-gray-100 text-gray-400 cursor-wait'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}
                    `}
                >
                    {running ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                    {running ? 'TESTLER KOŞULUYOR...' : 'TESTLERİ BAŞLAT'}
                </button>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">root@mega-engine:~# python comprehensive_test.py</span>
                        {error && <span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">{error}</span>}
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm text-gray-300 space-y-1">
                        {!output && !running && (
                            <div className="text-gray-600 select-none flex flex-col items-center justify-center h-full gap-2">
                                <CommandLineIcon className="w-12 h-12 opacity-20" />
                                <span>Çıktı bekleniyor...</span>
                            </div>
                        )}
                        {output && (
                            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-green-400">
                                {output}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SyntheticDataTab() {
    const [isRunning, setIsRunning] = useState(false);
    const [wipeExisting, setWipeExisting] = useState(true);
    const [logs, setLogs] = useState([]);
    const consoleEndRef = useRef(null);

    // Auto-scroll console
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const runGenerator = async () => {
        if (!confirm("DİKKAT: Bu işlem seçime bağlı olarak mevcut verileri silebilir ve sisteme binlerce rastgele kayıt ekler. Devam etmek istiyor musunuz?")) return;

        setIsRunning(true);
        setLogs(['> Başlatılıyor...', '> API İsteği gönderiliyor...']);

        try {
            // 1. Start Task
            const startRes = await api.post('/system/health-check/run_synthetic_data_generation/', { wipe_existing: wipeExisting });
            if (startRes.data.error) throw new Error(startRes.data.error);

            const taskId = startRes.data.task_id;
            setLogs(prev => [...prev, `> Görev Kuyruğa Alındı: ${taskId}`, '> İşleniyor...']);

            // 2. Poll Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/system/health-check/get_synthetic_data_status/?task_id=${taskId}`);
                    const { state, logs: remoteLogs, report, error } = statusRes.data;

                    if (state === 'PROGRESS' && remoteLogs) {
                        // Use remote logs as source of truth for the list
                        const formattedLogs = remoteLogs.map(l => l);
                        setLogs(formattedLogs);
                    }

                    if (state === 'SUCCESS') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> ✅ İŞLEM BAŞARILI.`, `> Özet: ${report.summary}`]);
                        setIsRunning(false);
                    } else if (state === 'FAILURE') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> ❌ KRİTİK HATA: ${error}`]);
                        setIsRunning(false);
                    }

                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 1000);

        } catch (error) {
            setLogs(prev => [...prev, `> BAŞLATMA HATASI: ${error.message}`]);
            setIsRunning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Control Panel */}
            <div className="col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Sentetik Veri Üretimi</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Test ortamı için geçmişe yönelik rastgele veri üretir.
                    </p>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6">
                        <h4 className="text-xs font-bold text-purple-800 uppercase mb-2">Nasıl Çalışır?</h4>
                        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                            <li>Personelin İşe Giriş Tarihinden itibaren başlar.</li>
                            <li>Hafta içi rastgele giriş/çıkış saatleri üretir.</li>
                            <li>Arada rastgele izin ve devamsızlık ekler.</li>
                            <li>Tüm çalışanlar için uygulanır.</li>
                        </ul>
                    </div>

                    <div className="flex items-center gap-2 mb-6 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                        <input
                            type="checkbox"
                            id="wipe"
                            checked={wipeExisting}
                            onChange={e => setWipeExisting(e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded"
                        />
                        <label htmlFor="wipe" className="font-bold select-none cursor-pointer">
                            ÖNCE MEVCUT VERİLERİ SİL (Tavsiye)
                        </label>
                    </div>

                    <button
                        onClick={runGenerator}
                        disabled={isRunning}
                        className={`w-full py-3 px-4 rounded-lg font-bold shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'}
                        `}
                    >
                        {isRunning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                        {isRunning ? 'ÜRETİLİYOR...' : 'VERİ ÜRETİMİ BAŞLAT'}
                    </button>
                </div>
            </div>

            {/* Console Output */}
            <div className="col-span-2">
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">root@mega-engine:~# ./generate_synthetic_data.py</span>
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm text-purple-300 space-y-1">
                        {logs.length === 0 && (
                            <div className="text-gray-600 select-none">
                                // Bekleniyor...
                            </div>
                        )}
                        {logs.map((log, i) => {
                            let content = log;
                            if (typeof log === 'object' && log !== null) {
                                content = JSON.stringify(log);
                            }
                            return <div key={i} className="whitespace-pre-wrap break-words">{content}</div>;
                        })}
                        <div ref={consoleEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}


function MaintenanceTab() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [logs, setLogs] = useState([]);

    const handleRunFix = async () => {
        if (!confirm("Bu işlem tüm personelin 1 Ocak 2026'dan bugüne kadar olan puantaj verilerini YENİ MOLA MANTIĞINA göre tekrar hesaplayacaktır.\n\nİşlem uzun sürebilir ve canlı log akışı başlayacaktır. Devam etmek istiyor musunuz?")) return;

        setLoading(true);
        setLogs([]);
        setResult(null);

        try {
            // Get token from localStorage or sessionStorage
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            const headers = {
                'Content-Type': 'application/json',
            };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/system/health-check/fix_retroactive_breaks/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({})
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''));
                            if (data.message) {
                                setLogs(prev => [...prev, {
                                    time: new Date().toLocaleTimeString(),
                                    message: data.message,
                                    success: data.success !== false
                                }]);
                            }
                            if (data.done) {
                                setLoading(false);
                            }
                        } catch (e) {
                            console.error("Parse Error", e);
                        }
                    }
                }
            }
        } catch (e) {
            alert("Hata: " + e.message);
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-6 text-indigo-700 bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                <WrenchScrewdriverIcon className="w-10 h-10" />
                <div>
                    <h3 className="text-xl font-bold">Sistem Bakım Araçları</h3>
                    <p className="text-sm opacity-80">Otomatik düzeltme ve veri onarım araçları.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="border border-indigo-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-800 text-lg mb-2 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-indigo-600" />
                        Geçmişe Yönelik Mola & Eksik Çalışma Düzeltmesi
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">
                        Bu araç, sistemdeki yeni <strong>"Kullanılan Mola Kadar Kredi"</strong> mantığını tüm geçmiş kayıtlara uygular.
                        <br />
                        - Boşluk süresi mola hakkını (30dk) aşıyorsa, aşan kısım Eksik Mesaiye yansıtılır.
                        <br />
                        - "Mola" sütunu sadece kullanılan yasal hakkı gösterir.
                    </p>

                    <button
                        onClick={handleRunFix}
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                        {loading ? 'Düzeltme Uygulanıyor...' : 'Düzeltme İşlemini Başlat'}
                    </button>

                    {/* LOGS */}
                    {(logs.length > 0 || result) && (
                        <div className="mt-6 bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 max-h-[300px] overflow-y-auto">
                            <div className="text-white font-bold border-b border-gray-700 pb-2 mb-2 sticky top-0 bg-gray-900">
                                İşlem Logları:
                            </div>
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                                    <span className="text-gray-500 mr-2">[{log.time}]</span>
                                    <span className={log.success === false ? 'text-red-400' : 'text-green-400'}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            {result && (
                                <div className="mt-4 pt-4 border-t border-gray-700 text-yellow-400 font-bold">
                                    SONUÇ: {result.message}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- UTILS ---

function getLevelBadge(level) {
    if (level === 'ERROR') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'WARNING') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
}
