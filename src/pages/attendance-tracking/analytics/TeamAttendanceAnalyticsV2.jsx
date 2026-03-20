import React, { Suspense } from 'react';
import { AnalyticsFilterProvider } from './AnalyticsFilterContext';
import QuickDateFilters from './shared/QuickDateFilters';
import ComparisonSelector from './shared/ComparisonSelector';

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

export default function TeamAttendanceAnalyticsV2() {
    return (
        <AnalyticsFilterProvider>
            <div className="space-y-6">
                {/* ─── Filters Row ───────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <QuickDateFilters />
                    <ComparisonSelector />
                </div>

                {/* ─── Section 1: Team Overview KPIs ─── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <TeamOverviewKPI />
                </Suspense>

                {/* ─── Section 2: Entry/Exit Distribution */}
                <Suspense fallback={<SectionSkeleton />}>
                    <EntryExitDistribution />
                </Suspense>

                {/* ─── Section 3: Work Hours Analysis ── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <WorkHoursAnalysis />
                </Suspense>

                {/* ─── Section 4: Overtime Analysis ──── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <OvertimeAnalysis />
                </Suspense>

                {/* ─── Section 5: Break & Meal Analysis  */}
                <Suspense fallback={<SectionSkeleton />}>
                    <BreakMealAnalysis />
                </Suspense>

                {/* ─── Section 6: Absence & Leave ────── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <AbsenceLeaveAnalysis />
                </Suspense>

                {/* ─── Section 7: Target Comparison ──── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <TargetComparison />
                </Suspense>

                {/* ─── Section 8: Employee Comparison ── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <EmployeeComparison />
                </Suspense>

                {/* ─── Section 9: Org Hierarchy Tree ─── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <OrgHierarchyTree />
                </Suspense>
            </div>
        </AnalyticsFilterProvider>
    );
}
