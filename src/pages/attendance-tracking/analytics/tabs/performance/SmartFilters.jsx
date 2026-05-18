import React from 'react';
import { Filter, X } from 'lucide-react';
import { PRESETS } from './helpers';

/**
 * 5 metrik icin range slider yerine basit "min %" filter chipler
 * + preset chipler (Yuksek FM, Eksigi Yuksek, Saglikli, Tam Doldurmayan).
 */
export default function SmartFilters({
    activePresets, onPresetToggle,
    search, onSearchChange,
    departments, selectedDept, onDeptChange,
    onReset,
    employeeCount, totalCount,
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Filter size={13} className="text-slate-500" />
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.15em]">Akıllı Filtreler</h4>
                <span className="ml-auto text-[10px] text-slate-500 font-bold">
                    {employeeCount} / {totalCount} kişi
                </span>
                {(activePresets.length > 0 || search || selectedDept) && (
                    <button
                        onClick={onReset}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 flex items-center gap-1"
                    >
                        <X size={10} /> Sıfırla
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <input
                    type="text"
                    placeholder="Kişi/departman ara..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />

                {/* Preset chip'ler — Faz 3 fix: tooltip eklendi (description) */}
                <div className="flex items-center gap-1 flex-wrap">
                    {Object.entries(PRESETS).map(([k, p]) => {
                        const active = activePresets.includes(k);
                        return (
                            <button
                                key={k}
                                onClick={() => onPresetToggle(k)}
                                title={p.description || p.label}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                    active
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>

                {/* Departman chip'leri */}
                {departments && departments.length > 1 && (
                    <div className="flex items-center gap-1 flex-wrap ml-auto">
                        <button
                            onClick={() => onDeptChange(null)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                selectedDept === null
                                    ? 'bg-slate-700 border-slate-700 text-white'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            Tüm Dept
                        </button>
                        {departments.slice(0, 4).map((d) => (
                            <button
                                key={d.name}
                                onClick={() => onDeptChange(selectedDept === d.name ? null : d.name)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                    selectedDept === d.name
                                        ? 'bg-slate-700 border-slate-700 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                {d.name} <span className="opacity-60">({d.count})</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
