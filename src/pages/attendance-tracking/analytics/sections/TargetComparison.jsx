import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Target, Loader2, AlertCircle, RefreshCw,
    Clock, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   EMPLOYEE LINE COLORS
   ═══════════════════════════════════════════════════ */
const LINE_COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316',
];

/* ═══════════════════════════════════════════════════
   Build comparison metrics from backend structure
   Backend: { current: {...}, previous: {...}, delta: {...} }
   We transform into a displayable array of metric rows.
   ═══════════════════════════════════════════════════ */
const COMPARISON_METRIC_KEYS = [
    { key: 'worked_hours', label: 'Calisan Saat', suffix: 's' },
    { key: 'target_hours', label: 'Hedef Saat', suffix: 's' },
    { key: 'efficiency_pct', label: 'Verimlilik', suffix: '%' },
    { key: 'overtime_hours', label: 'Ek Mesai', suffix: 's' },
    { key: 'absent_days', label: 'Devamsiz Gun', suffix: '' },
    { key: 'leave_days', label: 'Izin Gun', suffix: '' },
    { key: 'headcount', label: 'Kisi Sayisi', suffix: '' },
    { key: 'avg_worked', label: 'Ort. Calisma', suffix: 's' },
];

function buildComparisonMetrics(periodComparison) {
    if (!periodComparison) return [];

    // If backend already provides a metrics array, use it directly
    if (Array.isArray(periodComparison.metrics) && periodComparison.metrics.length > 0) {
        return periodComparison.metrics;
    }

    // Otherwise build from current/previous/delta objects
    const { current, previous, delta } = periodComparison;
    if (!current && !previous) return [];

    const metrics = [];
    COMPARISON_METRIC_KEYS.forEach(({ key, label, suffix }) => {
        const curVal = current?.[key];
        const prevVal = previous?.[key];
        const deltaVal = delta?.[key];
        // Only include if at least one value exists
        if (curVal != null || prevVal != null) {
            metrics.push({
                label,
                current: curVal ?? '-',
                previous: prevVal ?? '-',
                delta: deltaVal ?? 0,
                suffix,
            });
        }
    });
    return metrics;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TargetComparison() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/target-comparison/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('TargetComparison fetch error:', err);
            setError('Hedef karsilastirma verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Efficiency trend multi-line data
    // Backend: [{ month, label, team_avg, employees: {name: pct} }]
    const trendData = useMemo(() => {
        if (!data?.efficiency_trend?.length) return { chartData: [], employees: [] };
        const dates = data.efficiency_trend;
        const employeeSet = new Set();

        // Collect all employee names
        dates.forEach(d => {
            if (d.employees) {
                Object.keys(d.employees).forEach(name => employeeSet.add(name));
            }
        });
        const employees = Array.from(employeeSet).slice(0, 10);

        const chartData = dates.map(d => {
            const point = { name: d.label || d.month || d.date?.substring(5) };
            employees.forEach(emp => {
                point[emp] = d.employees?.[emp] ?? null;
            });
            if (d.team_avg != null) point['Ekip Ort.'] = d.team_avg;
            return point;
        });

        return { chartData, employees };
    }, [data?.efficiency_trend]);

    const projection = data?.projection;
    const employeeTargets = data?.employee_targets || [];
    const periodComparison = data?.period_comparison;
    const comparisonMetrics = useMemo(() => buildComparisonMetrics(periodComparison), [periodComparison]);

    return (
        <CollapsibleSection
            title="Hedef Karsilastirma"
            subtitle="Projeksiyon, calisan hedefleri ve donem analizi"
            icon={Target}
            iconGradient="from-violet-500 to-purple-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-violet-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Hedef verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* --- 1. Projection Card ------------------- */}
                    {projection && (
                        <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Target size={80} />
                            </div>
                            <h4 className="text-xs font-bold uppercase tracking-wider opacity-80 mb-3">Ay Sonu Projeksiyon</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <p className="text-[10px] opacity-70">Kalan Gun</p>
                                    <p className="text-2xl font-black">{projection.remaining_days ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] opacity-70">Gunluk Tempo</p>
                                    <p className="text-2xl font-black">{projection.current_tempo ?? '-'}<span className="text-xs ml-0.5 opacity-80">s</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] opacity-70">Tahmini Toplam</p>
                                    <p className="text-2xl font-black">{projection.projected_total ?? '-'}<span className="text-xs ml-0.5 opacity-80">s</span></p>
                                </div>
                                <div>
                                    <p className="text-[10px] opacity-70">Gereken Gunluk</p>
                                    <p className="text-2xl font-black">{projection.required_daily ?? '-'}<span className="text-xs ml-0.5 opacity-80">s</span></p>
                                </div>
                            </div>

                            {/* Extra info row */}
                            {(projection.total_days_in_period != null || projection.elapsed_days != null) && (
                                <div className="flex items-center gap-4 mb-3 text-[10px] opacity-70">
                                    {projection.total_days_in_period != null && (
                                        <span>Toplam gun: {projection.total_days_in_period}</span>
                                    )}
                                    {projection.elapsed_days != null && (
                                        <span>Gecen gun: {projection.elapsed_days}</span>
                                    )}
                                    {projection.current_worked_hours != null && (
                                        <span>Calisan: {projection.current_worked_hours}s</span>
                                    )}
                                    {projection.target_hours != null && (
                                        <span>Hedef: {projection.target_hours}s</span>
                                    )}
                                </div>
                            )}

                            {/* Completion progress */}
                            {projection.completion_pct != null && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold opacity-80">Tamamlanma</span>
                                        <span className="text-sm font-black">%{projection.completion_pct}</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-white/80 transition-all duration-1000"
                                            style={{ width: `${Math.min(100, projection.completion_pct)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- 2. Employee Target Status ------------ */}
                    {/* Backend: [{ employee_id, name, department, worked_hours, target_hours, efficiency_pct, status }] */}
                    {employeeTargets.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calisan Hedef Durumu</h4>
                            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                {employeeTargets.map(emp => {
                                    const pct = emp.efficiency_pct ?? 0;
                                    const barColor = pct >= 95 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500';
                                    const textColor = pct >= 95 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600';
                                    return (
                                        <div key={emp.employee_id || emp.name}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[150px]" title={emp.name}>
                                                        {emp.name}
                                                    </span>
                                                    {emp.status && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                                            emp.status === 'on_track' ? 'bg-emerald-100 text-emerald-700'
                                                            : emp.status === 'at_risk' ? 'bg-amber-100 text-amber-700'
                                                            : emp.status === 'behind' ? 'bg-red-100 text-red-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {emp.status === 'on_track' ? 'Yolunda' : emp.status === 'at_risk' ? 'Risk' : emp.status === 'behind' ? 'Geride' : emp.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-400">{emp.worked_hours ?? 0}/{emp.target_hours ?? 0}s</span>
                                                    <span className={`text-xs font-bold ${textColor}`}>%{pct}</span>
                                                </div>
                                            </div>
                                            <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- 3. Period Comparison ------------------ */}
                    {/* Backend: { current: {...}, previous: {...}, delta: {...} } */}
                    {comparisonMetrics.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Donem Karsilastirma</h4>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Metrik</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Bu Donem</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Onceki Donem</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500">Degisim</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonMetrics.map(m => {
                                            const delta = typeof m.delta === 'number' ? m.delta : 0;
                                            const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : null;
                                            const deltaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-400';
                                            return (
                                                <tr key={m.label} className="border-b border-slate-100 last:border-0">
                                                    <td className="px-3 py-2.5 font-semibold text-slate-700">{m.label}</td>
                                                    <td className="px-3 py-2.5 font-bold text-slate-700">{m.current}{m.suffix || ''}</td>
                                                    <td className="px-3 py-2.5 text-slate-500">{m.previous}{m.suffix || ''}</td>
                                                    <td className="px-3 py-2.5">
                                                        <div className={`flex items-center gap-0.5 font-bold ${deltaColor}`}>
                                                            {DeltaIcon && <DeltaIcon size={12} />}
                                                            {delta > 0 ? '+' : ''}{delta}{m.suffix || ''}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile */}
                            <div className="md:hidden space-y-2">
                                {comparisonMetrics.map(m => {
                                    const delta = typeof m.delta === 'number' ? m.delta : 0;
                                    const deltaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-400';
                                    return (
                                        <div key={m.label} className="bg-white rounded-xl p-3 border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-semibold mb-1">{m.label}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-slate-700">{m.current}{m.suffix || ''}</span>
                                                <span className="text-xs text-slate-400">Onceki: {m.previous}{m.suffix || ''}</span>
                                                <span className={`text-xs font-bold ${deltaColor}`}>
                                                    {delta > 0 ? '+' : ''}{delta}{m.suffix || ''}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- 4. Efficiency Trend LineChart --------- */}
                    {trendData.chartData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verimlilik Trendi</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={300} minWidth={400}>
                                    <LineChart data={trendData.chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 'auto']} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                                        {/* Team average line (thick) */}
                                        <Line
                                            type="monotone"
                                            dataKey="Ekip Ort."
                                            stroke="#1e293b"
                                            strokeWidth={3}
                                            dot={{ r: 3 }}
                                            connectNulls
                                        />
                                        {/* Employee lines */}
                                        {trendData.employees.map((emp, i) => (
                                            <Line
                                                key={emp}
                                                type="monotone"
                                                dataKey={emp}
                                                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                                                strokeWidth={1.5}
                                                dot={false}
                                                strokeDasharray={i > 4 ? '4 2' : undefined}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!projection && !employeeTargets.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Target size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Bu donem icin hedef verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
