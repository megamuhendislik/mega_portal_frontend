import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Network, Loader2, AlertCircle, RefreshCw,
    ChevronRight, ChevronDown, User, Building2
} from 'lucide-react';
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
    return (
        <div
            className="flex items-center gap-2 px-3 py-2 ml-8 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group"
            onClick={() => onEmployeeClick?.(employee.employee_id)}
        >
            <StatusDot pct={employee.efficiency_pct ?? 0} />
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
                    employee.efficiency_pct >= 90 ? 'text-emerald-600'
                    : employee.efficiency_pct >= 70 ? 'text-amber-600'
                    : 'text-red-600'
                }`}>
                    %{employee.efficiency_pct ?? 0}
                </span>
                <span>{employee.worked_hours ?? 0}/{employee.target_hours ?? 0}s</span>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DEPARTMENT GROUP
   ═══════════════════════════════════════════════════ */
function DepartmentGroup({ department, employees, onEmployeeClick }) {
    const [expanded, setExpanded] = useState(true);

    // Calculate department avg efficiency
    const avgEfficiency = useMemo(() => {
        if (!employees?.length) return 0;
        const sum = employees.reduce((s, e) => s + (e.efficiency_pct ?? 0), 0);
        return Math.round(sum / employees.length);
    }, [employees]);

    const totalWorked = useMemo(() => {
        if (!employees?.length) return 0;
        return employees.reduce((s, e) => s + (e.worked_hours ?? 0), 0);
    }, [employees]);

    const totalTarget = useMemo(() => {
        if (!employees?.length) return 0;
        return employees.reduce((s, e) => s + (e.target_hours ?? 0), 0);
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
                <div className="flex items-center gap-3 shrink-0">
                    <StatusDot pct={avgEfficiency} />
                    <span className={`text-xs font-bold ${
                        avgEfficiency >= 90 ? 'text-emerald-600'
                        : avgEfficiency >= 70 ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                        %{avgEfficiency}
                    </span>
                    <span className="text-[10px] text-slate-400">{totalWorked}/{totalTarget}s</span>
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
        return { totalEmp, avgEff, green, orange, red, deptCount: departmentGroups.length };
    }, [departmentGroups]);

    return (
        <>
            <CollapsibleSection
                title="Organizasyon Agaci"
                subtitle="Departman bazli verimlilik"
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
                        {/* ─── Summary Bar ────────────────────── */}
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

                        {/* ─── Department Groups ──────────────── */}
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
