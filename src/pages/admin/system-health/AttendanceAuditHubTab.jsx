import React, { useState } from 'react';
import {
    ClockIcon,
    CalculatorIcon,
    MoonIcon,
    WrenchScrewdriverIcon,
    BugAntIcon,
} from '@heroicons/react/24/outline';

import MonthlyAuditTab from './MonthlyAuditTab';
import AttendanceAuditTab from './AttendanceAuditTab';
import AttendanceDiagTab from './AttendanceDiagTab';
import ScheduleAuditTab from './ScheduleAuditTab';
import NightlyAuditTab from './NightlyAuditTab';
import SegmentDuplicateAuditTab from './SegmentDuplicateAuditTab';
import DuplicateAttendanceTab from './DuplicateAttendanceTab';

const SUB_TABS = [
    { id: 'monthly', name: 'Aylık Denetim', icon: CalculatorIcon, Component: MonthlyAuditTab,
      desc: 'Tek çalışan + ay/yıl drill-down, gün gün karşılaştırma + autoFix + bulk' },
    { id: 'compliance', name: 'Attendance Uyumluluk', icon: ClockIcon, Component: AttendanceAuditTab,
      desc: 'Tüm çalışan/tarih için Attendance anomalileri PASS/FAIL/WARNING' },
    { id: 'diag', name: 'Aylık Mesai Doğrulama', icon: ClockIcon, Component: AttendanceDiagTab,
      desc: 'Aylık çalışan × MonthlyWorkSummary mismatch tarama' },
    { id: 'schedule', name: 'Takvim Denetimi', icon: ClockIcon, Component: ScheduleAuditTab,
      desc: 'Çalışan + ay → FiscalCalendar/ScheduleTemplate/Override zincirinin çözümü' },
    { id: 'nightly', name: 'Gece Denetim', icon: MoonIcon, Component: NightlyAuditTab,
      desc: 'Celery gece görevlerinin log tarihleri (REQUEST_LIFECYCLE, SPLIT_CHECK, vb.)' },
    { id: 'segment_dup', name: 'Segment Duplikat', icon: WrenchScrewdriverIcon, Component: SegmentDuplicateAuditTab,
      desc: 'OT request segments JSON içinde duplikat segment tarayıcı + apply' },
    { id: 'duplicate_att', name: 'Mükerrer Mesai', icon: BugAntIcon, Component: DuplicateAttendanceTab,
      desc: 'Aynı employee+work_date için birden fazla Attendance row + sil/export' },
];

export default function AttendanceAuditHubTab() {
    const [active, setActive] = useState('monthly');
    const meta = SUB_TABS.find(t => t.id === active) || SUB_TABS[0];
    const Comp = meta.Component;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <CalculatorIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-800">Mesai Denetim Merkezi</h2>
                        <p className="text-xs text-gray-500">
                            Aylık denetim, uyumluluk, takvim, gece audit, mükerrer ve segment duplikat tarayıcılar.
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
                                    Active ? 'bg-blue-600 text-white'
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
