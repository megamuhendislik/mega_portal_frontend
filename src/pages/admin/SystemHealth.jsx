
import React, { useState, useEffect } from 'react';
import {
    Activity, Database, Users, Calendar, AlertTriangle,
    CheckCircle, XCircle, Play, Shield, Terminal,
    FileText, LayoutDashboard, Search, Clock, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

const AdminConsole = () => {
    const [activeTab, setActiveTab] = useState('overview');

    // States
    const [stats, setStats] = useState(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);

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
    }, [activeTab, inspectModel]);

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
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <div className="relative z-10">
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{label}</p>
                <h3 className="text-3xl font-bold text-white mt-2">{value ?? '-'}</h3>
            </div>
        </div>
    );

    const DiagnosticItem = ({ label, passed, icon: Icon, loading }) => {
        let statusColor = "text-gray-500";
        let statusIcon = <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;

        if (loading) {
            statusColor = "text-blue-400";
            statusIcon = <RefreshCw className="w-5 h-5 animate-spin" />;
        } else if (passed === true) {
            statusColor = "text-green-500";
            statusIcon = <CheckCircle className="w-5 h-5" />;
        } else if (passed === false) {
            statusColor = "text-red-500";
            statusIcon = <XCircle className="w-5 h-5" />;
        }

        return (
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                    <Icon className="text-gray-400" size={20} />
                    <span className="text-gray-300 font-medium">{label}</span>
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
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Shield className="text-blue-500" size={32} />
                        Sistem Yönetim Konsolu
                    </h1>
                    <p className="text-gray-400 mt-1">Sistem gözetimi, test ve veri inceleme merkezi</p>
                </div>

                {/* Tabs */}
                <div className="bg-slate-900 p-1 rounded-xl flex items-center gap-1 border border-white/10">
                    {[
                        { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
                        { id: 'diagnostics', label: 'Tanı Testleri', icon: Activity },
                        { id: 'inspector', label: 'Veri Müfettişi', icon: Search },
                        // { id: 'simulator', label: 'Simülasyon', icon: Play },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
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

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                        <StatCard
                            label="Toplam Personel"
                            value={stats?.total_employees}
                            icon={Users}
                            color="text-blue-500"
                        />
                        <StatCard
                            label="Bugünkü Aktif Mesai"
                            value={stats?.attendance_today}
                            icon={Clock}
                            color="text-emerald-500"
                        />
                        <StatCard
                            label="Bekleyen İzinler"
                            value={stats?.pending_leave_requests}
                            icon={FileText}
                            color="text-amber-500"
                        />
                        <StatCard
                            label="Aylık Fazla Mesai (Dk)"
                            value={stats?.total_overtime_month}
                            icon={Activity}
                            color="text-purple-500"
                        />
                    </div>
                )}

                {/* DIAGNOSTICS TAB */}
                {activeTab === 'diagnostics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-400" />
                                    Test Senaryoları
                                </h3>
                                <div className="space-y-3">
                                    <DiagnosticItem label="Veritabanı Ping" passed={diagResults?.database} loading={diagLoading && !diagResults} icon={Database} />
                                    <DiagnosticItem label="Personel CRUD" passed={diagResults?.employee} loading={diagLoading && !diagResults} icon={Users} />
                                    <DiagnosticItem label="Mesai Hesaplama" passed={diagResults?.attendance} loading={diagLoading && !diagResults} icon={Clock} />
                                    <DiagnosticItem label="Talep & Onay Akışı" passed={diagResults?.requests} loading={diagLoading && !diagResults} icon={FileText} />
                                    <DiagnosticItem label="Veri Temizliği" passed={diagResults?.cleanup} loading={diagLoading && !diagResults} icon={Shield} />
                                </div>
                                <button
                                    onClick={runDiagnostics}
                                    disabled={diagLoading}
                                    className={`w-full mt-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${diagLoading ? 'bg-white/5 text-gray-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                        }`}
                                >
                                    {diagLoading ? <RefreshCw className="animate-spin" /> : <Play size={18} />}
                                    {diagLoading ? 'Test Yürütülüyor...' : 'Tam Sistem Taraması Başlat'}
                                </button>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <div className="bg-[#0f1115] border border-white/10 rounded-xl p-6 h-full flex flex-col">
                                <h3 className="text-gray-400 font-mono text-sm mb-4 flex items-center gap-2">
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
                        <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-white/10">
                            <span className="text-gray-400 font-medium">Model Seçin:</span>
                            <select
                                value={inspectModel}
                                onChange={(e) => setInspectModel(e.target.value)}
                                className="bg-black/20 text-white border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
            </div>
        </div>
    );
};

export default AdminConsole;
