import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, Clock, CheckCircle, AlertTriangle,
    TrendingUp, TrendingDown
} from 'lucide-react';
import { Tooltip } from 'antd';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ===================================================================
   CARD CONFIGS
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
function KPICard({ config, kpi, employeeCount }) {
    const { label, icon: Icon, gradient, getValue, formatValue, deltaKey, inverted, getProgress, getTooltip } = config;

    const value = getValue(kpi);
    const delta = deltaKey ? kpi?.vs_prev?.[deltaKey] : null;
    const progress = getProgress(kpi, employeeCount);
    const tooltipText = getTooltip(kpi, employeeCount);
    const progressGradient = PROGRESS_GRADIENTS[gradient];

    return (
        <Tooltip title={tooltipText} placement="top">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-md transition-all cursor-default">
                {/* Header: Label + Icon */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500">{label}</span>
                    <div
                        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
                    >
                        <Icon size={16} className="text-white" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Value */}
                <div className="text-2xl font-bold text-slate-800 leading-tight mb-2">
                    {formatValue(value)}
                </div>

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
export default function KPISummary() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/attendance-analytics/team-overview/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('KPISummary fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const kpi = data?.kpi;
    const employeeCount = data?.employee_count || 0;

    /* Loading skeleton */
    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
        );
    }

    /* No data */
    if (!kpi) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARD_CONFIGS.map(config => (
                <KPICard
                    key={config.key}
                    config={config}
                    kpi={kpi}
                    employeeCount={employeeCount}
                />
            ))}
        </div>
    );
}
