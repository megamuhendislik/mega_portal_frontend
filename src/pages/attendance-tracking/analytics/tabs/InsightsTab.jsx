import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tag, Button, Segmented } from 'antd';
import {
    Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
    Calendar, AlertCircle, Hourglass, Lightbulb, RotateCw, Filter,
    ArrowRight, Users,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import { LoadingSkeleton } from '../shared/EmptyState';
import ScopeBanner from '../shared/ScopeBanner';
import InsightDetailDrawer from '../shared/InsightDetailDrawer';

/**
 * InsightsTab — Otomatik İçgörüler tam-ekran sekmesi.
 *
 * Banner'a göre farkları:
 *  - Severity filtreleme (Tümü / Aksiyon / Uyarı / Bilgi / Pozitif)
 *  - Üst KPI bar (severity chip'leri)
 *  - 1-2 kolon büyük kartlar (banner'da 3-col sıkışık)
 *  - Manuel refresh butonu
 *  - Detaylı boş state mesajı
 *  - Generated_at zaman damgası
 *  - Insight kartına click → InsightDetailDrawer (etkilenen kişiler + evidence + öneriler)
 *
 * Backend: GET /api/attendance-analytics/insights/
 *          GET /api/attendance-analytics/insight-detail/?code=<CODE>
 */

const ICON_MAP = {
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    'alert-triangle': AlertTriangle,
    'alert-circle': AlertCircle,
    'check-circle': CheckCircle2,
    'calendar': Calendar,
    'hourglass': Hourglass,
    'lightbulb': Lightbulb,
};

const SEVERITY_CFG = {
    alert: {
        bg: 'bg-red-50', border: 'border-red-200',
        icon: 'text-red-600', title: 'text-red-800', text: 'text-red-700',
        tag: 'red', label: 'Aksiyon Gerekli',
        cta: 'text-red-600 hover:text-red-800',
    },
    warning: {
        bg: 'bg-amber-50', border: 'border-amber-200',
        icon: 'text-amber-600', title: 'text-amber-800', text: 'text-amber-700',
        tag: 'gold', label: 'Uyarı',
        cta: 'text-amber-600 hover:text-amber-800',
    },
    info: {
        bg: 'bg-blue-50', border: 'border-blue-200',
        icon: 'text-blue-600', title: 'text-blue-800', text: 'text-blue-700',
        tag: 'blue', label: 'Bilgi',
        cta: 'text-blue-600 hover:text-blue-800',
    },
    positive: {
        bg: 'bg-emerald-50', border: 'border-emerald-200',
        icon: 'text-emerald-600', title: 'text-emerald-800', text: 'text-emerald-700',
        tag: 'green', label: 'Pozitif',
        cta: 'text-emerald-600 hover:text-emerald-800',
    },
};

const FILTERS = [
    { value: 'all', label: 'Tümü', color: 'default' },
    { value: 'alert', label: 'Aksiyon', color: 'red' },
    { value: 'warning', label: 'Uyarı', color: 'gold' },
    { value: 'info', label: 'Bilgi', color: 'blue' },
    { value: 'positive', label: 'Pozitif', color: 'green' },
];

export default function InsightsTab() {
    const { queryParams, startDate, endDate } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const fetchInsights = useCallback(async () => {
        if (!queryParams?.start_date) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/insights/', {
                params: queryParams, timeout: 30000,
            });
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Yüklenemedi');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchInsights(); }, [fetchInsights, refreshKey]);

    const insights = useMemo(() => data?.insights || [], [data]);

    // Severity sayıları
    const severityCounts = useMemo(() => {
        const counts = { alert: 0, warning: 0, info: 0, positive: 0 };
        insights.forEach((i) => {
            if (counts[i.severity] !== undefined) counts[i.severity]++;
        });
        return counts;
    }, [insights]);

    // Filtreli liste
    const filteredInsights = useMemo(() => {
        if (filter === 'all') return insights;
        return insights.filter((i) => i.severity === filter);
    }, [insights, filter]);

    // Severity sıralaması
    const sortedInsights = useMemo(() => {
        const order = { alert: 3, warning: 2, info: 1, positive: 0 };
        return [...filteredInsights].sort((a, b) => (order[b.severity] || 0) - (order[a.severity] || 0));
    }, [filteredInsights]);

    const openDrawer = useCallback((insight) => {
        setSelectedInsight(insight);
        setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        // Drawer animation süresi sonrası temizle
        setTimeout(() => setSelectedInsight(null), 300);
    }, []);

    if (loading) {
        return <LoadingSkeleton rows={5} />;
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
                <h3 className="font-bold text-red-800 mb-1">İçgörüler yüklenemedi</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <Button icon={<RotateCw size={14} />} onClick={() => setRefreshKey((k) => k + 1)} danger>
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi (Ekibim vs Tüm Şirket) ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* Header */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Sparkles size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Otomatik İçgörüler</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Heuristic kurallarla bu dönem için tespit edilen öneriler
                                {data?.generated_at && (
                                    <> · <span className="text-slate-400">son güncelleme: {new Date(data.generated_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></>
                                )}
                            </p>
                        </div>
                    </div>
                    <Button
                        icon={<RotateCw size={14} />}
                        onClick={() => setRefreshKey((k) => k + 1)}
                        size="middle"
                    >
                        Yenile
                    </Button>
                </div>

                {/* Severity counts */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {Object.entries(severityCounts).map(([sev, count]) => {
                        const cfg = SEVERITY_CFG[sev];
                        return (
                            <div
                                key={sev}
                                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 cursor-pointer hover:shadow-sm transition-all ${filter === sev ? 'ring-2 ring-indigo-300' : ''}`}
                                onClick={() => setFilter(filter === sev ? 'all' : sev)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${cfg.title}`}>
                                        {cfg.label}
                                    </span>
                                    <Tag color={cfg.tag} className="text-xs font-bold">{count}</Tag>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    <Filter size={12} /> Filtre:
                </div>
                <Segmented
                    value={filter}
                    onChange={setFilter}
                    options={FILTERS.map((f) => ({
                        value: f.value,
                        label: (
                            <span className="text-xs font-medium px-1">
                                {f.label}
                                {f.value !== 'all' && severityCounts[f.value] > 0 && (
                                    <span className="ml-1.5 text-[10px] text-slate-400">({severityCounts[f.value]})</span>
                                )}
                            </span>
                        ),
                    }))}
                    size="middle"
                />
                <span className="ml-auto text-[11px] text-slate-400">
                    Toplam: <span className="font-bold text-slate-700">{filteredInsights.length}</span> içgörü
                </span>
            </div>

            {/* Insights cards */}
            {sortedInsights.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                    <Sparkles size={32} className="mx-auto mb-3 text-slate-300" />
                    <h3 className="font-semibold text-slate-700 mb-1">
                        {filter === 'all'
                            ? 'Bu dönem için içgörü yok'
                            : `"${SEVERITY_CFG[filter]?.label}" kategorisinde içgörü yok`}
                    </h3>
                    <p className="text-sm text-slate-500">
                        Heuristic kurallar bu dönemde tetiklenmedi. Başka bir dönem deneyebilir
                        veya yenileyebilirsiniz.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {sortedInsights.map((ins, idx) => {
                        const cfg = SEVERITY_CFG[ins.severity] || SEVERITY_CFG.info;
                        const Icon = ICON_MAP[ins.icon] || Lightbulb;
                        const affectedCount = ins.affected_count
                            ?? (Array.isArray(ins.affected_employees) ? ins.affected_employees.length : 0);
                        const hasCode = Boolean(ins.code);
                        return (
                            <div
                                key={`${ins.severity}-${idx}`}
                                className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col`}
                            >
                                <div className="flex items-start gap-3 flex-1">
                                    <div className={`p-2 rounded-lg bg-white ${cfg.icon} flex-shrink-0`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className={`text-sm font-bold ${cfg.title}`}>{ins.title}</h3>
                                            <Tag color={cfg.tag} className="flex-shrink-0 text-[10px]">
                                                {cfg.label}
                                            </Tag>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${cfg.text} mb-3`}>
                                            {ins.message}
                                        </p>
                                        {ins.action?.label && !hasCode && (
                                            <a
                                                href={ins.action.route}
                                                className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.cta} hover:underline`}
                                            >
                                                {ins.action.label}
                                                <ArrowRight size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Card footer — affected count + detail CTA */}
                                {hasCode && (
                                    <div className={`mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap`}>
                                        {affectedCount > 0 ? (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/60 px-2 py-1 rounded-full">
                                                <Users size={11} className={cfg.icon} />
                                                <span className="tabular-nums">{affectedCount}</span>
                                                <span className="text-slate-400 font-medium">kişi etkileniyor</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                                                <Users size={11} />
                                                Genel ekip içgörüsü
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => openDrawer(ins)}
                                            className={`inline-flex items-center gap-1 text-xs font-bold ${cfg.cta} hover:underline transition-colors`}
                                        >
                                            Detayları Gör
                                            <ArrowRight size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer note */}
            <div className="text-center text-xs text-slate-400">
                Bu içgörüler heuristic kurallar tarafından otomatik üretilir.
                Aksiyon almadan önce ilgili kişiyle veya verilerle doğrulayın.
            </div>

            {/* Detail Drawer */}
            <InsightDetailDrawer
                open={drawerOpen}
                onClose={closeDrawer}
                insight={selectedInsight}
            />
        </div>
    );
}
