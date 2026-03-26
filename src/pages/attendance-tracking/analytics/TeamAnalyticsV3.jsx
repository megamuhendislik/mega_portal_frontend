import React, { Suspense, lazy, useState, useCallback } from 'react';
import { AnalyticsFilterProvider } from './AnalyticsFilterContext';
import GlobalFilterBar from './GlobalFilterBar';
import CollapsibleSection from './shared/CollapsibleSection';
import { Target, Clock, CalendarCheck, Users } from 'lucide-react';

const KPISummary = lazy(() => import('./sections/KPISummary'));
const EfficiencySection = lazy(() => import('./sections/EfficiencySection'));
const OvertimeSection = lazy(() => import('./sections/OvertimeSection'));
const AttendanceLeaveSection = lazy(() => import('./sections/AttendanceLeaveSection'));
const ComparisonSection = lazy(() => import('./sections/ComparisonSection'));
const PersonDetailDrawer = lazy(() => import('./sections/PersonDetailDrawer'));

function SectionLoader() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );
}

function TeamAnalyticsV3Inner() {
    const [drawerEmployee, setDrawerEmployee] = useState(null);

    const handlePersonClick = useCallback((employeeId) => {
        setDrawerEmployee(employeeId);
    }, []);

    return (
        <div className="space-y-4">
            <GlobalFilterBar />

            <Suspense fallback={<SectionLoader />}>
                <KPISummary />
            </Suspense>

            <CollapsibleSection
                title="Verimlilik"
                icon={Target}
                iconGradient="from-blue-500 to-indigo-600"
                subtitle="Hedef karşılaştırma ve kişi bazlı performans"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <EfficiencySection onPersonClick={handlePersonClick} />
                </Suspense>
            </CollapsibleSection>

            <CollapsibleSection
                title="Ek Mesai"
                icon={Clock}
                iconGradient="from-violet-500 to-purple-600"
                subtitle="Kaynak dağılımı, yoğunluk ve kişi bazlı analiz"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <OvertimeSection onPersonClick={handlePersonClick} />
                </Suspense>
            </CollapsibleSection>

            <CollapsibleSection
                title="Devam & İzin"
                icon={CalendarCheck}
                iconGradient="from-emerald-500 to-green-600"
                subtitle="Devam takibi, izin kullanımı ve trendler"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <AttendanceLeaveSection onPersonClick={handlePersonClick} />
                </Suspense>
            </CollapsibleSection>

            <CollapsibleSection
                title="Karşılaştırma"
                icon={Users}
                iconGradient="from-amber-500 to-orange-600"
                subtitle="Kişi seçerek detaylı kıyaslama"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <ComparisonSection onPersonClick={handlePersonClick} />
                </Suspense>
            </CollapsibleSection>

            {drawerEmployee && (
                <Suspense fallback={null}>
                    <PersonDetailDrawer
                        open={true}
                        onClose={() => setDrawerEmployee(null)}
                        employeeId={drawerEmployee}
                    />
                </Suspense>
            )}
        </div>
    );
}

export default function TeamAnalyticsV3() {
    return (
        <AnalyticsFilterProvider>
            <TeamAnalyticsV3Inner />
        </AnalyticsFilterProvider>
    );
}
