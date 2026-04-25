import React, { useState, useEffect } from 'react';
import { Tag } from 'antd';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Calendar,
    AlertCircle, Hourglass, Lightbulb, X as XIcon, Sparkles,
} from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * InsightsBanner — backend insights endpoint'inden gelen otomatik
 * öngörüleri kart şeklinde gösterir.
 *
 * Severity renk kodlaması:
 *   alert    → kırmızı (aksiyon gerek)
 *   warning  → sarı (dikkat)
 *   info     → mavi (bilgi)
 *   positive → yeşil (iyi haber)
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
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        title: 'text-red-800',
        text: 'text-red-700',
        tag: 'red',
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        title: 'text-amber-800',
        text: 'text-amber-700',
        tag: 'gold',
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-800',
        text: 'text-blue-700',
        tag: 'blue',
    },
    positive: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: 'text-emerald-600',
        title: 'text-emerald-800',
        text: 'text-emerald-700',
        tag: 'green',
    },
};

export default function InsightsBanner() {
    const { queryParams } = useAnalytics();
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState({});
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (!queryParams?.start_date) return;
        let cancelled = false;
        setLoading(true);
        api.get('/attendance-analytics/insights/', { params: queryParams, timeout: 30000 })
            .then((res) => {
                if (!cancelled) setInsights(res.data?.insights || []);
            })
            .catch(() => {
                if (!cancelled) setInsights([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [queryParams]);

    const visibleInsights = insights.filter((_, i) => !dismissed[i]);

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-400">
                <Sparkles size={12} className="inline mr-1.5" />
                Otomatik içgörüler hazırlanıyor…
            </div>
        );
    }

    if (visibleInsights.length === 0) return null;

    return (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/60 to-blue-50/60 shadow-sm">
            <button
                type="button"
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-indigo-50/40 transition-colors"
                onClick={() => setCollapsed((v) => !v)}
            >
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        Otomatik İçgörüler
                    </span>
                    <Tag color="blue" className="ml-1">{visibleInsights.length}</Tag>
                </div>
                <span className="text-xs text-indigo-500">
                    {collapsed ? 'Göster' : 'Gizle'}
                </span>
            </button>

            {!collapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 pt-0">
                    {visibleInsights.map((ins, idx) => {
                        const cfg = SEVERITY_CFG[ins.severity] || SEVERITY_CFG.info;
                        const Icon = ICON_MAP[ins.icon] || Lightbulb;
                        return (
                            <div
                                key={idx}
                                className={`relative rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2.5 group`}
                            >
                                <div className="flex items-start gap-2">
                                    <Icon size={16} className={`flex-shrink-0 mt-0.5 ${cfg.icon}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-bold ${cfg.title} mb-0.5`}>
                                            {ins.title}
                                        </div>
                                        <div className={`text-[11px] leading-relaxed ${cfg.text}`}>
                                            {ins.message}
                                        </div>
                                        {ins.action?.label && (
                                            <a
                                                href={ins.action.route}
                                                className="inline-block mt-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                                            >
                                                {ins.action.label} →
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDismissed((d) => ({ ...d, [idx]: true })); }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 transition-opacity"
                                        aria-label="Gizle"
                                    >
                                        <XIcon size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
