import React, { useMemo, useState } from 'react';
import { Search, X, Users, Building2 } from 'lucide-react';

/**
 * PersonPicker — modern kişi seçici.
 *
 * Özellikler:
 *  - Arama (Türkçe karakter normalize)
 *  - Departman chip filtresi (otomatik departman listesi)
 *  - Avatar grid (gradient initials)
 *  - Seçili olan vurgulanır
 *
 * Props:
 *  - employees: [{ id, name|full_name, department_name, ... }]
 *  - selectedId: number | null
 *  - onChange: (id) => void
 *  - className: ek Tailwind utility'leri
 */

function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TR_NORM = (s) => String(s || '').toLocaleLowerCase('tr')
    .replace(/[şçöüğıİ]/g, c => ({ ş: 's', ç: 'c', ö: 'o', ü: 'u', ğ: 'g', ı: 'i', İ: 'i' })[c]);

// Pleasant gradient palette — pick by hash of id
const GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-blue-500 to-cyan-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-fuchsia-600',
    'from-sky-500 to-blue-600',
    'from-lime-500 to-emerald-600',
];

function gradientFor(id) {
    const n = typeof id === 'number' ? id : (String(id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    return GRADIENTS[Math.abs(n) % GRADIENTS.length];
}

export default function PersonPicker({ employees = [], selectedId, onChange, className = '' }) {
    const [search, setSearch] = useState('');
    const [selectedDept, setSelectedDept] = useState(null);

    // Departman listesi (otomatik)
    const departments = useMemo(() => {
        const map = new Map();
        employees.forEach((e) => {
            const d = e.department_name || e.department || '—';
            map.set(d, (map.get(d) || 0) + 1);
        });
        return Array.from(map.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [employees]);

    const showDeptFilter = departments.length > 1;

    const filtered = useMemo(() => {
        let list = employees;
        if (selectedDept) {
            list = list.filter((e) => (e.department_name || e.department || '—') === selectedDept);
        }
        if (search) {
            const q = TR_NORM(search);
            list = list.filter((e) => {
                const name = e.name || e.full_name || '';
                const dept = e.department_name || e.department || '';
                return TR_NORM(name).includes(q) || TR_NORM(dept).includes(q);
            });
        }
        return list;
    }, [employees, search, selectedDept]);

    return (
        <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 via-white to-white">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white shadow-sm">
                    <Users size={16} />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-800">Çalışan Seç</h3>
                    <p className="text-[11px] text-slate-400">
                        {filtered.length} / {employees.length} kişi
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-slate-100">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Çalışan ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 text-slate-400"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Department chips */}
            {showDeptFilter && (
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Building2 size={12} className="text-slate-400" />
                        <button
                            onClick={() => setSelectedDept(null)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedDept === null
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                        >
                            Tümü
                            <span className={`ml-1.5 text-[9px] tabular-nums ${selectedDept === null ? 'opacity-80' : 'opacity-60'}`}>
                                ({employees.length})
                            </span>
                        </button>
                        {departments.map((d) => (
                            <button
                                key={d.name}
                                onClick={() => setSelectedDept(selectedDept === d.name ? null : d.name)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedDept === d.name
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                            >
                                {d.name}
                                <span className={`ml-1.5 text-[9px] tabular-nums ${selectedDept === d.name ? 'opacity-80' : 'opacity-60'}`}>
                                    ({d.count})
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Avatar grid */}
            <div className="p-4 max-h-96 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">
                        <Users size={24} className="mx-auto mb-2 opacity-40" />
                        Eşleşen çalışan bulunamadı
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {filtered.map((e) => {
                            const id = e.id;
                            const name = e.name || e.full_name || '—';
                            const dept = e.department_name || e.department || '';
                            const isSelected = selectedId === id;
                            const grad = gradientFor(id);
                            return (
                                <button
                                    key={id}
                                    onClick={() => onChange?.(id)}
                                    className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${isSelected
                                        ? 'border-indigo-500 bg-indigo-50/60 shadow-md ring-2 ring-indigo-200'
                                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm'
                                        }`}
                                >
                                    {isSelected && (
                                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-white text-white text-[9px] font-black flex items-center justify-center shadow">
                                            ✓
                                        </span>
                                    )}
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white shadow-md group-hover:scale-105 transition-transform`}>
                                        <span className="text-sm font-black tracking-tight">{initials(name)}</span>
                                    </div>
                                    <div className="min-w-0 w-full">
                                        <p className={`text-[11px] font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                                            {name}
                                        </p>
                                        {dept && (
                                            <p className="text-[9px] text-slate-400 truncate font-medium">
                                                {dept}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
