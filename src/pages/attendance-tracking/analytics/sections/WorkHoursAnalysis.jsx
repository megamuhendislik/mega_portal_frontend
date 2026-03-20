import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
    Loader2, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Area, AreaChart,
    ReferenceLine, Legend
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

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
            ? <ChevronDown size={12} className="text-blue-600" />
            : <ChevronUp size={12} className="text-blue-600" />;
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
   WEEKDAY VS WEEKEND CARD
   ═══════════════════════════════════════════════════ */
function WeekdayCard({ title, data, gradient }) {
    if (!data) return null;
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-2">{title}</p>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs opacity-80">Ort. Calisma</span>
                    <span className="text-sm font-black">{data.avg_hours ?? '-'}s</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs opacity-80">Toplam Gun</span>
                    <span className="text-sm font-black">{data.total_days ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs opacity-80">Ort. OT</span>
                    <span className="text-sm font-black">{data.avg_ot_hours ?? '-'}s</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   EFFICIENCY TABLE
   ═══════════════════════════════════════════════════ */
function EfficiencyTable({ employees, onEmployeeClick }) {
    const { sortCol, sortDir, handleSort, SortIcon } = useSortable('efficiency_pct');

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
        { key: 'department', label: 'Departman', sortable: true },
        { key: 'worked_hours', label: 'Calisan', sortable: true },
        { key: 'target_hours', label: 'Hedef', sortable: true },
        { key: 'diff_hours', label: 'Fark', sortable: true },
        { key: 'efficiency_pct', label: 'Verimlilik%', sortable: true },
    ];

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verimlilik Siralamasi</h4>

            {/* Desktop Table */}
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
                        {sorted.map((row, idx) => {
                            const TrendIcon = (row.diff_hours ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
                            const trendColor = (row.diff_hours ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600';
                            return (
                                <tr
                                    key={row.employee_id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-white/60 cursor-pointer transition-colors"
                                    onClick={() => onEmployeeClick?.(row.employee_id)}
                                >
                                    <td className="px-3 py-2.5">
                                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${
                                            idx < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-700">{row.name}</td>
                                    <td className="px-3 py-2.5 text-slate-500">{row.department}</td>
                                    <td className="px-3 py-2.5 font-bold text-slate-700">{row.worked_hours}s</td>
                                    <td className="px-3 py-2.5 text-slate-500">{row.target_hours}s</td>
                                    <td className="px-3 py-2.5">
                                        <div className={`flex items-center gap-0.5 font-bold ${trendColor}`}>
                                            <TrendIcon size={12} />
                                            {row.diff_hours > 0 ? '+' : ''}{row.diff_hours}s
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className={`font-bold ${
                                            row.efficiency_pct >= 95 ? 'text-emerald-600'
                                            : row.efficiency_pct >= 80 ? 'text-amber-600'
                                            : 'text-red-600'
                                        }`}>
                                            %{row.efficiency_pct}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
                {sorted.slice(0, 10).map((row, idx) => (
                    <div
                        key={row.employee_id}
                        className="bg-white rounded-xl p-3 border border-slate-100 cursor-pointer hover:border-blue-200 transition-colors"
                        onClick={() => onEmployeeClick?.(row.employee_id)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    idx < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {idx + 1}
                                </span>
                                <div>
                                    <p className="text-xs font-bold text-slate-700">{row.name}</p>
                                    <p className="text-[10px] text-slate-400">{row.department}</p>
                                </div>
                            </div>
                            <span className={`text-sm font-black ${
                                row.efficiency_pct >= 95 ? 'text-emerald-600'
                                : row.efficiency_pct >= 80 ? 'text-amber-600'
                                : 'text-red-600'
                            }`}>
                                %{row.efficiency_pct}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px]">
                            <span className="text-slate-500">Calisan: {row.worked_hours}s</span>
                            <span className="text-slate-500">Hedef: {row.target_hours}s</span>
                            <span className={row.diff_hours >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                Fark: {row.diff_hours > 0 ? '+' : ''}{row.diff_hours}s
                            </span>
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
export default function WorkHoursAnalysis() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerEmployeeId, setDrawerEmployeeId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/work-hours/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('WorkHoursAnalysis fetch error:', err);
            setError('Calisma saati verileri yuklenemedi.');
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

    // Target vs Actual horizontal bar data
    const targetBarData = useMemo(() => {
        if (!data?.employee_hours?.length) return [];
        return data.employee_hours.slice(0, 15).map(e => ({
            name: e.name,
            Calisan: e.worked_hours,
            Hedef: e.target_hours,
            Fark: e.diff_hours,
        }));
    }, [data?.employee_hours]);

    // Daily team average line data
    const dailyAvgData = useMemo(() => {
        if (!data?.daily_team_avg?.length) return [];
        return data.daily_team_avg.map(d => ({
            name: d.date?.substring(5) || d.label,
            Ortalama: d.avg_hours,
        }));
    }, [data?.daily_team_avg]);

    // Hours distribution
    const distributionData = useMemo(() => {
        if (!data?.hours_distribution?.length) return [];
        return data.hours_distribution.map(b => ({
            bucket: b.bucket || b.label,
            Sayi: b.count,
        }));
    }, [data?.hours_distribution]);

    return (
        <>
            <CollapsibleSection
                title="Calisma Saati Analizi"
                subtitle="Hedef vs gerceklesen, dagilim ve verimlilik"
                icon={BarChart3}
                iconGradient="from-blue-500 to-cyan-600"
            >
                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="text-blue-500 animate-spin mr-2" />
                        <span className="text-sm text-slate-400">Calisma saati verileri yukleniyor...</span>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <AlertCircle size={24} className="text-red-400" />
                        <p className="text-sm text-slate-500">{error}</p>
                        <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                            <RefreshCw size={14} /> Tekrar Dene
                        </button>
                    </div>
                )}

                {/* Data */}
                {data && !loading && (
                    <div className="space-y-5">
                        {/* ─── 1. Target vs Actual Horizontal BarChart ── */}
                        {targetBarData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Hedef vs Gerceklesen</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={Math.max(260, targetBarData.length * 36)} minWidth={400}>
                                        <BarChart data={targetBarData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                width={100}
                                            />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                            <Bar dataKey="Hedef" fill="#e2e8f0" radius={[0, 4, 4, 0]} maxBarSize={18} />
                                            <Bar dataKey="Calisan" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* ─── 2. Daily Team Average Line ─────────────── */}
                        {dailyAvgData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gunluk Ekip Ortalamasi</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={240} minWidth={350}>
                                        <AreaChart data={dailyAvgData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                            <defs>
                                                <linearGradient id="whAreaFill" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 9, fill: '#94a3b8' }}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 'auto']} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <ReferenceLine
                                                y={8}
                                                stroke="#ef4444"
                                                strokeDasharray="4 2"
                                                strokeWidth={1.5}
                                                label={{ value: 'Hedef 8s', fontSize: 9, fill: '#ef4444', position: 'right' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="Ortalama"
                                                stroke="#3b82f6"
                                                fill="url(#whAreaFill)"
                                                strokeWidth={2}
                                                dot={{ r: 3, fill: '#3b82f6' }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* ─── 3. Hours Distribution + 4. Weekday/Weekend ─ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Distribution */}
                            {distributionData.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calisma Saati Dagilimi</h4>
                                        {data.distribution_stats && (
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                <span>Ort: <span className="font-bold text-slate-600">{data.distribution_stats.mean}s</span></span>
                                                <span>Std: <span className="font-bold text-slate-600">{data.distribution_stats.std_dev}s</span></span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto -mx-2">
                                        <ResponsiveContainer width="100%" height={200} minWidth={280}>
                                            <BarChart data={distributionData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} />
                                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar dataKey="Sayi" name="Calisan Sayisi" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Weekday vs Weekend */}
                            {(data.weekday_stats || data.weekend_stats) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <WeekdayCard
                                        title="Hafta Ici"
                                        data={data.weekday_stats}
                                        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                                    />
                                    <WeekdayCard
                                        title="Hafta Sonu"
                                        data={data.weekend_stats}
                                        gradient="bg-gradient-to-br from-amber-500 to-amber-600"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ─── 5. Efficiency Ranking Table ───────────── */}
                        {data.employee_hours?.length > 0 && (
                            <EfficiencyTable
                                employees={data.employee_hours}
                                onEmployeeClick={(id) => setDrawerEmployeeId(id)}
                            />
                        )}

                        {/* Empty state */}
                        {!data.employee_hours?.length && !data.daily_team_avg?.length && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <BarChart3 size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Bu donem icin calisma saati verisi bulunamadi.</p>
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
