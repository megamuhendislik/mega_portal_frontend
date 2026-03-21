import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Select } from 'antd';
import { Building2, Users } from 'lucide-react';
import { AnalyticsFilterProvider, useAnalyticsFilter } from './AnalyticsFilterContext';
import QuickDateFilters from './shared/QuickDateFilters';
import ComparisonSelector from './shared/ComparisonSelector';
import api from '../../../services/api';

const TeamOverviewKPI = React.lazy(() => import('./sections/TeamOverviewKPI'));
const EntryExitDistribution = React.lazy(() => import('./sections/EntryExitDistribution'));
const WorkHoursAnalysis = React.lazy(() => import('./sections/WorkHoursAnalysis'));
const OvertimeAnalysis = React.lazy(() => import('./sections/OvertimeAnalysis'));
const BreakMealAnalysis = React.lazy(() => import('./sections/BreakMealAnalysis'));
const AbsenceLeaveAnalysis = React.lazy(() => import('./sections/AbsenceLeaveAnalysis'));
const TargetComparison = React.lazy(() => import('./sections/TargetComparison'));
const EmployeeComparison = React.lazy(() => import('./sections/EmployeeComparison'));
const OrgHierarchyTree = React.lazy(() => import('./sections/OrgHierarchyTree'));

function SectionSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
            <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   DEPARTMENT FILTER
   ═══════════════════════════════════════════════════ */
function DepartmentFilter() {
    const { selectedDepartment, setSelectedDepartment } = useAnalyticsFilter();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.get('/departments/')
            .then(res => {
                if (cancelled) return;
                const depts = res.data?.results || res.data || [];
                setDepartments(depts);
            })
            .catch(err => {
                console.error('Department fetch error:', err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const options = useMemo(() => {
        const opts = [{ value: null, label: 'Tum Departmanlar' }];
        departments.forEach(d => {
            opts.push({ value: d.id, label: d.name });
        });
        return opts;
    }, [departments]);

    return (
        <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-400 shrink-0" />
            <Select
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                options={options}
                size="small"
                loading={loading}
                className="min-w-[180px]"
                popupMatchSelectWidth={false}
                placeholder="Departman"
                allowClear
                onClear={() => setSelectedDepartment(null)}
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   EMPLOYEE MULTI-SELECT FILTER
   ═══════════════════════════════════════════════════ */
function EmployeeMultiSelect() {
    const { selectedEmployees, setSelectedEmployees } = useAnalyticsFilter();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        api.get('/employees/', { params: { page_size: 200 } })
            .then(res => {
                if (cancelled) return;
                const emps = res.data?.results || res.data || [];
                setEmployees(emps);
            })
            .catch(err => {
                console.error('Employee fetch error:', err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const options = useMemo(() => {
        return employees.map(e => ({
            value: e.id,
            label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.user?.email || `#${e.id}`,
        }));
    }, [employees]);

    return (
        <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400 shrink-0" />
            <Select
                mode="multiple"
                value={selectedEmployees}
                onChange={(val) => setSelectedEmployees((val || []).slice(0, 10))}
                options={options}
                size="small"
                loading={loading}
                className="min-w-[220px]"
                popupMatchSelectWidth={false}
                placeholder="Calisan sec (maks 10)"
                maxTagCount={3}
                maxTagTextLength={10}
                allowClear
                showSearch
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
            />
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   INNER CONTENT (must be inside AnalyticsFilterProvider)
   ═══════════════════════════════════════════════════ */
function AnalyticsContent() {
    return (
        <div className="space-y-6">
            {/* --- Filters Row --------------------- */}
            <div className="flex flex-col gap-3">
                {/* Row 1: Date filters + comparison */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <QuickDateFilters />
                    <ComparisonSelector />
                </div>
                {/* Row 2: Department + Employee filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <DepartmentFilter />
                    <EmployeeMultiSelect />
                </div>
            </div>

            {/* --- Section 1: Team Overview KPIs --- */}
            <Suspense fallback={<SectionSkeleton />}>
                <TeamOverviewKPI />
            </Suspense>

            {/* --- Section 2: Entry/Exit Distribution */}
            <Suspense fallback={<SectionSkeleton />}>
                <EntryExitDistribution />
            </Suspense>

            {/* --- Section 3: Work Hours Analysis -- */}
            <Suspense fallback={<SectionSkeleton />}>
                <WorkHoursAnalysis />
            </Suspense>

            {/* --- Section 4: Overtime Analysis ---- */}
            <Suspense fallback={<SectionSkeleton />}>
                <OvertimeAnalysis />
            </Suspense>

            {/* --- Section 5: Break & Meal Analysis  */}
            <Suspense fallback={<SectionSkeleton />}>
                <BreakMealAnalysis />
            </Suspense>

            {/* --- Section 6: Absence & Leave ------ */}
            <Suspense fallback={<SectionSkeleton />}>
                <AbsenceLeaveAnalysis />
            </Suspense>

            {/* --- Section 7: Target Comparison ---- */}
            <Suspense fallback={<SectionSkeleton />}>
                <TargetComparison />
            </Suspense>

            {/* --- Section 8: Employee Comparison -- */}
            <Suspense fallback={<SectionSkeleton />}>
                <EmployeeComparison />
            </Suspense>

            {/* --- Section 9: Org Hierarchy Tree --- */}
            <Suspense fallback={<SectionSkeleton />}>
                <OrgHierarchyTree />
            </Suspense>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */
export default function TeamAttendanceAnalyticsV2() {
    return (
        <AnalyticsFilterProvider>
            <AnalyticsContent />
        </AnalyticsFilterProvider>
    );
}
