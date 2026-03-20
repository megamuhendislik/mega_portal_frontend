import React, { Suspense } from 'react';
import { AnalyticsFilterProvider } from './AnalyticsFilterContext';
import QuickDateFilters from './shared/QuickDateFilters';
import ComparisonSelector from './shared/ComparisonSelector';

const TeamOverviewKPI = React.lazy(() => import('./sections/TeamOverviewKPI'));
const EntryExitDistribution = React.lazy(() => import('./sections/EntryExitDistribution'));
// TODO Task 11: Uncomment when files are created
// const WorkHoursAnalysis = React.lazy(() => import('./sections/WorkHoursAnalysis'));
// const OvertimeAnalysis = React.lazy(() => import('./sections/OvertimeAnalysis'));
// TODO Task 12: Uncomment when files are created
// const BreakMealAnalysis = React.lazy(() => import('./sections/BreakMealAnalysis'));
// const AbsenceLeaveAnalysis = React.lazy(() => import('./sections/AbsenceLeaveAnalysis'));
// TODO Task 13: Uncomment when files are created
// const TargetComparison = React.lazy(() => import('./sections/TargetComparison'));
// const EmployeeComparison = React.lazy(() => import('./sections/EmployeeComparison'));
// const OrgHierarchyTree = React.lazy(() => import('./sections/OrgHierarchyTree'));

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

                {/* ─── Future Sections (Tasks 11-13) ── */}
                {/* TODO Task 11: Work Hours Analysis */}
                {/* <Suspense fallback={<SectionSkeleton />}><WorkHoursAnalysis /></Suspense> */}
                {/* TODO Task 11: Overtime Analysis */}
                {/* <Suspense fallback={<SectionSkeleton />}><OvertimeAnalysis /></Suspense> */}
                {/* TODO Task 12: Break & Meal Analysis */}
                {/* <Suspense fallback={<SectionSkeleton />}><BreakMealAnalysis /></Suspense> */}
                {/* TODO Task 12: Absence & Leave Analysis */}
                {/* <Suspense fallback={<SectionSkeleton />}><AbsenceLeaveAnalysis /></Suspense> */}
                {/* TODO Task 13: Target Comparison */}
                {/* <Suspense fallback={<SectionSkeleton />}><TargetComparison /></Suspense> */}
                {/* TODO Task 13: Employee Comparison */}
                {/* <Suspense fallback={<SectionSkeleton />}><EmployeeComparison /></Suspense> */}
                {/* TODO Task 13: Org Hierarchy Tree */}
                {/* <Suspense fallback={<SectionSkeleton />}><OrgHierarchyTree /></Suspense> */}
            </div>
        </AnalyticsFilterProvider>
    );
}
