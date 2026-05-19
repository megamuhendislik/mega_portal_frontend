import React, { useState } from 'react';
import {
    MagnifyingGlassIcon,
    ClipboardDocumentCheckIcon,
    UserIcon,
} from '@heroicons/react/24/outline';

import UnifiedRecordCheckTab from './UnifiedRecordCheckTab';
import DailyRecordAuditTab from './DailyRecordAuditTab';
import EmployeeDetailTab from './EmployeeDetailTab';
import PersonDayDiagnosticTab from './PersonDayDiagnosticTab';

const SUB_TABS = [
    { id: 'forensic', name: 'Forensic & Inceleme', icon: MagnifyingGlassIcon, Component: UnifiedRecordCheckTab,
      desc: 'Kart-Attendance forensic + data-inspection + silme (CardDiagnostics, AttendanceForensic)' },
    { id: 'daily', name: 'Günlük Kayıt Denetimi', icon: ClipboardDocumentCheckIcon, Component: DailyRecordAuditTab,
      desc: 'Tek çalışan + gün için raw kart + attendance audit + kayıt geri yükleme' },
    { id: 'diagnostic', name: 'Kişi-Gün Tanılama', icon: MagnifyingGlassIcon, Component: PersonDayDiagnosticTab,
      desc: 'Talep + attendance + event tanılama (OT, leave, segment)' },
    { id: 'detail', name: 'Çalışan Detay', icon: UserIcon, Component: EmployeeDetailTab,
      desc: 'Tek çalışan: card events + attendance + requests + leave history' },
];

export default function PersonDayHubTab() {
    const [active, setActive] = useState('forensic');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-100 rounded-xl">
                        <MagnifyingGlassIcon className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Kişi-Gün Tanılama Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Çalışan × gün incelemesi — forensic, daily audit, diagnostic, detail.
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
                                    Active ? 'bg-cyan-600 text-white'
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
