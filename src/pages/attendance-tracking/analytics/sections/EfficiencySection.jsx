import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, Users, PieChart as PieChartIcon,
    AlertCircle, RefreshCw
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
    ResponsiveContainer, Legend, Line
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const EFFICIENCY_COLORS = {
    excellent: '#10b981', // emerald-500
    good: '#3b82f6',      // blue-500
    average: '#f59e0b',   // amber-500
    low: '#ef4444',       // red-500
};

const EMPLOYEE_LINE_COLORS = [
    '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
    '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7',
];

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════ */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DAILY EFFICIENCY TOOLTIP (custom)
   ═══════════════════════════════════════════════════ */
function DailyEfficiencyTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const main = payload.find(p => p.dataKey === 'Ortalama' || p.dataKey === 'avg_hours');
    const hours = main?.value ?? payload[0]?.value;
    const target = 8;
    const diff = hours != null ? (hours - target).toFixed(1) : '-';
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}s</span>
                </div>
            ))}
            <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex items-center gap-2">
                <span className="text-slate-400">Hedef:</span>
                <span className="font-bold text-slate-600">{target}s</span>
                <span className={`font-bold ${parseFloat(diff) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ({parseFloat(diff) >= 0 ? '+' : ''}{diff}s)
                </span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   PERSON BAR TOOLTIP (custom)
   ═══════════════════════════════════════════════════ */
function PersonBarTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{d.fullName}</p>
            <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Verimlilik:</span>
                    <span className={`font-bold ${
                        d.efficiency_pct >= 90 ? 'text-emerald-600'
                        : d.efficiency_pct >= 70 ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>%{d.efficiency_pct}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Çalışma:</span>
                    <span className="font-bold text-slate-700">{d.worked_hours}s</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Hedef:</span>
                    <span className="font-bold text-slate-700">{d.target_hours}s</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DONUT CENTER LABEL
   ═══════════════════════════════════════════════════ */
function DonutCenterLabel({ viewBox, value }) {
    const { cx, cy } = viewBox;
    return (
        <g>
            <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-800 text-2xl font-black">
                %{value}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400 text-[10px]">
                Ortalama
            </text>
        </g>
    );
}

/* ═══════════════════════════════════════════════════
   DONUT SEGMENT TOOLTIP
   ═══════════════════════════════════════════════════ */
function DonutTooltip({ active, payload, employeesByGroup }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const groupKey = d.key;
    const employees = employeesByGroup?.[groupKey] || [];
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs max-w-[220px]">
            <div className="flex items-center gap-2 mb-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-bold text-slate-700">{d.name}: {d.value} kişi</span>
            </div>
            {employees.length > 0 && (
                <div className="border-t border-slate-100 pt-1.5 mt-1 space-y-0.5">
                    {employees.slice(0, 8).map((emp, i) => (
                        <p key={i} className="text-slate-500 truncate">{emp}</p>
                    ))}
                    {employees.length > 8 && (
                        <p className="text-slate-400 italic">+{employees.length - 8} daha...</p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════ */
function SkeletonCard({ height = 'h-[280px]' }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className={`${height} bg-slate-100 rounded-xl`} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   BAR COLOR BY EFFICIENCY
   ═══════════════════════════════════════════════════ */
function getBarColor(pct) {
    if (pct >= 90) return EFFICIENCY_COLORS.excellent;
    if (pct >= 70) return EFFICIENCY_COLORS.average;
    return EFFICIENCY_COLORS.low;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function EfficiencySection({ onPersonClick }) {
    const { queryParams, selectedEmployees, showTeamAvg } = useAnalyticsFilter();
    const [workHours, setWorkHours] = useState(null);
    const [teamOverview, setTeamOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTier, setSelectedTier] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [wh, to] = await Promise.allSettled([
                api.get('/attendance-analytics/work-hours/', { params: queryParams }),
                api.get('/attendance-analytics/team-overview/', { params: queryParams }),
            ]);
            if (wh.status === 'fulfilled') setWorkHours(wh.value.data);
            else console.error('work-hours fetch error:', wh.reason);
            if (to.status === 'fulfilled') setTeamOverview(to.value.data);
            else console.error('team-overview fetch error:', to.reason);
            if (wh.status === 'rejected' && to.status === 'rejected') {
                setError('Verimlilik verileri yüklenemedi.');
            }
        } catch (err) {
            console.error('EfficiencySection fetch error:', err);
            setError('Verimlilik verileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Chart 1: Daily efficiency trend data ───
    const hasSelectedEmployees = selectedEmployees?.length > 0;

    const dailyTrendData = useMemo(() => {
        if (!workHours?.daily_team_avg?.length) return [];
        const employeeDaily = workHours.employee_daily;
        return workHours.daily_team_avg.map(d => {
            const dateStr = d.date || '';
            const formatted = dateStr.length >= 10
                ? `${dateStr.substring(8, 10)}/${dateStr.substring(5, 7)}`
                : d.label || dateStr;
            const row = { name: formatted, Ortalama: d.avg_hours };

            // If employees selected, add per-employee lines from employee_daily if available
            if (hasSelectedEmployees && employeeDaily) {
                selectedEmployees.forEach(empId => {
                    const empData = employeeDaily?.[empId];
                    if (empData) {
                        const dayEntry = empData.find(ed => ed.date === d.date);
                        if (dayEntry) {
                            row[`emp_${empId}`] = dayEntry.hours;
                        }
                    }
                });
            }

            return row;
        });
    }, [workHours, hasSelectedEmployees, selectedEmployees]);

    // Resolve employee names for per-employee lines
    const employeeNameMap = useMemo(() => {
        const map = {};
        if (workHours?.efficiency_ranking) {
            workHours.efficiency_ranking.forEach(e => {
                map[e.employee_id] = e.name;
            });
        }
        if (workHours?.employee_hours) {
            workHours.employee_hours.forEach(e => {
                map[e.employee_id] = e.name;
            });
        }
        return map;
    }, [workHours?.efficiency_ranking, workHours?.employee_hours]);

    // ─── Chart 2: Person efficiency bar data ───
    const efficiencyBarData = useMemo(() => {
        if (!workHours?.efficiency_ranking?.length) return [];
        let ranking = [...workHours.efficiency_ranking];
        // Filter to selected employees if any
        if (hasSelectedEmployees) {
            ranking = ranking.filter(e => selectedEmployees.includes(e.employee_id));
        }
        // Sort descending by efficiency_pct, take top 15
        ranking.sort((a, b) => (b.efficiency_pct ?? 0) - (a.efficiency_pct ?? 0));
        return ranking.slice(0, 15).map(e => ({
            name: (e.name || '').length > 12 ? (e.name || '').substring(0, 12) + '...' : (e.name || ''),
            fullName: e.name,
            efficiency_pct: e.efficiency_pct ?? 0,
            worked_hours: e.worked_hours ?? 0,
            target_hours: e.target_hours ?? 0,
            employee_id: e.employee_id,
        }));
    }, [workHours?.efficiency_ranking, hasSelectedEmployees, selectedEmployees]);

    // ─── Chart 3: Donut distribution data ───
    const { donutData, avgEfficiency, employeesByGroup } = useMemo(() => {
        const dist = teamOverview?.efficiency_distribution;
        const ranking = workHours?.efficiency_ranking || [];

        // Compute groups from ranking data for tooltip
        const groups = { excellent: [], good: [], average: [], low: [] };
        let totalPct = 0;
        ranking.forEach(e => {
            const pct = e.efficiency_pct ?? 0;
            totalPct += pct;
            if (pct >= 95) groups.excellent.push(e.name);
            else if (pct >= 80) groups.good.push(e.name);
            else if (pct >= 60) groups.average.push(e.name);
            else groups.low.push(e.name);
        });
        const avg = ranking.length > 0 ? Math.round(totalPct / ranking.length) : 0;

        // Use backend distribution if available, otherwise compute from ranking
        let segments;
        if (dist) {
            segments = [
                { key: 'excellent', name: 'Mükemmel (>=95%)', value: dist.excellent ?? 0, color: EFFICIENCY_COLORS.excellent },
                { key: 'good', name: 'İyi (80-95%)', value: dist.good ?? 0, color: EFFICIENCY_COLORS.good },
                { key: 'average', name: 'Ortalama (60-80%)', value: dist.average ?? 0, color: EFFICIENCY_COLORS.average },
                { key: 'low', name: 'Düşük (<60%)', value: dist.low ?? 0, color: EFFICIENCY_COLORS.low },
            ].filter(s => s.value > 0);
        } else {
            segments = [
                { key: 'excellent', name: 'Mükemmel (>=95%)', value: groups.excellent.length, color: EFFICIENCY_COLORS.excellent },
                { key: 'good', name: 'İyi (80-95%)', value: groups.good.length, color: EFFICIENCY_COLORS.good },
                { key: 'average', name: 'Ortalama (60-80%)', value: groups.average.length, color: EFFICIENCY_COLORS.average },
                { key: 'low', name: 'Düşük (<60%)', value: groups.low.length, color: EFFICIENCY_COLORS.low },
            ].filter(s => s.value > 0);
        }

        return { donutData: segments, avgEfficiency: avg, employeesByGroup: groups };
    }, [teamOverview?.efficiency_distribution, workHours?.efficiency_ranking]);

    // ─── Best / Worst day from daily_team_avg ───
    const { bestDay, worstDay } = useMemo(() => {
        const daily = workHours?.daily_team_avg;
        if (!daily?.length) return { bestDay: '—', worstDay: '—' };
        let best = daily[0], worst = daily[0];
        daily.forEach(d => {
            if ((d.avg_hours ?? 0) > (best.avg_hours ?? 0)) best = d;
            if ((d.avg_hours ?? 0) < (worst.avg_hours ?? 0)) worst = d;
        });
        const formatDate = (d) => {
            const dateStr = d.date || '';
            if (dateStr.length >= 10) {
                return `${dateStr.substring(8, 10)}/${dateStr.substring(5, 7)}`;
            }
            return d.label || dateStr;
        };
        return {
            bestDay: `${formatDate(best)} (${best.avg_hours ?? 0}s)`,
            worstDay: `${formatDate(worst)} (${worst.avg_hours ?? 0}s)`,
        };
    }, [workHours?.daily_team_avg]);

    // ─── Weekly pattern from daily_team_avg ───
    const weeklyPattern = useMemo(() => {
        if (!workHours?.daily_team_avg?.length) return [0, 0, 0, 0, 0];
        const days = [0, 0, 0, 0, 0]; // Mon-Fri totals
        const counts = [0, 0, 0, 0, 0];
        workHours.daily_team_avg.forEach(d => {
            const dow = new Date(d.date + 'T12:00:00').getDay(); // 0=Sun
            const idx = dow === 0 ? -1 : dow - 1; // Mon=0, Fri=4
            if (idx >= 0 && idx <= 4) { days[idx] += (d.avg_hours || 0); counts[idx]++; }
        });
        return days.map((total, i) => counts[i] ? total / counts[i] : 0);
    }, [workHours]);

    // ─── Donut click → filter bar chart to selected tier ───
    const filteredBarData = useMemo(() => {
        if (!selectedTier || !efficiencyBarData.length) return efficiencyBarData;
        const tierRanges = {
            excellent: [95, Infinity],
            good: [80, 95],
            average: [60, 80],
            low: [0, 60],
        };
        const range = tierRanges[selectedTier];
        if (!range) return efficiencyBarData;
        // Re-derive from ranking instead of filtered bar data to get all employees in tier
        const ranking = workHours?.efficiency_ranking || [];
        let filtered = ranking.filter(e => {
            const pct = e.efficiency_pct ?? 0;
            return pct >= range[0] && (range[1] === Infinity ? true : pct < range[1]);
        });
        if (hasSelectedEmployees) {
            filtered = filtered.filter(e => selectedEmployees.includes(e.employee_id));
        }
        filtered.sort((a, b) => (b.efficiency_pct ?? 0) - (a.efficiency_pct ?? 0));
        return filtered.slice(0, 15).map(e => ({
            name: (e.name || '').length > 12 ? (e.name || '').substring(0, 12) + '...' : (e.name || ''),
            fullName: e.name,
            efficiency_pct: e.efficiency_pct ?? 0,
            worked_hours: e.worked_hours ?? 0,
            target_hours: e.target_hours ?? 0,
            employee_id: e.employee_id,
        }));
    }, [selectedTier, efficiencyBarData, workHours?.efficiency_ranking, hasSelectedEmployees, selectedEmployees]);

    // ─── Loading ───
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard height="h-[280px]" />
                    <SkeletonCard height="h-[400px]" />
                </div>
                <SkeletonCard height="h-[250px]" />
            </div>
        );
    }

    // ─── Error ───
    if (error && !workHours && !teamOverview) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertCircle size={24} className="text-red-400" />
                <p className="text-sm text-slate-500">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    const hasData = dailyTrendData.length > 0 || efficiencyBarData.length > 0 || donutData.length > 0;

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <TrendingUp size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Bu dönem için verimlilik verisi bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ═══ TOP ROW: 2 charts side-by-side ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ─── Chart 1: Günlük Verimlilik Trendi (Area/Line) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                            <TrendingUp size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Günlük Verimlilik Trendi</h4>
                    </div>
                    {dailyTrendData.length > 0 ? (
                        <div className="overflow-x-auto -mx-2">
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={dailyTrendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                    <defs>
                                        <linearGradient id="effAreaFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        domain={[0, 12]}
                                    />
                                    <Tooltip content={<DailyEfficiencyTooltip />} />
                                    <ReferenceLine
                                        y={8}
                                        stroke="#ef4444"
                                        strokeDasharray="4 2"
                                        strokeWidth={1.5}
                                        label={{ value: 'Hedef 8s', fontSize: 9, fill: '#ef4444', position: 'right' }}
                                    />

                                    {/* Team avg as gray dotted line when employees selected + showTeamAvg on */}
                                    {hasSelectedEmployees && showTeamAvg ? (
                                        <Line
                                            type="monotone"
                                            dataKey="Ortalama"
                                            name="Ekip Ort."
                                            stroke="#9ca3af"
                                            strokeDasharray="4 3"
                                            strokeWidth={1.5}
                                            dot={false}
                                        />
                                    ) : (
                                        <Area
                                            type="monotone"
                                            dataKey="Ortalama"
                                            name="Ort. Saat"
                                            stroke="#818cf8"
                                            fill="url(#effAreaFill)"
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: '#818cf8' }}
                                            activeDot={{ r: 5 }}
                                        />
                                    )}

                                    {/* Per-employee lines when employees selected */}
                                    {hasSelectedEmployees && selectedEmployees.map((empId, idx) => (
                                        <Line
                                            key={empId}
                                            type="monotone"
                                            dataKey={`emp_${empId}`}
                                            name={employeeNameMap[empId] || `Çalışan #${empId}`}
                                            stroke={EMPLOYEE_LINE_COLORS[idx % EMPLOYEE_LINE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 5 }}
                                            connectNulls
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-300">
                            <p className="text-xs">Günlük veri bulunamadı</p>
                        </div>
                    )}
                </div>

                {/* ─── Chart 2: Kişi Bazlı Verimlilik (Horizontal Bar) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                            <Users size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Kişi Bazlı Verimlilik</h4>
                        {selectedTier && (
                            <button
                                onClick={() => setSelectedTier(null)}
                                className="ml-auto text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full transition-colors"
                            >
                                Tümünü Göster
                            </button>
                        )}
                    </div>
                    {filteredBarData.length > 0 ? (
                        <div className="overflow-x-auto -mx-2">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart
                                    data={filteredBarData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        domain={[0, 120]}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        width={100}
                                    />
                                    <Tooltip content={<PersonBarTooltip />} />
                                    <ReferenceLine
                                        x={95}
                                        stroke="#10b981"
                                        strokeDasharray="4 2"
                                        label={{ value: 'Mükemmel', fontSize: 8, fill: '#10b981', position: 'top' }}
                                    />
                                    <ReferenceLine
                                        x={80}
                                        stroke="#3b82f6"
                                        strokeDasharray="4 2"
                                        label={{ value: 'İyi', fontSize: 8, fill: '#3b82f6', position: 'top' }}
                                    />
                                    <ReferenceLine
                                        x={60}
                                        stroke="#f59e0b"
                                        strokeDasharray="4 2"
                                        label={{ value: 'Ortalama', fontSize: 8, fill: '#f59e0b', position: 'top' }}
                                    />
                                    <ReferenceLine
                                        x={100}
                                        stroke="#9ca3af"
                                        strokeDasharray="4 2"
                                        label={{ value: '%100', fontSize: 9, fill: '#9ca3af', position: 'top' }}
                                    />
                                    <Bar
                                        dataKey="efficiency_pct"
                                        name="Verimlilik %"
                                        radius={[0, 6, 6, 0]}
                                        maxBarSize={20}
                                        cursor="pointer"
                                        onClick={(data) => {
                                            if (data?.employee_id) {
                                                onPersonClick?.(data.employee_id);
                                            }
                                        }}
                                    >
                                        {filteredBarData.map((entry, i) => (
                                            <Cell key={`cell-${i}`} fill={getBarColor(entry.efficiency_pct)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 gap-2">
                            <p className="text-xs">
                                {selectedTier ? 'Bu kategoride çalışan bulunamadı' : 'Çalışan verisi bulunamadı'}
                            </p>
                            {selectedTier && (
                                <button
                                    onClick={() => setSelectedTier(null)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full"
                                >
                                    Tümünü Göster
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ BOTTOM ROW: Donut chart full width ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                        <PieChartIcon size={14} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Verimlilik Dağılımı</h4>
                </div>
                {donutData.length > 0 ? (
                    <div className="flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    label={false}
                                    cursor="pointer"
                                    onClick={(_, index) => {
                                        const segment = donutData[index];
                                        if (segment) {
                                            setSelectedTier(prev => prev === segment.key ? null : segment.key);
                                        }
                                    }}
                                >
                                    {donutData.map((entry, i) => (
                                        <Cell
                                            key={`donut-${i}`}
                                            fill={entry.color}
                                            stroke={selectedTier === entry.key ? '#1e293b' : 'transparent'}
                                            strokeWidth={selectedTier === entry.key ? 3 : 0}
                                            opacity={selectedTier && selectedTier !== entry.key ? 0.4 : 1}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<DonutTooltip employeesByGroup={employeesByGroup} />} />
                                {/* Center label */}
                                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" className="fill-slate-800" style={{ fontSize: '24px', fontWeight: 900 }}>
                                    %{avgEfficiency}
                                </text>
                                <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="fill-slate-400" style={{ fontSize: '10px' }}>
                                    Ortalama
                                </text>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Legend below chart */}
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
                            {donutData.map(entry => (
                                <div key={entry.key} className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                    <span className="text-xs text-slate-600 font-semibold">{entry.name}</span>
                                    <span className="text-xs text-slate-400 font-bold">({entry.value})</span>
                                </div>
                            ))}
                        </div>

                        {/* Best / Worst day summary */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp size={12} className="text-emerald-500" />
                                <span className="text-slate-500">En verimli gün:</span>
                                <span className="font-bold text-slate-700">{bestDay}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <TrendingDown size={12} className="text-red-500" />
                                <span className="text-slate-500">En düşük gün:</span>
                                <span className="font-bold text-slate-700">{worstDay}</span>
                            </div>
                        </div>

                        {/* Haftalık Verimlilik Deseni */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 font-medium mb-2">Haftalık Verimlilik Deseni</p>
                            <div className="flex gap-1">
                                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum'].map((day, i) => {
                                    const avgHours = weeklyPattern[i] || 0;
                                    const pct = Math.min(100, (avgHours / 9) * 100);
                                    const color = avgHours >= 8 ? '#10b981' : avgHours >= 6 ? '#f59e0b' : '#ef4444';
                                    return (
                                        <div key={day} className="flex-1 text-center">
                                            <div className="h-8 rounded bg-slate-100 relative overflow-hidden">
                                                <div className="absolute bottom-0 w-full rounded transition-all" style={{ height: `${pct}%`, backgroundColor: color }} />
                                            </div>
                                            <span className="text-[9px] text-slate-400 mt-0.5 block">{day}</span>
                                            <span className="text-[9px] font-bold text-slate-600">{avgHours.toFixed(1)}s</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected tier indicator */}
                        {selectedTier && (
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">
                                    Seçili: <span className="font-bold text-slate-700">{donutData.find(d => d.key === selectedTier)?.name || selectedTier}</span>
                                </span>
                                <button
                                    onClick={() => setSelectedTier(null)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                                >
                                    Temizle
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[250px] text-slate-300">
                        <p className="text-xs">Dağılım verisi bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
}
