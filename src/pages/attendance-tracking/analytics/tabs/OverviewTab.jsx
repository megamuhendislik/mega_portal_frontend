import React, { useMemo } from 'react';
import { Users, Target, Clock, AlertCircle, CalendarCheck, Coffee, TrendingUp, Activity } from 'lucide-react';
import { useAnalytics } from '../AnalyticsContext';
import KPICard from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton } from '../shared/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function OverviewTab() {
    const { data, loading } = useAnalytics();
    const overview = data?.team_overview;

    const kpi = overview?.kpi;
    const distribution = overview?.distribution;
    const trendData = overview?.monthly_trend;

    const distChartData = useMemo(() => {
        if (!distribution) return [];
        return [
            { name: 'Mükemmel (≥95%)', value: distribution.excellent || 0, color: '#10b981' },
            { name: 'İyi (80-95%)', value: distribution.good || 0, color: '#6366f1' },
            { name: 'Orta (60-80%)', value: distribution.average || 0, color: '#f59e0b' },
            { name: 'Düşük (<60%)', value: distribution.low || 0, color: '#ef4444' },
        ].filter(d => d.value > 0);
    }, [distribution]);

    const trendChartData = useMemo(() => {
        if (!trendData) return [];
        return trendData.map(m => ({
            name: m.label || m.month_label || '',
            worked: Math.round((m.total_worked_hours || 0) * 10) / 10,
            overtime: Math.round((m.overtime_hours || 0) * 10) / 10,
            missing: Math.round((m.missing_hours || 0) * 10) / 10,
        }));
    }, [trendData]);

    if (loading && !data) return <LoadingSkeleton rows={2} />;
    if (!kpi) return <LoadingSkeleton rows={2} />;

    const healthColor = kpi.health_score >= 80 ? 'from-emerald-500 to-emerald-600'
        : kpi.health_score >= 60 ? 'from-amber-500 to-amber-600'
            : 'from-red-500 to-red-600';

    return (
        <div className="space-y-5">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <KPICard title="Verimlilik" value={`${kpi.avg_efficiency_pct || 0}%`} icon={Target}
                    gradient="from-indigo-500 to-indigo-600" delta={kpi.vs_prev?.worked} />
                <KPICard title="Ek Mesai" value={`${kpi.total_overtime_hours || 0}`} suffix="saat" icon={Clock}
                    gradient="from-amber-500 to-orange-500" delta={kpi.vs_prev?.ot} />
                <KPICard title="Kayıp Saat" value={`${kpi.total_missing_hours || 0}`} suffix="saat" icon={AlertCircle}
                    gradient="from-red-500 to-red-600" delta={kpi.vs_prev?.missing} />
                <KPICard title="Devam Oranı" value={`${kpi.attendance_rate_pct || 0}%`} icon={CalendarCheck}
                    gradient="from-blue-500 to-blue-600" />
                <KPICard title="Ekip Sağlığı" value={kpi.health_score || 0} suffix="puan" icon={Activity}
                    gradient={healthColor} subtitle={`Dakiklik: ${kpi.punctual_pct || 0}% • Yemek: ${kpi.meal_rate_pct || 0}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Efficiency Distribution */}
                <SectionCard title="Verimlilik Dağılımı" icon={Target} iconGradient="from-indigo-500 to-indigo-600"
                    subtitle="Çalışan bazlı verimlilik segmentasyonu" collapsible={false}>
                    {distChartData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={distChartData} cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                                        dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                                        labelLine={false} >
                                        {distChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(val) => [val, 'Kişi']} />
                                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Veri yok</div>
                    )}
                </SectionCard>

                {/* Monthly Trend */}
                <SectionCard title="Aylık Trend" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600"
                    subtitle="Çalışma, ek mesai ve kayıp saat trendi" collapsible={false}>
                    {trendChartData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendChartData} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                    <Bar dataKey="worked" name="Çalışma (saat)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="overtime" name="Ek Mesai (saat)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="missing" name="Kayıp (saat)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Veri yok</div>
                    )}
                </SectionCard>
            </div>

            {/* Employee count & punctuality bars */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center">
                    <Users size={20} className="mx-auto text-indigo-500 mb-1" />
                    <p className="text-2xl font-black text-slate-800">{overview?.employee_count || 0}</p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Ekip Üyesi</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center">
                    <Coffee size={20} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-2xl font-black text-slate-800">{kpi.avg_break_minutes || 0}<span className="text-sm text-slate-400 ml-1">dk</span></p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Ort. Mola</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center">
                    <CalendarCheck size={20} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-black text-slate-800">{kpi.total_leave_days || 0}<span className="text-sm text-slate-400 ml-1">gün</span></p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase">İzin Kullanımı</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center">
                    <Target size={20} className="mx-auto text-emerald-500 mb-1" />
                    <p className="text-2xl font-black text-slate-800">{kpi.total_worked_hours || 0}<span className="text-sm text-slate-400 ml-1">saat</span></p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Toplam Çalışma</p>
                </div>
            </div>
        </div>
    );
}
