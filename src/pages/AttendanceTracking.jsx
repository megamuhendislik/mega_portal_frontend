import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, ChevronRight, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';

import useInterval from '../hooks/useInterval';

const AttendanceTracking = () => {
    const [viewMode, setViewMode] = useState('LIST'); // LIST, GRID
    const [matrixData, setMatrixData] = useState(null);

    // Missing State
    const [year, setYear] = useState(moment().year());
    const [month, setMonth] = useState(moment().month() + 1);
    const [selectedDept, setSelectedDept] = useState('');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);

    // Summary State
    const [totalWorked, setTotalWorked] = useState(0);
    const [totalOvertime, setTotalOvertime] = useState(0);
    const [totalMissing, setTotalMissing] = useState(0);
    const [netBalance, setNetBalance] = useState(0);

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

    // Auto-Refresh (Every 30s)
    useInterval(() => {
        if (!loading) {
            if (viewMode === 'GRID') {
                fetchTeamMatrix();
            } else {
                fetchStats();
            }
        }
    }, 30000);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments/');
            setDepartments(res.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;

            const res = await api.get('/dashboard/stats/', { params });
            const data = res.data;
            setStats(data);

            // Calculate Totals
            const worked = data.reduce((acc, curr) => acc + (curr.total_minutes || 0), 0);
            const overtime = data.reduce((acc, curr) => acc + (curr.total_overtime || 0), 0);
            const missing = data.reduce((acc, curr) => acc + (curr.total_missing || 0), 0);
            const balance = data.reduce((acc, curr) => acc + (curr.monthly_net_balance || 0), 0);

            setTotalWorked(worked);
            setTotalOvertime(overtime);
            setTotalMissing(missing);
            setNetBalance(balance);

        } catch (error) {
            console.error('Error fetching stats:', error);
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

    const fetchTeamMatrix = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;

            const res = await api.get('/stats/team_matrix/', { params });
            setMatrixData(res.data);
        } catch (error) {
            console.error('Error fetching matrix:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderGridView = () => {
        if (!matrixData) return null;

        const daysHeader = Array.from({ length: matrixData.days_in_month }, (_, i) => i + 1);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 text-left bg-slate-50 border-b border-r border-slate-200 min-w-[200px] sticky left-0 z-10">Personel</th>
                                {daysHeader.map(d => (
                                    <th key={d} className="p-2 text-center bg-slate-50 border-b border-slate-200 min-w-[40px] text-xs text-slate-500 font-medium">
                                        {d}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrixData.data.map(row => (
                                <tr key={row.employee.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 border-b border-r border-slate-200 bg-white sticky left-0 z-10">
                                        <div className="font-medium text-slate-800">{row.employee.name}</div>
                                        <div className="text-xs text-slate-500">{row.employee.department}</div>
                                    </td>
                                    {row.days.map((day, idx) => (
                                        <td key={idx} className="p-1 border-b border-slate-100 text-center relative group">
                                            <div
                                                className="w-8 h-8 mx-auto rounded-md flex items-center justify-center text-xs font-bold text-white cursor-help transition-transform hover:scale-110"
                                                style={{ backgroundColor: day.color }}
                                            >
                                                {day.status === 'NORMAL' ? '✓' :
                                                    day.status === 'MISSING' ? '!' :
                                                        day.status === 'OVERTIME' ? '+' :
                                                            day.status === 'OFF' ? '-' :
                                                                day.status === 'HOLIDAY' ? 'H' :
                                                                    day.status === 'LEAVE' ? 'İ' :
                                                                        day.status === 'ABSENT' ? 'X' : ''}
                                            </div>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg pointer-events-none">
                                                <div className="font-bold mb-1">{moment(day.date).format('LL')}</div>
                                                <div>{day.description}</div>
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-slate-800"></div>
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
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Mesai Takip & Raporlama</h2>
                    <p className="text-slate-500 mt-1">Personel bazlı fazla ve eksik mesai takibi</p>
                </div>

                <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Liste
                        </button>
                        <button
                            onClick={() => setViewMode('GRID')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'GRID' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Takvim
                        </button>
                    </div>

                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    >
                        {moment.months().map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>

                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 min-w-[150px]"
                    >
                        <option value="">Tüm Departmanlar</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Excel İndir">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'LIST' ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Normal Mesai</p>
                                <h3 className="text-2xl font-bold text-slate-800">{formatMinutes(totalWorked)}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Fazla Mesai</p>
                                <h3 className="text-2xl font-bold text-slate-800">{formatMinutes(totalOvertime)}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Eksik Mesai</p>
                                <h3 className="text-2xl font-bold text-slate-800">{formatMinutes(totalMissing)}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Net Mesai</p>
                                <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                    {netBalance > 0 ? '+' : ''}{formatMinutes(netBalance)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                        <th className="p-4">Personel</th>
                                        <th className="p-4">Departman</th>
                                        <th className="p-4 text-center text-blue-600">İzin Bakiye</th>
                                        <th className="p-4 text-right">Toplam Çalışma</th>
                                        <th className="p-4 text-right text-orange-600">Geç Kalma</th>
                                        <th className="p-4 text-right text-orange-600">Erken Çıkma</th>
                                        <th className="p-4 text-right text-green-600">Fazla Mesai</th>
                                        <th className="p-4 text-right text-red-600">Eksik Mesai</th>
                                        <th className="p-4 text-right">Net Durum</th>
                                        <th className="p-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="9" className="p-8 text-center">Yükleniyor...</td></tr>
                                    ) : stats.length === 0 ? (
                                        <tr><td colSpan="9" className="p-8 text-center text-slate-400">Veri bulunamadı.</td></tr>
                                    ) : (
                                        stats.map(item => (
                                            <tr key={item.employee_id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4 font-medium text-slate-800">{item.employee_name}</td>
                                                <td className="p-4 text-slate-500 text-sm">{item.department}</td>
                                                <td className="p-4 text-center">
                                                    {item.annual_leave_balance !== undefined ? (
                                                        <div className="flex flex-col gap-1 text-[10px] w-[180px] mx-auto bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                            <div className="flex justify-between border-b border-slate-200 pb-1 mb-1">
                                                                <span className="text-slate-400 font-bold uppercase">ANA BAKİYE</span>
                                                                <span className="text-slate-700 font-bold">{item.annual_leave_balance}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-indigo-400 font-bold uppercase">HAK EDİŞE</span>
                                                                <span className="text-indigo-600 font-bold">{item.days_to_next_accrual !== undefined ? `${item.days_to_next_accrual}g` : '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-amber-500 font-bold uppercase">BU YIL</span>
                                                                <span className="text-amber-600 font-bold">{item.annual_leave_used_this_year || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-blue-500">
                                                                <span className="font-bold uppercase">SONRAKİ</span>
                                                                <span className="font-bold truncate max-w-[80px]" title={item.next_leave_request ? `${item.next_leave_request.start_date}` : ''}>
                                                                    {item.next_leave_request ? item.next_leave_request.start_date.split('-').slice(1).reverse().join('.') : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-4 text-right text-slate-600 font-mono text-sm">{formatMinutes(item.total_worked)}</td>
                                                <td className="p-4 text-right text-orange-600 font-mono text-sm font-medium">
                                                    {item.total_late > 0 ? formatMinutes(item.total_late) : '-'}
                                                </td>
                                                <td className="p-4 text-right text-orange-600 font-mono text-sm font-medium">
                                                    {item.total_early_leave > 0 ? formatMinutes(item.total_early_leave) : '-'}
                                                </td>
                                                <td className="p-4 text-right text-green-600 font-mono text-sm font-medium">
                                                    {item.total_overtime > 0 ? `+${formatMinutes(item.total_overtime)}` : '-'}
                                                </td>
                                                <td className="p-4 text-right text-red-600 font-mono text-sm font-medium">
                                                    {item.total_missing > 0 ? `-${formatMinutes(item.total_missing)}` : '-'}
                                                </td>
                                                <td className="p-4 text-right font-mono text-sm font-bold">
                                                    <span className={`px-2 py-1 rounded ${item.net_balance > 0 ? 'bg-green-50 text-green-700' :
                                                        item.net_balance < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {item.net_balance > 0 ? '+' : ''}{formatMinutes(item.net_balance)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                renderGridView()
            )}
        </div>
    );
};

export default AttendanceTracking;
