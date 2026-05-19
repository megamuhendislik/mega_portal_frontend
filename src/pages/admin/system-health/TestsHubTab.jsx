import React, { useState } from 'react';
import {
    BeakerIcon,
    SparklesIcon,
    BugAntIcon,
    CheckCircleIcon,
    ServerStackIcon,
    BoltIcon,
    PlayCircleIcon,
} from '@heroicons/react/24/outline';

import SpecTestsTab from './SpecTestsTab';
import E2ETestTab from './E2ETestTab';
import AnalyticsFixAuditTab from './AnalyticsFixAuditTab';
import FixSimulationTab from './FixSimulationTab';
import BugFixVerificationTab from './BugFixVerificationTab';
import AnomalyFixTestsTab from './AnomalyFixTestsTab';
import FixValidationTab from './FixValidationTab';

const SUB_TABS = [
    { id: 'spec_tests', name: 'Spec Testleri', icon: BeakerIcon, Component: SpecTestsTab,
      desc: 'Domain bazlı 8 alan spec testlerini koşturur (attendance, OT, leave, rbac...)' },
    { id: 'e2e_tests', name: 'E2E Testleri', icon: PlayCircleIcon, Component: E2ETestTab,
      desc: 'Uçtan-uca akış: setup → talep → onay → kural → doğrulama → cleanup (Celery)' },
    { id: 'analytics_fix_audit', name: 'Analytics Fix Audit', icon: SparklesIcon, Component: AnalyticsFixAuditTab,
      desc: 'Analytics fix\'leri (SLA, percentile, insights, comparison, burnout) in-memory denetim' },
    { id: 'fix_simulation', name: 'Fix Simülasyonu', icon: SparklesIcon, Component: FixSimulationTab,
      desc: 'Bug fix\'lerin mantığını DB\'ye yazmadan transaction.atomic rollback ile simüle eder' },
    { id: 'bugfix_verify', name: 'Bug Fix Doğrulama', icon: CheckCircleIcon, Component: BugFixVerificationTab,
      desc: 'Geçmiş 6-bug paketinin canlı prod\'da aktif olduğunu read-only doğrular' },
    { id: 'anomaly_fix_tests', name: 'Anomali Fix Testleri', icon: BugAntIcon, Component: AnomalyFixTestsTab,
      desc: 'Recent fix domain (Sema/Türkay anomaly recovery) 32 spec testi' },
    { id: 'fix_validation', name: 'Kök Neden Doğrulama', icon: BoltIcon, Component: FixValidationTab,
      desc: 'BUG1-5 (segments dedup, cancel audit gap, RE_REQUEST) canlı kayıt örnekleme' },
];

export default function TestsHubTab() {
    const [activeSubTab, setActiveSubTab] = useState('spec_tests');
    const ActiveComponent = (SUB_TABS.find(t => t.id === activeSubTab) || SUB_TABS[0]).Component;
    const activeMeta = SUB_TABS.find(t => t.id === activeSubTab) || SUB_TABS[0];

    return (
        <div className="space-y-4">
            {/* Hub Header */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <BeakerIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Test & Doğrulama Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Spec testleri, E2E akışlar, fix denetimleri ve simülasyonlar — tek panelde.
                        </p>
                    </div>
                </div>

                {/* Sub-tab nav */}
                <nav className="flex flex-wrap gap-1.5 mt-3">
                    {SUB_TABS.map(t => {
                        const Active = activeSubTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveSubTab(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                    Active
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.name}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-2 text-[11px] text-gray-500 italic">
                    {activeMeta.desc}
                </div>
            </div>

            {/* Active sub-tab content */}
            <ActiveComponent />
        </div>
    );
}
