import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3, Clock, CheckCircle, AlertTriangle,
    TrendingUp, TrendingDown, Timer, AlarmClock, HeartPulse,
    UtensilsCrossed, Coffee, Target, Scale, UserCheck
} from 'lucide-react';
import { Tooltip } from 'antd';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';
import { fmtH } from '../../../../utils/dateUtils';
import InfoTooltip from '../shared/InfoTooltip';

/* ===================================================================
   INFO TOOLTIP TEXTS FOR KPI CARDS
   =================================================================== */
const KPI_TOOLTIPS = {
    efficiency: 'Çalışılan saat / hedef saat \u00d7 100. Ekip genelinin ortalama verimliliğini gösterir.',
    overtime: 'Seçilen dönemdeki toplam onaylı ve bekleyen ek mesai saatleri.',
    attendance: 'Çalışılan gün / toplam iş günü \u00d7 100. Devamsızlık ve izinler düşürür.',
    missing: 'Hedef saate ulaşılamayan toplam eksik çalışma saatleri.',
    weekly_ot_limit: 'Ekip ortalaması haftalık 30 saatlik ek mesai limitinin ne kadarını kullanıyor.',
    punctuality: 'Vardiya başlangıcına \u00b115 dakika içinde giriş yapanların oranı.',
    health_score: 'Bileşik skor: %30 Verimlilik + %30 Devam + %20 Dakiklik + %20 Eksik Azaltma.',
    meal_rate: 'İş günlerinde yemek siparişi veren çalışanların oranı.',
    break_allowance: 'Günlük mola izni dahilinde kullanılan ortalama mola süresi. Bu süre çalışma saatinden düşülür.',
    break_overflow: 'Günlük 30 dakikalık mola iznini aşan fazla mola süresi. Bu süre çalışma saatinden düşülmez ama iş verimliliğini etkiler.',
    target_hit: 'Günlük hedef saatini tutturan çalışan sayısı / toplam çalışan.',
    late_arrival: 'Vardiya başlangıcı + tolerans süresinden sonra giriş yapanların oranı. Tolerans çalışanın takvimine göre belirlenir.',
    net_status: 'Toplam çalışılan - toplam hedef saat. Pozitif = fazla çalışma, negatif = eksik.',
    active_ratio: 'Seçilen dönemde en az 1 gün devam kaydı olan çalışan sayısı.',
};

/* ===================================================================
   MINI SPARKLINE (lightweight SVG — no Recharts dependency)
   =================================================================== */
function MiniSparkline({ data, color = '#6366f1', height = 20, width = 60 }) {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
    });
    return (
        <svg width={width} height={height} className="mt-1">
            <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/* ===================================================================
   SPARKLINE COLOR MAP (gradient -> sparkline stroke)
   =================================================================== */
const SPARKLINE_COLORS = {
    'from-blue-500 to-indigo-600': '#6366f1',
    'from-violet-500 to-purple-600': '#8b5cf6',
    'from-emerald-500 to-green-600': '#10b981',
    'from-rose-500 to-red-600': '#ef4444',
    'from-cyan-500 to-teal-600': '#0d9488',
    'from-sky-500 to-blue-600': '#0ea5e9',
    'from-pink-500 to-rose-600': '#ec4899',
    'from-amber-500 to-orange-600': '#f59e0b',
    'from-lime-500 to-green-600': '#84cc16',
    'from-red-500 to-rose-600': '#ef4444',
};

/* ===================================================================
   CARD CONFIGS (14 cards — break split into allowance + overflow)
   =================================================================== */
const CARD_CONFIGS = [
    {
        key: 'efficiency',
        label: 'Verimlilik',
        icon: BarChart3,
        gradient: 'from-blue-500 to-indigo-600',
        getValue: (kpi) => kpi?.avg_efficiency_pct,
        formatValue: (v) => `%${v ?? '-'}`,
        deltaKey: 'worked',
        inverted: false,
        getProgress: (kpi) => kpi?.avg_efficiency_pct ?? 0,
        getTooltip: (kpi) => {
            const eff = kpi?.avg_efficiency_pct ?? 0;
            const worked = kpi?.total_worked_hours ?? 0;
            return `${eff}% = ${worked}s çalışan / hedef`;
        },
        trendKey: 'efficiency',
    },
    {
        key: 'overtime',
        label: 'Ek Mesai',
        icon: Clock,
        gradient: 'from-violet-500 to-purple-600',
        getValue: (kpi) => kpi?.total_overtime_hours,
        formatValue: (v) => `${v ?? '-'}s`,
        deltaKey: 'ot',
        inverted: false,
        getProgress: (kpi, empCount) => {
            if (!kpi?.total_overtime_hours || !empCount) return 0;
            const perPerson = kpi.total_overtime_hours / empCount;
            return Math.min(100, (perPerson / 30) * 100);
        },
        getTooltip: (kpi, empCount) => {
            const total = kpi?.total_overtime_hours ?? 0;
            const avg = empCount ? (total / empCount).toFixed(1) : 0;
            return `Kişi başı ort: ${avg}s`;
        },
        trendKey: 'overtime',
    },
    {
        key: 'attendance',
        label: 'Devam Oranı',
        icon: CheckCircle,
        gradient: 'from-emerald-500 to-green-600',
        getValue: (kpi) => kpi?.attendance_rate_pct,
        formatValue: (v) => `%${v ?? '-'}`,
        deltaKey: null,
        inverted: false,
        getProgress: (kpi) => kpi?.attendance_rate_pct ?? 0,
        getTooltip: (kpi) => {
            const rate = kpi?.attendance_rate_pct ?? 0;
            return `Devam oranı: %${rate}`;
        },
        trendKey: 'attendance',
    },
    {
        key: 'missing',
        label: 'Eksik Saat',
        icon: AlertTriangle,
        gradient: 'from-rose-500 to-red-600',
        getValue: (kpi) => kpi?.total_missing_hours,
        formatValue: (v) => `${v ?? '-'}s`,
        deltaKey: 'missing',
        inverted: true,
        getProgress: (kpi) => {
            // Inverse: less missing = better
            const missing = kpi?.total_missing_hours ?? 0;
            const worked = kpi?.total_worked_hours ?? 1;
            const ratio = Math.min(1, missing / (worked || 1));
            return Math.max(0, (1 - ratio) * 100);
        },
        getTooltip: (kpi, empCount) => {
            const total = kpi?.total_missing_hours ?? 0;
            const avg = empCount ? (total / empCount).toFixed(1) : 0;
            return `Kişi başı ort: ${avg}s`;
        },
        trendKey: 'missing',
    },
    {
        key: 'weekly_ot_limit',
        label: 'Haftalık OT Limit',
        icon: Timer,
        gradient: 'from-cyan-500 to-teal-600',
        getValue: (kpi, empCount) => {
            const totalOT = kpi?.total_overtime_hours ?? 0;
            if (!empCount) return 0;
            return Math.round(totalOT / empCount / 30 * 100);
        },
        formatValue: (v) => `%${v ?? '-'}`,
        deltaKey: null,
        inverted: false,
        getProgress: (kpi, empCount) => {
            const totalOT = kpi?.total_overtime_hours ?? 0;
            if (!empCount) return 0;
            return Math.min(100, Math.round(totalOT / empCount / 30 * 100));
        },
        getTooltip: () => 'Ekip ort. haftalık limit kullanımı',
        progressColor: (kpi, empCount) => {
            const totalOT = kpi?.total_overtime_hours ?? 0;
            if (!empCount) return null;
            const pct = totalOT / empCount / 30 * 100;
            if (pct > 80) return '#ef4444';
            if (pct >= 50) return '#f59e0b';
            return '#10b981';
        },
        trendKey: 'ot_limit',
    },
    {
        key: 'punctuality',
        label: 'Dakiklik',
        icon: AlarmClock,
        gradient: 'from-sky-500 to-blue-600',
        getValue: (kpi, empCount, extra) => extra?.avgOnTimePct ?? null,
        formatValue: (v) => v != null ? `%${v}` : '\u2014',
        deltaKey: null,
        inverted: false,
        getProgress: (kpi, empCount, extra) => extra?.avgOnTimePct ?? 0,
        getTooltip: () => 'Zamanında giriş oranı',
        trendKey: 'punctuality',
    },
    {
        key: 'health_score',
        label: 'Ekip Sağlığı',
        icon: HeartPulse,
        gradient: 'from-pink-500 to-rose-600',
        getValue: (kpi) => kpi?.health_score ?? null,
        formatValue: (v) => v != null ? `%${v}` : '\u2014',
        deltaKey: null,
        inverted: false,
        getProgress: (kpi) => kpi?.health_score ?? 0,
        getTooltip: () => 'Ekip Sağlığı = %30 Verimlilik + %30 Devam + %20 Dakiklik + %20 Eksik Azaltma',
        trendKey: 'health',
    },
    {
        key: 'meal_rate',
        label: 'Yemek Oranı',
        icon: UtensilsCrossed,
        gradient: 'from-cyan-500 to-teal-600',
        getValue: (kpi) => kpi?.meal_rate_pct ?? null,
        formatValue: (v) => v != null ? `%${v}` : '\u2014',
        deltaKey: null,
        inverted: false,
        getProgress: (kpi) => kpi?.meal_rate_pct ?? 0,
        getTooltip: () => 'İş günlerinde yemek siparişi veren çalışanların oranı.',
        trendKey: 'meal_rate',
    },
    {
        key: 'break_allowance',
        label: 'Mola Hakkı',
        icon: Coffee,
        gradient: 'from-emerald-500 to-green-600',
        getValue: (kpi, empCount, extra) => extra?.breakAllowanceMinutes ?? null,
        formatValue: (v) => v != null ? `${v} dk` : '\u2014',
        subtitle: '/ 30 dk izin',
        deltaKey: null,
        inverted: false,
        getProgress: (kpi, empCount, extra) => Math.min(100, ((extra?.breakAllowanceMinutes ?? 0) / 30) * 100),
        getTooltip: () => 'Günlük mola izni dahilinde kullanılan ortalama mola süresi. Bu süre çalışma saatinden düşülür.',
        progressColor: (kpi, empCount, extra) => {
            const mins = extra?.breakAllowanceMinutes ?? 0;
            if (mins > 30) return '#f59e0b';
            return '#10b981';
        },
        trendKey: 'break_allowance',
    },
    {
        key: 'break_overflow',
        label: 'Mola Hak Aşımı',
        icon: AlertTriangle,
        gradient: 'from-red-500 to-rose-600',
        getValue: (kpi, empCount, extra) => extra?.breakOverflowMinutes ?? null,
        formatValue: (v) => v != null ? `${v} dk` : '\u2014',
        subtitle: 'izin dışı fazla mola',
        deltaKey: null,
        inverted: true,
        getProgress: (kpi, empCount, extra) => Math.min(100, ((extra?.breakOverflowMinutes ?? 0) / 30) * 100),
        getTooltip: () => 'Günlük 30 dakikalık mola iznini aşan fazla mola süresi. Bu süre çalışma saatinden düşülmez ama iş verimliliğini etkiler.',
        dynamicGradient: (kpi, empCount, extra) => {
            const mins = extra?.breakOverflowMinutes ?? 0;
            return mins > 0 ? 'from-red-500 to-rose-600' : 'from-emerald-500 to-green-600';
        },
        progressColor: (kpi, empCount, extra) => {
            const mins = extra?.breakOverflowMinutes ?? 0;
            if (mins > 15) return '#ef4444';
            if (mins > 0) return '#f59e0b';
            return '#10b981';
        },
        trendKey: 'break_overflow',
    },
    {
        key: 'target_hit',
        label: 'Hedef Tutturma',
        icon: Target,
        gradient: 'from-lime-500 to-green-600',
        getValue: (kpi, empCount, extra) => extra?.targetHitData ?? null,
        formatValue: (v) => v ? `${v.hit}/${v.total}` : '\u2014',
        deltaKey: null,
        inverted: false,
        getProgress: (kpi, empCount, extra) => {
            const d = extra?.targetHitData;
            if (!d || !d.total) return 0;
            return Math.round((d.hit / d.total) * 100);
        },
        getTooltip: (kpi, empCount, extra) => {
            const d = extra?.targetHitData;
            if (!d || !d.total) return 'Hedef tutturma verisi yok';
            return `${d.hit}/${d.total} çalışan hedefi tutturdu (%${Math.round((d.hit / d.total) * 100)})`;
        },
        trendKey: 'target_hit',
    },
    {
        key: 'late_arrival',
        label: 'Geç Kalma',
        icon: AlarmClock,
        gradient: 'from-red-500 to-rose-600',
        getValue: (kpi, empCount, extra) => extra?.avgLatePct ?? null,
        formatValue: (v) => v != null ? `%${v}` : '\u2014',
        deltaKey: null,
        inverted: true,
        getProgress: (kpi, empCount, extra) => Math.max(0, 100 - (extra?.avgLatePct ?? 0)),
        getTooltip: (kpi, empCount, extra) => {
            const pct = extra?.avgLatePct ?? 0;
            const tolInfo = extra?.toleranceInfo;
            const tolNote = tolInfo?.note || '';
            return `Geç kalma oranı: %${pct} \u2014 düşük olması iyidir. ${tolNote}`;
        },
        progressColor: (kpi, empCount, extra) => {
            const pct = extra?.avgLatePct ?? 0;
            if (pct > 30) return '#ef4444';
            if (pct >= 15) return '#f59e0b';
            return '#10b981';
        },
        trendKey: 'late_arrival',
    },
    {
        key: 'net_status',
        label: 'Net Durum',
        icon: Scale,
        gradient: 'from-emerald-500 to-green-600',
        getValue: (kpi, empCount, extra) => extra?.netHours ?? null,
        formatValue: (v) => {
            if (v == null) return '\u2014';
            const sign = v >= 0 ? '+' : '';
            return `${sign}${v.toFixed(1)}s`;
        },
        deltaKey: null,
        inverted: false,
        getProgress: (kpi) => {
            const ot = kpi?.total_overtime_hours ?? 0;
            const missing = kpi?.total_missing_hours ?? 0;
            const total = ot + missing || 1;
            return Math.round((ot / total) * 100);
        },
        getTooltip: (kpi, empCount, extra) => {
            const v = extra?.netHours;
            if (v == null) return 'Net durum verisi yok';
            return v >= 0
                ? `Ekip ${fmtH(v)} fazla çalıştı`
                : `Ekip ${fmtH(Math.abs(v))} eksik çalıştı`;
        },
        dynamicGradient: (kpi, empCount, extra) => {
            const v = extra?.netHours ?? 0;
            return v >= 0 ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600';
        },
        trendKey: 'net_status',
    },
    {
        key: 'active_ratio',
        label: 'Aktif/Toplam',
        icon: UserCheck,
        gradient: 'from-sky-500 to-blue-600',
        getValue: (kpi, empCount, extra) => extra?.activeRatio ?? null,
        formatValue: (v) => v ? `${v.active}/${v.total}` : '\u2014',
        deltaKey: null,
        inverted: false,
        getProgress: (kpi, empCount, extra) => {
            const d = extra?.activeRatio;
            if (!d || !d.total) return 0;
            return Math.round((d.active / d.total) * 100);
        },
        getTooltip: (kpi, empCount, extra) => {
            const d = extra?.activeRatio;
            if (!d || !d.total) return 'Aktif oran verisi yok';
            return `${d.active}/${d.total} çalışan dönemde aktif (%${Math.round((d.active / d.total) * 100)})`;
        },
        trendKey: 'active_ratio',
    },
];

/* ===================================================================
   GRADIENT MAP (for progress bar inline style)
   =================================================================== */
const PROGRESS_GRADIENTS = {
    'from-blue-500 to-indigo-600': 'linear-gradient(to right, #3b82f6, #4f46e5)',
    'from-violet-500 to-purple-600': 'linear-gradient(to right, #8b5cf6, #9333ea)',
    'from-emerald-500 to-green-600': 'linear-gradient(to right, #10b981, #16a34a)',
    'from-rose-500 to-red-600': 'linear-gradient(to right, #f43f5e, #dc2626)',
    'from-cyan-500 to-teal-600': 'linear-gradient(to right, #06b6d4, #0d9488)',
    'from-sky-500 to-blue-600': 'linear-gradient(to right, #0ea5e9, #2563eb)',
    'from-pink-500 to-rose-600': 'linear-gradient(to right, #ec4899, #e11d48)',
    'from-amber-500 to-orange-600': 'linear-gradient(to right, #f59e0b, #ea580c)',
    'from-lime-500 to-green-600': 'linear-gradient(to right, #84cc16, #16a34a)',
    'from-red-500 to-rose-600': 'linear-gradient(to right, #ef4444, #e11d48)',
};

/* ===================================================================
   DELTA BADGE
   =================================================================== */
function DeltaBadge({ delta, inverted }) {
    if (delta == null) return null;

    const isPositive = delta > 0;
    const isNegative = delta < 0;

    // For inverted metrics (like missing hours), decrease is good
    let color, Icon;
    if (inverted) {
        color = isNegative ? 'text-emerald-600' : isPositive ? 'text-red-500' : 'text-slate-400';
        Icon = isNegative ? TrendingDown : isPositive ? TrendingUp : null;
    } else {
        color = isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-slate-400';
        Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : null;
    }

    return (
        <div className={`flex items-center gap-0.5 ${color}`}>
            {Icon && <Icon size={12} strokeWidth={2.5} />}
            <span className="text-[10px] font-bold">%{Math.abs(delta).toFixed(1)}</span>
        </div>
    );
}

/* ===================================================================
   KPI CARD
   =================================================================== */
function KPICard({ config, kpi, employeeCount, extra, sparklineData }) {
    const { label, icon: Icon, gradient, getValue, formatValue, deltaKey, inverted, getProgress, getTooltip, progressColor, dynamicGradient, subtitle } = config;

    const value = getValue(kpi, employeeCount, extra);
    const delta = deltaKey ? kpi?.vs_prev?.[deltaKey] : null;
    const progress = getProgress(kpi, employeeCount, extra);
    const tooltipText = getTooltip(kpi, employeeCount, extra);
    const resolvedGradient = dynamicGradient ? dynamicGradient(kpi, employeeCount, extra) : gradient;
    const customColor = progressColor?.(kpi, employeeCount, extra);
    const progressGradient = customColor || PROGRESS_GRADIENTS[resolvedGradient] || PROGRESS_GRADIENTS[gradient];
    const sparkColor = SPARKLINE_COLORS[resolvedGradient] || SPARKLINE_COLORS[gradient] || '#6366f1';

    return (
        <Tooltip title={tooltipText} placement="top">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-md transition-all cursor-default">
                {/* Header: Label + Icon */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        {label}
                        {KPI_TOOLTIPS[config.key] && <InfoTooltip text={KPI_TOOLTIPS[config.key]} />}
                    </span>
                    <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${resolvedGradient} flex items-center justify-center flex-shrink-0`}
                    >
                        <Icon size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Value + optional subtitle */}
                <div className="text-2xl font-bold text-slate-800 leading-tight mb-1">
                    {formatValue(value)}
                </div>
                {subtitle && (
                    <div className="text-[10px] text-slate-400 mb-1">{subtitle}</div>
                )}

                {/* Delta + Progress */}
                <div className="flex items-center justify-between gap-2">
                    <DeltaBadge delta={delta} inverted={inverted} />
                    <div className="flex-1 max-w-[80px]">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${Math.min(100, Math.max(0, progress))}%`,
                                    background: progressGradient,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Mini Sparkline */}
                {sparklineData && sparklineData.length >= 2 && (
                    <div className="flex justify-end">
                        <MiniSparkline data={sparklineData} color={sparkColor} />
                    </div>
                )}
            </div>
        </Tooltip>
    );
}

/* ===================================================================
   SKELETON LOADER
   =================================================================== */
function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 animate-pulse">
            <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="w-8 h-8 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-7 w-20 bg-slate-200 rounded mb-2" />
            <div className="flex items-center justify-between gap-2">
                <div className="h-3 w-12 bg-slate-200 rounded" />
                <div className="h-1.5 w-20 bg-slate-100 rounded-full" />
            </div>
        </div>
    );
}

/* ===================================================================
   MAIN COMPONENT
   =================================================================== */
export default function KPISummary({ bulkTeamOverview, bulkEntryExit, bulkWorkHours, bulkBreakMeal, bulkLoading }) {
    const { queryParams } = useAnalyticsFilter();
    const [fetchedData, setFetchedData] = useState(null);
    const [fetchedEntryExitData, setFetchedEntryExitData] = useState(null);
    const [fetchedWorkHoursData, setFetchedWorkHoursData] = useState(null);
    const [fetchedBreakMealData, setFetchedBreakMealData] = useState(null);
    const [fetchedLoading, setFetchedLoading] = useState(true);

    const hasBulk = bulkTeamOverview != null || bulkEntryExit != null || bulkWorkHours != null || bulkBreakMeal != null;

    const fetchData = useCallback(async () => {
        if (hasBulk) { setFetchedLoading(false); return; }
        setFetchedLoading(true);
        try {
            const [teamRes, eeRes, whRes, bmRes] = await Promise.allSettled([
                api.get('/attendance-analytics/team-overview/', { params: queryParams }),
                api.get('/attendance-analytics/entry-exit/', { params: queryParams }),
                api.get('/attendance-analytics/work-hours/', { params: queryParams }),
                api.get('/attendance-analytics/break-meal/', { params: queryParams }),
            ]);
            if (teamRes.status === 'fulfilled') setFetchedData(teamRes.value.data);
            if (eeRes.status === 'fulfilled') setFetchedEntryExitData(eeRes.value.data);
            if (whRes.status === 'fulfilled') setFetchedWorkHoursData(whRes.value.data);
            if (bmRes.status === 'fulfilled') setFetchedBreakMealData(bmRes.value.data);
        } catch (err) {
            console.error('KPISummary fetch error:', err);
        } finally {
            setFetchedLoading(false);
        }
    }, [queryParams, hasBulk]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Resolve: prefer bulk data, fallback to individually fetched data
    const data = hasBulk ? (bulkTeamOverview && !bulkTeamOverview.error ? bulkTeamOverview : fetchedData) : fetchedData;
    const entryExitData = hasBulk ? (bulkEntryExit && !bulkEntryExit.error ? bulkEntryExit : fetchedEntryExitData) : fetchedEntryExitData;
    const workHoursData = hasBulk ? (bulkWorkHours && !bulkWorkHours.error ? bulkWorkHours : fetchedWorkHoursData) : fetchedWorkHoursData;
    const breakMealData = hasBulk ? (bulkBreakMeal && !bulkBreakMeal.error ? bulkBreakMeal : fetchedBreakMealData) : fetchedBreakMealData;
    const loading = hasBulk ? (bulkLoading ?? false) : fetchedLoading;

    const kpi = data?.kpi;
    const employeeCount = data?.employee_count || 0;
    const monthlyTrend = data?.monthly_trend;

    // Compute average on_time_pct from entry-exit performance_ranking
    const avgOnTimePct = useMemo(() => {
        const ranking = entryExitData?.performance_ranking;
        if (!ranking?.length) return null;
        const total = ranking.reduce((sum, e) => sum + (e.on_time_pct ?? 0), 0);
        return Math.round(total / ranking.length);
    }, [entryExitData?.performance_ranking]);

    // Card 10: Target hit count from work-hours efficiency_ranking
    const targetHitData = useMemo(() => {
        const ranking = workHoursData?.efficiency_ranking || [];
        if (!ranking.length) return { hit: 0, total: employeeCount || 0 };
        const hit = ranking.filter(e => (e.efficiency_pct || 0) >= 100).length;
        return { hit, total: ranking.length };
    }, [workHoursData, employeeCount]);

    // Card 11: Average late percentage
    const avgLatePct = useMemo(() => {
        const ranking = entryExitData?.performance_ranking;
        if (!ranking?.length) return 0;
        const sum = ranking.reduce((s, e) => s + (e.late_pct || 0), 0);
        return Math.round(sum / ranking.length);
    }, [entryExitData?.performance_ranking]);

    // Tolerance info from entry-exit response
    const toleranceInfo = useMemo(() => {
        return entryExitData?.tolerance_info || null;
    }, [entryExitData?.tolerance_info]);

    // Break data from break-meal endpoint
    const breakAllowanceMinutes = useMemo(() => {
        const bmKpi = breakMealData?.kpi;
        if (!bmKpi) return kpi?.avg_break_minutes ?? null;
        return bmKpi.avg_break_minutes ?? null;
    }, [breakMealData?.kpi, kpi?.avg_break_minutes]);

    const breakOverflowMinutes = useMemo(() => {
        const bmKpi = breakMealData?.kpi;
        if (!bmKpi) return 0;
        return bmKpi.avg_uncounted_break_minutes ?? 0;
    }, [breakMealData?.kpi]);

    // Card 12: Net status (OT - missing)
    const netHours = useMemo(() => {
        const kpiData = data?.kpi;
        if (!kpiData) return null;
        const ot = kpiData.total_overtime_hours ?? 0;
        const missing = kpiData.total_missing_hours ?? 0;
        return ot - missing;
    }, [data?.kpi]);

    // Card 13: Active/total ratio
    const activeRatio = useMemo(() => {
        const count = data?.employee_count ?? 0;
        const kpiData = data?.kpi;
        // active_employee_count from API if available, otherwise use employee_count
        const active = kpiData?.active_employee_count ?? count;
        return { active, total: count };
    }, [data]);

    const extra = useMemo(() => ({
        avgOnTimePct,
        targetHitData,
        avgLatePct,
        toleranceInfo,
        breakAllowanceMinutes,
        breakOverflowMinutes,
        netHours,
        activeRatio,
    }), [avgOnTimePct, targetHitData, avgLatePct, toleranceInfo, breakAllowanceMinutes, breakOverflowMinutes, netHours, activeRatio]);

    // Extract sparkline data per KPI key from monthly_trend
    const sparklineMap = useMemo(() => {
        if (!monthlyTrend?.length) return {};
        const map = {};
        // efficiency: avg_efficiency_pct per month
        map.efficiency = monthlyTrend.map(m => m.avg_efficiency_pct ?? m.efficiency ?? 0);
        // overtime: total_hours per month
        map.overtime = monthlyTrend.map(m => m.total_hours ?? m.total_overtime_hours ?? 0);
        // attendance: attendance_rate per month
        map.attendance = monthlyTrend.map(m => m.attendance_rate ?? m.attendance_rate_pct ?? 0);
        // missing: missing_hours per month
        map.missing = monthlyTrend.map(m => m.missing_hours ?? m.total_missing_hours ?? 0);
        // ot_limit: weekly OT usage % per month (approx from total hours)
        map.ot_limit = monthlyTrend.map(m => {
            const total = m.total_hours ?? m.total_overtime_hours ?? 0;
            const ec = employeeCount || 1;
            return Math.round(total / ec / 30 * 100);
        });
        // punctuality: on_time_pct per month
        map.punctuality = monthlyTrend.map(m => m.on_time_pct ?? m.punctuality ?? 0);
        // health: health_score per month
        map.health = monthlyTrend.map(m => m.health_score ?? 0);
        // meal_rate: meal_rate_pct per month
        map.meal_rate = monthlyTrend.map(m => m.meal_rate_pct ?? 0);
        // break_allowance: avg_break_minutes per month
        map.break_allowance = monthlyTrend.map(m => m.avg_break_minutes ?? 0);
        // break_overflow: avg_uncounted_break_minutes per month
        map.break_overflow = monthlyTrend.map(m => m.avg_uncounted_break_minutes ?? 0);
        // target_hit: target hit count per month (approx from efficiency)
        map.target_hit = monthlyTrend.map(m => m.target_hit_count ?? m.avg_efficiency_pct ?? 0);
        // late_arrival: late percentage per month
        map.late_arrival = monthlyTrend.map(m => m.late_pct ?? m.avg_late_pct ?? 0);
        // net_status: net hours per month (OT - missing)
        map.net_status = monthlyTrend.map(m => {
            const ot = m.total_hours ?? m.total_overtime_hours ?? 0;
            const missing = m.missing_hours ?? m.total_missing_hours ?? 0;
            return ot - missing;
        });
        // active_ratio: active employee count per month
        map.active_ratio = monthlyTrend.map(m => m.active_employee_count ?? m.employee_count ?? 0);
        return map;
    }, [monthlyTrend, employeeCount]);

    /* Loading skeleton */
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {Array.from({ length: 14 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
        );
    }

    /* No data */
    if (!kpi) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {CARD_CONFIGS.map(config => (
                <KPICard
                    key={config.key}
                    config={config}
                    kpi={kpi}
                    employeeCount={employeeCount}
                    extra={extra}
                    sparklineData={sparklineMap[config.trendKey]}
                />
            ))}
        </div>
    );
}
