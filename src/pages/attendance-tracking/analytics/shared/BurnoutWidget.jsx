import React, { useState, useEffect } from 'react';
import { Progress, Tag, Tooltip, Empty } from 'antd';
import { Flame, TrendingUp, Coffee, Clock, AlertCircle } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * BurnoutWidget — Tükenmişlik risk altındaki çalışanları gösterir.
 *
 * Backend: GET /api/attendance-analytics/burnout-risk/
 *
 * Severity:
 *   critical (>=75) → kırmızı flame
 *   high     (>=50) → turuncu
 *   medium   (>=25) → sarı
 *   low      (<25)  → gri (listeden gizlenir, sadece sayım)
 */

const SEVERITY_CFG = {
    critical: { color: 'red', label: 'Kritik', bar: '#ef4444' },
    high: { color: 'orange', label: 'Yüksek', bar: '#f97316' },
    medium: { color: 'gold', label: 'Orta', bar: '#f59e0b' },
    low: { color: 'default', label: 'Düşük', bar: '#94a3b8' },
};

export default function BurnoutWidget() {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!queryParams?.start_date) return;
        let cancelled = false;
        setLoading(true);
        api.get('/attendance-analytics/burnout-risk/', { params: queryParams, timeout: 30000 })
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch((err) => {
                if (!cancelled) setError(err?.response?.data?.error || err?.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [queryParams]);

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-400">
                Tükenmişlik analizi hazırlanıyor…
            </div>
        );
    }

    if (error || !data) {
        return null;  // Sessizce gizle (opsiyonel widget)
    }

    const summary = data?.summary || {};
    const employees = data?.employees || [];
    const critical = summary.by_severity?.critical || 0;
    const high = summary.by_severity?.high || 0;
    const atRisk = summary.at_risk_count || 0;

    // Sadece medium ve üzeri göster
    const displayEmployees = employees.filter((e) => e.severity !== 'low').slice(0, 10);

    if (displayEmployees.length === 0) {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <Coffee size={16} className="text-emerald-600" />
                    Tükenmişlik riski yok
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                    Ekipte risk altında çalışan tespit edilmedi. Sürdürülebilir tempoda ilerliyorsunuz.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50/40 to-orange-50/40 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100 flex items-center gap-2">
                <Flame size={16} className="text-red-600" />
                <h3 className="font-bold text-red-800">Tükenmişlik Riski Altındaki Çalışanlar</h3>
                <Tag color={critical > 0 ? 'red' : high > 0 ? 'orange' : 'gold'} className="ml-1">
                    {atRisk} risk altında
                </Tag>
                <span className="ml-auto text-[10px] text-slate-500">
                    Top {displayEmployees.length} / {summary.total || 0} çalışan
                </span>
            </div>

            <div className="divide-y divide-red-100">
                {displayEmployees.map((emp) => {
                    const cfg = SEVERITY_CFG[emp.severity] || SEVERITY_CFG.medium;
                    return (
                        <div key={emp.employee_id} className="px-4 py-3 hover:bg-white/50 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-800 truncate">{emp.employee_name}</div>
                                    <div className="text-[10px] text-slate-500">{emp.department}</div>
                                </div>
                                <Tag color={cfg.color}>{cfg.label}</Tag>
                                <span className="text-2xl font-black tabular-nums" style={{ color: cfg.bar }}>
                                    {Math.round(emp.score)}
                                </span>
                            </div>
                            <Progress
                                percent={emp.score}
                                strokeColor={cfg.bar}
                                showInfo={false}
                                size="small"
                            />
                            {/* Faktörler */}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                                {emp.factors?.continuous_ot >= 50 && (
                                    <Tooltip title={`${emp.metrics?.high_ot_weeks || 0} haftalık yüksek OT`}>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                                            <TrendingUp size={10} /> Sürekli OT
                                        </span>
                                    </Tooltip>
                                )}
                                {emp.factors?.low_break >= 50 && (
                                    <Tooltip title={`Ort. mola: ${emp.metrics?.avg_break_minutes || 0}dk`}>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                            <Coffee size={10} /> Düşük mola
                                        </span>
                                    </Tooltip>
                                )}
                                {emp.factors?.excessive_hours >= 50 && (
                                    <Tooltip title={`Max haftalık: ${emp.metrics?.max_weekly_hours || 0}sa`}>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                            <Clock size={10} /> Aşırı saat
                                        </span>
                                    </Tooltip>
                                )}
                                {emp.factors?.absence >= 50 && (
                                    <Tooltip title={`${emp.metrics?.absence_days || 0} gün devamsız`}>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                            <AlertCircle size={10} /> Devamsızlık
                                        </span>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
