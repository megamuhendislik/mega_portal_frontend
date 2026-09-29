import React from 'react';
import { buildDutyOtLimitRows, buildLeaveOverlapRows } from '../../utils/dutyOtLimitWarning';
import { fmtSaDkSec } from '../../utils/dateUtils';
import { dutyAdminApprovalNote } from '../../utils/overtimeApprovalStage';

export const DutyOtLimitWarningTable = ({ warning }) => {
    const rows = buildDutyOtLimitRows(warning);
    if (rows.length === 0) return null;
    const hasOldRule = rows.some(row => row.exceeds && !row.limitExempt);
    return (
        <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
                <table className="w-full text-xs">
                    <thead className="bg-amber-50 text-amber-800">
                        <tr>
                            <th className="px-2 py-1.5 text-left font-semibold">Hafta</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Mevcut</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Bu görev</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Toplam</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Sınır</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 text-slate-700">
                        {rows.map(row => (
                            <tr key={row.key}>
                                <td className="px-2 py-1.5 whitespace-nowrap">{row.weekLabel}</td>
                                <td className="px-2 py-1.5 text-right whitespace-nowrap">{row.existing}</td>
                                <td className="px-2 py-1.5 text-right whitespace-nowrap">{row.projected}</td>
                                <td className={`px-2 py-1.5 text-right whitespace-nowrap ${row.exceeds ? 'font-semibold text-amber-900' : ''}`}>{row.total}</td>
                                <td className="px-2 py-1.5 text-right whitespace-nowrap">{row.limit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasOldRule && (
                <p className="text-xs">Bu haftalarda sınırı aşan kısım otomatik onaylanmaz.</p>
            )}
        </div>
    );
};

export const DutyLeaveOverlapList = ({ warning }) => {
    const rows = buildLeaveOverlapRows(warning);
    if (rows.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <p>Çalışan bu tarihlerde izinli:</p>
            <ul className="rounded-lg border border-amber-200 bg-white divide-y divide-amber-100 text-xs text-slate-700">
                {rows.map(row => (
                    <li key={row.key} className="flex flex-wrap items-center gap-x-3 px-2 py-1.5">
                        <span className="font-medium">{row.dateLabel}</span>
                        <span>{row.typeName}</span>
                        <span className="text-slate-500">{row.timeLabel}</span>
                        <span className="ml-auto text-slate-500">{row.statusLabel}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Onay penceresi ve talep detayı aynı içeriği kullanır.
export const DutyApprovalWarningBody = ({ warning }) => {
    const adminNote = dutyAdminApprovalNote(warning);
    return (
        <div className="space-y-3">
            {warning?.exceeds_limit && (
                <div className="space-y-2">
                    <p>
                        Bu görevle birlikte <b>{warning?.employee_name || 'çalışan'}</b> haftalık fazla mesai
                        sınırını <b>{fmtSaDkSec(warning?.total_over_seconds)}</b> aşıyor.
                    </p>
                    <DutyOtLimitWarningTable warning={warning} />
                </div>
            )}
            {adminNote && <p className="font-medium">{adminNote}</p>}
            {warning?.has_leave_overlap && <DutyLeaveOverlapList warning={warning} />}
        </div>
    );
};

export const DutyOtLimitWarningMessage = ({ warning }) => (
    <div className="space-y-3 text-sm text-slate-600">
        <DutyApprovalWarningBody warning={warning} />
        <p className="font-medium text-slate-800">Yine de onaylamak istiyor musunuz?</p>
    </div>
);
