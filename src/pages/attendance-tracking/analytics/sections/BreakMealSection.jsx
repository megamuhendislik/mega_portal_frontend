import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Coffee, AlertTriangle, UtensilsCrossed, Timer, Users, BarChart3,
    AlertCircle, RefreshCw, Utensils, Zap, Clock
} from 'lucide-react';
import {
    BarChart, Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ReferenceLine, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';
import InfoTooltip from '../shared/InfoTooltip';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const BREAK_COLORS = {
    withinAllowance: '#10b981', // green — 0-30
    exceeding: '#f59e0b',       // amber — 30-45
    overflow: '#ef4444',        // red   — 45+
};

function getBreakBarColor(range) {
    // range like "0-5", "30-35", "45+"
    const num = parseInt(range, 10);
    if (isNaN(num)) return BREAK_COLORS.overflow;
    if (num >= 45) return BREAK_COLORS.overflow;
    if (num >= 30) return BREAK_COLORS.exceeding;
    return BREAK_COLORS.withinAllowance;
}

function getAvgBreakColor(minutes) {
    if (minutes > 45) return 'text-red-600';
    if (minutes > 30) return 'text-amber-600';
    return 'text-emerald-600';
}

function getOverflowColor(pct) {
    if (pct > 50) return 'text-red-600';
    if (pct >= 20) return 'text-amber-600';
    return 'text-emerald-600';
}

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
   CUSTOM TOOLTIPS
   ═══════════════════════════════════════════════════ */
function HistogramTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label} dk</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value?.toLocaleString('tr-TR')} gün</span>
                </div>
            ))}
        </div>
    );
}

function EmployeeBreakTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.payload;
    if (!raw) return null;
    const counted = raw.avg_counted_minutes ?? 0;
    const uncounted = raw.avg_uncounted_minutes ?? 0;
    const total = counted + uncounted;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs max-w-[250px]">
            <p className="font-bold text-slate-700 mb-0.5">{raw.fullName}</p>
            <p className="text-[10px] text-slate-400 mb-2">{raw.department}</p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-emerald-600">Sayılan Mola:</span>
                    <span className="font-bold text-emerald-700">{counted.toFixed(1)} dk</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-red-500">Sayılmayan Mola:</span>
                    <span className="font-bold text-red-600">{uncounted.toFixed(1)} dk</span>
                </div>
                <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Toplam:</span>
                        <span className={`font-bold ${getAvgBreakColor(total)}`}>{total.toFixed(1)} dk</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">İzin:</span>
                        <span className="font-bold text-slate-700">30 dk</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Fark:</span>
                        <span className={`font-bold ${total > 30 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {total > 30 ? '+' : ''}{(total - 30).toFixed(1)} dk
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MealTrendTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">
                        {typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}
                        {entry.dataKey === 'rate_pct' ? '%' : ''}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function BreakMealSection({ onPersonClick, bulkBreakMeal, bulkLoading }) {
    const { queryParams } = useAnalyticsFilter();
    const [fetchedData, setFetchedData] = useState(null);
    const [fetchedLoading, setFetchedLoading] = useState(true);
    const [error, setError] = useState(null);

    const hasBulk = bulkBreakMeal != null;

    const fetchData = useCallback(async () => {
        if (hasBulk) { setFetchedLoading(false); return; }
        setFetchedLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/break-meal/', { params: queryParams });
            setFetchedData(res.data);
        } catch (err) {
            console.error('BreakMealSection fetch error:', err);
            setError('Mola ve yemek verileri yüklenemedi.');
        } finally {
            setFetchedLoading(false);
        }
    }, [queryParams, hasBulk]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const data = hasBulk ? (bulkBreakMeal && !bulkBreakMeal.error ? bulkBreakMeal : fetchedData) : fetchedData;
    const loading = hasBulk ? (bulkLoading ?? false) : fetchedLoading;

    /* ─── KPI values ─── */
    const kpi = data?.kpi;

    /* ─── Derived KPI: Sayılan / Sayılmayan ─── */
    const avgCountedMinutes = useMemo(() => {
        if (kpi?.avg_counted_break_minutes != null) return kpi.avg_counted_break_minutes;
        // Fallback: break_minutes is the counted (within-allowance) portion
        if (kpi?.avg_break_minutes != null) return kpi.avg_break_minutes;
        return null;
    }, [kpi]);

    const avgPotentialMinutes = useMemo(() => {
        if (kpi?.avg_potential_break_minutes != null) return kpi.avg_potential_break_minutes;
        return null;
    }, [kpi]);

    const avgUncountedMinutes = useMemo(() => {
        if (kpi?.avg_uncounted_break_minutes != null) return kpi.avg_uncounted_break_minutes;
        // Compute if potential available
        if (avgPotentialMinutes != null && avgCountedMinutes != null) {
            return Math.max(0, avgPotentialMinutes - avgCountedMinutes);
        }
        return null;
    }, [kpi, avgPotentialMinutes, avgCountedMinutes]);

    /* ─── Histogram data ─── */
    const histogramData = useMemo(() => {
        if (!data?.break_histogram?.length) return [];
        return data.break_histogram;
    }, [data?.break_histogram]);

    /* ─── Uncounted histogram data ─── */
    const uncountedHistogramData = useMemo(() => {
        if (data?.uncounted_histogram?.length) return data.uncounted_histogram;
        return null; // not available from backend
    }, [data?.uncounted_histogram]);

    /* ─── Employee break avg (sorted desc, top 15) ─── */
    const employeeBreakData = useMemo(() => {
        if (!data?.employee_break_avg?.length) return [];
        const sorted = [...data.employee_break_avg].sort((a, b) => (b.avg_minutes ?? 0) - (a.avg_minutes ?? 0));
        return sorted.slice(0, 15).map(e => {
            // Compute counted / uncounted if not provided
            const avgMin = e.avg_minutes ?? 0;
            const counted = e.avg_counted_minutes != null ? e.avg_counted_minutes : Math.min(30, avgMin);
            const uncounted = e.avg_uncounted_minutes != null ? e.avg_uncounted_minutes : Math.max(0, avgMin - 30);
            return {
                ...e,
                shortName: (e.name || '').length > 12 ? (e.name || '').substring(0, 12) + '...' : (e.name || ''),
                fullName: e.name || '',
                avg_counted_minutes: counted,
                avg_uncounted_minutes: uncounted,
            };
        });
    }, [data?.employee_break_avg]);

    /* ─── Meal trend data ─── */
    const mealTrendData = useMemo(() => {
        if (!data?.meal_trend?.length) return [];
        return data.meal_trend.map(m => ({
            name: m.label,
            order_count: m.order_count ?? 0,
            rate_pct: m.rate_pct ?? 0,
        }));
    }, [data?.meal_trend]);

    /* ─── OT meal correlation ─── */
    const otMealCorrelation = data?.ot_meal_correlation;

    /* ─── Break quality insights ─── */
    const shortBreakCount = useMemo(() => {
        return (data?.break_histogram || [])
            .filter(b => parseInt(b.range) < 10)
            .reduce((sum, b) => sum + (b.count || 0), 0);
    }, [data?.break_histogram]);

    const longBreakCount = useMemo(() => {
        return (data?.break_histogram || [])
            .filter(b => parseInt(b.range) >= 60)
            .reduce((sum, b) => sum + (b.count || 0), 0);
    }, [data?.break_histogram]);

    /* ─── Meal behavior insights ─── */
    const topMealEmployee = useMemo(() => {
        const emps = otMealCorrelation?.employees || [];
        return emps.length > 0 ? emps.reduce((max, e) => (e.meal_days > (max?.meal_days ?? 0)) ? e : max, null) : null;
    }, [otMealCorrelation]);

    const noMealOtEmployee = useMemo(() => {
        const emps = (otMealCorrelation?.employees || []).filter(e => e.ot_hours > 4 && e.meal_days === 0);
        return emps.length > 0 ? emps.reduce((max, e) => (e.ot_hours > (max?.ot_hours ?? 0)) ? e : max, null) : null;
    }, [otMealCorrelation]);

    /* ─── Find the index of the "30" bucket for ReferenceLine ─── */
    const referenceIndex = useMemo(() => {
        return histogramData.findIndex(d => {
            const num = parseInt(d.range, 10);
            return num >= 30;
        });
    }, [histogramData]);

    /* ─── Loading skeleton ─── */
    if (loading) {
        return (
            <div className="space-y-4">
                {/* KPI skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-3 animate-pulse">
                            <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
                            <div className="h-6 w-12 bg-slate-200 rounded mb-1" />
                            <div className="h-2 w-20 bg-slate-200 rounded" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard height={260} />
                    <SkeletonCard height={260} />
                </div>
                <SkeletonCard height={400} />
                <SkeletonCard height={250} />
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
                    <Coffee size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Bu dönem için mola ve yemek verisi bulunamadı.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* ═══ SECTION 1: KPI Kartları — 2 Grup ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

                {/* ── Grup A: Mola Analizi ── */}

                {/* 1 — Sayılan Mola */}
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Coffee size={14} className="text-emerald-600" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">Sayılan Mola <InfoTooltip text="30 dakikalık izin dahilinde kullanılan mola süresi. Çalışma süresinden düşülür." /></span>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">
                        {avgCountedMinutes != null ? Math.round(avgCountedMinutes) : '—'} <span className="text-sm font-semibold">dk</span>
                    </p>
                    <p className="text-[10px] text-slate-400">/ 30 dk izin</p>
                </div>

                {/* 2 — Sayılmayan Mola */}
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">Sayılmayan Mola <InfoTooltip text="İzin süresini aşan fazla mola. Çalışma süresinden düşülmez ama verimliliği etkiler." /></span>
                    </div>
                    <p className="text-xl font-bold text-red-600">
                        {avgUncountedMinutes != null ? Math.round(avgUncountedMinutes) : '—'} <span className="text-sm font-semibold">dk</span>
                    </p>
                    <p className="text-[10px] text-slate-400">izin dışı fazla mola</p>
                </div>

                {/* 3 — Toplam Dışarıda */}
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Timer size={14} className="text-orange-600" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">Toplam Dışarıda <InfoTooltip text="Gün içinde iş istasyonundan uzakta geçirilen toplam süre (sayılan + sayılmayan)." /></span>
                    </div>
                    <p className={`text-xl font-bold ${getAvgBreakColor(avgPotentialMinutes ?? avgCountedMinutes ?? 0)}`}>
                        {avgPotentialMinutes != null
                            ? Math.round(avgPotentialMinutes)
                            : avgCountedMinutes != null
                                ? Math.round(avgCountedMinutes)
                                : '—'} <span className="text-sm font-semibold">dk</span>
                    </p>
                    <p className="text-[10px] text-slate-400">toplam dışarıda geçen süre</p>
                </div>

                {/* ── Grup B: Yemek & Taşma ── */}

                {/* 4 — Yemek Oranı */}
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <UtensilsCrossed size={14} className="text-blue-600" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">Yemek Oranı <InfoTooltip text="İş günlerinde yemek siparişi veren çalışanların oranı." /></span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">
                        %{kpi?.meal_rate_pct != null ? Math.round(kpi.meal_rate_pct) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">iş günlerinde sipariş</p>
                </div>

                {/* 5 — OT Yemek */}
                <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Utensils size={14} className="text-violet-600" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">OT Yemek <InfoTooltip text="Ek mesai yapılan günlerde yemek siparişi oranı." /></span>
                    </div>
                    <p className="text-xl font-bold text-violet-700">
                        %{kpi?.ot_meal_overlap_pct != null ? Math.round(kpi.ot_meal_overlap_pct) : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">ek mesai günlerinde yemek</p>
                </div>

                {/* 6 — Taşma Günü */}
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={14} className="text-orange-600" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">Taşma Günü <InfoTooltip text="45 dakikadan fazla mola yapılan toplam gün sayısı." /></span>
                    </div>
                    <p className="text-xl font-bold text-orange-700">
                        {kpi?.break_exceeding_count ?? '—'} <span className="text-sm font-semibold">gün</span>
                    </p>
                    <p className="text-[10px] text-slate-400">45 dk+ mola yapılan gün</p>
                </div>
            </div>

            {/* ═══ Açıklama Notu ═══ */}
            <p className="text-[10px] text-slate-400 mt-2 px-1">
                <span className="font-medium text-emerald-600">Sayılan mola:</span> İzin dahilinde (≤30 dk) çalışma süresinden düşülen mola.
                <span className="font-medium text-red-500 ml-2">Sayılmayan mola:</span> İzin dışı fazla mola — çalışma süresinden düşülmez ama verimliliği etkiler.
            </p>

            {/* ═══ Break Quality Insights ═══ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Kısa Mola Uyarısı */}
                <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Zap size={14} className="text-amber-600" />
                        <span className="text-[10px] text-slate-500 font-medium">Kısa Molalar (&lt;10 dk)</span>
                    </div>
                    <p className="text-sm font-bold text-amber-700">{shortBreakCount} gün</p>
                    <p className="text-[10px] text-slate-400">10 dakikadan kısa mola yapılan gün</p>
                </div>
                {/* Uzun Mola Uyarısı */}
                <div className="bg-red-50/50 rounded-xl p-3 border border-red-100/50">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={14} className="text-red-500" />
                        <span className="text-[10px] text-slate-500 font-medium">Uzun Molalar (&gt;60 dk)</span>
                    </div>
                    <p className="text-sm font-bold text-red-700">{longBreakCount} gün</p>
                    <p className="text-[10px] text-slate-400">60 dakikadan uzun mola yapılan gün</p>
                </div>
                {/* Yemeksiz OT */}
                <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100/50">
                    <div className="flex items-center gap-1.5 mb-1">
                        <UtensilsCrossed size={14} className="text-violet-600" />
                        <span className="text-[10px] text-slate-500 font-medium">Yemeksiz Ek Mesai</span>
                    </div>
                    <p className="text-sm font-bold text-violet-700">
                        %{100 - (kpi?.ot_meal_overlap_pct ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-400">OT yapıp yemek sipariş etmeyen oran</p>
                </div>
            </div>

            {/* ═══ MIDDLE ROW: 2 Histogram yan yana ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ─── Chart 1: Sayılan Mola Dağılımı (Histogram) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                            <BarChart3 size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            Sayılan Mola Dağılımı
                            <InfoTooltip text="İzin dahilindeki mola sürelerinin 5 dakikalık dilimlerde dağılımı. Kırmızı çizgi 30 dakikalık izin sınırı." />
                        </h4>
                    </div>
                    {histogramData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={histogramData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="range"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip content={<HistogramTooltip />} />
                                {referenceIndex >= 0 && (
                                    <ReferenceLine
                                        x={histogramData[referenceIndex]?.range}
                                        stroke="#ef4444"
                                        strokeDasharray="4 2"
                                        strokeWidth={1.5}
                                        label={{ value: '30 dk İzin', fontSize: 9, fill: '#ef4444', position: 'top' }}
                                    />
                                )}
                                <Bar dataKey="count" name="Gün Sayısı" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                    {histogramData.map((entry, i) => (
                                        <Cell key={`hist-${i}`} fill={getBreakBarColor(entry.range)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[260px] text-slate-300">
                            <p className="text-xs">Mola dağılım verisi bulunamadı</p>
                        </div>
                    )}
                </div>

                {/* ─── Chart 2: Sayılmayan Mola Dağılımı (Histogram) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shrink-0">
                            <AlertTriangle size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            Sayılmayan Mola (Taşma)
                            <InfoTooltip text="İzin dışı fazla mola sürelerinin dağılımı. Bu süreler çalışma saatinden düşülmez." />
                        </h4>
                    </div>
                    {uncountedHistogramData && uncountedHistogramData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={uncountedHistogramData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="range"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip content={<HistogramTooltip />} />
                                <Bar dataKey="count" name="Gün Sayısı" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#ef4444">
                                    {uncountedHistogramData.map((entry, i) => (
                                        <Cell key={`uncounted-hist-${i}`} fill="#ef4444" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[260px] text-slate-300 gap-2">
                            <AlertTriangle size={24} className="text-slate-200" />
                            <p className="text-xs text-slate-400">Sayılmayan mola dağılımı hesaplanıyor...</p>
                            <p className="text-[10px] text-slate-300">Backend desteği eklendiğinde otomatik görünecektir.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Kişi Bazlı Mola Analizi (Stacked Horizontal Bar) ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                        <Users size={14} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        Kişi Bazlı Mola Analizi (Sayılan + Sayılmayan)
                        <InfoTooltip text="Çalışan başına ortalama mola süresi. Yeşil = sayılan (izin dahili), kırmızı = sayılmayan (taşma)." />
                    </h4>
                </div>
                {employeeBreakData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={employeeBreakData}
                            layout="vertical"
                            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis
                                type="category"
                                dataKey="shortName"
                                width={100}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                            />
                            <Tooltip content={<EmployeeBreakTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                            <Legend
                                wrapperStyle={{ fontSize: '11px' }}
                                iconSize={10}
                                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                            />
                            <ReferenceLine
                                x={30}
                                stroke="#ef4444"
                                strokeDasharray="4 2"
                                strokeWidth={1.5}
                                label={{ value: '30 dk', fontSize: 9, fill: '#ef4444', position: 'top' }}
                            />
                            <Bar
                                dataKey="avg_counted_minutes"
                                name="Sayılan"
                                stackId="break"
                                fill="#10b981"
                                radius={[0, 0, 0, 0]}
                                maxBarSize={20}
                                cursor="pointer"
                                onClick={(barData) => {
                                    if (barData?.employee_id) {
                                        onPersonClick?.(barData.employee_id);
                                    }
                                }}
                            />
                            <Bar
                                dataKey="avg_uncounted_minutes"
                                name="Sayılmayan"
                                stackId="break"
                                fill="#ef4444"
                                radius={[0, 6, 6, 0]}
                                maxBarSize={20}
                                cursor="pointer"
                                onClick={(barData) => {
                                    if (barData?.employee_id) {
                                        onPersonClick?.(barData.employee_id);
                                    }
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[400px] text-slate-300">
                        <p className="text-xs">Çalışan mola verisi bulunamadı</p>
                    </div>
                )}
            </div>

            {/* ═══ BOTTOM ROW: Yemek Sipariş Trendi ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shrink-0">
                        <UtensilsCrossed size={14} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        Yemek Sipariş Trendi
                        <InfoTooltip text="Aylık yemek sipariş sayısı (çubuklar) ve sipariş oranı % (çizgi)." />
                    </h4>
                </div>
                {mealTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <ComposedChart data={mealTrendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 100]}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(v) => `%${v}`}
                            />
                            <Tooltip content={<MealTrendTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: '11px' }}
                                iconSize={10}
                                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="order_count"
                                name="Sipariş Sayısı"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={36}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="rate_pct"
                                name="Sipariş Oranı %"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#f59e0b' }}
                                activeDot={{ r: 5 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[250px] text-slate-300">
                        <p className="text-xs">Yemek sipariş verisi bulunamadı</p>
                    </div>
                )}

                {/* ─── Yemek Sipariş Deseni (Normal vs OT Gün) ─── */}
                {otMealCorrelation && (() => {
                    const normalRate = otMealCorrelation.normal_day_meal_rate_pct != null
                        ? Math.round(otMealCorrelation.normal_day_meal_rate_pct) : 0;
                    const otRate = otMealCorrelation.ot_day_meal_rate_pct != null
                        ? Math.round(otMealCorrelation.ot_day_meal_rate_pct) : 0;
                    const diff = otRate - normalRate;
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100">
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                                <p className="text-[10px] text-slate-500 font-medium">Normal Gün</p>
                                <p className="text-lg font-bold text-blue-700">%{normalRate}</p>
                                <p className="text-[9px] text-slate-400">sipariş oranı</p>
                            </div>
                            <div className="bg-violet-50 rounded-xl p-3 border border-violet-100 text-center">
                                <p className="text-[10px] text-slate-500 font-medium">Ek Mesai Günü</p>
                                <p className="text-lg font-bold text-violet-700">%{otRate}</p>
                                <p className="text-[9px] text-slate-400">sipariş oranı</p>
                            </div>
                            <div className={`${diff > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} rounded-xl p-3 border text-center`}>
                                <p className="text-[10px] text-slate-500 font-medium">Fark</p>
                                <p className={`text-lg font-bold ${diff > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{diff > 0 ? '+' : ''}{diff}%</p>
                                <p className="text-[9px] text-slate-400">{diff > 0 ? 'OT günleri daha çok sipariş' : diff < 0 ? 'OT günleri daha az sipariş' : 'Aynı oran'}</p>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── Yemek Davranış Özeti ─── */}
                {otMealCorrelation?.employees?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <h5 className="text-xs font-bold text-slate-600 mb-2">Yemek Davranış Özeti</h5>
                        <div className="grid grid-cols-2 gap-2">
                            {/* En Çok Sipariş */}
                            <div className="flex items-center gap-2 bg-blue-50/50 rounded-lg p-2">
                                <UtensilsCrossed size={12} className="text-blue-500" />
                                <div>
                                    <p className="text-[10px] text-slate-500">En Çok Sipariş</p>
                                    <p className="text-xs font-bold text-blue-700 truncate">
                                        {topMealEmployee?.name ?? '—'} ({topMealEmployee?.meal_days ?? 0} gün)
                                    </p>
                                </div>
                            </div>
                            {/* En Az Sipariş (OT yapıp yemek almayan) */}
                            <div className="flex items-center gap-2 bg-orange-50/50 rounded-lg p-2">
                                <AlertTriangle size={12} className="text-orange-500" />
                                <div>
                                    <p className="text-[10px] text-slate-500">OT Yapıp Yemek Almayan</p>
                                    <p className="text-xs font-bold text-orange-700 truncate">
                                        {noMealOtEmployee?.name ?? '—'} ({noMealOtEmployee?.ot_hours?.toFixed(1) ?? 0}s OT)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Mola Davranış Özeti ─── */}
                <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500">
                        <span className="font-medium">Mola Özeti:</span>{' '}
                        Ekip ortalaması <span className="font-bold">{Math.round(kpi?.avg_break_minutes || 0)} dk</span> mola yapıyor (izin: 30 dk).{' '}
                        {(kpi?.break_over_30_pct || 0) > 50 ? (
                            <span className="text-red-600 font-medium">Günlerin yarısından fazlasında mola aşımı var!</span>
                        ) : (kpi?.break_over_30_pct || 0) > 25 ? (
                            <span className="text-amber-600 font-medium">Bazı günlerde mola aşımı gözlemleniyor.</span>
                        ) : (
                            <span className="text-emerald-600 font-medium">Mola süreleri genel olarak izin dahilinde.</span>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
