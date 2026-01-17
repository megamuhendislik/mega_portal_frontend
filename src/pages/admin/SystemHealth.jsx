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
    TrashIcon
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
                        { id: 'stress_test', name: 'Stres Testi & Konsol', icon: CommandLineIcon },
                        { id: 'test_suite', name: 'Sistem Testleri (Tam Kapsam)', icon: CheckCircleIcon },
                        { id: 'logs', name: 'Servis Logları', icon: ClockIcon },
                        { id: 'security', name: 'Güvenlik', icon: ShieldCheckIcon },
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
                {activeTab === 'stress_test' && <StressTestTab />}
                {activeTab === 'test_suite' && <TestSuiteTab />}
                {activeTab === 'logs' && <ServiceLogsTab />}
                {activeTab === 'security' && <SecurityTab />}
            </div>

        </div>
    );
}

// --- SUB COMPONENTS ---

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
                        label="Sistemi Yeniden Hesapla (Detaylı Log)"
                        description="Mevcut giriş/çıkış verilerini koruyarak tüm puantaj hesaplamalarını yeniler ve işlem loglarını döker."
                        hazard={false}
                        onClick={() => setRecalcConsoleOpen(true)}
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
                                    {recalcLogs.map((l, i) => (
                                        <div key={i} className="whitespace-pre-wrap break-all border-b border-gray-900/50 pb-0.5">
                                            {l}
                                        </div>
                                    ))}
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
                        label="Tüm Fazla Mesai Taleplerini Sil"
                        description="Sadece FM taleplerini temizler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('Tüm Fazla Mesai taleplerini silmek üzeresiniz. Devam?')) {
                                await api.post('/system/health-check/clear_requests/', { model_type: 'overtime' });
                                refresh();
                            }
                        }}
                    />

                    <ActionButton
                        label="Tüm Test Departman/Pozisyon Verilerini Sil"
                        description="'Stress', 'Diagnostic', 'Test', 'Deneme' içeren tüm yapıları temizler."
                        hazard={true}
                        onClick={async () => {
                            if (confirm('İçinde "Test", "Stress", "Diagnostic" geçen TÜM Departman ve Pozisyonlar silinecek.\nBu işlem geri alınamaz. Onaylıyor musunuz?')) {
                                try {
                                    const res = await api.post('/system/health-check/run_metadata_cleanup/');
                                    alert(res.data.message);
                                    refresh();
                                } catch (e) {
                                    alert('Hata: ' + (e.response?.data?.error || e.message));
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
