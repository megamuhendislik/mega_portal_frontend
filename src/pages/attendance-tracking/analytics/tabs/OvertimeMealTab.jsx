import React, { useMemo } from 'react';
import { Clock, Utensils, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { useAnalytics } from '../AnalyticsContext';
import KPICard from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter, ZAxis } from 'recharts';

const OT_COLORS = { intended: '#6366f1', potential: '#f59e0b', manual: '#10b981' };
const OT_LABELS = { intended: 'Planlı', potential: 'Potansiyel', manual: 'Manuel' };

export default function OvertimeMealTab() {
    const { data, loading } = useAnalytics();
    const ot = data?.overtime;
    const breakMeal = data?.break_meal;

    // OT source pie
    const otSourceData = useMemo(() => {
        if (!ot?.by_source) return [];
        return Object.entries(ot.by_source)
            .map(([key, val]) => ({ name: OT_LABELS[key] || key, value: val || 0, color: OT_COLORS[key] || '#94a3b8' }))
            .filter(d => d.value > 0);
    }, [ot]);

    // OT per employee (top 15)
    const otPerEmployee = useMemo(() => {
        if (!ot?.per_employee) return [];
        return ot.per_employee
            .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
            .slice(0, 15)
            .map(e => ({
                name: (e.name || e.employee_name || '').split(' ').slice(0, 2).join(' '),
                saat: Math.round((e.total_hours || 0) * 10) / 10,
                approved: Math.round((e.approved_hours || 0) * 10) / 10,
            }));
    }, [ot]);

    // OT trend
    const otTrend = useMemo(() => {
        if (!ot?.monthly_trend) return [];
        return ot.monthly_trend.map(m => ({
            name: m.label || '',
            toplam: Math.round((m.total_hours || 0) * 10) / 10,
            onaylı: Math.round((m.approved_hours || 0) * 10) / 10,
        }));
    }, [ot]);

    // OT day-of-week heatmap data
    const otDowData = useMemo(() => {
        if (!ot?.by_day_of_week) return [];
        const dayNames = { MON: 'Pzt', TUE: 'Sal', WED: 'Çar', THU: 'Per', FRI: 'Cum', SAT: 'Cmt', SUN: 'Paz' };
        return Object.entries(ot.by_day_of_week).map(([k, v]) => ({
            day: dayNames[k] || k,
            saat: Math.round((v || 0) * 10) / 10,
        }));
    }, [ot]);

    // OT-Meal correlation
    const otMealCorrelation = useMemo(() => {
        if (!ot?.ot_meal_correlation) return [];
        return ot.ot_meal_correlation.map(d => ({
            name: (d.name || d.employee_name || '').split(' ')[0],
            ot_gün: d.ot_days || 0,
            yemek_gün: d.meal_days_on_ot || 0,
            oran: d.ot_days > 0 ? Math.round((d.meal_days_on_ot / d.ot_days) * 100) : 0,
        }));
    }, [ot]);

    // Break analysis
    const breakData = useMemo(() => {
        if (!breakMeal?.break_distribution) return [];
        return breakMeal.break_distribution.map(d => ({
            name: (d.name || d.employee_name || '').split(' ').slice(0, 2).join(' '),
            mola_dk: Math.round(d.avg_break_minutes || 0),
        })).sort((a, b) => b.mola_dk - a.mola_dk).slice(0, 15);
    }, [breakMeal]);

    if (loading && !data) return <LoadingSkeleton rows={3} />;

    return (
        <div className="space-y-5">
            {/* OT KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard title="Toplam OT" value={ot?.total_hours ? Math.round(ot.total_hours) : 0} suffix="saat"
                    icon={Clock} gradient="from-amber-500 to-orange-500" />
                <KPICard title="Onaylı OT" value={ot?.approved_hours ? Math.round(ot.approved_hours) : 0} suffix="saat"
                    icon={Zap} gradient="from-emerald-500 to-emerald-600" />
                <KPICard title="OT Yapan Kişi" value={ot?.employee_count || 0} suffix="kişi"
                    icon={BarChart3} gradient="from-indigo-500 to-indigo-600" />
                <KPICard title="Yemek Oranı" value={breakMeal?.meal_rate_pct || 0} suffix="%"
                    icon={Utensils} gradient="from-orange-500 to-red-500"
                    subtitle="OT günlerinde yemek alma" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* OT Source Pie */}
                <SectionCard title="OT Kaynak Dağılımı" icon={Zap} iconGradient="from-amber-500 to-amber-600" collapsible={false}>
                    {otSourceData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={otSourceData} cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                                        dataKey="value" label={({ name, value }) => `${name}: ${value}h`} labelLine={false}>
                                        {otSourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={v => [`${v} saat`]} contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Kaynak verisi yok" />}
                </SectionCard>

                {/* OT Day-of-week */}
                <SectionCard title="Gün Bazlı OT Yoğunluğu" icon={BarChart3} iconGradient="from-violet-500 to-purple-600" collapsible={false}>
                    {otDowData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={otDowData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="day" tick={{ fontSize: 12, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} formatter={v => [`${v} saat`]} />
                                    <Bar dataKey="saat" name="OT Saati" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Gün bazlı veri yok" />}
                </SectionCard>
            </div>

            {/* OT Trend */}
            <SectionCard title="Aylık OT Trendi" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600" subtitle="Toplam ve onaylı ek mesai saatleri">
                {otTrend.length > 0 ? (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={otTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Line type="monotone" dataKey="toplam" name="Toplam OT" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="onaylı" name="Onaylı OT" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Trend verisi yok" />}
            </SectionCard>

            {/* OT per employee */}
            <SectionCard title="Kişi Bazlı OT Sıralaması" icon={Clock} iconGradient="from-amber-500 to-orange-500" subtitle="En çok ek mesai yapan çalışanlar">
                {otPerEmployee.length > 0 ? (
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={otPerEmployee} layout="vertical" barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="saat" name="Toplam OT" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="approved" name="Onaylı" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Kişi bazlı OT verisi yok" />}
            </SectionCard>

            {/* OT-Meal Correlation */}
            <SectionCard title="OT — Yemek Eşleştirmesi" icon={Utensils} iconGradient="from-orange-500 to-red-500"
                subtitle="OT olan günlerde yemek alınma oranı">
                {otMealCorrelation.length > 0 ? (
                    <div className="space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">Kişi</th>
                                        <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">OT Günleri</th>
                                        <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">Yemek (OT'de)</th>
                                        <th className="text-center py-2 px-3 text-[10px] text-slate-400 uppercase font-bold">Oran</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {otMealCorrelation.slice(0, 15).map((row, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="py-2 px-3 font-medium text-slate-700">{row.name}</td>
                                            <td className="py-2 px-3 text-center tabular-nums font-bold">{row.ot_gün}</td>
                                            <td className="py-2 px-3 text-center tabular-nums font-bold text-orange-600">{row.yemek_gün}</td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${row.oran}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold tabular-nums">{row.oran}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : <EmptyState message="OT-Yemek eşleştirme verisi yok" />}
            </SectionCard>

            {/* Break Analysis */}
            <SectionCard title="Mola Analizi" icon={Utensils} iconGradient="from-cyan-500 to-blue-600" subtitle="Kişi bazlı ortalama mola süreleri">
                {breakData.length > 0 ? (
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10 }} unit=" dk" />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} formatter={v => [`${v} dk`]} />
                                <Bar dataKey="mola_dk" name="Ort. Mola" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                                    {breakData.map((entry, i) => (
                                        <Cell key={i} fill={entry.mola_dk > 75 ? '#ef4444' : entry.mola_dk > 60 ? '#f59e0b' : '#06b6d4'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Mola verisi yok" />}
            </SectionCard>
        </div>
    );
}
