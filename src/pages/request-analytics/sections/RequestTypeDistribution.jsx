import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PieChart as PieChartIcon, CheckCircle2, Clock,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, LineChart, Line
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
    cardless: 'Kartsiz Giris',
    health: 'Saglik Raporu',
};

const STATUS_COLORS = {
    approved: '#10B981',
    rejected: '#EF4444',
    pending: '#F59E0B',
};

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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR') : entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function RequestTypeDistribution() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/type-breakdown/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('RequestTypeDistribution fetch error:', err);
            setError('Talep tur dagilimi verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Status by type bar data
    const statusByType = useMemo(() => {
        if (!data?.status_by_type) return [];
        return Object.entries(data.status_by_type).map(([type, statuses]) => ({
            name: TYPE_LABELS[type] || type,
            Onaylandi: statuses.approved ?? 0,
            Reddedildi: statuses.rejected ?? 0,
            Bekliyor: statuses.pending ?? 0,
        }));
    }, [data?.status_by_type]);

    // Monthly by type lines
    const monthlyByType = useMemo(() => {
        if (!data?.monthly_by_type?.length) return [];
        return data.monthly_by_type.map(m => ({
            name: m.label,
            Izin: m.leave ?? 0,
            'Ek Mesai': m.overtime ?? 0,
            Yemek: m.meal ?? 0,
            Kartsiz: m.cardless ?? 0,
            Saglik: m.health ?? 0,
        }));
    }, [data?.monthly_by_type]);

    return (
        <CollapsibleSection
            title="Talep Turu Dagilimi"
            subtitle="Tur bazli talep analizi"
            icon={PieChartIcon}
            iconGradient="from-blue-500 to-cyan-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-blue-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Tur dagilimi yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* Status by Type Horizontal BarChart */}
                    {statusByType.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tur Bazli Durum</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={Math.max(200, statusByType.length * 50)} minWidth={350}>
                                    <BarChart data={statusByType} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={80} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        <Bar dataKey="Onaylandi" stackId="a" fill={STATUS_COLORS.approved} maxBarSize={24} />
                                        <Bar dataKey="Reddedildi" stackId="a" fill={STATUS_COLORS.rejected} maxBarSize={24} />
                                        <Bar dataKey="Bekliyor" stackId="a" fill={STATUS_COLORS.pending} radius={[0, 4, 4, 0]} maxBarSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Type Mini KPI Cards */}
                    {data?.type_kpis && (
                        <div className="overflow-x-auto -mx-1 pb-2">
                            <div className="flex gap-3 min-w-max px-1">
                                {Object.entries(data.type_kpis).map(([type, kpi]) => (
                                    <div
                                        key={type}
                                        className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 min-w-[160px]"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#94a3b8' }} />
                                            <span className="text-xs font-bold text-slate-700">{TYPE_LABELS[type] || type}</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400">Toplam</span>
                                                <span className="text-sm font-black text-slate-800">{kpi.total ?? 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400">Onay</span>
                                                <span className="text-xs font-bold text-emerald-600">%{kpi.approval_rate ?? 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400">Ort. Yanit</span>
                                                <span className="text-xs font-semibold text-slate-600">{kpi.avg_response ?? '-'}s</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly by Type LineChart */}
                    {monthlyByType.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylik Tur Trendi</h4>
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={280} minWidth={400}>
                                    <LineChart data={monthlyByType} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                        <Line type="monotone" dataKey="Izin" stroke={TYPE_COLORS.leave} strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="Ek Mesai" stroke={TYPE_COLORS.overtime} strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="Yemek" stroke={TYPE_COLORS.meal} strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="Kartsiz" stroke={TYPE_COLORS.cardless} strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="Saglik" stroke={TYPE_COLORS.health} strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!statusByType.length && !monthlyByType.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <PieChartIcon size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Tur dagilimi verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
