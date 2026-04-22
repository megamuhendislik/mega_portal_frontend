import React, { useMemo } from 'react';
import { Users, Target, Clock, AlertCircle, CalendarCheck, Coffee, Activity, TrendingUp, Award, BarChart3, Shield, ArrowRight, GitCompare } from 'lucide-react';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton } from '../shared/EmptyState';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend, LineChart, Line, ComposedChart, Area,
} from 'recharts';

const DIST_COLORS = { excellent: '#10b981', good: '#6366f1', average: '#f59e0b', low: '#ef4444' };
const DIST_LABELS = { excellent: 'Mükemmel ≥95%', good: 'İyi 80-95%', average: 'Orta 60-80%', low: 'Düşük <60%' };

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-bold text-slate-800 tabular-nums">{p.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function OverviewTab() {
    const { data, loading, isComparing, deltas, compareLabel, periodLabel, compareData } = useAnalytics();
    const overview = data?.team_overview;
    const kpi = overview?.kpi;
    const distribution = overview?.efficiency_distribution || overview?.distribution;
    const trendData = overview?.monthly_trend;

    const distChartData = useMemo(() => {
        if (!distribution) return [];
        return Object.entries(distribution)
            .map(([key, val]) => ({ name: DIST_LABELS[key] || key, value: val || 0, color: DIST_COLORS[key] || '#94a3b8' }))
            .filter(d => d.value > 0);
    }, [distribution]);

    const totalPeople = useMemo(() => distChartData.reduce((s, d) => s + d.value, 0), [distChartData]);

    const trendChartData = useMemo(() => {
        if (!trendData) return [];
        return trendData.map(m => ({
            name: (m.label || '').replace(/\d{4}$/, '').trim(),
            çalışma: Math.round(m.worked_hours || m.total_worked_hours || 0),
            hedef: Math.round(m.target_hours || 0),
            'ek mesai': Math.round(m.ot_hours || m.overtime_hours || 0),
        }));
    }, [trendData]);

    const sparklineWorked = useMemo(() => trendChartData.map(t => t.çalışma), [trendChartData]);
    const sparklineOT = useMemo(() => trendChartData.map(t => t['ek mesai']), [trendChartData]);

    if (loading && !data) return <LoadingSkeleton rows={3} />;
    if (!kpi) return <LoadingSkeleton rows={3} />;

    const healthColor = kpi.health_score >= 80 ? 'emerald' : kpi.health_score >= 60 ? 'amber' : 'red';

    // Comparison data
    const cmpKpi = compareData?.team_overview?.kpi;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Comparison Summary Banner ═══ */}
            {isComparing && cmpKpi && (
                <div className="bg-gradient-to-r from-violet-50/80 to-indigo-50/80 rounded-2xl border border-violet-200/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <GitCompare size={14} className="text-violet-500" />
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Dönem Karşılaştırması</span>
                        <span className="text-[10px] text-violet-400">{periodLabel} vs {compareLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Verimlilik', curr: `${kpi.avg_efficiency_pct || 0}%`, prev: `${cmpKpi.avg_efficiency_pct || 0}%`, delta: deltas?.efficiency },
                            { label: 'Çalışma', curr: `${Math.round(kpi.total_worked_hours || 0)}h`, prev: `${Math.round(cmpKpi.total_worked_hours || 0)}h`, delta: deltas?.worked },
                            { label: 'Ek Mesai', curr: `${Math.round(kpi.total_overtime_hours || 0)}h`, prev: `${Math.round(cmpKpi.total_overtime_hours || 0)}h`, delta: deltas?.overtime },
                            { label: 'Kayıp', curr: `${Math.round(kpi.total_missing_hours || 0)}h`, prev: `${Math.round(cmpKpi.total_missing_hours || 0)}h`, delta: deltas?.missing },
                            { label: 'Sağlık', curr: kpi.health_score || 0, prev: cmpKpi.health_score || 0, delta: deltas?.health, isSuffix: 'puan' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/80">
                                <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mb-1">{item.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-black text-slate-800">{item.curr}</span>
                                    <span className="text-[10px] text-slate-400">vs</span>
                                    <span className="text-sm font-bold text-slate-500">{item.prev}</span>
                                </div>
                                {item.delta != null && (
                                    <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.delta > 0 ? 'text-emerald-600 bg-emerald-50' : item.delta < 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50'}`}>
                                        {item.delta > 0 ? '+' : ''}{item.delta}{item.isSuffix || '%'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard title="Verimlilik" value={`${kpi.avg_efficiency_pct || 0}`} suffix="%" icon={Target}
                    gradient="indigo" delta={isComparing ? deltas?.efficiency : kpi.vs_prev?.worked} sparkline={sparklineWorked} />
                <KPICard title="Toplam Çalışma" value={Math.round(kpi.total_worked_hours || 0)} suffix="saat" icon={Clock}
                    gradient="blue" delta={isComparing ? deltas?.worked : null} subtitle={`Hedef: ${overview?.kpi?.total_target_hours || '—'} saat`} />
                <KPICard title="Ek Mesai" value={Math.round(kpi.total_overtime_hours || 0)} suffix="saat" icon={TrendingUp}
                    gradient="amber" delta={isComparing ? deltas?.overtime : kpi.vs_prev?.ot} sparkline={sparklineOT} />
                <KPICard title="Kayıp Saat" value={Math.round(kpi.total_missing_hours || 0)} suffix="saat" icon={AlertCircle}
                    gradient="red" delta={isComparing ? deltas?.missing : kpi.vs_prev?.missing} />
                <KPICard title="Ekip Sağlığı" value={kpi.health_score || 0} suffix="/100" icon={Shield}
                    gradient={healthColor} delta={isComparing ? deltas?.health : null} deltaSuffix=" puan" />
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                <KPICard mini title="Ekip Üyesi" value={overview?.employee_count || 0} suffix="kişi" icon={Users} gradient="slate" />
                <KPICard mini title="Devam Oranı" value={`${kpi.attendance_rate_pct || 0}`} suffix="%" icon={CalendarCheck} gradient="blue"
                    delta={isComparing ? deltas?.attendance : null} />
                <KPICard mini title="Dakiklik" value={`${kpi.punctual_pct || 0}`} suffix="%" icon={Award} gradient="emerald" />
                <KPICard mini title="Yemek Oranı" value={`${kpi.meal_rate_pct || 0}`} suffix="%" icon={Coffee} gradient="amber" />
                <KPICard mini title="İzin Kullanımı" value={kpi.total_leave_days || 0} suffix="gün" icon={CalendarCheck} gradient="violet" />
                <KPICard mini title="Ort. Mola" value={kpi.avg_break_minutes || 0} suffix="dk" icon={Coffee} gradient="cyan" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Efficiency Distribution */}
                <SectionCard title="Verimlilik Dağılımı" icon={Target} iconGradient="from-indigo-500 to-indigo-600"
                    subtitle={`${totalPeople} çalışan`} collapsible={false}>
                    {distChartData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={distChartData} cx="50%" cy="50%" outerRadius={85} innerRadius={50}
                                            dataKey="value" strokeWidth={2} stroke="#fff">
                                            {distChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Legend as progress bars */}
                            <div className="space-y-2">
                                {distChartData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} (${d.value})`}
                                        value={totalPeople > 0 ? Math.round(d.value / totalPeople * 100) : 0}
                                        color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-56 flex items-center justify-center text-slate-400 text-sm">Veri yok</div>
                    )}
                </SectionCard>

                {/* Monthly Trend */}
                <div className="lg:col-span-2">
                    <SectionCard title="Aylık Performans Trendi" icon={BarChart3} iconGradient="from-blue-500 to-blue-600"
                        subtitle="Çalışma vs hedef ve ek mesai" collapsible={false}>
                        {trendChartData.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={trendChartData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <Bar dataKey="çalışma" name="Çalışma" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="ek mesai" name="Ek Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="hedef" name="Hedef" stroke="#ef4444" strokeWidth={2}
                                            strokeDasharray="6 3" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">Veri yok</div>
                        )}
                    </SectionCard>
                </div>
            </div>

            {/* Health Score Breakdown */}
            <SectionCard title="Sağlık Skoru Detayı" icon={Activity} iconGradient="from-emerald-500 to-emerald-600"
                subtitle="Ekip performansını oluşturan bileşenler" collapsible defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <KPIProgressBar label="Verimlilik (30%)" value={Math.min(kpi.avg_efficiency_pct || 0, 100)} color="#6366f1" />
                        <KPIProgressBar label="Devam Oranı (30%)" value={kpi.attendance_rate_pct || 0} color="#3b82f6" />
                        <KPIProgressBar label="Dakiklik (20%)" value={kpi.punctual_pct || 0} color="#10b981" />
                    </div>
                    <div className="space-y-3">
                        <KPIProgressBar label="Kayıp Oranı (20%)" value={Math.max(0, 100 - (kpi.total_missing_hours / Math.max(kpi.total_worked_hours || 1, 1) * 100))} color="#f59e0b" />
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${DIST_COLORS[healthColor] ? '' : 'from-emerald-500 to-emerald-600'} flex items-center justify-center`}
                                    style={{ background: `linear-gradient(135deg, ${healthColor === 'emerald' ? '#10b981' : healthColor === 'amber' ? '#f59e0b' : '#ef4444'}, ${healthColor === 'emerald' ? '#059669' : healthColor === 'amber' ? '#d97706' : '#dc2626'})` }}>
                                    <span className="text-xl font-black text-white">{kpi.health_score || 0}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">
                                        {kpi.health_score >= 80 ? 'Mükemmel' : kpi.health_score >= 60 ? 'İyi' : 'Geliştirilmeli'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">Ağırlıklı toplam skor</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}
