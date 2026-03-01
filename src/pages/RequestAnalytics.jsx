import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart3, Clock, CheckCircle2, XCircle, AlertCircle, Timer, Users,
    TrendingUp, Calendar, ChevronUp, ChevronDown, Loader2, FileText,
    ChefHat, CreditCard, Briefcase, Activity, PieChart as PieChartIcon,
    ArrowUpRight, ArrowDownRight, ChevronRight, Hash, Zap, Coffee,
    Building2, UserCheck, GitBranch, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Line
} from 'recharts';
import api from '../services/api';
import clsx from 'clsx';

// ─── Color Palette ──────────────────────────────────────────────
const COLORS = {
    leave: '#3B82F6',
    overtime: '#F59E0B',
    meal: '#10B981',
    cardless: '#8B5CF6',
    approved: '#10B981',
    rejected: '#EF4444',
    pending: '#F59E0B',
    cancelled: '#94A3B8',
};

const TYPE_LABELS = {
    leave: 'İzin',
    overtime: 'Ek Mesai',
    meal: 'Yemek',
    cardless: 'Kartsız Giriş',
};

const TYPE_ICONS = {
    leave: Calendar,
    overtime: Zap,
    meal: ChefHat,
    cardless: CreditCard,
};

const STATUS_LABELS = {
    approved: 'Onaylanan',
    rejected: 'Reddedilen',
    pending: 'Bekleyen',
};

// ─── Reusable Sub-Components ────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-xs flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: p.color || p.fill }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-bold text-slate-800">{typeof p.value === 'number' ? p.value.toLocaleString('tr-TR') : p.value}</span>
                </p>
            ))}
        </div>
    );
}

function KPICard({ title, value, suffix, subtitle, icon: Icon, gradient, iconBg, textColor = 'text-white' }) {
    return (
        <div className={clsx(
            'relative overflow-hidden rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]',
            gradient
        )}>
            <div className="relative z-10">
                <p className={clsx('text-[11px] font-bold uppercase tracking-wider mb-1', textColor === 'text-white' ? 'opacity-70' : 'text-slate-400')}>
                    {title}
                </p>
                <h3 className={clsx('text-2xl sm:text-3xl font-black tracking-tight', textColor)}>
                    {value}
                    {suffix && <span className={clsx('text-sm ml-1 font-bold', textColor === 'text-white' ? 'opacity-80' : 'text-slate-400')}>{suffix}</span>}
                </h3>
                {subtitle && (
                    <p className={clsx('text-[11px] mt-1 font-medium', textColor === 'text-white' ? 'opacity-60' : 'text-slate-400')}>
                        {subtitle}
                    </p>
                )}
            </div>
            {Icon && (
                <div className="absolute -right-3 -bottom-3 opacity-10">
                    <Icon size={64} />
                </div>
            )}
        </div>
    );
}

function SectionCard({ title, subtitle, icon: Icon, iconGradient, children, collapsible = false, defaultOpen = true, badge }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            <div
                className={clsx(
                    'flex items-center justify-between p-5 border-b border-slate-50',
                    collapsible && 'cursor-pointer select-none hover:bg-slate-50/50 transition-colors'
                )}
                onClick={collapsible ? () => setOpen(o => !o) : undefined}
            >
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-white', iconGradient || 'bg-gradient-to-br from-blue-500 to-blue-600')}>
                            <Icon size={18} />
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-slate-800 text-base">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    {badge && (
                        <span className="ml-2 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">{badge}</span>
                    )}
                </div>
                {collapsible && (
                    <ChevronDown size={18} className={clsx('text-slate-400 transition-transform duration-300', open && 'rotate-180')} />
                )}
            </div>
            {(!collapsible || open) && (
                <div className="p-5 animate-fade-in">{children}</div>
            )}
        </div>
    );
}

function SortableHeader({ label, col, currentCol, currentDir, onSort, className }) {
    return (
        <th
            className={clsx('px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors select-none', className)}
            onClick={() => onSort(col)}
        >
            <span className="flex items-center gap-1">
                {label}
                {currentCol === col
                    ? (currentDir === 'desc' ? <ChevronDown size={12} className="text-blue-600" /> : <ChevronUp size={12} className="text-blue-600" />)
                    : <ChevronDown size={12} className="text-slate-300" />
                }
            </span>
        </th>
    );
}

function EmptyState({ message }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                <FileText size={28} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 font-medium">{message}</p>
        </div>
    );
}

function ProgressBar({ value, max, color = 'bg-blue-500', height = 'h-2' }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className={clsx('w-full bg-slate-100 rounded-full overflow-hidden', height)}>
            <div className={clsx('rounded-full transition-all duration-500', color, height)} style={{ width: `${pct}%` }} />
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────

export default function RequestAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [range, setRange] = useState(6);

    // Table sort states
    const [empSort, setEmpSort] = useState({ col: 'total', dir: 'desc' });
    const [deptSort, setDeptSort] = useState({ col: 'total', dir: 'desc' });
    const [corrSort, setCorrSort] = useState({ col: 'overtime_hours', dir: 'desc' });
    const [indirectSort, setIndirectSort] = useState({ col: 'requests_received', dir: 'desc' });

    const fetchData = useCallback(async () => {
        try {
            setError('');
            setLoading(true);
            const res = await api.get('/request-analytics/comprehensive/', { params: { range } });
            setData(res.data);
        } catch (err) {
            console.error('RequestAnalytics fetch error:', err);
            setError('Talep analizi verileri yüklenemedi.');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Sort Helpers ─────────────────────────────────────────────

    const makeSortHandler = (sortState, setSortState) => (col) => {
        if (sortState.col === col) {
            setSortState(s => ({ ...s, dir: s.dir === 'desc' ? 'asc' : 'desc' }));
        } else {
            setSortState({ col, dir: 'desc' });
        }
    };

    const sortArray = (arr, sortState) => {
        if (!arr) return [];
        return [...arr].sort((a, b) => {
            const aVal = a[sortState.col] ?? 0;
            const bVal = b[sortState.col] ?? 0;
            if (typeof aVal === 'string') {
                return sortState.dir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
            }
            return sortState.dir === 'desc' ? bVal - aVal : aVal - bVal;
        });
    };

    // ─── Memoized Data Preparation ────────────────────────────────

    const monthlyTrendData = useMemo(() => {
        if (!data?.monthly_trend) return [];
        return data.monthly_trend.map(m => ({
            name: m.label,
            İzin: m.leave || 0,
            'Ek Mesai': m.overtime || 0,
            Yemek: m.meal || 0,
            'Kartsız': m.cardless || 0,
            Toplam: m.total || 0,
            'Mesai Saat': m.overtime_hours || 0,
            'İzin Gün': m.leave_days || 0,
        }));
    }, [data]);

    const typeDistributionData = useMemo(() => {
        if (!data?.overview?.by_type) return [];
        return Object.entries(data.overview.by_type)
            .filter(([, v]) => (v.total || 0) > 0)
            .map(([key, v]) => ({
                name: TYPE_LABELS[key] || key,
                value: v.total || 0,
                color: COLORS[key] || '#94A3B8',
            }));
    }, [data]);

    const statusDistributionData = useMemo(() => {
        if (!data?.overview?.by_type) return [];
        let approved = 0, rejected = 0, pending = 0;
        Object.values(data.overview.by_type).forEach(v => {
            approved += v.approved || 0;
            rejected += v.rejected || 0;
            pending += v.pending || 0;
        });
        return [
            { name: 'Onaylanan', value: approved, color: COLORS.approved },
            { name: 'Reddedilen', value: rejected, color: COLORS.rejected },
            { name: 'Bekleyen', value: pending, color: COLORS.pending },
        ].filter(d => d.value > 0);
    }, [data]);

    const weeklyPatternData = useMemo(() => {
        if (!data?.weekly_pattern) return [];
        return data.weekly_pattern.map(d => ({
            name: d.day_short || d.day,
            İzin: d.leave || 0,
            'Ek Mesai': d.overtime || 0,
            Yemek: d.meal || 0,
            'Kartsız': d.cardless || 0,
            Toplam: d.total || 0,
        }));
    }, [data]);

    const overtimeSourceData = useMemo(() => {
        if (!data?.overtime_sources) return [];
        const sources = data.overtime_sources;
        const labels = { intended: 'Planlanan', potential: 'Planlanmamış', manual: 'Manuel' };
        const colors = { intended: '#10B981', potential: '#F59E0B', manual: '#EF4444' };
        return Object.entries(sources)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: labels[key] || key,
                value,
                color: colors[key] || '#94A3B8',
            }));
    }, [data]);

    const leaveTypeData = useMemo(() => {
        if (!data?.leave_types) return [];
        return data.leave_types.map(lt => ({
            name: lt.name,
            Talep: lt.count || 0,
            Onay: lt.approved || 0,
            'Gün': lt.total_days || 0,
        }));
    }, [data]);

    const sortedEmployees = useMemo(() => sortArray(data?.employee_breakdown, empSort), [data, empSort]);
    const sortedDepts = useMemo(() => sortArray(data?.department_breakdown, deptSort), [data, deptSort]);
    const sortedCorr = useMemo(() => sortArray(data?.overtime_meal_correlation, corrSort), [data, corrSort]);
    const sortedIndirect = useMemo(() => sortArray(data?.indirect_analysis?.subordinate_managers, indirectSort), [data, indirectSort]);

    const assignmentData = useMemo(() => {
        if (!data?.assignment_stats) return [];
        const s = data.assignment_stats;
        const labels = { assigned: 'Atanan', claimed: 'Talep Edilen', expired: 'Süresi Dolan', cancelled: 'İptal' };
        const colors = { assigned: '#3B82F6', claimed: '#10B981', expired: '#EF4444', cancelled: '#94A3B8' };
        return Object.entries(labels).map(([key, name]) => ({
            name,
            value: s[key] || 0,
            color: colors[key],
        })).filter(d => d.value > 0);
    }, [data]);

    // ─── Render: Loading ──────────────────────────────────────────

    if (loading) {
        return (
            <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-6 pb-10 space-y-6">
                <div className="animate-pulse space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="h-10 w-56 bg-slate-200/80 rounded-xl" />
                        <div className="h-10 w-48 bg-slate-200/80 rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-slate-200/80 rounded-2xl" />)}
                    </div>
                    <div className="h-80 bg-slate-200/80 rounded-2xl" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-72 bg-slate-200/80 rounded-2xl" />
                        <div className="h-72 bg-slate-200/80 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render: Error ────────────────────────────────────────────

    if (error && !data) {
        return (
            <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-6 pb-10">
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                        <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Veri Yüklenemedi</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
                    <button
                        onClick={fetchData}
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={14} />
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    // ─── Render: No Data ──────────────────────────────────────────

    if (!data || !data.overview) {
        return (
            <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-6 pb-10">
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <BarChart3 size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Veri Bulunamadi</h3>
                    <p className="text-sm text-slate-500 mt-1">Secilen donem icin talep verisi bulunmamaktadir.</p>
                </div>
            </div>
        );
    }

    const { overview, period, requester } = data;

    // ─── Render: Main Content ─────────────────────────────────────

    return (
        <div className="max-w-[1700px] mx-auto px-4 md:px-8 pt-6 pb-10 space-y-6">

            {/* ── 1. Header ─────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800">
                        Talep Analizleri
                    </h1>
                    {period && (
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(period.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' — '}
                            {new Date(period.end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {requester?.managed_count > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <Users size={14} className="text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-700">{requester.managed_count} Kisi</span>
                        </div>
                    )}

                    <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                        {[3, 6, 12].map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={clsx(
                                    'px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200',
                                    range === r
                                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                )}
                            >
                                {r} Ay
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        title="Yenile"
                    >
                        <RefreshCw size={16} className="text-slate-500" />
                    </button>
                </div>
            </div>

            {/* ── 2. KPI Cards ──────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KPICard
                    title="Toplam Talep"
                    value={overview.total_requests?.toLocaleString('tr-TR') || 0}
                    icon={FileText}
                    gradient="bg-gradient-to-br from-slate-800 to-slate-900"
                />
                <KPICard
                    title="Onay Orani"
                    value={overview.approval_rate != null ? overview.approval_rate.toFixed(1) : '0'}
                    suffix="%"
                    icon={CheckCircle2}
                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                />
                <KPICard
                    title="Toplam Ek Mesai"
                    value={overview.total_overtime_hours != null ? overview.total_overtime_hours.toFixed(1) : '0'}
                    suffix="saat"
                    icon={Zap}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                />
                <KPICard
                    title="Toplam Izin"
                    value={overview.total_leave_days?.toLocaleString('tr-TR') || 0}
                    suffix="gun"
                    icon={Calendar}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <KPICard
                    title="Ort. Yanit Suresi"
                    value={overview.avg_response_hours != null ? overview.avg_response_hours.toFixed(1) : '-'}
                    suffix="saat"
                    icon={Clock}
                    gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                />
                <KPICard
                    title="Yonetilen Kisi"
                    value={overview.managed_employee_count || requester?.managed_count || 0}
                    icon={Users}
                    gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
                />
            </div>

            {/* ── Type Detail Mini-Cards ────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(overview.by_type || {}).map(([typeKey, typeData]) => {
                    const Icon = TYPE_ICONS[typeKey] || FileText;
                    const total = typeData.total || 0;
                    const approved = typeData.approved || 0;
                    const rejected = typeData.rejected || 0;
                    const pending = typeData.pending || 0;
                    const rate = total > 0 ? ((approved / total) * 100).toFixed(0) : 0;
                    return (
                        <div key={typeKey} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS[typeKey] + '15', color: COLORS[typeKey] }}>
                                        <Icon size={16} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{TYPE_LABELS[typeKey]}</span>
                                </div>
                                <span className="text-xl font-black text-slate-800">{total}</span>
                            </div>
                            <div className="flex gap-2 text-[10px] font-bold">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{approved} Onay</span>
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600">{rejected} Red</span>
                                {pending > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{pending} Bekl.</span>}
                            </div>
                            <div className="mt-2">
                                <ProgressBar value={approved} max={total} color="bg-emerald-500" height="h-1.5" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Onay orani: %{rate}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── 3. Monthly Trend ──────────────────────────────── */}
            <SectionCard
                title="Aylik Trend"
                subtitle="Son doneme ait aylik talep dagilimi"
                icon={TrendingUp}
                iconGradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            >
                {monthlyTrendData.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Stacked Bar Chart */}
                        <div className="xl:col-span-2">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={monthlyTrendData} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    <Bar dataKey="İzin" stackId="a" fill={COLORS.leave} radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Ek Mesai" stackId="a" fill={COLORS.overtime} />
                                    <Bar dataKey="Yemek" stackId="a" fill={COLORS.meal} />
                                    <Bar dataKey="Kartsız" stackId="a" fill={COLORS.cardless} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Overtime Hours Trend */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Mesai Saat & Izin Gun Trendi</p>
                            <ResponsiveContainer width="100%" height={280}>
                                <ComposedChart data={monthlyTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} iconType="circle" iconSize={7} />
                                    <Area yAxisId="left" type="monotone" dataKey="Mesai Saat" fill={COLORS.overtime + '30'} stroke={COLORS.overtime} strokeWidth={2} name="Mesai (saat)" />
                                    <Line yAxisId="right" type="monotone" dataKey="İzin Gün" stroke={COLORS.leave} strokeWidth={2} dot={{ r: 3 }} name="İzin (gün)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <EmptyState message="Aylik trend verisi bulunamadi." />
                )}
            </SectionCard>

            {/* ── 4. Distribution (Type + Status) ───────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Type Distribution */}
                <SectionCard
                    title="Talep Turu Dagilimi"
                    subtitle="Ture gore talep oranlari"
                    icon={PieChartIcon}
                    iconGradient="bg-gradient-to-br from-violet-500 to-purple-600"
                >
                    {typeDistributionData.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={typeDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        animationBegin={0}
                                        animationDuration={800}
                                    >
                                        {typeDistributionData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 min-w-[140px]">
                                {typeDistributionData.map((d, i) => (
                                    <div key={i} className="flex items-center gap-2.5">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                        <span className="text-xs text-slate-600 font-medium">{d.name}</span>
                                        <span className="text-xs font-bold text-slate-800 ml-auto">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState message="Talep turu verisi bulunamadi." />
                    )}
                </SectionCard>

                {/* Status Distribution */}
                <SectionCard
                    title="Onay Durum Dagilimi"
                    subtitle="Durum bazinda talep dagilimi"
                    icon={CheckCircle2}
                    iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                >
                    {statusDistributionData.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={statusDistributionData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        animationBegin={0}
                                        animationDuration={800}
                                    >
                                        {statusDistributionData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 min-w-[140px]">
                                {statusDistributionData.map((d, i) => (
                                    <div key={i} className="flex items-center gap-2.5">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                        <span className="text-xs text-slate-600 font-medium">{d.name}</span>
                                        <span className="text-xs font-bold text-slate-800 ml-auto">{d.value}</span>
                                    </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500 font-medium">Onay Orani</span>
                                        <span className="text-sm font-black text-emerald-600">%{overview.approval_rate?.toFixed(1) || '0'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <EmptyState message="Durum verisi bulunamadi." />
                    )}
                </SectionCard>
            </div>

            {/* ── 5. Team Analysis ──────────────────────────────── */}
            <SectionCard
                title="Ekip Analizi"
                subtitle="Departman, rol ve kisi bazli talep kirilimi"
                icon={Users}
                iconGradient="bg-gradient-to-br from-indigo-500 to-blue-600"
                collapsible
                defaultOpen={true}
                badge={`${(data.employee_breakdown || []).length} kisi`}
            >
                <div className="space-y-6">

                    {/* 5a. Department Breakdown */}
                    {data.department_breakdown && data.department_breakdown.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400" />
                                Departman Kirilimi
                            </h4>
                            <div className="overflow-x-auto -mx-2">
                                <table className="w-full min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <SortableHeader label="Departman" col="name" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} />
                                            <SortableHeader label="Kisi" col="employee_count" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Toplam" col="total" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Izin" col="leave" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Mesai" col="overtime" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Yemek" col="meal" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Kartsiz" col="cardless" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Mesai Saat" col="overtime_hours" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <SortableHeader label="Izin Gun" col="leave_days" currentCol={deptSort.col} currentDir={deptSort.dir} onSort={makeSortHandler(deptSort, setDeptSort)} className="text-center" />
                                            <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Onay %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sortedDepts.map((dept, i) => {
                                            const approvalRate = dept.total > 0 ? ((dept.approved || 0) / dept.total * 100) : 0;
                                            return (
                                                <tr key={dept.dept_id || i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-3 py-3 text-sm font-bold text-slate-700">{dept.name}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-slate-600">{dept.employee_count || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center font-bold text-slate-800">{dept.total || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center"><span className="text-blue-600 font-medium">{dept.leave || 0}</span></td>
                                                    <td className="px-3 py-3 text-sm text-center"><span className="text-amber-600 font-medium">{dept.overtime || 0}</span></td>
                                                    <td className="px-3 py-3 text-sm text-center"><span className="text-emerald-600 font-medium">{dept.meal || 0}</span></td>
                                                    <td className="px-3 py-3 text-sm text-center"><span className="text-violet-600 font-medium">{dept.cardless || 0}</span></td>
                                                    <td className="px-3 py-3 text-sm text-center font-medium text-slate-600">{(dept.overtime_hours || 0).toFixed(1)}</td>
                                                    <td className="px-3 py-3 text-sm text-center font-medium text-slate-600">{dept.leave_days || 0}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <span className={clsx(
                                                            'text-xs font-bold px-2 py-0.5 rounded-full',
                                                            approvalRate >= 80 ? 'bg-emerald-50 text-emerald-700' :
                                                            approvalRate >= 50 ? 'bg-amber-50 text-amber-700' :
                                                            'bg-red-50 text-red-600'
                                                        )}>
                                                            %{approvalRate.toFixed(0)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Department Bar Chart */}
                            {sortedDepts.length > 0 && (
                                <div className="mt-4">
                                    <ResponsiveContainer width="100%" height={Math.max(sortedDepts.length * 40, 120)}>
                                        <BarChart data={sortedDepts.slice(0, 10)} layout="vertical" barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} iconType="circle" iconSize={7} />
                                            <Bar dataKey="leave" stackId="a" fill={COLORS.leave} name="İzin" />
                                            <Bar dataKey="overtime" stackId="a" fill={COLORS.overtime} name="Ek Mesai" />
                                            <Bar dataKey="meal" stackId="a" fill={COLORS.meal} name="Yemek" />
                                            <Bar dataKey="cardless" stackId="a" fill={COLORS.cardless} name="Kartsız" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5b. Role Breakdown */}
                    {data.role_breakdown && data.role_breakdown.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Briefcase size={14} className="text-slate-400" />
                                Rol / Pozisyon Kirilimi
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.role_breakdown.map((role, i) => (
                                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-slate-700">{role.role}</span>
                                            <span className="text-xs text-slate-400 font-medium">{role.employee_count || 0} kisi</span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {[
                                                { key: 'leave', label: 'Izin', bg: 'bg-blue-50', text: 'text-blue-700' },
                                                { key: 'overtime', label: 'Mesai', bg: 'bg-amber-50', text: 'text-amber-700' },
                                                { key: 'meal', label: 'Yemek', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                                                { key: 'cardless', label: 'Kartsiz', bg: 'bg-violet-50', text: 'text-violet-700' },
                                            ].map(({ key, label, bg, text }) => (
                                                (role[key] || 0) > 0 && (
                                                    <span key={key} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg} ${text}`}>
                                                        {role[key]} {label}
                                                    </span>
                                                )
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                                            <span className="text-[10px] text-slate-400 font-medium">Toplam</span>
                                            <span className="text-sm font-black text-slate-800">{role.total || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 5c. Employee Breakdown Table */}
                    {data.employee_breakdown && data.employee_breakdown.length > 0 && (
                        <div className="pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <UserCheck size={14} className="text-slate-400" />
                                Kisi Bazli Kirilim
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold">{data.employee_breakdown.length} kisi</span>
                            </h4>
                            <div className="overflow-x-auto -mx-2">
                                <table className="w-full min-w-[900px]">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <SortableHeader label="Ad Soyad" col="name" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} />
                                            <SortableHeader label="Departman" col="department" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} />
                                            <SortableHeader label="Pozisyon" col="role" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} />
                                            <SortableHeader label="Toplam" col="total" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Izin" col="leave" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Mesai" col="overtime" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Yemek" col="meal" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Kartsiz" col="cardless" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Onay" col="approved" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Mesai(s)" col="overtime_hours" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                            <SortableHeader label="Izin(g)" col="leave_days" currentCol={empSort.col} currentDir={empSort.dir} onSort={makeSortHandler(empSort, setEmpSort)} className="text-center" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sortedEmployees.map((emp, i) => {
                                            const maxTotal = Math.max(...data.employee_breakdown.map(e => e.total || 0), 1);
                                            return (
                                                <tr key={emp.id || i} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                                {(emp.name || '?')[0]}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-700">{emp.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-xs text-slate-500 font-medium">{emp.department}</td>
                                                    <td className="px-3 py-3 text-xs text-slate-500 font-medium">{emp.role}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-sm font-black text-slate-800">{emp.total || 0}</span>
                                                            <div className="w-12">
                                                                <ProgressBar value={emp.total || 0} max={maxTotal} color="bg-indigo-500" height="h-1" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-center text-blue-600 font-medium">{emp.leave || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-amber-600 font-medium">{emp.overtime || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-emerald-600 font-medium">{emp.meal || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-violet-600 font-medium">{emp.cardless || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-emerald-600 font-bold">{emp.approved || 0}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-slate-600 font-medium">{(emp.overtime_hours || 0).toFixed(1)}</td>
                                                    <td className="px-3 py-3 text-sm text-center text-slate-600 font-medium">{emp.leave_days || 0}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* ── 6. Overtime Analysis ──────────────────────────── */}
            <SectionCard
                title="Ek Mesai Analizi"
                subtitle="Kaynak dagilimi, atama istatistikleri ve haftalik yogunluk"
                icon={Zap}
                iconGradient="bg-gradient-to-br from-amber-500 to-orange-600"
                collapsible
                defaultOpen={true}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Source Distribution Pie */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kaynak Dagilimi</p>
                        {overtimeSourceData.length > 0 ? (
                            <div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={overtimeSourceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {overtimeSourceData.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-1.5 mt-2">
                                    {overtimeSourceData.map((d, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                            <span className="text-xs text-slate-600 font-medium">{d.name}</span>
                                            <span className="text-xs font-bold text-slate-800 ml-auto">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyState message="Kaynak verisi bulunamadi." />
                        )}
                    </div>

                    {/* Assignment Stats */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Atama Istatistikleri</p>
                        {data.assignment_stats ? (
                            <div className="space-y-3">
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-slate-500 font-medium">Toplam Atama</span>
                                        <span className="text-xl font-black text-slate-800">{data.assignment_stats.total || 0}</span>
                                    </div>
                                    {assignmentData.map((d, i) => (
                                        <div key={i} className="mb-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-medium text-slate-600">{d.name}</span>
                                                <span className="text-[11px] font-bold text-slate-700">{d.value}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full overflow-hidden h-1.5">
                                                <div className="rounded-full transition-all duration-500 h-1.5" style={{ width: `${Math.min((d.value / (data.assignment_stats.total || 1)) * 100, 100)}%`, backgroundColor: d.color }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Assignment mini pie */}
                                {assignmentData.length > 0 && (
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie
                                                data={assignmentData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={60}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {assignmentData.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        ) : (
                            <EmptyState message="Atama verisi bulunamadi." />
                        )}
                    </div>

                    {/* Weekly Heatmap / Pattern for Overtime */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Haftalik Mesai Yogunlugu</p>
                        {weeklyPatternData.length > 0 ? (
                            <div>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={weeklyPatternData} barCategoryGap="15%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="Ek Mesai" fill={COLORS.overtime} radius={[4, 4, 0, 0]} name="Ek Mesai" />
                                    </BarChart>
                                </ResponsiveContainer>
                                {/* Heatmap visual */}
                                <div className="flex gap-2 mt-3 justify-center">
                                    {weeklyPatternData.map((d, i) => {
                                        const maxOt = Math.max(...weeklyPatternData.map(w => w['Ek Mesai'] || 0), 1);
                                        const intensity = (d['Ek Mesai'] || 0) / maxOt;
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all"
                                                    style={{
                                                        backgroundColor: `rgba(245, 158, 11, ${0.1 + intensity * 0.7})`,
                                                        color: intensity > 0.5 ? '#78350f' : '#92400e',
                                                    }}
                                                >
                                                    {d['Ek Mesai'] || 0}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400">{d.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <EmptyState message="Haftalik veri bulunamadi." />
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* ── 7. Leave Analysis ─────────────────────────────── */}
            <SectionCard
                title="Izin Analizi"
                subtitle="Izin turu dagilimi ve kullanim istatistikleri"
                icon={Calendar}
                iconGradient="bg-gradient-to-br from-blue-500 to-cyan-600"
                collapsible
                defaultOpen={true}
            >
                {leaveTypeData.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Leave Type Bar Chart */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Izin Turu Dagilimi</p>
                            <ResponsiveContainer width="100%" height={Math.max(leaveTypeData.length * 50, 180)}>
                                <BarChart data={leaveTypeData} layout="vertical" barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 600 }} iconType="circle" iconSize={7} />
                                    <Bar dataKey="Talep" fill={COLORS.leave} name="Talep" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="Onay" fill={COLORS.approved} name="Onay" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Leave Type Detail Cards */}
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Izin Detaylari</p>
                            {data.leave_types.map((lt, i) => {
                                const rate = lt.count > 0 ? ((lt.approved || 0) / lt.count * 100).toFixed(0) : 0;
                                return (
                                    <div key={lt.type_id || i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{lt.name}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {lt.count} talep &middot; {lt.approved} onay &middot; {lt.total_days} gun
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="text-lg font-black text-slate-800">{lt.total_days || 0}</span>
                                                <span className="text-[10px] text-slate-400 font-bold ml-1">gun</span>
                                            </div>
                                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                                <span className="text-xs font-black text-blue-600">%{rate}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <EmptyState message="Izin turu verisi bulunamadi." />
                )}
            </SectionCard>

            {/* ── 8. Overtime & Meal Correlation ─────────────────── */}
            {data.overtime_meal_correlation && data.overtime_meal_correlation.length > 0 && (
                <SectionCard
                    title="Ek Mesai & Yemek Korelasyonu"
                    subtitle="Fazla mesai ve yemek talebi arasindaki iliski"
                    icon={Activity}
                    iconGradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    collapsible
                    defaultOpen={false}
                    badge={`${data.overtime_meal_correlation.length} kisi`}
                >
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <SortableHeader label="Ad Soyad" col="name" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} />
                                    <SortableHeader label="Departman" col="department" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} />
                                    <SortableHeader label="Mesai Gun" col="overtime_days" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} className="text-center" />
                                    <SortableHeader label="Mesai Saat" col="overtime_hours" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} className="text-center" />
                                    <SortableHeader label="Mesai+Yemek" col="meal_with_ot" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} className="text-center" />
                                    <SortableHeader label="Yemek(Mesaisiz)" col="meal_without_ot" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} className="text-center" />
                                    <SortableHeader label="Mesai(Yemeksiz)" col="ot_without_meal" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} className="text-center" />
                                    <SortableHeader label="Top. Yemek" col="total_meals" currentCol={corrSort.col} currentDir={corrSort.dir} onSort={makeSortHandler(corrSort, setCorrSort)} className="text-center" />
                                    <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Korelasyon</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedCorr.map((emp, i) => {
                                    // Correlation: how often meal comes with OT
                                    const totalMealOrOt = (emp.meal_with_ot || 0) + (emp.meal_without_ot || 0) + (emp.ot_without_meal || 0);
                                    const corrScore = totalMealOrOt > 0 ? ((emp.meal_with_ot || 0) / totalMealOrOt * 100) : 0;
                                    const corrColor = corrScore >= 70 ? 'text-emerald-600 bg-emerald-50' :
                                                      corrScore >= 40 ? 'text-amber-600 bg-amber-50' :
                                                      'text-red-500 bg-red-50';
                                    return (
                                        <tr key={emp.employee_id || i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3 py-3 text-sm font-bold text-slate-700">{emp.name}</td>
                                            <td className="px-3 py-3 text-xs text-slate-500 font-medium">{emp.department}</td>
                                            <td className="px-3 py-3 text-sm text-center font-medium text-slate-600">{emp.overtime_days || 0}</td>
                                            <td className="px-3 py-3 text-sm text-center font-bold text-amber-600">{(emp.overtime_hours || 0).toFixed(1)}</td>
                                            <td className="px-3 py-3 text-sm text-center font-bold text-emerald-600">{emp.meal_with_ot || 0}</td>
                                            <td className="px-3 py-3 text-sm text-center text-slate-500">{emp.meal_without_ot || 0}</td>
                                            <td className="px-3 py-3 text-sm text-center text-slate-500">{emp.ot_without_meal || 0}</td>
                                            <td className="px-3 py-3 text-sm text-center font-medium text-slate-600">{emp.total_meals || 0}</td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', corrColor)}>
                                                    %{corrScore.toFixed(0)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {/* ── 9. Indirect Requests ──────────────────────────── */}
            {data.indirect_analysis && data.indirect_analysis.subordinate_managers && data.indirect_analysis.subordinate_managers.length > 0 && (
                <SectionCard
                    title="Dolayli Talepler"
                    subtitle={`Alt yoneticiler uzerinden gelen talepler (toplam: ${data.indirect_analysis.total_indirect_requests || 0})`}
                    icon={GitBranch}
                    iconGradient="bg-gradient-to-br from-rose-500 to-pink-600"
                    collapsible
                    defaultOpen={false}
                    badge={`${data.indirect_analysis.subordinate_managers.length} yonetici`}
                >
                    <div className="overflow-x-auto -mx-2">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <SortableHeader label="Yonetici" col="name" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} />
                                    <SortableHeader label="Departman" col="department" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} />
                                    <SortableHeader label="Ekip" col="direct_reports" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} className="text-center" />
                                    <SortableHeader label="Gelen Talep" col="requests_received" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} className="text-center" />
                                    <SortableHeader label="Onay" col="approved" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} className="text-center" />
                                    <SortableHeader label="Red" col="rejected" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} className="text-center" />
                                    <SortableHeader label="Bekleyen" col="pending" currentCol={indirectSort.col} currentDir={indirectSort.dir} onSort={makeSortHandler(indirectSort, setIndirectSort)} className="text-center" />
                                    <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Onay %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sortedIndirect.map((mgr, i) => (
                                    <tr key={mgr.id || i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                                    {(mgr.name || '?')[0]}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{mgr.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-slate-500 font-medium">{mgr.department}</td>
                                        <td className="px-3 py-3 text-sm text-center font-medium text-slate-600">{mgr.direct_reports || 0}</td>
                                        <td className="px-3 py-3 text-sm text-center font-bold text-slate-800">{mgr.requests_received || 0}</td>
                                        <td className="px-3 py-3 text-sm text-center font-bold text-emerald-600">{mgr.approved || 0}</td>
                                        <td className="px-3 py-3 text-sm text-center font-bold text-red-500">{mgr.rejected || 0}</td>
                                        <td className="px-3 py-3 text-sm text-center font-bold text-amber-600">{mgr.pending || 0}</td>
                                        <td className="px-3 py-3 text-center">
                                            <span className={clsx(
                                                'text-xs font-bold px-2.5 py-0.5 rounded-full',
                                                (mgr.approval_rate || 0) >= 80 ? 'bg-emerald-50 text-emerald-700' :
                                                (mgr.approval_rate || 0) >= 50 ? 'bg-amber-50 text-amber-700' :
                                                'bg-red-50 text-red-600'
                                            )}>
                                                %{mgr.approval_rate || 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            )}

            {/* ── 10. Weekly Pattern ────────────────────────────── */}
            <SectionCard
                title="Haftalik Pattern"
                subtitle="Haftanin gunlerine gore talep yogunlugu"
                icon={BarChart3}
                iconGradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            >
                {weeklyPatternData.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stacked bar chart for weekly */}
                        <div className="lg:col-span-2">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={weeklyPatternData} barCategoryGap="18%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} iconType="circle" iconSize={8} />
                                    <Bar dataKey="İzin" stackId="a" fill={COLORS.leave} name="İzin" />
                                    <Bar dataKey="Ek Mesai" stackId="a" fill={COLORS.overtime} name="Ek Mesai" />
                                    <Bar dataKey="Yemek" stackId="a" fill={COLORS.meal} name="Yemek" />
                                    <Bar dataKey="Kartsız" stackId="a" fill={COLORS.cardless} name="Kartsız" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Heatmap Grid */}
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Yogunluk Haritasi</p>
                            <div className="space-y-2">
                                {weeklyPatternData.map((d, i) => {
                                    const maxVal = Math.max(...weeklyPatternData.map(w => w.Toplam || 0), 1);
                                    const intensity = (d.Toplam || 0) / maxVal;
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-500 w-8">{d.name}</span>
                                            <div className="flex-1 relative">
                                                <div className="h-8 bg-slate-50 rounded-lg overflow-hidden">
                                                    <div
                                                        className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                                                        style={{
                                                            width: `${Math.max(intensity * 100, 5)}%`,
                                                            background: `linear-gradient(90deg, rgba(59,130,246,0.15), rgba(59,130,246,${0.2 + intensity * 0.6}))`,
                                                        }}
                                                    >
                                                        <span className="text-[10px] font-black text-blue-700">{d.Toplam || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {[
                                                    { val: d['İzin'], color: COLORS.leave },
                                                    { val: d['Ek Mesai'], color: COLORS.overtime },
                                                    { val: d['Yemek'], color: COLORS.meal },
                                                    { val: d['Kartsız'], color: COLORS.cardless },
                                                ].map((item, j) => (
                                                    <div
                                                        key={j}
                                                        className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white"
                                                        style={{
                                                            backgroundColor: item.val > 0 ? item.color : '#e2e8f0',
                                                            color: item.val > 0 ? '#fff' : '#94a3b8',
                                                        }}
                                                        title={`${['İzin', 'Mesai', 'Yemek', 'Kartsız'][j]}: ${item.val || 0}`}
                                                    >
                                                        {item.val || 0}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 justify-center">
                                {[
                                    { label: 'Izin', color: COLORS.leave },
                                    { label: 'Mesai', color: COLORS.overtime },
                                    { label: 'Yemek', color: COLORS.meal },
                                    { label: 'Kartsiz', color: COLORS.cardless },
                                ].map((item, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[9px] text-slate-400 font-medium">{item.label}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyState message="Haftalik pattern verisi bulunamadi." />
                )}
            </SectionCard>

            {/* ── Footer ────────────────────────────────────────── */}
            <div className="text-center py-4">
                <p className="text-[10px] text-slate-400 font-medium">
                    Son guncelleme: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {period && ` | ${period.months} aylik donem`}
                </p>
            </div>
        </div>
    );
}
