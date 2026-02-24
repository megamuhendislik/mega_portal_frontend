import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Clock, CheckCircle2, XCircle, AlertCircle, Timer, Users, TrendingUp, Calendar, ChevronUp, ChevronDown, Loader2, Info } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const DAY_NAMES_SHORT = ['Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct', 'Pa'];

const PIE_COLORS = {
    intended: '#10b981',   // emerald-500 (Planlı)
    manual: '#ef4444',     // red-500 (Manuel Giriş)
    potential: '#f59e0b',  // amber-500 (Planlanmamış)
};

const PIE_LABELS = {
    intended: 'Planlı',
    manual: 'Manuel Giriş',
    potential: 'Planlanmamış',
};

const BAR_COLORS = {
    assignments: '#8b5cf6', // violet
    requests: '#3b82f6',    // blue
    approved: '#10b981',    // emerald
};

function KPICard({ label, value, suffix, icon, gradient }) {
    return (
        <div className={`${gradient} text-white p-4 rounded-2xl shadow-lg relative overflow-hidden`}>
            <p className="opacity-70 text-[11px] font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-xl sm:text-2xl font-black">
                {value}{suffix && <span className="text-sm ml-1 font-bold opacity-80">{suffix}</span>}
            </h3>
            <div className="absolute -right-3 -bottom-3 opacity-10">{icon}</div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
            <p className="font-bold text-slate-700 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-xs flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-bold text-slate-800">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

export default function TeamOvertimeAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [range, setRange] = useState(6);
    const [sortCol, setSortCol] = useState('assignments');
    const [sortDir, setSortDir] = useState('desc');

    const fetchAnalytics = async () => {
        try {
            setError('');
            setLoading(true);
            const res = await api.get('/overtime-assignments/team-analytics/', { params: { range } });
            setData(res.data);
        } catch (err) {
            console.error('TeamOvertimeAnalytics error:', err);
            setError('Ekip mesai analizi yuklenemedi.');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [range]);

    // Prepare chart data
    const pieData = useMemo(() => {
        if (!data?.source_distribution) return [];
        return Object.entries(data.source_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: PIE_LABELS[key] || key,
                value,
                color: PIE_COLORS[key] || '#94a3b8',
            }));
    }, [data]);

    const barData = useMemo(() => {
        if (!data?.monthly_trend) return [];
        return data.monthly_trend.map(m => ({
            name: m.label,
            Atama: m.assignments || 0,
            Talep: m.requests || 0,
            Onay: m.approved || 0,
        }));
    }, [data]);

    const heatmapData = useMemo(() => {
        if (!data?.weekly_heatmap) return DAY_NAMES_SHORT.map((d, i) => ({ day: d, count: 0, index: i }));
        const maxCount = Math.max(...Object.values(data.weekly_heatmap), 1);
        return DAY_NAMES_SHORT.map((day, i) => ({
            day,
            count: data.weekly_heatmap[String(i)] || 0,
            intensity: (data.weekly_heatmap[String(i)] || 0) / maxCount,
            index: i,
        }));
    }, [data]);

    const sortedEmployees = useMemo(() => {
        if (!data?.employee_breakdown) return [];
        return [...data.employee_breakdown].sort((a, b) => {
            const aVal = a[sortCol] ?? 0;
            const bVal = b[sortCol] ?? 0;
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
    }, [data, sortCol, sortDir]);

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
        return sortDir === 'desc' ? <ChevronDown size={12} className="text-blue-600" /> : <ChevronUp size={12} className="text-blue-600" />;
    };

    // --- Loading ---
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-16 bg-slate-100 rounded-2xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-72 bg-slate-100 rounded-3xl" />
                    <div className="h-72 bg-slate-100 rounded-3xl" />
                </div>
            </div>
        );
    }

    // --- Error ---
    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                    <AlertCircle size={32} className="text-red-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Hata</h3>
                <p className="text-sm text-slate-500 mt-1">{error}</p>
                <button onClick={fetchAnalytics} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                    Tekrar Dene
                </button>
            </div>
        );
    }

    // --- No Data ---
    if (!data || !data.summary) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <BarChart3 size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Veri Bulunamadi</h3>
                <p className="text-sm text-slate-500 mt-1">Secilen donem icin ekip mesai verisi bulunmamaktadir.</p>
            </div>
        );
    }

    const s = data.summary;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Ekip Mesai Analizi</h3>
                        <p className="text-xs text-slate-500">Ekibinizin fazla mesai istatistikleri</p>
                    </div>
                </div>
                <select
                    value={range}
                    onChange={e => setRange(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-500/20 outline-none min-w-[160px]"
                >
                    <option value={3}>Son 3 Ay</option>
                    <option value={6}>Son 6 Ay</option>
                    <option value={12}>Son 12 Ay</option>
                </select>
            </div>

            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPICard label="Toplam Atama" value={s.total_assignments || 0} icon={<Calendar size={56} />} gradient="bg-gradient-to-br from-slate-800 to-slate-900" />
                <KPICard label="Talep" value={s.total_requests || 0} icon={<Clock size={56} />} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                <KPICard label="Onay" value={s.approved || 0} icon={<CheckCircle2 size={56} />} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                <KPICard label="Red" value={s.rejected || 0} icon={<XCircle size={56} />} gradient="bg-gradient-to-br from-red-500 to-red-600" />
                <KPICard label="Talep %" value={s.claim_rate != null ? s.claim_rate.toFixed(0) : 0} suffix="%" icon={<TrendingUp size={56} />} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                <KPICard label="Onay %" value={s.approval_rate != null ? s.approval_rate.toFixed(1) : 0} suffix="%" icon={<CheckCircle2 size={56} />} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
            </div>

            {/* KPI Cards Row 2 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Toplam Saat" value={s.total_hours != null ? s.total_hours.toFixed(1) : 0} suffix="s" icon={<Clock size={56} />} gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                <KPICard label="Suresi Dolmus" value={s.expired || 0} icon={<Timer size={56} />} gradient="bg-gradient-to-br from-rose-500 to-rose-600" />
                <KPICard label="Bekleyen" value={s.pending || 0} icon={<AlertCircle size={56} />} gradient="bg-gradient-to-br from-amber-400 to-amber-500" />
                <KPICard label="Ort. Talep Suresi" value={data.avg_claim_days != null ? data.avg_claim_days.toFixed(1) : '-'} suffix="gun" icon={<Calendar size={56} />} gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie: Source Distribution */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                            <Info size={16} />
                        </div>
                        Kaynak Dagilimi
                    </h4>
                    {pieData.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2">
                                {pieData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm">
                                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                                        <span className="text-slate-600">{item.name}:</span>
                                        <span className="font-bold text-slate-800">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Kaynak verisi yok</div>
                    )}
                </div>

                {/* Bar: Monthly Trend */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                        Aylik Trend
                    </h4>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="Atama" fill={BAR_COLORS.assignments} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Talep" fill={BAR_COLORS.requests} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Onay" fill={BAR_COLORS.approved} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Trend verisi yok</div>
                    )}
                </div>
            </div>

            {/* Weekly Heatmap */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Calendar size={16} />
                    </div>
                    Haftalik Yogunluk
                </h4>
                <div className="flex items-end gap-3 justify-center h-32">
                    {heatmapData.map((item) => {
                        const barHeight = Math.max(item.intensity * 100, 4);
                        const bgColor = item.count === 0
                            ? 'bg-slate-100'
                            : item.intensity > 0.7
                            ? 'bg-violet-500'
                            : item.intensity > 0.4
                            ? 'bg-violet-400'
                            : item.intensity > 0.15
                            ? 'bg-violet-300'
                            : 'bg-violet-200';
                        return (
                            <div key={item.index} className="flex flex-col items-center gap-2 flex-1 max-w-[60px]">
                                <span className="text-xs font-bold text-slate-700">{item.count}</span>
                                <div
                                    className={`w-full rounded-lg ${bgColor} transition-all`}
                                    style={{ height: `${barHeight}%`, minHeight: '4px' }}
                                    title={`${item.day}: ${item.count} atama`}
                                />
                                <span className="text-[11px] font-bold text-slate-500">{item.day}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Employee Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                        Calisan Bazli Tablo
                    </h4>
                </div>
                {sortedEmployees.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="text-left py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Calisan</th>
                                    <th className="text-left py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Departman</th>
                                    {[
                                        { key: 'assignments', label: 'Atama' },
                                        { key: 'requests', label: 'Talep' },
                                        { key: 'approved', label: 'Onay' },
                                        { key: 'rejected', label: 'Red' },
                                        { key: 'claimed', label: 'Claim' },
                                        { key: 'expired', label: 'Expired' },
                                        { key: 'hours', label: 'Saat' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className="text-center py-3 px-3 font-bold text-xs text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.label}
                                                <SortIcon col={col.key} />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEmployees.map((emp, idx) => (
                                    <tr
                                        key={emp.employee_id || idx}
                                        className={`border-t border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-25'}`}
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                    {(emp.name || '?')[0]}
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-xs">{emp.department || '-'}</td>
                                        <td className="py-3 px-3 text-center font-bold text-slate-700">{emp.assignments || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-blue-600">{emp.requests || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-emerald-600">{emp.approved || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-red-600">{emp.rejected || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-amber-600">{emp.claimed || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-rose-600">{emp.expired || 0}</td>
                                        <td className="py-3 px-3 text-center font-bold text-indigo-600">{emp.hours != null ? emp.hours.toFixed(1) : 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-400 text-sm">Calisan verisi bulunamadi.</div>
                )}
            </div>

            {/* Average Claim Days */}
            {data.avg_claim_days != null && (
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                        <Timer size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">
                            Ortalama Talep Suresi: <span className="text-violet-700">{data.avg_claim_days.toFixed(1)} gun</span>
                        </p>
                        <p className="text-xs text-slate-500">Atama tarihinden talep tarihine kadar gecen ortalama sure</p>
                    </div>
                </div>
            )}
        </div>
    );
}
