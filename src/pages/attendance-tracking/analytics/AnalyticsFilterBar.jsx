import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar, Filter, RefreshCw, ChevronDown,
    GitCompare, Building2, UserX, ArrowRight, X, Briefcase, CalendarRange,
} from 'lucide-react';
import { Select } from 'antd';
import { useAnalytics, COMPARE_MODES, getFiscalMonth } from './AnalyticsContext';
import { format } from 'date-fns';
import MultiSelect from './shared/MultiSelect';

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

    const deptOptions = useMemo(
        () => (ctx.departments || []).map((d) => ({ value: d.id, label: d.name })),
        [ctx.departments]
    );
    const positionOptions = useMemo(
        () => (ctx.positions || []).map((p) => ({ value: p.id, label: p.title || p.name })),
        [ctx.positions]
    );

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

    const isYearly = ctx.viewMode === 'yearly';

    return (
        <div className="bg-white rounded-2xl border-2 border-indigo-200/60 shadow-md overflow-hidden">
            {/* ═══ Main Navigation Bar — Donem secici belirgin ═══ */}
            <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/40">
                {/* Period Navigator — sadece Aylık modda; Yıllık modda yıl seçici üst bar'da */}
                {!isYearly ? (
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col gap-0.5 pr-2 border-r border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dönem</span>
                            <span className="text-[10px] text-slate-400">Mali ay (26→25)</span>
                        </div>

                        <button onClick={handlePrev}
                            title="Önceki ay (← tuş)"
                            className="p-2 rounded-xl hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-200">
                            <ChevronLeft size={20} />
                        </button>

                        <button onClick={handleToday}
                            title="Bugüne git (T tuş)"
                            className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white border border-indigo-600 rounded-xl shadow-md hover:shadow-lg transition-all group min-w-[180px] justify-center">
                            <Calendar size={16} className="text-white/90" />
                            <span className="text-base font-black tracking-tight">{ctx.periodLabel}</span>
                        </button>

                        <button onClick={handleNext}
                            title="Sonraki ay (→ tuş)"
                            className="p-2 rounded-xl hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-200">
                            <ChevronRight size={20} />
                        </button>

                        {/* Quick ranges */}
                        <div className="hidden lg:flex items-center gap-1 bg-white border border-slate-200/80 p-1 rounded-xl ml-2 shadow-sm">
                            {QUICK_RANGES.map((qr, i) => (
                                <button key={i} onClick={() => handleQuickRange(qr)}
                                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeQuick === i ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                    {qr.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // Yıllık modda: Mali Yıl seçici + Tab detay info — TEK BAR
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Mali Yıl Seçici */}
                        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                            <CalendarRange size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.1em]">Mali Yıl</span>
                            <Select
                                size="middle"
                                value={ctx.selectedYear}
                                onChange={(y) => {
                                    ctx.setSelectedYear(y);
                                    ctx.switchToYearly(y);
                                }}
                                options={(ctx.availableYears || []).map((y) => ({
                                    value: y,
                                    label: (
                                        <span className="font-bold tabular-nums">
                                            {y}
                                            {y === ctx.yearsMeta?.recommended_year && (
                                                <span className="ml-1.5 text-[9px] font-normal text-emerald-600">●</span>
                                            )}
                                        </span>
                                    ),
                                }))}
                                loading={ctx.yearsLoading}
                                style={{ minWidth: 110 }}
                                suffixIcon={<Calendar size={12} />}
                                notFoundContent="Sistemde veri yok"
                            />
                            {ctx.availableYears?.length > 0 && (
                                <span className="text-[9px] text-slate-400">
                                    <span className="tabular-nums">{ctx.yearsMeta.min_year}–{ctx.yearsMeta.max_year}</span> mevcut
                                </span>
                            )}
                        </div>

                        {/* Yıl bilgisi rozetı */}
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-1 rounded-full">
                            {ctx.selectedYear} · 12 mali ay (26 Ara {ctx.selectedYear - 1} → 25 Ara {ctx.selectedYear})
                        </span>

                        {/* Tab detayları (current month) */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Calendar size={11} className="text-slate-400" />
                            <span>Detay penceresi:</span>
                            <span className="font-bold text-slate-700 px-1.5 py-0.5 bg-slate-100 rounded tabular-nums">
                                {ctx.startDate} → {ctx.endDate}
                            </span>
                        </div>
                    </div>
                )}

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
                        <span className="text-[10px] font-bold text-amber-700" title="Yapılan Normal Mesai / Yükümlülük">Yap.M. %{ctx.minAttendancePct} altı hariç</span>
                    </label>

                    {/* Filters — aktif sayim badge */}
                    {(() => {
                        const activeCount =
                            (ctx.departmentIds?.length || 0) +
                            (ctx.positionIds?.length || 0) +
                            (ctx.excludeDepartmentIds?.length || 0) +
                            (ctx.excludeEmployeeIds?.length || 0) +
                            (ctx.minAttendanceEnabled && ctx.minAttendancePct > 0 ? 1 : 0);
                        return (
                            <button onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${
                                    activeCount > 0
                                        ? 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
                                        : 'text-slate-500 hover:text-slate-700 bg-slate-50 border-slate-200/80'
                                }`}>
                                <Filter size={11} /> Filtre
                                {activeCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] tabular-nums leading-none">
                                        {activeCount}
                                    </span>
                                )}
                                <ChevronDown size={10} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                            </button>
                        );
                    })()}

                    {/* Tum filtreleri sifirla — sadece aktif filtre varsa goster */}
                    {((ctx.departmentIds?.length || 0) +
                      (ctx.positionIds?.length || 0) +
                      (ctx.excludeDepartmentIds?.length || 0) +
                      (ctx.excludeEmployeeIds?.length || 0) +
                      (ctx.minAttendanceEnabled ? 1 : 0)) > 0 && (
                        <button
                            onClick={() => {
                                ctx.setDepartmentIds([]);
                                ctx.setPositionIds([]);
                                ctx.setExcludeDepartmentIds([]);
                                ctx.setExcludeEmployeeIds([]);
                                ctx.setMinAttendanceEnabled(false);
                            }}
                            title="Tüm filtreleri sıfırla"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200/80 transition-colors"
                        >
                            <X size={11} /> Sıfırla
                        </button>
                    )}

                    {/* Refresh */}
                    <button onClick={ctx.refetch} disabled={ctx.loading}
                        className="p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50 border border-slate-200/80"
                        title="Yenile">
                        <RefreshCw size={13} className={ctx.loading ? 'animate-spin' : ''} />
                    </button>

                    {ctx.lastFetchedAt && <span className="text-[9px] text-slate-300 tabular-nums hidden md:inline">{format(ctx.lastFetchedAt, 'HH:mm')}</span>}
                </div>
            </div>

            {/* ═══ Aktif Filtre Chip Satiri — tek tek X ile kaldir ═══ */}
            {(() => {
                const chips = [];
                (ctx.departmentIds || []).forEach((id) => {
                    const d = ctx.departments?.find((x) => x.id === id);
                    if (d) chips.push({
                        key: `d${id}`, label: `Dept: ${d.name}`, color: 'indigo',
                        onRemove: () => ctx.setDepartmentIds(ctx.departmentIds.filter((x) => x !== id)),
                    });
                });
                (ctx.positionIds || []).forEach((id) => {
                    const p = ctx.positions?.find((x) => x.id === id);
                    if (p) chips.push({
                        key: `p${id}`, label: `Pozisyon: ${p.title || p.name}`, color: 'blue',
                        onRemove: () => ctx.setPositionIds(ctx.positionIds.filter((x) => x !== id)),
                    });
                });
                (ctx.excludeDepartmentIds || []).forEach((id) => {
                    const d = ctx.departments?.find((x) => x.id === id);
                    if (d) chips.push({
                        key: `xd${id}`, label: `✕ ${d.name}`, color: 'rose',
                        onRemove: () => ctx.setExcludeDepartmentIds(ctx.excludeDepartmentIds.filter((x) => x !== id)),
                    });
                });
                (ctx.excludeEmployeeIds || []).forEach((id) => {
                    const e = ctx.employees?.find((x) => x.id === id);
                    if (e) chips.push({
                        key: `xe${id}`, label: `✕ ${e.first_name} ${e.last_name}`, color: 'rose',
                        onRemove: () => ctx.setExcludeEmployeeIds(ctx.excludeEmployeeIds.filter((x) => x !== id)),
                    });
                });
                if (ctx.minAttendanceEnabled && ctx.minAttendancePct > 0) {
                    chips.push({
                        key: 'minatt', label: `Yap.M. < %${ctx.minAttendancePct} hariç`, color: 'amber',
                        onRemove: () => ctx.setMinAttendanceEnabled(false),
                    });
                }
                if (chips.length === 0) return null;
                const colorMap = {
                    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200',
                    blue: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
                    rose: 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200',
                    amber: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
                };
                return (
                    <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100 bg-slate-50/40 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktif:</span>
                        {chips.map((c) => (
                            <button
                                key={c.key}
                                onClick={c.onRemove}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all ${colorMap[c.color]}`}
                            >
                                {c.label}
                                <X size={10} />
                            </button>
                        ))}
                    </div>
                );
            })()}

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
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
                            <Building2 size={10} /> Departman(lar)
                        </label>
                        <MultiSelect
                            value={ctx.departmentIds}
                            onChange={(vals) => ctx.setDepartmentIds(vals.map((v) => typeof v === 'string' ? parseInt(v, 10) : v).filter((v) => !isNaN(v)))}
                            options={deptOptions}
                            placeholder="Tümü"
                            className="w-full"
                            size="small"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Briefcase size={10} /> Pozisyon(lar)
                        </label>
                        <MultiSelect
                            value={ctx.positionIds}
                            onChange={(vals) => ctx.setPositionIds(vals.map((v) => typeof v === 'string' ? parseInt(v, 10) : v).filter((v) => !isNaN(v)))}
                            options={positionOptions}
                            placeholder="Tümü"
                            className="w-full"
                            size="small"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <UserX size={10} /> Min. Yap. Mesai % (W/Y)
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

            {/* ═══ Haric Tut paneli — Filter expand altinda gorunur ═══ */}
            {showFilters && (
                <div className="px-4 py-3 border-t border-slate-100 bg-rose-50/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
                            <X size={10} /> Hariç Tutulacak Departmanlar
                        </label>
                        <MultiSelect
                            value={ctx.excludeDepartmentIds || []}
                            onChange={(vals) => ctx.setExcludeDepartmentIds(vals.map((v) => typeof v === 'string' ? parseInt(v, 10) : v).filter((v) => !isNaN(v)))}
                            options={deptOptions}
                            placeholder="Hariç tutulacak departmanlar"
                            className="w-full"
                            size="small"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
                            <X size={10} /> Hariç Tutulacak Çalışanlar
                        </label>
                        <MultiSelect
                            value={ctx.excludeEmployeeIds || []}
                            onChange={(vals) => ctx.setExcludeEmployeeIds(vals.map((v) => typeof v === 'string' ? parseInt(v, 10) : v).filter((v) => !isNaN(v)))}
                            options={(ctx.employees || []).map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                            placeholder="Hariç tutulacak kişiler"
                            className="w-full"
                            size="small"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
