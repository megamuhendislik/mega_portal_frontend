import React, { useState, Suspense } from 'react';
import { BarChart3, User, GitCompare, Clock, FileText } from 'lucide-react';
import { AnalyticsProvider } from './AnalyticsContext';
import AnalyticsFilterBar from './AnalyticsFilterBar';

const OverviewTab = React.lazy(() => import('./tabs/OverviewTab'));
const PerformanceTab = React.lazy(() => import('./tabs/PerformanceTab'));
const ComparisonTab = React.lazy(() => import('./tabs/ComparisonTab'));
const OvertimeMealTab = React.lazy(() => import('./tabs/OvertimeMealTab'));
const RequestAnalyticsTab = React.lazy(() => import('./tabs/RequestAnalyticsTab'));

const TABS = [
    { key: 'overview', label: 'Genel Bakış', icon: BarChart3 },
    { key: 'performance', label: 'Performans', icon: User },
    { key: 'comparison', label: 'Karşılaştırma', icon: GitCompare },
    { key: 'overtime_meal', label: 'OT & Yemek', icon: Clock },
    { key: 'requests', label: 'Talep Analizi', icon: FileText },
];

const TabSpinner = () => (
    <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
);

export default function TeamAnalytics() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <AnalyticsProvider>
            <div className="space-y-4">
                {/* Filter Bar */}
                <AnalyticsFilterBar />

                {/* Tab navigation */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                <Suspense fallback={<TabSpinner />}>
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'performance' && <PerformanceTab />}
                    {activeTab === 'comparison' && <ComparisonTab />}
                    {activeTab === 'overtime_meal' && <OvertimeMealTab />}
                    {activeTab === 'requests' && <RequestAnalyticsTab />}
                </Suspense>
            </div>
        </AnalyticsProvider>
    );
}
