import React, { useState } from 'react';
import {
    BoltIcon,
    UsersIcon,
    ClockIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';

import OvertimeAuditTab from './OvertimeAuditTab';
import OTEmployeeAnalysisTab from './OTEmployeeAnalysisTab';
import OTAnalysisTab from './OTAnalysisTab';
import OTGroupingAuditTab from './OTGroupingAuditTab';
import PotentialAuditTab from './PotentialAuditTab';

const SUB_TABS = [
    { id: 'panel', name: 'Şirket Geneli', icon: BoltIcon, Component: OTAnalysisTab,
      desc: 'OT Assignment + Request + Potential üçlü panel, CLAIMABLE/CLAIMED/BLOCKED dağılımı' },
    { id: 'employee', name: 'Çalışan Bazlı', icon: UsersIcon, Component: OTEmployeeAnalysisTab,
      desc: 'Tarih + departman filtreli çalışan başına OT istatistik tablosu' },
    { id: 'audit', name: 'Denetim & Purge', icon: ClockIcon, Component: OvertimeAuditTab,
      desc: 'OT anomalileri (HIGH/MEDIUM/LOW severity) + bulk silme' },
    { id: 'grouping', name: 'Gruplama Anomalisi', icon: FunnelIcon, Component: OTGroupingAuditTab,
      desc: 'OT segment gruplama/parçalanma bug tarayıcı + TXT export' },
    { id: 'potential', name: 'Potansiyel Denetimi', icon: BoltIcon, Component: PotentialAuditTab,
      desc: 'Kart verisi olmayan "hayalet" POTENTIAL OT kayıt tarayıcı' },
];

export default function OTHubTab() {
    const [active, setActive] = useState('panel');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-100 rounded-xl">
                        <BoltIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Fazla Mesai Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            OT analizi, denetimi, gruplama ve potansiyel tarama — tek panelde.
                        </p>
                    </div>
                </div>

                <nav className="flex flex-wrap gap-1.5 mt-3">
                    {SUB_TABS.map(t => {
                        const Active = active === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActive(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                    Active ? 'bg-amber-600 text-white'
                                           : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <t.icon className="w-3.5 h-3.5" />
                                {t.name}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-2 text-[11px] text-gray-500 italic">{meta.desc}</div>
            </div>

            <Comp />
        </div>
    );
}
