import React, { useState, useEffect } from 'react';
import {
    Calendar, Filter, Download, ChevronRight, Clock, AlertCircle,
    CheckCircle, Coffee, Users, TrendingUp, Activity, Briefcase,
    MoreHorizontal, Search, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import moment from 'moment';
import useInterval from '../hooks/useInterval';

const AttendanceTracking = ({ embedded = false, year: propYear, month: propMonth, scope = 'MONTHLY' }) => {
    const { hasPermission } = useAuth();
    const [viewMode, setViewMode] = useState('LIST'); // LIST, GRID
    const [matrixData, setMatrixData] = useState(null);

    // State
    const [year, setYear] = useState(propYear || moment().year());
    const [month, setMonth] = useState(propMonth || moment().month() + 1);

    useEffect(() => {
        if (propYear) setYear(propYear);
        if (propMonth) setMonth(propMonth);
    }, [propYear, propMonth]);

    const [selectedDept, setSelectedDept] = useState('');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Summary State
    const [summary, setSummary] = useState({
        totalWorked: 0,
        totalOvertime: 0,
        totalMissing: 0,
        netBalance: 0,
        activeCount: 0,
        efficiency: 0
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (viewMode === 'GRID') {
            fetchTeamMatrix();
        } else {
            fetchStats();
        }
    }, [viewMode, year, month, selectedDept]);

    // Auto-Refresh
    useInterval(() => {
        if (!loading) {
            viewMode === 'GRID' ? fetchTeamMatrix() : fetchStats();
        }
    }, 30000);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments/');
            setDepartments(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;
            params.include_inactive = 'true'; // Backend supports this now

            const res = await api.get('/dashboard/stats/', { params });
            const data = Array.isArray(res.data) ? res.data : [];
            setStats(data);

            // Calculate Executive Summaries
            const worked = data.reduce((acc, curr) => acc + (curr.total_worked || 0), 0);
            const required = data.reduce((acc, curr) => acc + (curr.monthly_required || 0), 0);
            const overtime = data.reduce((acc, curr) => acc + (curr.total_overtime || 0), 0);
            const missing = data.reduce((acc, curr) => acc + (curr.total_missing || 0), 0);
            const balance = data.reduce((acc, curr) => acc + (curr.monthly_net_balance || 0), 0);

            // Online Count (Real-Time)
            const online = (data || []).filter(d => d.is_online).length;
            const active = data.length;

            setSummary({
                totalWorked: worked,
                totalOvertime: overtime,
                totalMissing: missing,
                netBalance: balance,
                activeCount: active,
                onlineCount: online // Replaces Efficiency
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamMatrix = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;
            const res = await api.get('/stats/team_matrix/', { params });
            // Matrix data must have .data property which is array
            setMatrixData(res.data && Array.isArray(res.data.data) ? res.data : null);
        } catch (error) {
            console.error('Error fetching matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatMinutes = (minutes) => {
        if (!minutes) return '0s 0dk';
        const hours = Math.floor(Math.abs(minutes) / 60);
        const mins = Math.abs(minutes) % 60;
        return `${hours}s ${mins}dk`;
    };

    // Filter Logic
    const filteredStats = stats.filter(item =>
        (item.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.department || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderGridView = () => {
        if (!matrixData) return null;
        const daysHeader = Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1);

        return (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-4 text-left border-b min-w-[200px] sticky left-0 z-10 bg-slate-50/95 backdrop-blur">Personel</th>
                                {daysHeader.map(d => (
                                    <th key={d} className="p-2 text-center border-b min-w-[40px] text-xs font-semibold text-slate-500">
                                        {d}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrixData.data.map(row => (
                                <tr key={row.employee.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0">
                                    <td className="p-4 bg-white/95 sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="font-bold text-slate-800">{row.employee.name}</div>
                                        <div className="text-xs text-slate-500">{row.employee.department}</div>
                                    </td>
                                    {row.days.map((day, idx) => (
                                        <td key={idx} className="p-1 text-center relative group">
                                            <div
                                                className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform hover:scale-110 hover:shadow-md cursor-help"
                                                style={{ backgroundColor: day.color }}
                                            >
                                                {day.status === 'NORMAL' ? '✓' :
                                                    day.status === 'MISSING' ? '!' :
                                                        day.status === 'OVERTIME' ? '+' :
                                                            day.status === 'OFF' ? '-' :
                                                                day.status === 'HOLIDAY' ? 'H' :
                                                                    day.status === 'LEAVE' ? 'İ' : '•'}
                                            </div>
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 w-48 bg-slate-900/90 text-white text-xs p-3 rounded-lg shadow-xl backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                                <div className="font-bold mb-1 border-b border-white/20 pb-1">{moment(day.date).format('LL')}</div>
                                                <div className="leading-relaxed">{day.description}</div>
                                                <div className="mt-1 text-xs opacity-70">Giriş/Çıkış: {day.check_in || '-'} / {day.check_out || '-'}</div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">

            {/* Header Area */}
            {!embedded && (
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
                            Yönetici Konsolu
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Ekip performansı ve mesai durumunun gerçek zamanlı analizi.</p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Personel ara..."
                                className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            {moment.months().map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-700 py-2 pl-3 pr-8 cursor-pointer hover:bg-slate-100 transition-colors max-w-[200px]"
                        >
                            <option value="">Tüm Ekip</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Activity size={18} /></button>
                            <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Calendar size={18} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Embedded Controls */}
            {embedded && (
                <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Ekip içinde ara..."
                                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all w-64 shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 py-2.5 pl-3 pr-8 cursor-pointer hover:border-indigo-300 transition-colors max-w-[200px] shadow-sm"
                        >
                            <option value="">Tüm Ekip</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Activity size={18} /></button>
                        <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><Calendar size={18} /></button>
                    </div>
                </div>
            )}

            {/* Executive Summary Cards */}
            <div className={`grid gap-6 ${scope === 'DAILY' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
                <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Users size={28} className="text-white" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Toplam Personel</p>
                            <h3 className="text-3xl font-bold">{summary.activeCount} <span className="text-sm font-normal text-indigo-200">Kişi</span></h3>
                        </div>
                    </div>
                </div>

                <div className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <div className="relative">
                                <Users size={28} />
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Şu an Ofiste</p>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800">{summary.onlineCount} <span className="text-sm font-normal text-slate-400">Kişi</span></h3>
                        </div>
                    </div>
                    {/* Progress Bar for Online Ratio */}
                    <div className="h-1 w-full bg-slate-100 mt-4 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                            style={{ width: `${summary.activeCount > 0 ? (summary.onlineCount / summary.activeCount) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                {scope !== 'DAILY' && (
                    <>
                        <div className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                    <Clock size={28} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Fazla Mesai</p>
                                    <div className="flex items-end gap-2">
                                        <h3 className="text-3xl font-bold text-slate-800">{formatMinutes(summary.totalOvertime)}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${summary.totalMissing > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <AlertCircle size={28} />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Kayıp Zaman</p>
                                    <h3 className="text-3xl font-bold text-slate-800">{formatMinutes(summary.totalMissing)}</h3>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            {viewMode === 'LIST' ? (
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="p-6">Personel Detay</th>
                                    <th className="p-6">Durum</th>
                                    {scope === 'DAILY' ? (
                                        <>
                                            <th className="p-6">Giriş Saati</th>
                                            <th className="p-6">Çıkış Saati</th>
                                            <th className="p-6 text-right">Normal</th>
                                            <th className="p-6 text-right">Fazla</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-6 w-1/4">Performans Hedefi</th>
                                            <th className="p-6 text-right">Normal</th>
                                            <th className="p-6 text-right">Fazla</th>
                                            <th className="p-6 text-right">Eksik</th>
                                            <th className="p-6 text-center">Bakiye</th>
                                        </>
                                    )}
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-slate-400 animate-pulse">Analiz ediliyor...</td></tr>
                                ) : filteredStats.length === 0 ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-slate-400">Görüntülenecek veri bulunamadı.</td></tr>
                                ) : (
                                    filteredStats.map(item => {
                                        // Calc percentage for progress bar
                                        const total = item.total_worked + item.total_missing;
                                        const percent = total > 0 ? Math.min(100, (item.total_worked / total) * 100) : 0;

                                        return (
                                            <tr key={item.employee_id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm">
                                                                {(item.employee_name || '?').charAt(0)}
                                                            </div>
                                                            {item.is_online && (
                                                                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-emerald-500"></span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800">{item.employee_name}</div>
                                                            <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">{item.department}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    {/* Status Priority: Online > Critical > High Performance > Normal */}
                                                    {item.is_online ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Ofiste
                                                        </span>
                                                    ) : item.total_missing > 300 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200">
                                                            Dışarıda
                                                        </span>
                                                    ) : item.total_overtime > 600 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Yoğun
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Normal
                                                        </span>
                                                    )}
                                                </td>
                                                {scope === 'DAILY' ? (
                                                    <>
                                                        <td className="p-6 font-mono text-sm font-semibold text-slate-700">
                                                            {item.today_check_in ? moment(item.today_check_in).format('HH:mm') : '-'}
                                                        </td>
                                                        <td className="p-6 font-mono text-sm font-semibold text-slate-700">
                                                            {item.today_check_out ? moment(item.today_check_out).format('HH:mm') : '-'}
                                                        </td>
                                                        <td className="p-6 text-right font-mono text-sm font-semibold text-slate-600">
                                                            {formatMinutes(item.today_normal)}
                                                        </td>
                                                        <td className="p-6 text-right font-mono text-sm font-bold text-amber-600">
                                                            {item.today_overtime > 0 ? `+${formatMinutes(item.today_overtime)}` : '-'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-6">
                                                            <div className="flex justify-between text-xs mb-1 font-semibold text-slate-600">
                                                                <span>İlerleme</span>
                                                                <span>{Math.round(percent)}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-1000 ${percent < 80 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                                                    style={{ width: `${percent}%` }}
                                                                ></div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right font-mono text-sm font-semibold text-slate-600">
                                                            {formatMinutes(item.total_worked)}
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            {item.total_overtime > 0 && (
                                                                <span className="font-mono text-sm font-bold text-amber-600 flex items-center justify-end gap-1">
                                                                    <ArrowUpRight size={14} className="stroke-[3]" />
                                                                    {formatMinutes(item.total_overtime)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            {item.total_missing > 0 && (
                                                                <span className="font-mono text-sm font-bold text-red-500 flex items-center justify-end gap-1">
                                                                    <ArrowDownRight size={14} className="stroke-[3]" />
                                                                    {formatMinutes(item.total_missing)}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <div className="inline-flex flex-col items-end">
                                                                <div className="text-xs font-bold text-slate-400 mb-0.5">YILLIK İZİN</div>
                                                                <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                                    {item.annual_leave_balance !== undefined ? `${item.effective_leave_balance} Gün` : '-'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </>
                                                )
                                                }
                                                <td className="p-6 text-right">
                                                    <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all group-hover:text-slate-500">
                                                        <MoreHorizontal size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                renderGridView()
            )
            }
        </div >
    );
};

export default AttendanceTracking;
