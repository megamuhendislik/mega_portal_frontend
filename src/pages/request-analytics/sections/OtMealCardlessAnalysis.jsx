import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Zap, UtensilsCrossed, CreditCard, ArrowRight,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip,
    ResponsiveContainer
} from 'recharts';
import CollapsibleSection from '../../attendance-tracking/analytics/shared/CollapsibleSection';
import { useRequestFilter } from '../RequestFilterContext';
import api from '../../../services/api';

/* ========================================
   CONSTANTS
   ======================================== */
const SOURCE_COLORS = {
    intended: '#6366f1',
    potential: '#f59e0b',
    manual: '#8b5cf6',
};

const SOURCE_LABELS = {
    intended: 'Planli',
    potential: 'Algilanan',
    manual: 'Manuel',
};

/* ========================================
   OT FUNNEL
   ======================================== */
function OTFunnel({ funnel }) {
    if (!funnel) return null;
    const steps = [
        { key: 'created', label: 'Olusturuldu', count: funnel.created ?? 0, color: 'bg-indigo-500' },
        { key: 'approved', label: 'Onaylandi', count: funnel.approved ?? 0, color: 'bg-emerald-500' },
        { key: 'claimed', label: 'Talep Edildi', count: funnel.claimed ?? 0, color: 'bg-violet-500' },
    ];
    return (
        <div className="flex items-center justify-center gap-2 flex-wrap">
            {steps.map((step, idx) => (
                <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className={`${step.color} text-white w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-md`}>
                            <span className="text-xl font-black leading-none">{step.count}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">{step.label}</span>
                    </div>
                    {idx < steps.length - 1 && (
                        <ArrowRight size={16} className="text-slate-300 shrink-0 mt-[-16px]" />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

/* ========================================
   MINI STAT CARD
   ======================================== */
function MiniStatCard({ label, value, suffix, icon: Icon, iconColor }) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
            {Icon && <Icon size={16} className={`mx-auto mb-1 ${iconColor || 'text-slate-400'}`} />}
            <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{label}</p>
            <p className="text-lg font-black text-slate-800">{value ?? '-'}{suffix && <span className="text-xs font-bold text-slate-400 ml-0.5">{suffix}</span>}</p>
        </div>
    );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function OtMealCardlessAnalysis() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/ot-meal-cardless/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('OtMealCardlessAnalysis fetch error:', err);
            setError('OT/Yemek/Kartsiz verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // OT Source donut
    const otPieData = useMemo(() => {
        if (!data?.ot_source_distribution) return [];
        return Object.entries(data.ot_source_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: SOURCE_LABELS[key] || key,
                value,
                color: SOURCE_COLORS[key] || '#94a3b8',
            }));
    }, [data?.ot_source_distribution]);

    // Cardless reason distribution
    const cardlessReasons = useMemo(() => {
        if (!data?.cardless?.reason_distribution) return [];
        return Object.entries(data.cardless.reason_distribution)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1]);
    }, [data?.cardless?.reason_distribution]);

    const ot = data?.ot;
    const meal = data?.meal;
    const cardless = data?.cardless;
    const correlation = data?.correlation;

    return (
        <CollapsibleSection
            title="OT / Yemek / Kartsiz Giris"
            subtitle="Detayli alt tur analizi"
            icon={Zap}
            iconGradient="from-amber-500 to-orange-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-amber-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Veriler yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* OT Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* OT Source Donut */}
                        {otPieData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">OT Kaynak Dagilimi</h4>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={otPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            innerRadius={45}
                                            paddingAngle={3}
                                        >
                                            {otPieData.map((entry, i) => (
                                                <Cell key={`cell-${i}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0];
                                                return (
                                                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                        <p className="font-bold text-slate-700">{d.name}</p>
                                                        <p className="text-slate-500">{d.value} saat</p>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                    {otPieData.map(entry => (
                                        <div key={entry.name} className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[10px] text-slate-500 font-semibold">{entry.name}: {entry.value}s</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* OT Funnel */}
                        {ot?.funnel && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">OT Akis Sureci</h4>
                                <OTFunnel funnel={ot.funnel} />
                            </div>
                        )}
                    </div>

                    {/* Meal Analysis Cards */}
                    {meal && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yemek Analizi</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <MiniStatCard label="Toplam Siparis" value={meal.total} icon={UtensilsCrossed} iconColor="text-emerald-500" />
                                <MiniStatCard label="Ort/Gun" value={meal.avg_per_day} icon={UtensilsCrossed} iconColor="text-emerald-500" />
                                <MiniStatCard label="Siparis Orani" value={meal.rate} suffix="%" icon={UtensilsCrossed} iconColor="text-emerald-500" />
                                <MiniStatCard label="OT Gunu Orani" value={meal.ot_day_rate} suffix="%" icon={Zap} iconColor="text-amber-500" />
                            </div>
                            {meal.ot_day_rate != null && meal.normal_day_rate != null && (
                                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-100">
                                    <div className="flex items-center justify-between text-xs">
                                        <div>
                                            <span className="text-slate-400">OT gunu yemek orani:</span>
                                            <span className="font-bold text-amber-600 ml-1">%{meal.ot_day_rate}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Normal gun yemek orani:</span>
                                            <span className="font-bold text-emerald-600 ml-1">%{meal.normal_day_rate}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cardless Analysis */}
                    {cardless && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kartsiz Giris Analizi</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                                <MiniStatCard label="Toplam" value={cardless.total} icon={CreditCard} iconColor="text-violet-500" />
                                <MiniStatCard label="Onay Orani" value={cardless.approval_rate} suffix="%" icon={CreditCard} iconColor="text-violet-500" />
                                <MiniStatCard label="Ort. Yanit" value={cardless.avg_response} suffix="s" icon={CreditCard} iconColor="text-violet-500" />
                                <MiniStatCard label="En Sik" value={cardless.most_frequent_employee || '-'} icon={CreditCard} iconColor="text-violet-500" />
                            </div>

                            {/* Reason Distribution */}
                            {cardlessReasons.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Sebep Dagilimi</p>
                                    {cardlessReasons.map(([reason, count]) => {
                                        const total = cardlessReasons.reduce((s, [, c]) => s + c, 0);
                                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                        return (
                                            <div key={reason}>
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs text-slate-600">{reason}</span>
                                                    <span className="text-xs font-bold text-slate-700">{count} (%{pct})</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                                    <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Correlation Summary */}
                    {correlation && (
                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-100">
                            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Korelasyon Ozeti</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div className="bg-white/70 rounded-lg p-3">
                                    <p className="text-slate-400 text-[10px] mb-0.5">OT gunu yemek orani</p>
                                    <p className="font-black text-indigo-700 text-lg">%{correlation.ot_day_meal_rate ?? '-'}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                    <p className="text-slate-400 text-[10px] mb-0.5">Normal gun yemek orani</p>
                                    <p className="font-black text-emerald-700 text-lg">%{correlation.normal_day_meal_rate ?? '-'}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                    <p className="text-slate-400 text-[10px] mb-0.5">R Katsayisi</p>
                                    <p className="font-black text-violet-700 text-lg">{correlation.r_coefficient ?? '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!otPieData.length && !meal && !cardless && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Zap size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">OT/Yemek/Kartsiz verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
