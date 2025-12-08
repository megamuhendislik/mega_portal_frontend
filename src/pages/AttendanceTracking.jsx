import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, ChevronRight, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import moment from 'moment';

const AttendanceTracking = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState([]);

    // Filters
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [selectedDept, setSelectedDept] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchStats();
    }, [year, month, selectedDept]);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments/');
            setDepartments(res.data.results || res.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = { year, month };
            if (selectedDept) params.department_id = selectedDept;

            const res = await api.get('/attendance/stats/summary/', { params });
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatMinutes = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}s ${m}dk`;
    };

    // Calculate Totals
    const totalOvertime = stats.reduce((acc, curr) => acc + curr.total_overtime, 0);
    const totalMissing = stats.reduce((acc, curr) => acc + curr.total_missing, 0);
    const netBalance = totalOvertime - totalMissing;

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Mesai Takip & Raporlama</h2>
                    <p className="text-slate-500 mt-1">Personel bazlı fazla ve eksik mesai takibi</p>
                </div>

                <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Toplam Fazla Mesai</p>
                        <h3 className="text-2xl font-bold text-slate-800">{formatMinutes(totalOvertime)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Toplam Eksik Mesai</p>
                        <h3 className="text-2xl font-bold text-slate-800">{formatMinutes(totalMissing)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${netBalance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Net Bakiye</p>
                        <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
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
                                <th className="p-4 text-right">Toplam Çalışma</th>
                                <th className="p-4 text-right text-green-600">Fazla Mesai</th>
                                <th className="p-4 text-right text-red-600">Eksik Mesai</th>
                                <th className="p-4 text-right">Net Durum</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center">Yükleniyor...</td></tr>
                            ) : stats.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Veri bulunamadı.</td></tr>
                            ) : (
                                stats.map(item => (
                                    <tr key={item.employee_id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 font-medium text-slate-800">{item.employee_name}</td>
                                        <td className="p-4 text-slate-500 text-sm">{item.department}</td>
                                        <td className="p-4 text-right text-slate-600 font-mono text-sm">{formatMinutes(item.total_worked)}</td>
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
        </div>
    );
};

export default AttendanceTracking;
