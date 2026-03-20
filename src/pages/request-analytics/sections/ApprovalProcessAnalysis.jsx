import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Shield, Clock, AlertTriangle, ChevronDown, ChevronUp,
    Loader2, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, ReferenceLine
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

/* ========================================
   SORT HOOK
   ======================================== */
function useSortable(defaultCol, defaultDir = 'desc') {
    const [sortCol, setSortCol] = useState(defaultCol);
    const [sortDir, setSortDir] = useState(defaultDir);

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortCol(col);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <ChevronDown size={12} className="text-slate-300" />;
        return sortDir === 'desc'
            ? <ChevronDown size={12} className="text-indigo-600" />
            : <ChevronUp size={12} className="text-indigo-600" />;
    };

    return { sortCol, sortDir, handleSort, SortIcon };
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
export default function ApprovalProcessAnalysis() {
    const { queryParams } = useRequestFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/approval-process/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('ApprovalProcessAnalysis fetch error:', err);
            setError('Onay sureci verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Response time by type bar data
    const responseByType = useMemo(() => {
        if (!data?.response_by_type) return [];
        return Object.entries(data.response_by_type)
            .map(([type, hours]) => ({
                name: TYPE_LABELS[type] || type,
                hours: hours ?? 0,
                color: TYPE_COLORS[type] || '#94a3b8',
            }))
            .sort((a, b) => b.hours - a.hours);
    }, [data?.response_by_type]);

    const teamAvgResponse = data?.team_avg_response ?? 0;

    // Response trend area data
    const responseTrend = useMemo(() => {
        if (!data?.response_trend?.length) return [];
        return data.response_trend.map(m => ({
            name: m.label,
            'Ort. Yanit (s)': m.avg_hours ?? 0,
        }));
    }, [data?.response_trend]);

    // Manager decisions table
    const { sortCol, sortDir, handleSort, SortIcon } = useSortable('total');
    const sortedManagers = useMemo(() => {
        if (!data?.manager_decisions?.length) return [];
        const s = [...data.manager_decisions];
        s.sort((a, b) => {
            const aVal = a[sortCol] ?? 0;
            const bVal = b[sortCol] ?? 0;
            if (typeof aVal === 'string') return sortDir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return s;
    }, [data?.manager_decisions, sortCol, sortDir]);

    const managerColumns = [
        { key: 'name', label: 'Yonetici', sortable: true },
        { key: 'total', label: 'Toplam', sortable: true },
        { key: 'approval_rate', label: 'Onay %', sortable: true },
        { key: 'rejection_rate', label: 'Red %', sortable: true },
        { key: 'avg_response', label: 'Ort. Yanit', sortable: true },
        { key: 'pending', label: 'Bekleyen', sortable: true },
    ];

    return (
        <CollapsibleSection
            title="Onay Sureci Analizi"
            subtitle="Yanit suresi ve yonetici kararlari"
            icon={Shield}
            iconGradient="from-violet-500 to-purple-600"
        >
            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="text-violet-500 animate-spin mr-2" />
                    <span className="text-sm text-slate-400">Onay sureci verileri yukleniyor...</span>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <AlertCircle size={24} className="text-red-400" />
                    <p className="text-sm text-slate-500">{error}</p>
                    <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors">
                        <RefreshCw size={14} /> Tekrar Dene
                    </button>
                </div>
            )}

            {/* Data */}
            {data && !loading && (
                <div className="space-y-5">
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Response Time by Type */}
                        {responseByType.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tur Bazli Yanit Suresi</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={Math.max(180, responseByType.length * 45)} minWidth={300}>
                                        <BarChart data={responseByType} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 70 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="s" />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={80} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <ReferenceLine x={teamAvgResponse} stroke="#6366f1" strokeDasharray="3 3" label={{ value: `Ort: ${teamAvgResponse}s`, fontSize: 9, fill: '#6366f1', position: 'top' }} />
                                            <Bar dataKey="hours" name="Yanit Suresi" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                                {responseByType.map((entry, i) => (
                                                    <React.Fragment key={i}>
                                                        {/* Use fill from data color */}
                                                    </React.Fragment>
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Response Trend AreaChart */}
                        {responseTrend.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yanit Suresi Trendi</h4>
                                <div className="overflow-x-auto -mx-2">
                                    <ResponsiveContainer width="100%" height={250} minWidth={300}>
                                        <AreaChart data={responseTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="s" />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Area type="monotone" dataKey="Ort. Yanit (s)" stroke="#8b5cf6" fill="#8b5cf650" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottleneck Table */}
                    {data?.bottlenecks?.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Darbogazlar</h4>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Tur</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Ort. Yanit</th>
                                            <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">&gt;24s Orani</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.bottlenecks.map((b, idx) => (
                                            <tr key={idx} className={`border-b border-slate-100 last:border-0 ${b.over_24h_pct > 30 ? 'bg-amber-50' : ''}`}>
                                                <td className="px-3 py-2.5 font-semibold text-slate-700">
                                                    {b.over_24h_pct > 30 && <AlertTriangle size={12} className="inline mr-1 text-amber-500" />}
                                                    {TYPE_LABELS[b.type] || b.type}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600">{b.avg_response}s</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`font-bold ${b.over_24h_pct > 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                        %{b.over_24h_pct}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2">
                                {data.bottlenecks.map((b, idx) => (
                                    <div key={idx} className={`bg-white rounded-xl p-3 border ${b.over_24h_pct > 30 ? 'border-amber-200' : 'border-slate-100'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-slate-700">
                                                {b.over_24h_pct > 30 && <AlertTriangle size={10} className="inline mr-1 text-amber-500" />}
                                                {TYPE_LABELS[b.type] || b.type}
                                            </span>
                                            <span className="text-xs text-slate-500">Ort: {b.avg_response}s</span>
                                        </div>
                                        <span className={`text-[10px] font-bold ${b.over_24h_pct > 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                            &gt;24s: %{b.over_24h_pct}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manager Decisions Table */}
                    {sortedManagers.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yonetici Kararlari</h4>
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            {managerColumns.map(col => (
                                                <th
                                                    key={col.key}
                                                    className={`px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-slate-700 select-none' : ''}`}
                                                    onClick={() => col.sortable && handleSort(col.key)}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        {col.label}
                                                        {col.sortable && <SortIcon col={col.key} />}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedManagers.map((row, idx) => (
                                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-white/60 transition-colors">
                                                <td className="px-3 py-2.5 font-semibold text-slate-700">{row.name}</td>
                                                <td className="px-3 py-2.5 font-bold text-slate-700">{row.total}</td>
                                                <td className="px-3 py-2.5 text-emerald-600 font-semibold">%{row.approval_rate}</td>
                                                <td className="px-3 py-2.5 text-red-600 font-semibold">%{row.rejection_rate}</td>
                                                <td className="px-3 py-2.5 text-slate-600">{row.avg_response}s</td>
                                                <td className="px-3 py-2.5">
                                                    {row.pending > 0 ? (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{row.pending}</span>
                                                    ) : (
                                                        <span className="text-slate-400">0</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-2">
                                {sortedManagers.map((row, idx) => (
                                    <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-700">{row.name}</span>
                                            <span className="text-sm font-black text-slate-800">{row.total}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                                            <div>
                                                <span className="text-slate-400 block">Onay</span>
                                                <span className="font-bold text-emerald-600">%{row.approval_rate}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Red</span>
                                                <span className="font-bold text-red-600">%{row.rejection_rate}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Ort. Yanit</span>
                                                <span className="font-bold text-slate-600">{row.avg_response}s</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Auto-Approve Cards */}
                    {data?.auto_approve_rates && Object.keys(data.auto_approve_rates).length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Otomatik Onay Oranlari</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {Object.entries(data.auto_approve_rates).map(([type, rate]) => (
                                    <div key={type} className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                        <span className="w-3 h-3 rounded-full inline-block mb-1" style={{ backgroundColor: TYPE_COLORS[type] || '#94a3b8' }} />
                                        <p className="text-[10px] font-semibold text-slate-500 mb-0.5">{TYPE_LABELS[type] || type}</p>
                                        <p className="text-lg font-black text-slate-800">%{rate}</p>
                                        <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                                                style={{ width: `${Math.min(100, rate)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!responseByType.length && !sortedManagers.length && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Shield size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Onay sureci verisi bulunamadi.</p>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
