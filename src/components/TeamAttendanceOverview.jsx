import React, { useMemo, useState, useEffect } from 'react';
import { User, Users, ChevronRight, ChevronDown, Calendar, Maximize2, Minimize2, ArrowUpRight, ArrowDownRight, LayoutList, LayoutGrid, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

const StatusBadge = ({ status, isOnLeave, leaveStatus }) => {
    if (isOnLeave) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                <Calendar size={10} className="text-amber-500" />
                {leaveStatus || 'İZİNDE'}
            </span>
        );
    }
    if (status === 'IN') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ofiste
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            Dışarıda
        </span>
    );
};

const StackedProgressBar = ({ completed, missing, remaining, target }) => {
    // Convert all to raw numbers
    const c = parseFloat(completed || 0);
    const m = parseFloat(missing || 0);
    const r = parseFloat(remaining || 0);
    const t = parseFloat(target || 1); // Avoid div by zero

    // Calculate Percentages
    // Note: If C + M + R > T (due to surplus), it might overflow.
    // We should normalize against MAX(Total, Target) for the bar scale.
    const totalSum = c + m + r;
    const scaleBase = Math.max(totalSum, t);

    const pC = (c / scaleBase) * 100;
    const pM = (m / scaleBase) * 100;
    const pR = (r / scaleBase) * 100;

    return (
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex mb-1 border border-slate-200">
            {/* Completed */}
            <div style={{ width: `${pC}%` }} className="h-full bg-emerald-500" title={`Tamamlanan: ${c} sa`} />

            {/* Missing */}
            <div style={{ width: `${pM}%` }} className="h-full bg-red-400" title={`Eksik: ${m} sa`} />

            {/* Remaining */}
            <div style={{ width: `${pR}%` }} className="h-full bg-slate-300" title={`Kalan: ${r} sa`} />
        </div>
    );
};

const GroupAverageRow = ({ children, depth = 1 }) => {
    if (!children || children.length === 0) return null;
    const count = children.length;

    const avgTarget = children.reduce((a, c) => a + parseFloat(c.monthTarget || 0), 0) / count;
    const avgCompleted = children.reduce((a, c) => a + parseFloat(c.summaryCompleted || 0), 0) / count;
    const avgMissing = children.reduce((a, c) => a + parseFloat(c.summaryMissing || 0), 0) / count;
    const avgRemaining = children.reduce((a, c) => a + parseFloat(c.summaryRemaining || 0), 0) / count;
    const avgBalance = children.reduce((a, c) => a + parseFloat(c.summaryNetBalance || 0), 0) / count;
    const avgTotalWork = children.reduce((a, c) => a + parseFloat(c.summaryTotalWork || 0), 0) / count;
    const avgTodayMin = Math.round(children.reduce((a, c) => a + (c.totalTodayMinutes || 0), 0) / count);

    // Günlük ortalama eksik: aylık ortalama eksik / ayda çalışılan gün
    // Yaklaşık: aylık hedef / 22 iş günü = günlük hedef, missing / geçen iş günü sayısı
    const today = new Date();
    const dayOfMonth = today.getDate();
    // Basit yaklaşım: 26-25 mali dönem, geçen iş günü ≈ (gün - hafta sonu sayısı)
    const elapsedWorkDays = Math.max(1, Math.round(dayOfMonth * 5 / 7));
    const dailyAvgMissing = avgMissing / elapsedWorkDays;

    const isPositive = avgBalance >= 0;

    return (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-200 border-t border-dashed">
            <div className="grid grid-cols-12 gap-4 items-center p-3">
                {/* Col 1: Label */}
                <div className="col-span-4 flex items-center gap-3" style={{ paddingLeft: `${depth * 32}px` }}>
                    <div className="w-6 shrink-0" />
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-blue-700 text-xs leading-tight">
                            Ekip Ortalaması ({count} kişi)
                        </h4>
                        {dailyAvgMissing > 0.01 && (
                            <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                                <TrendingDown size={9} />
                                Günlük ort. eksik: {dailyAvgMissing.toFixed(1)} sa
                            </p>
                        )}
                    </div>
                </div>

                {/* Col 2: Avg Today */}
                <div className="col-span-2 flex flex-col justify-center">
                    <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Bugün Ort.</span>
                    <div className="flex items-baseline gap-1 text-xs">
                        <span className="font-bold text-slate-700">{Math.floor(avgTodayMin / 60)}</span>
                        <span className="text-slate-500">sa</span>
                        <span className="font-bold text-slate-700">{avgTodayMin % 60}</span>
                        <span className="text-slate-500">dk</span>
                    </div>
                </div>

                {/* Col 3: Avg Progress Bar */}
                <div className="col-span-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 px-1">
                        <span>Ort. Hedef: <b className="text-slate-700">{avgTarget.toFixed(0)}</b> sa</span>
                        {avgMissing > 0.01 && (
                            <span>Ort. Eksik: <b className="text-red-500">{avgMissing.toFixed(1)}</b> sa</span>
                        )}
                    </div>
                    <StackedProgressBar
                        completed={avgCompleted.toFixed(1)}
                        missing={avgMissing.toFixed(1)}
                        remaining={avgRemaining.toFixed(1)}
                        target={avgTarget.toFixed(1)}
                    />
                </div>

                {/* Col 4: Avg Net Balance */}
                <div className="col-span-1 text-right">
                    <div className={clsx("font-bold text-base leading-none mb-1", isPositive ? "text-emerald-600" : "text-red-500")}>
                        {isPositive ? '+' : ''}{avgBalance.toFixed(1)}
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">ort.</span>
                </div>

                {/* Col 5: Avg Total Work */}
                <div className="col-span-2 text-right pr-2">
                    <div className="font-bold text-slate-800 text-base leading-none mb-1">
                        {avgTotalWork.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-blue-500 uppercase tracking-wide font-medium">ort. saat</div>
                </div>
            </div>
        </div>
    );
};

const HierarchicalRow = ({ node, onMemberClick, depth = 0, expandedIds, toggleExpand }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    // Net Balance Logic
    const balance = parseFloat(node.summaryNetBalance || 0);
    const isPositive = balance >= 0;

    // Overtime Logic
    const otMinutes = parseInt(node.monthApprovedDTO || 0);
    const hasOt = otMinutes > 0;

    return (
        <>
            {/* Main Row */}
            <div
                onClick={() => onMemberClick(node.id)}
                className="group relative bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            >
                {/* Visual Depth Connector (Vertical Line for Tree) */}
                {depth > 0 && (
                    <div
                        className="absolute top-0 bottom-0 border-l border-slate-300 pointer-events-none"
                        style={{ left: `${(depth * 32) - 16}px` }}
                    />
                )}
                {/* L-Shape Connector for current node */}
                {depth > 0 && (
                    <div
                        className="absolute top-1/2 -mt-px w-4 border-t border-slate-300 pointer-events-none"
                        style={{ left: `${(depth * 32) - 16}px` }}
                    />
                )}

                <div className="grid grid-cols-12 gap-4 items-center p-3">

                    {/* Column 1: Employee Info (Dynamic Padding for Depth) */}
                    <div className="col-span-4 flex items-center gap-3" style={{ paddingLeft: `${depth * 32}px` }}>

                        {/* Expand Toggle Button */}
                        <div className="w-6 shrink-0 flex justify-center">
                            {hasChildren ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(node.id);
                                    }}
                                    className="p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : <div className="w-4" />}
                        </div>

                        {/* Avatar */}
                        <div className={clsx(
                            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0",
                            node.isOnLeave ? "bg-amber-100 text-amber-600" :
                                node.status === 'IN' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                        )}>
                            {node.avatar || <User size={16} />}
                        </div>

                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">
                                {node.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">{node.department || '-'}</p>
                        </div>
                    </div>

                    {/* Column 2: Status & Today */}
                    <div className="col-span-2 flex flex-col justify-center">
                        <div className="mb-1">
                            <StatusBadge status={node.status} isOnLeave={node.isOnLeave} leaveStatus={node.leaveStatus} />
                        </div>
                        <div className="flex items-baseline gap-1 text-xs">
                            <span className="font-bold text-slate-700">{Math.floor(node.totalTodayMinutes / 60)}</span>
                            <span className="text-slate-500">sa</span>
                            <span className="font-bold text-slate-700">{node.totalTodayMinutes % 60}</span>
                            <span className="text-slate-500">dk</span>
                        </div>
                    </div>

                    {/* Column 3: Monthly Progress Bar */}
                    <div className="col-span-3">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1 px-1">
                            <span>Hedef: <b className="text-slate-700">{parseFloat(node.monthTarget || 0).toFixed(0)}</b> sa</span>
                            {parseFloat(node.summaryRemaining || 0) > 0 && (
                                <span>Kalan: <b className="text-amber-600">{parseFloat(node.summaryRemaining || 0).toFixed(1)}</b> sa</span>
                            )}
                        </div>
                        <StackedProgressBar
                            completed={node.summaryCompleted}
                            missing={node.summaryMissing}
                            remaining={node.summaryRemaining}
                            target={node.monthTarget}
                        />
                    </div>

                    {/* Column 4: Net Balance */}
                    <div className="col-span-1 text-right">
                        <div className={clsx("font-bold text-base leading-none mb-1", isPositive ? "text-emerald-600" : "text-red-500")}>
                            {isPositive ? '+' : ''}{balance.toFixed(1)}
                        </div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">saat</span>
                    </div>

                    {/* Column 5: Total Work & OT */}
                    <div className="col-span-2 text-right pr-2">
                        <div className="font-bold text-slate-800 text-base leading-none mb-1">
                            {parseFloat(node.summaryTotalWork || 0).toFixed(1)}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">saat</div>

                        {hasOt && (
                            <div className="mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-200">
                                +{Math.floor(otMinutes / 60)}s {otMinutes % 60}dk Ek
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recursion for Children */}
            {hasChildren && isExpanded && (
                <>
                    {node.children.map(child => (
                        <HierarchicalRow
                            key={child.id}
                            node={child}
                            onMemberClick={onMemberClick}
                            depth={depth + 1}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                    {/* Group Average Row */}
                    <GroupAverageRow children={node.children} depth={depth + 1} />
                </>
            )}
        </>
    );
};

const PerformanceTableView = ({ teamData }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    const sortedData = useMemo(() => {
        let sortableItems = [...teamData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Computed Fields
                if (sortConfig.key === 'breakRatio') {
                    const aWork = parseFloat(a.monthWorkedHours || 0) * 60;
                    const aBreak = parseFloat(a.totalBreakMinutes || 0);
                    aValue = aBreak + aWork > 0 ? (aBreak / (aWork + aBreak)) : 0;

                    const bWork = parseFloat(b.monthWorkedHours || 0) * 60;
                    const bBreak = parseFloat(b.totalBreakMinutes || 0);
                    bValue = bBreak + bWork > 0 ? (bBreak / (bWork + bBreak)) : 0;
                } else {
                    // Standard Fields (Numbers)
                    aValue = parseFloat(aValue) || aValue; // Try parse float
                    bValue = parseFloat(bValue) || bValue;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [teamData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'desc'; // Default desc for stats
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <div className="w-3 h-3 ml-1 opacity-20">↕</div>;
        return sortConfig.direction === 'asc' ? <div className="w-3 h-3 ml-1">↑</div> : <div className="w-3 h-3 ml-1">↓</div>;
    };

    // Header Helper
    const Th = ({ k, label, align = 'left' }) => (
        <th
            className={`px-4 py-3 text-${align} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50`}
            onClick={() => requestSort(k)}
        >
            <div className={`flex items-center justify-${align === 'right' ? 'end' : 'start'}`}>
                {label} {getSortIcon(k)}
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <Th k="name" label="Çalışan" />
                            <Th k="summaryNetBalance" label="Net Mesai" align="right" />
                            <Th k="monthWorkedHours" label="Çalışma (Sa)" align="right" />
                            <Th k="monthTarget" label="Hedef (Sa)" align="right" />
                            <Th k="breakRatio" label="Mola Oranı" align="right" />
                            <Th k="totalLateCount" label="Geç Kalma" align="right" />
                            <Th k="totalLateMinutes" label="Geç Süresi" align="right" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((emp) => {
                            const balance = parseFloat(emp.summaryNetBalance || 0);
                            const isPositive = balance >= 0;

                            // Break Ratio
                            const totalWorkMin = parseFloat(emp.monthWorkedHours || 0) * 60;
                            const totalBreakMin = parseFloat(emp.totalBreakMinutes || 0);
                            const totalActiveTime = totalWorkMin + totalBreakMin;
                            const breakRatio = totalActiveTime > 0 ? ((totalBreakMin / totalActiveTime) * 100).toFixed(1) : '0.0';

                            return (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {emp.avatar ? <img src={emp.avatar} className="w-full h-full rounded-full object-cover" /> : (emp.name ? emp.name.charAt(0) : 'U')}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{emp.name}</p>
                                                <div className="mt-0.5"><StatusBadge status={emp.status} isOnLeave={emp.isOnLeave} leaveStatus={emp.leaveStatus} /></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={clsx("font-bold text-sm", isPositive ? "text-emerald-600" : "text-red-500")}>
                                            {isPositive ? '+' : ''}{balance.toFixed(1)} sa
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">{emp.monthWorkedHours}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-400">{emp.monthTarget}</td>

                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm font-bold text-slate-700">{breakRatio}%</span>
                                            <span className="text-xs text-slate-400">({totalBreakMin}dk)</span>
                                        </div>
                                        {/* Mini Bar */}
                                        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 ml-auto max-w-[80px]">
                                            <div style={{ width: `${Math.min(breakRatio, 100)}%` }} className={clsx("h-full rounded-full", parseFloat(breakRatio) > 15 ? "bg-amber-400" : "bg-blue-400")}></div>
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">{emp.totalLateCount}</td>

                                    <td className="px-4 py-3 text-right text-sm text-red-500 font-medium">
                                        {emp.totalLateMinutes > 0 ? `${emp.totalLateMinutes} dk` : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* Footer: Team Average Row */}
                    {sortedData.length > 0 && (() => {
                        const cnt = sortedData.length;
                        const avgBalance = sortedData.reduce((a, c) => a + parseFloat(c.summaryNetBalance || 0), 0) / cnt;
                        const avgWorked = sortedData.reduce((a, c) => a + parseFloat(c.monthWorkedHours || 0), 0) / cnt;
                        const avgTarget = sortedData.reduce((a, c) => a + parseFloat(c.monthTarget || 0), 0) / cnt;
                        const avgMissing = sortedData.reduce((a, c) => a + parseFloat(c.summaryMissing || 0), 0) / cnt;
                        const avgBreakMin = sortedData.reduce((a, c) => a + parseFloat(c.totalBreakMinutes || 0), 0) / cnt;
                        const avgWorkMin = avgWorked * 60;
                        const avgActiveTime = avgWorkMin + avgBreakMin;
                        const avgBreakRatio = avgActiveTime > 0 ? ((avgBreakMin / avgActiveTime) * 100).toFixed(1) : '0.0';
                        const avgLateCount = (sortedData.reduce((a, c) => a + (c.totalLateCount || 0), 0) / cnt).toFixed(1);
                        const avgLateMin = Math.round(sortedData.reduce((a, c) => a + (c.totalLateMinutes || 0), 0) / cnt);
                        const isPos = avgBalance >= 0;

                        // Günlük ortalama eksik
                        const dayOfMonth = new Date().getDate();
                        const elapsedWorkDays = Math.max(1, Math.round(dayOfMonth * 5 / 7));
                        const dailyAvgMissing = avgMissing / elapsedWorkDays;

                        return (
                            <tfoot className="bg-gradient-to-r from-blue-50 to-slate-50 border-t-2 border-blue-200">
                                <tr>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <Users size={14} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-blue-700 text-sm">Ekip Ortalaması ({cnt})</p>
                                                {dailyAvgMissing > 0.01 && (
                                                    <p className="text-[10px] text-red-500 flex items-center gap-1 mt-0.5">
                                                        <TrendingDown size={9} />
                                                        Günlük ort. eksik: {dailyAvgMissing.toFixed(1)} sa
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={clsx("font-bold text-sm", isPos ? "text-emerald-600" : "text-red-500")}>
                                            {isPos ? '+' : ''}{avgBalance.toFixed(1)} sa
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{avgWorked.toFixed(1)}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-500">{avgTarget.toFixed(0)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-bold text-slate-700">{avgBreakRatio}%</span>
                                        <span className="text-xs text-slate-400 ml-1">({Math.round(avgBreakMin)}dk)</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">{avgLateCount}</td>
                                    <td className="px-4 py-3 text-right text-sm text-red-500 font-medium">
                                        {avgLateMin > 0 ? `${avgLateMin} dk` : '-'}
                                    </td>
                                </tr>
                                {avgMissing > 0.01 && (
                                    <tr className="bg-red-50/50">
                                        <td colSpan={7} className="px-4 py-2">
                                            <div className="flex items-center gap-4 text-xs">
                                                <span className="font-semibold text-red-600 flex items-center gap-1.5">
                                                    <TrendingDown size={12} />
                                                    Aylık Ort. Eksik: {avgMissing.toFixed(1)} sa/kişi
                                                </span>
                                                <span className="text-slate-400">|</span>
                                                <span className="font-semibold text-red-500">
                                                    Günlük Ort. Eksik: {dailyAvgMissing.toFixed(1)} sa/kişi
                                                </span>
                                                <span className="text-slate-400">|</span>
                                                <span className="text-slate-500">
                                                    Toplam Ekip Eksik: {(avgMissing * cnt).toFixed(0)} sa
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tfoot>
                        );
                    })()}
                </table>
            </div>
        </div>
    );
};

const TeamAttendanceOverview = ({ teamData, onMemberClick }) => {
    // View Mode State
    const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

    // Transform flat list to hierarchy
    const hierarchy = useMemo(() => {
        if (!teamData) return [];

        const map = {};
        const roots = [];

        // 1. Initialize nodes
        teamData.forEach(item => {
            map[item.id] = { ...item, children: [] };
        });

        // 2. Link children to parents
        teamData.forEach(item => {
            const node = map[item.id];
            if (item.managerId && map[item.managerId]) {
                map[item.managerId].children.push(node);
            } else {
                roots.push(node);
            }
        });

        const sortNodes = (nodes) => {
            nodes.sort((a, b) => {
                // Sort Managers first, then by Name
                const aIsManager = a.children.length > 0 ? 1 : 0;
                const bIsManager = b.children.length > 0 ? 1 : 0;
                if (aIsManager !== bIsManager) return bIsManager - aIsManager;
                return a.name.localeCompare(b.name);
            });
            nodes.forEach(n => {
                if (n.children.length > 0) sortNodes(n.children);
            });
        };
        sortNodes(roots);

        return roots;
    }, [teamData]);

    // Manage Expansion State
    const [expandedIds, setExpandedIds] = useState(new Set());

    // Initially Expand All Roots
    useEffect(() => {
        if (hierarchy.length > 0) {
            const initialSet = new Set();
            const collectIds = (nodes) => {
                nodes.forEach(n => {
                    if (n.children.length > 0) {
                        initialSet.add(n.id);
                        collectIds(n.children);
                    }
                });
            };
            collectIds(hierarchy);
            setExpandedIds(initialSet);
        }
    }, [hierarchy]);

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allIds = new Set();
        const collectIds = (nodes) => {
            nodes.forEach(n => {
                if (n.children.length > 0) {
                    allIds.add(n.id);
                    collectIds(n.children);
                }
            });
        };
        collectIds(hierarchy);
        setExpandedIds(allIds);
    };

    const collapseAll = () => {
        setExpandedIds(new Set());
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Ekip Özeti</h3>
                        <p className="text-sm text-slate-500">
                            {viewMode === 'card' ? 'Organizasyon Şeması' : 'Performans Listesi'}
                        </p>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('card')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5",
                                viewMode === 'card' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Calendar size={14} /> Kart
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5",
                                viewMode === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <User size={14} /> Liste
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {viewMode === 'card' && (
                        <>
                            <button
                                onClick={expandAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                                <Maximize2 size={14} />
                                Tümünü Aç
                            </button>
                            <button
                                onClick={collapseAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                                <Minimize2 size={14} />
                                Tümünü Kapat
                            </button>
                            <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        </>
                    )}

                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold text-slate-900 leading-none">{teamData.length}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kişi</span>
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? (
                <PerformanceTableView teamData={teamData} />
            ) : (
                hierarchy.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Static Table Header */}
                        <div className="grid grid-cols-12 gap-4 p-3 bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <div className="col-span-4 pl-12">Çalışan</div>
                            <div className="col-span-2">Durum & Bugünkü Mesai</div>
                            <div className="col-span-3">Aylık İlerleme (Sa)</div>
                            <div className="col-span-1 text-right">Net Bakiye</div>
                            <div className="col-span-2 text-right pr-2">Toplam Çalışma</div>
                        </div>

                        {/* Recursive Tree Rows */}
                        <div className="divide-y divide-slate-50">
                            {hierarchy.map((node) => (
                                <HierarchicalRow
                                    key={node.id}
                                    node={node}
                                    onMemberClick={onMemberClick}
                                    depth={0}
                                    expandedIds={expandedIds}
                                    toggleExpand={toggleExpand}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">Ekip Bulunamadı</h3>
                        <p className="text-slate-500 text-sm">Görüntülenecek ekip üyesi yok.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default TeamAttendanceOverview;
