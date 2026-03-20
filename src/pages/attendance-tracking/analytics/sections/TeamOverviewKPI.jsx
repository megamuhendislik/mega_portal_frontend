import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Users, Clock, Target, TrendingDown, TrendingUp, Activity,
    CheckCircle2, UtensilsCrossed, Coffee, Heart,
    ArrowUpRight, ArrowDownRight, Minus,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const PIE_COLORS = {
    excellent: '#10b981',
    good: '#3b82f6',
    average: '#f59e0b',
    low: '#ef4444',
};
const PIE_LABELS = {
    excellent: 'Mukemmel (>%95)',
    good: 'Iyi (%80-95)',
    average: 'Ortalama (%60-80)',
    low: 'Dusuk (<%60)',
};

const KPI_CONFIGS = [
    { key: 'total_worked_hours', label: 'Toplam Calisan', suffix: 's', icon: Clock, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600', deltaKey: 'worked' },
    { key: 'avg_efficiency_pct', label: 'Ort. Verimlilik', suffix: '%', icon: Target, gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600', deltaKey: null },
    { key: 'total_missing_hours', label: 'Toplam Eksik', suffix: 's', icon: TrendingDown, gradient: 'bg-gradient-to-br from-rose-500 to-rose-600', deltaKey: 'missing' },
    { key: 'total_overtime_hours', label: 'Toplam Ek Mesai', suffix: 's', icon: TrendingUp, gradient: 'bg-gradient-to-br from-violet-500 to-violet-600', deltaKey: 'ot' },
    { key: 'attendance_rate_pct', label: 'Devam Orani', suffix: '%', icon: CheckCircle2, gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600', deltaKey: null },
    { key: 'total_leave_days', label: 'Toplam Izin', suffix: 'gun', icon: Activity, gradient: 'bg-gradient-to-br from-teal-500 to-teal-600', deltaKey: null },
    { key: 'meal_rate_pct', label: 'Yemek Orani', suffix: '%', icon: UtensilsCrossed, gradient: 'bg-gradient-to-br from-orange-500 to-orange-600', deltaKey: null },
    { key: 'avg_break_minutes', label: 'Ort. Mola', suffix: 'dk', icon: Coffee, gradient: 'bg-gradient-to-br from-amber-500 to-amber-600', deltaKey: null },
    { key: 'health_score', label: 'Ekip Sagligi', suffix: '', icon: Heart, gradient: 'bg-gradient-to-br from-pink-500 to-pink-600', deltaKey: null },
];

/* ═══════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════ */
function KPICard({ label, value, suffix, icon: Icon, gradient, delta }) {
    const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
    const deltaColor = delta > 0 ? 'text-emerald-200' : delta < 0 ? 'text-red-200' : 'text-white/50';
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-xl font-black leading-tight">
                {value ?? '-'}{suffix && <span className="text-xs ml-1 font-bold opacity-80">{suffix}</span>}
            </h3>
            {delta != null && (
                <div className={`flex items-center gap-0.5 mt-1 ${deltaColor}`}>
                    <DeltaIcon size={12} />
                    <span className="text-[10px] font-bold">%{Math.abs(delta)}</span>
                </div>
            )}
            {Icon && <div className="absolute -right-3 -bottom-3 opacity-10 group-hover:opacity-15 transition-opacity"><Icon size={48} /></div>}
        </div>
    );
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
   PIE LABEL
   ═══════════════════════════════════════════════════ */
const renderPieLabel = ({ name, value, percent }) => {
    if (percent < 0.05) return null;
    return `${name}: ${value} (%${Math.round(percent * 100)})`;
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TeamOverviewKPI() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/team-overview/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('TeamOverviewKPI fetch error:', err);
            setError('Ekip genel bakis verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Pie chart data
    const pieData = useMemo(() => {
        if (!data?.efficiency_distribution) return [];
        return Object.entries(data.efficiency_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: PIE_LABELS[key] || key,
                value,
                color: PIE_COLORS[key] || '#94a3b8',
            }));
    }, [data?.efficiency_distribution]);

    // Bar chart data (monthly trend)
    const trendData = useMemo(() => {
        if (!data?.monthly_trend) return [];
        return data.monthly_trend.map(m => ({
            name: m.label,
            Calisan: m.worked_hours,
            Hedef: m.target_hours,
            'Ek Mesai': m.ot_hours,
        }));
    }, [data?.monthly_trend]);

    const kpi = data?.kpi;

    return (
        <CollapsibleSection
            title="Ekip Genel Bakis"
            subtitle={data?.employee_count ? `${data.employee_count} calisan` : undefined}
            icon={Users}
            iconGradient="from-indigo-500 to-violet-600"
            badge={data?.employee_count}
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-indigo-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Ekip verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* ─── 9 KPI Cards (3x3 grid) ────────── */}
                    {kpi && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {KPI_CONFIGS.map(cfg => (
                                <KPICard
                                    key={cfg.key}
                                    label={cfg.label}
                                    value={kpi[cfg.key]}
                                    suffix={cfg.suffix}
                                    icon={cfg.icon}
                                    gradient={cfg.gradient}
                                    delta={cfg.deltaKey ? kpi.vs_prev?.[cfg.deltaKey] : null}
                                />
                            ))}
                        </div>
                    )}

                    {/* ─── Charts Row ─────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Monthly Trend BarChart */}
                        {trendData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylik Trend</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={260} minWidth={350}>
                                        <BarChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
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
                                            <Bar dataKey="Hedef" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={24} />
                                            <Bar dataKey="Calisan" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                                            <Bar dataKey="Ek Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Efficiency Distribution PieChart */}
                        {pieData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verimlilik Dagilimi</h4>
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            innerRadius={50}
                                            paddingAngle={3}
                                            label={renderPieLabel}
                                            labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
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
                                                        <p className="text-slate-500">{d.value} calisan</p>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Legend below */}
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                    {pieData.map((entry) => (
                                        <div key={entry.name} className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[10px] text-slate-500 font-semibold">{entry.name}: {entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── Health Score Bar ────────────────── */}
                    {kpi?.health_score != null && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Heart size={14} className="text-pink-500" />
                                    <span className="text-xs font-bold text-slate-600">Ekip Saglik Skoru</span>
                                </div>
                                <span className={`text-sm font-black ${
                                    kpi.health_score >= 80 ? 'text-emerald-600'
                                    : kpi.health_score >= 60 ? 'text-amber-600'
                                    : 'text-red-600'
                                }`}>
                                    {kpi.health_score}/100
                                </span>
                            </div>
                            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        kpi.health_score >= 80 ? 'bg-emerald-500'
                                        : kpi.health_score >= 60 ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, kpi.health_score)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">
                                Verimlilik (%30) + Devam (%30) + Dakiklik (%20) + Eksik Azaltma (%20)
                            </p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
