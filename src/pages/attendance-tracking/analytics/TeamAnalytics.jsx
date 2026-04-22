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
    { key: 'overview', label: 'Genel Bakış', icon: BarChart3, desc: 'KPI ve özet metrikler' },
    { key: 'performance', label: 'Performans', icon: User, desc: 'Bireysel analiz' },
    { key: 'comparison', label: 'Karşılaştırma', icon: GitCompare, desc: 'Kişi & ekip kıyaslama' },
    { key: 'overtime_meal', label: 'OT & Yemek', icon: Clock, desc: 'Mesai ve mola analizi' },
    { key: 'requests', label: 'Talep Analizi', icon: FileText, desc: 'İzin, OT, yemek talepleri' },
];

const TabSpinner = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Yükleniyor...</p>
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
                <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-sm overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 min-w-max">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap group ${
                                        isActive
                                            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-sm border border-indigo-200/80'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-transparent text-slate-400 group-hover:text-slate-500'}`}>
                                        <Icon size={14} />
                                    </div>
                                    <div className="text-left">
                                        <div>{tab.label}</div>
                                        <div className={`text-[9px] font-medium mt-0.5 ${isActive ? 'text-indigo-400' : 'text-slate-300 group-hover:text-slate-400'}`}>{tab.desc}</div>
                                    </div>
                                    {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />}
                                </button>
                            );
                        })}
                    </div>
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
