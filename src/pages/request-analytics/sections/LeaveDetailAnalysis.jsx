import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Palmtree, AlertTriangle,
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
const LEAVE_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EF4444', '#06B6D4', '#EC4899', '#14B8A6',
];

const HEATMAP_DAYS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum'];

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function LeaveDetailAnalysis() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/leave-detail/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('LeaveDetailAnalysis fetch error:', err);
            setError('Izin detay verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Leave type donut data
    const pieData = useMemo(() => {
        if (!data?.leave_type_distribution) return [];
        return Object.entries(data.leave_type_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value], idx) => ({
                name: key,
                value,
                color: LEAVE_COLORS[idx % LEAVE_COLORS.length],
            }));
    }, [data?.leave_type_distribution]);

    // Heatmap max value
    const heatmapMax = useMemo(() => {
        if (!data?.leave_heatmap) return 1;
        let max = 0;
        data.leave_heatmap.forEach(week => {
            HEATMAP_DAYS.forEach((_, di) => {
                const val = week.days?.[di] ?? 0;
                if (val > max) max = val;
            });
        });
        return max || 1;
    }, [data?.leave_heatmap]);

    const getHeatColor = (val) => {
        if (!val || heatmapMax === 0) return 'bg-slate-50';
        const intensity = val / heatmapMax;
        if (intensity > 0.75) return 'bg-blue-500';
        if (intensity > 0.5) return 'bg-blue-400';
        if (intensity > 0.25) return 'bg-blue-300';
        return 'bg-blue-100';
    };

    const getHeatText = (val) => {
        if (!val || heatmapMax === 0) return '';
        const intensity = val / heatmapMax;
        return intensity > 0.5 ? 'text-white' : 'text-blue-700';
    };

    return (
        <CollapsibleSection
            title="Izin Detay Analizi"
            subtitle="Izin turleri, kullanim ve heatmap"
            icon={Palmtree}
            iconGradient="from-blue-500 to-cyan-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-blue-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Izin verileri yukleniyor...</span>
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
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Leave Type Donut */}
                        {pieData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Izin Turu Dagilimi</h4>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={85}
                                            innerRadius={48}
                                            paddingAngle={3}
                                        >
                                            {pieData.map((entry, i) => (
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
                                                        <p className="text-slate-500">{d.value} gun</p>
                                                    </div>
                                                );
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                    {pieData.map(entry => (
                                        <div key={entry.name} className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[10px] text-slate-500 font-semibold">{entry.name}: {entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Leave Heatmap */}
                        {data?.leave_heatmap?.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Izin Yogunluk Haritasi</h4>
                                <div className="overflow-x-auto">
                                    <div className="min-w-[300px]">
                                        {/* Column headers */}
                                        <div className="flex items-center mb-1">
                                            <div className="w-12 shrink-0" />
                                            {HEATMAP_DAYS.map(d => (
                                                <div key={d} className="flex-1 text-center text-[9px] text-slate-400 font-semibold">{d}</div>
                                            ))}
                                        </div>
                                        {/* Grid rows */}
                                        {data.leave_heatmap.map((week, wi) => (
                                            <div key={wi} className="flex items-center gap-0.5 mb-0.5">
                                                <div className="w-12 shrink-0 text-[9px] font-semibold text-slate-400 truncate">{week.label}</div>
                                                {HEATMAP_DAYS.map((_, di) => {
                                                    const val = week.days?.[di] ?? 0;
                                                    return (
                                                        <div
                                                            key={di}
                                                            className={`flex-1 h-8 rounded-sm flex items-center justify-center text-[9px] font-bold ${getHeatColor(val)} ${getHeatText(val)} transition-colors`}
                                                            title={`${HEATMAP_DAYS[di]}: ${val} kisi`}
                                                        >
                                                            {val > 0 ? val : ''}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                        {/* Color legend */}
                                        <div className="flex items-center gap-2 mt-3 justify-end">
                                            <span className="text-[9px] text-slate-400">Az</span>
                                            <div className="w-4 h-3 rounded-sm bg-blue-100" />
                                            <div className="w-4 h-3 rounded-sm bg-blue-300" />
                                            <div className="w-4 h-3 rounded-sm bg-blue-400" />
                                            <div className="w-4 h-3 rounded-sm bg-blue-500" />
                                            <span className="text-[9px] text-slate-400">Cok</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Usage vs Entitlement */}
                    {data?.usage_vs_entitlement?.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kullanim vs Hak</h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {data.usage_vs_entitlement.map((emp, idx) => {
                                    const total = emp.total ?? 1;
                                    const used = emp.used ?? 0;
                                    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                                    return (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="text-xs font-semibold text-slate-700 w-28 truncate shrink-0">{emp.name}</span>
                                            <div className="flex-1 h-4 rounded-full bg-slate-200 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-600 w-16 text-right shrink-0">
                                                {used}/{total} (%{pct})
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Excuse Balance Table */}
                    {data?.excuse_balance?.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mazeret Izni Bakiyesi</h4>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Calisan</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Toplam</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Kullanilan</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Kalan</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Kullanim %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.excuse_balance.map((emp, idx) => {
                                            const pct = emp.usage_pct ?? 0;
                                            return (
                                                <tr key={idx} className={`border-b border-slate-100 last:border-0 ${pct > 50 ? 'bg-amber-50' : ''}`}>
                                                    <td className="px-3 py-2.5 font-semibold text-slate-700">
                                                        {pct > 50 && <AlertTriangle size={10} className="inline mr-1 text-amber-500" />}
                                                        {emp.name}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-600">{emp.total_hours}s</td>
                                                    <td className="px-3 py-2.5 text-slate-600">{emp.used_hours}s</td>
                                                    <td className="px-3 py-2.5 font-bold text-slate-700">{emp.remaining_hours}s</td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden max-w-[80px]">
                                                                <div
                                                                    className={`h-full rounded-full ${pct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${pct > 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                %{pct}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2">
                                {data.excuse_balance.map((emp, idx) => {
                                    const pct = emp.usage_pct ?? 0;
                                    return (
                                        <div key={idx} className={`bg-white rounded-xl p-3 border ${pct > 50 ? 'border-amber-200' : 'border-slate-100'}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-bold text-slate-700">
                                                    {pct > 50 && <AlertTriangle size={10} className="inline mr-1 text-amber-500" />}
                                                    {emp.name}
                                                </span>
                                                <span className={`text-xs font-bold ${pct > 50 ? 'text-amber-600' : 'text-slate-600'}`}>%{pct}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-1">
                                                <div
                                                    className={`h-full rounded-full ${pct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(100, pct)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                <span>Kullanilan: {emp.used_hours}s</span>
                                                <span>Kalan: {emp.remaining_hours}s</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!pieData.length && !data?.usage_vs_entitlement?.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Palmtree size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Izin detay verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
