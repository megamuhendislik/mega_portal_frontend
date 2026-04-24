import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, Utensils, TrendingUp, BarChart3, Zap, Award, AlertTriangle, Calendar, Coffee } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import ChartTooltip from '../shared/ChartTooltip';
import DrilldownModal from '../shared/DrilldownModal';
import { ExternalLink, X as XIcon } from 'lucide-react';
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
    // Click-to-filter: OT source pie segment tıklanınca employee listesi bu kaynakla filtrelenir
    const [sourceFilter, setSourceFilter] = useState(null);
    // Drill-down modal state
    const [drilldown, setDrilldown] = useState(null); // { type: 'ot_ranking' | 'break_distribution', title, data }

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

    // OT per employee (top 20) — source filter uygulanır (varsa)
    const otPerEmployee = useMemo(() => {
        if (!ot?.per_employee) return [];
        const src = (ot.per_employee || []).map(e => ({
            ...e,
            _matches_filter: sourceFilter
                ? (e.by_source?.[sourceFilter] || 0) > 0
                : true,
        }));
        return src
            .filter(e => e._matches_filter)
            .sort((a, b) => {
                if (sourceFilter) {
                    return (b.by_source?.[sourceFilter] || 0) - (a.by_source?.[sourceFilter] || 0);
                }
                return (b.total_hours || 0) - (a.total_hours || 0);
            })
            .slice(0, 20)
            .map(e => ({
                name: (e.name || e.employee_name || '').split(' ').slice(0, 2).join(' '),
                toplam: Math.round((e.total_hours || 0) * 10) / 10,
                onaylı: Math.round((e.approved_hours || 0) * 10) / 10,
                dept: e.department || '',
            }));
    }, [ot, sourceFilter]);

    // Full OT per employee for drill-down (no top-20 limit, includes source breakdown)
    const otPerEmployeeFull = useMemo(() => {
        if (!ot?.per_employee) return [];
        return ot.per_employee.map(e => ({
            key: e.id || e.employee_id || e.name,
            id: e.id || e.employee_id,
            name: e.name || e.employee_name || '',
            department: e.department || '—',
            total_hours: Math.round((e.total_hours || 0) * 10) / 10,
            approved_hours: Math.round((e.approved_hours || 0) * 10) / 10,
            pending_hours: Math.round((e.pending_hours || 0) * 10) / 10,
            approval_rate: e.total_hours > 0 ? Math.round((e.approved_hours / e.total_hours) * 100) : 0,
        })).sort((a, b) => b.total_hours - a.total_hours);
    }, [ot]);

    const breakDistributionFull = useMemo(() => {
        if (!breakMeal?.break_distribution) return [];
        return breakMeal.break_distribution.map((d, i) => ({
            key: d.id || i,
            id: d.id,
            name: d.name || d.employee_name || '',
            department: d.department || '—',
            avg_break_minutes: Math.round(d.avg_break_minutes || 0),
            min_break_minutes: Math.round(d.min_break_minutes || 0),
            max_break_minutes: Math.round(d.max_break_minutes || 0),
            days_count: d.days_count || 0,
        })).sort((a, b) => b.avg_break_minutes - a.avg_break_minutes);
    }, [breakMeal]);

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
                {/* OT Source Pie — click-to-filter */}
                <SectionCard title="OT Kaynak Dağılımı" icon={Zap} iconGradient="from-amber-500 to-amber-600" collapsible={false}
                    headerExtra={sourceFilter ? (
                        <button onClick={() => setSourceFilter(null)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors">
                            <XIcon size={10} /> Filtre Kaldır
                        </button>
                    ) : null}>
                    {otSourceData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={otSourceData} cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                            dataKey="value" strokeWidth={2} stroke="#fff" paddingAngle={2}
                                            onClick={(entry) => {
                                                // entry.name örn: "Planlı" — OT_LABELS değerinden key'e çevir
                                                const matchedKey = Object.keys(OT_LABELS).find(k => OT_LABELS[k] === entry.name);
                                                if (matchedKey) {
                                                    setSourceFilter(matchedKey === sourceFilter ? null : matchedKey);
                                                }
                                            }}
                                            cursor="pointer">
                                            {otSourceData.map((e, i) => {
                                                const key = Object.keys(OT_LABELS).find(k => OT_LABELS[k] === e.name);
                                                const isActive = sourceFilter === key;
                                                const isDim = sourceFilter && !isActive;
                                                return <Cell key={i} fill={e.color}
                                                    fillOpacity={isDim ? 0.3 : 1}
                                                    stroke={isActive ? '#1e293b' : '#fff'}
                                                    strokeWidth={isActive ? 3 : 2} />;
                                            })}
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
                            <div className="text-[10px] text-slate-400 text-center italic">
                                💡 Pie diliminde kaynağa tıklayarak kişi listesini filtreleyin
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
                subtitle={sourceFilter ? `Filtrelendi: ${OT_LABELS[sourceFilter]}` : 'En çok ek mesai yapan çalışanlar — toplam vs onaylı'}
                headerExtra={
                    <button onClick={() => setDrilldown({ type: 'ot_ranking' })}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200/60">
                        <ExternalLink size={10} /> Detayları Göster
                    </button>
                }>
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
                    subtitle="Kişi bazlı ortalama mola süreleri"
                    headerExtra={breakDistributionFull.length > 0 ? (
                        <button onClick={() => setDrilldown({ type: 'break_distribution' })}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors border border-cyan-200/60">
                            <ExternalLink size={10} /> Detayları Göster
                        </button>
                    ) : null}>
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

            {/* Drill-down modals */}
            {drilldown?.type === 'break_distribution' && (
                <DrilldownModal
                    open={true}
                    onClose={() => setDrilldown(null)}
                    title="Mola Süreleri Detayı"
                    subtitle="Tüm çalışanlar — ortalama/min/max mola süreleri"
                    data={breakDistributionFull}
                    columns={[
                        { title: 'Ad Soyad', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name, 'tr') },
                        { title: 'Departman', dataIndex: 'department', sorter: (a, b) => (a.department || '').localeCompare(b.department || '', 'tr') },
                        {
                            title: 'Ort. Mola (dk)',
                            dataIndex: 'avg_break_minutes',
                            sorter: (a, b) => a.avg_break_minutes - b.avg_break_minutes,
                            defaultSortOrder: 'descend',
                            align: 'right',
                            render: (v) => (
                                <span className={`font-bold tabular-nums ${v > 75 ? 'text-red-600' : v > 60 ? 'text-amber-600' : 'text-cyan-600'}`}>
                                    {v}
                                </span>
                            ),
                        },
                        { title: 'Min (dk)', dataIndex: 'min_break_minutes', sorter: (a, b) => a.min_break_minutes - b.min_break_minutes, align: 'right' },
                        { title: 'Max (dk)', dataIndex: 'max_break_minutes', sorter: (a, b) => a.max_break_minutes - b.max_break_minutes, align: 'right' },
                        { title: 'Gün', dataIndex: 'days_count', sorter: (a, b) => a.days_count - b.days_count, align: 'right' },
                    ]}
                    groupBy="department"
                    groupLabel="Departman"
                    searchFields={['name', 'department']}
                    rowKey="key"
                    pageSize={25}
                />
            )}
            {drilldown?.type === 'ot_ranking' && (
                <DrilldownModal
                    open={true}
                    onClose={() => setDrilldown(null)}
                    title="Ek Mesai Kişi Detayı"
                    subtitle={sourceFilter ? `Filtre: ${OT_LABELS[sourceFilter]}` : 'Tüm OT kaynakları'}
                    data={otPerEmployeeFull}
                    columns={[
                        { title: 'Ad Soyad', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name, 'tr') },
                        { title: 'Departman', dataIndex: 'department', sorter: (a, b) => (a.department || '').localeCompare(b.department || '', 'tr') },
                        {
                            title: 'Toplam (saat)',
                            dataIndex: 'total_hours',
                            sorter: (a, b) => a.total_hours - b.total_hours,
                            defaultSortOrder: 'descend',
                            align: 'right',
                            render: (v) => <span className="font-bold tabular-nums">{v.toFixed(1)}</span>,
                        },
                        {
                            title: 'Onaylı (saat)',
                            dataIndex: 'approved_hours',
                            sorter: (a, b) => a.approved_hours - b.approved_hours,
                            align: 'right',
                            render: (v) => <span className="tabular-nums text-emerald-700">{v.toFixed(1)}</span>,
                        },
                        {
                            title: 'Bekleyen (saat)',
                            dataIndex: 'pending_hours',
                            sorter: (a, b) => a.pending_hours - b.pending_hours,
                            align: 'right',
                            render: (v) => <span className="tabular-nums text-amber-700">{v.toFixed(1)}</span>,
                        },
                        {
                            title: 'Onay Oranı',
                            dataIndex: 'approval_rate',
                            sorter: (a, b) => a.approval_rate - b.approval_rate,
                            align: 'right',
                            render: (v) => (
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${v >= 80 ? 'bg-emerald-50 text-emerald-700' : v >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                    {v}%
                                </span>
                            ),
                        },
                    ]}
                    groupBy="department"
                    groupLabel="Departman"
                    searchFields={['name', 'department']}
                    rowKey="key"
                    pageSize={25}
                />
            )}
        </div>
    );
}
