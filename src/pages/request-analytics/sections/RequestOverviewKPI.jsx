import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    FileText, CheckCircle2, XCircle, Clock, Palmtree,
    Zap, UtensilsCrossed, Heart, CreditCard,
    ArrowUpRight, ArrowDownRight, Minus,
    Loader2, AlertCircle, RefreshCw, Users, ArrowRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import CollapsibleSection from '../../attendance-tracking/analytics/shared/CollapsibleSection';
import { useRequestFilter } from '../RequestFilterContext';
import api from '../../../services/api';

/* ========================================
   CONSTANTS
   ======================================== */
const TYPE_COLORS = {
    leave: '#3B82F6',
    overtime: '#F59E0B',
    meal: '#10B981',
    cardless: '#8B5CF6',
    health: '#EF4444',
};

const TYPE_LABELS = {
    leave: 'Izin',
    overtime: 'Ek Mesai',
    meal: 'Yemek',
    cardless: 'Kartsiz',
    health: 'Saglik',
};

const KPI_CONFIGS = [
    { key: 'total_requests', label: 'Toplam Talep', suffix: '', icon: FileText, gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600', deltaKey: 'total' },
    { key: 'approval_rate', label: 'Onay Orani', suffix: '%', icon: CheckCircle2, gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600', deltaKey: 'approval_rate' },
    { key: 'rejection_rate', label: 'Red Orani', suffix: '%', icon: XCircle, gradient: 'bg-gradient-to-br from-rose-500 to-rose-600', deltaKey: 'rejection_rate' },
    { key: 'pending_count', label: 'Bekleyen', suffix: '', icon: Clock, gradient: 'bg-gradient-to-br from-amber-500 to-amber-600', deltaKey: null },
    { key: 'avg_response_hours', label: 'Ort. Yanit', suffix: 's', icon: Clock, gradient: 'bg-gradient-to-br from-violet-500 to-violet-600', deltaKey: 'avg_response' },
    { key: 'leave_days', label: 'Izin Gunleri', suffix: 'gun', icon: Palmtree, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600', deltaKey: null },
    { key: 'ot_hours', label: 'OT Saatleri', suffix: 's', icon: Zap, gradient: 'bg-gradient-to-br from-orange-500 to-orange-600', deltaKey: null },
    { key: 'meal_orders', label: 'Yemek Siparis', suffix: '', icon: UtensilsCrossed, gradient: 'bg-gradient-to-br from-teal-500 to-teal-600', deltaKey: null },
    { key: 'health_reports', label: 'Saglik Raporu', suffix: '', icon: Heart, gradient: 'bg-gradient-to-br from-pink-500 to-pink-600', deltaKey: null },
];

/* ========================================
   KPI CARD
   ======================================== */
function KPICard({ label, value, suffix, icon: Icon, gradient, delta }) {
    const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
    const deltaColor = delta > 0 ? 'text-emerald-200' : delta < 0 ? 'text-red-200' : 'text-white/50';
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow`}>
            <p className="opacity-70 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-xl font-black leading-tight">
                {value ?? '-'}{suffix && <span className="text-xs ml-1 font-bold opacity-80">{suffix}</span>}
            </h3>
            {delta != null && (
                <div className={`flex items-center gap-0.5 mt-1 ${deltaColor}`}>
                    <DeltaIcon size={12} />
                    <span className="text-[10px] font-bold">%{Math.abs(delta)}</span>
                </div>
            )}
            {Icon && <div className="absolute -right-3 -bottom-3 opacity-10 group-hover:opacity-15 transition-opacity"><Icon size={48} /></div>}
        </div>
    );
}

/* ========================================
   TOOLTIP
   ======================================== */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ========================================
   STATUS FLOW
   ======================================== */
function StatusFlow({ flow }) {
    if (!flow) return null;
    const steps = [
        { key: 'created', label: 'Olusturuldu', count: flow.created ?? 0, color: 'bg-indigo-500' },
        { key: 'approved', label: 'Onaylandi', count: flow.approved ?? 0, color: 'bg-emerald-500' },
        { key: 'rejected', label: 'Reddedildi', count: flow.rejected ?? 0, color: 'bg-red-500' },
        { key: 'pending', label: 'Bekliyor', count: flow.pending ?? 0, color: 'bg-amber-500' },
    ];
    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Durum Akisi</h4>
            <div className="flex items-center justify-center gap-2 flex-wrap">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={`${step.color} text-white w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-md`}>
                                <span className="text-lg font-black leading-none">{step.count}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <ArrowRight size={16} className="text-slate-300 shrink-0 mt-[-16px]" />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function RequestOverviewKPI() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/team-overview/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('RequestOverviewKPI fetch error:', err);
            setError('Ekip talep verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Monthly trend stacked by type
    const trendData = useMemo(() => {
        if (!data?.monthly_trend?.length) return [];
        return data.monthly_trend.map(m => ({
            name: m.label,
            Izin: m.leave ?? 0,
            'Ek Mesai': m.overtime ?? 0,
            Yemek: m.meal ?? 0,
            Kartsiz: m.cardless ?? 0,
            Saglik: m.health ?? 0,
        }));
    }, [data?.monthly_trend]);

    const kpi = data?.kpi;

    return (
        <CollapsibleSection
            title="Talep Genel Bakis"
            subtitle={data?.employee_count ? `${data.employee_count} calisan` : undefined}
            icon={Users}
            iconGradient="from-indigo-500 to-violet-600"
            badge={data?.employee_count}
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-indigo-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Talep verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* 9 KPI Cards (3x3 grid) */}
                    {kpi && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {KPI_CONFIGS.map(cfg => (
                                <KPICard
                                    key={cfg.key}
                                    label={cfg.label}
                                    value={kpi[cfg.key]}
                                    suffix={cfg.suffix}
                                    icon={cfg.icon}
                                    gradient={cfg.gradient}
                                    delta={cfg.deltaKey ? kpi.vs_prev?.[cfg.deltaKey] : null}
                                />
                            ))}
                        </div>
                    )}

                    {/* Monthly Trend Stacked BarChart */}
                    {trendData.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylik Talep Trendi</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={280} minWidth={400}>
                                    <BarChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        <Bar dataKey="Izin" stackId="a" fill={TYPE_COLORS.leave} maxBarSize={28} />
                                        <Bar dataKey="Ek Mesai" stackId="a" fill={TYPE_COLORS.overtime} maxBarSize={28} />
                                        <Bar dataKey="Yemek" stackId="a" fill={TYPE_COLORS.meal} maxBarSize={28} />
                                        <Bar dataKey="Kartsiz" stackId="a" fill={TYPE_COLORS.cardless} maxBarSize={28} />
                                        <Bar dataKey="Saglik" stackId="a" fill={TYPE_COLORS.health} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Status Flow */}
                    <StatusFlow flow={data.status_flow} />

                    {/* Empty State */}
                    {!kpi && !trendData.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <FileText size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Bu donem icin talep verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
