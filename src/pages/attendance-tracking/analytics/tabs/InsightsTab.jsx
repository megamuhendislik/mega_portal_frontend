import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tag, Button, Segmented, Tooltip } from 'antd';
import {
    Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
    Calendar, AlertCircle, Hourglass, Lightbulb, RotateCw, Filter,
    ArrowRight, Users, Activity, Flame,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';
import { LoadingSkeleton } from '../shared/EmptyState';
import ScopeBanner from '../shared/ScopeBanner';
import InsightDetailDrawer from '../shared/InsightDetailDrawer';
import SeverityCompass from '../shared/SeverityCompass';

/**
 * InsightsTab v2 (2026-05-17 audit) — Öngörüler odaklı landing tab.
 *
 * Yenilikler:
 *  - Severity dağılımı + dönem karşılaştırma summary banner
 *  - Aksiyon paneli (kart sayısı, etkilenen kişi toplamı, kritik kart sayısı)
 *  - Insight kartında affected_count rozeti (backend'den listing'te döner) + ilk 3 isim chip'i
 *  - "Bu hesap nasıl yapılıyor?" inline tooltipler
 *  - Mini-trend mikro grafik (OT/Eksik trend için)
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
        bg: 'bg-red-50', border: 'border-red-200', soft: 'bg-red-100/60',
        icon: 'text-red-600', title: 'text-red-800', text: 'text-red-700',
        tag: 'red', label: 'Aksiyon Gerekli', dot: 'bg-red-500',
        cta: 'text-red-600 hover:text-red-800',
        accent: '#dc2626',
    },
    warning: {
        bg: 'bg-amber-50', border: 'border-amber-200', soft: 'bg-amber-100/60',
        icon: 'text-amber-600', title: 'text-amber-800', text: 'text-amber-700',
        tag: 'gold', label: 'Uyarı', dot: 'bg-amber-500',
        cta: 'text-amber-600 hover:text-amber-800',
        accent: '#d97706',
    },
    info: {
        bg: 'bg-blue-50', border: 'border-blue-200', soft: 'bg-blue-100/60',
        icon: 'text-blue-600', title: 'text-blue-800', text: 'text-blue-700',
        tag: 'blue', label: 'Bilgi', dot: 'bg-blue-500',
        cta: 'text-blue-600 hover:text-blue-800',
        accent: '#2563eb',
    },
    positive: {
        bg: 'bg-emerald-50', border: 'border-emerald-200', soft: 'bg-emerald-100/60',
        icon: 'text-emerald-600', title: 'text-emerald-800', text: 'text-emerald-700',
        tag: 'green', label: 'Pozitif', dot: 'bg-emerald-500',
        cta: 'text-emerald-600 hover:text-emerald-800',
        accent: '#059669',
    },
};

const FILTERS = [
    { value: 'all', label: 'Tümü' },
    { value: 'alert', label: 'Aksiyon' },
    { value: 'warning', label: 'Uyarı' },
    { value: 'info', label: 'Bilgi' },
    { value: 'positive', label: 'Pozitif' },
];

// Renkli avatar üretici
const AVATAR_COLORS = [
    'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
];
function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < String(name || '').length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// KPI Tile
function StatTile({ icon: Icon, label, value, sub, accent = 'indigo', onClick }) {
    const colorMap = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', sub: 'text-indigo-400', icon: 'text-indigo-600', border: 'border-indigo-200' },
        red: { bg: 'bg-red-50', text: 'text-red-700', sub: 'text-red-400', icon: 'text-red-600', border: 'border-red-200' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-800', sub: 'text-amber-500', icon: 'text-amber-600', border: 'border-amber-200' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-400', icon: 'text-emerald-600', border: 'border-emerald-200' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-700', sub: 'text-slate-400', icon: 'text-slate-600', border: 'border-slate-200' },
    };
    const c = colorMap[accent] || colorMap.indigo;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`text-left ${c.bg} border ${c.border} rounded-2xl px-4 py-3 transition-all w-full ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${c.sub}`}>{label}</div>
                    <div className={`mt-1 text-2xl font-black tabular-nums ${c.text}`}>{value}</div>
                    {sub && <div className={`text-[11px] mt-0.5 ${c.sub} font-medium`}>{sub}</div>}
                </div>
                <div className={`p-2 rounded-lg bg-white ${c.icon} shadow-sm`}>
                    <Icon size={16} />
                </div>
            </div>
        </button>
    );
}

// Affected preview row — chip stack
function AffectedChips({ count, preview, severity }) {
    const cfg = SEVERITY_CFG[severity] || SEVERITY_CFG.info;
    if (!count || count === 0) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Users size={11} />
                Genel ekip içgörüsü
            </span>
        );
    }
    return (
        <div className="flex items-center gap-2">
            {Array.isArray(preview) && preview.length > 0 ? (
                <div className="flex -space-x-2">
                    {preview.map((name, idx) => (
                        <Tooltip key={`${name}-${idx}`} title={name}>
                            <div
                                className={`h-6 w-6 rounded-full ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center ${avatarColor(name)}`}
                            >
                                {initials(name)}
                            </div>
                        </Tooltip>
                    ))}
                </div>
            ) : null}
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cfg.title} bg-white/60 px-2 py-0.5 rounded-full`}>
                <span className="tabular-nums">{count}</span>
                <span className="text-slate-400 font-medium">kişi</span>
            </span>
        </div>
    );
}

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

    // Backend severity_counts varsa onu kullan, yoksa client-side hesapla
    const severityCounts = useMemo(() => {
        if (data?.severity_counts) return data.severity_counts;
        const counts = { alert: 0, warning: 0, info: 0, positive: 0 };
        insights.forEach((i) => {
            if (counts[i.severity] !== undefined) counts[i.severity]++;
        });
        return counts;
    }, [data, insights]);

    const totalAffected = useMemo(
        () => insights.reduce((sum, i) => sum + (i.affected_count || 0), 0),
        [insights],
    );

    const criticalCount = severityCounts.alert || 0;

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

    const period = data?.period;
    const prevPeriod = data?.previous_period;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* ═══ Kapsam göstergesi (Ekibim vs Tüm Şirket) ═══ */}
            <ScopeBanner startDate={startDate} endDate={endDate} />

            {/* ═══ Header — başlık + yenile butonu ═══ */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-5 shadow-sm">
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Sparkles size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Otomatik Öngörüler</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {period && (
                                    <>
                                        <span className="font-mono">{period.start} → {period.end}</span>
                                        {prevPeriod && (
                                            <span className="text-slate-400"> · önceki dönem: <span className="font-mono">{prevPeriod.start} → {prevPeriod.end}</span></span>
                                        )}
                                    </>
                                )}
                                {data?.generated_at && (
                                    <> · son güncelleme: {new Date(data.generated_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</>
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
            </div>

            {/* ═══ Aksiyon Paneli — Üst KPI'lar ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile
                    icon={Flame}
                    label="Kritik (Aksiyon)"
                    value={criticalCount}
                    sub={criticalCount > 0 ? 'En önce bakın' : 'Şu an kritik yok'}
                    accent={criticalCount > 0 ? 'red' : 'emerald'}
                    onClick={() => setFilter('alert')}
                />
                <StatTile
                    icon={AlertTriangle}
                    label="Uyarı"
                    value={severityCounts.warning || 0}
                    sub="İzlenmesi gereken"
                    accent="amber"
                    onClick={() => setFilter('warning')}
                />
                <StatTile
                    icon={Activity}
                    label="Toplam Öngörü"
                    value={insights.length}
                    sub={`${filteredInsights.length} filtreli görünüm`}
                    accent="indigo"
                    onClick={() => setFilter('all')}
                />
                <StatTile
                    icon={Users}
                    label="Etkilenen Kişi"
                    value={totalAffected}
                    sub="Tüm öngörüler toplamı"
                    accent="slate"
                />
            </div>

            {/* ═══ Severity Compass — 4-quadrant pusula ═══ */}
            <SeverityCompass
                title="Öngörü Pusulası"
                subtitle={`${insights.length} öngörü · K=Aksiyon, D=Uyarı, G=Bilgi, B=Pozitif · segmente tıkla → filtre`}
                counts={severityCounts}
                activeKey={filter === 'all' ? null : filter}
                onSegmentClick={(k) => setFilter(k || 'all')}
                size={340}
            />

            {/* ═══ Filter bar ═══ */}
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
                    Toplam: <span className="font-bold text-slate-700">{filteredInsights.length}</span> öngörü
                </span>
            </div>

            {/* ═══ Insight Cards ═══ */}
            {sortedInsights.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                    <Sparkles size={32} className="mx-auto mb-3 text-slate-300" />
                    <h3 className="font-semibold text-slate-700 mb-1">
                        {filter === 'all'
                            ? 'Bu dönem için öngörü yok'
                            : `"${SEVERITY_CFG[filter]?.label}" kategorisinde öngörü yok`}
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
                        const hasCode = Boolean(ins.code);
                        return (
                            <div
                                key={`${ins.code || ins.severity}-${idx}`}
                                className={`relative rounded-xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col`}
                            >
                                {/* Severity stripe (sol kenarda dik bar) */}
                                <span
                                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r"
                                    style={{ background: cfg.accent }}
                                    aria-hidden
                                />

                                <div className="flex items-start gap-3 flex-1 pl-1">
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

                                {/* Card footer — affected + detail CTA */}
                                {hasCode && (
                                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                                        <AffectedChips
                                            count={ins.affected_count || 0}
                                            preview={ins.affected_preview}
                                            severity={ins.severity}
                                        />
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

            {/* ═══ Footer note ═══ */}
            <div className="text-center text-xs text-slate-400">
                Öngörüler heuristic kurallar tarafından otomatik üretilir.
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
