import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Target, BarChart3, AlertCircle, RefreshCw, AlarmClock, Award, AlertTriangle } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const PUNCTUALITY_COLORS = {
    onTime: '#10b981',  // emerald-500
    early: '#3b82f6',   // blue-500
    late: '#ef4444',    // red-500
    entry: '#6366f1',   // indigo-500
    exit: '#f59e0b',    // amber-500
};

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
   CHART 1 TOOLTIP: GIRIS/CIKIS DAGILIMI
   ═══════════════════════════════════════════════════ */
function HistogramTooltip({ active, payload, label, entryMedian, exitMedian }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value} kişi</span>
                </div>
            ))}
            {(entryMedian || exitMedian) && (
                <div className="border-t border-slate-100 mt-1.5 pt-1.5 space-y-0.5">
                    {entryMedian && (
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Medyan Giriş:</span>
                            <span className="font-bold text-indigo-600">{entryMedian}</span>
                        </div>
                    )}
                    {exitMedian && (
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Medyan Çıkış:</span>
                            <span className="font-bold text-amber-600">{exitMedian}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CHART 2 TOOLTIP: DAKIKLIK PERFORMANSI
   ═══════════════════════════════════════════════════ */
function PunctualityBarTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const raw = payload[0]?.payload;
    if (!raw) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs max-w-[250px]">
            <p className="font-bold text-slate-700 mb-0.5">{raw.fullName}</p>
            <p className="text-[10px] text-slate-400 mb-2">{raw.department}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">%{entry.value}</span>
                </div>
            ))}
            <div className="border-t border-slate-200 mt-1.5 pt-1.5 space-y-0.5">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ort. Sapma:</span>
                    <span className={`font-bold ${raw.avg_deviation_min <= 5 ? 'text-emerald-600' : raw.avg_deviation_min <= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                        {raw.avg_deviation_min} dk
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dakiklik Skoru:</span>
                    <span className={`font-bold ${raw.punctuality_score >= 80 ? 'text-emerald-600' : raw.punctuality_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {raw.punctuality_score}/100
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Ort. Mola:</span>
                    <span className="font-bold text-slate-700">{raw.avg_break_minutes} dk</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Seviye:</span>
                    <span className={`font-bold ${
                        raw.level === 'excellent' ? 'text-emerald-600'
                        : raw.level === 'good' ? 'text-blue-600'
                        : raw.level === 'average' ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                        {raw.level === 'excellent' ? 'Mükemmel'
                            : raw.level === 'good' ? 'İyi'
                            : raw.level === 'average' ? 'Ortalama'
                            : 'Düşük'}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PunctualitySection({ onPersonClick }) {
    const { queryParams, selectedEmployees } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/entry-exit/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('PunctualitySection fetch error:', err);
            setError('Dakiklik verileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Chart 1: Histogram data (merged entry + exit buckets) ───
    const histogramData = useMemo(() => {
        const entryHist = data?.entry_histogram || [];
        const exitHist = data?.exit_histogram || [];
        const bucketMap = {};

        entryHist.forEach(h => {
            if (!bucketMap[h.bucket]) bucketMap[h.bucket] = { bucket: h.bucket, entry: 0, exit: 0 };
            bucketMap[h.bucket].entry = h.count ?? 0;
        });
        exitHist.forEach(h => {
            if (!bucketMap[h.bucket]) bucketMap[h.bucket] = { bucket: h.bucket, entry: 0, exit: 0 };
            bucketMap[h.bucket].exit = h.count ?? 0;
        });

        return Object.values(bucketMap).sort((a, b) => a.bucket.localeCompare(b.bucket));
    }, [data?.entry_histogram, data?.exit_histogram]);

    // ─── Chart 2: Punctuality performance bar data ───
    const punctualityBarData = useMemo(() => {
        if (!data?.performance_ranking?.length) return [];
        let ranking = [...data.performance_ranking];

        // Filter to selected employees if any
        if (selectedEmployees?.length) {
            ranking = ranking.filter(e => selectedEmployees.includes(e.employee_id));
        }

        // Sort by punctuality_score descending, take top 15
        ranking.sort((a, b) => (b.punctuality_score ?? 0) - (a.punctuality_score ?? 0));
        return ranking.slice(0, 15).map(e => ({
            shortName: (e.name || '').length > 12 ? (e.name || '').substring(0, 12) + '...' : (e.name || ''),
            fullName: e.name || '',
            department: e.department || '',
            on_time_pct: e.on_time_pct ?? 0,
            early_pct: e.early_pct ?? 0,
            late_pct: e.late_pct ?? 0,
            avg_deviation_min: e.avg_deviation_min ?? 0,
            punctuality_score: e.punctuality_score ?? 0,
            avg_break_minutes: e.avg_break_minutes ?? 0,
            total_score: e.total_score ?? 0,
            level: e.level || 'average',
            employee_id: e.employee_id,
        }));
    }, [data?.performance_ranking, selectedEmployees]);

    // ─── Chart 3: Stats & summary ───
    const entryStats = data?.entry_stats || {};
    const exitStats = data?.exit_stats || {};

    const avgOnTimePct = useMemo(() => {
        if (!data?.performance_ranking?.length) return 0;
        const total = data.performance_ranking.reduce((sum, e) => sum + (e.on_time_pct ?? 0), 0);
        return Math.round(total / data.performance_ranking.length);
    }, [data?.performance_ranking]);

    const totalRecords = entryStats.total_records || exitStats.total_records || 0;

    // ─── Best punctual & worst consistent employees ───
    const bestPunctualEmployee = useMemo(() => {
        const ranking = data?.performance_ranking || [];
        if (!ranking.length) return null;
        return ranking.reduce((max, e) => ((e.on_time_pct ?? 0) > (max?.on_time_pct ?? 0)) ? e : max, null);
    }, [data?.performance_ranking]);

    const worstConsistentEmployee = useMemo(() => {
        const ranking = data?.performance_ranking || [];
        if (!ranking.length) return null;
        return ranking.reduce((max, e) => ((e.consistency_std ?? 0) > (max?.consistency_std ?? 0)) ? e : max, null);
    }, [data?.performance_ranking]);

    /* ─── Loading skeleton ─── */
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard height={280} />
                    <SkeletonCard height={400} />
                </div>
                <SkeletonCard height={200} />
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
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
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
                    <Clock size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Bu dönem için dakiklik verisi bulunamadı.</p>
                </div>
            </div>
        );
    }

    const hasData = histogramData.length > 0 || punctualityBarData.length > 0;

    if (!hasData) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12">
                <div className="flex flex-col items-center justify-center text-slate-400">
                    <Clock size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Bu dönem için dakiklik verisi bulunamadı.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ═══ TOP ROW: 2 charts side-by-side ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ─── Chart 1: Giriş/Çıkış Dağılımı (Double Histogram Bar Chart) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0">
                            <Clock size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Giriş/Çıkış Dağılımı</h4>
                    </div>
                    {histogramData.length > 0 ? (
                        <div className="overflow-x-auto -mx-2">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={histogramData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="bucket"
                                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip
                                        content={
                                            <HistogramTooltip
                                                entryMedian={entryStats.median}
                                                exitMedian={exitStats.median}
                                            />
                                        }
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px' }}
                                        iconSize={10}
                                        formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                                    />
                                    <ReferenceLine
                                        x="09:00"
                                        stroke="#10b981"
                                        strokeDasharray="4 2"
                                        strokeWidth={1.5}
                                        label={{ value: 'Vardiya Başlangıcı', fontSize: 9, fill: '#10b981', position: 'top' }}
                                    />
                                    <ReferenceLine
                                        x="18:00"
                                        stroke="#ef4444"
                                        strokeDasharray="4 2"
                                        strokeWidth={1.5}
                                        label={{ value: 'Vardiya Sonu', fontSize: 9, fill: '#ef4444', position: 'top' }}
                                    />
                                    <Bar
                                        dataKey="entry"
                                        name="Giriş"
                                        fill={PUNCTUALITY_COLORS.entry}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={18}
                                    />
                                    <Bar
                                        dataKey="exit"
                                        name="Çıkış"
                                        fill={PUNCTUALITY_COLORS.exit}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={18}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-300">
                            <p className="text-xs">Giriş/çıkış dağılım verisi bulunamadı</p>
                        </div>
                    )}
                </div>

                {/* ─── Chart 2: Dakiklik Performansı (Stacked Horizontal Bar) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                            <Target size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Dakiklik Performansı</h4>
                    </div>
                    {punctualityBarData.length > 0 ? (
                        <>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart
                                        layout="vertical"
                                        data={punctualityBarData}
                                        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                                        onClick={(e) => {
                                            const empId = e?.activePayload?.[0]?.payload?.employee_id;
                                            if (empId) onPersonClick?.(empId);
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            domain={[0, 100]}
                                            tickFormatter={(v) => `%${v}`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="shortName"
                                            width={100}
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                        />
                                        <Tooltip content={<PunctualityBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                        <Legend
                                            wrapperStyle={{ fontSize: '11px' }}
                                            iconSize={10}
                                            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                                        />
                                        <Bar
                                            dataKey="on_time_pct"
                                            stackId="punct"
                                            fill={PUNCTUALITY_COLORS.onTime}
                                            name="Zamanında"
                                            maxBarSize={20}
                                            cursor="pointer"
                                        />
                                        <Bar
                                            dataKey="early_pct"
                                            stackId="punct"
                                            fill={PUNCTUALITY_COLORS.early}
                                            name="Erken"
                                            maxBarSize={20}
                                            cursor="pointer"
                                        />
                                        <Bar
                                            dataKey="late_pct"
                                            stackId="punct"
                                            fill={PUNCTUALITY_COLORS.late}
                                            name="Geç"
                                            radius={[0, 4, 4, 0]}
                                            maxBarSize={20}
                                            cursor="pointer"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Zamanında (±15 dk)</div>
                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Erken (15+ dk önce)</div>
                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Geç (15+ dk sonra)</div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[400px] text-slate-300">
                            <p className="text-xs">Çalışan dakiklik verisi bulunamadı</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ BOTTOM ROW: Stats & Summary ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                        <BarChart3 size={14} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Giriş/Çıkış İstatistikleri</h4>
                </div>

                {/* 4 mini KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {/* Ort. Giriş Sapması */}
                    <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <AlarmClock size={12} className="text-indigo-500" />
                            <span className="text-[10px] text-slate-500 font-medium">Ort. Giriş Sapması</span>
                        </div>
                        <p className="text-lg font-black text-slate-800">
                            {entryStats.std_dev_minutes != null
                                ? `${Number(entryStats.std_dev_minutes).toFixed(1)} dk`
                                : '—'}
                        </p>
                    </div>

                    {/* Medyan Giriş */}
                    <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Clock size={12} className="text-indigo-500" />
                            <span className="text-[10px] text-slate-500 font-medium">Medyan Giriş</span>
                        </div>
                        <p className="text-lg font-black text-slate-800">
                            {entryStats.median || '—'}
                        </p>
                    </div>

                    {/* Medyan Çıkış */}
                    <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Clock size={12} className="text-amber-500" />
                            <span className="text-[10px] text-slate-500 font-medium">Medyan Çıkış</span>
                        </div>
                        <p className="text-lg font-black text-slate-800">
                            {exitStats.median || '—'}
                        </p>
                    </div>

                    {/* Ort. Çıkış Sapması */}
                    <div className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <AlarmClock size={12} className="text-amber-500" />
                            <span className="text-[10px] text-slate-500 font-medium">Ort. Çıkış Sapması</span>
                        </div>
                        <p className="text-lg font-black text-slate-800">
                            {exitStats.std_dev_minutes != null
                                ? `${Number(exitStats.std_dev_minutes).toFixed(1)} dk`
                                : '—'}
                        </p>
                    </div>
                </div>

                {/* Dakiklik Özet — Additional insight cards */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* En Dakik Çalışan */}
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Award size={14} className="text-emerald-600" />
                            <span className="text-[10px] text-slate-500 font-medium">En Dakik</span>
                        </div>
                        <p className="text-sm font-bold text-emerald-700 truncate">{bestPunctualEmployee?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">%{bestPunctualEmployee?.on_time_pct?.toFixed(0) ?? '—'} zamanında</p>
                    </div>
                    {/* En Tutarsız Çalışan */}
                    <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                        <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-[10px] text-slate-500 font-medium">En Tutarsız</span>
                        </div>
                        <p className="text-sm font-bold text-red-700 truncate">{worstConsistentEmployee?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-400">{worstConsistentEmployee?.consistency_std?.toFixed(1) ?? '—'} sapma</p>
                    </div>
                </div>

                {/* Summary text */}
                {totalRecords > 0 && (
                    <div className="bg-slate-50 rounded-xl px-4 py-2.5">
                        <p className="text-xs text-slate-600">
                            Toplam <span className="font-bold text-slate-800">{totalRecords.toLocaleString('tr-TR')}</span> kayıt analiz edildi.
                            Zamanında giriş oranı: <span className={`font-bold ${avgOnTimePct >= 80 ? 'text-emerald-600' : avgOnTimePct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>%{avgOnTimePct}</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
