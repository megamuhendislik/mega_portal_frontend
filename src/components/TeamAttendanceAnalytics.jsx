import { useState, useEffect, useMemo } from 'react';
import {
    Users, Clock, AlertTriangle, TrendingUp, Activity, Target,
    BarChart3, CheckCircle2, XCircle, Calendar, Timer,
    ChevronDown, ChevronUp, Zap, Info, Briefcase, Eye, EyeOff,
    Loader2, AlertCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell,
    ComposedChart, Line
} from 'recharts';
import api from '../services/api';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const DAY_NAMES_SHORT = ['Pt', 'Sa', 'Ca', 'Pe', 'Cu', 'Ct', 'Pa'];

const PIE_COLORS = {
    intended: '#10b981',
    manual: '#ef4444',
    potential: '#f59e0b',
};
const PIE_LABELS = {
    intended: 'Planli',
    manual: 'Manuel Giris',
    potential: 'Algılanan',
};
const BAR_COLORS = {
    assignments: '#8b5cf6',
    requests: '#3b82f6',
    approved: '#10b981',
};

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
const formatMinutesToHours = (minutes) => {
    if (!minutes) return '0';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}s ${mins}dk` : `${hours}s`;
};

const efficiencyColor = (val) => {
    if (val >= 95) return 'text-emerald-600';
    if (val >= 80) return 'text-amber-600';
    return 'text-red-600';
};

const efficiencyBg = (val) => {
    if (val >= 95) return 'bg-emerald-50';
    if (val >= 80) return 'bg-amber-50';
    return 'bg-red-50';
};

/* ═══════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   MINI KPI CARD (for secondary section)
   ═══════════════════════════════════════════════════ */
function MiniKPICard({ label, value, suffix, icon: Icon, color }) {
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon size={14} className={color || 'text-slate-400'} />}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-black text-slate-800">
                {value}{suffix && <span className="text-xs ml-1 font-bold text-slate-400">{suffix}</span>}
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   COLLAPSIBLE SECTION
   ═══════════════════════════════════════════════════ */
function CollapsibleSection({ title, subtitle, icon: Icon, badge, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                            <Icon size={18} />
                        </div>
                    )}
                    <div className="text-left">
                        <h3 className="font-bold text-base text-slate-800">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                    </div>
                    {badge && (
                        <span className="ml-2 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            {open && <div className="px-5 pb-5 space-y-5">{children}</div>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SORT HEADER HELPER
   ═══════════════════════════════════════════════════ */
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
            ? <ChevronDown size={12} className="text-blue-600" />
            : <ChevronUp size={12} className="text-blue-600" />;
    };

    return { sortCol, sortDir, handleSort, SortIcon };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function TeamAttendanceAnalytics({ stats, year, month, secondaryTeam, onPersonClick }) {
    // --- OT Team Analytics ---
    const [otData, setOtData] = useState(null);
    const [otLoading, setOtLoading] = useState(false);
    const [otError, setOtError] = useState('');
    const [otRange, setOtRange] = useState(6);

    // --- Sortable state for main table ---
    const mainSort = useSortable('efficiency');
    // --- Sortable state for OT table ---
    const otSort = useSortable('assignments');
    // --- Sortable state for secondary table ---
    const secSort = useSortable('total_hours');

    // ─── Fetch OT analytics ────────────────────────────
    const fetchOTAnalytics = async () => {
        try {
            setOtError('');
            setOtLoading(true);
            const res = await api.get('/overtime-assignments/team-analytics/', { params: { range: otRange } });
            setOtData(res.data);
        } catch (err) {
            console.error('TeamAttendanceAnalytics OT fetch error:', err);
            setOtError('Ek mesai analizi yuklenemedi.');
            setOtData(null);
        } finally {
            setOtLoading(false);
        }
    };

    useEffect(() => {
        fetchOTAnalytics();
    }, [otRange]);

    // ═══════════════════════════════════════════════════
    //  COMPUTED DATA — General Team KPIs
    // ═══════════════════════════════════════════════════
    const primaryStats = useMemo(() => {
        if (!stats?.length) return [];
        return stats.filter(s => s.relationship_type !== 'SECONDARY');
    }, [stats]);

    const teamKPIs = useMemo(() => {
        const s = primaryStats;
        if (!s.length) return null;

        const avgAttendance = s.reduce((acc, i) => acc + (i.attendance_rate ?? (i.monthly_required > 0 ? Math.round((i.total_worked / i.monthly_required) * 100) : 0)), 0) / s.length;
        const totalWorkedMin = s.reduce((acc, i) => acc + (i.total_worked || 0), 0);
        const totalMissingMin = s.reduce((acc, i) => acc + (i.total_missing || 0), 0);
        const avgEfficiency = s.reduce((acc, i) => acc + (i.efficiency || 0), 0) / s.length;
        const totalAbsent = s.reduce((acc, i) => acc + (i.absent_days || 0), 0);

        return {
            avgAttendance: Math.round(avgAttendance),
            totalWorkedHours: (totalWorkedMin / 60).toFixed(1),
            totalMissingHours: (totalMissingMin / 60).toFixed(1),
            avgEfficiency: Math.round(avgEfficiency),
            totalAbsent,
            activeCount: s.length,
        };
    }, [primaryStats]);

    // ═══════════════════════════════════════════════════
    //  COMPUTED DATA — Main Table
    // ═══════════════════════════════════════════════════
    const sortedMainStats = useMemo(() => {
        if (!primaryStats.length) return [];
        const sorted = [...primaryStats];
        const { sortCol, sortDir } = mainSort;

        sorted.sort((a, b) => {
            let aVal, bVal;
            switch (sortCol) {
                case 'employee_name':
                    aVal = a.employee_name || '';
                    bVal = b.employee_name || '';
                    return sortDir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
                case 'department':
                    aVal = a.department || '';
                    bVal = b.department || '';
                    return sortDir === 'desc' ? bVal.localeCompare(aVal, 'tr') : aVal.localeCompare(bVal, 'tr');
                case 'total_worked':
                    aVal = a.total_worked || 0; bVal = b.total_worked || 0; break;
                case 'total_missing':
                    aVal = a.total_missing || 0; bVal = b.total_missing || 0; break;
                case 'total_overtime':
                    aVal = a.total_overtime || 0; bVal = b.total_overtime || 0; break;
                case 'efficiency':
                    aVal = a.efficiency || 0; bVal = b.efficiency || 0; break;
                case 'attendance_rate':
                    aVal = a.attendance_rate ?? 0; bVal = b.attendance_rate ?? 0; break;
                case 'absent_days':
                    aVal = a.absent_days || 0; bVal = b.absent_days || 0; break;
                default:
                    aVal = 0; bVal = 0;
            }
            if (typeof aVal === 'string') return 0; // already handled above
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
        return sorted;
    }, [primaryStats, mainSort.sortCol, mainSort.sortDir]);

    // ═══════════════════════════════════════════════════
    //  COMPUTED DATA — OT Charts
    // ═══════════════════════════════════════════════════
    const otPieData = useMemo(() => {
        if (!otData?.source_distribution) return [];
        return Object.entries(otData.source_distribution)
            .filter(([, v]) => v > 0)
            .map(([key, value]) => ({
                name: PIE_LABELS[key] || key,
                value,
                color: PIE_COLORS[key] || '#94a3b8',
            }));
    }, [otData]);

    const otBarData = useMemo(() => {
        if (!otData?.monthly_trend) return [];
        return otData.monthly_trend.map(m => ({
            name: m.label,
            Atama: m.assignments || 0,
            Talep: m.requests || 0,
            Onay: m.approved || 0,
        }));
    }, [otData]);

    const otHeatmapData = useMemo(() => {
        if (!otData?.weekly_heatmap) return DAY_NAMES_SHORT.map((d, i) => ({ day: d, count: 0, index: i, intensity: 0 }));
        const maxCount = Math.max(...Object.values(otData.weekly_heatmap), 1);
        return DAY_NAMES_SHORT.map((day, i) => ({
            day,
            count: otData.weekly_heatmap[String(i)] || 0,
            intensity: (otData.weekly_heatmap[String(i)] || 0) / maxCount,
            index: i,
        }));
    }, [otData]);

    const sortedOtEmployees = useMemo(() => {
        if (!otData?.employee_breakdown) return [];
        return [...otData.employee_breakdown].sort((a, b) => {
            const aVal = a[otSort.sortCol] ?? 0;
            const bVal = b[otSort.sortCol] ?? 0;
            return otSort.sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
    }, [otData, otSort.sortCol, otSort.sortDir]);

    // ═══════════════════════════════════════════════════
    //  COMPUTED DATA — Secondary Manager Section
    // ═══════════════════════════════════════════════════
    const secondaryOtData = useMemo(() => {
        if (!secondaryTeam?.length || !otData?.employee_breakdown) return { employees: [], totalAssignments: 0, claimRate: 0, approvalRate: 0 };
        const secIds = new Set(secondaryTeam.map(e => e.id));
        const filtered = otData.employee_breakdown.filter(emp => secIds.has(emp.id));

        const totalAssignments = filtered.reduce((acc, e) => acc + (e.assignments || 0), 0);
        const totalRequests = filtered.reduce((acc, e) => acc + (e.requests || 0), 0);
        const totalApproved = filtered.reduce((acc, e) => acc + (e.approved || 0), 0);

        return {
            employees: filtered,
            totalAssignments,
            claimRate: totalAssignments > 0 ? Math.round((totalRequests / totalAssignments) * 100) : 0,
            approvalRate: totalRequests > 0 ? Math.round((totalApproved / totalRequests) * 100) : 0,
        };
    }, [secondaryTeam, otData]);

    const sortedSecEmployees = useMemo(() => {
        if (!secondaryOtData.employees.length) return [];
        return [...secondaryOtData.employees].sort((a, b) => {
            const aVal = a[secSort.sortCol] ?? 0;
            const bVal = b[secSort.sortCol] ?? 0;
            return secSort.sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });
    }, [secondaryOtData.employees, secSort.sortCol, secSort.sortDir]);

    // ═══════════════════════════════════════════════════
    //  COMPUTED DATA — Simplified Monthly Trend from stats
    // ═══════════════════════════════════════════════════
    const monthlyTrendData = useMemo(() => {
        if (!primaryStats.length) return [];
        // We don't have multi-month data from stats alone; create a single-month summary bar
        const totalWorked = primaryStats.reduce((acc, i) => acc + (i.completed_minutes || i.total_worked || 0), 0);
        const totalMissing = primaryStats.reduce((acc, i) => acc + (i.total_missing || 0), 0);
        const totalOT = primaryStats.reduce((acc, i) => acc + (i.total_overtime || 0), 0);
        const avgEff = primaryStats.reduce((acc, i) => acc + (i.efficiency || 0), 0) / primaryStats.length;

        const monthNames = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        const label = `${monthNames[(month || 1) - 1]} ${year || ''}`.trim();

        return [{
            name: label,
            'Normal Calisma': Math.round(totalWorked / 60),
            'Eksik': Math.round(totalMissing / 60),
            'Ek Mesai': Math.round(totalOT / 60),
            'Verimlilik': Math.round(avgEff),
        }];
    }, [primaryStats, year, month]);

    // ═══════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════
    if (!stats || stats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <Users size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Ekip Verisi Bulunamadi</h3>
                <p className="text-sm text-slate-500 mt-1">Secilen donem icin ekip verisi bulunmamaktadir.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">

            {/* ═══════════════════════════════════════════════════
                SECTION 1: General Team KPI Cards
               ═══════════════════════════════════════════════════ */}
            {teamKPIs && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KPICard
                        label="Ort. Katilim"
                        value={teamKPIs.avgAttendance}
                        suffix="%"
                        icon={<Activity size={56} />}
                        gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    />
                    <KPICard
                        label="Toplam Calisma"
                        value={teamKPIs.totalWorkedHours}
                        suffix="s"
                        icon={<Clock size={56} />}
                        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                    />
                    <KPICard
                        label="Toplam Eksik"
                        value={teamKPIs.totalMissingHours}
                        suffix="s"
                        icon={<AlertTriangle size={56} />}
                        gradient="bg-gradient-to-br from-red-500 to-red-600"
                    />
                    <KPICard
                        label="Ort. Verimlilik"
                        value={teamKPIs.avgEfficiency}
                        suffix="%"
                        icon={<TrendingUp size={56} />}
                        gradient="bg-gradient-to-br from-violet-500 to-purple-600"
                    />
                    <KPICard
                        label="Devamsizlik"
                        value={teamKPIs.totalAbsent}
                        suffix="gun"
                        icon={<XCircle size={56} />}
                        gradient="bg-gradient-to-br from-amber-500 to-orange-500"
                    />
                    <KPICard
                        label="Aktif Calisan"
                        value={teamKPIs.activeCount}
                        suffix="kisi"
                        icon={<Users size={56} />}
                        gradient="bg-gradient-to-br from-slate-800 to-slate-900"
                    />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                SECTION 2: Katilim & Verimlilik Tablosu
               ═══════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <BarChart3 size={16} />
                        </div>
                        Katilim & Verimlilik Tablosu
                    </h4>
                </div>
                {sortedMainStats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    {[
                                        { key: 'employee_name', label: 'Ad Soyad', align: 'left' },
                                        { key: 'department', label: 'Departman', align: 'left' },
                                        { key: 'total_worked', label: 'Calisma (saat)', align: 'center' },
                                        { key: 'total_missing', label: 'Eksik (saat)', align: 'center' },
                                        { key: 'total_overtime', label: 'Ek Mesai (saat)', align: 'center' },
                                        { key: 'efficiency', label: 'Verimlilik (%)', align: 'center' },
                                        { key: 'attendance_rate', label: 'Katılım (%)', align: 'center' },
                                        { key: 'absent_days', label: 'Devamsizlik (gun)', align: 'center' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className={`${col.align === 'left' ? 'text-left' : 'text-center'} py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none`}
                                            onClick={() => mainSort.handleSort(col.key)}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {col.label}
                                                <mainSort.SortIcon col={col.key} />
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMainStats.map((emp, idx) => {
                                    const eff = emp.efficiency || 0;
                                    return (
                                        <tr
                                            key={emp.employee_id || idx}
                                            className={`border-t border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-slate-25' : ''}`}
                                            onClick={() => onPersonClick?.(emp)}
                                        >
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                        {(emp.employee_name || '?')[0]}
                                                    </div>
                                                    <span className="font-bold text-slate-800 text-sm">{emp.employee_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 text-xs">{emp.department || '-'}</td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-700">
                                                {formatMinutesToHours(emp.total_worked)}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-red-600">
                                                {emp.total_missing > 0 ? formatMinutesToHours(emp.total_missing) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-amber-600">
                                                {emp.total_overtime > 0 ? formatMinutesToHours(emp.total_overtime) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${efficiencyBg(eff)} ${efficiencyColor(eff)}`}>
                                                    %{eff}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {(() => {
                                                    const rate = emp.attendance_rate ?? (emp.monthly_required > 0 ? Math.round((emp.total_worked / emp.monthly_required) * 100) : 0);
                                                    return (
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${efficiencyBg(rate)} ${efficiencyColor(rate)}`}>
                                                            %{rate}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-600">
                                                {emp.absent_days || 0}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-400 text-sm">Calisan verisi bulunamadi.</div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                SECTION 3: Aylik Trend
               ═══════════════════════════════════════════════════ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <TrendingUp size={16} />
                    </div>
                    Aylık Trend
                </h4>
                {monthlyTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={monthlyTrendData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} label={{ value: 'Saat', angle: -90, position: 'insideLeft', offset: 15, fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 120]} tick={{ fontSize: 11, fill: '#8b5cf6' }} label={{ value: '%', angle: 90, position: 'insideRight', offset: 10, fontSize: 10, fill: '#8b5cf6' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar yAxisId="left" dataKey="Normal Calisma" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={50} />
                            <Bar yAxisId="left" dataKey="Eksik" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={50} />
                            <Bar yAxisId="left" dataKey="Ek Mesai" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={50} />
                            <Line yAxisId="right" type="monotone" dataKey="Verimlilik" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Trend verisi yok</div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                SECTION 4: OT Atama Metrikleri
               ═══════════════════════════════════════════════════ */}
            <CollapsibleSection
                title="Ek Mesai Atama Analizi"
                subtitle="Ekibinizin fazla mesai istatistikleri"
                icon={Zap}
                defaultOpen={true}
            >
                {/* Range selector */}
                <div className="flex justify-end mb-2">
                    <select
                        value={otRange}
                        onChange={e => setOtRange(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-violet-500/20 outline-none"
                    >
                        <option value={3}>Son 3 Ay</option>
                        <option value={6}>Son 6 Ay</option>
                        <option value={12}>Son 12 Ay</option>
                    </select>
                </div>

                {/* Loading */}
                {otLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-violet-500 mr-2" />
                        <span className="text-sm text-slate-500">Mesai verileri yukleniyor...</span>
                    </div>
                )}

                {/* Error */}
                {otError && !otData && !otLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle size={28} className="text-red-300 mb-2" />
                        <p className="text-sm text-slate-500">{otError}</p>
                        <button onClick={fetchOTAnalytics} className="mt-3 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                            Tekrar Dene
                        </button>
                    </div>
                )}

                {/* OT Data */}
                {!otLoading && otData?.summary && (
                    <>
                        {/* OT KPI Row 1 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <KPICard label="Toplam Atama" value={otData.summary.total_assignments || 0} icon={<Calendar size={56} />} gradient="bg-gradient-to-br from-slate-800 to-slate-900" />
                            <KPICard label="Talep" value={otData.summary.total_requests || 0} icon={<Clock size={56} />} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                            <KPICard label="Onay" value={otData.summary.approved || 0} icon={<CheckCircle2 size={56} />} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                            <KPICard label="Red" value={otData.summary.rejected || 0} icon={<XCircle size={56} />} gradient="bg-gradient-to-br from-red-500 to-red-600" />
                            <KPICard label="Talep %" value={otData.summary.claim_rate != null ? otData.summary.claim_rate.toFixed(0) : 0} suffix="%" icon={<TrendingUp size={56} />} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                            <KPICard label="Onay %" value={otData.summary.approval_rate != null ? otData.summary.approval_rate.toFixed(1) : 0} suffix="%" icon={<CheckCircle2 size={56} />} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
                        </div>

                        {/* OT KPI Row 2 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <KPICard label="Toplam Saat" value={otData.summary.total_hours != null ? otData.summary.total_hours.toFixed(1) : 0} suffix="s" icon={<Clock size={56} />} gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                            <KPICard label="Suresi Dolmus" value={otData.summary.expired || 0} icon={<Timer size={56} />} gradient="bg-gradient-to-br from-rose-500 to-rose-600" />
                            <KPICard label="Bekleyen" value={otData.summary.pending || 0} icon={<AlertCircle size={56} />} gradient="bg-gradient-to-br from-amber-400 to-amber-500" />
                            <KPICard label="Ort. Talep Suresi" value={otData.avg_claim_days != null ? otData.avg_claim_days.toFixed(1) : '-'} suffix="gun" icon={<Calendar size={56} />} gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
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
                                {otPieData.length > 0 ? (
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={otPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {otPieData.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex flex-col gap-2">
                                            {otPieData.map((item, idx) => (
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
                                {otBarData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={otBarData} barGap={2}>
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
                                {otHeatmapData.map((item) => {
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

                        {/* OT Employee Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Users size={16} />
                                    </div>
                                    Calisan Bazli OT Tablo
                                </h4>
                            </div>
                            {sortedOtEmployees.length > 0 ? (
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
                                                    { key: 'expired', label: 'Suresi Dolmus' },
                                                    { key: 'total_hours', label: 'Saat' },
                                                ].map(col => (
                                                    <th
                                                        key={col.key}
                                                        className="text-center py-3 px-3 font-bold text-xs text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                                        onClick={() => otSort.handleSort(col.key)}
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            {col.label}
                                                            <otSort.SortIcon col={col.key} />
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedOtEmployees.map((emp, idx) => (
                                                <tr
                                                    key={emp.id || idx}
                                                    className={`border-t border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 1 ? 'bg-slate-25' : ''}`}
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs">
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
                                                    <td className="py-3 px-3 text-center font-bold text-rose-600">{emp.expired || 0}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-indigo-600">{emp.total_hours != null ? emp.total_hours.toFixed(1) : 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-slate-400 text-sm">Calisan verisi bulunamadi.</div>
                            )}
                        </div>
                    </>
                )}

                {/* No OT Data */}
                {!otLoading && !otError && !otData?.summary && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Zap size={28} className="text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Ek mesai verisi bulunamadi.</p>
                    </div>
                )}
            </CollapsibleSection>

            {/* ═══════════════════════════════════════════════════
                SECTION 5: Ikincil Yonetici Bolumu
               ═══════════════════════════════════════════════════ */}
            {secondaryTeam?.length > 0 && (
                <CollapsibleSection
                    title="Ikincil Yonetici Oldugum Kisiler"
                    subtitle="Sadece ek mesai yetkiniz olan calisanlar"
                    icon={Briefcase}
                    badge={`${secondaryTeam.length} Kisi`}
                    defaultOpen={false}
                >
                    {/* Secondary Mini KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <MiniKPICard
                            label="Toplam OT Atama"
                            value={secondaryOtData.totalAssignments}
                            icon={Calendar}
                            color="text-violet-500"
                        />
                        <MiniKPICard
                            label="Talep Orani"
                            value={secondaryOtData.claimRate}
                            suffix="%"
                            icon={TrendingUp}
                            color="text-blue-500"
                        />
                        <MiniKPICard
                            label="Onay Orani"
                            value={secondaryOtData.approvalRate}
                            suffix="%"
                            icon={CheckCircle2}
                            color="text-emerald-500"
                        />
                    </div>

                    {/* Secondary Employee Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                Calisan Detaylari
                            </h4>
                        </div>
                        {sortedSecEmployees.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="text-left py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Ad Soyad</th>
                                            <th className="text-left py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Departman</th>
                                            {[
                                                { key: 'assignments', label: 'Atama' },
                                                { key: 'requests', label: 'Talep' },
                                                { key: 'approved', label: 'Onay' },
                                                { key: 'rejected', label: 'Red' },
                                                { key: 'expired', label: 'Suresi Dolmus' },
                                                { key: 'total_hours', label: 'Saat' },
                                            ].map(col => (
                                                <th
                                                    key={col.key}
                                                    className="text-center py-3 px-3 font-bold text-xs text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                                                    onClick={() => secSort.handleSort(col.key)}
                                                >
                                                    <span className="inline-flex items-center gap-1">
                                                        {col.label}
                                                        <secSort.SortIcon col={col.key} />
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedSecEmployees.map((emp, idx) => (
                                            <tr
                                                key={emp.id || idx}
                                                className={`border-t border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 1 ? 'bg-slate-25' : ''}`}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
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
                                                <td className="py-3 px-3 text-center font-bold text-rose-600">{emp.expired || 0}</td>
                                                <td className="py-3 px-3 text-center font-bold text-indigo-600">{emp.total_hours != null ? emp.total_hours.toFixed(1) : 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-10 text-center text-slate-400 text-sm">
                                {otLoading ? 'Veriler yukleniyor...' : 'Ikincil yonetimi altindaki calisanlar icin ek mesai verisi bulunamadi.'}
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
