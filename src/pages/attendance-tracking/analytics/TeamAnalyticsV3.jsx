import React, { Suspense, lazy, useState, useCallback } from 'react';
import { AnalyticsFilterProvider, useAnalyticsFilter } from './AnalyticsFilterContext';
import GlobalFilterBar from './GlobalFilterBar';
import CollapsibleSection from './shared/CollapsibleSection';
import { Target, Clock, CalendarCheck, Users, AlarmClock, Coffee, Building2 } from 'lucide-react';

const KPISummary = lazy(() => import('./sections/KPISummary'));
const EfficiencySection = lazy(() => import('./sections/EfficiencySection'));
const OvertimeSection = lazy(() => import('./sections/OvertimeSection'));
const AttendanceLeaveSection = lazy(() => import('./sections/AttendanceLeaveSection'));
const PunctualitySection = lazy(() => import('./sections/PunctualitySection'));
const BreakMealSection = lazy(() => import('./sections/BreakMealSection'));
const DepartmentRoleSection = lazy(() => import('./sections/DepartmentRoleSection'));
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
    const { queryParams } = useAnalyticsFilter();
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
                title="Dakiklik & Gün İçi"
                icon={AlarmClock}
                iconGradient="from-cyan-500 to-blue-600"
                subtitle="Giriş/çıkış dağılımı, geç kalma ve dakiklik performansı"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <PunctualitySection onPersonClick={handlePersonClick} />
                </Suspense>
            </CollapsibleSection>

            <CollapsibleSection
                title="Mola & Yemek"
                icon={Coffee}
                iconGradient="from-orange-500 to-amber-600"
                subtitle="Mola süreleri, taşmalar ve yemek sipariş analizi"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <BreakMealSection onPersonClick={handlePersonClick} />
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
                title="Departman & Rol"
                icon={Building2}
                iconGradient="from-slate-500 to-zinc-600"
                subtitle="Departman karşılaştırması ve rol bazlı performans analizi"
                defaultOpen={true}
            >
                <Suspense fallback={<SectionLoader />}>
                    <DepartmentRoleSection onPersonClick={handlePersonClick} />
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
                        queryParams={queryParams}
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
