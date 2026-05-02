import React, { useMemo, useState } from 'react';
import { Flame, ArrowDownAZ } from 'lucide-react';
import { Segmented, Empty } from 'antd';
import SectionCard from '../../shared/SectionCard';
import { TR_NORM, gradientFor, initials, fmtHrs } from './helpers';

const SORT_OPTIONS = [
    { value: 'normal_asc', label: 'En Düşük Yap. Mesai' },
    { value: 'missing_desc', label: 'En Yüksek Eksik' },
    { value: 'ot_desc', label: 'En Yüksek FM' },
    { value: 'name', label: 'A-Z' },
];

const COLS = [
    { key: 'normal_completion_pct', label: 'Yap.M.', max: 100, invert: false, suffix: '%' },
    { key: 'total_completion_pct', label: 'T.Mesai', max: 120, invert: false, suffix: '%' },
    { key: 'ot_to_target_pct', label: 'FM/Y', max: 50, invert: true, suffix: '%' },
    { key: 'missing_to_target_pct', label: 'Eksik/Y', max: 50, invert: true, suffix: '%' },
    { key: 'ot_to_normal_pct', label: 'FM/N', max: 50, invert: true, suffix: '%', nullable: true },
];

function colorClass(value, max, invert) {
    if (value == null) return 'bg-slate-100 text-slate-400';
    const norm = Math.min(1, Math.max(0, value / max));
    const v = invert ? 1 - norm : norm;
    if (v >= 0.95) return 'bg-emerald-500 text-white';
    if (v >= 0.80) return 'bg-emerald-400 text-white';
    if (v >= 0.65) return 'bg-lime-400 text-slate-800';
    if (v >= 0.50) return 'bg-yellow-300 text-slate-800';
    if (v >= 0.35) return 'bg-orange-300 text-slate-800';
    if (v >= 0.20) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
}

/**
 * Kisi x Metrik heatmap. Renk yogunlugu = degerin kotuden iyiye spectrum'u.
 * Tikla -> kisi detayi (onSelectPerson).
 */
export default function HeatmapView({ employees, onSelectPerson }) {
    const [sortBy, setSortBy] = useState('normal_asc');
    const [search, setSearch] = useState('');
    const [maxRows, setMaxRows] = useState(30);

    const sorted = useMemo(() => {
        const filtered = search
            ? employees.filter((e) => TR_NORM(e.name).includes(TR_NORM(search))
                || TR_NORM(e.department || '').includes(TR_NORM(search)))
            : employees;

        const list = [...filtered].filter((e) => e.has_target ?? (e.target_hours > 0));
        switch (sortBy) {
            case 'normal_asc':
                list.sort((a, b) => (a.normal_completion_pct ?? 0) - (b.normal_completion_pct ?? 0));
                break;
            case 'missing_desc':
                list.sort((a, b) => (b.missing_to_target_pct ?? 0) - (a.missing_to_target_pct ?? 0));
                break;
            case 'ot_desc':
                list.sort((a, b) => (b.ot_to_target_pct ?? 0) - (a.ot_to_target_pct ?? 0));
                break;
            case 'name':
                list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
                break;
        }
        return list;
    }, [employees, sortBy, search]);

    const visible = sorted.slice(0, maxRows);

    return (
        <SectionCard
            title="Mesai Karne Haritası"
            icon={Flame}
            iconGradient="from-rose-500 to-orange-600"
            subtitle={`Kişi × 5 metrik · Renk = performans · ${visible.length}/${sorted.length} satır`}
            collapsible={false}
        >
            <div className="flex items-center gap-2 flex-wrap mb-3">
                <input
                    type="text"
                    placeholder="Ad/departman ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <Segmented
                    size="small"
                    value={sortBy}
                    onChange={setSortBy}
                    options={SORT_OPTIONS.map((o) => ({
                        value: o.value,
                        label: <span className="text-[10px]"><ArrowDownAZ size={10} className="inline" /> {o.label}</span>,
                    }))}
                />
            </div>

            {sorted.length === 0 ? (
                <Empty description="Eşleşen çalışan yok" />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[640px]">
                        <thead className="bg-slate-50/80">
                            <tr className="border-b border-slate-200">
                                <th className="py-2 px-2 text-left text-[10px] uppercase tracking-wider font-black text-slate-500 sticky left-0 bg-slate-50/80 z-10">Çalışan</th>
                                {COLS.map((c) => (
                                    <th key={c.key} className="py-2 px-2 text-center text-[10px] uppercase tracking-wider font-black text-slate-500">
                                        {c.label}
                                    </th>
                                ))}
                                <th className="py-2 px-2 text-right text-[10px] uppercase tracking-wider font-black text-slate-500">Saatler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((e) => (
                                <tr
                                    key={e.employee_id}
                                    onClick={() => onSelectPerson?.(e.employee_id)}
                                    className="border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-indigo-50/30 transition-colors"
                                >
                                    <td className="py-1.5 px-2 sticky left-0 bg-white">
                                        <div className="flex items-center gap-2">
                                            <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${gradientFor(e.employee_id)} text-white shadow-sm flex-shrink-0`}>
                                                <span className="text-[9px] font-black">{initials(e.name)}</span>
                                            </div>
                                            <div>
                                                <div className="font-bold text-[11px] text-slate-800 truncate max-w-[140px]">{e.name}</div>
                                                <div className="text-[9px] text-slate-400 truncate max-w-[140px]">{e.department || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {COLS.map((c) => {
                                        const v = e[c.key];
                                        const cls = colorClass(v, c.max, c.invert);
                                        return (
                                            <td key={c.key} className="py-1.5 px-1 text-center">
                                                <span className={`inline-block w-full px-2 py-1 rounded font-bold tabular-nums text-[10px] ${cls}`}>
                                                    {v == null ? '—' : `${Math.round(v)}${c.suffix}`}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="py-1.5 px-2 text-right text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
                                        N {fmtHrs(e.normal_hours)} · F {fmtHrs(e.ot_hours)} · E {fmtHrs(e.missing_hours)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sorted.length > maxRows && (
                        <div className="text-center pt-3">
                            <button
                                onClick={() => setMaxRows((n) => n + 30)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                            >
                                +30 daha göster ({sorted.length - maxRows} kalan)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    );
}
