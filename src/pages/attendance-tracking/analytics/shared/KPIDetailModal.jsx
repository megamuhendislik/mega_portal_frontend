import React, { useState, useMemo } from 'react';
import { Modal } from 'antd';
import { X, ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Building2, Users } from 'lucide-react';

/**
 * Generic KPI Detail Modal — herhangi bir KPI'ya tıklayınca açılır.
 *
 * Props:
 *   open, onClose
 *   title           — modal başlığı
 *   icon            — opsiyonel header ikonu (lucide)
 *   formula         — kısa formül metni (alt header)
 *   description     — açıklama paragraf(lar)ı (string veya React node)
 *   columns         — [{ key, label, type: 'number'|'percent'|'hours'|'text', sortable }]
 *   sortKey         — varsayılan sıralama key
 *   sortDir         — 'asc' | 'desc' (default 'desc')
 *   levelFn         — (row) => 'excellent'|'good'|'average'|'low' | null  (rozet için)
 *   levelKey        — opsiyonel: row üstündeki sayısal değer key (otomatik level için)
 *   data            — employee[] her birinde columns key'leri
 *   emptyMessage    — veri boşsa mesaj
 */

const LEVEL_CONFIG = {
    excellent: { label: 'Mükemmel', color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    good: { label: 'İyi', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    average: { label: 'Orta', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    low: { label: 'Düşük', color: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-200' },
};

function defaultLevel(pct) {
    if (pct == null) return null;
    if (pct >= 95) return 'excellent';
    if (pct >= 80) return 'good';
    if (pct >= 60) return 'average';
    return 'low';
}

function fmtCell(value, type) {
    if (value == null || value === '') return '—';
    if (type === 'percent') return `%${Math.round(Number(value))}`;
    if (type === 'hours') return `${Number(value).toFixed(2)}sa`;
    if (type === 'minutes') return `${Math.round(Number(value))}dk`;
    if (type === 'number') return String(value);
    return String(value);
}

export default function KPIDetailModal({
    open,
    onClose,
    title = 'Detay',
    icon: HeaderIcon = null,
    formula = '',
    description = '',
    columns = [],
    sortKey: defaultSort = '',
    sortDir: defaultDir = 'desc',
    levelFn = null,
    levelKey = null,
    data = [],
    emptyMessage = 'Veri yok.',
}) {
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState(defaultSort || (columns[0] && columns[0].key) || 'name');
    const [sortDir, setSortDir] = useState(defaultDir);
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'department'
    const [expandedDepts, setExpandedDepts] = useState(new Set());

    const computedLevel = (row) => {
        if (levelFn) return levelFn(row);
        if (levelKey) return defaultLevel(row[levelKey]);
        return null;
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((r) => {
            if (!q) return true;
            return (
                String(r.name || '').toLowerCase().includes(q) ||
                String(r.department || '').toLowerCase().includes(q)
            );
        });
    }, [data, search]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const av = a[sortBy];
            const bv = b[sortBy];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv), 'tr')
                : String(bv).localeCompare(String(av), 'tr');
        });
        return arr;
    }, [filtered, sortBy, sortDir]);

    const groupedByDept = useMemo(() => {
        if (viewMode !== 'department') return null;
        const map = new Map();
        for (const r of sorted) {
            const k = r.department || 'Bilinmiyor';
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(r);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'tr'));
    }, [sorted, viewMode]);

    const toggleSort = (key) => {
        if (sortBy === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(key);
            setSortDir('desc');
        }
    };

    const toggleDept = (k) => {
        setExpandedDepts((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    };

    const renderHeader = () => (
        <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
                <th className="text-left py-2 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-indigo-600">
                        Çalışan
                        {sortBy === 'name' ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-40" />}
                    </button>
                </th>
                {viewMode === 'all' && (
                    <th className="text-left py-2 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <button onClick={() => toggleSort('department')} className="flex items-center gap-1 hover:text-indigo-600">
                            Departman
                            {sortBy === 'department' ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-40" />}
                        </button>
                    </th>
                )}
                {columns.map((col) => (
                    <th key={col.key} className="text-right py-2 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {col.sortable !== false ? (
                            <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 ml-auto hover:text-indigo-600">
                                {col.label}
                                {sortBy === col.key ? (sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-40" />}
                            </button>
                        ) : (
                            col.label
                        )}
                    </th>
                ))}
                {(levelFn || levelKey) && (
                    <th className="text-center py-2 px-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Seviye</th>
                )}
            </tr>
        </thead>
    );

    const renderRow = (row, idx) => {
        const lvl = computedLevel(row);
        const lvlCfg = lvl ? LEVEL_CONFIG[lvl] : null;
        return (
            <tr key={`${row.employee_id || row.id || row.name}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                <td className="py-2 px-3 text-[12px] font-medium text-slate-800">{row.name || '—'}</td>
                {viewMode === 'all' && (
                    <td className="py-2 px-3 text-[11px] text-slate-500">{row.department || '—'}</td>
                )}
                {columns.map((col) => (
                    <td key={col.key} className={`py-2 px-3 text-[12px] tabular-nums text-right ${col.highlight ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
                        {col.render ? col.render(row[col.key], row) : fmtCell(row[col.key], col.type)}
                    </td>
                ))}
                {(levelFn || levelKey) && (
                    <td className="py-2 px-3 text-center">
                        {lvlCfg ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${lvlCfg.bg}`}>
                                {lvlCfg.label}
                            </span>
                        ) : (
                            <span className="text-slate-300 text-[10px]">—</span>
                        )}
                    </td>
                )}
            </tr>
        );
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width="92vw"
            style={{ maxWidth: 1200, top: 20 }}
            closeIcon={<X size={18} className="text-slate-400 hover:text-slate-600" />}
            destroyOnClose
            title={
                <div className="flex items-center gap-3 pb-2">
                    {HeaderIcon && (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg">
                            <HeaderIcon size={20} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-base font-black text-slate-800">{title}</h3>
                        {formula && <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formula}</p>}
                    </div>
                </div>
            }
        >
            {description && (
                <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
                    {description}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Çalışan veya departman ara…"
                        className="w-full pl-7 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                </div>
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={11} /> Tümü
                    </button>
                    <button
                        onClick={() => setViewMode('department')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${viewMode === 'department' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Building2 size={11} /> Departman
                    </button>
                </div>
                <div className="text-[11px] text-slate-500 font-medium tabular-nums">
                    {sorted.length} kayıt
                </div>
            </div>

            {/* Table */}
            {sorted.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">{emptyMessage}</div>
            ) : viewMode === 'all' ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                    <table className="w-full">
                        {renderHeader()}
                        <tbody>
                            {sorted.map((r, i) => renderRow(r, i))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                    {groupedByDept.map(([dept, rows]) => {
                        const exp = expandedDepts.has(dept);
                        return (
                            <div key={dept} className="border-b border-slate-100 last:border-b-0">
                                <button
                                    onClick={() => toggleDept(dept)}
                                    className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {exp ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                                        <Building2 size={12} className="text-slate-500" />
                                        <span className="text-[12px] font-bold text-slate-700">{dept}</span>
                                        <span className="text-[10px] text-slate-400 font-medium tabular-nums">({rows.length})</span>
                                    </div>
                                </button>
                                {exp && (
                                    <table className="w-full">
                                        {renderHeader()}
                                        <tbody>
                                            {rows.map((r, i) => renderRow(r, i))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
