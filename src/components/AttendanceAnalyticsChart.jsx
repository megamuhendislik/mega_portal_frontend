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
// Sub-component for Weekly Bar Chart (Logs Based)
const WeeklyView = ({ logs, showBreaks, employeeId, onDateClick }) => {
    // Default to start of logs or current week if no logs
    const [weekStart, setWeekStart] = useState(() => {
        if (logs && logs.length > 0) {
            return startOfWeek(new Date(logs[0].work_date), { weekStartsOn: 1 });
        }
        return startOfWeek(new Date(), { weekStartsOn: 1 });
    });

    const [fetchedLogs, setFetchedLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Update weekStart if logs change drastically (e.g. month change from parent)
    useEffect(() => {
        if (logs && logs.length > 0) {
            const firstLog = new Date(logs[0].work_date);
            // If current weekStart is far from logs (e.g. > 45 days), reset to first log.
            // This allows the parent to reset the view, but doesn't block local navigation.
            if (Math.abs(weekStart - firstLog) > 1000 * 60 * 60 * 24 * 45) {
                setWeekStart(startOfWeek(firstLog, { weekStartsOn: 1 }));
                setFetchedLogs([]); // Reset fetched logs on major context switch
            }
        }
    }, [logs]);

    // Combine Parent Logs + Locally Fetched Logs
    const allLogs = useMemo(() => {
        // Map by date to remove duplicates, prioritize fetched logs? or parent?
        // Usually parent logs are "fresh" for the current month. Fetched are for history.
        const combined = [...(logs || []), ...fetchedLogs];
        // Deduplicate
        const unique = new Map();
        combined.forEach(l => unique.set(l.work_date, l));
        return Array.from(unique.values());
    }, [logs, fetchedLogs]);

    // Check & Fetch Data when Week Changes
    useEffect(() => {
        const checkAndFetch = async () => {
            if (!employeeId) return;

            const startStr = format(weekStart, 'yyyy-MM-dd');
            const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

            // Quick Check: Do we have ANY logs for this week in our combined set?
            // "Having logs" is loose check. 
            // Better: Check if this range is theoretically covered by "Parent Logs Range".
            // If parent logs are for "Feb", and we are in "Jan", we definitely need to fetch.

            // Heuristic: If we don't have logs for the start OR end of the week, fetch it.
            // This is safer to ensure we have data.
            // Optimization: Keep a "fetchedWeeks" set? 
            // But what if the user was absent all week? Then we fetch again and again.

            // Robust Approach: Fetch if we haven't fetched this *specific week* during this session yet.
            // But implementing a cache here is complex. 

            // Let's assume: If the week falls outside the Min/Max of `logs` prop, we fetch.
            let needsFetch = false;
            if (logs && logs.length > 0) {
                const logsMin = new Date(logs[0].work_date);
                const logsMax = new Date(logs[logs.length - 1].work_date);
                const viewStart = weekStart;
                const viewEnd = addDays(weekStart, 6);

                // If view is strictly before min logs or strictly after max logs
                if (viewEnd < logsMin || viewStart > logsMax) {
                    needsFetch = true;
                }
            } else {
                needsFetch = true;
            }

            // Also check if we already fetched it locally (prevent loops)
            const alreadyHasLocal = fetchedLogs.some(l => l.work_date >= startStr && l.work_date <= endStr);
            if (alreadyHasLocal) needsFetch = false; // We already fetched something for this range

            if (needsFetch) {
                setLoading(true);
                try {
                    const res = await api.get(`/attendance/?employee_id=${employeeId}&start_date=${startStr}&end_date=${endStr}&limit=100`);
                    const newLogs = res.data.results || res.data;

                    if (newLogs && newLogs.length > 0) {
                        setFetchedLogs(prev => [...prev, ...newLogs]);
                    }
                } catch (err) {
                    console.error("Historical data fetch failed", err);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkAndFetch();
    }, [weekStart, employeeId]); // logs dependency removed to prevent loops, we rely on weekStart change

    // Compute Data for the selected Week from Logs
    const data = useMemo(() => {
        const start = weekStart;

        // Init 7 days
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = addDays(start, i);
            const dateStr = format(d, 'yyyy-MM-dd');

            // Find ALL Logs for this day from ALL available logs
            const dayLogs = allLogs.filter(l => l.work_date === dateStr);

            // Aggregate totals
            const totalNormal = dayLogs.reduce((acc, l) => acc + (l.normal_seconds || 0), 0);
            const totalOvertime = dayLogs.reduce((acc, l) => acc + (l.overtime_seconds || 0), 0);
            const totalBreak = dayLogs.reduce((acc, l) => acc + (l.break_seconds || 0), 0);

            // Revert: Use sum of missing_seconds from logs, as requested.
            // "if it's not processed as absent... don't show it"
            const totalMissing = dayLogs.reduce((acc, l) => acc + (l.missing_seconds || 0), 0);

            // Target
            // Target: Use 9 hours (32400s) default if missing from DB, as it's not a model field currently.
            // Ideally should come from Daily Work Schedule, but static fallback is better than 0.
            const dayTarget = 32400; // 9 Hours default

            // Calculate Missing
            const isFuture = d > new Date();
            // Don't calculate dynamically. Use DB value.
            const calculatedMissing = totalMissing;

            days.push({
                date: dateStr,
                name: format(d, 'EEE', { locale: tr }),
                fullDate: format(d, 'd MMM yyyy', { locale: tr }),
                normal: parseFloat((totalNormal / 3600).toFixed(1)),
                overtime: parseFloat((totalOvertime / 3600).toFixed(1)),
                missing: parseFloat((calculatedMissing / 3600).toFixed(1)),
                break: parseFloat((totalBreak / 3600).toFixed(2)),
                target: parseFloat((dayTarget / 3600).toFixed(1)),
                isFuture: isFuture
            });
        }

        return days;
    }, [allLogs, weekStart]);

    return (
        <div className="h-full flex flex-col relative">
            {loading && <div className="absolute top-2 right-12 text-xs text-indigo-500 font-bold animate-pulse">Veri yükleniyor...</div>}
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
                    <ComposedChart
                        data={data}
                        barSize={32}
                        margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
                        onClick={(e) => {
                            if (e && e.activePayload && e.activePayload.length > 0) {
                                const payload = e.activePayload[0].payload;
                                if (payload && payload.date && onDateClick) {
                                    onDateClick(payload.date);
                                }
                            }
                        }}
                    >
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
                            cursor={{ fill: '#f8fafc', cursor: 'pointer' }}
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

                        {/* Bars stackId="a" means they stack. Break should be separate or stacked? 
                            Ideally separate or overlay. Let's stack it on top? Or separate bar?
                            User wants "Show breaks too".
                            If I stack it, it adds to "Total Height".
                            Break is NOT work. It shouldn't add to Work Hours visually if we want to compare to Target.
                            Target is Work Target.
                            So Break should be a separate bar or Line?
                            Line is clearer. Let's use Line or separate Bar (no stackId).
                            Let's use a Line because 0.5 is small compared to 8. Or a small bar.
                            Let's try a separate Bar (barSize smaller) or just stacked if user wants "Total Time at Office"?
                            Usually "Break Analysis" is distinct. 
                            Let's use a Line for visibility if it's small hours.
                            Actually, a Bar is better for "Duration" feel. I'll make it separate stackId="break" so it sits next to work bar?
                            Or just render it if toggle is ON.
                        */}
                        <Bar dataKey="normal" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} name="Normal" />
                        <Bar dataKey="overtime" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Ek Mesai" />
                        <Bar dataKey="missing" stackId="a" fill="url(#striped-analytics)" stroke="#f43f5e" strokeWidth={1} radius={[4, 4, 0, 0]} name="Eksik" />

                        {showBreaks && (
                            <Bar
                                dataKey="break"
                                stackId="b" /* Separate stack so it stands next to work column */
                                fill="#fbbf24"
                                radius={[4, 4, 4, 4]}
                                name="Mola (Sa)"
                                barSize={12} /* Thinner bar for break */
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Sub-component for Trends (Line Chart)
const TrendView = ({ data, xKey, unit = 'sa', showBreaks }) => {
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
                    {showBreaks && (
                        <Line
                            type="monotone"
                            dataKey="break"
                            name="Ort. Mola"
                            stroke="#fbbf24"
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                        />
                    )}
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

const AttendanceAnalyticsChart = ({ logs, currentYear = new Date().getFullYear(), currentMonth = new Date().getMonth() + 1, employeeId, onDateClick }) => {
    const [scope, setScope] = useState('WEEKLY'); // WEEKLY, MONTHLY, YEARLY
    const [yearlyData, setYearlyData] = useState([]);
    const [monthlyTrendData, setMonthlyTrendData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showBreaks, setShowBreaks] = useState(false);

    // Fetch Stats for Monthly/Yearly scopes
    useEffect(() => {
        if (scope === 'WEEKLY') return; // Weekly uses 'logs' prop (or fetches its own history inside WeeklyView)

        const fetchStats = async () => {
            setLoading(true);
            try {
                // Determine params based on scope
                const params = {
                    scope,
                    year: currentYear,
                    employee_id: employeeId
                };
                if (scope === 'MONTHLY') {
                    params.month = currentMonth;
                }

                const res = await api.get('/attendance/stats/', { params });

                if (scope === 'YEARLY') {
                    const mapped = res.data.map(m => ({
                        name: new Date(2000, m.month - 1, 1).toLocaleString('tr-TR', { month: 'short' }),
                        normal: m.normal_hours,
                        overtime: m.overtime_hours,
                        missing: m.missing_hours,
                        cumulative_net_hours: m.cumulative_net_hours
                    }));
                    setYearlyData(mapped);
                } else if (scope === 'MONTHLY') {
                    // API returns { label: "1. Hafta", normal: ..., overtime: ... }
                    const mapped = res.data.map(w => ({
                        name: w.label,
                        normal: w.normal,
                        overtime: w.overtime,
                        break: w.break
                    }));
                    setMonthlyTrendData(mapped);
                }

            } catch (err) {
                console.error("Stats Fetch Error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [scope, currentYear, currentMonth, employeeId]);

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

                {/* Show Breaks Toggle */}
                <div className="flex items-center mr-4">
                    <label className="flex items-center cursor-pointer relative">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showBreaks}
                            onChange={(e) => setShowBreaks(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                        <span className="ml-2 text-xs font-bold text-slate-500">Molaları Göster</span>
                    </label>
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

            <div className="flex-1 w-full min-h-0 relative">
                {loading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center text-indigo-600 text-xs font-bold">Yükleniyor...</div>}

                {scope === 'WEEKLY' && <WeeklyView logs={logs} showBreaks={showBreaks} employeeId={employeeId} onDateClick={onDateClick} />}
                {scope === 'MONTHLY' && (
                    <TrendView data={monthlyTrendData} xKey="name" showBreaks={showBreaks} />
                )}
                {scope === 'YEARLY' && (
                    <YearlyView data={yearlyData} />
                )}
            </div>
        </div>
    );
};

export default AttendanceAnalyticsChart;
