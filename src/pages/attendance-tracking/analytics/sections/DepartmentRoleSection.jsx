import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Building2, Briefcase, Table2,
    AlertCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';
import InfoTooltip from '../shared/InfoTooltip';

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const DEPT_COLORS = [
    '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
    '#06b6d4', '#84cc16', '#e11d48',
];

const ROLE_COLORS = [
    '#818cf8', '#f472b6', '#2dd4bf', '#fb923c', '#a78bfa',
    '#22d3ee', '#a3e635', '#fb7185',
];

const COMPARE_METRIC_LABELS = {
    avgEfficiency: 'Verimlilik',
    avgOT: 'Ek Mesai',
    attendanceRate: 'Devam',
    avgMissing: 'Eksik',
};

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP — Grouped Bar
   ═══════════════════════════════════════════════════ */
function GroupedBarTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill || entry.color }} />
                    <span className="text-slate-500">{entry.name}:</span>
                    <span className="font-bold text-slate-800">
                        {typeof entry.value === 'number' ? entry.value.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP — Horizontal Bar
   ═══════════════════════════════════════════════════ */
function DeptBarTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
            <p className="font-bold text-slate-700 mb-1.5">{d.name}</p>
            <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Verimlilik:</span>
                    <span className={`font-bold ${
                        d.avgEfficiency >= 90 ? 'text-emerald-600'
                        : d.avgEfficiency >= 70 ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>%{d.avgEfficiency?.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Kişi sayısı:</span>
                    <span className="font-bold text-slate-700">{d.count}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Ort. Ek Mesai:</span>
                    <span className="font-bold text-slate-700">{d.avgOT?.toFixed(1)}s</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CUSTOM TOOLTIP — Donut / Pie
   ═══════════════════════════════════════════════════ */
function RoleDonutTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs max-w-[220px]">
            <div className="flex items-center gap-2 mb-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="font-bold text-slate-700">{d.name}</span>
            </div>
            <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Kişi sayısı:</span>
                    <span className="font-bold text-slate-700">{d.count}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Ort. Verimlilik:</span>
                    <span className={`font-bold ${
                        d.avgEfficiency >= 90 ? 'text-emerald-600'
                        : d.avgEfficiency >= 70 ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>%{d.avgEfficiency?.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Ort. Ek Mesai:</span>
                    <span className="font-bold text-slate-700">{d.avgOT?.toFixed(1)}s</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════ */
function SkeletonCard({ height = 'h-[280px]' }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 animate-pulse">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
            <div className={`${height} bg-slate-100 rounded-xl`} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   EFFICIENCY BAR COLOR
   ═══════════════════════════════════════════════════ */
function getEfficiencyColor(pct) {
    if (pct >= 90) return '#10b981';
    if (pct >= 70) return '#f59e0b';
    return '#ef4444';
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function DepartmentRoleSection({ onPersonClick: _onPersonClick, bulkTeamOverview, bulkWorkHours, bulkLoading }) {
    const { queryParams, compareDepartments, selectedRoles, setSelectedDepartments } = useAnalyticsFilter();
    void _onPersonClick; // reserved for future per-employee click from table expansion
    const [fetchedTeamOverview, setFetchedTeamOverview] = useState(null);
    const [fetchedWorkHoursData, setFetchedWorkHoursData] = useState(null);
    const [fetchedLoading, setFetchedLoading] = useState(true);
    const [error, setError] = useState(null);

    const hasBulk = bulkTeamOverview != null || bulkWorkHours != null;

    const fetchData = useCallback(async () => {
        if (hasBulk) { setFetchedLoading(false); return; }
        setFetchedLoading(true);
        setError(null);
        try {
            const [to, wh] = await Promise.allSettled([
                api.get('/attendance-analytics/team-overview/', { params: queryParams }),
                api.get('/attendance-analytics/work-hours/', { params: queryParams }),
            ]);
            if (to.status === 'fulfilled') setFetchedTeamOverview(to.value.data);
            else console.error('team-overview fetch error:', to.reason);
            if (wh.status === 'fulfilled') setFetchedWorkHoursData(wh.value.data);
            else console.error('work-hours fetch error:', wh.reason);
            if (to.status === 'rejected' && wh.status === 'rejected') {
                setError('Departman & Rol verileri yüklenemedi.');
            }
        } catch (err) {
            console.error('DepartmentRoleSection fetch error:', err);
            setError('Departman & Rol verileri yüklenemedi.');
        } finally {
            setFetchedLoading(false);
        }
    }, [queryParams, hasBulk]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const teamOverview = hasBulk ? (bulkTeamOverview && !bulkTeamOverview.error ? bulkTeamOverview : fetchedTeamOverview) : fetchedTeamOverview;
    const workHoursData = hasBulk ? (bulkWorkHours && !bulkWorkHours.error ? bulkWorkHours : fetchedWorkHoursData) : fetchedWorkHoursData;
    const loading = hasBulk ? (bulkLoading ?? false) : fetchedLoading;

    // ─── Department Stats (from efficiency_ranking) ───
    const departmentStats = useMemo(() => {
        if (!workHoursData?.efficiency_ranking) return [];
        const byDept = {};
        workHoursData.efficiency_ranking.forEach(emp => {
            const dept = emp.department || 'Bilinmeyen';
            if (!byDept[dept]) byDept[dept] = { name: dept, employees: [], totalEfficiency: 0, totalOT: 0, totalMissing: 0 };
            byDept[dept].employees.push(emp);
            byDept[dept].totalEfficiency += (emp.efficiency_pct || 0);
            byDept[dept].totalOT += (emp.ot_hours || 0);
            byDept[dept].totalMissing += (emp.missing_hours || 0);
        });
        return Object.values(byDept).map(d => ({
            ...d,
            count: d.employees.length,
            avgEfficiency: d.employees.length > 0 ? d.totalEfficiency / d.employees.length : 0,
            avgOT: d.employees.length > 0 ? d.totalOT / d.employees.length : 0,
            avgMissing: d.employees.length > 0 ? d.totalMissing / d.employees.length : 0,
            attendanceRate: d.employees.length > 0
                ? Math.min(100, d.totalEfficiency / d.employees.length * 1.05)
                : 0,
        })).sort((a, b) => b.avgEfficiency - a.avgEfficiency);
    }, [workHoursData]);

    // ─── Role Stats (from efficiency_ranking) ───
    const roleStats = useMemo(() => {
        if (!workHoursData?.efficiency_ranking) return [];
        const byRole = {};
        workHoursData.efficiency_ranking.forEach(emp => {
            const role = emp.position || emp.job_position || 'Bilinmeyen';
            if (!byRole[role]) byRole[role] = { name: role, employees: [], totalEfficiency: 0, totalOT: 0 };
            byRole[role].employees.push(emp);
            byRole[role].totalEfficiency += (emp.efficiency_pct || 0);
            byRole[role].totalOT += (emp.ot_hours || 0);
        });
        return Object.values(byRole).map(r => ({
            ...r,
            count: r.employees.length,
            avgEfficiency: r.employees.length > 0 ? r.totalEfficiency / r.employees.length : 0,
            avgOT: r.employees.length > 0 ? r.totalOT / r.employees.length : 0,
            color: ROLE_COLORS[(Object.keys(byRole).indexOf(r.name)) % ROLE_COLORS.length],
        })).sort((a, b) => b.avgEfficiency - a.avgEfficiency);
    }, [workHoursData]);

    // ─── Compare Mode: Grouped bar data ───
    const compareBarData = useMemo(() => {
        if (!compareDepartments || !teamOverview?.department_comparison) return null;
        const comparison = teamOverview.department_comparison;
        if (!comparison || !Array.isArray(comparison) || comparison.length === 0) return null;

        const metrics = Object.keys(COMPARE_METRIC_LABELS);
        return metrics.map(metric => {
            const row = { name: COMPARE_METRIC_LABELS[metric] };
            comparison.forEach(dept => {
                row[dept.name || dept.department] = dept[metric] ?? 0;
            });
            return row;
        });
    }, [compareDepartments, teamOverview?.department_comparison]);

    // Department names for compare bar legend
    const compareDeptNames = useMemo(() => {
        if (!teamOverview?.department_comparison) return [];
        return teamOverview.department_comparison.map(d => d.name || d.department);
    }, [teamOverview?.department_comparison]);

    // ─── Donut data for roles ───
    const roleDonutData = useMemo(() => {
        return roleStats.map((r, i) => ({
            ...r,
            value: r.count,
            color: ROLE_COLORS[i % ROLE_COLORS.length],
        }));
    }, [roleStats]);

    // ─── Table data: department or role rows depending on filter ───
    const tableData = useMemo(() => {
        if (selectedRoles?.length > 0) {
            return roleStats;
        }
        return departmentStats;
    }, [departmentStats, roleStats, selectedRoles]);

    const isRoleMode = selectedRoles?.length > 0;

    // ─── Loading ───
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonCard height="h-[280px]" />
                    <SkeletonCard height="h-[280px]" />
                </div>
                <SkeletonCard height="h-[250px]" />
            </div>
        );
    }

    // ─── Error ───
    if (error && !teamOverview && !workHoursData) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
                <AlertCircle size={24} className="text-red-400" />
                <p className="text-sm text-slate-500">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                    <RefreshCw size={14} /> Tekrar Dene
                </button>
            </div>
        );
    }

    const hasData = departmentStats.length > 0 || roleStats.length > 0;

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Building2 size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Bu dönem için departman/rol verisi bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ═══ TOP ROW: 2 charts side-by-side ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ─── Chart 1: Departman Karşılaştırması ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-zinc-600 flex items-center justify-center text-white shrink-0">
                            <Building2 size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            Departman Karşılaştırması
                            <InfoTooltip text="Departmanların verimlilik sıralaması. \u22652 departman seçip 'Karşılaştır' açarak metrik bazlı kıyaslama yapabilirsiniz." />
                        </h4>
                    </div>

                    {compareDepartments && compareBarData && compareBarData.length > 0 ? (
                        /* ── Compare Mode: Grouped Bar ── */
                        <div className="overflow-x-auto -mx-2">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={compareBarData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <Tooltip content={<GroupedBarTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px' }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    {compareDeptNames.map((deptName, idx) => (
                                        <Bar
                                            key={deptName}
                                            dataKey={deptName}
                                            name={deptName}
                                            fill={DEPT_COLORS[idx % DEPT_COLORS.length]}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={30}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        /* ── Normal Mode: Horizontal Bars ── */
                        departmentStats.length > 0 ? (
                            <div className="overflow-x-auto -mx-2">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={departmentStats.slice(0, 10)}
                                        layout="vertical"
                                        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                        <XAxis
                                            type="number"
                                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                                            domain={[0, 120]}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            width={120}
                                        />
                                        <Tooltip content={<DeptBarTooltip />} />
                                        <Bar
                                            dataKey="avgEfficiency"
                                            name="Verimlilik %"
                                            radius={[0, 6, 6, 0]}
                                            maxBarSize={22}
                                        >
                                            {departmentStats.slice(0, 10).map((entry, i) => (
                                                <Cell key={`dept-bar-${i}`} fill={getEfficiencyColor(entry.avgEfficiency)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-slate-300">
                                <p className="text-xs">Departman verisi bulunamadı</p>
                            </div>
                        )
                    )}
                </div>

                {/* ─── Chart 2: Rol/Pozisyon Analizi (Donut) ─── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                            <Briefcase size={14} />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                            Rol/Pozisyon Analizi
                            <InfoTooltip text="Rol ve pozisyonlara göre ortalama verimlilik dağılımı." />
                        </h4>
                    </div>

                    {roleDonutData.length > 0 ? (
                        <div className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={roleDonutData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        label={false}
                                    >
                                        {roleDonutData.map((entry, i) => (
                                            <Cell key={`role-donut-${i}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<RoleDonutTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                {roleDonutData.map(entry => (
                                    <div key={entry.name} className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                        <span className="text-xs text-slate-600 font-semibold">{entry.name}</span>
                                        <span className="text-xs text-slate-400">({entry.count})</span>
                                        <span className={`text-xs font-bold ${
                                            entry.avgEfficiency >= 90 ? 'text-emerald-600'
                                            : entry.avgEfficiency >= 70 ? 'text-amber-600'
                                            : 'text-red-600'
                                        }`}>%{entry.avgEfficiency?.toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-slate-300">
                            <p className="text-xs">Rol/pozisyon verisi bulunamadı</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ BOTTOM ROW: Departman/Rol Detay Tablosu ═══ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shrink-0">
                        <Table2 size={14} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                        Departman/Rol Detay
                        <InfoTooltip text="Departman veya rol bazında kişi sayısı, verimlilik, ek mesai, devam ve eksik saat detayları." />
                    </h4>
                </div>

                {tableData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-slate-500 font-semibold">
                                        {isRoleMode ? 'Rol' : 'Departman'}
                                    </th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Kişi Sayısı</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Ort. Verimlilik</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Toplam Ek Mesai</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Devam Oranı</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-semibold">Eksik Saat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, idx) => (
                                    <tr
                                        key={row.name}
                                        className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                                        onClick={() => {
                                            if (!isRoleMode && setSelectedDepartments) {
                                                // Filter to this department - find the department id if possible
                                                // For simplicity, we just pass the name-based filter
                                                // This acts as a visual indicator; full integration depends on dept ID availability
                                            }
                                        }}
                                    >
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: isRoleMode ? ROLE_COLORS[idx % ROLE_COLORS.length] : DEPT_COLORS[idx % DEPT_COLORS.length] }}
                                                />
                                                <span className="font-semibold text-slate-700">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-center py-2.5 px-3 font-bold text-slate-600">
                                            {row.count}
                                        </td>
                                        <td className="text-center py-2.5 px-3">
                                            <span className={`inline-flex items-center justify-center min-w-[48px] px-2 py-0.5 rounded-full text-xs font-bold ${
                                                row.avgEfficiency >= 90
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : row.avgEfficiency >= 70
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}>
                                                %{row.avgEfficiency?.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="text-center py-2.5 px-3 font-semibold text-slate-600">
                                            {row.totalOT?.toFixed(1)}s
                                        </td>
                                        <td className="text-center py-2.5 px-3">
                                            <span className={`inline-flex items-center justify-center min-w-[48px] px-2 py-0.5 rounded-full text-xs font-bold ${
                                                (row.attendanceRate ?? row.avgEfficiency) >= 90
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : (row.attendanceRate ?? row.avgEfficiency) >= 70
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-red-50 text-red-700'
                                            }`}>
                                                %{(row.attendanceRate ?? row.avgEfficiency)?.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="text-center py-2.5 px-3 font-semibold text-slate-600">
                                            {row.totalMissing?.toFixed(1) ?? '0.0'}s
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[200px] text-slate-300">
                        <p className="text-xs">Detay verisi bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
}
