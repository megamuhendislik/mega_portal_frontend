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
import BurnoutWidget from '../shared/BurnoutWidget';
import ScopeBanner from '../shared/ScopeBanner';
import RiskMatrixCard from '../shared/RiskMatrixCard';
import WaffleChart from '../shared/WaffleChart';
import { ExternalLink, X as XIcon } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area,
} from 'recharts';

const OT_COLORS = { intended: '#6366f1', potential: '#f59e0b', manual: '#10b981', weekend: '#8b5cf6' };
const OT_LABELS = { intended: 'Planlı', potential: 'Potansiyel', manual: 'Manuel', weekend: 'Hafta Sonu' };

export default function OvertimeMealTab() {
    const { data: bulkData, loading: bulkLoading, queryParams, startDate, endDate } = useAnalytics();
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
            // avg_break_minutes = öğle hariç GERÇEK mola (PRIMARY, backend düzeltmesi sonrası)
            avg_break_minutes: Math.round(d.avg_break_minutes || 0),
            // avg_counted_minutes = iş süresinden DÜŞÜLEN mola
            avg_counted_minutes: Math.round(d.avg_counted_minutes || 0),
            // avg_potential_minutes = toplam boşluk (öğle dahil)
            avg_potential_minutes: Math.round(d.avg_potential_minutes || 0),
            // avg_uncounted_minutes = öğle-hariç fazla mola
            avg_uncounted_minutes: Math.round(d.avg_uncounted_minutes || 0),
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

    // Full OT-Meal correlation for drill-down (no slicing, keeps full name + dept)
    const otMealCorrelationFull = useMemo(() => {
        if (!ot?.ot_meal_correlation) return [];
        return ot.ot_meal_correlation.map((d, i) => ({
            key: d.id || d.employee_id || i,
            id: d.id || d.employee_id,
            name: d.name || d.employee_name || '',
            department: d.department || '—',
            ot_days: d.ot_days || 0,
            meal_days: d.meal_days_on_ot || 0,
            match_rate: d.ot_days > 0 ? Math.round((d.meal_days_on_ot / d.ot_days) * 100) : 0,
            unmatched: Math.max(0, (d.ot_days || 0) - (d.meal_days_on_ot || 0)),
        })).sort((a, b) => b.ot_days - a.ot_days);
    }, [ot]);

    // Break analysis
    // avg_break_minutes = öğle hariç GERÇEK mola (PRIMARY) · avg_counted_minutes = düşülen mola
    const breakDistribution = useMemo(() => {
        if (!breakMeal?.break_distribution) return [];
        return [...breakMeal.break_distribution]
            .sort((a, b) => (b.avg_break_minutes || 0) - (a.avg_break_minutes || 0))
            .slice(0, 20)
            .map(d => ({
                name: (d.name || d.employee_name || '').split(' ').slice(0, 2).join(' '),
                mola_dk: Math.round(d.avg_break_minutes || 0),
                dusulen_dk: Math.round(d.avg_counted_minutes || 0),
            }));
    }, [breakMeal]);

    // Mola trendi (son 6 mali ay) — backend break_trend[]
    // { month, label, avg_break_minutes (gerçek mola), avg_counted_minutes (düşülen), days }
    const breakTrend = useMemo(() => {
        if (!breakMeal?.break_trend) return [];
        return breakMeal.break_trend.map(m => ({
            name: (m.label || '').replace(/\d{4}$/, '').trim(),
            gerçek: Math.round(m.avg_break_minutes || 0),
            düşülen: Math.round(m.avg_counted_minutes || 0),
            gün: m.days || 0,
        }));
    }, [breakMeal]);

    // Meal trend
    // Backend (break_absence_service.py) meal_trend öğeleri: month, label, order_count, rate_pct.
    // (rate fallback eski payload uyumu için korunur.)
    const mealTrend = useMemo(() => {
        if (!breakMeal?.meal_trend) return [];
        return breakMeal.meal_trend.map(m => ({
            name: (m.label || '').replace(/\d{4}$/, '').trim(),
            sipariş: m.order_count || 0,
            oran: m.rate_pct ?? m.rate ?? 0,
        }));
    }, [breakMeal]);

    // Risk Haritasi: Mola dakika x FM saat — yorgunluk gostergesi
    // (early return'lerden ONCE — hooks rules)
    const fatigueScatterData = useMemo(() => {
        const otMap = {};
        (ot?.per_employee || []).forEach((e) => {
            const id = e.id || e.employee_id;
            if (id != null) otMap[id] = e;
        });
        return (breakMeal?.break_distribution || [])
            .map((d) => {
                const id = d.id;
                const o = otMap[id];
                if (!id) return null;
                const otHrs = o?.total_hours || 0;
                const breakMin = d.avg_break_minutes || 0;
                if (otHrs === 0 && breakMin === 0) return null;
                return {
                    id,
                    name: d.name || d.employee_name || '—',
                    label: (d.name || '').split(' ')[0] || '?',
                    department: d.department || '—',
                    x: Math.min(120, breakMin),
                    y: Math.min(120, otHrs),
                    z: Math.max(40, Math.min(800, otHrs * 25)),
                    tooltipExtra: `Mola: ${Math.round(breakMin)}dk · FM: ${Math.round(otHrs)}sa`,
                };
            })
            .filter(Boolean);
    }, [ot, breakMeal]);

    const isLoading = (loading || bulkLoading) && !ot;
    if (isLoading) return <LoadingSkeleton rows={4} />;

    const totalOT = ot?.total_hours ? Math.round(ot.total_hours) : 0;
    const approvedOT = ot?.approved_hours ? Math.round(ot.approved_hours) : 0;
    const approvalRate = totalOT > 0 ? Math.round(approvedOT / totalOT * 100) : 0;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi (Ekibim vs Tüm Şirket) ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* Burnout Widget — Phase 8.2 */}
            <BurnoutWidget />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard title="Toplam Fazla Mesai" value={totalOT} suffix="saat" icon={Clock} gradient="amber"
                    info={METRIC_EXPLANATIONS.overtime} />
                <KPICard title="Onaylı Fazla Mesai" value={approvedOT} suffix="saat" icon={Zap} gradient="emerald"
                    subtitle={`Onay oranı: %${approvalRate}`}
                    info={{ title: 'Onaylı Fazla Mesai', content: <><p><strong className="text-white">Formül:</strong> Σ (Onay durumu = APPROVED olan Fazla Mesai kayıtları)</p><p className="text-slate-400">Sadece yönetici tarafından onaylanmış fazla mesai saatleri.</p></> }} />
                <KPICard title="Fazla Mesai Yapan" value={ot?.employee_count || 0} suffix="kişi" icon={BarChart3} gradient="indigo" />
                <KPICard title="Ort. Fazla Mesai / Kişi" value={ot?.employee_count > 0 ? Math.round(totalOT / ot.employee_count) : 0} suffix="saat" icon={Award} gradient="violet" />
                <KPICard title="FM Yemek Oranı" value={breakMeal?.meal_rate_pct || 0} suffix="%" icon={Utensils} gradient="cyan"
                    subtitle={`${breakMeal?.meal_days_on_ot || 0}/${breakMeal?.approved_ot_days || 0} FM günü (sipariş/teslim)`}
                    info={METRIC_EXPLANATIONS.meal_rate} />
                <KPICard title="Saat / Yemek" value={breakMeal?.ot_hours_per_meal || 0} suffix="sa" icon={Utensils} gradient="rose"
                    subtitle={`${breakMeal?.total_meals || 0} yemek · ${breakMeal?.total_approved_ot_hours || 0} sa OT`}
                    info={{ title: 'FM Yemek Yoğunluğu', content: <><p><strong className="text-white">Formül:</strong> Toplam Onaylı FM Saati ÷ OT gününde alınan yemek sayısı (sipariş edilen/teslim edilen)</p><p className="text-slate-400">"Her yemek başına X saat onaylı fazla mesai düşüyor."</p><p className="text-slate-400">Yalnız ORDERED/DELIVERED yemekler sayılır; bekleyen (PENDING) talepler hariçtir.</p><p className="text-slate-400">Ters metrik: <strong className="text-slate-200">{breakMeal?.meals_per_ot_hour || 0}</strong> yemek/saat</p></> }} />
                <KPICard title="Ort. Gerçek Mola" value={Math.round(breakMeal?.avg_break_minutes || 0)} suffix="dk" icon={Coffee} gradient="cyan"
                    subtitle={`%${breakMeal?.break_over_30_pct || 0} kişi >30dk · ${breakMeal?.break_exceeding_count || 0} kişi`}
                    info={{ title: 'Ortalama Gerçek Mola', content: <><p><strong className="text-white">Tanım:</strong> Öğle arası HARİÇ gerçek mola (boşluk) süresinin kişi başı ortalaması.</p><p className="text-slate-400">İş süresinden düşülen molayı değil, çalışanın fiilen verdiği ara molalarını gösterir.</p><p className="text-slate-400">Eşik aşımı: 30/45 dk üzeri gerçek mola.</p></> }} />
                <KPICard title="Ort. Düşülen Mola" value={Math.round(breakMeal?.avg_counted_break_minutes || 0)} suffix="dk" icon={Coffee} gradient="indigo"
                    subtitle="İş süresinden düşülen"
                    info={{ title: 'Ortalama Düşülen Mola', content: <><p><strong className="text-white">Tanım:</strong> Çalışma süresinden düşülen (sayılan) mola süresinin kişi başı ortalaması.</p><p className="text-slate-400">Toplam boşluk (öğle dahil): <strong className="text-slate-200">{Math.round(breakMeal?.avg_potential_break_minutes || 0)}</strong> dk · Öğle-hariç fazla mola: <strong className="text-slate-200">{Math.round(breakMeal?.avg_uncounted_break_minutes || 0)}</strong> dk</p></> }} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* OT Source Pie — click-to-filter */}
                <SectionCard title="Fazla Mesai Kaynak Dağılımı" icon={Zap} iconGradient="from-amber-500 to-amber-600" collapsible={false}
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
                <SectionCard title="Gün Bazlı Fazla Mesai Yoğunluğu" icon={Calendar} iconGradient="from-violet-500 to-purple-600" collapsible={false}>
                    {otDowData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={otDowData} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="day" tick={{ fontSize: 12, fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 10 }} unit="h" />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Bar dataKey="saat" name="Fazla Mesai Saati" radius={[8, 8, 0, 0]}>
                                        {otDowData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Gün bazlı veri yok" />}
                </SectionCard>

                {/* OT Trend */}
                <SectionCard title="Aylık Fazla Mesai Trendi" icon={TrendingUp} iconGradient="from-emerald-500 to-emerald-600" collapsible={false}>
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
                                    <Area type="monotone" dataKey="toplam" name="Toplam Fazla Mesai" stroke="#f59e0b" fill="url(#otGrad)" strokeWidth={2.5} dot={{ r: 3 }} />
                                    <Line type="monotone" dataKey="onaylı" name="Onaylı Fazla Mesai" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <EmptyState message="Trend verisi yok" />}
                </SectionCard>
            </div>

            {/* OT per employee - horizontal bar */}
            <SectionCard title="Kişi Bazlı Fazla Mesai Sıralaması" icon={Award} iconGradient="from-amber-500 to-orange-600"
                subtitle={sourceFilter ? `Filtrelendi: ${OT_LABELS[sourceFilter]}` : 'En çok fazla mesai yapan çalışanlar — toplam vs onaylı'}
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
                                <Bar dataKey="toplam" name="Toplam Fazla Mesai" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="onaylı" name="Onaylı" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : <EmptyState message="Kişi bazlı Fazla Mesai verisi yok" />}
            </SectionCard>

            {/* OT-Meal Correlation */}
            <SectionCard title="Fazla Mesai — Yemek Eşleştirme Analizi" icon={Utensils} iconGradient="from-orange-500 to-red-500"
                subtitle="Fazla mesai yapılan günlerde sipariş edilen/teslim edilen yemek durumu — kişi bazlı korelasyon"
                headerExtra={otMealCorrelationFull.length > 0 ? (
                    <button onClick={() => setDrilldown({ type: 'ot_meal_correlation' })}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200/60">
                        <ExternalLink size={10} /> Detayları Göster
                    </button>
                ) : null}>
                {otMealCorrelation.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 px-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kişi</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Fazla Mesai Günleri</th>
                                    <th className="text-center py-3 px-4 text-[10px] text-slate-400 uppercase font-bold">Yemek (Fazla Mesai)</th>
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
                                                <span className="text-xs font-black tabular-nums w-10 text-right">%{row.oran}</span>
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
                ) : <EmptyState message="Fazla Mesai-Yemek eşleştirme verisi yok" />}
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Break Analysis */}
                {/* Backend korektlik düzeltmesi (2026-06): avg_break_minutes ARTIK öğle hariç
                    GERÇEK mola (boşluk). İkinci seri avg_counted_minutes = iş süresinden DÜŞÜLEN mola.
                    Backend eşiği gerçek mola için 30/45 dk. */}
                <SectionCard title="Mola Süreleri Analizi" icon={Coffee} iconGradient="from-cyan-500 to-blue-600"
                    subtitle="Kişi bazlı ort. gerçek mola (öğle hariç) vs düşülen mola · ≤30dk OK · 30-45dk uyarı · >45dk uzun mola"
                    headerExtra={breakDistributionFull.length > 0 ? (
                        <button onClick={() => setDrilldown({ type: 'break_distribution' })}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors border border-cyan-200/60">
                            <ExternalLink size={10} /> Detayları Göster
                        </button>
                    ) : null}>
                    {breakDistribution.length > 0 ? (
                        <>
                            <div style={{ height: Math.max(250, breakDistribution.length * 32) }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={breakDistribution} layout="vertical" barGap={2} barSize={11}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 10 }} unit=" dk" />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} width={90} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <Bar dataKey="mola_dk" name="Ort. Mola (öğle hariç gerçek mola)" radius={[0, 6, 6, 0]}>
                                            {breakDistribution.map((entry, i) => (
                                                <Cell key={i} fill={entry.mola_dk > 45 ? '#ef4444' : entry.mola_dk > 30 ? '#f59e0b' : '#06b6d4'} />
                                            ))}
                                        </Bar>
                                        <Bar dataKey="dusulen_dk" name="Düşülen Mola" fill="#a5b4fc" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500" /> ≤30dk normal</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> 30-45dk uyarı</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> &gt;45dk uzun mola</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: '#a5b4fc' }} /> düşülen mola</span>
                            </div>
                        </>
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

            {/* ═══ Mola Trendi (Son 6 Ay) + OT vs Normal gün mola karşılaştırması ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Mola Trendi — gerçek mola + düşülen mola (son 6 mali ay) */}
                <div className="lg:col-span-2">
                    <SectionCard title="Mola Trendi (Son 6 Ay)" icon={TrendingUp} iconGradient="from-cyan-500 to-blue-600"
                        subtitle="Aylık ort. gerçek mola (öğle hariç) vs düşülen mola — trend nasıl değişiyor">
                        {breakTrend.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={breakTrend}>
                                        <defs>
                                            <linearGradient id="breakGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} />
                                        <YAxis tick={{ fontSize: 10 }} unit=" dk" />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <Area type="monotone" dataKey="gerçek" name="Gerçek Mola (öğle hariç)" stroke="#06b6d4" fill="url(#breakGrad)" strokeWidth={2.5} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="düşülen" name="Düşülen Mola" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <EmptyState message="Mola trend verisi yok" />}
                    </SectionCard>
                </div>

                {/* OT günü vs Normal gün ortalama mola */}
                <SectionCard title="OT vs Normal Gün Mola" icon={Coffee} iconGradient="from-amber-500 to-cyan-600"
                    subtitle="Fazla mesai günlerinde mola davranışı normal günlerden farklı mı?">
                    {breakMeal?.break_ot_normal ? (
                        <div className="space-y-4">
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'OT Günü', mola: Math.round(breakMeal.break_ot_normal.ot_day_avg_break_minutes || 0), color: '#f59e0b' },
                                            { name: 'Normal Gün', mola: Math.round(breakMeal.break_ot_normal.normal_day_avg_break_minutes || 0), color: '#06b6d4' },
                                        ]}
                                        barSize={48}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                                        <YAxis tick={{ fontSize: 10 }} unit=" dk" />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="mola" name="Ort. Gerçek Mola" radius={[6, 6, 0, 0]}>
                                            <Cell fill="#f59e0b" />
                                            <Cell fill="#06b6d4" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="rounded-lg bg-amber-50 py-2 px-1">
                                    <div className="text-lg font-black text-amber-600 tabular-nums">
                                        {Math.round(breakMeal.break_ot_normal.ot_day_avg_break_minutes || 0)}<span className="text-xs font-bold"> dk</span>
                                    </div>
                                    <div className="text-[10px] text-amber-700/80 font-bold">OT günü · {breakMeal.break_ot_normal.ot_day_count || 0} gün</div>
                                </div>
                                <div className="rounded-lg bg-cyan-50 py-2 px-1">
                                    <div className="text-lg font-black text-cyan-600 tabular-nums">
                                        {Math.round(breakMeal.break_ot_normal.normal_day_avg_break_minutes || 0)}<span className="text-xs font-bold"> dk</span>
                                    </div>
                                    <div className="text-[10px] text-cyan-700/80 font-bold">Normal gün · {breakMeal.break_ot_normal.normal_day_count || 0} gün</div>
                                </div>
                            </div>
                        </div>
                    ) : <EmptyState message="OT/normal gün mola verisi yok" />}
                </SectionCard>
            </div>

            {/* Drill-down modals */}
            {drilldown?.type === 'break_distribution' && (
                <DrilldownModal
                    open={true}
                    onClose={() => setDrilldown(null)}
                    title="Mola Süreleri Detayı"
                    subtitle="Tüm çalışanlar — gerçek mola (öğle hariç) · düşülen mola · toplam boşluk · min/max"
                    data={breakDistributionFull}
                    columns={[
                        { title: 'Ad Soyad', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name, 'tr') },
                        { title: 'Departman', dataIndex: 'department', sorter: (a, b) => (a.department || '').localeCompare(b.department || '', 'tr') },
                        {
                            title: 'Gerçek Mola (dk)',
                            dataIndex: 'avg_break_minutes',
                            sorter: (a, b) => a.avg_break_minutes - b.avg_break_minutes,
                            defaultSortOrder: 'descend',
                            align: 'right',
                            render: (v) => (
                                <span className={`font-bold tabular-nums ${v > 45 ? 'text-red-600' : v > 30 ? 'text-amber-600' : 'text-cyan-600'}`}>
                                    {v}
                                </span>
                            ),
                        },
                        {
                            title: 'Düşülen (dk)',
                            dataIndex: 'avg_counted_minutes',
                            sorter: (a, b) => a.avg_counted_minutes - b.avg_counted_minutes,
                            align: 'right',
                            render: (v) => <span className="tabular-nums text-indigo-600">{v}</span>,
                        },
                        {
                            title: 'Toplam Boşluk (dk)',
                            dataIndex: 'avg_potential_minutes',
                            sorter: (a, b) => a.avg_potential_minutes - b.avg_potential_minutes,
                            align: 'right',
                            render: (v) => <span className="tabular-nums text-slate-500">{v}</span>,
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
            {drilldown?.type === 'ot_meal_correlation' && (
                <DrilldownModal
                    open={true}
                    onClose={() => setDrilldown(null)}
                    title="Fazla Mesai-Yemek Eşleştirme Detayı"
                    subtitle="Tüm çalışanlar — Fazla mesai yapılan günlerde yemek siparişi oranları"
                    data={otMealCorrelationFull}
                    columns={[
                        { title: 'Ad Soyad', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name, 'tr') },
                        { title: 'Departman', dataIndex: 'department', sorter: (a, b) => (a.department || '').localeCompare(b.department || '', 'tr') },
                        {
                            title: 'Fazla Mesai Günleri',
                            dataIndex: 'ot_days',
                            sorter: (a, b) => a.ot_days - b.ot_days,
                            defaultSortOrder: 'descend',
                            align: 'right',
                            render: (v) => <span className="font-bold tabular-nums">{v}</span>,
                        },
                        {
                            title: 'Yemek Alınan',
                            dataIndex: 'meal_days',
                            sorter: (a, b) => a.meal_days - b.meal_days,
                            align: 'right',
                            render: (v) => <span className="tabular-nums text-orange-700">{v}</span>,
                        },
                        {
                            title: 'Yemeksiz',
                            dataIndex: 'unmatched',
                            sorter: (a, b) => a.unmatched - b.unmatched,
                            align: 'right',
                            render: (v) => (
                                <span className={`tabular-nums ${v > 5 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{v}</span>
                            ),
                        },
                        {
                            title: 'Eşleşme',
                            dataIndex: 'match_rate',
                            sorter: (a, b) => a.match_rate - b.match_rate,
                            align: 'right',
                            render: (v) => (
                                <div className="flex items-center gap-2 justify-end">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${v}%`,
                                                backgroundColor: v >= 80 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444',
                                            }} />
                                    </div>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${v >= 80 ? 'bg-emerald-50 text-emerald-700' : v >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                        %{v}
                                    </span>
                                </div>
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
            {drilldown?.type === 'ot_ranking' && (
                <DrilldownModal
                    open={true}
                    onClose={() => setDrilldown(null)}
                    title="Fazla Mesai Kişi Detayı"
                    subtitle={sourceFilter ? `Filtre: ${OT_LABELS[sourceFilter]}` : 'Tüm Fazla Mesai kaynakları'}
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
                                    %{v}
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

            {/* ═══ Waffle Chart — FM Kaynak Pay Dağılımı ═══ */}
            {otSourceData.length > 0 && (
                <WaffleChart
                    title="Fazla Mesai Kaynak Pay Dağılımı"
                    subtitle="Her hücre = %1 · Pie alternatifi"
                    segments={otSourceData.map((s) => ({
                        key: s.name,
                        label: s.name,
                        value: s.value,
                        color: s.color,
                    }))}
                    unit="sa"
                    collapsible defaultOpen={false}
                />
            )}

            {/* ═══ Risk Haritası: Mola × Fazla Mesai (yorgunluk göstergesi) ═══ */}
            {fatigueScatterData.length > 0 && (
                <RiskMatrixCard
                    title="Yorgunluk Risk Haritası"
                    subtitle="Mola süresi (X) × Fazla Mesai (Y) · Sağ-üst = uzun mola + yüksek FM"
                    data={fatigueScatterData}
                    xLabel="Ortalama Mola (dakika)"
                    yLabel="Toplam Fazla Mesai (saat)"
                    xMax={120} yMax={120}
                    thresholds={{ x: 60, y: 30 }}
                    quadrantLabels={{
                        bl: { label: 'Sağlıklı', color: '#10b981', bg: '#d1fae5' },
                        tl: { label: 'Yoğun (FM)', color: '#f59e0b', bg: '#fef3c7' },
                        br: { label: 'Uzun Mola', color: '#6366f1', bg: '#e0e7ff' },
                        tr: { label: 'Yorgun', color: '#ef4444', bg: '#fee2e2' },
                    }}
                    sizeRange={[40, 800]}
                    height={340}
                    collapsible defaultOpen={false}
                />
            )}
        </div>
    );
}
