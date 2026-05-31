import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Users, Target, Clock, AlertCircle, CalendarCheck, Coffee, Activity, TrendingUp, Award, BarChart3, Shield, GitCompare, ExternalLink, RotateCw, Zap } from 'lucide-react';
import { Button } from 'antd';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import KPICard, { KPIProgressBar } from '../shared/KPICard';
import SectionCard from '../shared/SectionCard';
import { LoadingSkeleton, EmptyState } from '../shared/EmptyState';
import { METRIC_EXPLANATIONS } from '../shared/InfoTooltip';
import EfficiencyDetailModal from '../shared/EfficiencyDetailModal';
import KPIDetailModal from '../shared/KPIDetailModal';
import ChartTooltip from '../shared/ChartTooltip';
import WorkforcePanel from '../shared/WorkforcePanel';
import ScopeBanner from '../shared/ScopeBanner';
import {
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const DIST_COLORS = { excellent: '#10b981', good: '#6366f1', average: '#f59e0b', low: '#ef4444' };
const DIST_LABELS = { excellent: 'Mükemmel ≥95%', good: 'İyi 80-95%', average: 'Orta 60-80%', low: 'Düşük <60%' };

export default function OverviewTab() {
    const { data, loading, isComparing, deltas, compareLabel, periodLabel, compareData, queryParams, refetch, startDate, endDate, minAttendancePct, minAttendanceEnabled } = useAnalytics();

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
    const [activeKPI, setActiveKPI] = useState(null);  // Universal KPI modal state

    const distChartData = useMemo(() => {
        if (!distribution) return [];
        return Object.entries(distribution)
            .map(([key, val]) => ({ name: DIST_LABELS[key] || key, value: val || 0, color: DIST_COLORS[key] || '#94a3b8' }))
            .filter(d => d.value > 0);
    }, [distribution]);

    const totalPeople = useMemo(() => distChartData.reduce((s, d) => s + d.value, 0), [distChartData]);

    const trendChartData = useMemo(() => {
        if (!trendData) return [];
        // Faz 3 fix (2026-05-17): Normal + OT ayrı stacked bar görünümü için
        // worked = normal + ot olduğundan, normal'i çıkarıp ayrı tutuyoruz.
        return trendData.map(m => {
            const worked = Math.round(m.worked_hours || m.total_worked_hours || 0);
            const ot = Math.round(m.ot_hours || m.overtime_hours || 0);
            const normal = Math.max(0, worked - ot);
            return {
                name: (m.label || '').replace(/\d{4}$/, '').trim(),
                'normal mesai': normal,
                'fazla mesai': ot,
                çalışma: worked, // backward compat (eski grafik kullanımı)
                hedef: Math.round(m.target_hours || 0),
            };
        });
    }, [trendData]);

    // sparklineWorked is reserved for future KPI sparklines
    const sparklineOT = useMemo(() => trendChartData.map(t => t['fazla mesai']), [trendChartData]);

    // Employee list for detail modal (from work_hours or entry_exit data)
    // + Frontend post-filter: backend filter eksik kalsa bile UI tutarli olsun.
    const employeeList = useMemo(() => {
        const workHours = effectiveData?.work_hours?.employee_hours || effectiveData?.work_hours?.per_employee || [];
        const entryExit = effectiveData?.entry_exit?.performance_ranking || [];
        let list;
        if (workHours.length > 0) list = workHours;
        else if (entryExit.length > 0) list = entryExit.map(e => ({
            ...e,
            efficiency_pct: e.work_score || 0,
            total_worked_hours: e.worked_hours || 0,
            total_overtime_hours: e.overtime_hours || 0,
            total_missing_hours: e.missing_hours || 0,
        }));
        else return [];

        // Frontend filter: Yapilan Normal Mesai/Yukumluluk < threshold ise haric tut
        if (minAttendanceEnabled && minAttendancePct > 0) {
            list = list.filter(e => {
                // Filter sadece olculenebilir kisilere uygulanir (target_h > 0)
                const fullTarget = e.target_hours ?? 0;
                if (fullTarget <= 0) return true;  // MWS yok -> goster
                const ndol = e.normal_completion_pct ?? e.efficiency_pct ?? 0;
                return ndol >= minAttendancePct;
            });
        }
        return list;
    }, [effectiveData, minAttendancePct, minAttendanceEnabled]);

    // ── KPI Detail Modal Configurations ──────────────────────────────
    // Her KPI tıklayınca açılır: title, formula, columns, sortKey, levelFn
    const KPI_CONFIGS = useMemo(() => ({
        normal_completion: {
            title: 'Yapılan Normal Mesai — Detay',
            icon: Target,
            formula: 'Normal Mesai (W) ÷ Pro-rata Yükümlülük (Y) × 100, cap [0,100]',
            description: 'Her çalışanın yaptığı normal mesainin (OT hariç) bu döneme kadar olan yükümlülüğüne oranı. Cap 100.',
            sortKey: 'normal_completion_pct',
            levelKey: 'normal_completion_pct',
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours' },
                { key: 'prorated_target_hours', label: 'Yükümlülük (sa)', type: 'hours' },
                { key: 'normal_completion_pct', label: 'Yap.M./Y', type: 'percent', highlight: true },
            ],
        },
        total_completion: {
            title: 'Toplam Yapılan Mesai — Detay',
            icon: TrendingUp,
            formula: '(Normal + Fazla Mesai) ÷ Yükümlülük × 100, UNCAPPED',
            description: 'Fazla mesai dahil toplam yapılan mesainin yükümlülüğe oranı. >100 = hedef üstüne çıktı.',
            sortKey: 'total_completion_pct',
            levelKey: 'total_completion_pct',
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours' },
                { key: 'ot_hours', label: 'Fazla M. (sa)', type: 'hours' },
                { key: 'prorated_target_hours', label: 'Yükümlülük (sa)', type: 'hours' },
                { key: 'total_completion_pct', label: 'Toplam/Y', type: 'percent', highlight: true },
            ],
        },
        ot_to_target: {
            title: 'Fazla Mesai / Yükümlülük — Detay',
            icon: Zap,
            formula: 'Fazla Mesai (OT) ÷ Pro-rata Yükümlülük × 100',
            description: 'Çalışanın yaptığı fazla mesainin yükümlülüğe oranı. Yüksek = aşırı yük olabilir.',
            sortKey: 'ot_to_target_pct',
            sortDir: 'desc',
            levelFn: (r) => {
                const v = r.ot_to_target_pct ?? 0;
                if (v >= 50) return 'low';      // çok yüksek = kırmızı
                if (v >= 25) return 'average';
                if (v >= 10) return 'good';
                return 'excellent';             // az = sağlıklı
            },
            columns: [
                { key: 'ot_hours', label: 'Fazla M. (sa)', type: 'hours' },
                { key: 'prorated_target_hours', label: 'Yükümlülük (sa)', type: 'hours' },
                { key: 'ot_to_target_pct', label: 'OT/Y', type: 'percent', highlight: true },
            ],
        },
        missing_to_target: {
            title: 'Eksik / Yükümlülük — Detay',
            icon: AlertCircle,
            formula: 'Eksik Mesai (M) ÷ Pro-rata Yükümlülük × 100, cap [0,100]',
            description: 'Eksik mesainin yükümlülüğe oranı. Yüksek = sorun. ABSENT günleri tam günlük eksik sayılır.',
            sortKey: 'missing_to_target_pct',
            sortDir: 'desc',
            levelFn: (r) => {
                const v = r.missing_to_target_pct ?? 0;
                if (v >= 30) return 'low';
                if (v >= 15) return 'average';
                if (v >= 5) return 'good';
                return 'excellent';
            },
            columns: [
                { key: 'missing_hours', label: 'Eksik (sa)', type: 'hours' },
                { key: 'prorated_target_hours', label: 'Yükümlülük (sa)', type: 'hours' },
                { key: 'missing_to_target_pct', label: 'Eksik/Y', type: 'percent', highlight: true },
            ],
        },
        normal_hours: {
            title: 'Normal Mesai (saat) — Detay',
            icon: Clock,
            formula: 'Σ normal_seconds ÷ 3600 (Fazla Mesai HARİÇ)',
            description: 'Çalışan başına saat cinsinden normal mesai. ABSENT günler 0 sayılır.',
            sortKey: 'normal_hours',
            sortDir: 'desc',
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours', highlight: true },
                { key: 'prorated_target_hours', label: 'Yükümlülük (sa)', type: 'hours' },
                { key: 'normal_completion_pct', label: 'Yap.M./Y', type: 'percent' },
            ],
        },
        worked_hours: {
            title: 'Toplam Çalışma (saat) — Detay',
            icon: Clock,
            formula: 'Σ (normal_seconds + calculated_overtime_seconds) ÷ 3600',
            description: 'Çalışan başına toplam çalışma saati (normal + fazla mesai dahil).',
            sortKey: 'worked_hours',
            sortDir: 'desc',
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours' },
                { key: 'ot_hours', label: 'Fazla M. (sa)', type: 'hours' },
                { key: 'worked_hours', label: 'Toplam (sa)', type: 'hours', highlight: true },
                { key: 'target_hours', label: 'Tam Hedef (sa)', type: 'hours' },
            ],
        },
        ot_hours: {
            title: 'Fazla Mesai (saat) — Detay',
            icon: Zap,
            formula: 'Σ calculated_overtime_seconds ÷ 3600 (APPROVED + APPROVED auto)',
            description: 'Çalışan başına onaylı fazla mesai saati (POTENTIAL hariç).',
            sortKey: 'ot_hours',
            sortDir: 'desc',
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours' },
                { key: 'ot_hours', label: 'Fazla M. (sa)', type: 'hours', highlight: true },
                { key: 'ot_to_normal_pct', label: 'OT/Normal', type: 'percent' },
                { key: 'ot_to_target_pct', label: 'OT/Y', type: 'percent' },
            ],
        },
        missing_hours: {
            title: 'Eksik Mesai (saat) — Detay',
            icon: AlertCircle,
            formula: 'Σ missing_seconds ÷ 3600 (ABSENT günleri DAHİL)',
            description: 'Çalışan başına eksik mesai saati. ABSENT günleri tam günlük eksik (örn. 9sa) sayılır.',
            sortKey: 'missing_hours',
            sortDir: 'desc',
            columns: [
                { key: 'missing_hours', label: 'Eksik (sa)', type: 'hours', highlight: true },
                { key: 'prorated_target_hours', label: 'Yükümlülük (sa)', type: 'hours' },
                { key: 'missing_to_target_pct', label: 'Eksik/Y', type: 'percent' },
            ],
        },
        attendance: {
            title: 'Devam Oranı — Detay',
            icon: CalendarCheck,
            formula: '(Toplam Kayıt − ABSENT) ÷ Toplam Kayıt × 100',
            description: 'Sadece sistemin "ABSENT" işaretlediği no-show günler oranı düşürür. Onaylı izin/sağlık raporu/dış görev günleri otomatik APPROVED kayıt yarattığından "gelmiş" sayılır. Tatil/hafta sonu kayıt oluşmadığı için hariç.',
            sortKey: 'attendance_pct',
            sortDir: 'asc',  // önce düşükler (problemli kişiler) görünsün
            levelFn: (r) => {
                const v = r.attendance_pct ?? 100;
                if (v >= 95) return 'excellent';
                if (v >= 85) return 'good';
                if (v >= 70) return 'average';
                return 'low';
            },
            columns: [
                { key: 'present_records', label: 'Gelen Kayıt', type: 'number' },
                { key: 'absent_days', label: 'ABSENT Gün', type: 'number' },
                { key: 'total_records', label: 'Toplam Kayıt', type: 'number' },
                { key: 'attendance_pct', label: 'Devam %', type: 'percent', highlight: true },
            ],
        },
        ot_to_normal: {
            title: 'Fazla Mesai / Normal — Detay',
            icon: TrendingUp,
            formula: 'Fazla Mesai ÷ Normal Mesai × 100 (Normal=0 → tanımsız)',
            description: 'Fazla mesainin normal mesaiye oranı. Normal mesai sıfırsa metrik tanımsız.',
            sortKey: 'ot_to_normal_pct',
            sortDir: 'desc',
            levelFn: (r) => {
                const v = r.ot_to_normal_pct;
                if (v == null) return null;
                if (v >= 50) return 'low';
                if (v >= 25) return 'average';
                if (v >= 10) return 'good';
                return 'excellent';
            },
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours' },
                { key: 'ot_hours', label: 'Fazla M. (sa)', type: 'hours' },
                { key: 'ot_to_normal_pct', label: 'OT/Normal', type: 'percent', highlight: true },
            ],
        },
        meal: {
            title: 'FM Yemek Oranı — Detay',
            icon: Coffee,
            formula: 'Yemek Alınan Onaylı FM Günü ÷ Toplam Onaylı FM Günü × 100',
            description: `Onaylı fazla mesai günlerinde yemek siparişi alınma oranı. Topluca: ${kpi?.total_meals || 0} yemek, ${kpi?.total_approved_ot_hours || 0} sa onaylı FM → her yemek başına ${kpi?.ot_hours_per_meal || 0} sa OT (${kpi?.meals_per_ot_hour || 0} yemek/saat).`,
            sortKey: 'meal_rate_pct',
            sortDir: 'desc',
            columns: [
                { key: 'approved_ot_days', label: 'Onaylı FM Günü', type: 'number' },
                { key: 'meal_days_on_ot', label: 'Yemekli FM Günü', type: 'number' },
                { key: 'meal_rate_pct', label: 'FM Yemek %', type: 'percent', highlight: true },
                { key: 'total_approved_ot_hours_emp', label: 'Onaylı FM (sa)', type: 'number' },
                { key: 'meal_orders', label: 'Toplam Yemek', type: 'number' },
                { key: 'ot_hours_per_meal', label: 'Saat/Yemek', type: 'number' },
            ],
        },
        break: {
            title: 'Ortalama Mola — Detay',
            icon: Coffee,
            formula: 'Avg(potential_break_seconds) ÷ 60 (dakika)',
            description: 'Çalışan başına ortalama günlük mola dakikası. potential_break_seconds = vardiya içi check_out / check_in arasındaki boşluklardan algılanan.',
            sortKey: 'avg_break_minutes',
            sortDir: 'desc',
            levelFn: (r) => {
                const v = r.avg_break_minutes ?? 0;
                if (v >= 90) return 'low';      // çok uzun mola
                if (v >= 75) return 'average';
                if (v >= 60) return 'good';
                return 'excellent';
            },
            columns: [
                { key: 'avg_break_minutes', label: 'Ort. Mola (dk)', type: 'minutes', highlight: true },
            ],
        },
        team: {
            title: 'Ekip Üyeleri — Detay',
            icon: Users,
            formula: 'Yetki kapsamındaki çalışan listesi',
            description: 'Yöneticisi olduğun veya tüm şirket görme yetkin varsa tüm çalışanlar.',
            sortKey: 'name',
            sortDir: 'asc',
            columns: [
                { key: 'normal_hours', label: 'Normal (sa)', type: 'hours' },
                { key: 'ot_hours', label: 'Fazla M. (sa)', type: 'hours' },
                { key: 'missing_hours', label: 'Eksik (sa)', type: 'hours' },
            ],
        },
    }), [kpi?.total_meals, kpi?.total_approved_ot_hours, kpi?.ot_hours_per_meal, kpi?.meals_per_ot_hour]);

    const openKPI = (key) => {
        const cfg = KPI_CONFIGS[key];
        if (cfg) setActiveKPI({ key, ...cfg });
    };

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

            {/* ═══ Comparison Summary Banner ═══ */}
            {isComparing && cmpKpi && (
                <div className="bg-gradient-to-r from-violet-50/80 to-indigo-50/80 rounded-2xl border border-violet-200/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <GitCompare size={14} className="text-violet-500" />
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Dönem Karşılaştırması</span>
                        <span className="text-[10px] text-violet-400">{periodLabel} vs {compareLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {(() => {
                            // Y1 fix (2026-05-17): Her metrik için mutlak fark + birim göster.
                            // % metrikleri (efficiency) için percentage-point diff.
                            // Saat metrikleri için saat diff. Eskiden hepsi "%" suffix ile gösteriliyordu.
                            // Ayrıca: betterIsHigher semantic — artış iyi mi kötü mü?
                            const round = (n) => Math.round(n || 0);
                            const items = [
                                {
                                    label: 'Mesai Doluluğu',
                                    curr: `%${kpi.avg_efficiency_pct || 0}`,
                                    prev: `%${cmpKpi.avg_efficiency_pct || 0}`,
                                    // D4: yüzde metriği için göreli-% YANLIŞ (%50→%60 göreli +%20 yanıltıcı).
                                    // Yalnızca pp (puan farkı) göster — null ile parantezli göreli-% gizlenir.
                                    pct: null,
                                    absDiff: round((kpi.avg_efficiency_pct || 0) - (cmpKpi.avg_efficiency_pct || 0)),
                                    unit: 'pp', // percentage points
                                    betterIsHigher: true,
                                },
                                {
                                    label: 'Çalışma',
                                    curr: `${round(kpi.total_worked_hours)}h`,
                                    prev: `${round(cmpKpi.total_worked_hours)}h`,
                                    pct: deltas?.worked,
                                    absDiff: round((kpi.total_worked_hours || 0) - (cmpKpi.total_worked_hours || 0)),
                                    unit: 'h',
                                    betterIsHigher: true,
                                },
                                {
                                    label: 'Fazla Mesai',
                                    curr: `${round(kpi.total_overtime_hours)}h`,
                                    prev: `${round(cmpKpi.total_overtime_hours)}h`,
                                    pct: deltas?.overtime,
                                    absDiff: round((kpi.total_overtime_hours || 0) - (cmpKpi.total_overtime_hours || 0)),
                                    unit: 'h',
                                    betterIsHigher: null, // OT artışı/azalışı semantik değil
                                },
                                {
                                    label: 'Kayıp',
                                    curr: `${round(kpi.total_missing_hours)}h`,
                                    prev: `${round(cmpKpi.total_missing_hours)}h`,
                                    pct: deltas?.missing,
                                    absDiff: round((kpi.total_missing_hours || 0) - (cmpKpi.total_missing_hours || 0)),
                                    unit: 'h',
                                    betterIsHigher: false, // Kayıp artışı kötü
                                },
                            ];
                            return items.map((item, i) => {
                                const hasPct = item.pct != null;
                                const isImproved = item.absDiff === 0 || item.betterIsHigher === null
                                    ? null
                                    : item.betterIsHigher
                                    ? item.absDiff > 0
                                    : item.absDiff < 0;
                                const colorCls = isImproved === null
                                    ? 'text-slate-500 bg-slate-50'
                                    : isImproved
                                    ? 'text-emerald-600 bg-emerald-50'
                                    : 'text-red-600 bg-red-50';
                                return (
                                    <div key={i} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/80">
                                        <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mb-1">{item.label}</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-black text-slate-800">{item.curr}</span>
                                            <span className="text-[10px] text-slate-400">vs</span>
                                            <span className="text-sm font-bold text-slate-500">{item.prev}</span>
                                        </div>
                                        <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${colorCls}`}>
                                            {item.absDiff >= 0 ? '+' : ''}{item.absDiff}{item.unit}
                                            {hasPct && <span className="opacity-70 ml-1">({item.pct >= 0 ? '+' : ''}{item.pct}%)</span>}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {/* ── Ana 4 Doluluk Metriği (Saglik Skoru kalkti) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* D4 fix (2026-05-30): yüzde metriği — pp delta (goreli-% değil) */}
                <KPICard title="Yapılan Normal Mesai" value={`${kpi.avg_normal_completion_pct ?? kpi.avg_efficiency_pct ?? 0}`} suffix="%" icon={Target}
                    gradient="indigo" delta={isComparing ? deltas?.efficiencyPp : null} deltaSuffix="pp"
                    subtitle="Normal / Yükümlülük (cap 100)" info={METRIC_EXPLANATIONS.efficiency}
                    onClick={() => openKPI('normal_completion')} />
                <KPICard title="Toplam Yapılan Mesai" value={`${kpi.avg_total_completion_pct ?? 0}`} suffix="%" icon={TrendingUp}
                    gradient="emerald"
                    subtitle="(Normal + Fazla Mesai) / Yükümlülük"
                    onClick={() => openKPI('total_completion')} />
                <KPICard title="Fazla Mesai / Yükümlülük" value={`${kpi.avg_ot_to_target_pct ?? 0}`} suffix="%" icon={Zap}
                    gradient="amber"
                    subtitle="Fazla mesai oranı"
                    onClick={() => openKPI('ot_to_target')} />
                <KPICard title="Eksik / Yükümlülük" value={`${kpi.avg_missing_to_target_pct ?? 0}`} suffix="%" icon={AlertCircle}
                    gradient="red"
                    subtitle="Eksik mesai oranı"
                    onClick={() => openKPI('missing_to_target')} />
            </div>

            {/* ── Saat Bazlı Toplamlar (4 mini KPI) ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* Y2 fix (2026-05-17): Backend total_normal_hours her zaman döner; fallback kaldırıldı
                    (eski max(0, worked-ot) OT>worked edge case'inde 0 göstererek yanıltıyordu) */}
                <KPICard mini title="Normal Mesai" value={Math.round(kpi.total_normal_hours || 0)} suffix="sa" icon={Clock} gradient="indigo"
                    subtitle={`Yükümlülük: ${Math.round(kpi.prorated_target_hours || 0)}sa`}
                    onClick={() => openKPI('normal_hours')} />
                <KPICard mini title="Toplam Çalışma" value={Math.round(kpi.total_worked_hours || 0)} suffix="sa" icon={Clock} gradient="blue"
                    delta={isComparing ? deltas?.worked : null}
                    subtitle={`Hedef: ${Math.round(kpi.total_target_hours || 0)}sa`} info={METRIC_EXPLANATIONS.worked_hours}
                    onClick={() => openKPI('worked_hours')} />
                <KPICard mini title="Fazla Mesai" value={Math.round(kpi.total_overtime_hours || 0)} suffix="sa" icon={Zap} gradient="amber"
                    delta={isComparing ? deltas?.overtime : kpi.vs_prev?.ot}
                    sparkline={sparklineOT} info={METRIC_EXPLANATIONS.overtime}
                    onClick={() => openKPI('ot_hours')} />
                <KPICard mini title="Eksik Mesai" value={Math.round(kpi.total_missing_hours || 0)} suffix="sa" icon={AlertCircle} gradient="red"
                    delta={isComparing ? deltas?.missing : kpi.vs_prev?.missing}
                    invertColor
                    info={METRIC_EXPLANATIONS.missing_hours}
                    onClick={() => openKPI('missing_hours')} />
            </div>

            {/* ── Diğer ekip metrikleri (mini KPI) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <KPICard mini title="Ekip Üyesi" value={overview?.employee_count || 0} suffix="kişi" icon={Users} gradient="slate"
                    onClick={() => openKPI('team')} />
                {/* D4 fix (2026-05-30): yüzde metriği — pp delta (goreli-% değil) */}
                <KPICard mini title="Devam Oranı" value={`${kpi.attendance_rate_pct || 0}`} suffix="%" icon={CalendarCheck} gradient="blue"
                    delta={isComparing ? deltas?.attendancePp : null} deltaSuffix="pp" info={METRIC_EXPLANATIONS.attendance_rate}
                    onClick={() => openKPI('attendance')} />
                <KPICard mini title="Fazla Mesai/Normal" value={kpi.avg_ot_to_normal_pct == null ? '—' : `${kpi.avg_ot_to_normal_pct}`} suffix={kpi.avg_ot_to_normal_pct == null ? '' : '%'} icon={TrendingUp} gradient="violet"
                    onClick={() => openKPI('ot_to_normal')} />
                {/* O13 fix (2026-05-17): approved_ot_days=0 ise "—" göster (eski "%0" yanıltıcı) */}
                <KPICard mini title="FM Yemek Oranı"
                    value={(kpi.approved_ot_days || 0) === 0 ? '—' : `${kpi.meal_rate_pct || 0}`}
                    suffix={(kpi.approved_ot_days || 0) === 0 ? '' : '%'}
                    icon={Coffee} gradient="amber"
                    subtitle={(kpi.approved_ot_days || 0) === 0
                        ? 'Bu dönem onaylı FM günü yok'
                        : (kpi.ot_hours_per_meal ? `~${kpi.ot_hours_per_meal} sa OT/yemek` : 'Onaylı FM günü kapsamı')}
                    info={METRIC_EXPLANATIONS.meal_rate}
                    onClick={() => openKPI('meal')} />
                <KPICard mini title="Ort. Mola" value={kpi.avg_break_minutes || 0} suffix="dk" icon={Coffee} gradient="cyan"
                    info={METRIC_EXPLANATIONS.break_minutes}
                    onClick={() => openKPI('break')} />
            </div>

            {/* Mesai Doluluk Dağılımı — full width */}
            <SectionCard title="Mesai Doluluk Dağılımı" icon={Target} iconGradient="from-indigo-500 to-indigo-600"
                subtitle={`${totalPeople} çalışan`} collapsible defaultOpen
                headerExtra={
                    <button onClick={() => setShowDetailModal(true)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60">
                        <ExternalLink size={10} /> Detayları Göster
                    </button>
                }>
                {distChartData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
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

            {/* ═══ Workforce Panel — 6 KPI Tier 1 (collapsible) ═══ */}
            <SectionCard
                title="İşgücü Metrikleri (6 KPI)"
                subtitle="Kıdem · Yönetici Yükü · İzin · Onay Süresi · Vekalet · Eksik Saat"
                icon={Award}
                iconGradient="from-violet-500 to-purple-600"
                collapsible
                defaultOpen
            >
                <WorkforcePanel />
            </SectionCard>

            {/* Efficiency Detail Modal — "Detayları Göster" butonu ile acilir (Mesai Doluluk Dagilimi alti) */}
            <EfficiencyDetailModal
                open={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                employees={employeeList}
            />

            {/* Universal KPI Detail Modal — herhangi bir KPI'ya tiklayinca acilir */}
            <KPIDetailModal
                open={!!activeKPI}
                onClose={() => setActiveKPI(null)}
                title={activeKPI?.title}
                icon={activeKPI?.icon}
                formula={activeKPI?.formula}
                description={activeKPI?.description}
                columns={activeKPI?.columns || []}
                sortKey={activeKPI?.sortKey}
                sortDir={activeKPI?.sortDir || 'desc'}
                levelFn={activeKPI?.levelFn}
                levelKey={activeKPI?.levelKey}
                data={employeeList}
            />
        </div>
    );
}
