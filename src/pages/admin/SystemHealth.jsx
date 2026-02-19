import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

// Icons
import {
    ServerStackIcon,
    CpuChipIcon,
    ClockIcon,
    ShieldCheckIcon,
    PlayCircleIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    CommandLineIcon,
    TrashIcon,
    KeyIcon,
    SparklesIcon,
    ClipboardDocumentCheckIcon,
    WrenchScrewdriverIcon, // Added
    ChartBarIcon // Added for Resource Monitor
} from '@heroicons/react/24/outline';

import ResourceMonitor from '../../components/ResourceMonitor'; // Import Component

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


function PermissionsTab() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('health'); // 'health' or 'matrix'

    useEffect(() => {
        if (viewMode === 'health') runScan();
    }, [viewMode]);

    const runScan = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/check-permissions/');
            setReport(res.data);
        } catch (e) {
            console.error("Scan error", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-center bg-gray-100 p-1 rounded-lg w-fit mx-auto">
                <button
                    onClick={() => setViewMode('health')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'health' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Sağlık Kontrolü
                </button>
                <button
                    onClick={() => setViewMode('matrix')}
                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Detaylı Yetki Matrisi
                </button>
            </div>

            {viewMode === 'health' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                    {/* LEFT: STATUS CARD - Existing Logic */}
                    {loading && !report ? (
                        <div className="col-span-2 p-12 text-center text-gray-500 animate-pulse">Yetki taraması yapılıyor...</div>
                    ) : (
                        <PermissionHealthView report={report} loading={loading} runScan={runScan} />
                    )}
                </div>
            ) : (
                <PermissionMatrixView />
            )}
        </div>
    );
}

function PermissionHealthView({ report, loading, runScan }) {
    if (!report) return null;
    return (
        <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${report?.status === 'healthy' ? 'bg-green-50' : 'bg-red-50'}`}>
                            <KeyIcon className={`w-8 h-8 ${report?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Yetki Sistemi Sağlığı</h3>
                            <p className={`text-sm font-bold ${report?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                                {report?.status === 'healthy' ? 'VERİTABANI KATEGORİLERİ DOĞRU' : 'KATEGORİ HATASI MEVCUT'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={runScan}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
                        title="Taramayı Yenile"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-gray-50 rounded text-sm items-center">
                        <span className="text-gray-600">Toplam Tanımlı Yetki</span>
                        <span className="text-gray-900 font-bold text-lg">{report?.total || 0}</span>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Kategori Dağılımı</h4>
                        <div className="space-y-2">
                            {report?.breakdown?.map((item, idx) => {
                                let colorClass = 'bg-gray-300';
                                if (item.category === 'MENU' || item.category === 'PAGE') colorClass = 'bg-blue-500';
                                else if (item.category === 'ACTION') colorClass = 'bg-orange-400';
                                else if (item.category === 'APPROVAL') colorClass = 'bg-purple-500';
                                else if (item.category === 'SYSTEM') colorClass = 'bg-slate-700';
                                else if (item.category === 'OTHER') colorClass = 'bg-red-500';

                                return (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-600 flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>
                                            {item.category || 'TANIMSIZ'}
                                        </span>
                                        <span className="font-mono font-bold text-gray-700">{item.count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ISSUES ALERT */}
                    {report?.issues?.length > 0 && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-lg mt-4">
                            <h4 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
                                <ExclamationTriangleIcon className="w-4 h-4" /> Tespit Edilen Sorunlar
                            </h4>
                            <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                {report.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: DETAILS */}
            <div className="space-y-6">
                {/* 1. Menu Permission Check */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-2">Menü Erişim Yetkileri (Frontend)</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        "Yetkilendirme ve Roller" sayfasında "Menü Erişimi" sekmesinde görünecek yetkiler.
                    </p>

                    {report?.page_count > 0 ? (
                        <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-100">
                            <CheckCircleIcon className="w-6 h-6" />
                            <div>
                                <div className="font-bold">Doğrulanmış {report.page_count} Adet Yetki Mevcut</div>
                                <div className="text-xs opacity-80">"PAGE" ve diğer kategorilerde kayıtlı.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-lg border border-red-100">
                            <XCircleIcon className="w-6 h-6" />
                            <div>
                                <div className="font-bold">Kategori Hatası!</div>
                                <div className="text-xs opacity-80">Menü yetkileri veritabanında "MENU" olarak etiketlenmemiş.</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Uncategorized */}
                {report?.uncategorized_count > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-md font-bold text-gray-800">Kategorisiz Yetkiler (OTHER)</h3>
                                <p className="text-xs text-gray-500">
                                    Bu yetkiler "Diğer" kategorisinde kalmış olabilir.
                                </p>
                            </div>
                            <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-600">
                                {report.uncategorized_count} Adet
                            </span>
                        </div>

                        <div className="bg-gray-50 p-0 rounded-lg border border-gray-200 overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100 text-gray-500 font-semibold sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 border-b">Kod (Code)</th>
                                            <th className="px-4 py-2 border-b">İsim (Name)</th>
                                            <th className="px-4 py-2 border-b">Açıklama</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(report.uncategorized_list || report.uncategorized_samples || []).map((u, i) => (
                                            <tr key={i} className="hover:bg-white transition-colors">
                                                <td className="px-4 py-2 font-mono text-indigo-600">{u.code}</td>
                                                <td className="px-4 py-2 font-medium text-gray-700">{u.name}</td>
                                                <td className="px-4 py-2 text-gray-500 italic">{u.description || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-gray-100 px-4 py-2 text-[10px] text-gray-400 text-center border-t border-gray-200">
                                Tüm liste gösteriliyor.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function PermissionMatrixView() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState('users'); // users, roles, perms
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('ALL');
    const [filterRole, setFilterRole] = useState('ALL');
    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [expandedUser, setExpandedUser] = useState(null);

    useEffect(() => {
        fetchMatrix();
    }, []);

    const fetchMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/health-check/permission-matrix/');
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return <div className="p-12 text-center text-gray-500 animate-pulse">Matris verisi yükleniyor...</div>;
    if (!data) return null;

    // Derive unique departments and roles for filters
    const departments = [...new Set(data.users.map(u => u.department))].filter(Boolean).sort();
    const allRoleKeys = [...new Set(data.users.flatMap(u => u.role_keys || []))].sort();

    // Frontend permission codes that are actually checked in routes/sidebar
    const frontendPagePerms = [
        'PAGE_EMPLOYEES', 'PAGE_ORG_CHART', 'PAGE_WORK_SCHEDULES', 'PAGE_REPORTS',
        'PAGE_SYSTEM_HEALTH', 'PAGE_MEAL_ORDERS', 'PAGE_DATA_MANAGEMENT', 'PAGE_DEBUG', 'PAGE_PROGRAM_MANAGEMENT'
    ];
    const frontendFeaturePerms = [
        'ACTION_ORG_CHART_EDIT', 'FEATURE_BREAK_ANALYSIS', 'SYSTEM_FULL_ACCESS',
        'APPROVAL_LEAVE', 'APPROVAL_OVERTIME', 'APPROVAL_CARDLESS_ENTRY', 'APPROVAL_EXTERNAL_TASK'
    ];
    const allCriticalPerms = [...frontendPagePerms, ...frontendFeaturePerms];

    // Detect issues per user
    const getUserIssues = (user) => {
        const issues = [];
        if (user.is_superuser) return issues; // superuser has everything

        // Check: user has no roles at all
        if (!user.roles || user.roles.length === 0) {
            issues.push({ type: 'warning', msg: 'Hiç rolü yok' });
        }

        // Check: user has no page permissions (can't see anything in sidebar)
        const userPagePerms = frontendPagePerms.filter(p => user.permissions?.includes(p));
        if (userPagePerms.length === 0 && !user.permissions?.includes('SYSTEM_FULL_ACCESS')) {
            issues.push({ type: 'error', msg: 'Hiçbir sayfa yetkisi yok (menü tamamen boş)' });
        }

        // Check: excluded permissions exist
        if (user.excluded_permissions && user.excluded_permissions.length > 0) {
            issues.push({ type: 'info', msg: `${user.excluded_permissions.length} hariç tutulan yetki` });
        }

        // Check: direct permissions exist (unusual)
        if (user.direct_permissions && user.direct_permissions.length > 0) {
            issues.push({ type: 'info', msg: `${user.direct_permissions.length} direkt atanmış yetki` });
        }

        return issues;
    };

    // Filter users
    const filteredUsers = data.users.filter(u => {
        if (searchTerm && !u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) && !u.username.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterDept !== 'ALL' && u.department !== filterDept) return false;
        if (filterRole !== 'ALL' && !(u.role_keys || []).includes(filterRole)) return false;
        if (showOnlyIssues) {
            const issues = getUserIssues(u);
            if (issues.length === 0) return false;
        }
        return true;
    });

    // Category color mapping
    const catColor = (cat) => {
        const colors = {
            'PAGE': 'bg-blue-500', 'MENU': 'bg-blue-400', 'ACTION': 'bg-orange-400',
            'REQUEST': 'bg-amber-500', 'APPROVAL': 'bg-purple-500', 'SYSTEM': 'bg-slate-700',
            'FEATURE': 'bg-teal-500', 'ADMIN': 'bg-red-500', 'ACCOUNTING': 'bg-emerald-500',
            'HR_ORG': 'bg-pink-500', 'OTHER': 'bg-gray-400'
        };
        return colors[cat] || 'bg-gray-300';
    };

    const catBadgeColor = (cat) => {
        const colors = {
            'PAGE': 'bg-blue-50 text-blue-700 border-blue-200',
            'MENU': 'bg-blue-50 text-blue-600 border-blue-100',
            'ACTION': 'bg-orange-50 text-orange-700 border-orange-200',
            'REQUEST': 'bg-amber-50 text-amber-700 border-amber-200',
            'APPROVAL': 'bg-purple-50 text-purple-700 border-purple-200',
            'SYSTEM': 'bg-slate-100 text-slate-700 border-slate-300',
            'FEATURE': 'bg-teal-50 text-teal-700 border-teal-200',
            'ADMIN': 'bg-red-50 text-red-700 border-red-200',
            'ACCOUNTING': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
        return colors[cat] || 'bg-gray-100 text-gray-600 border-gray-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* View Selector */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <button
                    onClick={() => setActiveSection('users')}
                    className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all ${activeSection === 'users' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                >
                    Kullanıcı Bazlı Yetki Matrisi
                </button>
                <button
                    onClick={() => setActiveSection('roles')}
                    className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all ${activeSection === 'roles' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                >
                    Rol Tanımları
                </button>
                <button
                    onClick={() => setActiveSection('perms')}
                    className={`flex-1 p-3 rounded-lg border-2 font-bold text-sm transition-all ${activeSection === 'perms' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-transparent hover:bg-gray-50 text-gray-500'}`}
                >
                    Tüm Yetki Havuzu
                </button>
            </div>

            {/* USERS SECTION */}
            {activeSection === 'users' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
                        <input
                            type="text"
                            placeholder="Personel ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 min-w-[200px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                            <option value="ALL">Tüm Departmanlar</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                            <option value="ALL">Tüm Roller</option>
                            {allRoleKeys.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={showOnlyIssues} onChange={e => setShowOnlyIssues(e.target.checked)} className="rounded border-gray-300" />
                            Sadece Sorunlu
                        </label>
                        <span className="text-xs text-gray-400 ml-auto">{filteredUsers.length} / {data.users.length} kişi</span>
                    </div>

                    {/* User Cards */}
                    <div className="space-y-3">
                        {filteredUsers.map(u => {
                            const issues = getUserIssues(u);
                            const isExpanded = expandedUser === u.id;
                            const userPagePerms = frontendPagePerms.filter(p => u.is_superuser || u.permissions?.includes(p));
                            const userFeaturePerms = frontendFeaturePerms.filter(p => u.is_superuser || u.permissions?.includes(p));
                            const totalPerms = u.is_superuser ? data.permissions.length : (u.permissions?.length || 0);

                            return (
                                <div key={u.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${issues.some(i => i.type === 'error') ? 'border-red-200' : issues.some(i => i.type === 'warning') ? 'border-amber-200' : 'border-gray-100'}`}>
                                    {/* Header Row */}
                                    <div
                                        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                    >
                                        {/* Avatar */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${u.is_superuser ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-indigo-500 to-blue-600'}`}>
                                            {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>

                                        {/* Name & Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800">{u.full_name}</span>
                                                {u.is_superuser && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold border border-red-200">SUPERUSER</span>}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-3">
                                                <span>@{u.username}</span>
                                                <span className="text-slate-300">|</span>
                                                <span>{u.department}</span>
                                                <span className="text-slate-300">|</span>
                                                <span>{u.job_position}</span>
                                            </div>
                                        </div>

                                        {/* Roles */}
                                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                                            {u.roles.map(r => (
                                                <span key={r} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-bold">{r}</span>
                                            ))}
                                            {u.roles.length === 0 && <span className="text-xs text-slate-300 italic">Rol yok</span>}
                                        </div>

                                        {/* Perm Count */}
                                        <div className="text-center flex-shrink-0 w-16">
                                            <div className="text-2xl font-black text-slate-700">{u.is_superuser ? '∞' : totalPerms}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">Yetki</div>
                                        </div>

                                        {/* Issues */}
                                        <div className="flex-shrink-0 w-8">
                                            {issues.length > 0 ? (
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${issues.some(i => i.type === 'error') ? 'bg-red-100' : issues.some(i => i.type === 'warning') ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                                    <ExclamationTriangleIcon className={`w-4 h-4 ${issues.some(i => i.type === 'error') ? 'text-red-600' : issues.some(i => i.type === 'warning') ? 'text-amber-600' : 'text-blue-600'}`} />
                                                </div>
                                            ) : (
                                                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                                            )}
                                        </div>

                                        {/* Expand Arrow */}
                                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                                            {/* Issues List */}
                                            {issues.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {issues.map((issue, i) => (
                                                        <span key={i} className={`px-2 py-1 rounded text-xs font-bold border ${issue.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : issue.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                            {issue.msg}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Page Permissions Grid */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sayfa Erişimleri</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {frontendPagePerms.map(p => {
                                                        const has = u.is_superuser || u.permissions?.includes(p);
                                                        return (
                                                            <span key={p} className={`px-2 py-1 rounded text-[11px] font-mono border ${has ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>
                                                                {p.replace('PAGE_', '')}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Feature Permissions */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Özellik / Aksiyon Yetkileri</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {frontendFeaturePerms.map(p => {
                                                        const has = u.is_superuser || u.permissions?.includes(p);
                                                        return (
                                                            <span key={p} className={`px-2 py-1 rounded text-[11px] font-mono border ${has ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200 line-through'}`}>
                                                                {p}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Direct Permissions */}
                                            {u.direct_permissions && u.direct_permissions.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Direkt Atanmış Yetkiler (Role dışı)</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {u.direct_permissions.map(p => (
                                                            <span key={p} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-mono">{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Excluded Permissions */}
                                            {u.excluded_permissions && u.excluded_permissions.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Hariç Tutulan Yetkiler (Kara Liste)</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {u.excluded_permissions.map(p => (
                                                            <span key={p} className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[11px] font-mono line-through">{p}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Full Permission List */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                    Tüm Efektif Yetkiler ({u.is_superuser ? 'SINIRSIZ' : u.permissions?.length || 0})
                                                </h4>
                                                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                                                    {u.is_superuser ? (
                                                        <span className="text-xs text-red-600 font-bold">Superuser — tüm yetkiler bypass edilir</span>
                                                    ) : (u.permissions || []).sort().map(p => (
                                                        <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-mono border border-gray-200">{p}</span>
                                                    ))}
                                                    {!u.is_superuser && (!u.permissions || u.permissions.length === 0) && (
                                                        <span className="text-xs text-red-500 font-bold">HİÇ YETKİ YOK!</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ROLES SECTION */}
            {activeSection === 'roles' && (
                <div className="grid grid-cols-1 gap-6">
                    {data.roles.map(role => {
                        const usersWithRole = data.users.filter(u => (u.role_keys || []).includes(role.code));
                        return (
                            <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-purple-900 text-lg">{role.name}</h3>
                                        <div className="text-xs text-purple-600 font-mono flex items-center gap-2">
                                            {role.code}
                                            {role.inherits_from && role.inherits_from.length > 0 && (
                                                <span className="text-purple-400">← miras: {role.inherits_from.join(', ')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-purple-700 shadow-sm border border-purple-100">
                                            {role.permissions.length} Yetki
                                        </span>
                                        <span className="bg-purple-100 px-3 py-1 rounded-full text-xs font-bold text-purple-800">
                                            {usersWithRole.length} Kullanıcı
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions.sort().map(p => (
                                            <span key={p} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200 font-mono">{p}</span>
                                        ))}
                                        {role.permissions.length === 0 && <span className="text-gray-400 italic text-sm">Bu role tanımlı yetki yok.</span>}
                                    </div>
                                    {usersWithRole.length > 0 && (
                                        <div className="border-t border-gray-100 pt-3">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Bu role sahip kullanıcılar</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {usersWithRole.map(u => (
                                                    <span key={u.id} className="px-2 py-1 bg-slate-50 text-slate-700 rounded text-xs border border-slate-200">
                                                        {u.full_name} <span className="text-slate-400">({u.department})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* PERMISSIONS POOL SECTION */}
            {activeSection === 'perms' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-emerald-50 flex justify-between items-center">
                        <h3 className="font-bold text-emerald-900">Tüm Yetki Tanımları (Veritabanı)</h3>
                        <span className="text-xs text-emerald-700 font-bold">{data.permissions.length} Adet</span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 bg-gray-50">Kategori</th>
                                    <th className="px-4 py-3 bg-gray-50">Kod (Code)</th>
                                    <th className="px-4 py-3 bg-gray-50">İsim</th>
                                    <th className="px-4 py-3 bg-gray-50">Açıklama</th>
                                    <th className="px-4 py-3 bg-gray-50 text-center">Kullanan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.permissions.map(p => {
                                    const usersWithPerm = data.users.filter(u => u.is_superuser || (u.permissions && u.permissions.includes(p.code)));
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catBadgeColor(p.category)}`}>
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-indigo-600 text-xs">{p.code}</td>
                                            <td className="px-4 py-2 font-medium text-gray-700">{p.name}</td>
                                            <td className="px-4 py-2 text-gray-500 text-xs">{p.description}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${usersWithPerm.length === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {usersWithPerm.length}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function DashboardTab({ stats, refresh, loading }) {
    const [recalcConsoleOpen, setRecalcConsoleOpen] = useState(false);
    const [recalcLogs, setRecalcLogs] = useState([]);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [runtimeConfig, setRuntimeConfig] = useState({});
    const [configLoading, setConfigLoading] = useState(true);
    const [systemSettings, setSystemSettings] = useState(null);
    const [startDateInput, setStartDateInput] = useState('');
    const [startDateSaving, setStartDateSaving] = useState(false);

    useEffect(() => {
        api.get('/system/health-check/get_runtime_config/')
            .then(res => setRuntimeConfig(res.data))
            .catch(() => {})
            .finally(() => setConfigLoading(false));

        // Fetch system settings (start date)
        api.get('/settings/').then(res => {
            const data = Array.isArray(res.data) ? res.data[0] : (res.data.results?.[0] || res.data);
            if (data) {
                setSystemSettings(data);
                setStartDateInput(data.attendance_start_date || '');
            }
        }).catch(() => {});
    }, []);

    const saveStartDate = async () => {
        if (!startDateInput) return;
        if (!window.confirm(`Sistem başlangıç tarihi "${startDateInput}" olarak ayarlanacak.\n\nBu tarihten önceki tüm puantaj verileri hesaplamalarda dikkate alınmayacaktır.\n\nOnaylıyor musunuz?`)) return;
        setStartDateSaving(true);
        try {
            const settingsId = systemSettings?.id;
            if (settingsId) {
                await api.patch(`/settings/${settingsId}/`, { attendance_start_date: startDateInput });
            } else {
                await api.post('/settings/', { attendance_start_date: startDateInput });
            }
            setSystemSettings(prev => ({ ...prev, attendance_start_date: startDateInput }));
            alert('Sistem başlangıç tarihi kaydedildi.');
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setStartDateSaving(false);
        }
    };

    const clearStartDate = async () => {
        if (!window.confirm('Sistem başlangıç tarihi kaldırılacak. Onaylıyor musunuz?')) return;
        setStartDateSaving(true);
        try {
            const settingsId = systemSettings?.id;
            if (settingsId) {
                await api.patch(`/settings/${settingsId}/`, { attendance_start_date: null });
            }
            setSystemSettings(prev => ({ ...prev, attendance_start_date: null }));
            setStartDateInput('');
            alert('Sistem başlangıç tarihi kaldırıldı.');
        } catch (e) {
            alert('Hata: ' + (e.response?.data?.error || e.message));
        } finally {
            setStartDateSaving(false);
        }
    };

    const toggleConfig = async (key, value) => {
        try {
            await api.post('/system/health-check/toggle_runtime_config/', { key, value });
            setRuntimeConfig(prev => ({ ...prev, [key]: value }));
        } catch (e) {
            console.error('Config toggle error:', e);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Toplam Çalışan" value={stats?.total_employees} icon={CpuChipIcon} color="blue" loading={loading} />
                <KPICard title="Aktif Çalışan" value={stats?.active_employees} icon={CheckCircleIcon} color="green" loading={loading} />
                <KPICard title="Bugünkü Kayıt" value={stats?.attendance_today} icon={ClockIcon} color="indigo" loading={loading} />
                <KPICard title="Bekleyen İzin" value={stats?.pending_leave_requests} icon={ExclamationTriangleIcon} color="orange" loading={loading} />
            </div>

            {/* Runtime Config */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CpuChipIcon className="w-4 h-4 text-gray-400" />
                    Sistem Ayarlari
                </h3>
                <div className="space-y-5">
                    {/* Toggle: Servis Logları */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={runtimeConfig.service_logs_enabled || false}
                                disabled={configLoading}
                                onChange={e => toggleConfig('service_logs_enabled', e.target.checked)}
                            />
                            <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Servis Loglari</span>
                            <p className="text-xs text-gray-400">Acildiginda puantaj motorunun detayli loglarini DB'ye yazar. Servis Kontrol sayfasinda gorunur.</p>
                        </div>
                    </label>

                    {/* Sistem Başlangıç Tarihi */}
                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg mt-0.5">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-800">Sistem Baslangic Tarihi</h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    Bu tarih sistemin canli olarak kullanilmaya basladigi gunu belirtir.
                                    Bu tarihten onceki puantaj verileri hesaplamalarda dikkate alinmaz.
                                </p>
                                <div className="flex items-center gap-3 mt-3">
                                    <input
                                        type="date"
                                        value={startDateInput}
                                        onChange={e => setStartDateInput(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                    />
                                    <button
                                        onClick={saveStartDate}
                                        disabled={startDateSaving || !startDateInput}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {startDateSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    {systemSettings?.attendance_start_date && (
                                        <button
                                            onClick={clearStartDate}
                                            disabled={startDateSaving}
                                            className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            Kaldir
                                        </button>
                                    )}
                                </div>
                                {systemSettings?.attendance_start_date && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-xs font-medium text-green-700">
                                            Aktif: {new Date(systemSettings.attendance_start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                {!systemSettings?.attendance_start_date && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                        <span className="text-xs text-gray-400">Henuz ayarlanmadi</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Panel */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrashIcon className="w-5 h-5 text-gray-400" />
                    Veri Temizliği ve Yönetimi (Tehlikeli İşlemler)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionButton
                        label="Hata Taraması (Regression Scan)"
                        description="Sistemde bilinen hataların (False Pending, Ghost Records) kalıntılarını tarar."
                        hazard={false}
                        onClick={async () => {
                            try {
                                const res = await api.get('/system/health-check/detect_regression_artifacts/');
                                const rep = res.data.report;
                                const msg = `TRAMA SONUCU (${res.data.status.toUpperCase()}):\n\n` +
                                    `False Pending: ${rep.false_pending_count}\n` +
                                    `Ghost Records: ${rep.ghost_record_count}\n\n` +
                                    (rep.details.length > 0 ? "Detaylar:\n" + rep.details.join('\n') : "Sistem Temiz.");
                                alert(msg);
                            } catch (e) {
                                alert("Tarama Hatası: " + (e.response?.data?.error || e.message));
                            }
                        }}
                    />

                    <ActionButton
                        label="Sistemi Yeniden Hesapla (Detaylı Log)"
                        description="Mevcut giriş/çıkış verilerini koruyarak tüm puantaj hesaplamalarını yeniler ve işlem loglarını döker."
                        hazard={false}
                        onClick={() => setRecalcConsoleOpen(true)}
                    />

                    <ActionButton
                        label="Molaları Yeniden Oluştur (Otomatik Kesinti)"
                        description="Belirtilen tarih aralığındaki tüm kayıtları tarar ve personelin bağlı olduğu takvimin mola kurallarına göre (örn: 30dk veya 60dk) otomatik düşüm yapar."
                        hazard={false}
                        onClick={async () => {
                            const start = prompt("Başlangıç Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 8) + '01');
                            if (!start) return;
                            const end = prompt("Bitiş Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                            if (!end) return;

                            if (confirm(`${start} - ${end} arası tüm personelin molaları takvim kurallarına göre yeniden hesaplanacak. Onaylıyor musunuz?`)) {
                                try {
                                    setRecalcConsoleOpen(true);
                                    setRecalcLoading(true);
                                    setRecalcLogs(['> Mola İyileştirme Başlatılıyor...', `> Aralık: ${start} - ${end}`]);

                                    const res = await api.post('/system/health-check/regenerate_compliance/', { start_date: start, end_date: end });

                                    setRecalcLogs(prev => [...prev, ...res.data.logs, `> SONUÇ: ${res.data.message}`]);
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    setRecalcLogs(prev => [...prev, `> HATA: ${e.response?.data?.error || e.message}`]);
                                    alert("Hata: " + (e.response?.data?.error || e.message));
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Standart Mesai Harici Temizle"
                        description="Vardiya saatleri dışındaki (Erken Giriş / Geç Çıkış) tüm süreleri siler ve giriş-çıkış saatlerini vardiya saatlerine eşitler. Fazla mesaileri sıfırlar."
                        hazard={true}
                        onClick={async () => {
                            const start = prompt("Başlangıç Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 8) + '01');
                            if (!start) return;
                            const end = prompt("Bitiş Tarihi (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                            if (!end) return;

                            if (confirm(`DİKKAT: ${start} - ${end} arasındaki tüm kayıtlarda ERKEN GİRİŞ ve GEÇ ÇIKIŞLAR SİLİNECEK. Sadece standart çalışma saatleri kalacak. Onaylıyor musunuz?`)) {
                                try {
                                    setRecalcConsoleOpen(true);
                                    setRecalcLoading(true);
                                    setRecalcLogs(['> Vardiyaya Eşitleme Başlatılıyor...', `> Aralık: ${start} - ${end}`, '> Bu işlem fazla mesaileri silebilir.']);

                                    const res = await api.post('/system/health-check/snap_attendance_to_shift/', { start_date: start, end_date: end });

                                    setRecalcLogs(prev => [...prev, `> Başarıyla Güncellendi: ${res.data.updated_count} kayıt`, `> Mesaj: ${res.data.message}`]);
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    setRecalcLogs(prev => [...prev, `> HATA: ${e.response?.data?.error || e.message}`]);
                                    alert("Hata: " + (e.response?.data?.error || e.message));
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />

                    {/* Recalculate Console Modal/Area */}
                    {recalcConsoleOpen && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-900 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
                                <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
                                    <h3 className="text-white font-mono font-bold flex items-center gap-2">
                                        <CommandLineIcon className="w-5 h-5 text-green-400" />
                                        RECALCULATION_LOGS.log
                                    </h3>
                                    <button onClick={() => setRecalcConsoleOpen(false)} className="text-gray-400 hover:text-white transition">
                                        <XCircleIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 bg-gray-950 p-4 overflow-y-auto font-mono text-xs text-green-300 space-y-1">
                                    {recalcLogs.length === 0 && !recalcLoading && (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                                            <p>Log dökümü için işlemi başlatın.</p>
                                            <button
                                                onClick={async () => {
                                                    setRecalcLoading(true);
                                                    setRecalcLogs(['> Başlatılıyor...', '> Tüm personel taranıyor...']);
                                                    try {
                                                        const res = await api.post('/attendance/recalculate-history/', { debug_console: true });
                                                        setRecalcLogs(prev => [...prev, ...res.data.logs, `> BİTTİ: ${res.data.status}`]);
                                                        refresh();
                                                    } catch (e) {
                                                        setRecalcLogs(prev => [...prev, `> HATA: ${e.response?.data?.error || e.message}`]);
                                                    } finally {
                                                        setRecalcLoading(false);
                                                    }
                                                }}
                                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition"
                                            >
                                                BAŞLAT (DEBUG MODE)
                                            </button>
                                        </div>
                                    )}
                                    {recalcLogs.map((l, i) => {
                                        let content = l;
                                        if (typeof l === 'object' && l !== null) {
                                            content = `[${l.time}] ${l.message} ${l.details ? ` (${l.details})` : ''}`;
                                        }
                                        return (
                                            <div key={i} className="whitespace-pre-wrap break-all border-b border-gray-900/50 pb-0.5 text-xs text-green-300 font-mono">
                                                {content}
                                            </div>
                                        );
                                    })}
                                    {recalcLoading && <div className="animate-pulse text-green-500 mt-2">_ İşleniyor...</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    <ActionButton
                        label="Tüm Verileri Sıfırla (Fabrika Ayarları)"
                        description="TÜM Mesai, İzin ve Talep verilerini TAMAMEN SİLER."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('DİKKAT: TÜM KATILIM VERİLERİNİ SİLMEK ÜZERESİNİZ!\nBu işlem geri alınamaz.\nDevam etmek istiyor musunuz?')) {
                                try {
                                    const res = await api.post('/attendance/reset-all-data/');
                                    alert(res.data.status);
                                    refresh();
                                } catch (e) {
                                    const msg = e.response?.data?.error || e.response?.data?.detail || e.message;
                                    alert('Hata: ' + msg);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Test Verilerini Temizle"
                        description="Stres testi sırasında oluşturulan geçici kullanıcıları (Test User*) siler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('Test kullanıcılarını silmek istiyor musunuz?')) {
                                try {
                                    const res = await api.post('/employees/cleanup-test-data/');
                                    const deletedUsers = res.data.deleted_users || [];

                                    if (deletedUsers.length > 0) {
                                        alert(`${res.data.status}\n\nSilinen: ${deletedUsers.length} kullanıcı`);
                                    } else {
                                        alert(res.data.status);
                                    }

                                    refresh();
                                } catch (e) {
                                    const msg = e.response?.data?.error || e.response?.data?.detail || e.message;
                                    const trace = e.response?.data?.traceback ? '\n\n' + e.response.data.traceback : '';
                                    console.error("Cleanup Error:", e);
                                    alert('Hata: ' + msg + trace);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="TÜM İzin ve Mesai Taleplerini Sil"
                        description="Sistemdeki TÜM talep kayıtlarını (İzin, Fazla Mesai, Yemek, Kartsız Giriş) kalıcı olarak siler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('DİKKAT: Sistemdeki TÜM talepleri (İzin, FM, Yemek, vb.) silmek üzeresiniz!\nBu işlem geri alınamaz.\nDevam etmek istiyor musunuz?')) {
                                try {
                                    const res = await api.post('/system/health-check/clear_requests/', { model_type: 'all' });
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    alert('Hata: ' + (e.response?.data?.error || e.message));
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Tüm Test Departman/Pozisyon Verilerini Sil"
                        description="'Stress', 'Diagnostic', 'Test', 'Deneme' içeren tüm yapıları temizler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('İçinde "Test", "Stress", "Diagnostic" geçen TÜM Departman ve Pozisyonlar silinecek.\nBu işlem geri alınamaz. Onaylıyor musunuz?')) {
                                setRecalcConsoleOpen(true);
                                setRecalcLogs(['> Temizlik İşlemi Başlatılıyor...', '> Hedef: Stress, Diagnostic, Test, Deneme...']);
                                setRecalcLoading(true);
                                try {
                                    // Artificial delay to show "Scanning" feel if super fast
                                    await new Promise(r => setTimeout(r, 800));

                                    const res = await api.post('/system/health-check/run_metadata_cleanup/');
                                    setRecalcLogs(prev => [...prev, `> İŞLEM BAŞARILI.`, `> Mesaj: ${res.data.message}`]);
                                    refresh();
                                } catch (e) {
                                    const errMsg = e.response?.data?.error || e.message;
                                    setRecalcLogs(prev => [...prev, `> ❌ HATA: ${errMsg}`, '> Endpoint 404 ise: Backend deploy edilmemiş olabilir.']);
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />

                    <ActionButton
                        label="Celery Kuyruğunu Temizle (ACİL)"
                        description="Sistemdeki tüm bekleyen görevleri (Queue) siler. Log taşması veya görev birikmesi durumunda kullanın."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('DİKKAT! Bekleyen TÜM arka plan görevleri silinecek. Log taşması veya sıkışma varsa bunu kullanın.\n\nDevam edilsin mi?')) {
                                try {
                                    setRecalcConsoleOpen(true);
                                    setRecalcLoading(true);
                                    setRecalcLogs([
                                        '> 🚀 Temizlik İşlemi Başlatılıyor...',
                                        '> 🔌 Redis Sunucusuna Bağlanılıyor...',
                                        '> ☢️ FLUSHALL komutu hazırlanıyor...'
                                    ]);

                                    // Artificial delay for UX
                                    await new Promise(r => setTimeout(r, 1000));

                                    const res = await api.post('/system/health-check/purge_celery_queue/');

                                    setRecalcLogs(prev => [
                                        ...prev,
                                        '> ☢️ KOMUT GÖNDERİLDİ: FLUSHALL',
                                        `> ✅ SUNUCU YANITI: ${res.data.status.toUpperCase()}`,
                                        `> 📄 MESAJ: ${res.data.message}`,
                                        `> 🗑️ Silinen (Soft) Görev: ${res.data.purged_count}`,
                                        '> 🏁 İŞLEM TAMAMLANDI.'
                                    ]);
                                } catch (e) {
                                    setRecalcLogs(prev => [
                                        ...prev,
                                        `> ❌ HATA: ${e.response?.data?.error || e.message}`
                                    ]);
                                } finally {
                                    setRecalcLoading(false);
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* System Status Panel */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Servis Durumu</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Veritabanı</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">CONNECTED</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Redis / Celery</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">ACTIVE</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Gate API</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">LISTENING</span>
                    </div>
                </div>
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

// --- UTILS ---

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

function KPICard({ title, value, icon: Icon, color, loading }) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50',
        green: 'text-green-600 bg-green-50',
        purple: 'text-purple-600 bg-purple-50',
        orange: 'text-orange-600 bg-orange-50',
    };
    const c = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${c}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                {loading ? (
                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse"></div>
                ) : (
                    <div className="text-3xl font-bold text-gray-800">{value ?? '-'}</div>
                )}
            </div>
        </div>
    );
}

function ActionButton({ label, description, onClick, hazard }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-lg border transition-all group
                ${hazard
                    ? 'border-red-100 bg-red-50/50 hover:bg-red-50 hover:border-red-200'
                    : 'border-gray-200 hover:bg-gray-50'}
            `}
        >
            <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${hazard ? 'text-red-700' : 'text-gray-700'}`}>{label}</span>
                {hazard && <TrashIcon className="w-5 h-5 text-red-300 group-hover:text-red-500" />}
            </div>
            {description && <p className={`text-xs ${hazard ? 'text-red-500' : 'text-gray-500'}`}>{description}</p>}
        </button>
    );
}

function AttendanceDiagTab() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [allMonths, setAllMonths] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEmp, setExpandedEmp] = useState({});

    const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

    const fetchDiag = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { year, all: 'true' };
            if (!allMonths) params.month = month;
            const res = await api.get('/dashboard/diag-monthly/', { params });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleEmp = (code) => {
        setExpandedEmp(prev => ({ ...prev, [code]: !prev[code] }));
    };

    const fmtH = (h) => {
        if (h === null || h === undefined) return '-';
        const hours = Math.floor(Math.abs(h));
        const mins = Math.round((Math.abs(h) - hours) * 60);
        const sign = h < 0 ? '-' : '';
        return `${sign}${hours}s ${mins}dk`;
    };

    const getBadge = (m) => {
        if (!m.has_data && !m.is_future) return { text: 'VERİ YOK', cls: 'bg-orange-100 text-orange-700' };
        if (m.is_future) return { text: 'GELECEK', cls: 'bg-gray-100 text-gray-500' };
        if (m.mismatch) return { text: 'UYUMSUZ', cls: 'bg-red-100 text-red-700' };
        if (m.fresh_missing_h > 0) return { text: `${fmtH(m.fresh_missing_h)} EKSİK`, cls: 'bg-red-50 text-red-600' };
        if (m.fresh_overtime_h > 0) return { text: `${fmtH(m.fresh_overtime_h)} FAZLA`, cls: 'bg-emerald-50 text-emerald-600' };
        return { text: 'OK', cls: 'bg-green-100 text-green-700' };
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Mesai Hesaplama Doğrulama</h2>
            <p className="text-sm text-gray-500 mb-4">
                Tüm çalışanların aylık mesai hesaplamalarını kontrol edin. Ham attendance kayıtları, hedef saatler ve hesaplanan değerler karşılaştırmalı gösterilir.
            </p>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Yıl:</label>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="border rounded-lg px-3 py-1.5 text-sm">
                        {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Ay:</label>
                    <select value={month} onChange={e => setMonth(parseInt(e.target.value))} disabled={allMonths} className="border rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">
                        {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={allMonths} onChange={e => setAllMonths(e.target.checked)} className="rounded" />
                    Tüm Aylar (1-12)
                </label>
                <button
                    onClick={fetchDiag}
                    disabled={loading}
                    className="ml-auto px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Hesaplanıyor...' : 'Doğrula'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {data && (
                <div className="space-y-2">
                    {/* Meta */}
                    <div className="text-xs text-gray-400 mb-3">
                        Oluşturulma: {data.generated_at} | Bugün: {data.today} | {data.employee_count} çalışan | Kontrol edilen aylar: {data.months_checked?.join(', ')}
                    </div>

                    {/* Summary Stats */}
                    {(() => {
                        const emps = data.employees || [];
                        const noData = emps.filter(e => Object.values(e.months).some(m => !m.has_data && !m.is_future)).length;
                        const mismatched = emps.filter(e => Object.values(e.months).some(m => m.mismatch)).length;
                        const withMissing = emps.filter(e => Object.values(e.months).some(m => m.fresh_missing_h > 0)).length;
                        return (
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                <div className="p-3 bg-blue-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-700">{emps.length}</div>
                                    <div className="text-xs text-blue-600">Toplam Çalışan</div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-orange-700">{noData}</div>
                                    <div className="text-xs text-orange-600">Veri Yok</div>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-700">{mismatched}</div>
                                    <div className="text-xs text-red-600">Cache Uyumsuz</div>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-amber-700">{withMissing}</div>
                                    <div className="text-xs text-amber-600">Eksik Mesaili</div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Employee List */}
                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium text-gray-600">Çalışan</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Departman</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Takvim</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-600">Program</th>
                                    {(data.months_checked || []).map(m => (
                                        <th key={m} className="text-center px-2 py-2 font-medium text-gray-600">{monthNames[m-1]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(data.employees || []).map(emp => {
                                    const isExpanded = expandedEmp[emp.employee_code];
                                    return (
                                        <React.Fragment key={emp.employee_code}>
                                            <tr
                                                className="border-t hover:bg-gray-50 cursor-pointer"
                                                onClick={() => toggleEmp(emp.employee_code)}
                                            >
                                                <td className="px-4 py-2 font-medium text-gray-800">
                                                    <span className="mr-1 text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                                                    {emp.name}
                                                    <span className="text-xs text-gray-400 ml-1">({emp.employee_code})</span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 text-xs">{emp.department}</td>
                                                <td className="px-3 py-2 text-gray-600 text-xs">{emp.fiscal_calendar}</td>
                                                <td className="px-3 py-2 text-gray-600 text-xs">{emp.work_schedule}</td>
                                                {(data.months_checked || []).map(m => {
                                                    const md = emp.months[String(m)];
                                                    if (!md) return <td key={m} className="px-2 py-2 text-center text-xs text-gray-300">-</td>;
                                                    const badge = getBadge(md);
                                                    return (
                                                        <td key={m} className="px-2 py-2 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                                                                {badge.text}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {isExpanded && (data.months_checked || []).map(m => {
                                                const md = emp.months[String(m)];
                                                if (!md || md.error) return null;
                                                return (
                                                    <tr key={`${emp.employee_code}-${m}-detail`} className="bg-slate-50 border-t border-dashed">
                                                        <td colSpan={4 + (data.months_checked || []).length} className="px-6 py-3">
                                                            <div className="text-xs font-bold text-gray-700 mb-2">{monthNames[m-1]} {data.year} — Detay</div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Dönem</div>
                                                                    <div>{md.period}</div>
                                                                    <div className="text-gray-400">Hesap sonu: {md.calc_end}</div>
                                                                    <div className="text-gray-400">Hedef sonu: {md.target_calc_end}</div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Ham Attendance</div>
                                                                    <div>Kayıt: <b className={md.raw_attendance_count === 0 ? 'text-red-600' : 'text-green-600'}>{md.raw_attendance_count}</b></div>
                                                                    <div>Normal: <b>{fmtH(md.raw_normal_hours)}</b></div>
                                                                    <div>Ek Mesai: <b>{fmtH(md.raw_overtime_hours)}</b></div>
                                                                    <div>Mola: <b>{Math.round((md.raw_break_seconds || 0) / 60)}dk</b></div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Hedef</div>
                                                                    <div>Ay Toplam: <b>{fmtH(md.target_gross_hours)}</b></div>
                                                                    <div>Bugüne Kadar: <b>{fmtH(md.past_target_hours)}</b></div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold text-gray-500">Hesaplama (Taze)</div>
                                                                    <div>Tamamlanan: <b className="text-blue-600">{fmtH(md.fresh_completed_h)}</b></div>
                                                                    <div>Eksik: <b className={md.fresh_missing_h > 0 ? 'text-red-600' : ''}>{fmtH(md.fresh_missing_h)}</b></div>
                                                                    <div>Ek Mesai: <b className="text-emerald-600">{fmtH(md.fresh_overtime_h)}</b></div>
                                                                    <div>Net Bakiye: <b className={md.fresh_net_balance_h < 0 ? 'text-red-600' : 'text-emerald-600'}>{fmtH(md.fresh_net_balance_h)}</b></div>
                                                                </div>
                                                            </div>
                                                            {md.cached_completed_h !== null && (
                                                                <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                                                                    <span className="font-semibold text-yellow-700">Cache (DB): </span>
                                                                    Tamamlanan: {fmtH(md.cached_completed_h)} | Eksik: {fmtH(md.cached_missing_h)} | Ek Mesai: {fmtH(md.cached_overtime_h)}
                                                                    {md.mismatch && <span className="ml-2 text-red-600 font-bold">⚠ UYUMSUZ</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!data && !loading && (
                <div className="text-center py-16 text-gray-400">
                    <ClockIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Yukarıdan yıl ve ay seçip "Doğrula" butonuna tıklayın.</p>
                </div>
            )}
        </div>
    );
}

function getLevelBadge(level) {
    if (level === 'ERROR') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'WARNING') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
}
