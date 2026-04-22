import React, { useState } from 'react';
import { Filter, Calendar, Building2, Briefcase, UserX, RefreshCw, ChevronDown } from 'lucide-react';
import { useAnalytics } from './AnalyticsContext';
import { format } from 'date-fns';

const QUICK_RANGES = [
    { label: 'Bu Ay', getValue: () => getFiscalMonth(0) },
    { label: 'Önceki Ay', getValue: () => getFiscalMonth(-1) },
    { label: 'Son 3 Ay', getValue: () => getFiscalMonth(-2, 0) },
    { label: 'Son 6 Ay', getValue: () => getFiscalMonth(-5, 0) },
];

function getFiscalMonth(offsetStart, offsetEnd) {
    const now = new Date();
    const d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    const currentFiscalMonth = d >= 26 ? m : m - 1;

    const startM = currentFiscalMonth + (offsetStart ?? 0);
    const endM = currentFiscalMonth + (offsetEnd ?? offsetStart ?? 0);

    const toDate = (monthOffset, day) => {
        const dt = new Date(y, monthOffset, day);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    return {
        startDate: toDate(startM, 26),
        endDate: toDate(endM + 1, 25),
    };
}

export default function AnalyticsFilterBar() {
    const ctx = useAnalytics();
    const [expanded, setExpanded] = useState(false);

    const applyQuickRange = (qr) => {
        const { startDate, endDate } = qr.getValue();
        ctx.setStartDate(startDate);
        ctx.setEndDate(endDate);
    };

    // Determine active quick range
    const activeRange = QUICK_RANGES.findIndex(qr => {
        const { startDate, endDate } = qr.getValue();
        return startDate === ctx.startDate && endDate === ctx.endDate;
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Compact bar */}
            <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
                {/* Quick ranges */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
                    {QUICK_RANGES.map((qr, i) => (
                        <button
                            key={i}
                            onClick={() => applyQuickRange(qr)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeRange === i ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {qr.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Min attendance filter */}
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200/60 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={ctx.minAttendanceEnabled}
                            onChange={e => ctx.setMinAttendanceEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-amber-300 text-amber-500 focus:ring-amber-200"
                        />
                        <UserX size={13} className="text-amber-600" />
                        <span className="text-[11px] font-bold text-amber-700">%{ctx.minAttendancePct} altı hariç</span>
                    </label>

                    {/* Expand filters */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 rounded-lg border border-slate-200/80 transition-colors"
                    >
                        <Filter size={13} />
                        Filtreler
                        <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={ctx.refetch}
                        disabled={ctx.loading}
                        className="p-2 bg-slate-50 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50 border border-slate-200/80"
                        title="Yenile"
                    >
                        <RefreshCw size={14} className={ctx.loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Last update */}
                    {ctx.lastFetchedAt && (
                        <span className="text-[10px] text-slate-400 tabular-nums">
                            {format(ctx.lastFetchedAt, 'HH:mm:ss')}
                        </span>
                    )}
                </div>
            </div>

            {/* Expanded filters */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Date range */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Calendar size={11} /> Başlangıç
                        </label>
                        <input
                            type="date"
                            value={ctx.startDate}
                            onChange={e => ctx.setStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Calendar size={11} /> Bitiş
                        </label>
                        <input
                            type="date"
                            value={ctx.endDate}
                            onChange={e => ctx.setEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>

                    {/* Department */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Building2 size={11} /> Departman
                        </label>
                        <select
                            value={ctx.departmentIds[0] || ''}
                            onChange={e => ctx.setDepartmentIds(e.target.value ? [parseInt(e.target.value)] : [])}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            <option value="">Tümü</option>
                            {ctx.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* Min attendance */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <UserX size={11} /> Min. Devam %
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min={0} max={100} step={5}
                                value={ctx.minAttendancePct}
                                onChange={e => ctx.setMinAttendancePct(parseInt(e.target.value))}
                                className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-500"
                            />
                            <span className="text-sm font-bold text-slate-600 tabular-nums w-10 text-right">%{ctx.minAttendancePct}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
