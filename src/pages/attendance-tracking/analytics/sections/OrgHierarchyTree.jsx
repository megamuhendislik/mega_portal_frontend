import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Network, Loader2, AlertCircle, RefreshCw,
    ChevronRight, ChevronDown, User, Building2, Clock, TrendingUp
} from 'lucide-react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Legend
} from 'recharts';
import CollapsibleSection from '../shared/CollapsibleSection';
import { useAnalyticsFilter } from '../AnalyticsFilterContext';
import api from '../../../../services/api';

/* ═══════════════════════════════════════════════════
   STATUS DOT
   ═══════════════════════════════════════════════════ */
function StatusDot({ pct }) {
    const color = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
    return <span className={`w-2.5 h-2.5 rounded-full ${color} inline-block shrink-0`} title={`%${pct}`} />;
}

/* ═══════════════════════════════════════════════════
   EMPLOYEE NODE
   ═══════════════════════════════════════════════════ */
function EmployeeNode({ employee, onEmployeeClick }) {
    const eff = employee.efficiency_pct ?? 0;
    return (
        <div
            className="flex items-center gap-2 px-3 py-2 ml-8 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
            onClick={() => onEmployeeClick?.(employee.employee_id)}
        >
            <StatusDot pct={eff} />
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                {(employee.name || '?').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors truncate block">
                    {employee.name}
                </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 shrink-0">
                <span className={`font-bold ${
                    eff >= 90 ? 'text-emerald-600'
                    : eff >= 70 ? 'text-amber-600'
                    : 'text-red-600'
                }`}>
                    %{eff}
                </span>
                <span>{employee.worked_hours ?? 0}/{employee.target_hours ?? 0}s</span>
                {(employee.ot_hours != null && employee.ot_hours > 0) && (
                    <span className="text-violet-600 font-semibold">+{employee.ot_hours}s OT</span>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DEPARTMENT GROUP
   ═══════════════════════════════════════════════════ */
function DepartmentGroup({ department, employees, onEmployeeClick }) {
    const [expanded, setExpanded] = useState(true);

    const stats = useMemo(() => {
        if (!employees?.length) return { avgEfficiency: 0, totalWorked: 0, totalTarget: 0, totalOT: 0 };
        const sum = employees.reduce((s, e) => s + (e.efficiency_pct ?? 0), 0);
        const totalWorked = employees.reduce((s, e) => s + (e.worked_hours ?? 0), 0);
        const totalTarget = employees.reduce((s, e) => s + (e.target_hours ?? 0), 0);
        const totalOT = employees.reduce((s, e) => s + (e.ot_hours ?? 0), 0);
        return {
            avgEfficiency: Math.round(sum / employees.length),
            totalWorked: Math.round(totalWorked * 10) / 10,
            totalTarget: Math.round(totalTarget * 10) / 10,
            totalOT: Math.round(totalOT * 10) / 10,
        };
    }, [employees]);

    return (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
                {expanded
                    ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
                    : <ChevronRight size={14} className="text-slate-400 shrink-0" />
                }
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white shrink-0">
                    <Building2 size={14} />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{department}</p>
                    <p className="text-[10px] text-slate-400">{employees?.length || 0} calisan</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                    <StatusDot pct={stats.avgEfficiency} />
                    <span className={`text-xs font-bold ${
                        stats.avgEfficiency >= 90 ? 'text-emerald-600'
                        : stats.avgEfficiency >= 70 ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                        %{stats.avgEfficiency}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">{stats.totalWorked}/{stats.totalTarget}s</span>
                    {stats.totalOT > 0 && (
                        <span className="text-[10px] text-violet-600 font-semibold hidden sm:inline">+{stats.totalOT}s OT</span>
                    )}
                </div>
            </button>

            {expanded && employees?.length > 0 && (
                <div className="border-t border-slate-100 py-1">
                    {employees.map(emp => (
                        <EmployeeNode
                            key={emp.employee_id || emp.name}
                            employee={emp}
                            onEmployeeClick={onEmployeeClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DEPARTMENT COMPARISON RADAR
   ═══════════════════════════════════════════════════ */
const RADAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function DepartmentRadar({ departmentGroups }) {
    if (!departmentGroups || departmentGroups.length < 2) return null;

    // Build radar axes from department stats
    const depts = departmentGroups.slice(0, 6); // max 6 departments for readability

    // Build per-department metrics
    const deptStats = depts.map(g => {
        const emps = g.employees;
        const len = emps.length || 1;
        return {
            name: g.department,
            avgEff: Math.round(emps.reduce((s, e) => s + (e.efficiency_pct ?? 0), 0) / len),
            avgWorked: Math.round((emps.reduce((s, e) => s + (e.worked_hours ?? 0), 0) / len) * 10) / 10,
            avgOT: Math.round((emps.reduce((s, e) => s + (e.ot_hours ?? 0), 0) / len) * 10) / 10,
            headcount: emps.length,
        };
    });

    // Determine max values for normalization
    const maxWorked = Math.max(...deptStats.map(d => d.avgWorked), 1);
    const maxOT = Math.max(...deptStats.map(d => d.avgOT), 1);
    const maxHC = Math.max(...deptStats.map(d => d.headcount), 1);

    // Radar data: each axis is a metric, each department is a series
    const radarAxes = ['Verimlilik', 'Ort. Calisma', 'Ort. OT', 'Kisi Sayisi'];
    const radarData = radarAxes.map((axis, ai) => {
        const point = { subject: axis };
        deptStats.forEach((ds, di) => {
            let val;
            switch (ai) {
                case 0: val = ds.avgEff; break;
                case 1: val = Math.round((ds.avgWorked / maxWorked) * 100); break;
                case 2: val = Math.round((ds.avgOT / maxOT) * 100); break;
                case 3: val = Math.round((ds.headcount / maxHC) * 100); break;
                default: val = 0;
            }
            point[ds.name] = val;
        });
        return point;
    });

    return (
        <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Departman Karsilastirmasi</h4>
            <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 8, fill: '#94a3b8' }}
                        axisLine={false}
                    />
                    {deptStats.map((ds, i) => (
                        <Radar
                            key={ds.name}
                            name={ds.name}
                            dataKey={ds.name}
                            stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                            fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                            fillOpacity={0.08}
                            strokeWidth={2}
                            strokeDasharray={i > 2 ? '4 3' : undefined}
                        />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function OrgHierarchyTree() {
    const { queryParams } = useAnalyticsFilter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerEmployeeId, setDrawerEmployeeId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/attendance-analytics/work-hours/', { params: queryParams });
            setData(res.data);
        } catch (err) {
            console.error('OrgHierarchyTree fetch error:', err);
            setError('Organizasyon verileri yuklenemedi.');
        } finally {
            setLoading(false);
        }
    }, [queryParams]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Lazy load PersonDetailDrawer
    const [PersonDetailDrawer, setPersonDetailDrawer] = useState(null);
    useEffect(() => {
        if (drawerEmployeeId && !PersonDetailDrawer) {
            import('./PersonDetailDrawer').then(mod => {
                setPersonDetailDrawer(() => mod.default);
            });
        }
    }, [drawerEmployeeId, PersonDetailDrawer]);

    // Group employees by department
    const departmentGroups = useMemo(() => {
        if (!data?.employee_hours?.length) return [];
        const groups = {};
        data.employee_hours.forEach(emp => {
            const dept = emp.department || 'Diger';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(emp);
        });
        // Sort departments by avg efficiency desc
        return Object.entries(groups)
            .map(([dept, employees]) => ({
                department: dept,
                employees: employees.sort((a, b) => (b.efficiency_pct ?? 0) - (a.efficiency_pct ?? 0)),
            }))
            .sort((a, b) => {
                const avgA = a.employees.reduce((s, e) => s + (e.efficiency_pct ?? 0), 0) / (a.employees.length || 1);
                const avgB = b.employees.reduce((s, e) => s + (e.efficiency_pct ?? 0), 0) / (b.employees.length || 1);
                return avgB - avgA;
            });
    }, [data?.employee_hours]);

    // Summary stats
    const summary = useMemo(() => {
        if (!departmentGroups.length) return null;
        const totalEmp = departmentGroups.reduce((s, g) => s + g.employees.length, 0);
        const allEmps = departmentGroups.flatMap(g => g.employees);
        const avgEff = totalEmp > 0 ? Math.round(allEmps.reduce((s, e) => s + (e.efficiency_pct ?? 0), 0) / totalEmp) : 0;
        const green = allEmps.filter(e => (e.efficiency_pct ?? 0) >= 90).length;
        const orange = allEmps.filter(e => (e.efficiency_pct ?? 0) >= 70 && (e.efficiency_pct ?? 0) < 90).length;
        const red = allEmps.filter(e => (e.efficiency_pct ?? 0) < 70).length;
        const totalWorked = Math.round(allEmps.reduce((s, e) => s + (e.worked_hours ?? 0), 0) * 10) / 10;
        const totalOT = Math.round(allEmps.reduce((s, e) => s + (e.ot_hours ?? 0), 0) * 10) / 10;
        return { totalEmp, avgEff, green, orange, red, deptCount: departmentGroups.length, totalWorked, totalOT };
    }, [departmentGroups]);

    return (
        <>
            <CollapsibleSection
                title="Organizasyon Agaci"
                subtitle="Departman bazli verimlilik ve ekip hiyerarsisi"
                icon={Network}
                iconGradient="from-slate-500 to-slate-700"
                defaultOpen={false}
            >
                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="text-slate-500 animate-spin mr-2" />
                        <span className="text-sm text-slate-400">Organizasyon verileri yukleniyor...</span>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <AlertCircle size={24} className="text-red-400" />
                        <p className="text-sm text-slate-500">{error}</p>
                        <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-slate-600 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">
                            <RefreshCw size={14} /> Tekrar Dene
                        </button>
                    </div>
                )}

                {/* Data */}
                {data && !loading && (
                    <div className="space-y-4">
                        {/* --- Summary Bar ---------------------- */}
                        {summary && (
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <span className="text-slate-500">
                                        <span className="font-bold text-slate-700">{summary.deptCount}</span> departman
                                    </span>
                                    <span className="text-slate-500">
                                        <span className="font-bold text-slate-700">{summary.totalEmp}</span> calisan
                                    </span>
                                    <span className="text-slate-500">
                                        Ort: <span className={`font-bold ${
                                            summary.avgEff >= 90 ? 'text-emerald-600'
                                            : summary.avgEff >= 70 ? 'text-amber-600'
                                            : 'text-red-600'
                                        }`}>%{summary.avgEff}</span>
                                    </span>
                                    <span className="text-slate-500 hidden sm:inline">
                                        <Clock size={11} className="inline mr-0.5" />
                                        {summary.totalWorked}s
                                    </span>
                                    {summary.totalOT > 0 && (
                                        <span className="text-violet-600 font-semibold hidden sm:inline">
                                            <TrendingUp size={11} className="inline mr-0.5" />
                                            +{summary.totalOT}s OT
                                        </span>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] text-slate-500 font-semibold">{summary.green}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            <span className="text-[10px] text-slate-500 font-semibold">{summary.orange}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                            <span className="text-[10px] text-slate-500 font-semibold">{summary.red}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- Department Comparison Radar ------- */}
                        <DepartmentRadar departmentGroups={departmentGroups} />

                        {/* --- Department Groups ---------------- */}
                        {departmentGroups.map(group => (
                            <DepartmentGroup
                                key={group.department}
                                department={group.department}
                                employees={group.employees}
                                onEmployeeClick={(id) => setDrawerEmployeeId(id)}
                            />
                        ))}

                        {/* Empty state */}
                        {!departmentGroups.length && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Network size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Bu donem icin organizasyon verisi bulunamadi.</p>
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            {/* Person Detail Drawer */}
            {PersonDetailDrawer && drawerEmployeeId && (
                <PersonDetailDrawer
                    open={!!drawerEmployeeId}
                    onClose={() => setDrawerEmployeeId(null)}
                    employeeId={drawerEmployeeId}
                    queryParams={queryParams}
                />
            )}
        </>
    );
}
