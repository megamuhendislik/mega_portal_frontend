import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Zap, Clock, ChevronDown, ChevronUp, TrendingUp,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    ComposedChart, Line
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const SOURCE_COLORS = {
    intended: '#6366f1',
    potential: '#f59e0b',
    manual: '#8b5cf6',
};
const SOURCE_LABELS = {
    intended: 'Planli',
    potential: 'Algilanan',
    manual: 'Manuel',
};
const TIME_TYPE_COLORS = {
    pre_shift: '#3b82f6',
    post_shift: '#f59e0b',
    off_day: '#ef4444',
};
const TIME_TYPE_LABELS = {
    pre_shift: 'Vardiya Oncesi',
    post_shift: 'Vardiya Sonrasi',
    off_day: 'Tatil Gunu',
};
const HEATMAP_HOURS = ['00-02', '02-04', '04-06', '06-08', '08-10', '10-12', '12-14', '14-16', '16-18', '18-20', '20-22', '22-24'];
const HEATMAP_DAYS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

/* ═══════════════════════════════════════════════════
   SORT HOOK
   ═══════════════════════════════════════════════════ */
function useSortable(defaultCol, defaultDir = 'desc') {
    const [sortCol, setSortCol] = useState(defaultCol);
    const [sortDir, setSortDir] = useState(defaultDir);

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortCol(col);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <ChevronDown size={12} className="text-slate-300" />;
        return sortDir === 'desc'
            ? <ChevronDown size={12} className="text-amber-600" />
            : <ChevronUp size={12} className="text-amber-600" />;
    };

    return { sortCol, sortDir, handleSort, SortIcon };
}

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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════ */
function KPICard({ label, value, suffix, icon: Icon, gradient }) {
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-xl font-black leading-tight">
                {value ?? '-'}{suffix && <span className="text-xs ml-1 font-bold opacity-80">{suffix}</span>}
            </h3>
            {Icon && <div className="absolute -right-3 -bottom-3 opacity-10 group-hover:opacity-15 transition-opacity"><Icon size={48} /></div>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   HEATMAP COMPONENT
   ═══════════════════════════════════════════════════ */
function OTHeatmap({ heatmapData }) {
    if (!heatmapData || !Object.keys(heatmapData).length) return null;

    // Find max value for color scaling
    let maxVal = 0;
    HEATMAP_DAYS.forEach((_, di) => {
        HEATMAP_HOURS.forEach((_, hi) => {
            const val = heatmapData?.[di]?.[hi] ?? 0;
            if (val > maxVal) maxVal = val;
        });
    });

    const getColor = (val) => {
        if (!val || maxVal === 0) return 'bg-slate-50';
        const intensity = val / maxVal;
        if (intensity > 0.75) return 'bg-amber-500';
        if (intensity > 0.5) return 'bg-amber-400';
        if (intensity > 0.25) return 'bg-amber-300';
        return 'bg-amber-100';
    };

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Haftalik Isi Haritasi</h4>
            <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                    {/* Column headers */}
                    <div className="flex items-center mb-1">
                        <div className="w-10 shrink-0" />
                        {HEATMAP_HOURS.map(h => (
                            <div key={h} className="flex-1 text-center text-[8px] text-slate-400 font-semibold">{h}</div>
                        ))}
                    </div>
                    {/* Grid rows */}
                    {HEATMAP_DAYS.map((day, di) => (
                        <div key={day} className="flex items-center gap-0.5 mb-0.5">
                            <div className="w-10 shrink-0 text-[10px] font-semibold text-slate-500">{day}</div>
                            {HEATMAP_HOURS.map((_, hi) => {
                                const val = heatmapData?.[di]?.[hi] ?? 0;
                                return (
                                    <div
                                        key={hi}
                                        className={`flex-1 h-6 rounded-sm ${getColor(val)} transition-colors`}
                                        title={`${day} ${HEATMAP_HOURS[hi]}: ${val}s`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    {/* Color legend */}
                    <div className="flex items-center gap-2 mt-3 justify-end">
                        <span className="text-[9px] text-slate-400">Az</span>
                        <div className="w-4 h-3 rounded-sm bg-amber-100" />
                        <div className="w-4 h-3 rounded-sm bg-amber-300" />
                        <div className="w-4 h-3 rounded-sm bg-amber-400" />
                        <div className="w-4 h-3 rounded-sm bg-amber-500" />
                        <span className="text-[9px] text-slate-400">Cok</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   OT RANKING TABLE
   ═══════════════════════════════════════════════════ */
function OTRankingTable({ employees, onEmployeeClick }) {
    const { sortCol, sortDir, handleSort, SortIcon } = useSortable('total_ot_hours');

    const sorted = useMemo(() => {
        if (!employees?.length) return [];
        const s = [...employees];
        s.sort((a, b) => {
            const aVal = a[sortCol] ?? 0;
            const bVal = b[sortCol] ?? 0;
            if (typeof aVal === 'string') {
                return sortDir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
            }
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return s;
    }, [employees, sortCol, sortDir]);

    if (!sorted.length) return null;

    const columns = [
        { key: 'rank', label: '#', sortable: false },
        { key: 'name', label: 'Calisan', sortable: true },
        { key: 'total_ot_hours', label: 'Toplam OT', sortable: true },
        { key: 'approved_hours', label: 'Onayli', sortable: true },
        { key: 'pending_hours', label: 'Bekleyen', sortable: true },
        { key: 'weekly_limit_pct', label: 'Hafta Limit', sortable: true },
    ];

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calisan OT Siralamasi</h4>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-200">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && <SortIcon col={col.key} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, idx) => (
                            <tr
                                key={row.employee_id}
                                className="border-b border-slate-100 last:border-0 hover:bg-white/60 cursor-pointer transition-colors"
                                onClick={() => onEmployeeClick?.(row.employee_id)}
                            >
                                <td className="px-3 py-2.5">
                                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                                        idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-slate-700">{row.name}</td>
                                <td className="px-3 py-2.5 font-bold text-slate-700">{row.total_ot_hours}s</td>
                                <td className="px-3 py-2.5 text-emerald-600 font-semibold">{row.approved_hours}s</td>
                                <td className="px-3 py-2.5 text-amber-600 font-semibold">{row.pending_hours}s</td>
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden max-w-[80px]">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    row.weekly_limit_pct >= 90 ? 'bg-red-500'
                                                    : row.weekly_limit_pct >= 70 ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(100, row.weekly_limit_pct ?? 0)}%` }}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-bold ${
                                            row.weekly_limit_pct >= 90 ? 'text-red-600'
                                            : row.weekly_limit_pct >= 70 ? 'text-amber-600'
                                            : 'text-emerald-600'
                                        }`}>
                                            %{row.weekly_limit_pct ?? 0}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
                {sorted.slice(0, 10).map((row, idx) => (
                    <div
                        key={row.employee_id}
                        className="bg-white rounded-xl p-3 border border-slate-100 cursor-pointer hover:border-amber-200 transition-colors"
                        onClick={() => onEmployeeClick?.(row.employee_id)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {idx + 1}
                                </span>
                                <p className="text-xs font-bold text-slate-700">{row.name}</p>
                            </div>
                            <span className="text-sm font-black text-amber-600">{row.total_ot_hours}s</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${
                                    row.weekly_limit_pct >= 90 ? 'bg-red-500'
                                    : row.weekly_limit_pct >= 70 ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, row.weekly_limit_pct ?? 0)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function OvertimeAnalysis() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerEmployeeId, setDrawerEmployeeId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/overtime/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('OvertimeAnalysis fetch error:', err);
            setError('Ek mesai verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Lazy load PersonDetailDrawer
    const [PersonDetailDrawer, setPersonDetailDrawer] = useState(null);
    useEffect(() => {
        if (drawerEmployeeId && !PersonDetailDrawer) {
            import('./PersonDetailDrawer').then(mod => {
                setPersonDetailDrawer(() => mod.default);
            });
        }
    }, [drawerEmployeeId, PersonDetailDrawer]);

    // Pie data for source distribution
    const pieData = useMemo(() => {
        if (!data?.source_distribution) return [];
        return Object.entries(data.source_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: SOURCE_LABELS[key] || key,
                value,
                color: SOURCE_COLORS[key] || '#94a3b8',
            }));
    }, [data?.source_distribution]);

    // Time type bars
    const timeTypeBars = useMemo(() => {
        if (!data?.time_distribution) return [];
        return Object.entries(data.time_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: TIME_TYPE_LABELS[key] || key,
                hours: value,
                color: TIME_TYPE_COLORS[key] || '#94a3b8',
            }));
    }, [data?.time_distribution]);

    // Monthly trend
    const trendData = useMemo(() => {
        if (!data?.monthly_trend?.length) return [];
        return data.monthly_trend.map(m => ({
            name: m.label,
            Planli: m.intended ?? 0,
            Algilanan: m.potential ?? 0,
            Manuel: m.manual ?? 0,
            Toplam: m.total ?? 0,
        }));
    }, [data?.monthly_trend]);

    const kpi = data?.kpi;

    return (
        <>
            <CollapsibleSection
                title="Ek Mesai Analizi"
                subtitle="OT kaynak, zaman ve calisan bazli"
                icon={Zap}
                iconGradient="from-amber-500 to-orange-600"
            >
                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="text-amber-500 animate-spin mr-2" />
                        <span className="text-sm text-slate-400">Ek mesai verileri yukleniyor...</span>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <AlertCircle size={24} className="text-red-400" />
                        <p className="text-sm text-slate-500">{error}</p>
                        <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">
                            <RefreshCw size={14} /> Tekrar Dene
                        </button>
                    </div>
                )}

                {/* Data */}
                {data && !loading && (
                    <div className="space-y-5">
                        {/* ─── 1. 5 KPI Cards ─────────────────────── */}
                        {kpi && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <KPICard label="Toplam OT" value={kpi.total_ot_hours} suffix="s" icon={Zap} gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
                                <KPICard label="Ort/Kisi" value={kpi.avg_per_person} suffix="s" icon={Clock} gradient="bg-gradient-to-br from-orange-500 to-orange-600" />
                                <KPICard label="Ort/Gun" value={kpi.avg_per_day} suffix="s" icon={TrendingUp} gradient="bg-gradient-to-br from-yellow-500 to-amber-600" />
                                <KPICard label="Onay Orani" value={kpi.approval_rate} suffix="%" icon={Zap} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                                <KPICard label="Hafta Limit" value={kpi.weekly_limit_usage} suffix="%" icon={TrendingUp} gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
                            </div>
                        )}

                        {/* ─── 2 & 3: Source Pie + Time Type Bars ─── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Source Distribution Donut */}
                            {pieData.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kaynak Dagilimi</h4>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                innerRadius={45}
                                                paddingAngle={3}
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell key={`cell-${i}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null;
                                                    const d = payload[0];
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                            <p className="font-bold text-slate-700">{d.name}</p>
                                                            <p className="text-slate-500">{d.value} saat</p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                        {pieData.map(entry => (
                                            <div key={entry.name} className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                                <span className="text-[10px] text-slate-500 font-semibold">{entry.name}: {entry.value}s</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Time Distribution Bars */}
                            {timeTypeBars.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Zaman Dagilimi</h4>
                                    <div className="space-y-4 mt-4">
                                        {timeTypeBars.map(bar => {
                                            const total = timeTypeBars.reduce((sum, b) => sum + b.hours, 0);
                                            const pct = total > 0 ? Math.round((bar.hours / total) * 100) : 0;
                                            return (
                                                <div key={bar.name}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-semibold text-slate-600">{bar.name}</span>
                                                        <span className="text-xs font-bold text-slate-700">{bar.hours}s (%{pct})</span>
                                                    </div>
                                                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%`, backgroundColor: bar.color }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── 4. Monthly OT Trend (Stacked) ─────── */}
                        {trendData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylik OT Trendi</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={280} minWidth={400}>
                                        <ComposedChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
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
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                            <Bar dataKey="Planli" stackId="a" fill={SOURCE_COLORS.intended} radius={[0, 0, 0, 0]} maxBarSize={30} />
                                            <Bar dataKey="Algilanan" stackId="a" fill={SOURCE_COLORS.potential} radius={[0, 0, 0, 0]} maxBarSize={30} />
                                            <Bar dataKey="Manuel" stackId="a" fill={SOURCE_COLORS.manual} radius={[4, 4, 0, 0]} maxBarSize={30} />
                                            <Line type="monotone" dataKey="Toplam" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* ─── 5. Weekly Heatmap ─────────────────── */}
                        <OTHeatmap heatmapData={data.weekly_heatmap} />

                        {/* ─── 6. OT Ranking Table ───────────────── */}
                        {data.employee_ot?.length > 0 && (
                            <OTRankingTable
                                employees={data.employee_ot}
                                onEmployeeClick={(id) => setDrawerEmployeeId(id)}
                            />
                        )}

                        {/* Empty state */}
                        {!kpi && !pieData.length && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Zap size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Bu donem icin ek mesai verisi bulunamadi.</p>
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            {/* Person Detail Drawer */}
            {PersonDetailDrawer && drawerEmployeeId && (
                <PersonDetailDrawer
                    open={!!drawerEmployeeId}
                    onClose={() => setDrawerEmployeeId(null)}
                    employeeId={drawerEmployeeId}
                    queryParams={queryParams}
                />
            )}
        </>
    );
}
