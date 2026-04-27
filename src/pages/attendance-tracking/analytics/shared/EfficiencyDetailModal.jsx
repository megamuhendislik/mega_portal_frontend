import React, { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Users, Building2, Search, ArrowUpDown } from 'lucide-react';

const LEVEL_CONFIG = {
    excellent: { label: 'Mükemmel', color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    good: { label: 'İyi', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    average: { label: 'Orta', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    low: { label: 'Düşük', color: '#ef4444', bg: 'bg-red-50 text-red-700 border-red-200' },
};

function getLevel(pct) {
    if (pct >= 95) return 'excellent';
    if (pct >= 80) return 'good';
    if (pct >= 60) return 'average';
    return 'low';
}

/**
 * Full-screen modal showing employee efficiency breakdown with department grouping.
 */
export default function EfficiencyDetailModal({ open, onClose, employees = [], departments = [] }) {
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'department'
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('efficiency');
    const [sortDir, setSortDir] = useState('desc');
    const [expandedDepts, setExpandedDepts] = useState(new Set());

    // Parse employees with their efficiency
    const parsed = useMemo(() => {
        return employees.map(e => {
            const workedTotal = e.total_worked_hours ?? e.worked_hours ?? 0;
            const otHours = e.overtime_hours ?? e.total_overtime_hours ?? e.ot_hours ?? 0;
            const normalHours = e.normal_hours ?? Math.max(0, workedTotal - otHours);
            const proratedTarget = e.prorated_target_hours ?? e.target_hours ?? 0;
            const eff = e.efficiency_pct ?? e.avg_efficiency_pct ?? 0;
            const pureEff = e.pure_efficiency_pct ?? eff;
            const combinedEff = e.combined_efficiency_pct ?? eff;
            return {
                id: e.id || e.employee_id,
                name: e.name || e.full_name || `${e.first_name || ''} ${e.last_name || ''}`.trim(),
                department: e.department_name || e.department || 'Bilinmiyor',
                departmentId: e.department_id,
                efficiency: eff,
                pureEfficiency: pureEff,
                combinedEfficiency: combinedEff,
                workedHours: workedTotal,
                normalHours,
                targetHours: e.target_hours ?? 0,
                proratedTarget,
                overtimeHours: otHours,
                missingHours: e.missing_hours ?? e.total_missing_hours ?? 0,
                attendanceRate: e.attendance_rate_pct ?? 0,
                level: getLevel(eff),
            };
        });
    }, [employees]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!search.trim()) return parsed;
        const q = search.toLowerCase();
        return parsed.filter(e => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
    }, [parsed, search]);

    // Sort
    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const dir = sortDir === 'desc' ? -1 : 1;
            if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
            if (sortBy === 'department') return dir * a.department.localeCompare(b.department);
            return dir * ((a[sortBy] || 0) - (b[sortBy] || 0));
        });
    }, [filtered, sortBy, sortDir]);

    // Group by department
    const grouped = useMemo(() => {
        const map = {};
        sorted.forEach(e => {
            if (!map[e.department]) map[e.department] = { name: e.department, employees: [], avgEff: 0 };
            map[e.department].employees.push(e);
        });
        Object.values(map).forEach(g => {
            g.avgEff = g.employees.length > 0 ? Math.round(g.employees.reduce((s, e) => s + e.efficiency, 0) / g.employees.length) : 0;
            g.level = getLevel(g.avgEff);
        });
        return Object.values(map).sort((a, b) => b.avgEff - a.avgEff);
    }, [sorted]);

    const toggleDept = (name) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const expandAll = () => setExpandedDepts(new Set(grouped.map(g => g.name)));
    const collapseAll = () => setExpandedDepts(new Set());

    const toggleSort = (key) => {
        if (sortBy === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortBy(key); setSortDir('desc'); }
    };

    // Summary stats
    const totalExcellent = parsed.filter(e => e.level === 'excellent').length;
    const totalGood = parsed.filter(e => e.level === 'good').length;
    const totalAverage = parsed.filter(e => e.level === 'average').length;
    const totalLow = parsed.filter(e => e.level === 'low').length;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">Verimlilik Dağılımı — Detay</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{parsed.length} çalışan · {grouped.length} departman</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {/* Summary strip */}
                <div className="px-6 py-3 bg-slate-50/80 flex items-center gap-3 flex-wrap border-b border-slate-100">
                    {[
                        { ...LEVEL_CONFIG.excellent, count: totalExcellent },
                        { ...LEVEL_CONFIG.good, count: totalGood },
                        { ...LEVEL_CONFIG.average, count: totalAverage },
                        { ...LEVEL_CONFIG.low, count: totalLow },
                    ].map((item, i) => (
                        <div key={i} className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${item.bg}`}>
                            {item.label}: <span className="font-black">{item.count}</span>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
                    {/* View mode */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                        <button onClick={() => setViewMode('all')}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'all' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
                            <Users size={12} /> Toplu Liste
                        </button>
                        <button onClick={() => { setViewMode('department'); expandAll(); }}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'department' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
                            <Building2 size={12} /> Departman Bazlı
                        </button>
                    </div>

                    {viewMode === 'department' && (
                        <div className="flex items-center gap-1">
                            <button onClick={expandAll} className="text-[10px] font-bold text-indigo-600 hover:underline">Tümünü Aç</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={collapseAll} className="text-[10px] font-bold text-indigo-600 hover:underline">Tümünü Kapat</button>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative ml-auto">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                </div>

                {/* Formula açıklaması */}
                <div className="mx-6 mt-3 mb-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-[10px] text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700">Formül:</span> Salt verimlilik = <span className="font-mono">net mesai / şu ana kadar olabilecek hedef</span> · OT verimliliği = <span className="font-mono">(net + OT) / şu ana kadar olabilecek hedef</span>. Devam eden dönemde hedef pro-rata; bitmiş dönemde tam target.
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto px-6 pb-6">
                    {viewMode === 'all' ? (
                        /* ═══ Flat list ═══ */
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="border-b-2 border-slate-100">
                                    {[
                                        { key: 'name', label: 'Çalışan' },
                                        { key: 'department', label: 'Departman' },
                                        { key: 'pureEfficiency', label: 'Salt Verim.' },
                                        { key: 'combinedEfficiency', label: 'OT Dahil' },
                                        { key: 'normalHours', label: 'Net Mesai' },
                                        { key: 'overtimeHours', label: 'OT (h)' },
                                        { key: 'proratedTarget', label: 'Hedef (Şimdiye)' },
                                        { key: 'targetHours', label: 'Tam Hedef' },
                                        { key: 'missingHours', label: 'Kayıp' },
                                    ].map(col => (
                                        <th key={col.key}
                                            onClick={() => toggleSort(col.key)}
                                            className="text-left py-3 px-3 text-[10px] text-slate-400 uppercase font-bold tracking-wider cursor-pointer hover:text-slate-600 select-none">
                                            <span className="flex items-center gap-1">
                                                {col.label}
                                                {sortBy === col.key && <ArrowUpDown size={10} className="text-indigo-500" />}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((e, i) => {
                                    const cfg = LEVEL_CONFIG[e.level];
                                    const pureColor = e.pureEfficiency >= 95 ? '#10b981' : e.pureEfficiency >= 80 ? '#6366f1' : e.pureEfficiency >= 60 ? '#f59e0b' : '#ef4444';
                                    const combinedColor = e.combinedEfficiency > e.pureEfficiency + 5 ? '#f97316' : pureColor;
                                    return (
                                        <tr key={e.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2.5 px-3 font-bold text-slate-700">{e.name}</td>
                                            <td className="py-2.5 px-3 text-slate-500 text-xs">{e.department}</td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all"
                                                            style={{ width: `${Math.min(e.pureEfficiency, 100)}%`, backgroundColor: pureColor }} />
                                                    </div>
                                                    <span className="text-xs font-black tabular-nums" style={{ color: pureColor }}>{e.pureEfficiency}%</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all"
                                                            style={{ width: `${Math.min(e.combinedEfficiency, 130)}%`, backgroundColor: combinedColor }} />
                                                    </div>
                                                    <span className="text-xs font-black tabular-nums" style={{ color: combinedColor }}>{e.combinedEfficiency}%</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 tabular-nums font-bold text-slate-600">{Math.round(e.normalHours)}</td>
                                            <td className="py-2.5 px-3 tabular-nums text-amber-600 font-bold">{Math.round(e.overtimeHours)}</td>
                                            <td className="py-2.5 px-3 tabular-nums text-indigo-600 font-bold">{Math.round(e.proratedTarget)}</td>
                                            <td className="py-2.5 px-3 tabular-nums text-slate-400">{Math.round(e.targetHours)}</td>
                                            <td className="py-2.5 px-3 tabular-nums text-red-500 font-bold">{Math.round(e.missingHours)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        /* ═══ Department grouped ═══ */
                        <div className="space-y-3">
                            {grouped.map(group => {
                                const isOpen = expandedDepts.has(group.name);
                                const cfg = LEVEL_CONFIG[group.level];
                                return (
                                    <div key={group.name} className="border border-slate-200/80 rounded-xl overflow-hidden">
                                        {/* Department header */}
                                        <button onClick={() => toggleDept(group.name)}
                                            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/50 hover:bg-slate-100/50 transition-colors text-left">
                                            {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                            <Building2 size={14} className="text-slate-400" />
                                            <span className="font-bold text-slate-700 text-sm flex-1">{group.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{group.employees.length} kişi</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg}`}>
                                                Ort. {group.avgEff}%
                                            </span>
                                        </button>

                                        {/* Employees */}
                                        {isOpen && (
                                            <div className="border-t border-slate-100">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-50">
                                                            <th className="text-left py-2 px-4 text-[9px] text-slate-400 uppercase font-bold">Çalışan</th>
                                                            <th className="text-left py-2 px-4 text-[9px] text-slate-400 uppercase font-bold w-32">Salt Verim.</th>
                                                            <th className="text-left py-2 px-4 text-[9px] text-slate-400 uppercase font-bold w-32">OT Dahil</th>
                                                            <th className="text-center py-2 px-4 text-[9px] text-slate-400 uppercase font-bold">Net</th>
                                                            <th className="text-center py-2 px-4 text-[9px] text-slate-400 uppercase font-bold">OT</th>
                                                            <th className="text-center py-2 px-4 text-[9px] text-slate-400 uppercase font-bold">Hedef (Şimdiye)</th>
                                                            <th className="text-center py-2 px-4 text-[9px] text-slate-400 uppercase font-bold">Kayıp</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.employees.map((e, j) => {
                                                            const pureColor = e.pureEfficiency >= 95 ? '#10b981' : e.pureEfficiency >= 80 ? '#6366f1' : e.pureEfficiency >= 60 ? '#f59e0b' : '#ef4444';
                                                            const combinedColor = e.combinedEfficiency > e.pureEfficiency + 5 ? '#f97316' : pureColor;
                                                            return (
                                                                <tr key={e.id || j} className="border-b border-slate-50/50 hover:bg-slate-50/30 transition-colors">
                                                                    <td className="py-2 px-4 font-medium text-slate-700">{e.name}</td>
                                                                    <td className="py-2 px-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div className="h-full rounded-full transition-all"
                                                                                    style={{ width: `${Math.min(e.pureEfficiency, 100)}%`, backgroundColor: pureColor }} />
                                                                            </div>
                                                                            <span className="text-xs font-black tabular-nums w-10 text-right" style={{ color: pureColor }}>{e.pureEfficiency}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2 px-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                                <div className="h-full rounded-full transition-all"
                                                                                    style={{ width: `${Math.min(e.combinedEfficiency, 130)}%`, backgroundColor: combinedColor }} />
                                                                            </div>
                                                                            <span className="text-xs font-black tabular-nums w-10 text-right" style={{ color: combinedColor }}>{e.combinedEfficiency}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2 px-4 text-center tabular-nums font-bold text-slate-600">{Math.round(e.normalHours)}h</td>
                                                                    <td className="py-2 px-4 text-center tabular-nums text-amber-600 font-bold">{Math.round(e.overtimeHours)}h</td>
                                                                    <td className="py-2 px-4 text-center tabular-nums text-indigo-600 font-bold">{Math.round(e.proratedTarget)}h</td>
                                                                    <td className="py-2 px-4 text-center tabular-nums text-red-500 font-bold">{Math.round(e.missingHours)}h</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {sorted.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <Users size={32} className="mx-auto mb-3 text-slate-200" />
                            <p className="font-bold">Sonuç bulunamadı</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
