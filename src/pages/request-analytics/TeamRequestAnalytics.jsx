import React, { Suspense } from 'react';
import { DatePicker } from 'antd';
import { RequestFilterProvider, useRequestFilter } from './RequestFilterContext';

const RequestOverviewKPI = React.lazy(() => import('./sections/RequestOverviewKPI'));
const RequestTypeDistribution = React.lazy(() => import('./sections/RequestTypeDistribution'));
const ApprovalProcessAnalysis = React.lazy(() => import('./sections/ApprovalProcessAnalysis'));
const LeaveDetailAnalysis = React.lazy(() => import('./sections/LeaveDetailAnalysis'));
const OtMealCardlessAnalysis = React.lazy(() => import('./sections/OtMealCardlessAnalysis'));
const DepartmentEmployeeBreakdown = React.lazy(() => import('./sections/DepartmentEmployeeBreakdown'));
const CorrelationPatterns = React.lazy(() => import('./sections/CorrelationPatterns'));

const FILTERS = [
    { key: 'this_week', label: 'Bu Hafta' },
    { key: 'last_7', label: 'Son 7 Gun' },
    { key: 'last_30', label: 'Son 30 Gun' },
    { key: 'this_month', label: 'Bu Ay' },
    { key: 'last_month', label: 'Gecen Ay' },
];

function RequestQuickDateFilters() {
    const { quickFilter, setQuickFilter, setCustomRange } = useRequestFilter();
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {FILTERS.map(f => (
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
                        setCustomRange({
                            start: dates[0].format('YYYY-MM-DD'),
                            end: dates[1].format('YYYY-MM-DD'),
                        });
                        setQuickFilter('custom');
                    }
                }}
                className="rounded-lg"
                placeholder={['Baslangic', 'Bitis']}
            />
        </div>
    );
}

function SectionSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
            <div className="h-40 bg-slate-100 rounded-xl" />
        </div>
    );
}

export default function TeamRequestAnalytics() {
    return (
        <RequestFilterProvider>
            <div className="space-y-6">
                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <RequestQuickDateFilters />
                </div>

                {/* Section 1: Request Overview KPIs */}
                <Suspense fallback={<SectionSkeleton />}>
                    <RequestOverviewKPI />
                </Suspense>

                {/* Section 2: Request Type Distribution */}
                <Suspense fallback={<SectionSkeleton />}>
                    <RequestTypeDistribution />
                </Suspense>

                {/* Section 3: Approval Process Analysis */}
                <Suspense fallback={<SectionSkeleton />}>
                    <ApprovalProcessAnalysis />
                </Suspense>

                {/* Section 4: Leave Detail Analysis */}
                <Suspense fallback={<SectionSkeleton />}>
                    <LeaveDetailAnalysis />
                </Suspense>

                {/* Section 5: OT + Meal + Cardless Analysis */}
                <Suspense fallback={<SectionSkeleton />}>
                    <OtMealCardlessAnalysis />
                </Suspense>

                {/* Section 6: Department & Employee Breakdown */}
                <Suspense fallback={<SectionSkeleton />}>
                    <DepartmentEmployeeBreakdown />
                </Suspense>

                {/* Section 7: Correlation Patterns */}
                <Suspense fallback={<SectionSkeleton />}>
                    <CorrelationPatterns />
                </Suspense>
            </div>
        </RequestFilterProvider>
    );
}
