import React, { useState, useEffect, useMemo } from 'react';
import { Collapse, Tag, Empty, Tooltip } from 'antd';
import { AlertTriangle, TrendingUp, TrendingDown, User, Info } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * AnomaliesPanel — anomali tespit sonuçlarını gösteren collapsible panel.
 *
 * Backend: GET /api/attendance-analytics/anomalies/?threshold=2.0
 *
 * Severity renk kodlaması:
 *  - critical (|z|>=3)  → red
 *  - high     (|z|>=2.5) → orange
 *  - medium   (|z|>=2.0) → amber
 *  - low      → slate
 *
 * Direction:
 *  - above  → TrendingUp icon (ortalamadan yüksek)
 *  - below  → TrendingDown icon (ortalamadan düşük)
 */

const SEVERITY_COLORS = {
    critical: { color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    high: { color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    medium: { color: 'gold', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    low: { color: 'default', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
};

const SEVERITY_LABELS = {
    critical: 'Kritik',
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük',
};

const METRIC_LABELS = {
    overtime_hours: 'Ek Mesai',
    worked_hours: 'Çalışma Saati',
    absence_days: 'Devamsızlık',
    meal_count: 'Yemek Siparişi',
};

const METRIC_UNITS = {
    overtime_hours: 'sa',
    worked_hours: 'sa',
    absence_days: 'gün',
    meal_count: '',
};

export default function AnomaliesPanel({ threshold = 2.0, autoFetch = true }) {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!autoFetch || !queryParams?.start_date) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        api.get('/attendance-analytics/anomalies/', {
            params: { ...queryParams, threshold },
            timeout: 30000,
        })
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err?.response?.data?.error || err?.message || 'Anomali yüklenemedi');
                    setData(null);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [queryParams, threshold, autoFetch]);

    // Tüm metrikler birleşik, severity sırasına göre
    const allAnomalies = useMemo(() => {
        if (!data?.metrics) return [];
        const list = [];
        Object.entries(data.metrics).forEach(([metric, m]) => {
            (m.anomalies || []).forEach((a) => {
                list.push({ ...a, metricLabel: m.label || METRIC_LABELS[metric] || metric });
            });
        });
        const rank = { critical: 3, high: 2, medium: 1, low: 0 };
        return list.sort((a, b) => {
            const sd = (rank[b.severity] || 0) - (rank[a.severity] || 0);
            if (sd !== 0) return sd;
            return Math.abs(b.z_score) - Math.abs(a.z_score);
        });
    }, [data]);

    const severityCounts = data?.summary?.by_severity || {};
    const total = data?.summary?.total_anomalies || 0;

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400">
                Anomaliler kontrol ediliyor…
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                <AlertTriangle size={14} className="inline mr-1" /> {error}
            </div>
        );
    }

    if (!data || data.warning) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                <Info size={14} className="inline mr-1 text-slate-400" />
                {data?.warning || 'Anomali verisi yok'}
            </div>
        );
    }

    const headerBadgeColor = severityCounts.critical > 0 ? 'red'
        : severityCounts.high > 0 ? 'orange'
        : severityCounts.medium > 0 ? 'gold'
        : 'default';

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <Collapse
                bordered={false}
                defaultActiveKey={total > 0 ? ['anomalies'] : []}
                expandIconPosition="end"
                items={[
                    {
                        key: 'anomalies',
                        label: (
                            <div className="flex items-center gap-2 flex-wrap">
                                <AlertTriangle
                                    size={16}
                                    className={total > 0 ? 'text-amber-600' : 'text-slate-400'}
                                />
                                <span className="font-semibold text-slate-800">Anomali Tespiti</span>
                                <Tooltip title={`Popülasyondan |z| ≥ ${data.threshold}σ sapan çalışanlar (${data.sample_size} kişi analiz edildi)`}>
                                    <Tag color={headerBadgeColor}>{total}</Tag>
                                </Tooltip>
                                {Object.entries(severityCounts).filter(([, c]) => c > 0).map(([sev, count]) => (
                                    <Tag key={sev} color={SEVERITY_COLORS[sev]?.color || 'default'}>
                                        {SEVERITY_LABELS[sev] || sev}: {count}
                                    </Tag>
                                ))}
                            </div>
                        ),
                        children: (
                            allAnomalies.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400">
                                    ✅ Şu an için anomali tespit edilmedi. Ekip içi varyasyon normal sınırlarda.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {allAnomalies.map((a, idx) => {
                                        const cfg = SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.low;
                                        const TrendIcon = a.direction === 'above' ? TrendingUp : TrendingDown;
                                        const unit = METRIC_UNITS[a.metric] || '';
                                        return (
                                            <div
                                                key={`${a.employee_id}_${a.metric}_${idx}`}
                                                className={`flex items-center gap-3 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2.5`}
                                            >
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-white ${cfg.text}`}>
                                                    <TrendIcon size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <User size={12} className="text-slate-400 flex-shrink-0" />
                                                        <span className="font-semibold text-slate-800 truncate">
                                                            {a.employee_name}
                                                        </span>
                                                        <span className="text-xs text-slate-400">· {a.department}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        <span className="font-medium">{a.metricLabel}:</span>{' '}
                                                        <span className="font-bold tabular-nums text-slate-700">
                                                            {typeof a.value === 'number' ? a.value.toFixed(1) : a.value}
                                                            {unit && <span className="ml-0.5 text-slate-400">{unit}</span>}
                                                        </span>{' '}
                                                        — ortalamadan{' '}
                                                        <span className="font-bold">
                                                            {Math.abs(a.z_score).toFixed(1)}σ {a.direction === 'above' ? 'yüksek' : 'düşük'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Tag color={cfg.color} className="flex-shrink-0">
                                                    {SEVERITY_LABELS[a.severity] || a.severity}
                                                </Tag>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ),
                    },
                ]}
            />
        </div>
    );
}
