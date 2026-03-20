import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DatePicker } from 'antd';
import {
    FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
    ArrowUpRight, ArrowDownRight, Minus,
    Loader2, AlertCircle, RefreshCw,
    Palmtree, Zap, UtensilsCrossed, CreditCard, Heart
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/api';

/* ========================================
   CONSTANTS
   ======================================== */
const QUICK_FILTERS = [
    { key: 'this_week', label: 'Bu Hafta' },
    { key: 'last_7', label: 'Son 7 Gun' },
    { key: 'this_month', label: 'Bu Ay' },
    { key: 'last_month', label: 'Gecen Ay' },
];

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

const TYPE_ICONS = {
    leave: Palmtree,
    overtime: Zap,
    meal: UtensilsCrossed,
    cardless: CreditCard,
    health: Heart,
};

const STATUS_COLORS = {
    approved: '#10B981',
    rejected: '#EF4444',
    pending: '#F59E0B',
    cancelled: '#94A3B8',
};

const STATUS_LABELS = {
    approved: 'Onaylandi',
    rejected: 'Reddedildi',
    pending: 'Bekliyor',
    cancelled: 'Iptal',
};

function buildQueryParams(quickFilter, customRange) {
    const params = {};
    const today = new Date();
    if (quickFilter === 'custom' && customRange.start && customRange.end) {
        params.start_date = customRange.start;
        params.end_date = customRange.end;
    } else if (quickFilter === 'this_week') {
        const mon = new Date(today);
        mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
        params.start_date = mon.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
    } else if (quickFilter === 'last_7') {
        const d = new Date(today); d.setDate(d.getDate() - 7);
        params.start_date = d.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
    } else if (quickFilter === 'last_month') {
        const d = new Date(today.getFullYear(), today.getMonth() - 1, 26);
        const e = new Date(today.getFullYear(), today.getMonth(), 25);
        params.start_date = d.toISOString().split('T')[0];
        params.end_date = e.toISOString().split('T')[0];
    } else {
        if (today.getDate() >= 26) {
            params.start_date = new Date(today.getFullYear(), today.getMonth(), 26).toISOString().split('T')[0];
            params.end_date = new Date(today.getFullYear(), today.getMonth() + 1, 25).toISOString().split('T')[0];
        } else {
            params.start_date = new Date(today.getFullYear(), today.getMonth() - 1, 26).toISOString().split('T')[0];
            params.end_date = new Date(today.getFullYear(), today.getMonth(), 25).toISOString().split('T')[0];
        }
    }
    return params;
}

/* ========================================
   KPI CARD
   ======================================== */
function KPICard({ label, value, suffix, icon: Icon, gradient, delta }) {
    const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
    const deltaColor = delta > 0 ? 'text-emerald-200' : delta < 0 ? 'text-red-200' : 'text-white/50';
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden`}>
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
            {Icon && <div className="absolute -right-3 -bottom-3 opacity-10"><Icon size={48} /></div>}
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
   STATUS BADGE
   ======================================== */
function StatusBadge({ status }) {
    const styles = {
        approved: 'bg-emerald-100 text-emerald-700',
        rejected: 'bg-red-100 text-red-700',
        pending: 'bg-amber-100 text-amber-700',
        cancelled: 'bg-slate-100 text-slate-500',
    };
    const icons = {
        approved: CheckCircle2,
        rejected: XCircle,
        pending: Clock,
        cancelled: AlertTriangle,
    };
    const BadgeIcon = icons[status] || Clock;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${styles[status] || styles.pending}`}>
            <BadgeIcon size={10} />
            {STATUS_LABELS[status] || status}
        </span>
    );
}

/* ========================================
   MAIN COMPONENT
   ======================================== */
export default function PersonalRequestAnalytics() {
    const [quickFilter, setQuickFilter] = useState('this_month');
    const [customRange, setCustomRange] = useState({ start: null, end: null });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const queryParams = useMemo(() => buildQueryParams(quickFilter, customRange), [quickFilter, customRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/request-analytics-v2/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('PersonalRequestAnalytics fetch error:', err);
            setError('Kisisel talep verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Pie chart data
    const pieData = useMemo(() => {
        if (!data?.type_distribution) return [];
        return Object.entries(data.type_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: TYPE_LABELS[key] || key,
                value,
                color: TYPE_COLORS[key] || '#94a3b8',
            }));
    }, [data?.type_distribution]);

    // Monthly trend
    const trendData = useMemo(() => {
        if (!data?.monthly_trend?.length) return [];
        return data.monthly_trend.map(m => ({
            name: m.label,
            Onaylandi: m.approved ?? 0,
            Reddedildi: m.rejected ?? 0,
            Bekliyor: m.pending ?? 0,
        }));
    }, [data?.monthly_trend]);

    const kpi = data?.kpi;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={28} className="text-indigo-500 animate-spin mb-3" />
                <span className="text-sm text-slate-400">Kisisel talep analitigi yukleniyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={28} className="text-red-400" />
                <p className="text-sm text-slate-500">{error}</p>
                <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {QUICK_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setQuickFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                quickFilter === f.key
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <DatePicker.RangePicker
                    size="small"
                    onChange={(dates) => {
                        if (dates) {
                            setCustomRange({ start: dates[0].format('YYYY-MM-DD'), end: dates[1].format('YYYY-MM-DD') });
                            setQuickFilter('custom');
                        }
                    }}
                    className="rounded-lg"
                    placeholder={['Baslangic', 'Bitis']}
                />
            </div>

            {/* 5 KPI Cards */}
            {kpi && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <KPICard label="Toplam Talep" value={kpi.total_requests} suffix="" icon={FileText} gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" delta={kpi.vs_prev?.total} />
                    <KPICard label="Onay Orani" value={kpi.approval_rate} suffix="%" icon={CheckCircle2} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" delta={kpi.vs_prev?.approval_rate} />
                    <KPICard label="Bekleyen" value={kpi.pending_count} suffix="" icon={Clock} gradient="bg-gradient-to-br from-amber-500 to-amber-600" delta={null} />
                    <KPICard label="Ort. Yanit" value={kpi.avg_response_hours} suffix="s" icon={AlertTriangle} gradient="bg-gradient-to-br from-violet-500 to-violet-600" delta={kpi.vs_prev?.avg_response} />
                    <KPICard label="Red Orani" value={kpi.rejection_rate} suffix="%" icon={XCircle} gradient="bg-gradient-to-br from-rose-500 to-rose-600" delta={kpi.vs_prev?.rejection_rate} />
                </div>
            )}

            {/* Charts Row: Pie + Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Type Distribution Donut */}
                {pieData.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Talep Turu Dagilimi</h4>
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
                                                <p className="text-slate-500">{d.value} talep</p>
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

                {/* Monthly Trend Stacked Bar */}
                {trendData.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aylik Trend</h4>
                        <div className="overflow-x-auto -mx-2">
                            <ResponsiveContainer width="100%" height={250} minWidth={350}>
                                <BarChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={50} />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                                    <Bar dataKey="Onaylandi" stackId="a" fill={STATUS_COLORS.approved} radius={[0, 0, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="Reddedildi" stackId="a" fill={STATUS_COLORS.rejected} radius={[0, 0, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="Bekliyor" stackId="a" fill={STATUS_COLORS.pending} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Requests Table */}
            {data?.recent_requests?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Son Taleplerim</h4>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Tarih</th>
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Tur</th>
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Yanit Suresi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_requests.map((req, idx) => {
                                    const TypeIcon = TYPE_ICONS[req.type] || FileText;
                                    return (
                                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3 py-2.5 text-slate-600">{req.date}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <TypeIcon size={12} style={{ color: TYPE_COLORS[req.type] || '#64748b' }} />
                                                    <span className="font-semibold text-slate-700">{TYPE_LABELS[req.type] || req.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">
                                                {req.response_hours != null ? `${req.response_hours}s` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-2">
                        {data.recent_requests.map((req, idx) => {
                            const TypeIcon = TYPE_ICONS[req.type] || FileText;
                            return (
                                <div key={idx} className="bg-slate-50 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <TypeIcon size={12} style={{ color: TYPE_COLORS[req.type] || '#64748b' }} />
                                            <span className="text-xs font-bold text-slate-700">{TYPE_LABELS[req.type] || req.type}</span>
                                        </div>
                                        <StatusBadge status={req.status} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400">{req.date}</span>
                                        <span className="text-[10px] text-slate-500">
                                            {req.response_hours != null ? `Yanit: ${req.response_hours}s` : ''}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!data?.kpi && !pieData.length && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FileText size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Bu donem icin talep verisi bulunamadi.</p>
                </div>
            )}
        </div>
    );
}
