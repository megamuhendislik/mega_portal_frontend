import React, { useMemo, useState } from 'react';
import { X, Users2, ArrowDownAZ } from 'lucide-react';
import { Segmented } from 'antd';
import { levelColor, intensityColor, fmtHrs, fmtPct, gradientFor, initials } from './helpers';

/**
 * Bir grubun (departman/pozisyon/manager subtree/custom) icindeki
 * kisileri tablo halinde gosterir. Tikla -> kisi detay drawer.
 */
export default function DrillDownGroupModal({ open, group, employeeIndex, onClose, onSelectPerson }) {
    const [sortBy, setSortBy] = useState('normal_asc');
    if (!open || !group) return null;

    // employeeIndex map: { employee_id: full employee row }
    // group içindeki ID'leri full row'a map'le
    const ids = group.employee_ids || (group.employees ? group.employees.map((e) => e.employee_id) : []);

    return (
        <DrillDownInner
            ids={ids}
            employeeIndex={employeeIndex}
            group={group}
            sortBy={sortBy} setSortBy={setSortBy}
            onClose={onClose}
            onSelectPerson={onSelectPerson}
        />
    );
}

function DrillDownInner({ ids, employeeIndex, group, sortBy, setSortBy, onClose, onSelectPerson }) {
    const employees = useMemo(() => {
        const list = ids.map((id) => employeeIndex[id]).filter(Boolean);
        switch (sortBy) {
            case 'normal_asc':
                list.sort((a, b) => (a.normal_completion_pct ?? 0) - (b.normal_completion_pct ?? 0));
                break;
            case 'normal_desc':
                list.sort((a, b) => (b.normal_completion_pct ?? 0) - (a.normal_completion_pct ?? 0));
                break;
            case 'ot_desc':
                list.sort((a, b) => (b.ot_hours || 0) - (a.ot_hours || 0));
                break;
            case 'missing_desc':
                list.sort((a, b) => (b.missing_hours || 0) - (a.missing_hours || 0));
                break;
            case 'name':
                list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
                break;
        }
        return list;
    }, [ids, employeeIndex, sortBy]);

    const m = group.metrics || group;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[88vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                        <Users2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-slate-800 truncate">
                            {group.group_name || group.name || 'Grup'}
                        </h3>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                            <span><b>{employees.length}</b> kişi</span>
                            <span>· Yap.M. Ort: <b style={{ color: levelColor(m.avg_normal_completion_pct) }}>{fmtPct(m.avg_normal_completion_pct)}</b></span>
                            <span>· Toplam FM: <b className="text-amber-600">{fmtHrs(m.total_ot_hours)}</b></span>
                            <span>· Toplam Eksik: <b className="text-red-600">{fmtHrs(m.total_missing_hours)}</b></span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X size={18} className="text-slate-500" />
                    </button>
                </div>

                <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/50">
                    <Segmented
                        size="small"
                        value={sortBy}
                        onChange={setSortBy}
                        options={[
                            { value: 'normal_asc', label: <span className="text-[10px]"><ArrowDownAZ size={10} className="inline" /> Yap.M. ↑</span> },
                            { value: 'normal_desc', label: <span className="text-[10px]">Yap.M. ↓</span> },
                            { value: 'ot_desc', label: <span className="text-[10px]">FM ↓</span> },
                            { value: 'missing_desc', label: <span className="text-[10px]">Eksik ↓</span> },
                            { value: 'name', label: <span className="text-[10px]">A-Z</span> },
                        ]}
                    />
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {employees.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">Bu grupta kişi bulunamadı</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-2 px-3 text-left text-[10px] uppercase font-black text-slate-500 tracking-wider">Çalışan</th>
                                    <th className="py-2 px-3 text-left text-[10px] uppercase font-black text-slate-500 tracking-wider">Departman</th>
                                    <th className="py-2 px-3 text-right text-[10px] uppercase font-black text-slate-500 tracking-wider">Normal</th>
                                    <th className="py-2 px-3 text-right text-[10px] uppercase font-black text-slate-500 tracking-wider">FM</th>
                                    <th className="py-2 px-3 text-right text-[10px] uppercase font-black text-slate-500 tracking-wider">Eksik</th>
                                    <th className="py-2 px-3 text-center text-[10px] uppercase font-black text-slate-500 tracking-wider">Yap.M.</th>
                                    <th className="py-2 px-3 text-center text-[10px] uppercase font-black text-slate-500 tracking-wider">T.Mesai</th>
                                    <th className="py-2 px-3 text-center text-[10px] uppercase font-black text-slate-500 tracking-wider">FM/Y</th>
                                    <th className="py-2 px-3 text-center text-[10px] uppercase font-black text-slate-500 tracking-wider">Eksik/Y</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((e) => (
                                    <tr
                                        key={e.employee_id}
                                        onClick={() => onSelectPerson?.(e.employee_id)}
                                        className="border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                                    >
                                        <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(e.employee_id)} text-white shadow-sm flex-shrink-0`}>
                                                    <span className="text-[9px] font-black">{initials(e.name)}</span>
                                                </div>
                                                <span className="font-bold text-[12px] text-slate-800">{e.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-slate-500 text-[11px]">{e.department || '—'}</td>
                                        <td className="py-2 px-3 text-right tabular-nums text-[12px] font-bold text-slate-700">{fmtHrs(e.normal_hours)}</td>
                                        <td className="py-2 px-3 text-right tabular-nums text-[12px] font-bold text-amber-600">{fmtHrs(e.ot_hours)}</td>
                                        <td className="py-2 px-3 text-right tabular-nums text-[12px] font-bold text-red-500">{fmtHrs(e.missing_hours)}</td>
                                        <td className="py-2 px-3 text-center tabular-nums text-[11px] font-black" style={{ color: levelColor(e.normal_completion_pct ?? e.efficiency_pct ?? 0) }}>
                                            {fmtPct(e.normal_completion_pct ?? e.efficiency_pct)}
                                        </td>
                                        <td className="py-2 px-3 text-center tabular-nums text-[11px] font-black" style={{ color: (e.total_completion_pct || 0) >= 100 ? '#7c3aed' : levelColor(e.total_completion_pct) }}>
                                            {fmtPct(e.total_completion_pct)}
                                        </td>
                                        <td className="py-2 px-3 text-center tabular-nums text-[11px] font-bold" style={{ color: intensityColor(e.ot_to_target_pct) }}>
                                            {fmtPct(e.ot_to_target_pct)}
                                        </td>
                                        <td className="py-2 px-3 text-center tabular-nums text-[11px] font-bold" style={{ color: intensityColor(e.missing_to_target_pct) }}>
                                            {fmtPct(e.missing_to_target_pct)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
