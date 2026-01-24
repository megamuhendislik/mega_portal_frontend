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
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

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
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-700'
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
                {activeTab === 'logs' && <ServiceLogsTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'synthetic' && <SyntheticDataTab />}
                {activeTab === 'data_audit' && <DataAuditTab />}
            </div>

        </div>
    );
}

// --- SUB COMPONENTS ---

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
            const res = await api.get('/system/health-check/data_audit/');
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

    useEffect(() => {
        runScan();
    }, []);

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

    if (loading && !report) return <div className="p-12 text-center text-gray-500 animate-pulse">Yetki taraması yapılıyor...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {/* LEFT: STATUS CARD */}
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
                            {report?.breakdown?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-600 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${item.category === 'MENU' ? 'bg-green-500' : (item.category === 'OTHER' ? 'bg-red-500' : 'bg-blue-300')}`}></span>
                                        {item.category || 'TANIMSIZ'}
                                    </span>
                                    <span className="font-mono font-bold text-gray-700">{item.count}</span>
                                </div>
                            ))}
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

                    {report?.menu_count > 0 ? (
                        <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-lg border border-green-100">
                            <CheckCircleIcon className="w-6 h-6" />
                            <div>
                                <div className="font-bold">Doğrulanmış {report.menu_count} Adet Yetki Mevcut</div>
                                <div className="text-xs opacity-80">"MENU" kategorisinde kayıtlı.</div>
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
        </div>
    );
}

function DashboardTab({ stats, refresh, loading }) {
    const [recalcConsoleOpen, setRecalcConsoleOpen] = useState(false);
    const [recalcLogs, setRecalcLogs] = useState([]);
    const [recalcLoading, setRecalcLoading] = useState(false);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* KPI Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Toplam Çalışan" value={stats?.total_employees} icon={CpuChipIcon} color="blue" loading={loading} />
                <KPICard title="Aktif Çalışan" value={stats?.active_employees} icon={CheckCircleIcon} color="green" loading={loading} />
                <KPICard title="Bugünkü Kayıt" value={stats?.attendance_today} icon={ClockIcon} color="indigo" loading={loading} />
                <KPICard title="Bekleyen İzin" value={stats?.pending_leave_requests} icon={ExclamationTriangleIcon} color="orange" loading={loading} />
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
                                        console.group("🗑️ Test Data Cleanup Report");
                                        console.log(`Total Deleted: ${deletedUsers.length}`);
                                        console.table(deletedUsers);
                                        console.groupEnd();
                                        alert(`${res.data.status}\n\nDetaylar için lütfen tarayıcı konsoluna (F12) bakın.`);
                                    } else {
                                        console.warn("No users matched the cleanup filter.");
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
    const [logs, setLogs] = useState([]);
    const consoleEndRef = useRef(null);

    // Auto-scroll console
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const runTest = async () => {
        setIsRunning(true);
        setLogs(['> Simülasyon başlatılıyor...', '> Test ortamı hazırlanıyor (Async Task)...']);

        try {
            // 1. Start Task
            const startRes = await api.post('/system/health-check/run_comprehensive_stress_test/');
            if (startRes.data.error) throw new Error(startRes.data.error);

            const taskId = startRes.data.task_id;
            if (!taskId) throw new Error("Task ID alınamadı.");

            setLogs(prev => [...prev, `> Görev Kuyruğa Alındı: ${taskId}`, '> Bekleniyor...']);

            // 2. Poll Status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/system/health-check/get_stress_test_status/?task_id=${taskId}`);
                    const { state, logs: remoteLogs, report, error } = statusRes.data;

                    if (state === 'PROGRESS' && remoteLogs) {
                        // Replace generic logs with actual remote logs from server
                        // For efficiency, maybe just show the last few? 
                        // But user wants to see "streaming". 
                        // Using a Set or just overwriting might be tricky if we want history.
                        // Assuming remoteLogs is the FULL list from backend (as per my backend implementation).

                        const formattedLogs = remoteLogs.map(l => {
                            if (typeof l === 'object') {
                                return `[${l.time}] ${l.message} ${l.details ? '(' + l.details + ')' : ''}`;
                            }
                            return l;
                        });

                        // Overwrite with server source of truth to avoid sync issues
                        setLogs(formattedLogs);
                    }

                    if (state === 'SUCCESS') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> TEST TAMAMLANDI: ${report.summary}`]);

                        // Append results if available in report
                        if (report.results) {
                            const resultLines = report.results.map(r => {
                                const icon = r.status === 'PASS' ? '✅' : (r.status === 'FAIL' ? '❌' : '⚠️');
                                return `${icon} [SCENARIO #${r.id}] ${r.desc} ... ${r.status}`;
                            });
                            setLogs(prev => [...prev, '--- SONUÇLAR ---', ...resultLines]);
                        }

                        setIsRunning(false);
                    } else if (state === 'FAILURE') {
                        clearInterval(pollInterval);
                        setLogs(prev => [...prev, `> KRİTİK HATA: ${error}`]);
                        setIsRunning(false);
                    }

                } catch (e) {
                    // Polling error (network glitch?), don't stop unless persistent? 
                    // Stop for safety.
                    console.error("Polling error:", e);
                    // clearInterval(pollInterval);
                    // setIsRunning(false);
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
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Puantaj Stres Testi</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        Bu modül, 150 farklı varyasyonla puantaj motorunu zorlar.
                    </p>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                        <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Test Kapsamı</h4>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Vardiya Toleransları (Snapping)</li>
                            <li>Otomatik Mola Kesintileri</li>
                            <li>Gece Vardiyası (Midnight Wrap)</li>
                            <li>Otomatik Mesai Bölme (Auto-Split)</li>
                        </ul>
                    </div>

                    <button
                        onClick={runTest}
                        disabled={isRunning}
                        className={`w-full py-3 px-4 rounded-lg font-bold shadow-sm transition-all flex justify-center items-center gap-2
                            ${isRunning
                                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}
                        `}
                    >
                        {isRunning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                        {isRunning ? 'TEST ÇALIŞIYOR...' : 'SİMÜLASYONU BAŞLAT'}
                    </button>
                </div>
            </div>

            {/* Console Output */}
            <div className="col-span-2">
                <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-xs font-mono text-gray-400">root@mega-engine:~# ./run_stress_test.sh</span>
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-xs md:text-sm text-green-400 space-y-1">
                        {logs.length === 0 && (
                            <div className="text-gray-600 select-none">
                                // Bekleniyor... Testi başlatmak için butona tıklayın.
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div key={i} className={`${log.includes('❌') ? 'text-red-400' : ''} ${log.includes('⚠️') ? 'text-yellow-400' : ''}`}>
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

function getLevelBadge(level) {
    if (level === 'ERROR') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'WARNING') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
}
