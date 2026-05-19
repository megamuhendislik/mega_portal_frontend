import React, { useState } from 'react';
import {
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

import RequestAnalysisTab from './RequestAnalysisTab';
import RequestHealthTab from './RequestHealthTab';
import RequestInspectionTab from './RequestInspectionTab';
import CancellationInvestigationTab from './CancellationInvestigationTab';
import ExcuseLeaveAuditTab from './ExcuseLeaveAuditTab';

const SUB_TABS = [
    { id: 'analysis', name: 'Talep Analizi', icon: ClipboardDocumentCheckIcon, Component: RequestAnalysisTab,
      desc: 'Comprehensive talep analizi + lifecycle audit + OT fragment fix + bulk düzelt' },
    { id: 'health', name: 'Talep Sağlığı', icon: ClipboardDocumentCheckIcon, Component: RequestHealthTab,
      desc: 'Tüm ekip talepleri + leave + OT birleşik listeleme (orphans göstergesi)' },
    { id: 'inspection', name: 'Talep İnceleme', icon: ClipboardDocumentCheckIcon, Component: RequestInspectionTab,
      desc: 'Filtre tabanlı talep arama (date + type + status + employee)' },
    { id: 'cancellation', name: 'İptal İnceleme', icon: ExclamationTriangleIcon, Component: CancellationInvestigationTab,
      desc: 'İptal edilen talep forensic (MANUAL/BULK_CRON/SYSTEM_DEDUP/ORPHAN_APPROVER verdict)' },
    { id: 'excuse', name: 'Mazeret İzni', icon: ClockIcon, Component: ExcuseLeaveAuditTab,
      desc: 'Mazeret izni 18sa/yıl bakiye + kullanım denetimi' },
];

export default function RequestHubTab() {
    const [active, setActive] = useState('analysis');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-xl">
                        <ClipboardDocumentCheckIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Talep & İzin Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Talep analizi, sağlık, inceleme, iptal forensic ve mazeret izni denetimi.
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
                                    Active ? 'bg-purple-600 text-white'
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
