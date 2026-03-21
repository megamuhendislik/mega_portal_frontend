import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Coffee, Loader2, AlertCircle, RefreshCw,
    UtensilsCrossed, Clock, AlertTriangle, Info
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ComposedChart, Line,
    ScatterChart, Scatter, Cell, Legend
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
   MINI SPARKLINE (SVG-based, no recharts dependency)
   ═══════════════════════════════════════════════════ */
function MiniSparkline({ data, width = 60, height = 20, threshold = 30 }) {
    if (!data?.length) return null;
    const max = Math.max(...data, threshold + 5);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const step = width / Math.max(data.length - 1, 1);

    const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
    const thresholdY = height - ((threshold - min) / range) * height;

    return (
        <svg width={width} height={height} className="inline-block">
            <line x1={0} y1={thresholdY} x2={width} y2={thresholdY} stroke="#ef4444" strokeWidth={0.5} strokeDasharray="2 1" />
            <polyline points={points} fill="none" stroke="#10b981" strokeWidth={1.5} />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════
   BREAK TIME HEATMAP
   ═══════════════════════════════════════════════════ */
const BREAK_HOURS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
const BREAK_DAYS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum'];

function BreakHeatmap({ heatmapData }) {
    if (!heatmapData || !Object.keys(heatmapData).length) return null;

    let maxVal = 0;
    BREAK_DAYS.forEach((_, di) => {
        BREAK_HOURS.forEach((_, hi) => {
            const val = heatmapData?.[di]?.[hi] ?? 0;
            if (val > maxVal) maxVal = val;
        });
    });

    const getColor = (val) => {
        if (!val || maxVal === 0) return 'bg-slate-50';
        const intensity = val / maxVal;
        if (intensity > 0.75) return 'bg-emerald-500';
        if (intensity > 0.5) return 'bg-emerald-400';
        if (intensity > 0.25) return 'bg-emerald-300';
        return 'bg-emerald-100';
    };

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mola Zamani Isi Haritasi</h4>
            <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                    <div className="flex items-center mb-1">
                        <div className="w-10 shrink-0" />
                        {BREAK_HOURS.map(h => (
                            <div key={h} className="flex-1 text-center text-[8px] text-slate-400 font-semibold">{h}</div>
                        ))}
                    </div>
                    {BREAK_DAYS.map((day, di) => (
                        <div key={day} className="flex items-center gap-0.5 mb-0.5">
                            <div className="w-10 shrink-0 text-[10px] font-semibold text-slate-500">{day}</div>
                            {BREAK_HOURS.map((_, hi) => {
                                const val = heatmapData?.[di]?.[hi] ?? 0;
                                return (
                                    <div
                                        key={hi}
                                        className={`flex-1 h-7 rounded-sm ${getColor(val)} transition-colors`}
                                        title={`${day} ${BREAK_HOURS[hi]}: ${val} kisi`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mt-3 justify-end">
                        <span className="text-[9px] text-slate-400">Az</span>
                        <div className="w-4 h-3 rounded-sm bg-emerald-100" />
                        <div className="w-4 h-3 rounded-sm bg-emerald-300" />
                        <div className="w-4 h-3 rounded-sm bg-emerald-400" />
                        <div className="w-4 h-3 rounded-sm bg-emerald-500" />
                        <span className="text-[9px] text-slate-400">Cok</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   BREAK vs OT INSIGHT
   ═══════════════════════════════════════════════════ */
function BreakOTInsight({ kpi, otMealCorrelation, rValue }) {
    if (!kpi) return null;

    const insights = [];

    // Break exceeding insight
    if (kpi.break_over_30_pct != null) {
        if (kpi.break_over_30_pct > 40) {
            insights.push({
                type: 'warning',
                text: `Calisanlarin %${kpi.break_over_30_pct}'i 30 dakika mola limitini asiyor. Ekibin mola aliskanliklari gozden gecirilmeli.`,
            });
        } else if (kpi.break_over_30_pct > 20) {
            insights.push({
                type: 'info',
                text: `%${kpi.break_over_30_pct} oraninda calisan 30dk mola limitinin uzerinde. Genel olarak kabul edilebilir seviyede.`,
            });
        } else {
            insights.push({
                type: 'success',
                text: `Mola aliskanliklari iyi durumda: yalnizca %${kpi.break_over_30_pct} calisan 30dk limitini asiyor.`,
            });
        }
    }

    // OT-Meal correlation insight
    if (rValue != null) {
        const r = parseFloat(rValue);
        if (r > 0.6) {
            insights.push({
                type: 'info',
                text: `OT ile yemek siparisi arasinda guclu pozitif korelasyon (R=${rValue}). Fazla mesai yapanlar daha fazla yemek siparis ediyor.`,
            });
        } else if (r > 0.3) {
            insights.push({
                type: 'info',
                text: `OT ile yemek siparisi arasinda orta duzey korelasyon (R=${rValue}).`,
            });
        }
    }

    // OT-meal overlap insight
    if (kpi.ot_meal_overlap_pct != null && kpi.ot_meal_overlap_pct > 50) {
        insights.push({
            type: 'info',
            text: `Ek mesai yapan calisanlarin %${kpi.ot_meal_overlap_pct}'i ayni zamanda yemek siparisi veriyor.`,
        });
    }

    if (insights.length === 0) return null;

    return (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Analiz Notlari</h4>
            {insights.map((insight, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                    insight.type === 'warning' ? 'bg-amber-50 text-amber-800'
                    : insight.type === 'success' ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-blue-50 text-blue-800'
                }`}>
                    {insight.type === 'warning' ? <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                     : <Info size={13} className="shrink-0 mt-0.5" />}
                    <span>{insight.text}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function BreakMealAnalysis() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/break-meal/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('BreakMealAnalysis fetch error:', err);
            setError('Mola/yemek verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Break duration distribution
    const breakDistribution = useMemo(() => {
        if (!data?.break_distribution?.length) return [];
        return data.break_distribution.map(b => ({
            bucket: b.bucket || b.label,
            Sayi: b.count,
        }));
    }, [data?.break_distribution]);

    // Employee break averages with sparkline data and warning badges
    const employeeBreaks = useMemo(() => {
        if (!data?.employee_breaks?.length) return [];
        return data.employee_breaks.slice(0, 15).map(e => ({
            name: e.name,
            employee_id: e.employee_id,
            avgBreakMin: e.avg_break_min,
            exceeds30: (e.avg_break_min ?? 0) > 30,
            // daily_breaks is an optional array of daily break minutes for sparkline
            dailyBreaks: e.daily_breaks || [],
            'Ort. Mola': e.avg_break_min,
        }));
    }, [data?.employee_breaks]);

    // Count of employees exceeding 30dk
    const exceeding30Count = useMemo(() => {
        return employeeBreaks.filter(e => e.exceeds30).length;
    }, [employeeBreaks]);

    // Meal order trend
    const mealTrend = useMemo(() => {
        if (!data?.meal_trend?.length) return [];
        return data.meal_trend.map(m => ({
            name: m.label || m.date?.substring(5),
            Siparis: m.count,
            Oran: m.rate_pct,
        }));
    }, [data?.meal_trend]);

    // OT-Meal scatter
    const scatterData = useMemo(() => {
        if (!data?.ot_meal_correlation?.length) return [];
        return data.ot_meal_correlation.map(e => ({
            x: e.ot_hours,
            y: e.meal_days,
            name: e.name,
        }));
    }, [data?.ot_meal_correlation]);

    const kpi = data?.kpi;
    const hasAnyData = kpi || breakDistribution.length > 0 || employeeBreaks.length > 0 || mealTrend.length > 0;

    return (
        <CollapsibleSection
            title="Mola & Yemek Analizi"
            subtitle="Mola suresi, yemek siparisi ve korelasyon"
            icon={Coffee}
            iconGradient="from-emerald-500 to-teal-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-emerald-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Mola/yemek verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* --- 1. 5 KPI Cards ---------------------- */}
                    {kpi && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <KPICard label="Ort. Mola" value={kpi.avg_break_min} suffix="dk" icon={Coffee} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                            <KPICard label="30dk Asan" value={kpi.break_over_30_pct} suffix="%" icon={AlertTriangle} gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
                            <KPICard label="Yemek Orani" value={kpi.meal_rate_pct} suffix="%" icon={UtensilsCrossed} gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
                            <KPICard label="OT-Yemek" value={kpi.ot_meal_overlap_pct} suffix="%" icon={Clock} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                            <KPICard label="Asim Gunleri" value={kpi.break_exceeding_days} suffix="gun" icon={AlertTriangle} gradient="bg-gradient-to-br from-rose-500 to-rose-600" />
                        </div>
                    )}

                    {/* --- 2 & 3: Distribution + Employee Breaks ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Break Duration Distribution */}
                        {breakDistribution.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mola Suresi Dagilimi</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={220} minWidth={280}>
                                        <BarChart data={breakDistribution} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <ReferenceLine
                                                x="30dk"
                                                stroke="#ef4444"
                                                strokeDasharray="4 2"
                                                strokeWidth={1.5}
                                                label={{ value: '30dk limit', fontSize: 9, fill: '#ef4444', position: 'top' }}
                                            />
                                            <Bar dataKey="Sayi" name="Calisan Sayisi" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Employee Break Averages with sparklines and warning badges */}
                        {employeeBreaks.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calisan Mola Ortalamalari</h4>
                                    {exceeding30Count > 0 && (
                                        <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                            {exceeding30Count} kisi 30dk+
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                                    {employeeBreaks.map((emp, i) => (
                                        <div key={emp.name || i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/60 transition-colors">
                                            {/* Name + warning badge */}
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[100px]" title={emp.name}>
                                                    {emp.name}
                                                </span>
                                                {emp.exceeds30 && (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                                        30dk asim
                                                    </span>
                                                )}
                                            </div>
                                            {/* Sparkline */}
                                            {emp.dailyBreaks.length > 1 && (
                                                <MiniSparkline data={emp.dailyBreaks} />
                                            )}
                                            {/* Value */}
                                            <span className={`text-xs font-bold shrink-0 ${
                                                emp.avgBreakMin > 30 ? 'text-red-600' : 'text-emerald-600'
                                            }`}>
                                                {emp.avgBreakMin}dk
                                            </span>
                                            {/* Bar indicator */}
                                            <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        emp.avgBreakMin > 30 ? 'bg-red-400' : 'bg-emerald-400'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (emp.avgBreakMin / 45) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- 4. Break Heatmap --------------------- */}
                    <BreakHeatmap heatmapData={data.break_heatmap} />

                    {/* --- 5. Meal Order Trend ------------------ */}
                    {mealTrend.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yemek Siparis Trendi</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={240} minWidth={350}>
                                    <ComposedChart data={mealTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            allowDecimals={false}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            domain={[0, 100]}
                                            tickFormatter={(v) => `%${v}`}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        <Bar yAxisId="left" dataKey="Siparis" name="Siparis Sayisi" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                        <Line yAxisId="right" type="monotone" dataKey="Oran" name="Oran %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* --- 6. OT-Meal Correlation Scatter ------- */}
                    {scatterData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">OT-Yemek Korelasyonu</h4>
                                {data.ot_meal_r_value != null && (
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                        R = <span className="text-slate-600 font-bold">{data.ot_meal_r_value}</span>
                                    </span>
                                )}
                            </div>
                            <ResponsiveContainer width="100%" height={240}>
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        name="OT Saat"
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        label={{ value: 'OT (saat)', position: 'bottom', fontSize: 10, fill: '#94a3b8', offset: -5 }}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="y"
                                        name="Yemek Gun"
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        label={{ value: 'Yemek (gun)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload?.length) return null;
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                    <p className="font-bold text-slate-700">{d.name}</p>
                                                    <p className="text-slate-500">OT: {d.x}s | Yemek: {d.y} gun</p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Scatter name="Calisan" data={scatterData} fill="#10b981">
                                        {scatterData.map((_, i) => (
                                            <Cell key={`c-${i}`} fill="#10b981" />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* --- 7. Break vs OT Insight --------------- */}
                    <BreakOTInsight
                        kpi={kpi}
                        otMealCorrelation={data.ot_meal_correlation}
                        rValue={data.ot_meal_r_value}
                    />

                    {/* Empty state */}
                    {!hasAnyData && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Coffee size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-semibold mb-1">Mola/yemek verisi bulunamadi</p>
                            <p className="text-xs text-slate-300">Secilen donem icin yeterli veri yok. Farkli bir tarih araligi secmeyi deneyin.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
