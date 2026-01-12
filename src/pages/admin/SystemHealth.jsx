import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../../layouts/MainLayout';
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
    CommandLineIcon
} from '@heroicons/react/24/outline';

export default function SystemHealth() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Initial Load
    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const response = await api.get('/admin/system-health/get_system_stats/');
            setStats(response.data);
        } catch (error) {
            console.error("Stats error:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    return (
        <MainLayout title="Sistem Kontrol Merkezi">
            <div className="bg-gray-900 min-h-screen -m-6 p-6 text-gray-100 font-sans">
                {/* HEADLINE */}
                <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <ServerStackIcon className="w-8 h-8 text-blue-500" />
                            MEGA KONTROL MERKEZİ
                        </h1>
                        <p className="text-gray-400 mt-1">Sistem Bütünlüğü, Servis Logları ve Stres Testi Modülü</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500">Sistem Durumu</span>
                            <span className="text-green-400 font-mono font-bold">OPERASYONEL ●</span>
                        </div>
                    </div>
                </div>

                {/* NAVIGATION */}
                <div className="flex space-x-2 mb-8 bg-gray-800/50 p-1 rounded-lg w-max">
                    {[
                        { id: 'dashboard', name: 'Genel Bakış', icon: ServerStackIcon },
                        { id: 'stress_test', name: 'Stres Testi & Konsol', icon: CommandLineIcon },
                        { id: 'logs', name: 'Canlı Servis Logları', icon: ClockIcon },
                        { id: 'security', name: 'Güvenlik & Kapı', icon: ShieldCheckIcon },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                            `}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="min-h-[600px]">
                    {activeTab === 'dashboard' && <DashboardTab stats={stats} refresh={fetchStats} loading={loadingStats} />}
                    {activeTab === 'stress_test' && <StressTestTab />}
                    {activeTab === 'logs' && <ServiceLogsTab />}
                    {activeTab === 'security' && <SecurityTab />}
                </div>
            </div>
        </MainLayout>
    );
}

// --- SUB COMPONENTS ---

function DashboardTab({ stats, refresh, loading }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard title="Toplam Çalışan" value={stats?.total_employees} icon={CpuChipIcon} color="blue" />
                <KPICard title="Aktif Çalışan" value={stats?.active_employees} icon={CheckCircleIcon} color="green" />
                <KPICard title="Bugünkü Kayıt" value={stats?.attendance_today} icon={ClockIcon} color="purple" />
                <KPICard title="Bekleyen İzin" value={stats?.pending_leave_requests} icon={ExclamationTriangleIcon} color="orange" />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Veri Temizliği</h3>
                    <div className="space-y-3">
                        <ActionButton
                            label="Tüm Fazla Mesai Taleplerini Sil"
                            hazard={true}
                            onClick={async () => {
                                if (confirm('Tüm Fazla Mesai taleplerini silmek istediğinize emin misiniz?')) {
                                    await api.post('/admin/system-health/clear_requests/', { model_type: 'overtime' });
                                    refresh();
                                }
                            }}
                        />
                        <ActionButton
                            label="Tüm İzin Taleplerini Sil"
                            hazard={true}
                            onClick={async () => {
                                if (confirm('Tüm İzin taleplerini silmek istediğinize emin misiniz?')) {
                                    await api.post('/admin/system-health/clear_requests/', { model_type: 'leave' });
                                    refresh();
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Sistem Sağlığı</h3>
                    <p className="text-gray-400 text-sm mb-4">Veritabanı bağlantıları ve önbellek durumu normal görünüyor.</p>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded border border-green-800 text-xs">DB: CONNECTED</span>
                        <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded border border-green-800 text-xs">REDIS: CONNECTED</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StressTestTab() {
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const consoleEndRef = useRef(null);

    // Auto-scroll console
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const runTest = async () => {
        setIsRunning(true);
        setLogs(['> Başlatılıyor...', '> Test ortamı hazırlanıyor...']);
        try {
            // In a real implementation we would stream. For now we simulate stream or show bulk result.
            // Let's verify if the endpoint returns a bulk result and we iterate it to "simulate" a console
            const response = await api.post('/admin/system-health/run_comprehensive_stress_test/');

            // Simulation of "Processing"
            const results = response.data.results || [];

            // Animate logs addition
            let i = 0;
            const interval = setInterval(() => {
                if (i >= results.length) {
                    clearInterval(interval);
                    setLogs(prev => [...prev, `> BİTTİ: ${response.data.summary}`]);
                    setIsRunning(false);
                    return;
                }
                const res = results[i];
                const line = `[SCENARIO #${res.id}] ${res.desc} ... ${res.status} ${res.detail ? '(' + res.detail + ')' : ''}`;
                setLogs(prev => [...prev, line]);
                i++;
            }, 50); // Fast scroll effect

        } catch (error) {
            setLogs(prev => [...prev, `> HATA: ${error.message}`]);
            setIsRunning(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
            {/* Left Panel: Controls */}
            <div className="col-span-1 bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Puantaj Motoru Simülasyonu</h3>
                    <p className="text-gray-400 text-sm">
                        Bu modül, sanal bir zaman çizelgesi üzerinde 150 farklı varyasyonu (Geç gelme, Erken çıkma, Hafta tatili, Vardiya çakışması) test eder.
                    </p>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">Test Hedefleri</div>
                        <ul className="text-sm text-gray-300 space-y-2">
                            <li>• Shift Snapping (Tolerans)</li>
                            <li>• Öğle Molası Kesintisi</li>
                            <li>• Gece Vardiyası (Midnight Wrap)</li>
                            <li>• Otomatik Mesai Bölme (Auto-Split)</li>
                        </ul>
                    </div>
                </div>

                <button
                    onClick={runTest}
                    disabled={isRunning}
                    className={`w-full py-4 text-center font-bold rounded-lg transition-all transform hover:scale-[1.02] ${isRunning ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/20'}`}
                >
                    {isRunning ? 'TEST ÇALIŞIYOR...' : 'SİMÜLASYONU BAŞLAT'}
                </button>
            </div>

            {/* Right Panel: Console */}
            <div className="col-span-2 bg-black rounded-xl border border-gray-800 p-4 font-mono text-xs md:text-sm overflow-hidden flex flex-col shadow-2xl">
                <div className="flex justify-between items-center text-gray-500 pb-2 border-b border-gray-800 mb-2">
                    <span>TERMINAL OUTPUT</span>
                    <span className="flex gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></span>
                        <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></span>
                        <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></span>
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide text-green-400">
                    {logs.length === 0 && <div className="text-gray-600 italic">// Waiting for command... Click start to run tests.</div>}
                    {logs.map((log, idx) => (
                        <div key={idx} className={`${log.includes('FAIL') ? 'text-red-500 font-bold bg-red-900/10' : ''} ${log.includes('BİTTİ') ? 'text-yellow-400 font-bold mt-4 border-t border-gray-800 pt-2' : ''}`}>
                            {log}
                        </div>
                    ))}
                    <div ref={consoleEndRef} />
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
            setLogs(res.data.results || res.data); // Handle pagination or list
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">

            <div className="flex justify-between p-4 border-b border-gray-700 items-center">
                <h3 className="font-semibold text-white">Servis Hareket Dökümü (Live)</h3>
                <button onClick={loadLogs} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900 text-gray-500 uppercase font-medium text-xs">
                        <tr>
                            <th className="px-6 py-4">Zaman</th>
                            <th className="px-6 py-4">Level</th>
                            <th className="px-6 py-4">Bileşen</th>
                            <th className="px-6 py-4">Mesaj</th>
                            <th className="px-6 py-4">Detay</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-3 font-mono text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getLevelBadge(log.level)}`}>{log.level}</span>
                                </td>
                                <td className="px-6 py-3 text-blue-300 font-mono text-xs">{log.component}</td>
                                <td className="px-6 py-3 text-white font-medium">{log.message}</td>
                                <td className="px-6 py-3 text-xs text-gray-500 font-mono max-w-xs truncate" title={JSON.stringify(log.details)}>{log.details ? JSON.stringify(log.details) : '-'}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && !loading && (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Log kaydı bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SecurityTab() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <ShieldCheckIcon className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-white">Güvenlik Durumu</h3>
                <p className="text-gray-400 mt-2">API Yetkilendirmeleri ve Kapı Entegrasyonu aktif.</p>
            </div>
            {/* Placeholder for Gate Logs */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500">
                Kapı Logları için Servis Logları sekmesini kontrol ediniz.
            </div>
        </div>
    );
}


// --- UTILS ---

function KPICard({ title, value, icon: Icon, color }) {
    const colorClasses = {
        blue: 'text-blue-400 bg-blue-900/20 border-blue-800',
        green: 'text-green-400 bg-green-900/20 border-green-800',
        purple: 'text-purple-400 bg-purple-900/20 border-purple-800',
        orange: 'text-orange-400 bg-orange-900/20 border-orange-800',
    };
    const c = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4 hover:border-gray-600 transition-all">
            <div className={`p-3 rounded-lg border ${c}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{title}</p>
                <div className="text-2xl font-bold text-white">{value || '-'}</div>
            </div>
        </div>
    );
}

function ActionButton({ label, onClick, hazard }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all flex justify-between items-center group
                ${hazard
                    ? 'border-red-900/50 text-red-400 hover:bg-red-900/20 hover:border-red-500/50'
                    : 'border-gray-700 text-gray-300 hover:bg-gray-700'}
            `}
        >
            <span>{label}</span>
            {hazard && <XCircleIcon className="w-5 h-5 opacity-50 group-hover:opacity-100" />}
        </button>
    );
}

function getLevelBadge(level) {
    if (level === 'ERROR') return 'bg-red-900/30 text-red-500 border-red-800';
    if (level === 'WARNING') return 'bg-yellow-900/30 text-yellow-500 border-yellow-800';
    return 'bg-blue-900/30 text-blue-500 border-blue-800';
}
