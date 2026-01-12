import React, { useState, useEffect } from 'react';
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
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function SystemHealth() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    // Logic Verification State
    const [verificationResult, setVerificationResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Stats
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

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

    const runDiagnostics = async () => {
        setIsRunning(true);
        setLogs([]);
        try {
            const response = await api.post('/admin/system-health/run_diagnostics/');
            setLogs(response.data.logs || []);
        } catch (error) {
            console.error("Diag error", error);
            setLogs([{ message: "Sistem hatası: Bağlantı kurulamadı.", success: false }]);
        } finally {
            setIsRunning(false);
        }
    };

    const runLogicVerification = async () => {
        setIsVerifying(true);
        try {
            const response = await api.post('/admin/system-health/run_attendance_diagnostics/');
            setVerificationResult(response.data);
        } catch (error) {
            console.error("Verification Error", error);
        } finally {
            setIsVerifying(false);
        }
    };

    const clearRequests = async (type) => {
        if (!window.confirm(`${type.toUpperCase()} kayıtlarını silmek istediğinize emin misiniz?`)) return;
        try {
            await api.post('/admin/system-health/clear_requests/', { model_type: type });
            alert("Silindi.");
            fetchStats();
        } catch (e) {
            alert("Hata: " + e.message);
        }
    };

    return (
        <MainLayout title="Sistem Sağlığı ve Kontrol Merkezi">
            <div className="space-y-6">

                {/* Header & Quick Actions */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Sistem Kontrol Paneli</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Backend servisleri, puantaj motoru ve veritabanı bütünlüğü kontrol merkezi.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={runDiagnostics}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium transition-all ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                                }`}
                        >
                            {isRunning ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PlayCircleIcon className="w-5 h-5" />}
                            {isRunning ? 'Kontrol Ediliyor...' : 'Tam Tarama Başlat'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {[
                            { id: 'dashboard', name: 'Genel Bakış', icon: ServerStackIcon },
                            { id: 'logic', name: 'Puantaj Motoru (V2)', icon: CpuChipIcon },
                            { id: 'logs', name: 'Servis Logları', icon: ClockIcon },
                            { id: 'security', name: 'Güvenlik & Kapı', icon: ShieldCheckIcon },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* CONTENT AREAS */}

                {/* 1. DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Quick Stats */}
                        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Toplam Çalışan" value={stats?.total_employees || '-'} color="blue" />
                            <StatCard title="Aktif Çalışan" value={stats?.active_employees || '-'} color="green" />
                            <StatCard title="Bugünkü Kayıt" value={stats?.attendance_today || '-'} color="indigo" />
                            <StatCard title="Bekleyen İzin" value={stats?.pending_leave_requests || '-'} color="orange" />
                        </div>

                        {/* Diagnostic Logs */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-semibold text-gray-700">Sistem Tarama Sonuçları</h3>
                                <span className="text-xs text-gray-500">Son Tarama: {logs.length > 0 ? 'Az Önce' : 'Yok'}</span>
                            </div>
                            <div className="p-0 max-h-[500px] overflow-y-auto">
                                {logs.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                        <ServerStackIcon className="w-12 h-12 mb-2 opacity-50" />
                                        <p>Henüz tarama yapılmadı. "Tam Tarama Başlat" butonuna basın.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Zaman</th>
                                                <th className="px-4 py-3">Mesaj</th>
                                                <th className="px-4 py-3">Detay</th>
                                                <th className="px-4 py-3">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {logs.map((log, idx) => (
                                                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.time}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-800">{log.message}</td>
                                                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={log.details}>{log.details || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        {log.success
                                                            ? <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Başarılı</span>
                                                            : <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Hata</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Actions Panel */}
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-4">Veri Temizliği (Tehlikeli)</h3>
                                <div className="space-y-3">
                                    <button onClick={() => clearRequests('overtime')} className="w-full text-left px-4 py-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium transition-colors flex justify-between items-center group">
                                        <span>Tüm Fazla Mesai Taleplerini Sil</span>
                                        <XCircleIcon className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                                    </button>
                                    <button onClick={() => clearRequests('leave')} className="w-full text-left px-4 py-3 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 text-sm font-medium transition-colors flex justify-between items-center group">
                                        <span>Tüm İzin Taleplerini Sil</span>
                                        <XCircleIcon className="w-5 h-5 opacity-50 group-hover:opacity-100" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. LOGIC VERIFICATION (ATTENDANCE ENGINE) */}
                {activeTab === 'logic' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl text-white shadow-lg">
                                <h3 className="text-lg font-bold mb-2">Puantaj Motoru V2</h3>
                                <p className="text-blue-100 text-sm mb-6">
                                    Sistem, 11 kritik senaryo üzerinden kendini test eder. Kişisel ayarlar, mola hakları ve esneme kuralları doğrulanır.
                                </p>
                                <button
                                    onClick={runLogicVerification}
                                    disabled={isVerifying}
                                    className="w-full bg-white text-blue-700 font-bold py-3 rounded-lg shadow hover:bg-blue-50 transition-all flex justify-center items-center gap-2"
                                >
                                    {isVerifying ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CpuChipIcon className="w-5 h-5" />}
                                    {isVerifying ? 'Test Ediliyor...' : 'Doğrulamayı Başlat'}
                                </button>
                            </div>

                            {/* MASS STRESS TEST */}
                            <div className="bg-gradient-to-br from-purple-600 to-fuchsia-700 p-6 rounded-xl text-white shadow-lg mt-4">
                                <h3 className="text-lg font-bold mb-2">Kapsamlı Stres Testi (150+)</h3>
                                <p className="text-purple-100 text-sm mb-6">
                                    Sistemi 150 farklı senaryo ile zorla. Servis, öğle arası, gece yarısı ve uç durumları kontrol et.
                                </p>
                                <button
                                    onClick={async () => {
                                        setIsVerifying(true);
                                        try {
                                            const res = await api.post('/admin/system-health/run_comprehensive_stress_test/');
                                            // Merge results if needed, or handle separately. For now, replacing result.
                                            setVerificationResult({
                                                ...res.data,
                                                summary: `STRES TESTİ: ${res.data.summary}`
                                            });
                                        } catch (e) { console.error(e); }
                                        setIsVerifying(false);
                                    }}
                                    disabled={isVerifying}
                                    className="w-full bg-white text-purple-700 font-bold py-3 rounded-lg shadow hover:bg-purple-50 transition-all flex justify-center items-center gap-2"
                                >
                                    {isVerifying ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
                                    {'150 Senaryoyu Başlat'}
                                </button>
                            </div>

                            {verificationResult && (
                                <div className={`p-4 rounded-xl border ${verificationResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    <div className="text-3xl font-bold mb-1">{verificationResult.summary}</div>
                                    <div className="text-sm opacity-80">Toplam Senaryo Başarımı</div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-700">Senaryo Test Raporu</h3>
                            </div>
                            {!verificationResult ? (
                                <div className="p-12 text-center text-gray-400">
                                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>Detaylı rapor için testi başlatın.</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">No</th>
                                            <th className="px-4 py-3 text-left">Senaryo</th>
                                            <th className="px-4 py-3 text-left">Beklenen</th>
                                            <th className="px-4 py-3 text-center">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {verificationResult.results.map((res) => (
                                            <tr key={res.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-mono text-gray-400">#{res.id}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-800">{res.scenario}</div>
                                                    {res.details && <div className="text-xs text-red-500 mt-1">{res.details}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {res.act_normal !== undefined && (
                                                        <span>Norm: {res.act_normal.toFixed(1)}h / OT: {res.act_ot.toFixed(1)}h</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {res.status === 'PASS'
                                                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Geçti</span>
                                                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Kaldı</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. SERVICE LOGS */}
                {activeTab === 'logs' && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                        <ClockIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Servis Logları</h3>
                        <p className="text-gray-500 mt-2 mb-6">Arka plan servislerinin (Celery) detaylı işlem kayıtları.</p>
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg inline-block text-sm">
                            Bu özellik sonraki güncellemede eklenecektir. Şu an için "Tam Tarama" loglarını kullanınız.
                        </div>
                    </div>
                )}

                {/* 4. SECURITY & GATE */}
                {activeTab === 'security' && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                        <ShieldCheckIcon className="w-16 h-16 mx-auto text-blue-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Güvenlik ve Kapı Entegrasyonu</h3>
                        <p className="text-gray-500 mt-2 mb-6">Kapı geçiş logları ve güvenlik ihlalleri.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                            <div className="p-4 border rounded-lg hover:bg-gray-50">
                                <div className="font-semibold text-gray-700">Gate Event Log</div>
                                <div className="text-sm text-gray-500 mt-1">Ham kapı verilerinin bütünlüğü kontrol edilir. Mükerrer kayıtlar engellenir.</div>
                            </div>
                            <div className="p-4 border rounded-lg hover:bg-gray-50">
                                <div className="font-semibold text-gray-700">Yetkilendirme</div>
                                <div className="text-sm text-gray-500 mt-1">API Token ve izinsiz giriş denemeleri loglanır.</div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={() => { setActiveTab('dashboard'); runDiagnostics(); }}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Güvenlik Taraması yapmak için Genel Bakış sekmesine gidin &rarr;
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </MainLayout>
    );
}

function StatCard({ title, value, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
    };

    return (
        <div className={`p-4 rounded-xl border ${colors[color] || colors.blue}`}>
            <div className="text-xs font-medium opacity-80 uppercase tracking-wide">{title}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
    );
}
