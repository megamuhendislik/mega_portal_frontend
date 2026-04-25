import React, { useState, useEffect, useMemo } from 'react';
import { Tooltip, Empty } from 'antd';
import { Coins, TrendingUp, Building2, Users, Info } from 'lucide-react';
import api from '../../../../services/api';
import { useAnalytics } from '../AnalyticsContext';

/**
 * CostCard — OT ve yemek maliyet tahmini görseli.
 *
 * Backend: GET /api/attendance-analytics/cost-estimate/
 */

const formatTry = (n) => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
    }).format(n);
};

export default function CostCard() {
    const { queryParams } = useAnalytics();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!queryParams?.start_date) return;
        let cancelled = false;
        setLoading(true);
        api.get('/attendance-analytics/cost-estimate/', { params: queryParams, timeout: 30000 })
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch(() => {
                if (!cancelled) setData(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [queryParams]);

    const top3Depts = useMemo(() => (data?.overtime?.by_department || []).slice(0, 3), [data]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-400">
                Maliyet hesaplanıyor…
            </div>
        );
    }

    if (!data) return null;

    const ot = data.overtime || {};
    const meal = data.meal || {};
    const total = data.summary?.total_estimated_cost_try || 0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/40 to-orange-50/40 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                    <Coins size={16} className="text-amber-700" />
                </div>
                <h3 className="font-bold text-slate-800">Maliyet Tahmini</h3>
                <Tooltip
                    title={`Çalışan saatlik ücret tanımlı değilse varsayılan ${data.config?.hourly_rate_default_try} TL/saat kullanılır. OT 1.5x katsayı.`}
                >
                    <Info size={12} className="text-slate-400 cursor-help" />
                </Tooltip>
                <span className="ml-auto text-2xl font-black text-slate-800 tabular-nums">
                    {formatTry(total)}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* OT Cost */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <TrendingUp size={12} /> Ek Mesai Maliyeti
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 tabular-nums">
                            {formatTry(ot.total_cost_try)}
                        </span>
                        <span className="text-xs text-slate-500">
                            ({ot.total_hours || 0} saat × {data.config?.ot_multiplier}×)
                        </span>
                    </div>

                    {top3Depts.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">
                                <Building2 size={10} className="inline mr-1" />
                                En Yüksek 3 Departman
                            </div>
                            {top3Depts.map((d, i) => (
                                <div key={d.name} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 truncate flex-1">
                                        <span className="text-slate-400 font-bold mr-1.5">#{i + 1}</span>
                                        {d.name}
                                    </span>
                                    <span className="font-bold text-slate-700 tabular-nums">
                                        {formatTry(d.cost)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Meal Cost */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Users size={12} /> Yemek Programı
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 tabular-nums">
                            {formatTry(meal.total_cost_try)}
                        </span>
                        <span className="text-xs text-slate-500">
                            ({meal.total_orders || 0} sipariş × {data.config?.meal_value_default_try} TL)
                        </span>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-400">
                        {data.config?.note}
                    </div>
                </div>
            </div>
        </div>
    );
}
