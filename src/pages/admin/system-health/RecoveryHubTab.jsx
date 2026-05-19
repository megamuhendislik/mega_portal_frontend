import React, { useState } from 'react';
import {
    WrenchScrewdriverIcon,
    BoltIcon,
} from '@heroicons/react/24/outline';

import DailyCorrectionTab from './DailyCorrectionTab';
import QuickGateFixTab from './QuickGateFixTab';
import StuckAttendanceRecoveryTab from './StuckAttendanceRecoveryTab';
import FalseCancelledHRRestoreTab from './FalseCancelledHRRestoreTab';

const SUB_TABS = [
    { id: 'daily', name: 'Günlük Düzeltme', icon: WrenchScrewdriverIcon, Component: DailyCorrectionTab,
      desc: 'Tek gün recalc (mid-day live + past day MWS cascade), dry-run + apply' },
    { id: 'gate', name: 'Hızlı Kart Onarımı', icon: BoltIcon, Component: QuickGateFixTab,
      desc: 'Belirli gün GateEventLog → Attendance rebuild (~2-10sn, dry-run+apply)' },
    { id: 'stuck', name: 'Takılı Attendance', icon: WrenchScrewdriverIcon, Component: StuckAttendanceRecoveryTab,
      desc: 'Takılı OPEN attendance scan + bulk reset + recalc tetikleme' },
    { id: 'false_cancel', name: 'Yanlış İptal Kurtarma', icon: WrenchScrewdriverIcon, Component: FalseCancelledHRRestoreTab,
      desc: 'HOSPITAL_VISIT yanlış CANCELLED kayıt recovery (2026-05-12 bug)' },
];

export default function RecoveryHubTab() {
    const [active, setActive] = useState('daily');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-orange-100 rounded-xl">
                        <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Onarım & Recovery Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Günlük düzeltme, kart onarımı, takılı kayıt ve takvim temizliği.
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
                                    Active ? 'bg-orange-600 text-white'
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
