import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Legend
} from 'recharts';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Activity } from 'lucide-react';
import {
    startOfWeek, endOfWeek, addDays, format, isSameDay,
    startOfMonth, endOfMonth, getWeek, getYear, eachWeekOfInterval
} from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../services/api';

// Sub-component for Weekly Bar Chart (Legacy Logic)
const WeeklyView = ({ employeeId }) => {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const startStr = format(weekStart, 'yyyy-MM-dd');
                const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

                const params = new URLSearchParams({
                    scope: 'WEEKLY',
                    start_date: startStr,
                    end_date: endStr
                });

                if (employeeId) {
                    params.append('employee_id', employeeId);
                }

                const response = await api.get(`/attendance/stats/?${params.toString()}`);

                // Backend now returns pre-formatted data or raw logs?
                // I implemented backend to return: [{ name, fullDate, normal, overtime, missing, target }]
                // So I can just set data directly!
                setData(response.data);
            } catch (error) {
                console.error("Error fetching weekly stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [weekStart, employeeId]);

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-xs font-bold text-slate-500">
                    {format(weekStart, 'd MMM', { locale: tr })} - {format(addDays(weekStart, 6), 'd MMM', { locale: tr })}
                </span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 gap-1">
                    <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-1 hover:bg-white rounded shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="flex-1 w-full h-[320px] min-h-[320px]" style={{ minHeight: '320px' }}>
                <ResponsiveContainer width="99%" height="100%" debounce={50}>
                    <ComposedChart data={data} barSize={32} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                        {loading && <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="14">Yükleniyor...</text>}
                        <defs>
                            <pattern id="striped-analytics" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                                <rect width="4" height="8" transform="translate(0,0)" fill="#f43f5e" opacity="0.1" />
                                <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="2" />
                            </pattern>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={5} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                            labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                            cursor={{ fill: '#f8fafc' }}
                        />
                        {/* Dynamic Target Line */}
                        <Line
                            type="step"
                            dataKey="target"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={false}
                            name="Hedef"
                            connectNulls={false}
                        />
                        <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Normal" />
                        <Bar dataKey="overtime" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Ek Mesai" />
                        <Bar dataKey="missing" stackId="a" fill="url(#striped-analytics)" stroke="#f43f5e" strokeWidth={1} radius={[4, 4, 0, 0]} name="Eksik" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Sub-component for Trends (Line Chart)
const TrendView = ({ data, xKey, unit = 'sa' }) => {
    return (
        <div className="h-full w-full flex-1 min-h-[320px] pt-4" style={{ minHeight: '320px' }}>
            <ResponsiveContainer width="99%" height="100%" debounce={50}>
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                        dataKey={xKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                        cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                    <Line
                        type="monotone"
                        dataKey="normal"
                        name="Ort. Normal"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="overtime"
                        name="Ort. Ek Mesai"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

// Sub-component for Yearly View (Bars + Cumulative Line)
const YearlyView = ({ data }) => {
    return (
        <div className="h-full w-full flex-1 min-h-[320px] pt-4" style={{ minHeight: '320px' }}>
            <ResponsiveContainer width="99%" height="100%" debounce={50}>
                <ComposedChart data={data} barSize={20} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                        <pattern id="striped-year" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                            <rect width="4" height="8" transform="translate(0,0)" fill="#f43f5e" opacity="0.1" />
                            <line x1="0" y1="0" x2="0" y2="8" stroke="#f43f5e" strokeWidth="2" />
                        </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8b5cf6' }} />

                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                        cursor={{ fill: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />

                    {/* Bars */}
                    <Bar yAxisId="left" dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Normal (Sa)" />
                    <Bar yAxisId="left" dataKey="overtime" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Ek Mesai (Sa)" />
                    <Bar yAxisId="left" dataKey="missing" stackId="a" fill="url(#striped-year)" stroke="#f43f5e" strokeWidth={1} radius={[4, 4, 0, 0]} name="Eksik (Sa)" />

                    {/* Cumulative Line */}
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulative_net_hours"
                        name="Kümülatif Net (Sa)"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

const AttendanceAnalyticsChart = ({ logs, currentYear = new Date().getFullYear(), currentMonth = new Date().getMonth() + 1, employeeId }) => {
    const [scope, setScope] = useState('WEEKLY'); // WEEKLY, MONTHLY, YEARLY
    const [yearlyData, setYearlyData] = useState([]);
    const [loadingYearly, setLoadingYearly] = useState(false);

    // Prepare Monthly Trend Data (Aggregated by Week)
    const monthlyTrendData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        // Group by Week
        const weeks = {};
        // Sort logs by date first to ensure order
        const sortedLogs = [...logs].sort((a, b) => new Date(a.work_date) - new Date(b.work_date));

        if (sortedLogs.length === 0) return [];
        const firstLogDate = new Date(sortedLogs[0].work_date);
        const firstWeekStart = startOfWeek(firstLogDate, { weekStartsOn: 1 });

        sortedLogs.forEach(log => {
            const date = new Date(log.work_date);
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });

            // Calculate week index relative to the start of the period
            const diffTime = Math.abs(weekStart - firstWeekStart);
            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            const weekLabel = `${diffWeeks + 1}. Hafta`;

            if (!weeks[weekLabel]) weeks[weekLabel] = { count: 0, normal: 0, overtime: 0 };

            weeks[weekLabel].count += 1;
            weeks[weekLabel].normal += (log.normal_seconds || 0) / 3600;
            weeks[weekLabel].overtime += (log.overtime_seconds || 0) / 3600;
        });

        // Calculate Averages
        return Object.keys(weeks).map(key => ({
            name: key,
            normal: parseFloat((weeks[key].normal / weeks[key].count).toFixed(1)), // Average per day in that week
            overtime: parseFloat((weeks[key].overtime / weeks[key].count).toFixed(1))
        }));
    }, [logs]);

    // Check if we need to fetch yearly data
    useEffect(() => {
        // Reset yearly data if employee changes
        if (scope === 'YEARLY') {
            fetchYearlyData();
        } else {
            // Optional: if switching back to yearly for same employee, we check if yearlyData is empty?
            // But if employee changes, we MUST refetch.
            // Simplest: If Scope is YEARLY, always ensure data is fresh-ish OR just rely on deps
        }
    }, [scope, currentYear, employeeId]);

    const fetchYearlyData = async () => {
        setLoadingYearly(true);
        try {
            // Using existing endpoint with scope param
            const response = await api.get(`/attendance/stats/?scope=YEARLY&year=${currentYear}&employee_id=${employeeId || ''}`);
            console.log("API RAW RESPONSE (YEARLY):", response.data);

            const mapped = response.data.map(m => ({
                name: new Date(2000, m.month - 1, 1).toLocaleString('tr-TR', { month: 'short' }), // Oca, Şub
                normal: parseFloat((m.normal_hours || 0).toFixed(1)),
                overtime: parseFloat((m.overtime_hours || 0).toFixed(1)),
                missing: parseFloat((m.missing_hours || 0).toFixed(1)),
                cumulative_net_hours: parseFloat((m.cumulative_net_hours || 0).toFixed(1))
            }));
            console.log("MAPPED YEARLY DATA:", mapped);

            setYearlyData(mapped);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingYearly(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        {scope === 'WEEKLY' ? <BarChart2 size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-tight">
                            Performans Grafiği
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                            {scope === 'WEEKLY' ? 'Günlük çalışma süreleri' : (scope === 'MONTHLY' ? 'Haftalık ortalama çalışma' : 'Aylık Toplam & Kümülatif')}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-slate-50 p-1 rounded-lg flex border border-slate-100">
                    {['WEEKLY', 'MONTHLY', 'YEARLY'].map(s => (
                        <button
                            key={s}
                            onClick={() => setScope(s)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${scope === s
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {s === 'WEEKLY' ? 'Haftalık' : (s === 'MONTHLY' ? 'Aylık' : 'Yıllık')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                {scope === 'WEEKLY' && <WeeklyView employeeId={employeeId} />}
                {scope === 'MONTHLY' && (
                    <TrendView data={monthlyTrendData} xKey="name" />
                )}
                {scope === 'YEARLY' && (
                    loadingYearly
                        ? <div className="h-full flex items-center justify-center text-slate-400 text-xs">Yükleniyor...</div>
                        : <YearlyView data={yearlyData} />
                )}
            </div>
        </div>
    );
};

export default AttendanceAnalyticsChart;
