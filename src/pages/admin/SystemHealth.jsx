
import React, { useState, useEffect } from 'react';
import {
    Activity, Database, Users, Calendar, AlertTriangle,
    CheckCircle, XCircle, Play, Shield, Terminal,
    FileText, LayoutDashboard, Search, Clock, RefreshCw, Settings, Save, Trash2
} from 'lucide-react';
import api from '../../services/api';

const AdminConsole = () => {
    const [activeTab, setActiveTab] = useState('overview');

    // States
    const [stats, setStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({ attendance_start_date: '' });
    const [isSettingsLoading, setIsSettingsLoading] = useState(false);

    // Diagnostics State
    const [diagLoading, setDiagLoading] = useState(false);
    const [diagLogs, setDiagLogs] = useState([]);
    const [diagResults, setDiagResults] = useState(null);

    // Data Inspector State
    const [inspectModel, setInspectModel] = useState('employee');
    const [inspectData, setInspectData] = useState([]);
    const [inspectLoading, setInspectLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'overview') fetchStats();
        if (activeTab === 'inspector') fetchRawData(inspectModel);
        if (activeTab === 'settings') fetchSettings();
    }, [activeTab, inspectModel]);

    const fetchSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const res = await api.get('/settings/');
            setSettings(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSettingsLoading(false);
        }
    };

    const updateSettings = async () => {
        try {
            await api.post('/settings/', settings);
            alert('Ayarlar kaydedildi.');
        } catch (err) {
            alert('Kaydetme hatası: ' + err.message);
        }
    };

    const handleResetAll = async () => {
        if (!window.confirm("DİKKAT! TÜM MESAİ VERİLERİ SİLİNECEK.\n\nBu işlem geri alınamaz.\nEmin misiniz?")) return;

        // Second check
        const confirmText = prompt("Onaylamak için 'SIL' yazın:");
        if (confirmText !== 'SIL') return;

        try {
            await api.post('/attendance/reset-all-data/');
            alert('Tüm veriler başarıyla silindi.');
        } catch (err) {
            alert('Sıfırlama hatası: ' + (err.response?.data?.error || err.message));
        }
    };

    const fetchStats = async () => {
        setIsStatsLoading(true);
        try {
            const res = await api.get('/system/health-check/get_system_stats/');
            setStats(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const fetchRawData = async (model) => {
        setInspectLoading(true);
        try {
            const res = await api.get(`/system/health-check/get_raw_data/?model=${model}`);
            setInspectData(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setInspectLoading(false);
        }
    };

    const runDiagnostics = async () => {
        setDiagLoading(true);
        setDiagLogs([]);
        setDiagResults(null);
        try {
            const response = await api.post('/system/health-check/run_diagnostics/');
            setDiagResults(response.data.results);
            setDiagLogs(response.data.logs);
        } catch (err) {
            console.error(err);
            if (err.response?.data?.logs) setDiagLogs(err.response.data.logs);
        } finally {
            setDiagLoading(false);
        }
    };

    // Components
    const StatCard = ({ label, value, icon: Icon, color }) => (
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden group hover:border-blue-300 hover:shadow-md transition-all">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <div className="relative z-10">
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{label}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">{value ?? '-'}</h3>
            </div>
        </div>
    );

    const DiagnosticItem = ({ label, passed, icon: Icon, loading }) => {
        let statusColor = "text-slate-400";
        let statusBg = "bg-slate-50";
        let statusIcon = <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;

        if (loading) {
            statusColor = "text-blue-600";
            statusBg = "bg-blue-50";
            statusIcon = <RefreshCw className="w-5 h-5 animate-spin" />;
        } else if (passed === true) {
            statusColor = "text-emerald-600";
            statusBg = "bg-emerald-50";
            statusIcon = <CheckCircle className="w-5 h-5" />;
        } else if (passed === false) {
            statusColor = "text-red-600";
            statusBg = "bg-red-50";
            statusIcon = <XCircle className="w-5 h-5" />;
        }

        return (
            <div className={`flex items-center justify-between p-4 rounded-xl border border-slate-200 transition-colors ${statusBg} hover:shadow-sm`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white ${statusColor} shadow-sm border border-slate-100`}>
                        <Icon size={20} />
                    </div>
                    <span className="text-slate-700 font-semibold">{label}</span>
                </div>
                <div className={statusColor}>{statusIcon}</div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Shield className="text-blue-600" size={32} />
                        Sistem Yönetim Konsolu
                    </h1>
                    <p className="text-slate-500 mt-1">Sistem gözetimi, test ve veri inceleme merkezi</p>
                </div>

                {/* Tabs */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                    {[
                        { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
                        { id: 'diagnostics', label: 'Tanı Testleri', icon: Activity },
                        { id: 'inspector', label: 'Veri Müfettişi', icon: Search },
                        { id: 'settings', label: 'Ayarlar', icon: Settings },
                        // { id: 'simulator', label: 'Simülasyon', icon: Play },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[600px]">

                {/* OVERVIEW TAB - REPLACED WITH ACTION CENTER */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in space-y-6">

                        {/* Primary Action Hero */}
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-8 md:p-12 text-center text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>

                            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                                <div className="inline-flex p-4 bg-white/10 rounded-full backdrop-blur-md mb-2 ring-1 ring-white/20">
                                    <RefreshCw size={48} className="animate-spin-slow" />
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight">
                                    Tüm Mesaileri Hesapla
                                </h2>
                                <p className="text-blue-100 text-lg md:text-xl font-medium leading-relaxed">
                                    Sistemdeki tüm personelin bu ayki giriş-çıkış verilerini, mola kesintilerini ve fazla mesailerini
                                    gerçek zamanlı kurallara göre yeniden hesaplar.
                                </p>

                                <button
                                    onClick={async () => {
                                        if (!window.confirm('DİKKAT: Tüm personelin bu ayki verileri yeniden hesaplanacak.\nBu işlem sistem yoğunluğuna göre biraz zaman alabilir.\n\nDevam edilsin mi?')) return;
                                        setDiagLoading(true);
                                        try {
                                            const res = await api.post('/attendance/recalculate_all/');
                                            alert(res.data.message);
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: true, message: 'Toplu Hesaplama Tamamlandı', details: res.data.message }]);
                                        } catch (err) {
                                            alert('Hata: ' + (err.response?.data?.error || err.message));
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: false, message: 'Toplu Hesaplama Hatası', details: err.message }]);
                                        } finally {
                                            setDiagLoading(false);
                                        }
                                    }}
                                    disabled={diagLoading}
                                    className={`
                                        w-full md:w-auto px-8 py-4 bg-white text-blue-700 rounded-xl font-black text-lg 
                                        shadow-lg active:scale-95 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 mx-auto
                                        ${diagLoading ? 'opacity-70 cursor-wait' : 'hover:shadow-2xl hover:-translate-y-1'}
                                    `}
                                >
                                    {diagLoading ? <RefreshCw className="animate-spin" /> : <Play fill="currentColor" />}
                                    {diagLoading ? 'Hesaplanıyor...' : 'HESAPLAMAYI BAŞLAT'}
                                </button>

                                {diagLoading && (
                                    <p className="text-sm text-blue-200 animate-pulse">
                                        İşlem devam ediyor, lütfen sayfayı kapatmayın...
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Recent Stats (Mini) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-70 hover:opacity-100 transition-opacity">
                            <StatCard label="Personel" value={stats?.total_employees} icon={Users} color="text-slate-400" />
                            <StatCard label="Bugün Mesai" value={stats?.attendance_today} icon={Clock} color="text-slate-400" />
                            <StatCard label="Bekleyen" value={stats?.pending_leave_requests} icon={FileText} color="text-slate-400" />
                            <StatCard label="Aylık FM" value={stats?.total_overtime_month} icon={Activity} color="text-slate-400" />
                        </div>
                    </div>
                )}

                {/* DIAGNOSTICS TAB */}
                {activeTab === 'diagnostics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2 text-lg">
                                    <Activity size={20} className="text-blue-600" />
                                    Test Senaryoları
                                </h3>
                                <div className="space-y-3">
                                    <DiagnosticItem label="Veritabanı Ping" passed={diagResults?.database} loading={diagLoading && !diagResults} icon={Database} />
                                    <DiagnosticItem label="Personel CRUD" passed={diagResults?.employee} loading={diagLoading && !diagResults} icon={Users} />
                                    <DiagnosticItem label="Mesai Hesaplama" passed={diagResults?.attendance} loading={diagLoading && !diagResults} icon={Clock} />
                                    <DiagnosticItem label="1-Dk'lık Oto-Düzeltme" passed={diagResults?.continuous} loading={diagLoading && !diagResults} icon={RefreshCw} />
                                    <DiagnosticItem label="Talep & Onay Akışı" passed={diagResults?.requests} loading={diagLoading && !diagResults} icon={FileText} />
                                    <DiagnosticItem label="Veri Temizliği" passed={diagResults?.cleanup} loading={diagLoading && !diagResults} icon={Shield} />
                                </div>
                                <button
                                    onClick={runDiagnostics}
                                    disabled={diagLoading}
                                    className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${diagLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {diagLoading ? <RefreshCw className="animate-spin" /> : <Play size={20} />}
                                    {diagLoading ? 'Test Yürütülüyor...' : 'Tam Sistem Taraması Başlat'}
                                </button>
                            </div>

                            {/* Attendance Logic V2 Diagnostics */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mt-6">
                                <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2 text-lg">
                                    <Clock size={20} className="text-purple-600" />
                                    Mesai Mantığı (V2) Testi
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    Sistemin V2 kurallarına (Extension, Mola İadesi, Ölü Bölge) uyumluluğunu 10 kritik senaryo ile test eder.
                                </p>

                                <button
                                    onClick={async () => {
                                        setDiagLoading(true);
                                        try {
                                            const res = await api.post('/system/health-check/run_attendance_diagnostics/');
                                            if (res.data.success) {
                                                alert(`Test Tamamlandı!\n${res.data.summary}`);
                                                setDiagLogs(prev => [
                                                    ...prev,
                                                    {
                                                        time: new Date().toLocaleTimeString(),
                                                        success: true,
                                                        message: 'V2 Logic Test Passed',
                                                        details: res.data.summary
                                                    },
                                                    ...res.data.results.filter(r => r.status !== 'PASS').map(r => ({
                                                        time: r.date,
                                                        success: false,
                                                        message: `FAIL: ${r.scenario}`,
                                                        details: r.details
                                                    }))
                                                ]);
                                            } else {
                                                alert('Hata: ' + res.data.error);
                                            }
                                        } catch (err) {
                                            alert('Bağlantı Hatası: ' + err.message);
                                        } finally {
                                            setDiagLoading(false);
                                        }
                                    }}
                                    disabled={diagLoading}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${diagLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {diagLoading ? <RefreshCw className="animate-spin" /> : <Terminal size={20} />}
                                    {diagLoading ? 'Test Ediliyor...' : 'V2 Senaryolarını Çalıştır'}
                                </button>
                            </div>

                            {/* Data Correction Tools */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mt-6">
                                <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2 text-lg">
                                    <RefreshCw size={20} className="text-emerald-600" />
                                    Veri Düzeltme
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    Mesai hesaplamalarında tutarsızlık varsa, tüm personelin bu ayki verilerini baştan hesaplatabilirsiniz.
                                </p>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Tüm personelin bu ayki mesai verileri yeniden hesaplanacak. Bu işlem birkaç saniye sürebilir. Devam edilsin mi?')) return;
                                        setDiagLoading(true);
                                        try {
                                            const res = await api.post('/attendance/recalculate_all/'); // check trailing slash
                                            alert(res.data.message);
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: true, message: 'Recalculation Complete', details: res.data.message }]);
                                        } catch (err) {
                                            alert('Hata: ' + (err.response?.data?.error || err.message));
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: false, message: 'Recalculation Failed', details: err.message }]);
                                        } finally {
                                            setDiagLoading(false);
                                        }
                                    }}
                                    disabled={diagLoading}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${diagLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {diagLoading ? <RefreshCw className="animate-spin" /> : <RefreshCw size={20} />}
                                    {diagLoading ? 'İşleniyor...' : 'Tüm Verileri Yeniden Hesapla'}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Veritabanındaki mükerrer (duplicate) mesai kayıtları temizlenecek. Devam edilsin mi?')) return;
                                        setDiagLoading(true);
                                        try {
                                            const res = await api.post('/attendance/cleanup_duplicates/');
                                            alert(`Temizlik Tamamlandı.\nSilinen Kayıt: ${res.data.total_deleted}`);
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: true, message: 'Cleanup Completed', details: `Deleted ${res.data.total_deleted} duplicates.` }]);
                                        } catch (err) {
                                            alert('Hata: ' + (err.response?.data?.error || err.message));
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: false, message: 'Cleanup Failed', details: err.message }]);
                                        } finally {
                                            setDiagLoading(false);
                                        }
                                    }}
                                    disabled={diagLoading}
                                    className={`w-full py-3 mt-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${diagLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {diagLoading ? 'Temizleniyor...' : 'Çoklu Kayıtları Temizle (Fix)'}
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Veritabanındaki TÜM İZİN ve MESAİ TALEPLERİ silinecek. (Personel kalacak, sadece talep kayıtları uçar).\n\nDevam edilsin mi?')) return;
                                        setDiagLoading(true);
                                        try {
                                            const res = await api.post('/system/health-check/clear_requests/', { model_type: 'all' });
                                            alert(`Talepler Temizlendi.\n${res.data.message}`);
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: true, message: 'Requests Cleared', details: res.data.message }]);
                                        } catch (err) {
                                            alert('Hata: ' + (err.response?.data?.error || err.message));
                                            setDiagLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), success: false, message: 'Clear Requests Failed', details: err.message }]);
                                        } finally {
                                            setDiagLoading(false);
                                        }
                                    }}
                                    disabled={diagLoading}
                                    className={`w-full py-3 mt-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${diagLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:scale-[1.02]'
                                        }`}
                                >
                                    {diagLoading ? <RefreshCw className="animate-spin" /> : <Trash2 size={20} />}
                                    {diagLoading ? 'Siliniyor...' : 'Tüm Talepleri Sıfırla (Temizle)'}
                                </button>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
                                <h3 className="text-slate-400 font-mono text-sm mb-4 flex items-center gap-2">
                                    <Terminal size={14} /> SYS_DIAGNOSTIC_LOG
                                </h3>
                                <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2 max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                                    {diagLogs.length === 0 && <span className="text-gray-600">// Ready to start diagnostics...</span>}
                                    {diagLogs.map((log, i) => (
                                        <div key={i} className={`flex gap-3 ${log.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                            <span className="text-gray-600 shrink-0">[{log.time}]</span>
                                            <div className="break-all">
                                                <span>{log.success ? '✓' : '✗'} {log.message}</span>
                                                {log.details && <div className="ml-4 text-xs text-gray-500 border-l border-gray-700 pl-2 mt-1 font-sans opacity-70">{log.details}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INSPECTOR TAB */}
                {activeTab === 'inspector' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-600 font-medium">Model Seçin:</span>
                            <select
                                value={inspectModel}
                                onChange={(e) => setInspectModel(e.target.value)}
                                className="bg-slate-50 text-slate-900 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="employee">Personel Listesi (Employees)</option>
                                <option value="attendance">Mesai Kayıtları (Attendances)</option>
                                <option value="leaverequest">İzin Talepleri (Requests)</option>
                                <option value="user">Sistem Kullanıcıları (Users)</option>
                            </select>
                            {inspectLoading && <RefreshCw className="text-blue-400 animate-spin" size={20} />}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            {inspectData.length > 0 && Object.keys(inspectData[0]).map(key => (
                                                <th key={key} className="px-6 py-4 uppercase tracking-wider text-xs">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inspectData.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j} className="px-6 py-4 text-slate-700 font-medium">
                                                        {val === true ? 'Evet' : val === false ? 'Hayır' : val}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {inspectData.length === 0 && !inspectLoading && (
                                            <tr>
                                                <td colSpan="100" className="px-6 py-12 text-center text-slate-400">Veri bulunamadı.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-fade-in space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Settings className="text-blue-600" /> Sistem Ayarları
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Sistemin Başlangıç Günü
                                    </label>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Bu tarihten önceki eksik ve fazla mesailer, toplam hesaplamasına dâhil edilmeyecektir.
                                    </p>
                                    <input
                                        type="date"
                                        value={settings.attendance_start_date || ''}
                                        onChange={(e) => setSettings({ ...settings, attendance_start_date: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={updateSettings}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                                >
                                    <Save size={18} />
                                    Kaydet
                                </button>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                            <h3 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-red-600" /> Tehlikeli Bölge
                            </h3>
                            <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                                <p className="text-red-800 font-medium mb-2">Tüm Mesaileri Sıfırla</p>
                                <p className="text-red-600 text-sm mb-4">
                                    Tüm personelin giriş-çıkış (Attendance), fazla mesai (Overtime) ve log datalarını kalıcı olarak siler.
                                    Personel kayıtları silinmez. Geri alınamaz.
                                </p>
                                <button
                                    onClick={handleResetAll}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                                >
                                    <Trash2 size={18} /> (Sadece Admin) Tüm Mesaileri Sıfırla
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminConsole;
