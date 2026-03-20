import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Sparkles, Lightbulb, Link2,
    Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip, Legend
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

const DOW_LABELS = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];

const MONTH_LABELS = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/* ========================================
   DAY x TYPE HEATMAP
   ======================================== */
function DayTypeHeatmap({ heatmapData }) {
    if (!heatmapData) return null;

    const types = Object.keys(TYPE_LABELS);

    // Find max value
    let maxVal = 0;
    DOW_LABELS.forEach((_, di) => {
        types.forEach(type => {
            const val = heatmapData?.[di]?.[type] ?? 0;
            if (val > maxVal) maxVal = val;
        });
    });

    const getColor = (val) => {
        if (!val || maxVal === 0) return 'bg-slate-50';
        const intensity = val / maxVal;
        if (intensity > 0.75) return 'bg-indigo-500';
        if (intensity > 0.5) return 'bg-indigo-400';
        if (intensity > 0.25) return 'bg-indigo-300';
        return 'bg-indigo-100';
    };

    const getTextColor = (val) => {
        if (!val || maxVal === 0) return 'text-slate-300';
        const intensity = val / maxVal;
        return intensity > 0.5 ? 'text-white' : 'text-indigo-700';
    };

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gun x Tur Yogunluk Haritasi</h4>
            <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                    {/* Column headers */}
                    <div className="flex items-center mb-1">
                        <div className="w-12 shrink-0" />
                        {types.map(type => (
                            <div key={type} className="flex-1 text-center text-[9px] text-slate-400 font-semibold">
                                {TYPE_LABELS[type]}
                            </div>
                        ))}
                    </div>
                    {/* Grid rows */}
                    {DOW_LABELS.map((day, di) => (
                        <div key={day} className="flex items-center gap-0.5 mb-0.5">
                            <div className="w-12 shrink-0 text-[10px] font-semibold text-slate-500">{day}</div>
                            {types.map(type => {
                                const val = heatmapData?.[di]?.[type] ?? 0;
                                return (
                                    <div
                                        key={type}
                                        className={`flex-1 h-8 rounded-sm flex items-center justify-center text-[9px] font-bold ${getColor(val)} ${getTextColor(val)} transition-colors`}
                                        title={`${day} - ${TYPE_LABELS[type]}: ${val}`}
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
                        <div className="w-4 h-3 rounded-sm bg-indigo-100" />
                        <div className="w-4 h-3 rounded-sm bg-indigo-300" />
                        <div className="w-4 h-3 rounded-sm bg-indigo-400" />
                        <div className="w-4 h-3 rounded-sm bg-indigo-500" />
                        <span className="text-[9px] text-slate-400">Cok</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function CorrelationPatterns() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/patterns/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('CorrelationPatterns fetch error:', err);
            setError('Korelasyon ve oruntu verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Seasonal radar data
    const radarData = useMemo(() => {
        if (!data?.seasonal) return [];
        return MONTH_LABELS.map((month, idx) => ({
            month,
            Izin: data.seasonal.leave?.[idx] ?? 0,
            'Ek Mesai': data.seasonal.overtime?.[idx] ?? 0,
        }));
    }, [data?.seasonal]);

    return (
        <CollapsibleSection
            title="Korelasyon & Oruntu Analizi"
            subtitle="Otomatik tespit edilen kaliplar"
            icon={Sparkles}
            iconGradient="from-pink-500 to-rose-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-pink-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Oruntu analizi yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 text-white rounded-xl text-xs font-bold hover:bg-pink-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Day x Type Heatmap */}
                        <DayTypeHeatmap heatmapData={data.day_type_heatmap} />

                        {/* Seasonal Radar */}
                        {radarData.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mevsimsel Radar</h4>
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <PolarRadiusAxis tick={{ fontSize: 8, fill: '#cbd5e1' }} />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload?.length) return null;
                                                return (
                                                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-3 py-2 text-xs">
                                                        <p className="font-bold text-slate-700 mb-1">{label}</p>
                                                        {payload.map((entry, i) => (
                                                            <div key={i} className="flex items-center gap-2 py-0.5">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                <span className="text-slate-500">{entry.name}:</span>
                                                                <span className="font-bold text-slate-800">{entry.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Radar name="Izin" dataKey="Izin" stroke={TYPE_COLORS.leave} fill={TYPE_COLORS.leave} fillOpacity={0.15} strokeWidth={2} />
                                        <Radar name="Ek Mesai" dataKey="Ek Mesai" stroke={TYPE_COLORS.overtime} fill={TYPE_COLORS.overtime} fillOpacity={0.15} strokeWidth={2} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Auto Insights */}
                    {data?.insights?.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Lightbulb size={16} className="text-amber-500" />
                                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Otomatik Tespitler</h4>
                            </div>
                            <ul className="space-y-2">
                                {data.insights.map((insight, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                                        <Lightbulb size={12} className="text-amber-400 shrink-0 mt-0.5" />
                                        <span>{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Indirect Requests */}
                    {data?.indirect_requests && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Link2 size={16} className="text-violet-500" />
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dolayli Talepler</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Toplam</p>
                                    <p className="text-lg font-black text-slate-800">{data.indirect_requests.total ?? 0}</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Kaynak Orani</p>
                                    <p className="text-lg font-black text-violet-700">%{data.indirect_requests.source_rate ?? 0}</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">En Yaygin Tur</p>
                                    <p className="text-sm font-bold text-slate-700">{data.indirect_requests.most_common_type ?? '-'}</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Onay Orani</p>
                                    <p className="text-lg font-black text-emerald-700">%{data.indirect_requests.approval_rate ?? 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!data?.day_type_heatmap && !radarData.length && !data?.insights?.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Sparkles size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Oruntu verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
