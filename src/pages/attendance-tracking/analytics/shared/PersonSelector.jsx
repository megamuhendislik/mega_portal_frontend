import React, { useState, useMemo } from 'react';
import { Search, X, UserPlus } from 'lucide-react';

/**
 * Multi-select person picker with search.
 * @param {{ employees: Array, selected: number[], onChange: (ids: number[]) => void, max?: number, label?: string }} props
 */
export default function PersonSelector({ employees = [], selected = [], onChange, max = 4, label = 'Kişi seçin' }) {
    const [search, setSearch] = useState('');

    const trNorm = (s) => (s || '').toLocaleLowerCase('tr').replace(/[şçöüğı]/g, c => ({ ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', ı: 'i' })[c]);

    const filtered = useMemo(() => {
        if (!search) return employees.slice(0, 20);
        const q = trNorm(search);
        return employees.filter(e => trNorm(e.name || e.full_name || '').includes(q)).slice(0, 20);
    }, [employees, search]);

    const toggle = (id) => {
        if (selected.includes(id)) {
            onChange(selected.filter(x => x !== id));
        } else if (selected.length < max) {
            onChange([...selected, id]);
        }
    };

    const selectedEmployees = employees.filter(e => selected.includes(e.id));

    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label} (max {max})</label>

            {/* Selected chips */}
            {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedEmployees.map(e => (
                        <span key={e.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                            {(e.name || e.full_name || '').split(' ')[0]}
                            <button onClick={() => toggle(e.id)} className="hover:text-red-500 transition-colors">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                    type="text"
                    placeholder="İsim ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                />
            </div>

            {/* Dropdown list */}
            {search && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-50">
                    {filtered.map(e => {
                        const isSelected = selected.includes(e.id);
                        return (
                            <button
                                key={e.id}
                                onClick={() => toggle(e.id)}
                                disabled={!isSelected && selected.length >= max}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700'} disabled:opacity-40`}
                            >
                                <div>
                                    <span className="font-medium">{e.name || e.full_name}</span>
                                    {e.department_name && <span className="text-slate-400 text-xs ml-2">{e.department_name}</span>}
                                </div>
                                {!isSelected && <UserPlus size={14} className="text-slate-300" />}
                            </button>
                        );
                    })}
                    {filtered.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">Sonuç bulunamadı</div>}
                </div>
            )}
        </div>
    );
}
