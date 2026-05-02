import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Users, Target, Clock, AlertCircle, CalendarCheck, Coffee, Activity, TrendingUp, Award, BarChart3, Shield, GitCompare, ExternalLink, RotateCw, Zap, Minus } from 'lucide-react';
import { Button } from 'antd';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import EfficiencyDetailModal from '../shared/EfficiencyDetailModal';
import ChartTooltip from '../shared/ChartTooltip';
import WorkforcePanel from '../shared/WorkforcePanel';
import ScopeBanner from '../shared/ScopeBanner';
import RiskMatrixCard from '../shared/RiskMatrixCard';
import YearlyTrendStrip from '../shared/YearlyTrendStrip';
import { levelColor as levelColorFn, QUADRANT_META } from '../tabs/performance/helpers';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, Legend, ComposedChart, Line,
} from 'recharts';

const DIST_COLORS = { excellent: '#10b981', good: '#6366f1', average: '#f59e0b', low: '#ef4444' };
const DIST_LABELS = { excellent: 'Mükemmel ≥95%', good: 'İyi 80-95%', average: 'Orta 60-80%', low: 'Düşük <60%' };

export default function OverviewTab() {
    const { data, loading, isComparing, deltas, compareLabel, periodLabel, compareData, queryParams, refetch, startDate, endDate, viewMode } = useAnalytics();

    // Defensive fallback: bulk endpoint başarısız olursa kendi başımıza çekelim
    const [fallbackData, setFallbackData] = useState(null);
    const [fallbackLoading, setFallbackLoading] = useState(false);
    const [fallbackError, setFallbackError] = useState(null);

    const fetchFallback = useCallback(async () => {
        if (!queryParams?.start_date) return;
        setFallbackLoading(true);
        setFallbackError(null);
        try {
            // Paralel: team_overview + work_hours + entry_exit
            const [toRes, whRes, eeRes] = await Promise.allSettled([
                api.get('/attendance-analytics/team-overview/', { params: queryParams, timeout: 30000 }),
                api.get('/attendance-analytics/work-hours/', { params: queryParams, timeout: 30000 }),
                api.get('/attendance-analytics/entry-exit/', { params: queryParams, timeout: 30000 }),
            ]);
            setFallbackData({
                team_overview: toRes.status === 'fulfilled' ? toRes.value.data : null,
                work_hours: whRes.status === 'fulfilled' ? whRes.value.data : null,
                entry_exit: eeRes.status === 'fulfilled' ? eeRes.value.data : null,
            });
        } catch (err) {
            setFallbackError(err?.response?.data?.error || err?.message || 'Veri yüklenemedi');
        } finally {
            setFallbackLoading(false);
        }
    }, [queryParams]);

    // Bulk yoksa veya boşsa fallback
    useEffect(() => {
        if (!loading && !data?.team_overview && queryParams?.start_date && !fallbackData && !fallbackLoading) {
            fetchFallback();
        }
    }, [data, loading, queryParams, fallbackData, fallbackLoading, fetchFallback]);

    // Effective data: bulk varsa onu, yoksa fallback'i kullan
    const effectiveData = data?.team_overview ? data : fallbackData;
    const overview = effectiveData?.team_overview;
    const kpi = overview?.kpi;
    const distribution = overview?.efficiency_distribution || overview?.distribution;
    const trendData = overview?.monthly_trend;

    const [showDetailModal, setShowDetailModal] = useState(false);

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
            'fazla mesai': Math.round(m.ot_hours || m.overtime_hours || 0),
        }));
    }, [trendData]);

    // sparklineWorked is reserved for future KPI sparklines
    const sparklineOT = useMemo(() => trendChartData.map(t => t['fazla mesai']), [trendChartData]);

    // Employee list for detail modal (from work_hours or entry_exit data)
    const employeeList = useMemo(() => {
        const workHours = effectiveData?.work_hours?.employee_hours || effectiveData?.work_hours?.per_employee || [];
        const entryExit = effectiveData?.entry_exit?.performance_ranking || [];
        // Prefer work_hours if available (has efficiency), else entry_exit
        if (workHours.length > 0) return workHours;
        if (entryExit.length > 0) return entryExit.map(e => ({
            ...e,
            efficiency_pct: e.work_score || 0,
            total_worked_hours: e.worked_hours || 0,
            total_overtime_hours: e.overtime_hours || 0,
            total_missing_hours: e.missing_hours || 0,
        }));
        return [];
    }, [effectiveData]);

    // Yükleme: hem bulk hem fallback yoksa skeleton
    if ((loading || fallbackLoading) && !kpi) return <LoadingSkeleton rows={3} />;

    // Hata: bulk fail + fallback fail
    if (fallbackError && !kpi) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
                <h3 className="font-bold text-red-800 mb-1">Veri yüklenemedi</h3>
                <p className="text-sm text-red-600 mb-4">{fallbackError}</p>
                <Button
                    icon={<RotateCw size={14} />}
                    onClick={() => { setFallbackData(null); setFallbackError(null); refetch?.(); fetchFallback(); }}
                    danger
                >
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    // Veri yok: kullanıcıya boş bir state göster
    if (!kpi) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <BarChart3 size={32} className="mx-auto mb-3 text-slate-400" />
                <h3 className="font-bold text-slate-700 mb-1">Bu dönem için veri yok</h3>
                <p className="text-sm text-slate-500 mb-4">Başka bir dönem seçin veya filtreleri sıfırlayın.</p>
                <Button
                    icon={<RotateCw size={14} />}
                    onClick={() => { setFallbackData(null); refetch?.(); fetchFallback(); }}
                >
                    Yenile
                </Button>
            </div>
        );
    }

    const healthColor = kpi.health_score >= 80 ? 'emerald' : kpi.health_score >= 60 ? 'amber' : 'red';
    const cmpKpi = compareData?.team_overview?.kpi;
    const isUsingFallback = !data?.team_overview && fallbackData?.team_overview;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi (Ekibim vs Tüm Şirket) ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* Fallback uyarısı: bulk endpoint başarısız oldu, tekil endpointlerden çekildi */}
            {isUsingFallback && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                    ℹ️ Toplu endpoint yanıt vermedi; veriler tekil endpointlerden yüklendi (yavaş olabilir).
                </div>
            )}

            {/* ═══ Workforce Panel — 6 KPI Tier 1 (Phase 9) ═══ */}
            {/* NOT: AnomaliesPanel ve InsightsBanner kendi tablarına taşındı —
                "Anomaliler" ve "İçgörüler" tab'larından erişin. */}
            <WorkforcePanel />

            {/* ═══ Risk Haritası (Eksik × FM) — kompakt scatter ═══ */}
            {employeeList.length > 0 && (
                <RiskMatrixCard
                    title="Risk Haritası"
                    subtitle="Yapılan Normal Mesai × Fazla Mesai · Sağ-üst = ideal tempo · daha derin analiz için Mesai Analizi tabını kullan"
                    data={employeeList
                        .filter((e) => e.has_target ?? (e.target_hours > 0))
                        .map((e) => ({
                            id: e.employee_id,
                            name: e.name,
                            label: e.name?.split(' ')[0] || '?',
                            x: Math.min(100, e.normal_completion_pct ?? e.efficiency_pct ?? 0),
                            y: e.ot_to_target_pct || 0,
                            z: Math.max(40, Math.min(800, (e.normal_hours || 1) * 8)),
                            color: levelColorFn(e.normal_completion_pct ?? e.efficiency_pct ?? 0),
                            tooltipExtra: `Normal: ${Math.round(e.normal_hours || 0)}sa · FM: ${Math.round(e.ot_hours || 0)}sa · Eksik: ${Math.round(e.missing_hours || 0)}sa`,
                        }))}
                    xLabel="Yapılan Normal Mesai — Gerçekleşen Normal / Yükümlülük (%)"
                    yLabel="Fazla Mesai / Yükümlülük (%)"
                    xMax={100} yMax={50}
                    thresholds={{ x: 80, y: 25 }}
                    quadrantLabels={{
                        bl: { label: 'Yetersiz', color: QUADRANT_META.underperform.color, bg: '#fee2e2' },
                        tl: { label: 'Tutarsız', color: QUADRANT_META.inconsistent.color, bg: '#fef3c7' },
                        br: { label: 'Sağlıklı', color: QUADRANT_META.healthy.color, bg: '#dbeafe' },
                        tr: { label: 'Lider', color: QUADRANT_META.leader.color, bg: '#d1fae5' },
                    }}
                    sizeRange={[40, 800]}
                    height={340}
                    collapsible defaultOpen={false}
                />
            )}

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
                            { label: 'Mesai Doluluğu', curr: `%${kpi.avg_efficiency_pct || 0}`, prev: `%${cmpKpi.avg_efficiency_pct || 0}`, delta: deltas?.efficiency },
                            { label: 'Çalışma', curr: `${Math.round(kpi.total_worked_hours || 0)}h`, prev: `${Math.round(cmpKpi.total_worked_hours || 0)}h`, delta: deltas?.worked },
                            { label: 'Fazla Mesai', curr: `${Math.round(kpi.total_overtime_hours || 0)}h`, prev: `${Math.round(cmpKpi.total_overtime_hours || 0)}h`, delta: deltas?.overtime },
                            { label: 'Kayıp', curr: `${Math.round(kpi.total_missing_hours || 0)}h`, prev: `${Math.round(cmpKpi.total_missing_hours || 0)}h`, delta: deltas?.missing },
                            { label: 'Sağlık', curr: kpi.health_score || 0, prev: cmpKpi.health_score || 0, delta: deltas?.health, isSuffix: ' puan' },
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

            {/* ── Mesai Doluluk Metrikleri (5 kart) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KPICard title="Yapılan Normal Mesai" value={`${kpi.avg_normal_completion_pct ?? kpi.avg_efficiency_pct ?? 0}`} suffix="%" icon={Target}
                    gradient="indigo" delta={isComparing ? deltas?.efficiency : null}
                    subtitle="Normal / Yükümlülük (cap 100)" info={METRIC_EXPLANATIONS.efficiency}
                    onClick={() => setShowDetailModal(true)} />
                <KPICard title="Toplam Doluluk" value={`${kpi.avg_total_completion_pct ?? 0}`} suffix="%" icon={TrendingUp}
                    gradient="emerald"
                    subtitle="(Normal + Fazla Mesai) / Yükümlülük"
                    onClick={() => setShowDetailModal(true)} />
                <KPICard title="Fazla Mesai / Yükümlülük" value={`${kpi.avg_ot_to_target_pct ?? 0}`} suffix="%" icon={Zap}
                    gradient="amber"
                    subtitle="Fazla mesai oranı"
                    onClick={() => setShowDetailModal(true)} />
                <KPICard title="Eksik / Yükümlülük" value={`${kpi.avg_missing_to_target_pct ?? 0}`} suffix="%" icon={AlertCircle}
                    gradient="red"
                    subtitle="Eksik mesai oranı"
                    onClick={() => setShowDetailModal(true)} />
                <KPICard title="Ekip Sağlığı" value={kpi.health_score || 0} suffix="/100" icon={Shield}
                    gradient={healthColor} delta={isComparing ? deltas?.health : null} deltaSuffix=" puan"
                    info={METRIC_EXPLANATIONS.health_score}
                    onClick={() => setShowDetailModal(true)} />
            </div>

            {/* ── Saat Bazlı Toplamlar (4 mini KPI) ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <KPICard mini title="Normal Mesai" value={Math.round(kpi.total_normal_hours ?? Math.max(0, (kpi.total_worked_hours || 0) - (kpi.total_overtime_hours || 0)))} suffix="sa" icon={Clock} gradient="indigo"
                    subtitle={`Yükümlülük: ${Math.round(kpi.prorated_target_hours || 0)}sa`} />
                <KPICard mini title="Toplam Çalışma" value={Math.round(kpi.total_worked_hours || 0)} suffix="sa" icon={Clock} gradient="blue"
                    delta={isComparing ? deltas?.worked : null}
                    subtitle={`Hedef: ${Math.round(kpi.total_target_hours || 0)}sa`} info={METRIC_EXPLANATIONS.worked_hours} />
                <KPICard mini title="Fazla Mesai" value={Math.round(kpi.total_overtime_hours || 0)} suffix="sa" icon={Zap} gradient="amber"
                    delta={isComparing ? deltas?.overtime : kpi.vs_prev?.ot}
                    sparkline={sparklineOT} info={METRIC_EXPLANATIONS.overtime} />
                <KPICard mini title="Eksik Mesai" value={Math.round(kpi.total_missing_hours || 0)} suffix="sa" icon={AlertCircle} gradient="red"
                    delta={isComparing ? deltas?.missing : kpi.vs_prev?.missing}
                    info={METRIC_EXPLANATIONS.missing_hours} />
            </div>

            {/* ── Diğer ekip metrikleri (mini KPI) ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                <KPICard mini title="Ekip Üyesi" value={overview?.employee_count || 0} suffix="kişi" icon={Users} gradient="slate" />
                <KPICard mini title="Devam Oranı" value={`${kpi.attendance_rate_pct || 0}`} suffix="%" icon={CalendarCheck} gradient="blue"
                    delta={isComparing ? deltas?.attendance : null} info={METRIC_EXPLANATIONS.attendance_rate} />
                <KPICard mini title="Dakiklik" value={`${kpi.punctual_pct || 0}`} suffix="%" icon={Award} gradient="emerald"
                    info={METRIC_EXPLANATIONS.punctuality} />
                <KPICard mini title="Fazla Mesai/Normal" value={kpi.avg_ot_to_normal_pct == null ? '—' : `${kpi.avg_ot_to_normal_pct}`} suffix={kpi.avg_ot_to_normal_pct == null ? '' : '%'} icon={TrendingUp} gradient="violet" />
                <KPICard mini title="Yemek Oranı" value={`${kpi.meal_rate_pct || 0}`} suffix="%" icon={Coffee} gradient="amber"
                    info={METRIC_EXPLANATIONS.meal_rate} />
                <KPICard mini title="Ort. Mola" value={kpi.avg_break_minutes || 0} suffix="dk" icon={Coffee} gradient="cyan"
                    info={METRIC_EXPLANATIONS.break_minutes} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Efficiency Distribution */}
                <SectionCard title="Mesai Doluluk Dağılımı" icon={Target} iconGradient="from-indigo-500 to-indigo-600"
                    subtitle={`${totalPeople} çalışan`} collapsible={false}
                    headerExtra={
                        <button onClick={() => setShowDetailModal(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60">
                            <ExternalLink size={10} /> Detayları Göster
                        </button>
                    }>
                    {distChartData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={distChartData} cx="50%" cy="50%" outerRadius={85} innerRadius={50}
                                            dataKey="value" strokeWidth={2} stroke="#fff">
                                            {distChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
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
                        subtitle="Çalışma vs hedef ve fazla mesai" collapsible={false}>
                        {trendChartData.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={trendChartData} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip content={<ChartTooltip unit="sa" />} />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        <Bar dataKey="çalışma" name="Çalışma" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="fazla mesai" name="Fazla Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
                        <KPIProgressBar label="Mesai Doluluğu (30%)" value={Math.min(kpi.avg_efficiency_pct || 0, 100)} color="#6366f1"
                            info={METRIC_EXPLANATIONS.efficiency} />
                        <KPIProgressBar label="Devam Oranı (30%)" value={kpi.attendance_rate_pct || 0} color="#3b82f6"
                            info={METRIC_EXPLANATIONS.attendance_rate} />
                        <KPIProgressBar label="Dakiklik (20%)" value={kpi.punctual_pct || 0} color="#10b981"
                            info={METRIC_EXPLANATIONS.punctuality} />
                    </div>
                    <div className="space-y-3">
                        <KPIProgressBar label="Kayıp Oranı (20%)" value={Math.max(0, 100 - (kpi.total_missing_hours / Math.max(kpi.total_worked_hours || 1, 1) * 100))} color="#f59e0b"
                            info={METRIC_EXPLANATIONS.missing_hours} />
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
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

            {/* ═══ Yıllık Trend — sadece Yıllık modda alt bölümde ═══ */}
            {viewMode === 'yearly' && <YearlyTrendStrip />}

            {/* Efficiency Detail Modal */}
            <EfficiencyDetailModal
                open={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                employees={employeeList}
            />
        </div>
    );
}
