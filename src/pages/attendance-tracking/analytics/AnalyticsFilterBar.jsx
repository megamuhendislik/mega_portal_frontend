import React, { useState } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar, Filter, RefreshCw, ChevronDown,
    GitCompare, Building2, UserX, ArrowRight, X,
} from 'lucide-react';
import { useAnalytics, COMPARE_MODES, getFiscalMonth } from './AnalyticsContext';
import { format } from 'date-fns';

const QUICK_RANGES = [
    { label: 'Bu Ay', getOffset: () => ({ single: 0 }) },
    { label: 'Önceki Ay', getOffset: () => ({ single: -1 }) },
    { label: 'Son 3 Ay', getOffset: () => ({ start: -2, end: 0, label: 'Son 3 Ay' }) },
    { label: 'Son 6 Ay', getOffset: () => ({ start: -5, end: 0, label: 'Son 6 Ay' }) },
];

export default function AnalyticsFilterBar() {
    const ctx = useAnalytics();
    const [showFilters, setShowFilters] = useState(false);
    const [showCompare, setShowCompare] = useState(ctx.compareMode !== 'none');

    const handleQuickRange = (qr) => {
        const off = qr.getOffset();
        if (off.single !== undefined) {
            ctx.navigateMonth(off.single);
        } else {
            ctx.navigateRange(off.start, off.end, off.label);
        }
    };

    const handlePrev = () => ctx.navigateMonth(ctx.monthOffset - 1);
    const handleNext = () => ctx.navigateMonth(ctx.monthOffset + 1);
    const handleToday = () => ctx.navigateMonth(0);

    const toggleCompare = () => {
        if (showCompare) {
            ctx.setCompareMode('none');
            setShowCompare(false);
        } else {
            ctx.setCompareMode('prev_month');
            setShowCompare(true);
        }
    };

    // Active quick range check
    const activeQuick = QUICK_RANGES.findIndex(qr => {
        const off = qr.getOffset();
        if (off.single !== undefined) {
            const fm = getFiscalMonth(off.single);
            return fm.startDate === ctx.startDate && fm.endDate === ctx.endDate;
        }
        return false;
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* ═══ Main Navigation Bar ═══ */}
            <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
                {/* Period Navigator */}
                <div className="flex items-center gap-2">
                    <button onClick={handlePrev}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronLeft size={16} />
                    </button>

                    <button onClick={handleToday}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-xl hover:shadow-sm transition-all group">
                        <Calendar size={14} className="text-indigo-500" />
                        <span className="text-sm font-black text-indigo-700">{ctx.periodLabel}</span>
                    </button>

                    <button onClick={handleNext}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronRight size={16} />
                    </button>

                    {/* Quick ranges */}
                    <div className="hidden md:flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg ml-1">
                        {QUICK_RANGES.map((qr, i) => (
                            <button key={i} onClick={() => handleQuickRange(qr)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${activeQuick === i ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {qr.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* Compare toggle */}
                    <button onClick={toggleCompare}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${showCompare ? 'bg-violet-50 text-violet-700 border-violet-200 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200/80 hover:text-slate-700'}`}>
                        <GitCompare size={12} />
                        Karşılaştır
                    </button>

                    {/* Min attendance filter */}
                    <label className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/80 rounded-lg border border-amber-200/60 cursor-pointer select-none">
                        <input type="checkbox" checked={ctx.minAttendanceEnabled}
                            onChange={e => ctx.setMinAttendanceEnabled(e.target.checked)}
                            className="w-3 h-3 rounded border-amber-300 text-amber-500 focus:ring-amber-200" />
                        <UserX size={11} className="text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-700">%{ctx.minAttendancePct} altı hariç</span>
                    </label>

                    {/* Filters */}
                    <button onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200/80 transition-colors">
                        <Filter size={11} /> Filtre
                        <ChevronDown size={10} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Refresh */}
                    <button onClick={ctx.refetch} disabled={ctx.loading}
                        className="p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50 border border-slate-200/80"
                        title="Yenile">
                        <RefreshCw size={13} className={ctx.loading ? 'animate-spin' : ''} />
                    </button>

                    {ctx.lastFetchedAt && <span className="text-[9px] text-slate-300 tabular-nums hidden md:inline">{format(ctx.lastFetchedAt, 'HH:mm')}</span>}
                </div>
            </div>

            {/* ═══ Compare Bar ═══ */}
            {showCompare && (
                <div className="px-4 py-3 border-t border-violet-100 bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Karşılaştır:</span>
                            <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-lg border border-violet-200/50">
                                {COMPARE_MODES.filter(m => m.key !== 'none').map(m => (
                                    <button key={m.key} onClick={() => ctx.setCompareMode(m.key)}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${ctx.compareMode === m.key ? 'bg-violet-100 text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Period labels */}
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold">{ctx.periodLabel}</span>
                            <ArrowRight size={12} className="text-violet-400" />
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-lg text-[10px] font-bold">
                                {ctx.compareLabel || 'Seçilmedi'}
                            </span>
                            {ctx.compareLoading && <div className="w-3 h-3 border border-violet-300 border-t-violet-600 rounded-full animate-spin" />}
                        </div>

                        {/* Custom date pickers */}
                        {ctx.compareMode === 'custom' && (
                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <input type="date" value={ctx.compareStartDate}
                                    onChange={e => { ctx.setCompareStartDate(e.target.value); ctx.setCompareEndDate(''); }}
                                    className="px-2 py-1 bg-white border border-violet-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-200" />
                                <span className="text-slate-400 text-xs">—</span>
                                <input type="date" value={ctx.compareEndDate}
                                    onChange={e => ctx.setCompareEndDate(e.target.value)}
                                    className="px-2 py-1 bg-white border border-violet-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-200" />
                            </div>
                        )}

                        <button onClick={toggleCompare} className="p-1 text-violet-400 hover:text-violet-600 transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ Expanded Filters ═══ */}
            {showFilters && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Calendar size={10} /> Başlangıç
                        </label>
                        <input type="date" value={ctx.startDate} onChange={e => ctx.setStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Calendar size={10} /> Bitiş
                        </label>
                        <input type="date" value={ctx.endDate} onChange={e => ctx.setEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Building2 size={10} /> Departman
                        </label>
                        <select value={ctx.departmentIds[0] || ''} onChange={e => ctx.setDepartmentIds(e.target.value ? [parseInt(e.target.value)] : [])}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                            <option value="">Tümü</option>
                            {ctx.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <UserX size={10} /> Min. Devam %
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} step={5} value={ctx.minAttendancePct}
                                onChange={e => ctx.setMinAttendancePct(parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500" />
                            <span className="text-sm font-bold text-slate-600 tabular-nums w-10 text-right">%{ctx.minAttendancePct}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
