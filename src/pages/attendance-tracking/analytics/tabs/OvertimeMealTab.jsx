import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Utensils, TrendingUp, BarChart3, Zap, Award, AlertTriangle, Calendar, Coffee } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import ChartTooltip from '../shared/ChartTooltip';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area,
} from 'recharts';

const OT_COLORS = { intended: '#6366f1', potential: '#f59e0b', manual: '#10b981', weekend: '#8b5cf6' };
const OT_LABELS = { intended: 'Planlı', potential: 'Potansiyel', manual: 'Manuel', weekend: 'Hafta Sonu' };

export default function OvertimeMealTab() {
    const { data: bulkData, loading: bulkLoading, queryParams } = useAnalytics();
    const [otData, setOtData] = useState(null);
    const [breakMealData, setBreakMealData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch OT & break-meal data individually for richer data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [otRes, bmRes] = await Promise.allSettled([
                api.get('/attendance-analytics/overtime/', { params: queryParams }),
                api.get('/attendance-analytics/break-meal/', { params: queryParams }),
            ]);
            if (otRes.status === 'fulfilled') setOtData(otRes.value.data);
            if (bmRes.status === 'fulfilled') setBreakMealData(bmRes.value.data);
        } catch { /* silent */ }
        setLoading(false);
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const ot = otData || bulkData?.overtime;
    const breakMeal = breakMealData || bulkData?.break_meal;

    // OT source pie data
    const otSourceData = useMemo(() => {
        if (!ot?.by_source) return [];
        return Object.entries(ot.by_source)
            .map(([key, val]) => ({ name: OT_LABELS[key] || key, value: Math.round(val || 0), color: OT_COLORS[key] || '#94a3b8' }))
            .filter(d => d.value > 0);
    }, [ot]);

    // OT per employee (top 20)
    const otPerEmployee = useMemo(() => {
        if (!ot?.per_employee) return [];
        return ot.per_employee
            .sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
            .slice(0, 20)
            .map(e => ({
                name: (e.name || e.employee_name || '').split(' ').slice(0, 2).join(' '),
                toplam: Math.round((e.total_hours || 0) * 10) / 10,
                onaylı: Math.round((e.approved_hours || 0) * 10) / 10,
                dept: e.department || '',
            }));
    }, [ot]);

    // OT trend
    const otTrend = useMemo(() => {
        if (!ot?.monthly_trend) return [];
        return ot.monthly_trend.map(m => ({
            name: (m.label || '').replace(/\d{4}$/, '').trim(),
            toplam: Math.round((m.total_hours || 0) * 10) / 10,
            onaylı: Math.round((m.approved_hours || 0) * 10) / 10,
            kişi: m.employee_count || 0,
        }));
    }, [ot]);

    // OT day-of-week
    const otDowData = useMemo(() => {
        if (!ot?.by_day_of_week) return [];
        const dayNames = { MON: 'Pzt', TUE: 'Sal', WED: 'Çar', THU: 'Per', FRI: 'Cum', SAT: 'Cmt', SUN: 'Paz' };
        const colors = { MON: '#6366f1', TUE: '#6366f1', WED: '#6366f1', THU: '#6366f1', FRI: '#6366f1', SAT: '#f59e0b', SUN: '#ef4444' };
        return Object.entries(ot.by_day_of_week).map(([k, v]) => ({
            day: dayNames[k] || k,
            saat: Math.round((v || 0) * 10) / 10,
            color: colors[k] || '#6366f1',
        }));
    }, [ot]);

    // OT-Meal correlation
    const otMealCorrelation = useMemo(() => {
        if (!ot?.ot_meal_correlation) return [];
        return ot.ot_meal_correlation.map(d => ({
            name: (d.name || d.employee_name || '').split(' ').slice(0, 2).join(' '),
            ot_gün: d.ot_days || 0,
            yemek_gün: d.meal_days_on_ot || 0,
            oran: d.ot_days > 0 ? Math.round((d.meal_days_on_ot / d.ot_days) * 100) : 0,
        }));
    }, [ot]);

    // Break analysis
    const breakDistribution = useMemo(() => {
        if (!breakMeal?.break_distribution) return [];
        return breakMeal.break_distribution
            .sort((a, b) => (b.avg_break_minutes || 0) - (a.avg_break_minutes || 0))
            .slice(0, 20)
            .map(d => ({
                name: (d.name || d.employee_name || '').split(' ').slice(0, 2).join(' '),
                mola_dk: Math.round(d.avg_break_minutes || 0),
            }));
    }, [breakMeal]);

    // Meal trend
    const mealTrend = useMemo(() => {
        if (!breakMeal?.meal_trend) return [];
        return breakMeal.meal_trend.map(m => ({
            name: (m.label || '').replace(/\d{4}$/, '').trim(),
            sipariş: m.order_count || 0,
            oran: m.order_rate_pct || 0,
        }));
    }, [breakMeal]);

    const isLoading = (loading || bulkLoading) && !ot;
    if (isLoading) return <LoadingSkeleton rows={4} />;

    const totalOT = ot?.total_hours ? Math.round(ot.total_hours) : 0;
    const approvedOT = ot?.approved_hours ? Math.round(ot.approved_hours) : 0;
    const approvalRate = totalOT > 0 ? Math.round(approvedOT / totalOT * 100) : 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard title="Toplam OT" value={totalOT} suffix="saat" icon={Clock} gradient="amber"
                    info={METRIC_EXPLANATIONS.overtime} />
                <KPICard title="Onaylı OT" value={approvedOT} suffix="saat" icon={Zap} gradient="emerald"
                    subtitle={`Onay oranı: ${approvalRate}%`}
                    info={{ title: 'Onaylı OT', content: <><p><strong className="text-white">Formül:</strong> Σ (Onay durumu = APPROVED olan OT kayıtları)</p><p className="text-slate-400">Sadece yönetici tarafından onaylanmış ek mesai saatleri.</p></> }} />
                <KPICard title="OT Yapan" value={ot?.employee_count || 0} suffix="kişi" icon={BarChart3} gradient="indigo" />
                <KPICard title="Ort. OT / Kişi" value={ot?.employee_count > 0 ? Math.round(totalOT / ot.employee_count) : 0} suffix="saat" icon={Award} gradient="violet" />
                <KPICard title="Yemek Oranı" value={breakMeal?.meal_rate_pct || breakMeal?.overall_meal_rate_pct || 0} suffix="%" icon={Utensils} gradient="cyan"
                    subtitle="İş günlerinde yemek" info={METRIC_EXPLANATIONS.meal_rate} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* OT Source Pie */}
                <SectionCard title="OT Kaynak Dağılımı" icon={Zap} iconGradient="from-amber-500 to-amber-600" collapsible={false}>
                    {otSourceData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={otSourceData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                                            {otSourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {otSourceData.map((d, i) => (
                                    <KPIProgressBar key={i} label={`${d.name} — ${d.value}h`}
                                        value={totalOT > 0 ? Math.round(d.value / totalOT * 100) : 0} color={d.color} />
                                ))}
                            </div>
                        </div>
                    ) : <EmptyState message="Kaynak verisi yok" />}
                </SectionCard>

                {/* OT Day-of-week */}
                <SectionCard title="Gün Bazlı OT Yoğunluğu" icon={Calendar} iconGradient="from-violet-500 to-purple-600" collapsible={false}>
                    {otDowData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={otDowData} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="day" tick={{ fontSize: 12, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 10 }} unit="h" />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="saat" name="OT Saati" radius={[8, 8, 0, 0]}>
                                        {otDowData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Gün bazlı veri yok" />}
                </SectionCard>

                {/* OT Trend */}
                <SectionCard title="Aylık OT Trendi" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600" collapsible={false}>
                    {otTrend.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={otTrend}>
                                    <defs>
                                        <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                    <Area type="monotone" dataKey="toplam" name="Toplam OT" stroke="#f59e0b" fill="url(#otGrad)" strokeWidth={2.5} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="onaylı" name="Onaylı OT" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Trend verisi yok" />}
                </SectionCard>
            </div>

            {/* OT per employee - horizontal bar */}
            <SectionCard title="Kişi Bazlı Ek Mesai Sıralaması" icon={Award} iconGradient="from-amber-500 to-orange-600"
                subtitle="En çok ek mesai yapan çalışanlar — toplam vs onaylı">
                {otPerEmployee.length > 0 ? (
                    <div style={{ height: Math.max(300, otPerEmployee.length * 32) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={otPerEmployee} layout="vertical" barGap={2} barSize={12}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10 }} unit="h" />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={100} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                <Bar dataKey="toplam" name="Toplam OT" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="onaylı" name="Onaylı" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Kişi bazlı OT verisi yok" />}
            </SectionCard>

            {/* OT-Meal Correlation */}
            <SectionCard title="OT — Yemek Eşleştirme Analizi" icon={Utensils} iconGradient="from-orange-500 to-red-500"
                subtitle="OT yapılan günlerde yemek alınma durumu — kişi bazlı korelasyon">
                {otMealCorrelation.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kişi</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">OT Günleri</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Yemek (OT)</th>
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold w-48">Eşleşme Oranı</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {otMealCorrelation.slice(0, 20).map((row, i) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-2.5 px-4 font-bold text-slate-700">{row.name}</td>
                                        <td className="py-2.5 px-4 text-center tabular-nums font-bold text-slate-600">{row.ot_gün}</td>
                                        <td className="py-2.5 px-4 text-center tabular-nums font-bold text-orange-600">{row.yemek_gün}</td>
                                        <td className="py-2.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${row.oran}%`,
                                                            backgroundColor: row.oran >= 80 ? '#10b981' : row.oran >= 50 ? '#f59e0b' : '#ef4444',
                                                        }} />
                                                </div>
                                                <span className="text-xs font-black tabular-nums w-10 text-right">{row.oran}%</span>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${row.oran >= 80 ? 'bg-emerald-50 text-emerald-700' : row.oran >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                {row.oran >= 80 ? 'İyi' : row.oran >= 50 ? 'Orta' : 'Düşük'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <EmptyState message="OT-Yemek eşleştirme verisi yok" />}
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Break Analysis */}
                <SectionCard title="Mola Süreleri Analizi" icon={Coffee} iconGradient="from-cyan-500 to-blue-600"
                    subtitle="Kişi bazlı ortalama mola süreleri">
                    {breakDistribution.length > 0 ? (
                        <div style={{ height: Math.max(250, breakDistribution.length * 28) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={breakDistribution} layout="vertical" barSize={14}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} unit=" dk" />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} width={90} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="mola_dk" name="Ort. Mola" radius={[0, 6, 6, 0]}>
                                        {breakDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.mola_dk > 75 ? '#ef4444' : entry.mola_dk > 60 ? '#f59e0b' : '#06b6d4'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Mola verisi yok" />}
                </SectionCard>

                {/* Meal trend */}
                <SectionCard title="Yemek Sipariş Trendi" icon={Utensils} iconGradient="from-orange-500 to-orange-600"
                    subtitle="Aylık yemek sipariş sayısı ve oranı">
                    {mealTrend.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={mealTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                    <Bar yAxisId="left" dataKey="sipariş" name="Sipariş Sayısı" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="oran" name="Sipariş Oranı %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Yemek trend verisi yok" />}
                </SectionCard>
            </div>
        </div>
    );
}
