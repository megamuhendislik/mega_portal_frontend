import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart3, Grid3X3, Users,
    AlertCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const SOURCE_COLORS = {
    intended: '#6366f1',   // indigo-500
    potential: '#f59e0b',  // amber-500
    manual: '#8b5cf6',     // violet-500
};
const HEATMAP_BUCKETS = ['06-08', '08-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20+'];
const HEATMAP_DAYS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

/* ═══════════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════════ */
function SkeletonCard({ height = 280 }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="animate-pulse bg-slate-100 rounded-xl" style={{ height }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CHART 1: AYLIK OT TRENDI — STACKED BAR
   ═══════════════════════════════════════════════════ */
function MonthlyTrendChart({ data }) {
    const chartData = useMemo(() => {
        if (!data?.length) return [];
        return data.map(m => ({
            name: m.label,
            Planli: m.intended_hours ?? 0,
            Algilanan: m.potential_hours ?? 0,
            Manuel: m.manual_hours ?? 0,
            Toplam: m.total_hours ?? 0,
        }));
    }, [data]);

    if (!chartData.length) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                    <BarChart3 size={14} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Aylik Ek Mesai Trendi</h4>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={({ active, payload, label: lbl }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((s, p) => s + (p.value || 0), 0);
                        return (
                            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
                                <p className="font-bold text-slate-700 mb-1.5">{lbl}</p>
                                {payload.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-2 py-0.5">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                                        <span className="text-slate-500">{entry.name}:</span>
                                        <span className="font-bold text-slate-800">{entry.value?.toLocaleString('tr-TR')}s</span>
                                    </div>
                                ))}
                                <div className="border-t border-slate-200 mt-1.5 pt-1.5 flex items-center justify-between">
                                    <span className="text-slate-500 font-semibold">Toplam:</span>
                                    <span className="font-black text-slate-800">{total.toLocaleString('tr-TR')}s</span>
                                </div>
                            </div>
                        );
                    }} />
                    <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                        iconSize={10}
                        formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                    <Bar dataKey="Planli" stackId="ot" fill={SOURCE_COLORS.intended} radius={[0, 0, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Algilanan" stackId="ot" fill={SOURCE_COLORS.potential} radius={[0, 0, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Manuel" stackId="ot" fill={SOURCE_COLORS.manual} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CHART 2: HAFTALIK YOGUNLUK HEATMAP — CUSTOM GRID
   ═══════════════════════════════════════════════════ */
function WeeklyHeatmap({ data }) {
    const { maxVal, getVal } = useMemo(() => {
        let max = 0;
        const valMap = {};
        if (data?.length) {
            data.forEach(row => {
                const dayKey = row.day;
                if (row.buckets) {
                    Object.entries(row.buckets).forEach(([bucket, val]) => {
                        const v = typeof val === 'number' ? val : 0;
                        valMap[`${dayKey}_${bucket}`] = v;
                        if (v > max) max = v;
                    });
                }
            });
        }
        return {
            maxVal: max,
            getVal: (day, bucket) => valMap[`${day}_${bucket}`] ?? 0,
        };
    }, [data]);

    const [hoveredCell, setHoveredCell] = useState(null);

    const getColorClass = useCallback((val) => {
        if (!val || maxVal === 0) return 'bg-slate-50';
        const intensity = val / maxVal;
        if (intensity > 0.75) return 'bg-amber-700 text-white';
        if (intensity > 0.5) return 'bg-amber-500';
        if (intensity > 0.25) return 'bg-amber-300';
        return 'bg-amber-100';
    }, [maxVal]);

    if (!data?.length) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0">
                    <Grid3X3 size={14} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Haftalik Yogunluk</h4>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                    {/* Column headers */}
                    <div className="flex items-center mb-1">
                        <div className="w-10 shrink-0" />
                        {HEATMAP_BUCKETS.map(b => (
                            <div key={b} className="flex-1 text-center text-[9px] text-slate-400 font-semibold">{b}</div>
                        ))}
                    </div>

                    {/* Grid rows */}
                    {HEATMAP_DAYS.map(day => (
                        <div key={day} className="flex items-center gap-0.5 mb-0.5">
                            <div className="w-10 shrink-0 text-[10px] font-semibold text-slate-500">{day}</div>
                            {HEATMAP_BUCKETS.map(bucket => {
                                const val = getVal(day, bucket);
                                const isHovered = hoveredCell === `${day}_${bucket}`;
                                return (
                                    <div
                                        key={bucket}
                                        className={`flex-1 rounded-md transition-all cursor-default relative
                                            ${getColorClass(val)}
                                            ${isHovered ? 'ring-2 ring-amber-400 scale-110 z-10' : ''}
                                        `}
                                        style={{ height: 36 }}
                                        onMouseEnter={() => setHoveredCell(`${day}_${bucket}`)}
                                        onMouseLeave={() => setHoveredCell(null)}
                                    >
                                        {/* Value text inside cell */}
                                        {val > 0 && (
                                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold opacity-70">
                                                {val % 1 === 0 ? val : val.toFixed(1)}
                                            </span>
                                        )}

                                        {/* Hover tooltip */}
                                        {isHovered && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap z-20 shadow-lg">
                                                {day} {bucket}: {val.toLocaleString('tr-TR')} saat OT
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Color legend */}
                    <div className="flex items-center gap-2 mt-3 justify-end">
                        <span className="text-[9px] text-slate-400">Az</span>
                        <div className="w-4 h-3 rounded-sm bg-amber-100" />
                        <div className="w-4 h-3 rounded-sm bg-amber-300" />
                        <div className="w-4 h-3 rounded-sm bg-amber-500" />
                        <div className="w-4 h-3 rounded-sm bg-amber-700" />
                        <span className="text-[9px] text-slate-400">Cok</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CHART 3: KISI BAZLI OT — GROUPED HORIZONTAL BAR
   ═══════════════════════════════════════════════════ */
function EmployeeRankingTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.payload;
    if (!raw) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs max-w-[250px]">
            <p className="font-bold text-slate-700 mb-0.5">{raw.name}</p>
            <p className="text-[10px] text-slate-400 mb-2">{raw.department}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value?.toLocaleString('tr-TR')}s</span>
                </div>
            ))}
            <div className="border-t border-slate-200 mt-1.5 pt-1.5 space-y-0.5">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Toplam:</span>
                    <span className="font-black text-slate-800">{raw.total_hours?.toLocaleString('tr-TR')}s</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Limit Kullanimi:</span>
                    <span className={`font-bold ${raw.weekly_limit_pct >= 90 ? 'text-red-600' : raw.weekly_limit_pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        %{raw.weekly_limit_pct ?? 0}
                    </span>
                </div>
            </div>
        </div>
    );
}

function EmployeeRankingChart({ data, onPersonClick, selectedEmployees }) {
    const chartData = useMemo(() => {
        if (!data?.length) return [];
        let filtered = [...data];

        // If employees selected, filter to only those
        if (selectedEmployees?.length) {
            filtered = filtered.filter(e => selectedEmployees.includes(e.employee_id));
        }

        // Sort by total_hours desc, take top 15
        filtered.sort((a, b) => (b.total_hours ?? 0) - (a.total_hours ?? 0));
        return filtered.slice(0, 15).map(e => ({
            ...e,
            shortName: e.name?.length > 12 ? e.name.substring(0, 12) + '...' : e.name,
            Planli: e.intended_hours ?? 0,
            Algilanan: e.potential_hours ?? 0,
            Manuel: e.manual_hours ?? 0,
            exceedsLimit: (e.weekly_limit_pct ?? 0) >= 100,
        }));
    }, [data, selectedEmployees]);

    if (!chartData.length) return null;

    const handleBarClick = (barData) => {
        if (barData?.employee_id) {
            onPersonClick?.(barData.employee_id);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
            {/* Title */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                    <Users size={14} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Kisi Bazli Ek Mesai</h4>
            </div>

            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
                    onClick={(e) => {
                        if (e?.activePayload?.[0]?.payload) {
                            handleBarClick(e.activePayload[0].payload);
                        }
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis
                        type="category"
                        dataKey="shortName"
                        width={90}
                        tick={({ x, y, payload, index }) => {
                            const row = chartData[index];
                            const isOver = row?.exceedsLimit;
                            return (
                                <text
                                    x={x}
                                    y={y}
                                    dy={4}
                                    textAnchor="end"
                                    className="cursor-pointer"
                                    fill={isOver ? '#ef4444' : '#64748b'}
                                    fontWeight={isOver ? 700 : 500}
                                    fontSize={10}
                                >
                                    {payload.value}
                                </text>
                            );
                        }}
                    />
                    <Tooltip content={<EmployeeRankingTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Legend
                        wrapperStyle={{ fontSize: '11px' }}
                        iconSize={10}
                        formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                    />
                    <ReferenceLine
                        x={30}
                        stroke="#ef4444"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{
                            value: '30s Limit',
                            position: 'top',
                            fill: '#ef4444',
                            fontSize: 10,
                            fontWeight: 700,
                        }}
                    />
                    <Bar
                        dataKey="Planli"
                        fill="#10b981"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={14}
                        cursor="pointer"
                        name="Onayli/Planli"
                    />
                    <Bar
                        dataKey="Algilanan"
                        fill="#f59e0b"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={14}
                        cursor="pointer"
                        name="Bekleyen/Algilanan"
                    />
                    <Bar
                        dataKey="Manuel"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={14}
                        cursor="pointer"
                        name="Manuel"
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* Limit exceeding legend */}
            {chartData.some(e => e.exceedsLimit) && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-red-500 font-semibold">
                    <div className="w-3 h-3 rounded border-2 border-red-400 bg-red-50" />
                    <span>Kirmizi isimler haftalik limiti asan calisanlardir</span>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function OvertimeSection({ onPersonClick }) {
    const { queryParams, selectedEmployees } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/overtime/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('OvertimeSection fetch error:', err);
            setError('Ek mesai verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ─── Loading skeleton ─── */
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard height={280} />
                    <SkeletonCard height={280} />
                </div>
                <SkeletonCard height={400} />
            </div>
        );
    }

    /* ─── Error state ─── */
    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8">
                <div className="flex flex-col items-center justify-center gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
                    >
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    /* ─── Empty state ─── */
    if (!data) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12">
                <div className="flex flex-col items-center justify-center text-slate-400">
                    <BarChart3 size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Bu donem icin ek mesai verisi bulunamadi.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ─── Top row: 2 charts side-by-side on lg ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chart 1: Monthly OT Trend */}
                <MonthlyTrendChart data={data.monthly_trend} />

                {/* Chart 2: Weekly Heatmap */}
                <WeeklyHeatmap data={data.weekly_heatmap} />
            </div>

            {/* ─── Bottom: Employee Ranking ─── */}
            <EmployeeRankingChart
                data={data.employee_ranking}
                onPersonClick={onPersonClick}
                selectedEmployees={selectedEmployees}
            />
        </div>
    );
}
