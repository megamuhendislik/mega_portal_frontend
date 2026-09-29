import React from 'react';
import { buildDutyOtLimitRows, buildLeaveOverlapRows } from '../../utils/dutyOtLimitWarning';
import { fmtSaDkSec } from '../../utils/dateUtils';

// Hafta hafta: sınıra sayılan FM + mevcut görev FM'si + bu görevin FM'si.
export const DutyOtLimitWarningTable = ({ warning }) => {
    const rows = buildDutyOtLimitRows(warning);
    if (rows.length === 0) return null;
    const hasOldRule = rows.some(row => row.exceeds && !row.limitExempt);
    return (
        <div className="space-y-2">
            <div className="overflow-x-auto rounded-lg border border-amber-200">
                <table className="w-full text-xs">
                    <thead className="bg-amber-50 text-amber-800">
                        <tr>
                            <th className="px-2 py-1.5 text-left font-bold">Hafta</th>
                            <th className="px-2 py-1.5 text-right font-bold">Kart / manuel FM</th>
                            <th className="px-2 py-1.5 text-right font-bold">Diğer görev FM</th>
                            <th className="px-2 py-1.5 text-right font-bold">Bu görev FM</th>
                            <th className="px-2 py-1.5 text-right font-bold">Toplam / Sınır</th>
                            <th className="px-2 py-1.5 text-right font-bold">Aşım</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.key} className={row.exceeds ? 'bg-red-50/60' : 'bg-white'}>
                                <td className="px-2 py-1.5 font-semibold text-slate-700 whitespace-nowrap">{row.weekLabel}</td>
                                <td className="px-2 py-1.5 text-right text-slate-600 whitespace-nowrap">{row.counted}</td>
                                <td className="px-2 py-1.5 text-right text-slate-600 whitespace-nowrap">{row.existingDuty}</td>
                                <td className="px-2 py-1.5 text-right font-semibold text-purple-700 whitespace-nowrap">{row.projected}</td>
                                <td className="px-2 py-1.5 text-right text-slate-700 whitespace-nowrap">{row.total} / {row.limit}</td>
                                <td className={`px-2 py-1.5 text-right font-bold whitespace-nowrap ${row.exceeds ? 'text-red-600' : 'text-slate-400'}`}>
                                    {row.exceeds ? `+${row.over}` : row.over}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasOldRule && (
                <p className="text-xs text-slate-500">
                    26.08.2026 öncesi haftalarda eski kural geçerlidir: görev fazla mesaisinin sınırı aşan kısmı otomatik onaylanmaz.
                </p>
            )}
        </div>
    );
};

// Görev günlerinde çalışanın onaylı/bekleyen izinleri.
export const DutyLeaveOverlapList = ({ warning }) => {
    const rows = buildLeaveOverlapRows(warning);
    if (rows.length === 0) return null;
    return (
        <div className="space-y-1.5">
            <p>
                Çalışan bu günlerde izinde:
            </p>
            <ul className="rounded-lg border border-amber-200 bg-white divide-y divide-amber-100 text-xs">
                {rows.map(row => (
                    <li key={row.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1.5">
                        <span className="font-semibold text-slate-700">{row.dateLabel}</span>
                        <span className="text-slate-700">{row.typeName}</span>
                        <span className="text-slate-500">{row.timeLabel}</span>
                        <span className={`ml-auto font-semibold ${row.pending ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ({row.statusLabel})
                        </span>
                    </li>
                ))}
            </ul>
            <p className="text-xs text-slate-500">
                Bu günlerde görevin tamamı fazla mesai sayılır (izin günlük hedefi doldurur).
            </p>
        </div>
    );
};

// Uyarıların gövdesi (onay penceresi + detay kutusu ortak).
export const DutyApprovalWarningBody = ({ warning }) => (
    <div className="space-y-3">
        {warning?.exceeds_limit && (
            <div className="space-y-2">
                <p>
                    Bu dış görevin fazla mesaisiyle <b>{warning?.employee_name || 'çalışanın'}</b> haftalık
                    fazla mesai sınırı <b className="text-red-600">+{fmtSaDkSec(warning?.total_over_seconds)}</b> aşılıyor.
                </p>
                <DutyOtLimitWarningTable warning={warning} />
                <p>
                    Dış görev fazla mesaisi sınırdan muaftır; onaylarsanız görevin fazla mesaisi tam olarak onaylanır.
                </p>
            </div>
        )}
        {warning?.has_leave_overlap && <DutyLeaveOverlapList warning={warning} />}
    </div>
);

export const DutyOtLimitWarningMessage = ({ warning }) => (
    <div className="space-y-3 text-sm text-slate-600">
        <DutyApprovalWarningBody warning={warning} />
        <p className="font-semibold text-slate-800">Yine de onaylamak istediğinize emin misiniz?</p>
    </div>
);
